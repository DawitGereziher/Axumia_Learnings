#!/usr/bin/env node
/**
 * 03-COURSE-REGRESSION.MJS
 * Gateway Test Suite: Course Creation, Curriculum Hierarchy & Zero-Leakage Content Protection.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/03-course-regression.mjs [--url http://localhost:3000]
 */

import { fileURLToPath } from 'url';
import path from 'path';

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

const TEST_BYPASS_KEY = 'axumia-internal-regression-key-2026';

async function req(method, path, { headers = {}, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-internal-test-key': TEST_BYPASS_KEY,
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
  process.stdout.write(`  • ${name.padEnd(68)} `);
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
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 3: Courses, Curriculum & Zero-Leakage Content Gate  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `course_instructor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Dawit',
    last_name: 'Teacher',
    role: 'instructor',
  };
  const otherInstructor = {
    email: `other_instructor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Other',
    last_name: 'Instructor',
    role: 'instructor',
  };
  const student = {
    email: `course_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Student',
    last_name: 'User',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let otherInstructorToken = '';
  let studentToken = '';

  let courseId = '';
  let courseSlug = '';
  let sectionId = '';
  let paidLessonId = '';
  let previewLessonId = '';
  let materialId = '';

  // ── 0. Setup: Dynamic Admin Login ───────────────────────────────────
  await test('Authenticate administrator via /auth/login', async () => {
    const res = await req('POST', '/auth/login', {
      body: {
        email: 'dawitgebreegziabiher@outlook.com',
        password: '12345678',
      },
    });
    assert(res.status === 200, `Admin login failed: ${res.status}`);
    adminToken = res.body.accessToken;
  });

  // ── 1. Setup: Register and Approve Instructor ───────────────────────
  await test('Register and KYC-approve primary instructor', async () => {
    const regRes = await req('POST', '/auth/register', { body: instructor });
    assert(regRes.status === 201, `Failed to register instructor: ${regRes.status}`);
    instructorToken = regRes.body.accessToken;

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

  await test('Register secondary instructor and student users', async () => {
    const otherRes = await req('POST', '/auth/register', { body: otherInstructor });
    assert(otherRes.status === 201, `Failed other instructor: ${otherRes.status}`);
    otherInstructorToken = otherRes.body.accessToken;

    const studRes = await req('POST', '/auth/register', { body: student });
    assert(studRes.status === 201, `Failed student: ${studRes.status}`);
    studentToken = studRes.body.accessToken;
  });

  // ── 2. Course Creation ──────────────────────────────────────────────
  await test('Approved instructor drafts a new course (201)', async () => {
    const res = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Fullstack Cloud Engineering Masterclass ${ts}`,
        description: 'Complete architecture course utilizing YouTube and Cloudflare R2.',
        price: 850,
        level: 'intermediate',
        language: 'en',
        tags: ['youtube', 'r2', 'architecture'],
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing course ID');
    assert(res.body?.status === 'draft', `Expected status 'draft', got '${res.body?.status}'`);
    courseId = res.body.id;
    courseSlug = res.body.slug;
  });

  // ── 3. Ownership Authorization Guard ────────────────────────────────
  await test('Different instructor cannot alter course sections (403)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${otherInstructorToken}` },
      body: { title: 'Malicious Section Injection' },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // ── 4. Publishing Gate (Cannot publish empty course) ────────────────
  await test('Course cannot be published without attached lessons (400)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  // ── 5. Curriculum Hierarchy & Multi-Format Content ──────────────────
  await test('Instructor adds course section (201)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Section 1: Distributed Video Ingestion & Delivery',
        description: 'Deep dive into zero-egress streaming',
        position: 1,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing section ID');
    sectionId = res.body.id;
  });

  await test('Instructor adds non-preview YouTube lesson (201)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Unlisted YouTube Architecture',
        description: 'Protected lesson video delivery',
        section_id: sectionId,
        content_type: 'youtube',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration_s: 720,
        is_free_preview: false,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing lesson ID');
    assert(res.body?.is_free_preview === false, 'Lesson must not be free preview');
    paidLessonId = res.body.id;
  });

  await test('Instructor adds free preview lesson (201)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.0: Course Overview & Architecture Roadmap',
        description: 'Free introductory preview lesson',
        section_id: sectionId,
        content_type: 'youtube',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration_s: 300,
        is_free_preview: true,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.is_free_preview === true, 'Lesson must be free preview');
    previewLessonId = res.body.id;
  });

  await test('Instructor attaches Cloudflare R2 PDF material (201)', async () => {
    const res = await req('POST', `/api/courses/lessons/${paidLessonId}/materials`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'System Architecture Blueprint PDF',
        material_type: 'pdf',
        file_url: 'https://r2.cdn.axumia.com/pdf/blueprint.pdf',
        file_name: 'blueprint.pdf',
        file_size: 1048576,
        is_downloadable: true,
      },
    });
    assert([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
    assert(res.body?.id, 'Missing material ID');
    materialId = res.body.id;
  });

  // ── 6. Zero-Leakage Public Redaction Verification ────────────────────
  await test('Public unauthenticated GET /api/courses/:slug redacts private media', async () => {
    const res = await req('GET', `/api/courses/${courseSlug}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.sections, 'Missing sections in course detail');

    for (const sec of res.body.sections) {
      for (const les of sec.lessons || []) {
        if (!les.is_free_preview) {
          assert(les.video_key === null, `Security leak: video_key exposed on lesson ${les.id}`);
          assert(les.youtube_video_id === null, `Security leak: youtube_video_id exposed on lesson ${les.id}`);
          assert(les.external_url === null, `Security leak: external_url exposed on lesson ${les.id}`);
          for (const mat of les.materials || []) {
            assert(mat.file_url === null, `Security leak: material file_url exposed on material ${mat.id}`);
          }
        }
      }
    }
  });

  // ── 7. Playback & Download Access Control Gates ──────────────────────
  await test('Unenrolled student is blocked from paid video with 403', async () => {
    const res = await req('GET', `/api/courses/lessons/${paidLessonId}/video-url`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Course instructor receives protected embed URL (200)', async () => {
    const res = await req('GET', `/api/courses/lessons/${paidLessonId}/video-url`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.url, 'Missing video URL');
  });

  await test('Unenrolled student is blocked from downloading paid material with 403', async () => {
    const res = await req('GET', `/api/courses/materials/${materialId}/download-url`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Course instructor receives download URL for lesson material (200)', async () => {
    const res = await req('GET', `/api/courses/materials/${materialId}/download-url`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.url, 'Missing download URL');
  });

  // ── 8. Course Publishing & Marketplace Catalog ──────────────────────
  await test('Instructor publishes course once lessons are attached (200)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.status === 'published', `Expected status 'published', got '${res.body?.status}'`);
  });

  await test('Published course is searchable in the marketplace catalog (200)', async () => {
    const res = await req('GET', '/api/courses');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const found = res.body?.data?.find((c) => c.id === courseId);
    assert(found, 'Published course not found in public marketplace catalog');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runCourseRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running course regression:', err);
      process.exit(1);
    });
}
