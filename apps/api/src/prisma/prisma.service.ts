import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readRequiredEnv } from '../common/env';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static decimalJsonPatched = false;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: readRequiredEnv('DATABASE_URL'),
    });
    super({ adapter });

    if (!PrismaService.decimalJsonPatched) {
      Object.defineProperty(Prisma.Decimal.prototype, 'toJSON', {
        value(this: Prisma.Decimal) {
          return this.toNumber();
        },
        configurable: true,
        writable: true,
      });
      PrismaService.decimalJsonPatched = true;
    }
  }

  async onModuleInit() {
    await this.$connect();

    try {
      // Startup migration check: verify that the bounded system config tables exist and are accessible
      await this.$queryRawUnsafe('SELECT id FROM "MaintenanceSetting" LIMIT 1');
    } catch (error) {
      this.logger.error(
        'Database schema check failed. Please ensure Prisma migrations are applied (e.g., npx prisma migrate deploy).',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
