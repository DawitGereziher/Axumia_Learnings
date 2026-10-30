#!/usr/bin/env node
/**
 * 02-KYC-REGRESSION.MJS
 * Gateway Test Suite: Instructor Onboarding & KYC Compliance Gate.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/02-kyc-regression.mjs [--url http://localhost:3000]
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

export async function runKycRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 2: Instructor Onboarding & KYC Compliance Gate      ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const testInstructor = {
    email: `kyc_runner_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Abebe',
    last_name: 'Bikila',
    role: 'instructor',
  };

  const testStudent = {
    email: `kyc_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Regular',
    last_name: 'Student',
    role: 'student',
  };

  let instructorToken = '';
  let studentToken = '';
  let adminToken = '';
  let profileId = '';

  // ── 0. Setup: Obtain Admin Token via Login ──────────────────────────
  await test('Authenticate administrator via /auth/login', async () => {
    const res = await req('POST', '/auth/login', {
      body: {
        email: 'dawitgebreegziabiher@outlook.com',
        password: '12345678',
      },
    });
    assert(res.status === 200, `Failed to authenticate admin: status ${res.status}`);
    assert(res.body?.accessToken, 'Admin accessToken missing');
    assert(res.body?.user?.role === 'admin', 'Authenticated user is not admin');
    adminToken = res.body.accessToken;
  });

  // ── 1. Setup: Register Instructor & Student ─────────────────────────
  await test('Register new instructor user', async () => {
    const res = await req('POST', '/auth/register', { body: testInstructor });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.accessToken, 'Missing accessToken');
    instructorToken = res.body.accessToken;
  });

  await test('Register non-instructor student user for RBAC verification', async () => {
    const res = await req('POST', '/auth/register', { body: testStudent });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    studentToken = res.body.accessToken;
  });

  // ── 2. Gate Verification: Unapproved Instructor Blocked ─────────────
  await test('Unapproved instructor blocked from opening slots (403)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Unapproved instructor blocked from creating courses (403)', async () => {
    const res = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Gated Test Course ${ts}`,
        description: 'Should be blocked until KYC is approved',
        price: 500,
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // ── 3. KYC Submission ───────────────────────────────────────────────
  await test('Instructor submits KYC documents -> status becomes submitted', async () => {
    const res = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        headline: 'Senior Mathematics Lecturer',
        bio: 'MSc in Pure Mathematics with 8 years of tutoring experience.',
        hourly_rate: 500,
        kyc_docs: ['kyc/national-id.pdf', 'kyc/masters-degree.pdf'],
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.kyc_status === 'submitted', `Expected submitted, got ${res.body?.kyc_status}`);
    assert(res.body?.is_active === false, 'Expected is_active to be false initially');
    profileId = res.body?.id;
    assert(profileId, 'Missing instructor profile id');
  });

  // ── 4. Admin Queue Access Control ───────────────────────────────────
  await test('Anonymous request to admin KYC queue is rejected (401)', async () => {
    const res = await req('GET', '/api/admin/kyc/pending');
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('Student role is blocked from admin KYC queue (403)', async () => {
    const res = await req('GET', '/api/admin/kyc/pending', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Instructor role is blocked from admin KYC queue (403)', async () => {
    const res = await req('GET', '/api/admin/kyc/pending', {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Admin accesses pending KYC queue and sees applicant (200)', async () => {
    const res = await req('GET', '/api/admin/kyc/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array of pending profiles');
    const match = res.body.find((p) => p.id === profileId);
    assert(match, `Pending applicant profile ${profileId} not found in admin queue`);
  });

  // ── 5. Admin Rejection with Audit Remarks ───────────────────────────
  await test('Admin rejects applicant with reason note', async () => {
    const res = await req('PATCH', `/api/admin/kyc/${profileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'rejected',
        notes: 'Document resolution too low to verify date of birth.',
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.kyc_status === 'rejected', `Expected rejected, got ${res.body?.kyc_status}`);
    assert(res.body?.is_active === false, 'Expected is_active to remain false after rejection');
  });

  // ── 6. Resubmission & Admin Approval ────────────────────────────────
  await test('Instructor resubmits -> Admin approves -> status becomes approved', async () => {
    // Resubmit
    const resubmitRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { kyc_docs: ['kyc/high-res-id.pdf'] },
    });
    assert(resubmitRes.status === 201 || resubmitRes.status === 200, `Resubmit status: ${resubmitRes.status}`);

    // Admin Approve
    const res = await req('PATCH', `/api/admin/kyc/${profileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.kyc_status === 'approved', `Expected approved, got ${res.body?.kyc_status}`);
    assert(res.body?.is_active === true, 'Expected is_active to become true on approval');
  });

  // ── 7. Gate Unlocked Verification ───────────────────────────────────
  await test('Approved instructor can now open booking availability slots (201)', async () => {
    const starts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 49 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing slot ID');
    assert(res.body?.is_booked === false, 'Slot should not be booked');
  });

  await test('Approved instructor can now draft a course (201)', async () => {
    const res = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Unlocked Course ${ts}`,
        description: 'Successfully created after KYC approval.',
        price: 350,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing course ID');
    assert(res.body?.status === 'draft', `Course status should be 'draft', got '${res.body?.status}'`);
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runKycRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running KYC regression:', err);
      process.exit(1);
    });
}
