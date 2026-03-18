import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  HEADER_SETTINGS_ID,
  MAINTENANCE_SETTINGS_ID,
  PROXY_BACKEND_SETTINGS_ID,
} from './system.constants';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { UpdateProxyBackendDraftDto } from './dto/update-proxy-backend-draft.dto';
import { SystemHeaderSettingsService } from './system-header-settings.service';
import { SystemProxyBackendService } from './system-proxy-backend.service';
import { SystemRaOhlcSyncService } from './system-ra-ohlc-sync.service';
import type {
  HeaderSettingsPayload,
  MaintenanceStatus,
  ProxyBackendConfigPayload,
} from './system.types';

@Injectable()
export class SystemPlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerSettingsService: SystemHeaderSettingsService,
    private readonly proxyBackendService: SystemProxyBackendService,
    private readonly raOhlcSyncService: SystemRaOhlcSyncService,
  ) {}

  getOrCreateMaintenanceSettings() {
    return this.prisma.maintenanceSetting.upsert({
      where: { id: MAINTENANCE_SETTINGS_ID },
      update: {},
      create: { id: MAINTENANCE_SETTINGS_ID },
    });
  }

  getOrCreateHeaderSettings() {
    return this.prisma.headerSetting.upsert({
      where: { id: HEADER_SETTINGS_ID },
      update: {},
      create: { id: HEADER_SETTINGS_ID },
    });
  }

  getOrCreateProxyBackendSettings() {
    return this.prisma.proxyBackendSetting.upsert({
      where: { id: PROXY_BACKEND_SETTINGS_ID },
      update: {},
      create: { id: PROXY_BACKEND_SETTINGS_ID },
    });
  }

  private toStatusPayload(settings: {
    enabled: boolean;
    startsAt: Date | null;
    message: string | null;
  }): MaintenanceStatus {
    const now = new Date();
    const isActive =
      settings.enabled && (!settings.startsAt || settings.startsAt <= now);

    return {
      maintenanceEnabled: settings.enabled,
      maintenanceStartsAt: settings.startsAt
        ? settings.startsAt.toISOString()
        : null,
      maintenanceMessage: settings.message,
      isActive,
      serverTime: now.toISOString(),
    };
  }

  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const settings = await this.getOrCreateMaintenanceSettings();
    return this.toStatusPayload(settings);
  }

  async updateMaintenanceSettings(
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceStatus> {
    const updateData: {
      enabled?: boolean;
      startsAt?: Date | null;
      message?: string | null;
    } = {};

    if (typeof dto.maintenanceEnabled === 'boolean') {
      updateData.enabled = dto.maintenanceEnabled;
    }

    if (dto.maintenanceStartsAt !== undefined) {
      updateData.startsAt = dto.maintenanceStartsAt
        ? new Date(dto.maintenanceStartsAt)
        : null;
    }

    if (dto.maintenanceMessage !== undefined) {
      const trimmedMessage = dto.maintenanceMessage?.trim();
      updateData.message = trimmedMessage ? trimmedMessage : null;
    }

    const settings = await this.prisma.maintenanceSetting.upsert({
      where: { id: MAINTENANCE_SETTINGS_ID },
      update: updateData,
      create: {
        id: MAINTENANCE_SETTINGS_ID,
        enabled: updateData.enabled ?? false,
        startsAt: updateData.startsAt ?? null,
        message: updateData.message ?? null,
      },
    });

    return this.toStatusPayload(settings);
  }

  async getHeaderSettings(): Promise<HeaderSettingsPayload> {
    const settings = await this.getOrCreateHeaderSettings();
    return this.headerSettingsService.toHeaderPayload(settings);
  }

  async updateHeaderSettings(
    dto: UpdateHeaderDto,
  ): Promise<HeaderSettingsPayload> {
    const updateData: {
      logoUrl?: string | null;
      projectName?: string | null;
      description?: string | null;
      network?: string | null;
      connectEnabled?: boolean | null;
      navLinks?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    } = {};

    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = this.headerSettingsService.sanitizeHeaderLogoUrl(
        dto.logoUrl,
      );
    }
    if (dto.projectName !== undefined) {
      updateData.projectName = this.headerSettingsService.sanitizeHeaderText(
        dto.projectName,
      );
    }
    if (dto.description !== undefined) {
      updateData.description = this.headerSettingsService.sanitizeHeaderText(
        dto.description,
      );
    }
    if (dto.network !== undefined) {
      updateData.network = dto.network;
    }
    if (dto.connectEnabled !== undefined) {
      updateData.connectEnabled = dto.connectEnabled;
    }
    if (dto.navLinks !== undefined) {
      updateData.navLinks = this.headerSettingsService.sanitizeHeaderNavLinks(
        dto.navLinks,
        [],
        true,
      );
    }

    const settings = await this.prisma.headerSetting.upsert({
      where: { id: HEADER_SETTINGS_ID },
      update: updateData,
      create: {
        id: HEADER_SETTINGS_ID,
        logoUrl: updateData.logoUrl ?? null,
        projectName: updateData.projectName ?? null,
        description: updateData.description ?? null,
        network: updateData.network ?? null,
        connectEnabled: updateData.connectEnabled ?? null,
        navLinks: updateData.navLinks ?? Prisma.DbNull,
      },
    });

    if (dto.network !== undefined) {
      await this.raOhlcSyncService.syncForNetwork(
        dto.network === 'mainnet' ? 'mainnet' : 'devnet',
      );
    }

    return this.headerSettingsService.toHeaderPayload(settings);
  }

  async resetHeaderSettings(): Promise<HeaderSettingsPayload> {
    const settings = await this.prisma.headerSetting.upsert({
      where: { id: HEADER_SETTINGS_ID },
      update: {
        logoUrl: null,
        projectName: null,
        description: null,
        network: null,
        connectEnabled: null,
        navLinks: Prisma.DbNull,
      },
      create: { id: HEADER_SETTINGS_ID },
    });

    return this.headerSettingsService.toHeaderPayload(settings);
  }

  async getProxyBackendConfig(): Promise<ProxyBackendConfigPayload> {
    const settings = await this.getOrCreateProxyBackendSettings();
    return this.proxyBackendService.toProxyBackendPayload(settings);
  }

  async updateProxyBackendDraft(
    dto: UpdateProxyBackendDraftDto,
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can update backend runtime draft config.',
      );
    }

    const nextDraft = this.proxyBackendService.sanitizeProxyBackendBaseUrl(
      dto.backendBaseUrl,
    );

    const settings = await this.prisma.proxyBackendSetting.upsert({
      where: { id: PROXY_BACKEND_SETTINGS_ID },
      update: {
        draftBackendBaseUrl: nextDraft,
      },
      create: {
        id: PROXY_BACKEND_SETTINGS_ID,
        draftBackendBaseUrl: nextDraft,
      },
    });

    return this.proxyBackendService.toProxyBackendPayload(settings);
  }

  async publishProxyBackendDraft(
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can publish backend runtime config.',
      );
    }

    const current = await this.getOrCreateProxyBackendSettings();
    const draft = this.proxyBackendService.sanitizeProxyBackendBaseUrl(
      current.draftBackendBaseUrl,
    );
    if (!draft) {
      throw new BadRequestException('No draft backend URL to publish.');
    }

    const settings = await this.prisma.proxyBackendSetting.update({
      where: { id: PROXY_BACKEND_SETTINGS_ID },
      data: {
        publishedBackendBaseUrl: draft,
        previousBackendBaseUrl: current.publishedBackendBaseUrl,
        version: (current.version || 1) + 1,
      },
    });

    return this.proxyBackendService.toProxyBackendPayload(settings);
  }

  async rollbackProxyBackend(
    isSuperAdmin: boolean,
  ): Promise<ProxyBackendConfigPayload> {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can rollback backend runtime config.',
      );
    }

    const current = await this.getOrCreateProxyBackendSettings();
    const previous = this.proxyBackendService.sanitizeProxyBackendBaseUrl(
      current.previousBackendBaseUrl,
    );
    if (!previous) {
      throw new BadRequestException('No previous backend URL to rollback to.');
    }

    const settings = await this.prisma.proxyBackendSetting.update({
      where: { id: PROXY_BACKEND_SETTINGS_ID },
      data: {
        publishedBackendBaseUrl: previous,
        previousBackendBaseUrl: current.publishedBackendBaseUrl,
        draftBackendBaseUrl: previous,
        version: (current.version || 1) + 1,
      },
    });

    return this.proxyBackendService.toProxyBackendPayload(settings);
  }

  async getProxyBackendRuntime(proxyKey?: string) {
    this.proxyBackendService.validateProxyKey(proxyKey);
    const settings = await this.getOrCreateProxyBackendSettings();

    return {
      effectiveBackendBaseUrl:
        this.proxyBackendService.sanitizeProxyBackendBaseUrl(
          settings.publishedBackendBaseUrl,
        ),
      version: settings.version || 1,
    };
  }

  getInfraRuntimeStatusProxyConfig() {
    return this.proxyBackendService.getInfraRuntimeStatusProxyConfig();
  }
}
