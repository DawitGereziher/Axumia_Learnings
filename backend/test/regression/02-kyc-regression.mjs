#!/usr/bin/env node
/**
 * 02-KYC-REGRESSION.MJS
 * Standalone Automated Regression Runner for Phase 2: Instructor Onboarding & KYC Gate.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/02-kyc-regression.mjs [--url http://localhost:3000]
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

export async function runKycRegression() {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  PHASE 2 REGRESSION: Instructor Onboarding & KYC Gating        ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const testInstructor = {
    email: `kyc_runner_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Abebe',
    last_name: 'Bikila',
    role: 'instructor',
  };

  const adminToken = generateToken({
    id: 'a0000000-0000-0000-0000-000000000002',
    email: `admin_${ts}@axumia.test`,
    role: 'admin',
    is_email_verified: true,
  });

  let instructorToken = '';
  let profileId = '';

  // 1. Register instructor
  await test('Register new instructor user', async () => {
    const res = await req('POST', '/auth/register', { body: testInstructor });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.accessToken, 'Missing accessToken');
    instructorToken = res.body.accessToken;
  });

  // 2. Gate Verification: Unapproved instructor blocked from slots
  await test('Unapproved instructor blocked from opening slots (403)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 3. Gate Verification: Unapproved instructor blocked from creating course
  await test('Unapproved instructor blocked from creating courses (403)', async () => {
    const res = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Gated Test Course ${ts}`,
        description: 'Should be blocked until KYC is approved',
        price: 500,
      },
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 4. KYC Submission
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
  });

  // 5. Admin Queue Access Control
  await test('Non-admin cannot access admin KYC queue (403)', async () => {
    const res = await req('GET', '/api/admin/kyc/pending', {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Admin accesses pending KYC queue and sees applicant', async () => {
    const res = await req('GET', '/api/admin/kyc/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array of pending profiles');
    const match = res.body.find((p) => p.id === profileId);
    assert(match, 'Pending applicant not found in admin queue');
  });

  // 6. Admin Rejection
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

  // 7. Resubmission & Admin Approval
  await test('Instructor resubmits -> Admin approves -> status becomes approved', async () => {
    // Resubmit
    await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { kyc_docs: ['kyc/high-res-id.pdf'] },
    });

    // Admin Approve
    const res = await req('PATCH', `/api/admin/kyc/${profileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.kyc_status === 'approved', `Expected approved, got ${res.body?.kyc_status}`);
    assert(res.body?.is_active === true, 'Expected is_active to become true on approval');
  });

  // 8. Gate Unlocked
  await test('Approved instructor can now open booking availability slots', async () => {
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

  // Summary
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runKycRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running KYC regression:', err);
      process.exit(1);
    });
}
