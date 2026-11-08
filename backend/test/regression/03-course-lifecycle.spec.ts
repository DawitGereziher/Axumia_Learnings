import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { generateToken } from '../../../../D-auth/utils/jwt';

/**
 * 03-COURSE-LIFECYCLE.SPEC.TS
 * Immutable Regression Test Suite for Phase 3:
 * Course Authoring, YouTube Unlisted Video Streaming & Cloudflare R2 Materials.
 *
 * Covers:
 *  1. Approved instructor drafts a new course (POST /api/courses).
 *  2. Instructor creates sections and adds a lesson with an unlisted YouTube video URL.
 *  3. Instructor attaches a PDF lesson material (Cloudflare R2 storage).
 *  4. Video access protection: Unenrolled student blocked from paid lesson (403).
 *  5. Entitled access: Instructor/Enrolled student receives the YouTube embed URL (200).
 *  6. Lesson progress tracking (POST /api/courses/lessons/:id/progress).
 *  7. Course publish verification (POST /api/courses/:id/publish) & public catalog visibility.
 */
describe('Phase 3: Course Lifecycle, YouTube Streaming & R2 Materials', () => {
  let app: INestApplication;
  const timestamp = Date.now();

  const instructorUser = {
    id: `c0000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `instructor_${timestamp}@axumia.test`,
    role: 'instructor',
    is_email_verified: true,
  };
  const instructorToken = generateToken(instructorUser);

  const studentUser = {
    id: `d0000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
    email: `student_${timestamp}@axumia.test`,
    role: 'student',
    is_email_verified: true,
  };
  const studentToken = generateToken(studentUser);

  let courseId = '';
  let sectionId = '';
  let lessonId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['auth', 'auth/(.*)', 'health'] });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Setup approved instructor profile in database
    const prisma = app.get('PrismaService');
    await prisma.user.create({
      data: {
        id: instructorUser.id,
        email: instructorUser.email,
        role: 'instructor',
        first_name: 'Dawit',
        last_name: 'Instructor',
      },
    });

    await prisma.instructorProfile.create({
      data: {
        user_id: instructorUser.id,
        headline: 'Computer Science Tutor',
        bio: 'Expert programming instructor',
        hourly_rate: 600,
        kyc_status: 'approved',
        is_active: true,
      },
    });

    // Setup student user in database
    await prisma.user.create({
      data: {
        id: studentUser.id,
        email: studentUser.email,
        role: 'student',
        first_name: 'Test',
        last_name: 'Student',
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Course & Section Creation', () => {
    it('POST /api/courses - Approved instructor can draft a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: `Fullstack Next.js & NestJS ${timestamp}`,
          description: 'Comprehensive web development course using YouTube and R2.',
          price: 999,
          level: 'intermediate',
          language: 'en',
          tags: ['nextjs', 'nestjs', 'typescript'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('draft');
      courseId = res.body.id;
    });

    it('POST /api/courses/:id/sections - Instructor can create a section', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/sections`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Section 1: Architecture & Foundations',
          description: 'Setting up the zero-cost YouTube and R2 media infrastructure',
          position: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      sectionId = res.body.id;
    });
  });

  describe('2. YouTube Lesson & R2 Materials Upload', () => {
    it('POST /api/courses/:id/lessons - Instructor adds lesson with unlisted YouTube URL', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Lesson 1.1: System Architecture Overview',
          description: 'Introduction to unlisted YouTube streaming',
          section_id: sectionId,
          content_type: 'youtube',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration_s: 600,
          is_free_preview: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.content_type).toBe('youtube');
      expect(res.body.storage_type).toBe('youtube');
      lessonId = res.body.id;
    });

    it('POST /api/courses/lessons/:id/materials - Attaches PDF material (Cloudflare R2)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/lessons/${lessonId}/materials`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Lecture Slides PDF',
          description: 'High-resolution slide deck',
          material_type: 'pdf',
          file_url: 'https://r2.cdn.axumia.com/pdf/lecture-slides.pdf',
          file_name: 'lecture-slides.pdf',
          file_size: 204800,
          is_downloadable: true,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
      expect(res.body.material_type).toBe('pdf');
    });
  });

  describe('3. Video Access Entitlement Protection', () => {
    it('GET /api/courses/lessons/:id/video-url - Unpurchased student is blocked with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/courses/lessons/:id/video-url - Course instructor receives protected YouTube embed URL', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toContain('youtube.com/embed');
      expect(res.body.content_type).toBe('youtube');
    });
  });

  describe('4. Lesson Progress Tracking', () => {
    it('POST /api/courses/lessons/:id/progress - Updates watched progress', async () => {
      const prisma = app.get('PrismaService');
      // Create a purchase record so student has progress tracking entitlement
      const purchase = await prisma.coursePurchase.create({
        data: {
          user_id: studentUser.id,
          course_id: courseId,
          price_paid: 999,
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/courses/lessons/${lessonId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          purchaseId: purchase.id,
          watchedSeconds: 120,
          totalSeconds: 600,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('pct');
    });
  });

  describe('5. Course Publishing & Marketplace Visibility', () => {
    it('POST /api/courses/:id/publish - Instructor publishes course to catalog', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('published');
    });

    it('GET /api/courses - Published course is visible in public catalog', async () => {
      const res = await request(app.getHttpServer()).get('/api/courses');
      expect(res.status).toBe(200);
      const found = res.body.data?.find((c: any) => c.id === courseId);
      expect(found).toBeDefined();
    });
  });
});
