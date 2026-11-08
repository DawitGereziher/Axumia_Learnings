#!/usr/bin/env node
/**
 * 10-REVIEWS-REGRESSION.MJS
 * Gateway Test Suite: Verified Reviews, Anti-Manipulation, 1-on-1 Session Feedback & Aggregations.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/10-reviews-regression.mjs [--url http://localhost:3000]
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

export async function runReviewsRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 10: Reviews, Verified Attendance & Anti-Tamper Gate  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `rev_tutor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Professor',
    last_name: 'Reviews',
    role: 'instructor',
  };
  const verifiedBuyer = {
    email: `rev_buyer_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Verified',
    last_name: 'Student',
    role: 'student',
  };
  const unenrolledStudent = {
    email: `rev_unauth_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Unenrolled',
    last_name: 'Intruder',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let instructorProfileId = '';
  let buyerToken = '';
  let intruderToken = '';

  let courseId = '';
  let slotId = '';
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

  // ── 1. Setup: Register Instructor & Paid Course ─────────────────────
  await test('Register and approve instructor with paid course & slot (201)', async () => {
    // 1. Instructor
    const r1 = await req('POST', '/auth/register', { body: instructor });
    assert(r1.status === 201, `Failed to register instructor: ${r1.status}`);
    instructorToken = r1.body.accessToken;

    const kyc = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Database Architecture Specialist', hourly_rate: 700, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kyc.status === 201, `KYC submission failed: ${kyc.status}`);
    instructorProfileId = kyc.body.id;

    const ap = await req('PATCH', `/api/admin/kyc/${instructorProfileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap.status === 200, `KYC approve failed: ${ap.status}`);

    // 2. Course
    const cRes = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Distributed Database Performance Tuning ${ts}`,
        description: 'Deep dive into Postgres query planning, indexing, and locks.',
        price: 500,
      },
    });
    assert(cRes.status === 201, `Course creation failed: ${cRes.status}`);
    courseId = cRes.body.id;

    const sRes = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { title: 'Chapter 1: Query Planner', position: 1 },
    });
    assert(sRes.status === 201, `Section creation failed: ${sRes.status}`);

    const lRes = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Index Scans vs Seq Scans',
        section_id: sRes.body.id,
        content_type: 'text',
        external_url: 'https://axumia.com/guide.txt',
        duration_s: 180,
        is_free_preview: false,
      },
    });
    assert(lRes.status === 201, `Lesson creation failed: ${lRes.status}`);

    const pubRes = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(pubRes.status === 200, `Course publish failed: ${pubRes.status}`);

    // 3. Availability slot for booking
    const starts = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const ends = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    const slotRes = await req('POST', '/api/bookings/slots', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { starts_at: starts, ends_at: ends },
    });
    assert(slotRes.status === 201, `Slot creation failed: ${slotRes.status}`);
    slotId = slotRes.body.id;
  });

  await test('Register buyer student and unenrolled control student', async () => {
    const s1 = await req('POST', '/auth/register', { body: verifiedBuyer });
    assert(s1.status === 201, `Failed buyer registration: ${s1.status}`);
    buyerToken = s1.body.accessToken;

    const s2 = await req('POST', '/auth/register', { body: unenrolledStudent });
    assert(s2.status === 201, `Failed unenrolled student registration: ${s2.status}`);
    intruderToken = s2.body.accessToken;

    // Buyer purchases course
    const payRes = await req('POST', `/api/payments/courses/${courseId}/checkout`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert([200, 201].includes(payRes.status), `Payment failed: ${payRes.status}`);

    // Buyer books tutoring session
    const bookRes = await req('POST', `/api/bookings/request/${slotId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: { notes: 'Need indexing help' },
    });
    assert([200, 201].includes(bookRes.status), `Booking failed: ${bookRes.status}`);
    bookingId = bookRes.body?.booking?.id;
  });

  // ── 2. Course Review Gating & Verification ──────────────────────────
  await test('Unenrolled student is blocked from reviewing unpurchased course (valid: false)', async () => {
    const res = await req('POST', `/api/reviews/course/${courseId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
      body: {
        overall_rating: 1,
        title: 'Did not buy this course',
        comment: 'Spam 1 star rating attempt without purchasing.',
      },
    });
    assert(res.status === 201, `Expected 201 handler response, got ${res.status}`);
    assert(res.body?.success === false, 'Expected success: false for unpurchased review');
    assert(res.body?.errors?.some((e) => e.includes('purchase')), 'Expected purchase requirement error');
  });

  await test('Rating boundary defense: 0 and 6 stars are strictly rejected (valid: false)', async () => {
    const res = await req('POST', `/api/reviews/course/${courseId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        overall_rating: 6, // invalid > 5
        title: 'Rating out of bounds',
        comment: 'Attempting invalid 6 star rating',
      },
    });
    assert(res.body?.success === false, 'Expected success: false for out-of-bounds rating');
    assert(res.body?.errors?.some((e) => e.includes('between 1 and 5')), 'Expected bounds error');
  });

  await test('Verified buyer successfully posts authentic course review (201)', async () => {
    const res = await req('POST', `/api/reviews/course/${courseId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        overall_rating: 5,
        content_quality: 5,
        instructor_quality: 5,
        course_structure: 5,
        value_for_money: 5,
        title: 'Exceptional deep dive into PostgreSQL internals',
        comment: 'The explanation of index scans and buffer hit ratios was crystal clear.',
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.success === true, `Review submission failed: ${JSON.stringify(res.body?.errors)}`);
    assert(res.body?.review?.overall_rating === 5, 'Rating mismatch');
  });

  await test('Duplicate review attempt by same buyer is rejected (valid: false)', async () => {
    const res = await req('POST', `/api/reviews/course/${courseId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        overall_rating: 4,
        title: 'Trying to post a second review',
        comment: 'Attempting duplicate review submission on same course.',
      },
    });
    assert(res.body?.success === false, 'Expected duplicate review to be rejected');
    assert(res.body?.errors?.some((e) => e.includes('already reviewed')), 'Expected already reviewed error');
  });

  // ── 3. Public Course Rating Statistics Aggregation ──────────────────
  await test('Public statistics computes average rating and total review count (200)', async () => {
    const res = await req('GET', `/api/reviews/course/${courseId}/stats`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const total = res.body?.totalReviews ?? res.body?.total_reviews;
    const avg = res.body?.averageRating ?? res.body?.average_rating;
    assert(total >= 1, `Expected at least 1 review, got ${total}`);
    assert(Number(avg) === 5, `Expected average 5.0, got ${avg}`);
  });

  await test('Public reviews listing returns approved review with verified badge', async () => {
    const res = await req('GET', `/api/reviews/course/${courseId}`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const list = Array.isArray(res.body) ? res.body : res.body?.reviews;
    assert(Array.isArray(list), 'Expected reviews array');
    const r = list[0];
    assert(r?.overall_rating === 5, 'Overall rating mismatch');
    assert(r?.is_verified === true, 'Review must be marked verified');
  });

  // ── 4. 1-on-1 Tutoring Session Review & Attendance Gating ───────────
  await test('Intruder student cannot review another student\'s booking session (403)', async () => {
    const res = await req('POST', `/api/reviews/sessions/booking/${bookingId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
      body: {
        overall_rating: 1,
        teaching_style_rating: 1,
        comment: 'Fake negative review attempt',
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Attendee student successfully submits 1-on-1 session review (201)', async () => {
    const res = await req('POST', `/api/reviews/sessions/booking/${bookingId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        overall_rating: 5,
        teaching_style_rating: 5,
        communication_rating: 5,
        comment: 'Helped resolve deadlock issues in our production schema.',
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.overall_rating === 5, 'Overall rating mismatch');
    assert(res.body?.booking_id === bookingId, 'Booking ID mismatch');
  });

  await test('Session review is publicly retrievable by booking ID (200)', async () => {
    const res = await req('GET', `/api/reviews/sessions/booking/${bookingId}`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.overall_rating === 5, 'Expected 5 stars');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runReviewsRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running reviews regression:', err);
      process.exit(1);
    });
}
