#!/usr/bin/env node
/**
 * 03-COURSE-REGRESSION.MJS
 * Standalone Automated Regression Runner for Phase 3:
 * Course Authoring, YouTube Unlisted Streaming & Cloudflare R2 Materials.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/03-course-regression.mjs [--url http://localhost:3000]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { generateToken } = require('../../../D-auth/utils/jwt');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const BASE_URL = (getArg('--url', 'http://localhost:3000')).replace(/\/$/, '');

const c = {
  reset:   '\x1b[0m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  grey:    '\x1b[90m',
  bold:    '\x1b[1m',
};

async function req(method, path, { headers = {}, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
  };
  if (body) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, body: json };
}

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  process.stdout.write(`  • ${name.padEnd(65)} `);
  try {
    await fn();
    console.log(`${c.green}✔ PASS${c.reset}`);
    passedCount++;
  } catch (err) {
    console.log(`${c.red}✖ FAIL: ${err.message}${c.reset}`);
    failedCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runCourseRegression() {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  PHASE 3 REGRESSION: Courses, YouTube Streaming & R2 Materials ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `course_instructor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Dawit',
    last_name: 'Teacher',
    role: 'instructor',
  };
  const student = {
    email: `course_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Student',
    last_name: 'User',
    role: 'student',
  };

  const adminToken = generateToken({
    id: 'a0000000-0000-0000-0000-000000000003',
    email: `admin_${ts}@axumia.test`,
    role: 'admin',
    is_email_verified: true,
  });

  let instructorToken = '';
  let studentToken = '';
  let courseId = '';
  let sectionId = '';
  let lessonId = '';

  // Setup: Register instructor and approve KYC
  await test('Register and approve instructor KYC', async () => {
    const instRes = await req('POST', '/auth/register', { body: instructor });
    assert(instRes.status === 201, `Failed to register instructor: ${instRes.status}`);
    instructorToken = instRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Web Dev Tutor', hourly_rate: 600, kyc_docs: ['kyc/sample.pdf'] },
    });
    assert(kycRes.status === 201, `Failed to submit KYC: ${kycRes.status}`);
    const profileId = kycRes.body.id;

    const approveRes = await req('PATCH', `/api/admin/kyc/${profileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200, `Failed to approve KYC: ${approveRes.status}`);
  });

  await test('Register student user', async () => {
    const studRes = await req('POST', '/auth/register', { body: student });
    assert(studRes.status === 201, `Failed to register student: ${studRes.status}`);
    studentToken = studRes.body.accessToken;
  });

  // 1. Create Course Draft
  await test('Approved instructor drafts a new course (201)', async () => {
    const res = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Fullstack Zero-Cloud-Cost Development ${ts}`,
        description: 'Complete architecture course utilizing YouTube and Cloudflare R2.',
        price: 850,
        level: 'intermediate',
        language: 'en',
        tags: ['youtube', 'r2', 'nextjs'],
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing course ID');
    assert(res.body?.status === 'draft', 'Course must default to draft');
    courseId = res.body.id;
  });

  // 2. Add Section
  await test('Instructor adds a course section (201)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Section 1: Architecture & Media Ingestion',
        description: 'Unlisted YouTube and R2 overview',
        position: 1,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing section ID');
    sectionId = res.body.id;
  });

  // 3. Add YouTube Lesson
  await test('Instructor adds lesson with unlisted YouTube link (201)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Setting up Unlisted Video Delivery',
        description: 'Zero egress cost video hosting',
        section_id: sectionId,
        content_type: 'youtube',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration_s: 600,
        is_free_preview: false,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing lesson ID');
    assert(res.body?.content_type === 'youtube', 'Expected content_type to be youtube');
    lessonId = res.body.id;
  });

  // 4. Attach PDF Material (R2)
  await test('Instructor attaches PDF material stored on Cloudflare R2', async () => {
    const res = await req('POST', `/api/courses/lessons/${lessonId}/materials`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Architecture Diagram PDF',
        material_type: 'pdf',
        file_url: 'https://r2.cdn.axumia.com/pdf/architecture.pdf',
        file_name: 'architecture.pdf',
        file_size: 1048576,
        is_downloadable: true,
      },
    });
    assert([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
    assert(res.body?.id, 'Missing material ID');
  });

  // 5. Protected Video Entitlement Gate
  await test('Unpurchased student is blocked from paid video with 403', async () => {
    const res = await req('GET', `/api/courses/lessons/${lessonId}/video-url`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Instructor receives protected YouTube embed URL (200)', async () => {
    const res = await req('GET', `/api/courses/lessons/${lessonId}/video-url`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.url, 'Missing video URL');
    assert(res.body.url.includes('youtube.com/embed') || res.body.url.includes('youtube-nocookie.com/embed'), 'Expected YouTube embed URL');
  });

  // 6. Course Publishing
  await test('Instructor publishes course once lessons are attached', async () => {
    const res = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.status === 'published', `Expected published, got ${res.body?.status}`);
  });

  // 7. Public Discovery
  await test('Published course is searchable in the marketplace catalog', async () => {
    const res = await req('GET', '/api/courses');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const found = res.body?.data?.find((c) => c.id === courseId);
    assert(found, 'Published course not found in public marketplace catalog');
  });

  // Summary
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runCourseRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running course regression:', err);
      process.exit(1);
    });
}
