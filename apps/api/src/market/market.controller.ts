import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  Patch,
  ParseFilePipe,
  Post,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'node:path';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { resolveFrontendPublicDir } from '../common/env';
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  persistImageUpload,
} from '../common/uploads/image-upload';
import { CreateMarketTokenDto } from './dto/create-market-token.dto';
import { UpdateMarketLivePricingSettingsDto } from './dto/update-market-live-pricing-settings.dto';
import { UpdateMarketTokenDto } from './dto/update-market-token.dto';
import { MarketService } from './market.service';

const TOKEN_ICON_UPLOAD_DIR = join(
  resolveFrontendPublicDir(),
  'uploads',
  'market',
  'tokens',
);
const TOKEN_ICON_PUBLIC_PATH_PREFIX = '/uploads/market/tokens';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  // Public endpoint used by Staking Overview & Profiling
  @Get('tokens')
  getActiveTokens() {
    return this.marketService.getActiveTokens();
  }

  @Get('prices/by-mints')
  getTokenSnapshotsByMints(@Query('mints') mintsQuery?: string) {
    const mints = (mintsQuery ?? '')
      .split(',')
      .map((mint) => mint.trim())
      .filter(Boolean);

    if (mints.length === 0) {
      return { items: [] };
    }

    if (mints.length > 30) {
      throw new BadRequestException('Maximum 30 mint addresses are allowed');
    }

    return this.marketService.getTokenSnapshotsByMints(mints).then((items) => ({
      items,
    }));
  }

  // Admin Endpoints
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.read')
  @Get('admin/tokens')
  getAllTokensAdmin() {
    return this.marketService.getAllTokensAdmin();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.read')
  @Get('admin/tokens/:id')
  getTokenAdmin(@Param('id') id: string) {
    return this.marketService.getTokenAdmin(id);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.read')
  @Get('admin/live-pricing')
  getLivePricingRuntime() {
    return this.marketService.getLivePricingRuntime();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Patch('admin/live-pricing')
  updateLivePricingRuntime(@Body() dto: UpdateMarketLivePricingSettingsDto) {
    return this.marketService.updateLivePricingSettings(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Post('admin/live-pricing/sync')
  syncLivePricingNow() {
    return this.marketService.syncLivePricingNow();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Post('admin/tokens/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_FILE_SIZE_BYTES },
    }),
  )
  async uploadIcon(
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
      uploadDir: TOKEN_ICON_UPLOAD_DIR,
      publicPathPrefix: TOKEN_ICON_PUBLIC_PATH_PREFIX,
      fileNamePrefix: 'token',
    });
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Post('admin/tokens')
  createToken(@Body() dto: CreateMarketTokenDto) {
    return this.marketService.createToken(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Patch('admin/tokens/:id')
  updateToken(@Param('id') id: string, @Body() dto: UpdateMarketTokenDto) {
    return this.marketService.updateToken(id, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('market.admin.write')
  @Delete('admin/tokens/:id')
  deleteToken(@Param('id') id: string) {
    return this.marketService.deleteToken(id);
  }
}
