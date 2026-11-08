#!/usr/bin/env node
/**
 * 11-GAMIFICATION-REGRESSION.MJS
 * Gateway Test Suite: Gamification XP Anti-Tamper, Lesson/Quiz Verification, Streaks & Leaderboard.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/11-gamification-regression.mjs [--url http://localhost:3000]
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

export async function runGamificationRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 11: Gamification, XP Anti-Tamper & Leaderboard Gate  ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `game_tutor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Professor',
    last_name: 'Gamification',
    role: 'instructor',
  };
  const student = {
    email: `game_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Alex',
    last_name: 'Learner',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let studentToken = '';

  let courseId = '';
  let lessonId = '';
  let quizId = '';
  let questionId = '';
  let purchaseId = '';

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

  // ── 1. Setup: Register Course, Lesson & Quiz ─────────────────────────
  await test('Register and approve instructor with published free course & quiz', async () => {
    const instRes = await req('POST', '/auth/register', { body: instructor });
    assert(instRes.status === 201, `Failed to register instructor: ${instRes.status}`);
    instructorToken = instRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Gamification Architect', hourly_rate: 500, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kycRes.status === 201, `KYC failed: ${kycRes.status}`);

    const ap = await req('PATCH', `/api/admin/kyc/${kycRes.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap.status === 200, `KYC approve failed: ${ap.status}`);

    // Create free course
    const cRes = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Gamified Learning Mechanics Course ${ts}`,
        description: 'Demonstrating verified XP awards, badges, and anti-tamper safeguards.',
        price: 0,
      },
    });
    assert(cRes.status === 201, `Course creation failed: ${cRes.status}`);
    courseId = cRes.body.id;

    const sRes = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { title: 'Chapter 1: Motivation Mechanics', position: 1 },
    });
    assert(sRes.status === 201, `Section creation failed: ${sRes.status}`);

    const lRes = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Intrinsic vs Extrinsic Drivers',
        section_id: sRes.body.id,
        content_type: 'text',
        external_url: 'https://axumia.com/notes.txt',
        duration_s: 120,
        requires_progress: false,
        is_free_preview: false,
      },
    });
    assert(lRes.status === 201, `Lesson creation failed: ${lRes.status}`);
    lessonId = lRes.body.id;

    const qRes = await req('POST', '/api/quizzes', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        lesson_id: lessonId,
        title: 'Motivation Check Quiz',
        pass_score: 70,
        max_attempts: 3,
        is_gating: true,
      },
    });
    assert(qRes.status === 201, `Quiz creation failed: ${qRes.status}`);
    quizId = qRes.body.id;

    const questRes = await req('POST', `/api/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        question: 'Which element is an extrinsic motivator?',
        type: 'multiple_choice',
        options: ['Mastery', 'Autonomy', 'XP Badges', 'Purpose'],
        correct: '2',
        points: 1,
      },
    });
    assert(questRes.status === 201, `Question creation failed: ${questRes.status}`);
    questionId = questRes.body.id;

    const pubRes = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(pubRes.status === 200, `Publish failed: ${pubRes.status}`);
  });

  await test('Register student and enroll in course', async () => {
    const sRes = await req('POST', '/auth/register', { body: student });
    assert(sRes.status === 201, `Failed to register student: ${sRes.status}`);
    studentToken = sRes.body.accessToken;

    const enrRes = await req('POST', `/api/courses/${courseId}/enroll-free`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(enrRes.status), `Enrollment failed: ${enrRes.status}`);
    purchaseId = enrRes.body?.purchase?.id;
  });

  // ── 2. Initial Gamification Profile ─────────────────────────────────
  await test('New student profile initializes with Level 1, 0 XP and full badge catalog (200)', async () => {
    const res = await req('GET', '/api/gamification/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.level === 1, `Expected level 1, got ${res.body?.level}`);
    assert(res.body?.total_xp === 0, `Expected 0 XP, got ${res.body?.total_xp}`);
    assert(Array.isArray(res.body?.badges), 'Expected badges array');
    assert(res.body?.badges?.length >= 10, 'Expected complete catalog of badges');
  });

  // ── 3. XP Anti-Tamper & Fraud Defense ───────────────────────────────
  await test('Tamper defense: Fake lesson_complete XP claim on uncompleted lesson is rejected (awarded: 0)', async () => {
    const res = await req('POST', '/api/gamification/award', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        reason: 'lesson_complete',
        metadata: { lesson_id: lessonId },
      },
    });
    assert(res.status === 201, `Expected 201 handler status, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body?.awarded === 0, 'Must award 0 XP for uncompleted lesson');
    assert(res.body?.message?.includes('not been completed'), 'Expected uncompleted lesson warning');
  });

  await test('Tamper defense: Client cannot forge internal streak_bonus reason (awarded: 0)', async () => {
    const res = await req('POST', '/api/gamification/award', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        reason: 'streak_bonus',
      },
    });
    assert(res.body?.awarded === 0, 'Must award 0 XP for forged streak bonus');
  });

  // ── 4. Verified XP Awarding & Badge Unlock ──────────────────────────
  await test('Student authentic lesson completion legitimately awards 20 XP + First Step badge', async () => {
    // 1. Mark lesson completed via verified enrollment endpoint
    const progRes = await req('POST', `/api/courses/lessons/${lessonId}/toggle-complete`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { purchaseId },
    });
    assert([200, 201].includes(progRes.status), `Progress failed: ${progRes.status}`);

    // 2. Award XP
    const awardRes = await req('POST', '/api/gamification/award', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        reason: 'lesson_complete',
        metadata: { lesson_id: lessonId },
      },
    });
    assert([200, 201].includes(awardRes.status), `Award failed: ${awardRes.status}`);
    assert(awardRes.body?.awarded === 20, `Expected 20 XP awarded, got ${awardRes.body?.awarded}`);
    assert(
      awardRes.body?.new_badges?.includes('first_lesson') ||
      awardRes.body?.new_badges?.some((b) => b === 'first_lesson' || b?.id === 'first_lesson'),
      'Expected first_lesson badge unlock',
    );
  });

  await test('Duplicate XP prevention: Re-claiming XP for same lesson is rejected (awarded: 0)', async () => {
    const res = await req('POST', '/api/gamification/award', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        reason: 'lesson_complete',
        metadata: { lesson_id: lessonId },
      },
    });
    assert(res.body?.awarded === 0, 'Expected 0 XP on duplicate lesson award');
    assert(res.body?.message?.includes('already awarded'), 'Expected already awarded notice');
  });

  await test('Student passes quiz with 100% score and claims 100 XP + Perfect Score badge', async () => {
    // 1. Submit authentic passing attempt
    const submitRes = await req('POST', `/api/quizzes/${quizId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        time_taken: 30,
        answers: [{ question_id: questionId, answer: '2' }],
      },
    });
    assert([200, 201].includes(submitRes.status), `Quiz submit failed: ${submitRes.status}`);
    assert(submitRes.body?.passed === true, 'Quiz attempt must pass');

    // 2. Award XP for quiz_perfect
    const awardRes = await req('POST', '/api/gamification/award', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        reason: 'quiz_perfect',
        metadata: { quiz_id: quizId },
      },
    });
    assert([200, 201].includes(awardRes.status), `Award failed: ${awardRes.status}`);
    assert(awardRes.body?.awarded === 100, `Expected 100 XP, got ${awardRes.body?.awarded}`);
  });

  // ── 5. Total Balance, Level Up & Leaderboard Ranking ────────────────
  await test('Student gamification profile reflects cumulative XP (120 XP) and Level 2 advancement', async () => {
    const res = await req('GET', '/api/gamification/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.total_xp === 120, `Expected 120 XP, got ${res.body?.total_xp}`);
    assert(res.body?.level === 2, `Expected Level 2 at 120 XP, got Level ${res.body?.level}`);
    const earnedBadges = res.body?.badges?.filter((b) => b.earned);
    assert(earnedBadges.length >= 2, `Expected at least 2 earned badges, got ${earnedBadges.length}`);
  });

  await test('Public leaderboard accurately ranks student among top learners (200)', async () => {
    const res = await req('GET', '/api/gamification/leaderboard', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected leaderboard array');
    const myRank = res.body.find((l) => l.total_xp >= 120);
    assert(myRank, 'Student with 120 XP must appear on the leaderboard');
    assert(myRank.level === 2, 'Leaderboard level mismatch');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runGamificationRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running gamification regression:', err);
      process.exit(1);
    });
}
