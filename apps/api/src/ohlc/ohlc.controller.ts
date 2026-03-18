import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { CreateOhlcPairDto } from './dto/create-ohlc-pair.dto';
import { UpdateOhlcPairDto } from './dto/update-ohlc-pair.dto';
import { UpdateOhlcAdminConfigDto } from './dto/update-ohlc-admin-config.dto';
import { OhlcService } from './ohlc.service';

@Controller('ohlc')
export class OhlcController {
  constructor(private readonly ohlcService: OhlcService) {}

  @Get('pairs')
  getPairs() {
    return this.ohlcService.getPairs();
  }

  @Get('bars')
  getBars(
    @Query('pair') pair?: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
  ) {
    const requestedPair = pair?.trim() || undefined;
    const requestedInterval = interval?.trim() || '1m';
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 300;
    return this.ohlcService.getBars({
      pair: requestedPair,
      interval: requestedInterval,
      limit: parsedLimit,
    });
  }

  @Get('ticker')
  getTicker(@Query('pair') pair?: string) {
    const requestedPair = pair?.trim() || undefined;
    return this.ohlcService.getTicker(requestedPair);
  }

  @Get('featured')
  getFeaturedPair() {
    return this.ohlcService.getFeaturedPair();
  }

  @Get('health')
  getHealth() {
    return this.ohlcService.getHealth();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.read')
  @Get('admin/config')
  getAdminConfig() {
    return this.ohlcService.getAdminConfig();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.read')
  @Get('admin/pairs')
  getAdminPairs() {
    return this.ohlcService.getAdminPairs();
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Patch('admin/config')
  updateAdminConfig(@Body() dto: UpdateOhlcAdminConfigDto) {
    return this.ohlcService.updateAdminConfig({
      pollIntervalMs: dto.pollIntervalMs,
      ingestEnabled: dto.ingestEnabled,
    });
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Post('admin/pairs')
  createPair(@Body() dto: CreateOhlcPairDto) {
    return this.ohlcService.createAdminPair(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Patch('admin/pairs/:pairId')
  updatePair(@Param('pairId') pairId: string, @Body() dto: UpdateOhlcPairDto) {
    const parsedPairId = Number.parseInt(pairId, 10);
    return this.ohlcService.updateAdminPair(parsedPairId, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Delete('admin/pairs/:pairId')
  deletePair(@Param('pairId') pairId: string) {
    const parsedPairId = Number.parseInt(pairId, 10);
    return this.ohlcService.deleteAdminPair(parsedPairId);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Patch('admin/featured/:pairId')
  setFeaturedPair(@Param('pairId') pairId: string) {
    const parsedPairId = Number.parseInt(pairId, 10);
    return this.ohlcService.setAdminFeaturedPair(parsedPairId);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('ohlc.admin.write')
  @Post('admin/sync')
  syncNow() {
    return this.ohlcService.syncNow();
  }
}
