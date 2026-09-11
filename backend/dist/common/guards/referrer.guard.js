"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReferrerGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferrerGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ReferrerGuard = ReferrerGuard_1 = class ReferrerGuard {
    config;
    logger = new common_1.Logger(ReferrerGuard_1.name);
    allowedDomains;
    enableStrictMode;
    constructor(config) {
        this.config = config;
        const allowedDomains = this.config.get('ALLOWED_REFERRER_DOMAINS') || 'http://localhost:3001,http://localhost:3002';
        this.allowedDomains = allowedDomains.split(',').map(d => d.trim());
        this.enableStrictMode = this.config.get('STRICT_REFERRER_CHECK') === 'true';
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const referrer = request.headers.referer || request.headers.referrer;
        if (!this.enableStrictMode && this.config.get('NODE_ENV') !== 'production') {
            return true;
        }
        if (!referrer && this.enableStrictMode) {
            this.logger.warn('Request blocked: No referrer header present');
            throw new common_1.ForbiddenException('Referrer header is required');
        }
        if (referrer) {
            const referrerString = Array.isArray(referrer) ? referrer[0] : referrer;
            const isAllowed = this.allowedDomains.some(domain => {
                try {
                    const referrerUrl = new URL(referrerString);
                    return referrerUrl.origin === domain || referrerUrl.hostname === new URL(domain).hostname;
                }
                catch {
                    return false;
                }
            });
            if (!isAllowed) {
                this.logger.warn(`Request blocked: Invalid referrer - ${referrerString}`);
                throw new common_1.ForbiddenException('Invalid referrer');
            }
        }
        return true;
    }
};
exports.ReferrerGuard = ReferrerGuard;
exports.ReferrerGuard = ReferrerGuard = ReferrerGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReferrerGuard);
//# sourceMappingURL=referrer.guard.js.map