import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  MaxFileSizeValidator,
  Patch,
  Post,
  ParseFilePipe,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { AdminAccessRole } from '@prisma/client';
import { join } from 'node:path';
import type { Request } from 'express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { resolveFrontendPublicDir } from '../common/env';
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  persistImageUpload,
} from '../common/uploads/image-upload';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateProxyBackendDraftDto } from './dto/update-proxy-backend-draft.dto';
import { UpdateRaSettingsDto } from './dto/update-ra-settings.dto';
import {
  AdminMetricsPayload,
  HeaderSettingsPayload,
  InfraRuntimeStatusPayload,
  MaintenanceStatus,
  RaMigrationPayload,
  RaSettingsPayload,
  ProxyBackendConfigPayload,
} from './system.types';
import { SystemService } from './system.service';

const RA_LOGO_UPLOAD_DIR = join(resolveFrontendPublicDir(), 'uploads', 'ra');
const RA_LOGO_PUBLIC_PATH_PREFIX = '/uploads/ra';

interface AuthenticatedRequest extends Request {
  user: {
    role: AdminAccessRole;
  };
}

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * Public endpoint for frontend maintenance checks.
   * GET /api/system/maintenance-status
   */
  @Get('maintenance-status')
  getMaintenanceStatus(): Promise<MaintenanceStatus> {
    return this.systemService.getMaintenanceStatus();
  }

  /**
   * Public endpoint for header branding.
   * GET /api/system/header
   */
  @Get('header')
  getHeaderSettings(): Promise<HeaderSettingsPayload> {
    return this.systemService.getHeaderSettings();
  }

  /**
   * Public endpoint for RA runtime config used by staking/convert flows.
   * GET /api/system/ra
   */
  @Get('ra')
  getRaSettings(): Promise<RaSettingsPayload> {
    return this.systemService.getRaSettings();
  }

  /**
   * Admin-only read endpoint.
   * GET /api/system/maintenance
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.read')
  @Get('maintenance')
  getMaintenanceForAdmin(): Promise<MaintenanceStatus> {
    return this.systemService.getMaintenanceStatus();
  }

  /**
   * Admin-only write endpoint.
   * PATCH /api/system/maintenance
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Patch('maintenance')
  updateMaintenance(
    @Body() dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceStatus> {
    return this.systemService.updateMaintenanceSettings(dto);
  }

  /**
   * Admin-only write endpoint.
   * PATCH /api/system/header
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Patch('header')
  updateHeader(@Body() dto: UpdateHeaderDto): Promise<HeaderSettingsPayload> {
    return this.systemService.updateHeaderSettings(dto);
  }

  /**
   * Admin-only reset endpoint.
   * DELETE /api/system/header
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Delete('header')
  resetHeader(): Promise<HeaderSettingsPayload> {
    return this.systemService.resetHeaderSettings();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Patch('ra')
  updateRaSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateRaSettingsDto,
  ): Promise<RaSettingsPayload> {
    return this.systemService.updateRaSettings(
      dto,
      req.user.role === AdminAccessRole.SUPER_ADMIN,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Post('ra/upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_FILE_SIZE_BYTES },
    }),
  )
  async uploadRaLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_FILE_SIZE_BYTES }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return persistImageUpload({
      file,
      uploadDir: RA_LOGO_UPLOAD_DIR,
      publicPathPrefix: RA_LOGO_PUBLIC_PATH_PREFIX,
      fileNamePrefix: 'ra-logo',
    });
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Post('ra/migrate')
  migrateRaModel(
    @Req() req: AuthenticatedRequest,
  ): Promise<RaMigrationPayload> {
    return this.systemService.migrateRaModel(
      req.user.role === AdminAccessRole.SUPER_ADMIN,
    );
  }

  @Get('proxy-backend/runtime')
  getProxyBackendRuntime(
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<{ effectiveBackendBaseUrl: string | null; version: number }> {
    return this.systemService.getProxyBackendRuntime(proxyKey);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.read')
  @Get('proxy-backend')
  getProxyBackendConfig(): Promise<ProxyBackendConfigPayload> {
    return this.systemService.getProxyBackendConfig();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.read')
  @Get('infra-status')
  getInfraRuntimeStatus(): Promise<InfraRuntimeStatusPayload> {
    return this.systemService.getInfraRuntimeStatus();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.read')
  @Get('admin-metrics')
  getAdminMetrics(): Promise<AdminMetricsPayload> {
    return this.systemService.getAdminMetrics();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Patch('proxy-backend/draft')
  updateProxyBackendDraft(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProxyBackendDraftDto,
  ): Promise<ProxyBackendConfigPayload> {
    return this.systemService.updateProxyBackendDraft(
      dto,
      req.user.role === AdminAccessRole.SUPER_ADMIN,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Post('proxy-backend/publish')
  publishProxyBackend(
    @Req() req: AuthenticatedRequest,
  ): Promise<ProxyBackendConfigPayload> {
    return this.systemService.publishProxyBackendDraft(
      req.user.role === AdminAccessRole.SUPER_ADMIN,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('system.security.write')
  @Post('proxy-backend/rollback')
  rollbackProxyBackend(
    @Req() req: AuthenticatedRequest,
  ): Promise<ProxyBackendConfigPayload> {
    return this.systemService.rollbackProxyBackend(
      req.user.role === AdminAccessRole.SUPER_ADMIN,
    );
  }
}
