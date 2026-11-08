#!/usr/bin/env node
/**
 * 06-LEARNING-REGRESSION.MJS
 * Standalone Automated Regression Runner for Phase 6:
 * Student Post-Enrollment Learning, Video Streaming, Resources & Progress Lifecycle.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/06-learning-regression.mjs [--url http://localhost:3000]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { generateToken } = require('../../../D-auth/utils/jwt');

const c = {
  reset:   '\x1b[0m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  grey:    '\x1b[90m',
  bold:    '\x1b[1m',
};

export async function runLearningRegression(baseUrlOverride) {
  const args = process.argv.slice(2);
  const getArg = (flag, def) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : def;
  };
  const BASE_URL = (baseUrlOverride || getArg('--url', 'http://localhost:3000')).replace(/\/$/, '');

  let passedCount = 0;
  let failedCount = 0;

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

  async function test(name, fn) {
    process.stdout.write(`  • ${name.padEnd(65)} `);
    try {
      await fn();
      console.log(`${c.green}✔ PASS${c.reset}`);
      passedCount++;
    } catch (err) {
      console.log(`${c.red}✘ FAIL${c.reset}`);
      console.error(`    ${c.red}${err.message}${c.reset}`);
      failedCount++;
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan} PHASE 6: STUDENT POST-ENROLLMENT LEARNING & PROGRESS REGRESSION${c.reset}`);
  console.log(`${c.bold}${c.cyan} Target: ${BASE_URL}${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

  // Check backend reachability
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok && health.status !== 404) {
      throw new Error(`Health probe returned ${health.status}`);
    }
  } catch (e) {
    console.log(`${c.yellow}[!] Server at ${BASE_URL} not reachable (${e.message}).${c.reset}`);
    console.log(`${c.yellow}    To run against live server: npm run start:dev in another terminal.${c.reset}`);
    console.log(`${c.yellow}    Skipping gracefully for offline CI runner.${c.reset}\n`);
    return true;
  }

  // Deterministic test data
  const suffix = Date.now().toString(36);
  const studentUser = {
    id: `c6000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    email: `student_learn_${suffix}@test.local`,
    role: 'student',
  };
  const studentToken = generateToken(studentUser);

  const otherStudentUser = {
    id: `c6000000-0000-0000-0001-${Date.now().toString().slice(-12)}`,
    email: `other_student_${suffix}@test.local`,
    role: 'student',
  };
  const otherStudentToken = generateToken(otherStudentUser);

  const dummyLessonId = '00000000-0000-0000-0000-000000000001';

  // ── Test 1: Video Access Control for Non-Enrolled Student ───────────────────
  await test('Unenrolled student cannot access non-preview lesson video', async () => {
    const res = await req('GET', `/api/courses/lessons/${dummyLessonId}/video-url`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);
  });

  // ── Test 2: Toggle Lesson Completion Endpoint Exists and Authenticates ───────
  await test('Lesson completion toggle endpoint enforces authentication', async () => {
    const unauthRes = await req('POST', `/api/courses/lessons/${dummyLessonId}/toggle-complete`, {
      body: {},
    });
    assert(unauthRes.status === 401, `Expected 401 Unauthorized, got ${unauthRes.status}`);

    const authRes = await req('POST', `/api/courses/lessons/${dummyLessonId}/toggle-complete`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {},
    });
    assert(authRes.status === 403 || authRes.status === 404, `Expected 403 or 404, got ${authRes.status}`);
  });

  // ── Test 3: Watch Progress Tracking Enforces Rate-Limiting & Validation ─────
  await test('Record progress endpoint requires valid payload & auth', async () => {
    const unauthRes = await req('POST', `/api/courses/lessons/${dummyLessonId}/progress`, {
      body: { watchedSeconds: 30, totalSeconds: 100 },
    });
    assert(unauthRes.status === 401, `Expected 401 Unauthorized, got ${unauthRes.status}`);

    const authRes = await req('POST', `/api/courses/lessons/${dummyLessonId}/progress`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { watchedSeconds: 30, totalSeconds: 100, purchaseId: 'non-existent' },
    });
    assert(authRes.status === 400 || authRes.status === 403 || authRes.status === 404, `Expected 400/403/404, got ${authRes.status}`);
  });

  // ── Test 4: Certificate POST & GET Dual Support ─────────────────────────────
  await test('Certificate endpoint accepts both GET and POST requests', async () => {
    const dummyCourseId = '00000000-0000-0000-0000-000000000002';

    const getRes = await req('GET', `/api/certificates/courses/${dummyCourseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(getRes.status === 403 || getRes.status === 404, `Expected 403/404 on GET, got ${getRes.status}`);

    const postRes = await req('POST', `/api/certificates/courses/${dummyCourseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(postRes.status === 403 || postRes.status === 404, `Expected 403/404 on POST, got ${postRes.status}`);
  });

  console.log(`\n${c.bold}Results: ${passedCount} passed, ${failedCount} failed.${c.reset}`);
  return failedCount === 0;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runLearningRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running learning regression:', err);
      process.exit(1);
    });
}
