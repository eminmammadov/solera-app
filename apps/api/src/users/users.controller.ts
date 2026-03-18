import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { VerifyWalletDto } from '../auth/dto/verify-wallet.dto';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { ClaimUserStakePositionDto } from './dto/claim-user-stake-position.dto';
import { CreateWalletActivityDto } from './dto/create-wallet-activity.dto';
import { CreateUserStakePositionDto } from './dto/create-user-stake-position.dto';
import { ExecuteWalletClaimDto } from './dto/execute-wallet-claim.dto';
import { ExecuteWalletConvertDto } from './dto/execute-wallet-convert.dto';
import { ExecuteWalletStakeDto } from './dto/execute-wallet-stake.dto';
import { EndUserSessionDto } from './dto/end-user-session.dto';
import { HeartbeatUserSessionDto } from './dto/heartbeat-user-session.dto';
import { PrepareWalletStakeDto } from './dto/prepare-wallet-stake.dto';
import { PrepareWalletClaimDto } from './dto/prepare-wallet-claim.dto';
import { PrepareWalletConvertDto } from './dto/prepare-wallet-convert.dto';
import { PreviewWalletStakeDto } from './dto/preview-wallet-stake.dto';
import { PreviewWalletConvertDto } from './dto/preview-wallet-convert.dto';
import { StartUserSessionDto } from './dto/start-user-session.dto';
import { UpdateWalletUserBlockDto } from './dto/update-wallet-user-block.dto';
import {
  AdminPortfolioEligibilityPayload,
  AdminWalletUserDetailPayload,
  AdminWalletUsersListPayload,
  DeleteWalletUserPayload,
  EndUserSessionPayload,
  HeartbeatUserSessionPayload,
  StartUserSessionPayload,
  WalletAccessPayload,
  WalletAuthNoncePayload,
  WalletAuthVerifyPayload,
  WalletConvertExecutionPayload,
  WalletConvertPreviewPayload,
  WalletConvertPreparationPayload,
  WalletClaimExecutionPayload,
  WalletClaimPreparationPayload,
  WalletStakeExecutionPayload,
  WalletStakePreparationPayload,
  WalletStakeQuotePayload,
  WalletExplorerFeedPayload,
  WalletStakePositionPayload,
  WalletUserProfilePayload,
  WalletUserSummary,
  WalletUsersMetricsPayload,
} from './users.types';
import { buildUsersRequestContext } from './users.request-context';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('session/start')
  startSession(
    @Body() dto: StartUserSessionDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<StartUserSessionPayload> {
    return this.usersService.startSession(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('session/heartbeat')
  heartbeatSession(
    @Body() dto: HeartbeatUserSessionDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<HeartbeatUserSessionPayload> {
    return this.usersService.heartbeatSession(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('session/end')
  endSession(
    @Body() dto: EndUserSessionDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<EndUserSessionPayload> {
    return this.usersService.endSession(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('convert/prepare')
  prepareWalletConvert(
    @Body() dto: PrepareWalletConvertDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletConvertPreparationPayload> {
    return this.usersService.prepareWalletConvert(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('convert/preview')
  previewWalletConvert(
    @Body() dto: PreviewWalletConvertDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletConvertPreviewPayload> {
    return this.usersService.previewWalletConvert(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('convert/execute')
  executeWalletConvert(
    @Body() dto: ExecuteWalletConvertDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletConvertExecutionPayload> {
    return this.usersService.executeWalletConvert(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/preview')
  previewStakePosition(
    @Body() dto: PreviewWalletStakeDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletStakeQuotePayload> {
    return this.usersService.previewStakePosition(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/prepare')
  prepareStakePosition(
    @Body() dto: PrepareWalletStakeDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletStakePreparationPayload> {
    return this.usersService.prepareStakePosition(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/execute')
  executeStakePosition(
    @Body() dto: ExecuteWalletStakeDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletStakeExecutionPayload> {
    return this.usersService.executeStakePosition(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes')
  createStakePosition(
    @Body() dto: CreateUserStakePositionDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletStakePositionPayload> {
    return this.usersService.createStakePosition(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/:id/claim')
  claimStakePosition(
    @Param('id') stakePositionId: string,
    @Body() dto: ClaimUserStakePositionDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletStakePositionPayload> {
    return this.usersService.claimStakePosition(
      stakePositionId,
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/:id/claim/prepare')
  prepareClaimStakePosition(
    @Param('id') stakePositionId: string,
    @Body() dto: PrepareWalletClaimDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletClaimPreparationPayload> {
    return this.usersService.prepareClaimStakePosition(
      stakePositionId,
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Post('stakes/:id/claim/execute')
  executeClaimStakePosition(
    @Param('id') stakePositionId: string,
    @Body() dto: ExecuteWalletClaimDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletClaimExecutionPayload> {
    return this.usersService.executeClaimStakePosition(
      stakePositionId,
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @Get('auth/nonce')
  getWalletAuthNonce(
    @Query('walletAddress') walletAddress?: string,
    @Req() req?: Request,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletAuthNoncePayload> {
    if (!walletAddress) {
      throw new BadRequestException('walletAddress query is required');
    }
    return this.usersService.getWalletAuthNonce(
      walletAddress,
      buildUsersRequestContext(req),
      proxyKey,
    );
  }

  @Post('auth/verify')
  verifyWalletAuth(
    @Body() dto: VerifyWalletDto,
    @Req() req?: Request,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletAuthVerifyPayload> {
    return this.usersService.verifyWalletAuth(
      dto,
      buildUsersRequestContext(req),
      proxyKey,
    );
  }

  @Post('auth/logout')
  logoutWalletAuth() {
    return { ok: true };
  }

  @Get('metrics')
  getMetrics(
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletUsersMetricsPayload> {
    return this.usersService.getMetrics(proxyKey);
  }

  @Get('profile')
  getWalletProfile(
    @Query('walletAddress') walletAddress?: string,
    @Req() req?: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletUserProfilePayload> {
    if (!walletAddress) {
      throw new BadRequestException('walletAddress query is required');
    }
    return this.usersService.getWalletProfile(
      walletAddress,
      buildUsersRequestContext(req).requesterKey,
      authorization,
      proxyKey,
    );
  }

  @Get('access')
  getWalletAccess(
    @Query('walletAddress') walletAddress?: string,
    @Req() req?: Request,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletAccessPayload> {
    if (!walletAddress) {
      throw new BadRequestException('walletAddress query is required');
    }
    return this.usersService.getWalletAccess(
      walletAddress,
      buildUsersRequestContext(req).requesterKey,
      proxyKey,
    );
  }

  @Get('explorer/feed')
  listExplorerFeed(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ): Promise<WalletExplorerFeedPayload> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.usersService.listExplorerFeed(
      buildUsersRequestContext(req),
      {
        search,
        type,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        cursor,
      },
      proxyKey,
    );
  }

  @Post('activity')
  createWalletActivity(
    @Body() dto: CreateWalletActivityDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ) {
    return this.usersService.createWalletActivity(
      dto,
      buildUsersRequestContext(req),
      authorization,
      proxyKey,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('users.admin.read')
  @Get('admin')
  listWalletUsers(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('onlineOnly') onlineOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AdminWalletUsersListPayload> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;

    return this.usersService.listWalletUsers({
      search,
      country,
      onlineOnly: onlineOnly === 'true',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    });
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('users.admin.read')
  @Get('admin/portfolio-eligibility')
  getAdminPortfolioEligibility(
    @Query('walletAddress') walletAddress?: string,
    @Req() req?: Request,
  ): Promise<AdminPortfolioEligibilityPayload> {
    if (!walletAddress) {
      throw new BadRequestException('walletAddress query is required');
    }
    return this.usersService.getAdminPortfolioEligibility(
      walletAddress,
      buildUsersRequestContext(req).requesterKey,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('users.admin.read')
  @Get('admin/:walletAddress')
  getWalletUserDetail(
    @Param('walletAddress') walletAddress: string,
  ): Promise<AdminWalletUserDetailPayload> {
    return this.usersService.getWalletUserDetail(walletAddress);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('users.admin.write')
  @Patch('admin/:walletAddress/block')
  updateWalletBlock(
    @Param('walletAddress') walletAddress: string,
    @Body() dto: UpdateWalletUserBlockDto,
  ): Promise<WalletUserSummary> {
    return this.usersService.updateWalletUserBlock(walletAddress, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('users.admin.write')
  @Delete('admin/:walletAddress')
  deleteWalletUser(
    @Param('walletAddress') walletAddress: string,
  ): Promise<DeleteWalletUserPayload> {
    return this.usersService.deleteWalletUser(walletAddress);
  }
}
