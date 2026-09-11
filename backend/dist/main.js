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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app_module_1 = require("./app.module");
const D_auth_1 = require("../../D-auth");
const pg_1 = require("pg");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3002',
        credentials: true,
    });
    app.use('/auth/login', (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many requests, please try again in 60 seconds',
        },
    }));
    app.use('/auth/register', (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many requests, please try again in 60 seconds',
        },
    }));
    app.use('/auth', (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many requests, please try again in 60 seconds',
        },
    }));
    app.use('/api/payments', (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many requests, please try again in 60 seconds',
        },
    }));
    app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: false, transform: true }));
    const pgPool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    const plugins = [];
    plugins.push(new D_auth_1.GooglePlugin({
        clientID: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL ||
            `http://localhost:${process.env.PORT || 3000}/auth/google/callback`,
    }));
    plugins.push(new D_auth_1.FacebookPlugin({
        clientID: process.env.FACEBOOK_CLIENT_ID || 'mock-facebook-client-id',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'mock-facebook-client-secret',
        callbackURL: process.env.FACEBOOK_CALLBACK_URL ||
            `http://localhost:${process.env.PORT || 3000}/auth/facebook/callback`,
    }));
    const dAuth = new D_auth_1.AuthManager({
        adapter: new D_auth_1.PgAdapter(pgPool),
        plugins,
        appName: 'AXumia Learnings',
        jwt: { accessTokenExpiry: '15m' },
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3002',
            credentials: true,
        },
    });
    app.use('/auth', dAuth.router);
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('AXumia Learnings API')
            .setDescription('Online Learning Platform — AXumia')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const doc = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, doc);
    }
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`\n🚀 AXumia Learnings API running on http://localhost:${port}`);
    console.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);
    console.log(`🔐 Auth endpoints: http://localhost:${port}/auth`);
}
bootstrap();
//# sourceMappingURL=main.js.map