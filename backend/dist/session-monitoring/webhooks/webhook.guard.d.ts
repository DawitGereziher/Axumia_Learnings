import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class WebhookGuard implements CanActivate {
    private config;
    private readonly logger;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
    private verifyZoom;
    private verifyGoogle;
}
