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
var ChapaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ChapaService = ChapaService_1 = class ChapaService {
    config;
    logger = new common_1.Logger(ChapaService_1.name);
    baseUrl;
    secretKey;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.get('CHAPA_BASE_URL') || 'https://api.chapa.co/v1';
        this.secretKey = config.get('CHAPA_SECRET_KEY') || '';
    }
    async initiatePayment(dto) {
        const body = {
            amount: dto.amount.toString(),
            currency: dto.currency || 'ETB',
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            tx_ref: dto.tx_ref,
            callback_url: dto.callback_url,
            return_url: dto.return_url,
            description: dto.description || 'Ethio Learn payment',
        };
        const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.secretKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.text();
            this.logger.error(`Chapa initiate failed: ${err}`);
            throw new Error(`Chapa payment initiation failed: ${res.status}`);
        }
        return res.json();
    }
    async verifyTransaction(txRef) {
        const res = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
            headers: { Authorization: `Bearer ${this.secretKey}` },
        });
        if (!res.ok)
            throw new Error(`Chapa verify failed: ${res.status}`);
        return res.json();
    }
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const secret = this.config.get('CHAPA_WEBHOOK_SECRET') || '';
        const expected = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return expected === signature;
    }
};
exports.ChapaService = ChapaService;
exports.ChapaService = ChapaService = ChapaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ChapaService);
//# sourceMappingURL=chapa.service.js.map