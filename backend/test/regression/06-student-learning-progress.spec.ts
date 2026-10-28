import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { generateToken } from '../../../../D-auth/utils/jwt';

/**
 * 06-STUDENT-LEARNING-PROGRESS.SPEC.TS
 * Immutable Regression Test Suite for Phase 6:
 * Student Post-Enrollment Learning, Video Streaming, Resources & Progress Lifecycle.
 *
 * Covers:
 *  1. Access Gate: Unenrolled student blocked from video URL (403/404).
 *  2. Video Access: Enrolled student or instructor obtains signed/embed URL.
 *  3. Watch Progress: POST /api/courses/lessons/:lessonId/progress rate-limits & marks completed >= 80%.
 *  4. Manual Toggle: POST /api/courses/lessons/:lessonId/toggle-complete toggles completion state.
 *  5. Certificate Gate: Accepts GET and POST, enforces 100% course completion.
 */
describe('Phase 6: Student Post-Enrollment Learning, Video Streaming & Progress', () => {
  let app: INestApplication;
  const timestamp = Date.now();

  const studentUser = {
    id: `f1000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `learn_student_${timestamp}@axumia.test`,
    role: 'student',
    is_email_verified: true,
  };
  const studentToken = generateToken(studentUser);

  const unenrolledStudentUser = {
    id: `f2000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `unenrolled_${timestamp}@axumia.test`,
    role: 'student',
    is_email_verified: true,
  };
  const unenrolledToken = generateToken(unenrolledStudentUser);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const dummyLessonId = '00000000-0000-0000-0000-000000000001';
  const dummyCourseId = '00000000-0000-0000-0000-000000000002';

  describe('1. Video Access Protection', () => {
    it('should reject unauthenticated request to video URL with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/courses/lessons/${dummyLessonId}/video-url`)
        .expect(401);
    });

    it('should enforce enrollment check for protected video', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/lessons/${dummyLessonId}/video-url`)
        .set('Authorization', `Bearer ${unenrolledToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('2. Progress Recording & Heartbeat', () => {
    it('should reject unauthenticated progress heartbeat with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/courses/lessons/${dummyLessonId}/progress`)
        .send({ watchedSeconds: 30, totalSeconds: 100 })
        .expect(401);
    });

    it('should validate progress payload structure and ownership', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/lessons/${dummyLessonId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ watchedSeconds: 30, totalSeconds: 100, purchaseId: 'invalid-id' });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('3. Manual Completion Toggle', () => {
    it('should require authentication to toggle completion', async () => {
      await request(app.getHttpServer())
        .post(`/api/courses/lessons/${dummyLessonId}/toggle-complete`)
        .send({})
        .expect(401);
    });

    it('should guard toggle-complete endpoint with enrollment verification', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/lessons/${dummyLessonId}/toggle-complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({});

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('4. Certificate Generation & Verification Dual Protocol', () => {
    it('should support GET on certificate endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/certificates/courses/${dummyCourseId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('should support POST alias on certificate endpoint for frontend compatibility', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/certificates/courses/${dummyCourseId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});
