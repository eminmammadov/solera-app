import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
