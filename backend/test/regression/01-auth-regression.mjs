#!/usr/bin/env node
/**
 * 01-AUTH-REGRESSION.MJS
 * Gateway Test Suite: Authentication, Token Lifecycle & Role Security (RBAC).
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/01-auth-regression.mjs [--url http://localhost:3000]
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

async function req(method, path, { headers = {}, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-internal-test-key': 'axumia-internal-regression-key-2026',
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

export async function runAuthRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 1: Authentication, Token Lifecycle & RBAC Security  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const student = {
    email: `student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'Student',
    role: 'student',
  };
  const instructor = {
    email: `instructor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'Instructor',
    role: 'instructor',
  };

  let studentAccess = '';
  let studentRefresh = '';
  let instructorAccess = '';

  // ── 1. Registration Tests ───────────────────────────────────────────
  await test('Register student returns 201 + tokens + safe user', async () => {
    const res = await req('POST', '/auth/register', { body: student });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    assert(res.body?.accessToken, 'Expected accessToken in body');
    assert(res.body?.refreshToken, 'Expected refreshToken in body');
    assert(res.body?.user?.email === student.email, 'User email does not match');
    assert(res.body?.user?.role === 'student', 'User role should be student');
    assert(!res.body?.user?.password_hash, 'Security risk: password_hash leaked in registration response');
    studentAccess = res.body.accessToken;
    studentRefresh = res.body.refreshToken;
  });

  await test('Duplicate registration email returns 409 Conflict', async () => {
    const res = await req('POST', '/auth/register', { body: student });
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
  });

  await test('Password shorter than 8 chars returns 400 Bad Request', async () => {
    const res = await req('POST', '/auth/register', {
      body: { ...student, email: `short_${ts}@axumia.test`, password: 'short' }
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Register instructor returns 201 with instructor role', async () => {
    const res = await req('POST', '/auth/register', { body: instructor });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.user?.role === 'instructor', 'User role should be instructor');
    instructorAccess = res.body.accessToken;
  });

  // ── 2. Login Tests ──────────────────────────────────────────────────
  await test('Login with valid credentials returns 200 + tokens', async () => {
    const res = await req('POST', '/auth/login', {
      body: { email: student.email, password: student.password }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.accessToken, 'Missing accessToken on login');
    assert(res.body?.refreshToken, 'Missing refreshToken on login');
    studentAccess = res.body.accessToken;
    studentRefresh = res.body.refreshToken;
  });

  await test('Login with incorrect password returns 401 Unauthorized', async () => {
    const res = await req('POST', '/auth/login', {
      body: { email: student.email, password: 'WrongPassword123!' }
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Login with non-existent email returns 401 Unauthorized', async () => {
    const res = await req('POST', '/auth/login', {
      body: { email: `ghost_${ts}@axumia.test`, password: 'Password123!' }
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── 3. Identity & Token Verification ────────────────────────────────
  await test('/auth/me returns authenticated student with Bearer token', async () => {
    const res = await req('GET', '/auth/me', {
      headers: { Authorization: `Bearer ${studentAccess}` }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.user?.email === student.email, 'User email mismatch in /auth/me');
    assert(res.body?.user?.role === 'student', 'Role mismatch in /auth/me');
  });

  await test('/auth/me rejects unauthenticated request with 401', async () => {
    const res = await req('GET', '/auth/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('/auth/me rejects forged/malformed Bearer token with 401', async () => {
    const res = await req('GET', '/auth/me', {
      headers: { Authorization: 'Bearer forged.token.payload' }
    });
    assert(res.status === 401, `Expected 401 for forged token, got ${res.status}`);
  });

  // ── 4. Token Refresh & Anti-Replay Rotation ─────────────────────────
  let rotatedAccess = '';
  let rotatedRefresh = '';

  await test('Refresh token returns new access token and rotated refresh token', async () => {
    const res = await req('POST', '/auth/refresh', {
      body: { refreshToken: studentRefresh }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.accessToken, 'Missing rotated access token');
    assert(res.body?.refreshToken, 'Missing rotated refresh token');
    rotatedAccess = res.body.accessToken;
    rotatedRefresh = res.body.refreshToken;
  });

  await test('Replaying consumed refresh token is rejected with 401', async () => {
    // studentRefresh was already consumed in previous test
    const res = await req('POST', '/auth/refresh', {
      body: { refreshToken: studentRefresh }
    });
    assert(res.status === 401, `Expected 401 for replayed refresh token, got ${res.status}`);
  });

  await test('Newly rotated access token accesses /auth/me successfully', async () => {
    const res = await req('GET', '/auth/me', {
      headers: { Authorization: `Bearer ${rotatedAccess}` }
    });
    assert(res.status === 200, `Expected 200 with rotated access token, got ${res.status}`);
  });

  // ── 5. RBAC & Route Protection ──────────────────────────────────────
  await test('Student token accessing /api/admin/users is blocked with 403', async () => {
    const res = await req('GET', '/api/admin/users', {
      headers: { Authorization: `Bearer ${rotatedAccess}` }
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Instructor token accessing /api/admin/users is blocked with 403', async () => {
    const res = await req('GET', '/api/admin/users', {
      headers: { Authorization: `Bearer ${instructorAccess}` }
    });
    assert(res.status === 403, `Expected 403 Forbidden for instructor on admin route, got ${res.status}`);
  });

  await test('Anonymous request to /api/admin/users is rejected with 401', async () => {
    const res = await req('GET', '/api/admin/users');
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  // ── 6. Logout & Invalidation ────────────────────────────────────────
  await test('Logout revokes refresh token with 200', async () => {
    const res = await req('POST', '/auth/logout', {
      body: { refreshToken: rotatedRefresh }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Revoked refresh token cannot be refreshed (401)', async () => {
    const res = await req('POST', '/auth/refresh', {
      body: { refreshToken: rotatedRefresh }
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runAuthRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running regression:', err);
      process.exit(1);
    });
}
