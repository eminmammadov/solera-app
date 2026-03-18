import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { AuditLogService } from './audit-log.service';
import { ListAdminAuditLogsDto } from './dto/list-admin-audit-logs.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('audit.read')
  @Get('admin/status')
  getAdminAuditStatus() {
    return this.auditLogService.getStatus();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('audit.read')
  @Get('admin/logs')
  getAdminAuditLogs(@Query() query: ListAdminAuditLogsDto) {
    return this.auditLogService.listAdminLogs(query);
  }
}
