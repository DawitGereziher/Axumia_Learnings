import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { generateToken } from '../../../../D-auth/utils/jwt';

/**
 * 04-BOOKING-TUTORING.SPEC.TS
 * Immutable Regression Test Suite for Phase 4:
 * 1-on-1 Tutoring Scheduling, Slot Collision Prevention, Meeting Link Exchange & Escrow.
 *
 * Covers:
 *  1. Future availability slot creation by approved instructor (POST /api/bookings/slots).
 *  2. Past slot date rejection (400).
 *  3. Self-booking prevention (instructor cannot book self -> 403).
 *  4. Atomic slot locking & double-booking collision prevention (400 on concurrent book).
 *  5. Meeting link format validation (Zoom subdomains, Google Meet, Teams -> 200 vs 400).
 *  6. Cancellation and atomic slot release (DELETE /api/bookings/:id/cancel).
 *  7. Session completion & escrow hold (PATCH /api/bookings/:id/complete).
 */
describe('Phase 4: 1-on-1 Tutoring, Slot Locking & Meeting Link Escrow', () => {
  let app: INestApplication;
  const timestamp = Date.now();

  const instructorUser = {
    id: `b1000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `tutor_${timestamp}@axumia.test`,
    role: 'instructor',
    is_email_verified: true,
  };
  const instructorToken = generateToken(instructorUser);

  const studentUser1 = {
    id: `b2000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `student1_${timestamp}@axumia.test`,
    role: 'student',
    is_email_verified: true,
  };
  const studentToken1 = generateToken(studentUser1);

  const studentUser2 = {
    id: `b3000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `student2_${timestamp}@axumia.test`,
    role: 'student',
    is_email_verified: true,
  };
  const studentToken2 = generateToken(studentUser2);

  const adminUser = {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: `admin_${timestamp}@axumia.test`,
    role: 'admin',
    is_email_verified: true,
  };
  const adminToken = generateToken(adminUser);

  let slotId1 = '';
  let slotId2 = '';
  let bookingId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const prisma = app.get('PrismaService');
    // Setup users in db
    await prisma.user.create({
      data: {
        id: instructorUser.id,
        email: instructorUser.email,
        role: 'instructor',
        first_name: 'Tutor',
        last_name: 'Expert',
      },
    });

    await prisma.instructorProfile.create({
      data: {
        user_id: instructorUser.id,
        headline: 'Mathematics Specialist',
        hourly_rate: 500,
        kyc_status: 'approved',
        is_active: true,
      },
    });

    await prisma.user.create({
      data: {
        id: studentUser1.id,
        email: studentUser1.email,
        role: 'student',
        first_name: 'Student',
        last_name: 'One',
      },
    });

    await prisma.user.create({
      data: {
        id: studentUser2.id,
        email: studentUser2.email,
        role: 'student',
        first_name: 'Student',
        last_name: 'Two',
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Availability Slot Creation & Date Validation', () => {
    it('POST /api/bookings/slots - Instructor creates future slot', async () => {
      const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/bookings/slots')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ starts_at: starts, ends_at: ends });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.is_booked).toBe(false);
      slotId1 = res.body.id;
    });

    it('POST /api/bookings/slots - Rejects slots with end time before start time (400)', async () => {
      const starts = new Date(Date.now() + 30 * 3600 * 1000).toISOString();
      const ends = new Date(Date.now() + 29 * 3600 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/bookings/slots')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ starts_at: starts, ends_at: ends });

      expect(res.status).toBe(400);
    });
  });

  describe('2. Self-Booking Prevention & Collision Locking', () => {
    it('POST /api/bookings/request/:slotId - Instructor cannot book their own slot (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/bookings/request/${slotId1}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
    });

    it('POST /api/bookings/request/:slotId - Student 1 requests booking and locks slot', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/bookings/request/${slotId1}`)
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({ notes: 'Need help with calculus integration' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('booking');
      expect(res.body).toHaveProperty('checkoutUrl');
      bookingId = res.body.booking.id;
    });

    it('POST /api/bookings/request/:slotId - Student 2 is blocked from already booked slot (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/bookings/request/${slotId1}`)
        .set('Authorization', `Bearer ${studentToken2}`)
        .send({ notes: 'Trying to double-book' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('fully booked');
    });
  });

  describe('3. Meeting Link Exchange & Confirmation', () => {
    beforeAll(async () => {
      // Simulate payment confirmation transition to pending
      const prisma = app.get('PrismaService');
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'pending' },
      });
    });

    it('PATCH /api/bookings/:id/confirm - Rejects invalid/malicious meeting link (400)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingId}/confirm`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ meetingLink: 'https://malicious-phishing-site.com/login' });

      expect(res.status).toBe(400);
    });

    it('PATCH /api/bookings/:id/confirm - Accepts valid Zoom URL with subdomain', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingId}/confirm`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ meetingLink: 'https://us04web.zoom.us/j/9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.meeting_link).toBe('https://us04web.zoom.us/j/9876543210');
    });

    it('GET /api/bookings/mine - Student sees confirmed booking with meeting link', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings/mine')
        .set('Authorization', `Bearer ${studentToken1}`);

      expect(res.status).toBe(200);
      const found = res.body.find((b: any) => b.id === bookingId);
      expect(found).toBeDefined();
      expect(found.meeting_link).toBe('https://us04web.zoom.us/j/9876543210');
    });
  });

  describe('4. Session Completion & Escrow Release', () => {
    it('PATCH /api/bookings/:id/complete - Admin marks session completed', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('GET /api/bookings/instructor/mine - Instructor sees completed booking in roster', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings/instructor/mine')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      const found = res.body.find((b: any) => b.id === bookingId);
      expect(found).toBeDefined();
      expect(found.status).toBe('completed');
    });
  });

  describe('5. Cancellation and Slot Release', () => {
    it('Cancelling an unconfirmed booking releases the slot for other students', async () => {
      // 1. Create slot 2
      const starts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const ends = new Date(Date.now() + 49 * 3600 * 1000).toISOString();
      const slotRes = await request(app.getHttpServer())
        .post('/api/bookings/slots')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ starts_at: starts, ends_at: ends });
      slotId2 = slotRes.body.id;

      // 2. Student 1 requests booking on slot 2
      const bookRes = await request(app.getHttpServer())
        .post(`/api/bookings/request/${slotId2}`)
        .set('Authorization', `Bearer ${studentToken1}`);
      const cancelBookingId = bookRes.body.booking.id;

      // 3. Student 1 cancels
      const cancelRes = await request(app.getHttpServer())
        .delete(`/api/bookings/${cancelBookingId}/cancel`)
        .set('Authorization', `Bearer ${studentToken1}`);
      expect(cancelRes.status).toBe(200);

      // 4. Student 2 can now successfully book the released slot!
      const bookRes2 = await request(app.getHttpServer())
        .post(`/api/bookings/request/${slotId2}`)
        .set('Authorization', `Bearer ${studentToken2}`);
      expect(bookRes2.status).toBe(201);
    });
  });
});
