import { Injectable } from '@nestjs/common';
import { getRateLimitRuntimeStatus } from '../common/rate-limit-store';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { UpdateProxyBackendDraftDto } from './dto/update-proxy-backend-draft.dto';
import { UpdateRaSettingsDto } from './dto/update-ra-settings.dto';
import { SystemMetricsService } from './system-metrics.service';
import { SystemPlatformSettingsService } from './system-platform-settings.service';
import { SystemRaService } from './system-ra.service';
import type {
  AdminMetricsPayload,
  HeaderSettingsPayload,
  InfraRuntimeStatusPayload,
  MaintenanceStatus,
  ProxyBackendConfigPayload,
  RaMigrationPayload,
  RaSettingsPayload,
} from './system.types';

@Injectable()
export class SystemService {
  constructor(
    private readonly platformSettingsService: SystemPlatformSettingsService,
    private readonly raService: SystemRaService,
    private readonly metricsService: SystemMetricsService,
  ) {}

  getMaintenanceStatus(): Promise<MaintenanceStatus> {
    return this.platformSettingsService.getMaintenanceStatus();
  }

  updateMaintenanceSettings(
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceStatus> {
    return this.platformSettingsService.updateMaintenanceSettings(dto);
  }

  getHeaderSettings(): Promise<HeaderSettingsPayload> {
    return this.platformSettingsService.getHeaderSettings();
  }

  updateHeaderSettings(dto: UpdateHeaderDto): Promise<HeaderSettingsPayload> {
    return this.platformSettingsService.updateHeaderSettings(dto);
  }

  resetHeaderSettings(): Promise<HeaderSettingsPayload> {
    return this.platformSettingsService.resetHeaderSettings();
  }

  getRaSettings(): Promise<RaSettingsPayload> {
    return this.raService.getRaSettings();
  }

  updateRaSettings(
    dto: UpdateRaSettingsDto,
    isSuperAdmin: boolean,
  ): Promise<RaSettingsPayload> {
    return this.raService.updateRaSettings(dto, isSuperAdmin);
  }

  migrateRaModel(isSuperAdmin: boolean): Promise<RaMigrationPayload> {
    return this.raService.migrateRaModel(isSuperAdmin);
  }

  getProxyBackendConfig(): Promise<ProxyBackendConfigPayload> {
    return this.platformSettingsService.getProxyBackendConfig();
  }

  updateProxyBackendDraft(
    dto: UpdateProxyBackendDraftDto,
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    return this.platformSettingsService.updateProxyBackendDraft(
      dto,
      isSuperAdmin,
    );
  }

  publishProxyBackendDraft(
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    return this.platformSettingsService.publishProxyBackendDraft(isSuperAdmin);
  }

  rollbackProxyBackend(
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    return this.platformSettingsService.rollbackProxyBackend(isSuperAdmin);
  }

  getProxyBackendRuntime(proxyKey?: string) {
    return this.platformSettingsService.getProxyBackendRuntime(proxyKey);
  }

  getInfraRuntimeStatus(): Promise<InfraRuntimeStatusPayload> {
    return Promise.resolve({
      rateLimit: getRateLimitRuntimeStatus(),
      proxy: this.platformSettingsService.getInfraRuntimeStatusProxyConfig(),
      generatedAt: new Date().toISOString(),
    });
  }

  getAdminMetrics(): Promise<AdminMetricsPayload> {
    return this.metricsService.getAdminMetrics();
  }
}
