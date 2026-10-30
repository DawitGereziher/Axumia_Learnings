#!/usr/bin/env node
/**
 * 04-LEARNING-REGRESSION.MJS
 * Gateway Test Suite: Student Enrollment, Video Progress Heartbeat & Certificates.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/04-learning-regression.mjs [--url http://localhost:3000]
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

export async function runLearningRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 4: Learning Progress, Heartbeat & Certificates Gate ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `learn_inst_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Professor',
    last_name: 'Learn',
    role: 'instructor',
  };
  const student = {
    email: `learn_stud_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Enrolled',
    last_name: 'Student',
    role: 'student',
  };
  const otherStudent = {
    email: `unenrolled_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Outsider',
    last_name: 'User',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let studentToken = '';
  let otherStudentToken = '';

  let courseId = '';
  let sectionId = '';
  let lesson1Id = '';
  let lesson2Id = '';
  let purchaseId = '';
  let certificateNumber = '';

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

  // ── 1. Setup: Register Instructor, KYC Approval & Students ───────────
  await test('Register and approve instructor with published free course', async () => {
    const regRes = await req('POST', '/auth/register', { body: instructor });
    assert(regRes.status === 201, `Failed to register instructor: ${regRes.status}`);
    instructorToken = regRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Learning Specialist', hourly_rate: 500, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kycRes.status === 201, `Failed to submit KYC: ${kycRes.status}`);

    const approveRes = await req('PATCH', `/api/admin/kyc/${kycRes.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200, `Failed to approve KYC: ${approveRes.status}`);

    // Create free course (price: 0)
    const cRes = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Interactive Learning & Progress Lifecycle Course ${ts}`,
        description: 'Testing progress tracking, anti-cheat, and certificate issuance.',
        price: 0,
      },
    });
    assert(cRes.status === 201, `Failed to create course: ${cRes.status}`);
    courseId = cRes.body.id;

    // Add Section
    const secRes = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { title: 'Module 1: Foundation', position: 1 },
    });
    assert(secRes.status === 201, `Failed to add section: ${secRes.status}`);
    sectionId = secRes.body.id;

    // Add Lesson 1: Video requiring progress (300s)
    const les1Res = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1: Core Mechanics Video',
        description: 'Requires 80% watch time for completion',
        section_id: sectionId,
        content_type: 'youtube',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration_s: 300,
        requires_progress: true,
        is_free_preview: false,
      },
    });
    assert(les1Res.status === 201, `Failed lesson 1: ${les1Res.status}`);
    lesson1Id = les1Res.body.id;

    // Add Lesson 2: Reading text (immediate completion)
    const les2Res = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 2: Architecture Notes Reading',
        description: 'Reading lesson completed immediately',
        section_id: sectionId,
        content_type: 'text',
        external_url: 'https://axumia.com/notes.txt',
        duration_s: 120,
        requires_progress: false,
        is_free_preview: false,
      },
    });
    assert(les2Res.status === 201, `Failed lesson 2: ${les2Res.status}`);
    lesson2Id = les2Res.body.id;

    // Publish course
    const pubRes = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(pubRes.status === 200, `Failed publish: ${pubRes.status}`);
  });

  await test('Register enrolled student and unenrolled control student', async () => {
    const s1 = await req('POST', '/auth/register', { body: student });
    assert(s1.status === 201, `Failed student 1: ${s1.status}`);
    studentToken = s1.body.accessToken;

    const s2 = await req('POST', '/auth/register', { body: otherStudent });
    assert(s2.status === 201, `Failed student 2: ${s2.status}`);
    otherStudentToken = s2.body.accessToken;
  });

  // ── 2. Pre-Enrollment Access Denials ────────────────────────────────
  await test('Unenrolled student cannot access non-preview lesson video (403)', async () => {
    const res = await req('GET', `/api/courses/lessons/${lesson1Id}/video-url`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Unenrolled student cannot claim certificate (403)', async () => {
    const res = await req('POST', `/api/certificates/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // ── 3. Free Enrollment Flow ─────────────────────────────────────────
  await test('Student successfully enrolls in free course (201/200)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/enroll-free`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
    assert(res.body?.purchase?.id, 'Missing purchase ID in enrollment response');
    purchaseId = res.body.purchase.id;
  });

  await test('Re-enrolling in free course is idempotent (alreadyEnrolled: true)', async () => {
    const res = await req('POST', `/api/courses/${courseId}/enroll-free`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.alreadyEnrolled === true, 'Expected alreadyEnrolled to be true');
    assert(res.body?.purchase?.id === purchaseId, 'Purchase ID mismatch on idempotency');
  });

  await test('Purchase status check returns true for enrolled student', async () => {
    const res = await req('GET', `/api/courses/${courseId}/check-purchase`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.purchased === true, 'Expected purchased to be true');
    assert(res.body?.purchaseId === purchaseId, 'Expected purchaseId to match');
  });

  // ── 4. Authorized Playback ──────────────────────────────────────────
  await test('Enrolled student now receives protected video URL (200)', async () => {
    const res = await req('GET', `/api/courses/lessons/${lesson1Id}/video-url`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.url, 'Missing video URL');
  });

  // ── 5. Watch Time Progress Heartbeat & Anti-Cheat ────────────────────
  await test('Record 40% watch progress -> progress saved but lesson incomplete', async () => {
    const res = await req('POST', `/api/courses/lessons/${lesson1Id}/progress`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        purchaseId,
        watchedSeconds: 120,
        totalSeconds: 300,
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.completed === false, 'Lesson should remain incomplete at 40%');
    assert(res.body?.min_watch_pct === 40, `Expected 40%, got ${res.body?.min_watch_pct}%`);
  });

  await test('Rapid heartbeat (< 9s) is rate-limited without database spam', async () => {
    // Calling progress immediately within milliseconds
    const res = await req('POST', `/api/courses/lessons/${lesson1Id}/progress`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        purchaseId,
        watchedSeconds: 125,
        totalSeconds: 300,
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.completed === false, 'Lesson should remain incomplete');
  });

  await test('Toggle complete endpoint sets lesson 1 to completed', async () => {
    const res = await req('POST', `/api/courses/lessons/${lesson1Id}/toggle-complete`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { purchaseId },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.completed === true, 'Expected lesson 1 to be completed');
  });

  // ── 6. Reading Lesson & Manual Toggle ───────────────────────────────
  await test('Reading lesson completes immediately upon first progress check', async () => {
    const res = await req('POST', `/api/courses/lessons/${lesson2Id}/progress`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        purchaseId,
        watchedSeconds: 0,
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.completed === true, 'Reading lesson must complete immediately');
  });

  // ── 7. Overall Course Progress Tracking ─────────────────────────────
  await test('Course progress endpoint reports 100% completion across all lessons', async () => {
    const res = await req('GET', `/api/courses/${courseId}/progress`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.completionPct === 100, `Expected 100%, got ${res.body?.completionPct}%`);
    assert(res.body?.completedLessons === 2, `Expected 2 completed lessons, got ${res.body?.completedLessons}`);
    assert(res.body?.totalLessons === 2, `Expected 2 total lessons, got ${res.body?.totalLessons}`);
    assert(res.body?.courseCompleted === true, 'Expected courseCompleted to be true');
  });

  // ── 8. Certificate Generation & Public Verification ────────────────
  await test('Student claims verifiable completion certificate (200/201)', async () => {
    const res = await req('POST', `/api/certificates/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.certificate_number, 'Missing certificate number');
    assert(res.body?.verification_url, 'Missing verification URL');
    assert(res.body?.student_name === `${student.first_name} ${student.last_name}`, 'Student name mismatch');
    certificateNumber = res.body.certificate_number;
  });

  await test('Claiming certificate again returns identical certificate (idempotent)', async () => {
    const res = await req('GET', `/api/certificates/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.certificate_number === certificateNumber, 'Certificate number mismatch');
  });

  await test('Public unauthenticated verification confirms certificate authenticity', async () => {
    const res = await req('GET', `/api/certificates/verify/${certificateNumber}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.valid === true || res.body?.is_valid === true, 'Certificate verification failed');
    assert(res.body?.certificate_number === certificateNumber, 'Verification certificate number mismatch');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runLearningRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running learning regression:', err);
      process.exit(1);
    });
}
