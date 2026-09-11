import { OnModuleInit } from '@nestjs/common';
import { ResourcesService } from './resources.service';
export declare class ResourcesModule implements OnModuleInit {
    private readonly svc;
    constructor(svc: ResourcesService);
    onModuleInit(): Promise<void>;
}
