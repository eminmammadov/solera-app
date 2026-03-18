import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminAccessRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getSharedRateLimitStore } from '../common/rate-limit-store';
import { decodeBase58 } from '../common/base58';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import * as nacl from 'tweetnacl';
import { createHash, randomBytes } from 'crypto';

const ADMIN_AUTH_TOKEN_TYPE = 'admin_auth';
const ROLE_VALUES = new Set<string>(Object.values(AdminAccessRole));
const ROLE_ORDER: Record<AdminAccessRole, number> = {
  [AdminAccessRole.SUPER_ADMIN]: 0,
  [AdminAccessRole.EDITOR]: 1,
  [AdminAccessRole.VIEWER]: 2,
  [AdminAccessRole.CUSTOM]: 3,
};

export interface AdminPayload {
  id: string;
  walletAddress: string;
  name: string;
  role: AdminAccessRole;
  customRoleName: string | null;
  isActive: boolean;
}

export interface DeleteCustomAdminRolePayload {
  success: true;
  customRoleName: string;
  reassignedAdmins: number;
  replacementRole: AdminAccessRole;
}

export interface DeleteAdminPayload {
  success: true;
  id: string;
  walletAddress: string;
}

@Injectable()
export class AuthService {
  private readonly nonceTtlMs = 5 * 60 * 1000;
  private readonly noncePerMinute = 20;
  private readonly verifyPerMinute = 25;
  private readonly rateLimitStore = getSharedRateLimitStore();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private toAdminPayload(admin: {
    id: string;
    walletAddress: string;
    name: string;
    adminRole: {
      accessRole: AdminAccessRole;
      name: string;
      isSystem: boolean;
      isActive: boolean;
    };
    isActive: boolean;
  }): AdminPayload {
    return {
      id: admin.id,
      walletAddress: admin.walletAddress,
      name: admin.name,
      role: admin.adminRole.accessRole,
      customRoleName: admin.adminRole.isSystem ? null : admin.adminRole.name,
      isActive: admin.isActive,
    };
  }

  private buildCustomRoleKey(name: string) {
    return `custom:${createHash('sha256')
      .update(name.trim().toLowerCase())
      .digest('hex')
      .slice(0, 24)}`;
  }

  private async getSystemRoleDefinition(accessRole: AdminAccessRole) {
    const roleDefinition = await this.prisma.adminRoleDefinition.findFirst({
      where: {
        accessRole,
        isSystem: true,
        isActive: true,
      },
    });

    if (!roleDefinition) {
      throw new InternalServerErrorException(
        `System admin role ${accessRole} is not configured.`,
      );
    }

    return roleDefinition;
  }

  private async resolveRoleDefinition(
    role: AdminAccessRole,
    customRoleName?: string | null,
  ) {
    if (role !== AdminAccessRole.CUSTOM) {
      return this.getSystemRoleDefinition(role);
    }

    const sanitizedName = this.sanitizeCustomRoleName(customRoleName);
    if (!sanitizedName) {
      throw new BadRequestException(
        'customRoleName is required when role is CUSTOM',
      );
    }

    return this.prisma.adminRoleDefinition.upsert({
      where: { key: this.buildCustomRoleKey(sanitizedName) },
      update: {
        name: sanitizedName,
        accessRole: AdminAccessRole.CUSTOM,
        isSystem: false,
        isActive: true,
      },
      create: {
        key: this.buildCustomRoleKey(sanitizedName),
        name: sanitizedName,
        accessRole: AdminAccessRole.CUSTOM,
        isSystem: false,
        isActive: true,
      },
    });
  }

  private async consumeRateLimit(key: string, max: number, windowMs: number) {
    const result = await this.rateLimitStore.consume({ key, max, windowMs });
    if (!result.allowed) {
      throw new HttpException(
        'Too many authentication requests. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private normalizeWalletAddress(walletAddress: string): string {
    const normalized = walletAddress?.trim();
    if (!normalized) {
      throw new BadRequestException('walletAddress is required');
    }

    const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalized);
    if (!isSolanaBase58) {
      throw new BadRequestException('walletAddress is invalid');
    }

    return normalized;
  }

  private normalizeRoleInput(roleInput?: string | null): AdminAccessRole {
    const normalized = roleInput?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('role is required');
    }

    if (!ROLE_VALUES.has(normalized)) {
      throw new BadRequestException(
        'role must be one of SUPER_ADMIN, EDITOR, VIEWER, CUSTOM',
      );
    }

    return normalized as AdminAccessRole;
  }

  private sanitizeAdminName(name?: string | null): string {
    const trimmed = name?.trim();
    if (!trimmed) return 'Admin';
    return trimmed.slice(0, 80);
  }

  private sanitizeCustomRoleName(name?: string | null): string | null {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 60);
  }

  private async ensureCanDemoteOrDeactivateSuperAdmin(adminId: string) {
    const count = await this.prisma.admin.count({
      where: {
        id: { not: adminId },
        isActive: true,
        adminRole: {
          is: {
            accessRole: AdminAccessRole.SUPER_ADMIN,
          },
        },
      },
    });

    if (count <= 0) {
      throw new ForbiddenException(
        'At least one active SUPER_ADMIN must remain in the system.',
      );
    }
  }

  private async pruneExpiredChallenges() {
    await this.prisma.authNonceChallenge.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  /**
   * Verify Solana wallet signature and return JWT if wallet is admin
   */
  async verifyWallet(dto: VerifyWalletDto, requesterKey?: string) {
    const walletAddress = this.normalizeWalletAddress(dto.walletAddress);
    const signature = dto.signature.trim();
    const message = dto.message.trim();
    const rateKey = `auth:verify:${requesterKey ?? 'unknown'}:${walletAddress}`;

    await this.consumeRateLimit(rateKey, this.verifyPerMinute, 60_000);
    await this.pruneExpiredChallenges();

    const challenge = await this.prisma.authNonceChallenge.findUnique({
      where: { walletAddress },
    });

    if (
      !challenge ||
      challenge.message !== message ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Nonce challenge is invalid or expired');
    }

    let signatureBytes: Uint8Array;
    let publicKeyBytes: Uint8Array;
    try {
      signatureBytes = decodeBase58(signature);
      publicKeyBytes = decodeBase58(walletAddress);
    } catch {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    const messageBytes = new TextEncoder().encode(message);
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    const consumeChallenge = await this.prisma.authNonceChallenge.deleteMany({
      where: {
        walletAddress,
        message,
        expiresAt: { gt: new Date() },
      },
    });

    if (consumeChallenge.count !== 1) {
      throw new UnauthorizedException('Nonce challenge is invalid or expired');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { walletAddress },
      include: { adminRole: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Wallet is not authorized as admin');
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Admin access is currently disabled');
    }
    if (!admin.adminRole.isActive) {
      throw new UnauthorizedException('Admin role is currently disabled');
    }

    const payload = {
      sub: admin.id,
      walletAddress: admin.walletAddress,
      name: admin.name,
      role: admin.adminRole.accessRole,
      customRoleName: admin.adminRole.isSystem ? null : admin.adminRole.name,
      isActive: admin.isActive,
      tokenType: ADMIN_AUTH_TOKEN_TYPE,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      admin: this.toAdminPayload(admin),
    };
  }

  /**
   * Get admin profile from JWT payload
   */
  async getProfile(walletAddress: string) {
    const normalizedWallet = this.normalizeWalletAddress(walletAddress);

    const admin = await this.prisma.admin.findUnique({
      where: { walletAddress: normalizedWallet },
      include: { adminRole: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Admin access is currently disabled');
    }
    if (!admin.adminRole.isActive) {
      throw new UnauthorizedException('Admin role is currently disabled');
    }

    return this.toAdminPayload(admin);
  }

  /**
   * Generate a nonce message for wallet signing
   */
  async getNonce(walletAddress: string, requesterKey?: string) {
    const normalizedWallet = this.normalizeWalletAddress(walletAddress);
    const rateKey = `auth:nonce:${requesterKey ?? 'unknown'}`;

    await this.consumeRateLimit(rateKey, this.noncePerMinute, 60_000);
    await this.pruneExpiredChallenges();

    const nonce = randomBytes(16).toString('hex');
    const message = `Sign this message to authenticate with Solera Work Admin Panel.\n\nWallet: ${normalizedWallet}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

    await this.prisma.authNonceChallenge.upsert({
      where: { walletAddress: normalizedWallet },
      create: {
        walletAddress: normalizedWallet,
        message,
        expiresAt: new Date(Date.now() + this.nonceTtlMs),
      },
      update: {
        message,
        expiresAt: new Date(Date.now() + this.nonceTtlMs),
      },
    });

    return { message, nonce };
  }

  async listAdmins(): Promise<{ items: AdminPayload[] }> {
    const admins = await this.prisma.admin.findMany({
      include: { adminRole: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      items: admins
        .slice()
        .sort((left, right) => {
          const roleCompare =
            ROLE_ORDER[left.adminRole.accessRole] -
            ROLE_ORDER[right.adminRole.accessRole];
          if (roleCompare !== 0) return roleCompare;
          return left.createdAt.getTime() - right.createdAt.getTime();
        })
        .map((admin) => this.toAdminPayload(admin)),
    };
  }

  async createAdmin(dto: CreateAdminDto): Promise<AdminPayload> {
    const walletAddress = this.normalizeWalletAddress(dto.walletAddress);
    const role = dto.role
      ? this.normalizeRoleInput(dto.role)
      : AdminAccessRole.VIEWER;
    const roleDefinition = await this.resolveRoleDefinition(
      role,
      dto.customRoleName,
    );

    const created = await this.prisma.admin.create({
      data: {
        walletAddress,
        name: this.sanitizeAdminName(dto.name),
        adminRoleId: roleDefinition.id,
        isActive: dto.isActive ?? true,
      },
      include: { adminRole: true },
    });

    return this.toAdminPayload(created);
  }

  async updateAdmin(
    adminId: string,
    dto: UpdateAdminDto,
  ): Promise<AdminPayload> {
    const existing = await this.prisma.admin.findUnique({
      where: { id: adminId },
      include: { adminRole: true },
    });
    if (!existing) {
      throw new NotFoundException('Admin not found');
    }

    const nextRole =
      dto.role !== undefined
        ? this.normalizeRoleInput(dto.role)
        : existing.adminRole.accessRole;
    const nextIsActive =
      typeof dto.isActive === 'boolean' ? dto.isActive : existing.isActive;
    const nextCustomRoleName = this.sanitizeCustomRoleName(
      dto.customRoleName !== undefined
        ? dto.customRoleName
        : existing.adminRole.isSystem
          ? null
          : existing.adminRole.name,
    );
    const roleDefinition = await this.resolveRoleDefinition(
      nextRole,
      nextCustomRoleName,
    );

    const superAdminDemotedOrDisabled =
      existing.adminRole.accessRole === AdminAccessRole.SUPER_ADMIN &&
      existing.isActive &&
      (nextRole !== AdminAccessRole.SUPER_ADMIN || !nextIsActive);

    if (superAdminDemotedOrDisabled) {
      await this.ensureCanDemoteOrDeactivateSuperAdmin(existing.id);
    }

    const updated = await this.prisma.admin.update({
      where: { id: existing.id },
      data: {
        walletAddress:
          dto.walletAddress !== undefined
            ? this.normalizeWalletAddress(dto.walletAddress)
            : undefined,
        name:
          dto.name !== undefined ? this.sanitizeAdminName(dto.name) : undefined,
        adminRoleId: roleDefinition.id,
        isActive: nextIsActive,
      },
      include: { adminRole: true },
    });

    return this.toAdminPayload(updated);
  }

  async deleteAdmin(
    adminId: string,
    requesterAdminId?: string,
  ): Promise<DeleteAdminPayload> {
    const existing = await this.prisma.admin.findUnique({
      where: { id: adminId },
      include: { adminRole: true },
    });
    if (!existing) {
      throw new NotFoundException('Admin not found');
    }

    if (requesterAdminId && existing.id === requesterAdminId) {
      throw new ForbiddenException('You cannot delete your own admin account.');
    }

    if (
      existing.adminRole.accessRole === AdminAccessRole.SUPER_ADMIN &&
      existing.isActive
    ) {
      await this.ensureCanDemoteOrDeactivateSuperAdmin(existing.id);
    }

    await this.prisma.admin.delete({
      where: { id: existing.id },
    });

    return {
      success: true,
      id: existing.id,
      walletAddress: existing.walletAddress,
    };
  }

  async deleteCustomAdminRole(
    customRoleNameInput: string,
  ): Promise<DeleteCustomAdminRolePayload> {
    const customRoleName = this.sanitizeCustomRoleName(customRoleNameInput);
    if (!customRoleName) {
      throw new BadRequestException('customRoleName is required');
    }

    const targetRole = await this.prisma.adminRoleDefinition.findFirst({
      where: {
        accessRole: AdminAccessRole.CUSTOM,
        isSystem: false,
        name: {
          equals: customRoleName,
          mode: 'insensitive',
        },
      },
    });

    if (!targetRole) {
      throw new NotFoundException('Custom role not found');
    }

    const viewerRole = await this.getSystemRoleDefinition(
      AdminAccessRole.VIEWER,
    );
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAdmins = await tx.admin.updateMany({
        where: {
          adminRoleId: targetRole.id,
        },
        data: {
          adminRoleId: viewerRole.id,
        },
      });

      await tx.adminRoleDefinition.delete({
        where: { id: targetRole.id },
      });

      return updatedAdmins;
    });

    return {
      success: true,
      customRoleName,
      reassignedAdmins: result.count,
      replacementRole: AdminAccessRole.VIEWER,
    };
  }
}
