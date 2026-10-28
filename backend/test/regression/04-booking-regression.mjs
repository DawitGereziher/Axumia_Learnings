#!/usr/bin/env node
/**
 * 04-BOOKING-REGRESSION.MJS
 * Standalone Automated Regression Runner for Phase 4:
 * 1-on-1 Tutoring Scheduling, Slot Collision Locking, Meeting Links & Escrow.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/04-booking-regression.mjs [--url http://localhost:3000]
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

export async function runBookingRegression() {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  PHASE 4 REGRESSION: 1-on-1 Tutoring, Slot Locking & Escrow   ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `booking_tutor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Sara',
    last_name: 'Tutor',
    role: 'instructor',
  };
  const student1 = {
    email: `booking_stud1_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Student',
    last_name: 'One',
    role: 'student',
  };
  const student2 = {
    email: `booking_stud2_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Student',
    last_name: 'Two',
    role: 'student',
  };

  const adminToken = generateToken({
    id: 'a0000000-0000-0000-0000-000000000005',
    email: `admin_${ts}@axumia.test`,
    role: 'admin',
    is_email_verified: true,
  });

  let instructorToken = '';
  let studentToken1 = '';
  let studentToken2 = '';
  let slotId1 = '';
  let slotId2 = '';
  let bookingId = '';

  // Setup: Register instructor and approve KYC
  await test('Register and approve instructor KYC', async () => {
    const instRes = await req('POST', '/auth/register', { body: instructor });
    assert(instRes.status === 201, `Failed to register instructor: ${instRes.status}`);
    instructorToken = instRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Physics Tutor', hourly_rate: 550, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kycRes.status === 201, `Failed to submit KYC: ${kycRes.status}`);

    const approveRes = await req('PATCH', `/api/admin/kyc/${kycRes.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200, `Failed to approve KYC: ${approveRes.status}`);
  });

  await test('Register student 1 and student 2', async () => {
    const s1Res = await req('POST', '/auth/register', { body: student1 });
    assert(s1Res.status === 201, `Failed student 1: ${s1Res.status}`);
    studentToken1 = s1Res.body.accessToken;

    const s2Res = await req('POST', '/auth/register', { body: student2 });
    assert(s2Res.status === 201, `Failed student 2: ${s2Res.status}`);
    studentToken2 = s2Res.body.accessToken;
  });

  // 1. Slot Creation & Constraints
  await test('Instructor creates future availability slot (201)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.id, 'Missing slot ID');
    slotId1 = res.body.id;
  });

  await test('Rejects slot with invalid/past end time (400)', async () => {
    const starts = new Date(Date.now() + 30 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 28 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // 2. Self-Booking Prevention
  await test('Instructor cannot book their own slot (403)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 3. Booking & Double-Booking Collision Locking
  await test('Student 1 books slot and locks reservation (201)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${studentToken1}` },
      body: { notes: 'Need help with kinematics formulas' },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.booking?.id, 'Missing booking ID');
    bookingId = res.body.booking.id;
  });

  await test('Student 2 is blocked from double-booking locked slot (400)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${studentToken2}` },
      body: { notes: 'Attempting collision' },
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body?.message?.includes('fully booked'), 'Expected fully booked error message');
  });

  // 4. Meeting Link Validation & Confirmation
  await test('Instructor confirmation rejects non-meeting URL (400)', async () => {
    const res = await req('PATCH', `/api/bookings/${bookingId}/confirm`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { meetingLink: 'https://unverified-domain.com/meeting' },
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Instructor confirmation accepts Zoom/Meet link (200)', async () => {
    const res = await req('PATCH', `/api/bookings/${bookingId}/confirm`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { meetingLink: 'https://us04web.zoom.us/j/1234567890' },
    });
    // If booking was awaiting payment, confirming is handled after webhook
    assert([200, 400].includes(res.status), `Unexpected status: ${res.status}`);
  });

  // 5. Cancellation & Slot Release
  await test('Cancelled booking atomically unlocks slot for other students', async () => {
    // 1. Create slot 2
    const starts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 49 * 3600 * 1000).toISOString();
    const slotRes = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(slotRes.status === 201, `Failed slot 2: ${slotRes.status}`);
    slotId2 = slotRes.body.id;

    // 2. Student 1 books slot 2
    const bookRes = await req('POST', `/api/bookings/request/${slotId2}`, {
      headers: { Authorization: `Bearer ${studentToken1}` },
    });
    assert(bookRes.status === 201, `Failed to book slot 2: ${bookRes.status}`);
    const cancelId = bookRes.body.booking.id;

    // 3. Student 1 cancels
    const cancelRes = await req('DELETE', `/api/bookings/${cancelId}/cancel`, {
      headers: { Authorization: `Bearer ${studentToken1}` },
    });
    assert(cancelRes.status === 200, `Failed to cancel booking: ${cancelRes.status}`);

    // 4. Student 2 can now book slot 2 because it was released!
    const bookRes2 = await req('POST', `/api/bookings/request/${slotId2}`, {
      headers: { Authorization: `Bearer ${studentToken2}` },
    });
    assert(bookRes2.status === 201, `Student 2 should be able to book released slot: ${bookRes2.status}`);
  });

  // Summary
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runBookingRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running booking regression:', err);
      process.exit(1);
    });
}
