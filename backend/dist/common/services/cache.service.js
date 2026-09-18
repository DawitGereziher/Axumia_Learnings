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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let CacheService = CacheService_1 = class CacheService {
    config;
    logger = new common_1.Logger(CacheService_1.name);
    client;
    NS = 'axumia:';
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        this.client = new ioredis_1.default({
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get('REDIS_PORT', 6379),
            lazyConnect: true,
            enableOfflineQueue: false,
        });
        this.client.on('error', (err) => {
            this.logger.warn(`Redis cache error: ${err.message}`);
        });
        this.client.connect().catch(() => {
            this.logger.warn('Redis not available — cache will be bypassed');
        });
    }
    async onModuleDestroy() {
        await this.client.quit();
    }
    async get(key) {
        try {
            const raw = await this.client.get(this.NS + key);
            if (!raw)
                return null;
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttlSeconds = 300) {
        try {
            await this.client.set(this.NS + key, JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch {
        }
    }
    async del(...keys) {
        try {
            await this.client.del(keys.map((k) => this.NS + k));
        }
        catch { }
    }
    async delPattern(pattern) {
        try {
            const stream = this.client.scanStream({
                match: this.NS + pattern,
                count: 100,
            });
            stream.on('data', (keys) => {
                if (keys.length > 0) {
                    this.client.del(keys);
                }
            });
            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });
        }
        catch { }
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CacheService);
//# sourceMappingURL=cache.service.js.map