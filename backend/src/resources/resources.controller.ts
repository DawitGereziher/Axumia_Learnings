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
} from '@nestjs/common';
import { Response } from 'express';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  /** GET /api/resources?search=&category=&language=&page=&limit= */
  @Get()
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

  /** GET /api/resources/:id/download — increments counter and redirects */
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const resource = await this.svc.incrementDownload(id);
    if (!resource)
      return res.status(404).json({ message: 'Resource not found' });
    // If file_url is a real URL, redirect; otherwise return the record
    if (resource.file_url && resource.file_url.startsWith('http')) {
      return res.redirect(resource.file_url);
    }
    return res.json({ message: 'Download recorded', resource });
  }

  /** POST /api/resources — admin creates a resource entry */
  @Post()
  @HttpCode(201)
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

  /** DELETE /api/resources/:id — soft delete */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
