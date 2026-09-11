import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ReferrerGuard implements CanActivate {
  private readonly logger = new Logger(ReferrerGuard.name);
  private readonly allowedDomains: string[];
  private readonly enableStrictMode: boolean;

  constructor(private config: ConfigService) {
    const allowedDomains = this.config.get('ALLOWED_REFERRER_DOMAINS') || 'http://localhost:3001,http://localhost:3002';
    this.allowedDomains = allowedDomains.split(',').map(d => d.trim());
    this.enableStrictMode = this.config.get('STRICT_REFERRER_CHECK') === 'true';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const referrer = request.headers.referer || request.headers.referrer;

    // In development or if strict mode is disabled, allow all
    if (!this.enableStrictMode && this.config.get('NODE_ENV') !== 'production') {
      return true;
    }

    // If no referrer header and strict mode is on, block the request
    if (!referrer && this.enableStrictMode) {
      this.logger.warn('Request blocked: No referrer header present');
      throw new ForbiddenException('Referrer header is required');
    }

    // Check if referrer matches allowed domains
    if (referrer) {
      const referrerString = Array.isArray(referrer) ? referrer[0] : referrer;
      const isAllowed = this.allowedDomains.some(domain => {
        try {
          const referrerUrl = new URL(referrerString);
          return referrerUrl.origin === domain || referrerUrl.hostname === new URL(domain).hostname;
        } catch {
          return false;
        }
      });

      if (!isAllowed) {
        this.logger.warn(`Request blocked: Invalid referrer - ${referrerString}`);
        throw new ForbiddenException('Invalid referrer');
      }
    }

    return true;
  }
}