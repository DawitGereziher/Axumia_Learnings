import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  /**
   * GET /api/resources?search=&category=&language=&page=&limit=
   * Public browsing — no auth required.
   */
  @Get()
  @ApiOperation({ summary: 'Browse resources (public)' })
  async list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({
      search,
      category,
      language,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  /**
   * GET /api/resources/:id/download
   * Auth required — prevents anonymous download tracking manipulation
   * and allows future gating on paid resources.
   */
  @Get(':id/download')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Download / redirect to resource file (auth required)' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const resource = await this.svc.incrementDownload(id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    if (resource.file_url && resource.file_url.startsWith('http')) {
      return res.redirect(resource.file_url);
    }
    return res.json({ message: 'Download recorded', resource });
  }

  /**
   * POST /api/resources
   * Admin-only — only admins may publish new resource entries.
   */
  @Post()
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Create a new resource entry' })
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      category: string;
      file_url: string;
      file_size?: number;
      file_type?: string;
      language?: string;
    },
  ) {
    return this.svc.create(body);
  }

  /**
   * DELETE /api/resources/:id
   * Admin-only soft delete — never hard-deletes.
   */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Soft-delete a resource' })
  async remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
