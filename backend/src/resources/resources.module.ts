import { Module, OnModuleInit } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule implements OnModuleInit {
  constructor(private readonly svc: ResourcesService) {}

  async onModuleInit() {
    // Seed demo resources for first-time setup
    await this.svc.seed().catch(() => {});
  }
}
