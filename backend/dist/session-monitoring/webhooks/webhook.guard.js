"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebhookGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let WebhookGuard = WebhookGuard_1 = class WebhookGuard {
    config;
    logger = new common_1.Logger(WebhookGuard_1.name);
    constructor(config) {
        this.config = config;
    }
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const path = req.path;
        if (path.includes('/webhooks/zoom')) {
            return this.verifyZoom(req);
        }
        if (path.includes('/webhooks/google')) {
            return this.verifyGoogle(req);
        }
        throw new common_1.UnauthorizedException('Unknown webhook source');
    }
    verifyZoom(req) {
        const secret = this.config.get('ZOOM_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.warn('ZOOM_WEBHOOK_SECRET not set — rejecting all Zoom webhook calls');
            throw new common_1.UnauthorizedException('Zoom webhook secret not configured');
        }
        const timestamp = req.headers['x-zm-request-timestamp'];
        const signature = req.headers['x-zm-signature'];
        if (!timestamp || !signature) {
            throw new common_1.UnauthorizedException('Missing Zoom signature headers');
        }
        const requestAge = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (requestAge > 300) {
            this.logger.warn(`Stale Zoom webhook rejected: age=${requestAge}s`);
            throw new common_1.UnauthorizedException('Stale Zoom webhook request');
        }
        const rawBody = req.rawBody;
        const bodyStr = rawBody
            ? rawBody.toString('utf8')
            : JSON.stringify(req.body);
        const message = `v0:${timestamp}:${bodyStr}`;
        const expected = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
            this.logger.warn('Zoom webhook signature mismatch');
            throw new common_1.UnauthorizedException('Invalid Zoom webhook signature');
        }
        return true;
    }
    verifyGoogle(req) {
        const channelToken = this.config.get('GOOGLE_WEBHOOK_CHANNEL_TOKEN');
        if (!channelToken) {
            this.logger.warn('GOOGLE_WEBHOOK_CHANNEL_TOKEN not set — skipping Google webhook verification');
            return true;
        }
        const receivedToken = req.headers['x-goog-channel-token'];
        if (!receivedToken) {
            throw new common_1.UnauthorizedException('Missing x-goog-channel-token header');
        }
        if (!crypto.timingSafeEqual(Buffer.from(channelToken), Buffer.from(receivedToken))) {
            this.logger.warn('Google webhook channel token mismatch');
            throw new common_1.UnauthorizedException('Invalid Google webhook channel token');
        }
        return true;
    }
};
exports.WebhookGuard = WebhookGuard;
exports.WebhookGuard = WebhookGuard = WebhookGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WebhookGuard);
//# sourceMappingURL=webhook.guard.js.map