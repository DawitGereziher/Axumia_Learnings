import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class ReferrerGuard implements CanActivate {
    private config;
    private readonly logger;
    private readonly allowedDomains;
    private readonly enableStrictMode;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
}
