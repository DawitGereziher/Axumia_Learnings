import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// D-auth module
import {
  AuthManager,
  PgAdapter,
  GooglePlugin,
  FacebookPlugin,
} from '../../D-auth';
import { Pool } from 'pg';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────
  // POST /auth/login: 5 requests per minute per IP
  app.use(
    '/auth/login',
    rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests, please try again in 60 seconds',
      },
    }),
  );
  // POST /auth/register: 10 requests per minute per IP
  app.use(
    '/auth/register',
    rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests, please try again in 60 seconds',
      },
    }),
  );
  // All other Auth endpoints: 20 requests per minute per IP
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests, please try again in 60 seconds',
      },
    }),
  );
  // Payment initiation endpoints: 10 requests per minute per IP
  app.use(
    '/payments',
    rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests, please try again in 60 seconds',
      },
    }),
  );

  // ── Validation & Global Prefix ──────────────────────────────────────────────
  app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));


  // ── D-auth: Mount auth routes at /auth ──────────────────────────────────────
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // D-auth gets max 5 connections; rest reserved for Prisma
  });

  const plugins: any[] = [];
  plugins.push(
    new GooglePlugin({
      clientID: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        `http://localhost:${process.env.PORT || 3000}/auth/google/callback`,
    }),
  );

  plugins.push(
    new FacebookPlugin({
      clientID: process.env.FACEBOOK_CLIENT_ID || 'mock-facebook-client-id',
      clientSecret:
        process.env.FACEBOOK_CLIENT_SECRET || 'mock-facebook-client-secret',
      callbackURL:
        process.env.FACEBOOK_CALLBACK_URL ||
        `http://localhost:${process.env.PORT || 3000}/auth/facebook/callback`,
    }),
  );

  const dAuth = new AuthManager({
    adapter: new PgAdapter(pgPool),
    plugins,
    appName: 'AXumia Learnings',
    jwt: { accessTokenExpiry: '15m' },
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3002',
      credentials: true,
    },
  });

  // Mount D-auth router — handles all /auth/* endpoints
  app.use('/auth', dAuth.router);

  // ── Swagger API Docs ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AXumia Learnings API')
      .setDescription('Online Learning Platform — AXumia')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 AXumia Learnings API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`🔐 Auth endpoints: http://localhost:${port}/auth`);
}

bootstrap();
