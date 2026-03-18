import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { RequireAdminCapabilities } from '../auth/admin-capability.decorator';
import { CreateDocsCategoryDto } from './dto/create-docs-category.dto';
import { CreateDocsPageDto } from './dto/create-docs-page.dto';
import { UpdateDocsCategoryDto } from './dto/update-docs-category.dto';
import { UpdateDocsPageDto } from './dto/update-docs-page.dto';
import { UpdateDocsSettingsDto } from './dto/update-docs-settings.dto';
import { DocsService } from './docs.service';

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  /**
   * Public endpoint for documentation pages.
   * GET /api/docs
   */
  @Get()
  findAll() {
    return this.docsService.findAll();
  }

  /**
   * Public endpoint for docs UI settings.
   * GET /api/docs/settings
   */
  @Get('settings')
  getDocsSettings() {
    return this.docsService.getDocsSettings();
  }

  /**
   * Admin endpoint for docs management panel.
   * GET /api/docs/admin
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.read')
  @Get('admin')
  findAllForAdmin() {
    return this.docsService.findAllForAdmin();
  }

  /**
   * Admin docs UI settings update.
   * PATCH /api/docs/settings
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Patch('settings')
  updateDocsSettings(@Body() dto: UpdateDocsSettingsDto) {
    return this.docsService.updateDocsSettings(dto);
  }

  /**
   * Admin category CRUD.
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Post('categories')
  createCategory(@Body() dto: CreateDocsCategoryDto) {
    return this.docsService.createCategory(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateDocsCategoryDto) {
    return this.docsService.updateCategory(id, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.docsService.removeCategory(id);
  }

  /**
   * Admin page CRUD.
   */
  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Post('pages')
  createPage(@Body() dto: CreateDocsPageDto) {
    return this.docsService.createPage(dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Patch('pages/:id')
  updatePage(@Param('id') id: string, @Body() dto: UpdateDocsPageDto) {
    return this.docsService.updatePage(id, dto);
  }

  @UseGuards(AdminAccessGuard)
  @RequireAdminCapabilities('docs.admin.write')
  @Delete('pages/:id')
  removePage(@Param('id') id: string) {
    return this.docsService.removePage(id);
  }
}
