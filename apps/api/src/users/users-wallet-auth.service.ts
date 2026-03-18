import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as nacl from 'tweetnacl';
import { randomBytes } from 'crypto';
import { decodeBase58 } from '../common/base58';
import { VerifyWalletDto } from '../auth/dto/verify-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  USER_AUTH_TOKEN_TTL_SECONDS,
  USER_AUTH_TOKEN_TYPE,
  WALLET_AUTH_APP_NAME,
  WALLET_AUTH_NONCE_TTL_MS,
} from './users.constants';
import type {
  WalletAuthNoncePayload,
  WalletAuthVerifyPayload,
} from './users.types';
import { normalizeWalletAddress, sanitizeWalletSignature } from './users.utils';
import { UsersWalletStateService } from './users-wallet-state.service';

@Injectable()
export class UsersWalletAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersWalletStateService: UsersWalletStateService,
  ) {}

  async createWalletAuthNonce(
    walletAddress: string,
    network: 'devnet' | 'mainnet',
  ): Promise<WalletAuthNoncePayload> {
    await this.pruneExpiredWalletAuthChallenges();

    const nonce = randomBytes(16).toString('hex');
    const message = this.buildWalletAuthChallengeMessage(
      walletAddress,
      nonce,
      this.toWalletAuthNetworkLabel(network),
    );
    const expiresAt = new Date(Date.now() + WALLET_AUTH_NONCE_TTL_MS);

    await this.prisma.authNonceChallenge.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        message,
        expiresAt,
      },
      update: {
        message,
        expiresAt,
      },
    });

    return {
      message,
      nonce,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyWalletAuth(
    dto: VerifyWalletDto,
  ): Promise<WalletAuthVerifyPayload> {
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const signature = sanitizeWalletSignature(dto.signature);
    const message = this.sanitizeChallengeMessage(dto.message);

    await this.pruneExpiredWalletAuthChallenges();

    const challenge = await this.prisma.authNonceChallenge.findUnique({
      where: { walletAddress },
    });

    if (
      !challenge ||
      challenge.message !== message ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Wallet challenge is invalid or expired');
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
      throw new UnauthorizedException('Wallet challenge is invalid or expired');
    }

    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const accessToken = this.jwtService.sign(
      {
        tokenType: USER_AUTH_TOKEN_TYPE,
        walletAddress,
      },
      { expiresIn: USER_AUTH_TOKEN_TTL_SECONDS },
    );

    return {
      accessToken,
      walletAddress,
      expiresInSeconds: USER_AUTH_TOKEN_TTL_SECONDS,
    };
  }

  private sanitizeChallengeMessage(message: string): string {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException('message is required');
    }
    if (trimmed.length > 1024) {
      throw new BadRequestException('message is too long');
    }
    return trimmed;
  }

  private buildWalletAuthChallengeMessage(
    walletAddress: string,
    nonce: string,
    networkLabel: string,
  ) {
    return [
      `Welcome to ${WALLET_AUTH_APP_NAME}.`,
      'Sign this message to verify your wallet and start a secure session.',
      '',
      `App: ${WALLET_AUTH_APP_NAME}`,
      'Purpose: Wallet connection approval',
      `Wallet: ${walletAddress}`,
      `Network: ${networkLabel}`,
      `Nonce: ${nonce}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');
  }

  private toWalletAuthNetworkLabel(network: 'devnet' | 'mainnet'): string {
    return network === 'mainnet' ? 'Solana Mainnet' : 'Solana Devnet';
  }

  private async pruneExpiredWalletAuthChallenges() {
    await this.prisma.authNonceChallenge.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }
}
