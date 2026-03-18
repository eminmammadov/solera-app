import {
  MaxFileSizeValidator,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseFilePipe,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'node:path';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { resolveFrontendPublicDir } from '../common/env';
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  persistImageUpload,
} from '../common/uploads/image-upload';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';

const BLOG_COVER_UPLOAD_DIR = join(
  resolveFrontendPublicDir(),
  'uploads',
  'blog',
  'covers',
);
const BLOG_COVER_PUBLIC_PATH_PREFIX = '/uploads/blog/covers';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.write')
  @Post()
  create(@Body() createBlogPostDto: CreateBlogPostDto) {
    return this.blogService.create(createBlogPostDto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.write')
  @Post('admin/upload-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_FILE_SIZE_BYTES },
    }),
  )
  async uploadCover(
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
      uploadDir: BLOG_COVER_UPLOAD_DIR,
      publicPathPrefix: BLOG_COVER_PUBLIC_PATH_PREFIX,
      fileNamePrefix: 'blog-cover',
    });
  }

  @Get()
  findAll(@Query('limit') limit?: string, @Query('page') page?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    return this.blogService.findPublished(parsedLimit, parsedPage);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.read')
  @Get('admin')
  findAllForAdmin(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    return this.blogService.findAllForAdmin(parsedLimit, parsedPage);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findPublishedBySlug(slug);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBlogPostDto: UpdateBlogPostDto,
  ) {
    return this.blogService.update(id, updateBlogPostDto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('blog.admin.write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
