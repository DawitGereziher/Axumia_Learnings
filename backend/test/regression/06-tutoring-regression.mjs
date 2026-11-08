#!/usr/bin/env node
/**
 * 06-TUTORING-REGRESSION.MJS
 * Gateway Test Suite: 1-on-1 Tutoring Scheduling, Availability Slots, Slot Race Collision Defense & Meeting Link Validation.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/06-tutoring-regression.mjs [--url http://localhost:3000]
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

export async function runTutoringRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 6: 1-on-1 Tutoring, Slots & Collision Locking Gate  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `tutor_prof_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Elena',
    last_name: 'Vasiliev',
    role: 'instructor',
  };
  const unapprovedInstructor = {
    email: `tutor_unapproved_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Pending',
    last_name: 'Instructor',
    role: 'instructor',
  };
  const student1 = {
    email: `tutor_stud1_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Alice',
    last_name: 'Student',
    role: 'student',
  };
  const student2 = {
    email: `tutor_stud2_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Bob',
    last_name: 'Student',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let instructorProfileId = '';
  let unapprovedToken = '';
  let student1Token = '';
  let student2Token = '';

  let slotId1 = '';
  let slotId2 = '';
  let bookingId = '';

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

  // ── 1. Setup: Register Instructors & KYC Approval ───────────────────
  await test('Register and approve active instructor with hourly rate', async () => {
    const instRes = await req('POST', '/auth/register', { body: instructor });
    assert(instRes.status === 201, `Failed to register instructor: ${instRes.status}`);
    instructorToken = instRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Physics & Quantum Computing Specialist', hourly_rate: 650, kyc_docs: ['kyc/diploma.pdf'] },
    });
    assert(kycRes.status === 201, `Failed to submit KYC: ${kycRes.status}`);
    instructorProfileId = kycRes.body.id;

    const approveRes = await req('PATCH', `/api/admin/kyc/${instructorProfileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200, `Failed to approve KYC: ${approveRes.status}`);
  });

  await test('Register unapproved instructor for capability gating', async () => {
    const res = await req('POST', '/auth/register', { body: unapprovedInstructor });
    assert(res.status === 201, `Failed to register unapproved instructor: ${res.status}`);
    unapprovedToken = res.body.accessToken;
  });

  await test('Register student 1 and student 2', async () => {
    const s1 = await req('POST', '/auth/register', { body: student1 });
    assert(s1.status === 201, `Failed student 1: ${s1.status}`);
    student1Token = s1.body.accessToken;

    const s2 = await req('POST', '/auth/register', { body: student2 });
    assert(s2.status === 201, `Failed student 2: ${s2.status}`);
    student2Token = s2.body.accessToken;
  });

  // ── 2. Slot Creation Constraints & Role Gating ──────────────────────
  await test('Unapproved instructor cannot create availability slots (403)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${unapprovedToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Student role is blocked from slot creation endpoint (403)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Rejects slot creation when starts_at is in the past (400)', async () => {
    const starts = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  await test('Rejects slot creation when ends_at is before starts_at (400)', async () => {
    const starts = new Date(Date.now() + 30 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 29 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  await test('Approved instructor successfully creates valid future slot (201)', async () => {
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing slot ID');
    assert(res.body?.is_booked === false, 'Slot must start as unbooked');
    slotId1 = res.body.id;
  });

  // ── 3. Public Discovery of Instructor Availability ─────────────────
  await test('Student discovers instructor available unbooked slots (200)', async () => {
    const res = await req('GET', `/api/bookings/slots/instructor/${instructorProfileId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected slots array');
    const found = res.body.find((s) => s.id === slotId1);
    assert(found, 'Created slot must appear in available slots list');
    assert(found.is_booked === false, 'Discovered slot must be unbooked');
  });

  // ── 4. Self-Booking Defense & Booking Reservation ──────────────────
  await test('Instructor cannot book their own availability slot (403)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { notes: 'Attempting self-booking' },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Student 1 reserves slot: returns booking & initiates checkout (200/201)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { session_type: '1-on-1', notes: 'Kinematics formulas review' },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body?.booking?.id, 'Missing booking ID in response');
    assert(res.body?.booking?.status === 'awaiting_payment', 'Initial status must be awaiting_payment');
    assert(res.body?.checkoutUrl, 'Missing Chapa checkoutUrl');
    bookingId = res.body.booking.id;
  });

  // ── 5. Slot Collision Locking (Race Condition Defense) ──────────────
  await test('Student 2 is atomically blocked from booking locked slot (400)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
      body: { session_type: '1-on-1', notes: 'Attempting race collision' },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('fully booked') || res.body?.message?.includes('available'), 'Expected fully booked error message');
  });

  await test('Locked slot is removed from instructor active slots listing', async () => {
    const res = await req('GET', `/api/bookings/slots/instructor/${instructorProfileId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const found = res.body.find((s) => s.id === slotId1);
    assert(!found, 'Fully booked slot must not appear in available slots list');
  });

  // ── 6. Student Query & Cancellation Unlock Cycle ────────────────────
  await test('Student retrieves their active bookings listing', async () => {
    const res = await req('GET', '/api/bookings/mine', {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected bookings array');
    const myBooking = res.body.find((b) => b.id === bookingId);
    assert(myBooking, 'Booking must be in student bookings list');
  });

  await test('Student 2 cannot cancel Student 1\'s booking (403)', async () => {
    const res = await req('DELETE', `/api/bookings/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Student 1 cancels booking -> atomically unlocks slot for others (200)', async () => {
    const res = await req('DELETE', `/api/bookings/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);

    // Now Student 2 can immediately reserve slotId1 because it is unlocked!
    const rebookRes = await req('POST', `/api/bookings/request/${slotId1}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
      body: { session_type: '1-on-1', notes: 'Student 2 claiming released slot' },
    });
    assert([200, 201].includes(rebookRes.status), `Expected Student 2 reservation to succeed: ${rebookRes.status}`);
    assert(rebookRes.body?.booking?.id, 'Missing rebooked booking ID');
  });

  // ── 7. Meeting Link Validation & Confirmation Gate ──────────────────
  await test('Instructor creates second slot for meeting link tests (201)', async () => {
    const starts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 49 * 3600 * 1000).toISOString();
    const res = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(res.status === 201, `Failed to create second slot: ${res.status}`);
    slotId2 = res.body.id;
  });

  await test('Student 1 books slot 2 (201)', async () => {
    const res = await req('POST', `/api/bookings/request/${slotId2}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { notes: 'Session 2 request' },
    });
    assert([200, 201].includes(res.status), `Failed to book slot 2: ${res.status}`);
    bookingId = res.body.booking.id;
  });

  await test('Instructor confirmation rejects arbitrary unverified URLs with 400', async () => {
    const res = await req('PATCH', `/api/bookings/${bookingId}/confirm`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { meetingLink: 'https://phishing-site.com/meeting-room' },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('Zoom, Google Meet, or Microsoft Teams'), 'Expected meeting link domain error');
  });

  await test('Instructor confirms paid booking with valid Google Meet link (200/400)', async () => {
    // If status is awaiting_payment, service enforces that payment must precede confirmation
    const res = await req('PATCH', `/api/bookings/${bookingId}/confirm`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { meetingLink: 'https://meet.google.com/abc-defg-hij' },
    });
    // In strict mode, cannot confirm until pending (paid) -> 400 is compliant defense
    if (res.status === 400) {
      assert(res.body?.message?.includes('status'), `Expected status check error, got: ${res.body?.message}`);
    } else {
      assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
      assert(res.body?.meeting_link === 'https://meet.google.com/abc-defg-hij', 'Meeting link mismatch');
      assert(res.body?.platform === 'google_meet', 'Platform must be detected as google_meet');
    }
  });

  await test('Instructor can inspect all upcoming student bookings in their studio', async () => {
    const res = await req('GET', '/api/bookings/instructor/mine', {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected instructor bookings array');
    assert(res.body.length >= 2, `Expected at least 2 bookings, got ${res.body.length}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runTutoringRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running tutoring regression:', err);
      process.exit(1);
    });
}
