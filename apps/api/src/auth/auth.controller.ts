import {
  Controller,
  Delete,
  Post,
  Get,
  Body,
  ForbiddenException,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAccessGuard } from './admin-access.guard';
import { RequireAdminCapabilities } from './admin-capability.decorator';
import { AuthService } from './auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { AdminAccessRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    walletAddress: string;
    name: string;
    role: AdminAccessRole;
    customRoleName: string | null;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getRequesterKey(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawForwarded = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const ip = rawForwarded?.split(',')[0]?.trim() || req.ip || 'unknown';
    return ip;
  }

  /**
   * Get a nonce message for wallet signing
   * GET /api/auth/nonce
   */
  @Get('nonce')
  getNonce(@Query('walletAddress') walletAddress: string, @Req() req: Request) {
    return this.authService.getNonce(walletAddress, this.getRequesterKey(req));
  }

  /**
   * Verify wallet signature and return JWT
   * POST /api/auth/verify
   */
  @Post('verify')
  verifyWallet(@Body() dto: VerifyWalletDto, @Req() req: Request) {
    return this.authService.verifyWallet(dto, this.getRequesterKey(req));
  }

  /**
   * Get current admin profile (protected)
   * GET /api/auth/me
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.self.read')
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.walletAddress);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.admin.read')
  @Get('admins')
  listAdmins(@Req() req: AuthenticatedRequest) {
    if (req.user.role !== AdminAccessRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can list admin users');
    }
    return this.authService.listAdmins();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.admin.write')
  @Post('admins')
  createAdmin(@Req() req: AuthenticatedRequest, @Body() dto: CreateAdminDto) {
    if (req.user.role !== AdminAccessRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can create admin users');
    }
    return this.authService.createAdmin(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.admin.write')
  @Patch('admins/:id')
  updateAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    if (req.user.role !== AdminAccessRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can update admin users');
    }
    return this.authService.updateAdmin(id, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.admin.write')
  @Delete('admins/:id')
  deleteAdmin(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (req.user.role !== AdminAccessRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete admin users');
    }
    return this.authService.deleteAdmin(id, req.user.id);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('auth.admin.write')
  @Delete('admin-roles/custom/:roleName')
  deleteCustomAdminRole(
    @Req() req: AuthenticatedRequest,
    @Param('roleName') roleName: string,
  ) {
    if (req.user.role !== AdminAccessRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete custom roles');
    }
    return this.authService.deleteCustomAdminRole(roleName);
  }
}
