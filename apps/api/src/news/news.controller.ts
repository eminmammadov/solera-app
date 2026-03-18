import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsItemDto } from './dto/update-news-item.dto';
import { VoteNewsItemDto } from './dto/vote-news-item.dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('news.admin.write')
  @Post()
  create(@Body() createNewsItemDto: CreateNewsItemDto) {
    return this.newsService.create(createNewsItemDto);
  }

  @Get()
  findAll(
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Headers('x-news-client-id') clientKey?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    const activeOnly = active === 'true';
    return this.newsService.findAll(
      activeOnly,
      parsedLimit,
      parsedOffset,
      clientKey,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-news-client-id') clientKey?: string,
  ) {
    return this.newsService.findOne(id, clientKey);
  }

  @Post(':id/vote')
  vote(
    @Param('id') id: string,
    @Body() voteDto: VoteNewsItemDto,
    @Headers('x-news-client-id') clientKey?: string,
    @Headers('x-solera-proxy-key') proxyKey?: string,
  ) {
    return this.newsService.vote(
      id,
      voteDto.voteType ?? null,
      clientKey,
      proxyKey,
    );
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('news.admin.write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNewsItemDto: UpdateNewsItemDto,
  ) {
    return this.newsService.update(id, updateNewsItemDto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('news.admin.write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
