import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  ensureSecurityEnv,
  parseCorsOrigins,
  readOptionalEnv,
  readPort,
} from './common/env';

async function bootstrap() {
  ensureSecurityEnv();

  const app = await NestFactory.create(AppModule);
  const corsOrigins = parseCorsOrigins(readOptionalEnv('CORS_ORIGIN'));

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Enable security headers
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Observability Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = readPort();
  await app.listen(port);
  console.log(`🚀 Solera API running on http://localhost:${port}/api`);
}
void bootstrap();
