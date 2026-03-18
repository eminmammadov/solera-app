import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit-log.service';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditLogService, AdminAuditInterceptor],
  exports: [AuditLogService, AdminAuditInterceptor],
})
export class AuditModule {}
