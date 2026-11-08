import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

/**
 * 01-AUTH-LIFECYCLE.SPEC.TS
 * Immutable Regression Test Suite for Phase 1: Authentication & Role Security.
 *
 * Covers:
 *  1. Student registration & validation
 *  2. Duplicate email rejection (409)
 *  3. Password constraint validation (400)
 *  4. Instructor registration
 *  5. Login credential verification (200) vs bad credentials (401)
 *  6. /auth/me identity verification with Bearer token
 *  7. Refresh token rotation & replay attack rejection
 *  8. Role-based access control (RBAC): Student blocked from Admin routes (403)
 *  9. Logout and token invalidation
 */
describe('Phase 1: Auth & Role Security Regression Suite', () => {
  let app: INestApplication;
  const timestamp = Date.now();
  const testStudent = {
    email: `student_${timestamp}@axumia.test`,
    password: 'Password123!',
    first_name: 'Regression',
    last_name: 'Student',
    role: 'student',
  };
  const testInstructor = {
    email: `instructor_${timestamp}@axumia.test`,
    password: 'Password123!',
    first_name: 'Regression',
    last_name: 'Instructor',
    role: 'instructor',
  };

  let studentAccessToken = '';
  let studentRefreshToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. User Registration Flow', () => {
    it('POST /auth/register - should successfully register a new student', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testStudent);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toMatchObject({
        email: testStudent.email,
        role: 'student',
      });

      studentAccessToken = res.body.accessToken;
      studentRefreshToken = res.body.refreshToken;
    });

    it('POST /auth/register - should reject duplicate email with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testStudent);

      expect(res.status).toBe(409);
    });

    it('POST /auth/register - should reject passwords shorter than 8 chars with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `short_${timestamp}@axumia.test`,
          password: 'short',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(res.status).toBe(400);
    });

    it('POST /auth/register - should register an instructor with instructor role', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testInstructor);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('instructor');
    });
  });

  describe('2. User Login Flow', () => {
    it('POST /auth/login - should authenticate valid student credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testStudent.email,
          password: testStudent.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testStudent.email);

      // Store updated tokens
      studentAccessToken = res.body.accessToken;
      studentRefreshToken = res.body.refreshToken;
    });

    it('POST /auth/login - should return 401 on invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testStudent.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });

    it('POST /auth/login - should return 401 on non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `ghost_${timestamp}@axumia.test`,
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('3. Session Identity Verification (/auth/me)', () => {
    it('GET /auth/me - should return authenticated user profile with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testStudent.email);
      expect(res.body.user.role).toBe('student');
    });

    it('GET /auth/me - should return 401 when no token is supplied', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /auth/me - should return 401 with malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
    });
  });

  describe('4. Refresh Token Lifecycle & Rotation (RFC 6749 BCP)', () => {
    let nextAccessToken = '';
    let nextRefreshToken = '';

    it('POST /auth/refresh - should issue a new access token and rotated refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: studentRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      nextAccessToken = res.body.accessToken;
      nextRefreshToken = res.body.refreshToken;
    });

    it('POST /auth/refresh - should reject replay of consumed refresh token with 401', async () => {
      // Re-using studentRefreshToken which was already consumed/rotated
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: studentRefreshToken });

      expect(res.status).toBe(401);
    });

    it('GET /auth/me - should succeed using the newly rotated access token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${nextAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testStudent.email);
    });
  });

  describe('5. Role-Based Access Control (RBAC) Guarding', () => {
    it('GET /api/users/me - should allow authenticated student', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      // Expect 200 or 404 depending on profile record existence, but NOT 401/403
      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/admin/users - should reject student token with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/admin/users - should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users');

      expect(res.status).toBe(401);
    });
  });

  describe('6. Logout & Session Termination', () => {
    it('POST /auth/logout - should revoke active refresh token', async () => {
      // Login to get fresh tokens to terminate
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testStudent.email,
          password: testStudent.password,
        });

      const tokenToRevoke = loginRes.body.refreshToken;

      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: tokenToRevoke });

      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with the revoked token must fail
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokenToRevoke });

      expect(refreshRes.status).toBe(401);
    });
  });
});
