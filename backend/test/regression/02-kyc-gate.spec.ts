import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { generateToken } from '../../../../D-auth/utils/jwt';

/**
 * 02-KYC-GATE.SPEC.TS
 * Immutable Regression Test Suite for Phase 2: Instructor Onboarding & KYC Gate.
 *
 * Covers:
 *  1. Unapproved instructor is blocked from creating/publishing courses and availability slots (403).
 *  2. Instructor submits KYC documents & rich bio (POST /api/users/me/instructor-profile).
 *  3. Admin KYC queue security (blocked for non-admins, accessible by admin).
 *  4. Admin KYC review: Reject flow updates status to 'rejected' and is_active: false.
 *  5. Admin KYC review: Approve flow updates status to 'approved' and is_active: true.
 *  6. Approved instructor successfully creates booking availability slots.
 */
describe('Phase 2: Instructor KYC & Marketplace Gating Regression Suite', () => {
  let app: INestApplication;
  const timestamp = Date.now();

  const testInstructor = {
    email: `kyc_instructor_${timestamp}@axumia.test`,
    password: 'Password123!',
    first_name: 'Abebe',
    last_name: 'Bikila',
    role: 'instructor',
  };

  let instructorToken = '';
  let instructorId = '';
  let instructorProfileId = '';

  // Admin token generated via shared JWT secret
  const adminUser = {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: `admin_${timestamp}@axumia.test`,
    role: 'admin',
    is_email_verified: true,
  };
  const adminToken = generateToken(adminUser);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Register instructor
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testInstructor);

    instructorToken = regRes.body.accessToken;
    instructorId = regRes.body.user.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Unapproved Instructor Gating', () => {
    it('should reject slot creation with 403 when instructor has not been approved', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const dayAfter = new Date(Date.now() + 25 * 3600 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/bookings/slots')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ starts_at: tomorrow, ends_at: dayAfter });

      expect(res.status).toBe(403);
    });

    it('should reject course creation with 403 when instructor has not been approved', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: `Gated Course ${timestamp}`,
          description: 'This course should be blocked until KYC is approved',
          price: 500,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. KYC Submission Flow', () => {
    it('POST /api/users/me/instructor-profile - should submit KYC data with status submitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/me/instructor-profile')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          headline: 'Certified Mathematics & Physics Tutor',
          bio: '10+ years teaching experience in Addis Ababa university preparatory curriculum.',
          hourly_rate: 450,
          kyc_docs: ['kyc/sample-id-doc.pdf', 'kyc/sample-diploma.pdf'],
        });

      expect(res.status).toBe(201);
      expect(res.body.kyc_status).toBe('submitted');
      expect(res.body.is_active).toBe(false);
      instructorProfileId = res.body.id;
    });
  });

  describe('3. Admin KYC Queue & Security Guarding', () => {
    it('GET /api/admin/kyc/pending - should reject non-admin instructor token with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/kyc/pending')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/admin/kyc/pending - should return pending applications for Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/kyc/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((p: any) => p.id === instructorProfileId);
      expect(found).toBeDefined();
    });
  });

  describe('4. Admin Review: Reject & Approve State Transitions', () => {
    it('PATCH /api/admin/kyc/:profileId - Admin can reject with review notes', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/kyc/${instructorProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          notes: 'National ID image is blurry. Please re-upload.',
        });

      expect(res.status).toBe(200);
      expect(res.body.kyc_status).toBe('rejected');
      expect(res.body.is_active).toBe(false);
    });

    it('PATCH /api/admin/kyc/:profileId - Admin approves after resubmission', async () => {
      // 1. Instructor resubmits
      await request(app.getHttpServer())
        .post('/api/users/me/instructor-profile')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          kyc_docs: ['kyc/clear-id-card.pdf'],
        });

      // 2. Admin approves
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/kyc/${instructorProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.kyc_status).toBe('approved');
      expect(res.body.is_active).toBe(true);
    });
  });

  describe('5. Approved Instructor Access Unlocked', () => {
    it('Approved instructor can now open booking availability slots', async () => {
      const starts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const ends = new Date(Date.now() + 49 * 3600 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/bookings/slots')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ starts_at: starts, ends_at: ends });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.is_booked).toBe(false);
    });
  });
});
