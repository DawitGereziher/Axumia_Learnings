#!/usr/bin/env node
/**
 * 05-QUIZ-REGRESSION.MJS
 * Gateway Test Suite: Lesson Quizzes, Question Authoring, Anti-Cheat Answer Stripping & Assessment Gating.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/05-quiz-regression.mjs [--url http://localhost:3000]
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

export async function runQuizRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 5: Quizzes, Anti-Cheat & Assessment Gating Gate      ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `quiz_author_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Quiz',
    last_name: 'Professor',
    role: 'instructor',
  };
  const outsiderInstructor = {
    email: `quiz_intruder_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Unauth',
    last_name: 'Instructor',
    role: 'instructor',
  };
  const enrolledStudent = {
    email: `quiz_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Smart',
    last_name: 'Student',
    role: 'student',
  };
  const unenrolledStudent = {
    email: `quiz_outsider_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Outsider',
    last_name: 'Student',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let outsiderToken = '';
  let studentToken = '';
  let unenrolledToken = '';

  let courseId = '';
  let sectionId = '';
  let lessonId = '';
  let quizId = '';
  let mcQuestionId = '';
  let tfQuestionId = '';
  let textQuestionId = '';

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
  await test('Register and approve course instructor and outsider instructor', async () => {
    // 1. Course Instructor
    const r1 = await req('POST', '/auth/register', { body: instructor });
    assert(r1.status === 201, `Failed to register instructor: ${r1.status}`);
    instructorToken = r1.body.accessToken;

    const kyc1 = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Senior Quizmaster', hourly_rate: 600, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kyc1.status === 201, `Failed to submit KYC 1: ${kyc1.status}`);

    const ap1 = await req('PATCH', `/api/admin/kyc/${kyc1.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap1.status === 200, `Failed to approve KYC 1: ${ap1.status}`);

    // 2. Outsider Instructor
    const r2 = await req('POST', '/auth/register', { body: outsiderInstructor });
    assert(r2.status === 201, `Failed to register outsider instructor: ${r2.status}`);
    outsiderToken = r2.body.accessToken;

    const kyc2 = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${outsiderToken}` },
      body: { headline: 'Third-Party Tutor', hourly_rate: 400, kyc_docs: ['kyc/doc2.pdf'] },
    });
    assert(kyc2.status === 201, `Failed to submit KYC 2: ${kyc2.status}`);

    const ap2 = await req('PATCH', `/api/admin/kyc/${kyc2.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap2.status === 200, `Failed to approve KYC 2: ${ap2.status}`);

    // 3. Create course, section & non-preview lesson
    const cRes = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Comprehensive Knowledge Assessment Course ${ts}`,
        description: 'Testing quiz authoring, grading accuracy and anti-cheat answer stripping.',
        price: 0,
      },
    });
    assert(cRes.status === 201, `Failed to create course: ${cRes.status}`);
    courseId = cRes.body.id;

    const sRes = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { title: 'Chapter 1: Security Fundamentals', position: 1 },
    });
    assert(sRes.status === 201, `Failed to create section: ${sRes.status}`);
    sectionId = sRes.body.id;

    const lRes = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Web Security Architecture',
        description: 'Contains a mandatory gating assessment quiz.',
        section_id: sectionId,
        content_type: 'text',
        external_url: 'https://axumia.com/guide.txt',
        duration_s: 180,
        requires_progress: false,
        is_free_preview: false,
      },
    });
    assert(lRes.status === 201, `Failed to create lesson: ${lRes.status}`);
    lessonId = lRes.body.id;

    const pubRes = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(pubRes.status === 200, `Failed to publish course: ${pubRes.status}`);
  });

  await test('Register enrolled student and unenrolled control student', async () => {
    const s1 = await req('POST', '/auth/register', { body: enrolledStudent });
    assert(s1.status === 201, `Failed student 1: ${s1.status}`);
    studentToken = s1.body.accessToken;

    const s2 = await req('POST', '/auth/register', { body: unenrolledStudent });
    assert(s2.status === 201, `Failed student 2: ${s2.status}`);
    unenrolledToken = s2.body.accessToken;

    // Student 1 enrolls in the free course
    const enr = await req('POST', `/api/courses/${courseId}/enroll-free`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(enr.status), `Failed student enrollment: ${enr.status}`);
  });

  // ── 2. Instructor Quiz Authoring & Gating ───────────────────────────
  await test('Instructor creates assessment quiz for lesson (201)', async () => {
    const res = await req('POST', '/api/quizzes', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        lesson_id: lessonId,
        title: 'Chapter 1 Assessment: Security & Architecture',
        description: 'Test your grasp of anti-cheat, JWT security, and encryption.',
        pass_score: 75,
        max_attempts: 3,
        is_gating: true,
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing quiz ID');
    assert(res.body?.pass_score === 75, `Expected pass_score 75, got ${res.body?.pass_score}`);
    assert(res.body?.is_gating === true, 'Expected is_gating to be true');
    quizId = res.body.id;
  });

  await test('Creating duplicate quiz on same lesson is rejected with 409 Conflict', async () => {
    const res = await req('POST', '/api/quizzes', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        lesson_id: lessonId,
        title: 'Duplicate Quiz Title',
      },
    });
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
  });

  await test('Outsider instructor cannot add question to another instructor\'s quiz (403)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
      body: {
        question: 'Malicious question injection',
        type: 'true_false',
        options: ['True', 'False'],
        correct: '0',
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // ── 3. Question Authoring: MC, True/False & Text ─────────────────────
  await test('Instructor adds multiple-choice question (201)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        question: 'Which HTTP header prevents CSRF token stripping on cross-origin requests?',
        type: 'multiple_choice',
        options: [
          'Authorization: Bearer <token>',
          'X-Requested-With: XMLHttpRequest',
          'Sec-Fetch-Site: same-origin',
          'Content-Type: application/json',
        ],
        correct: '2', // Sec-Fetch-Site
        explanation: 'Sec-Fetch-Site indicates whether a request originated from the same origin or cross-site.',
        points: 2,
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing question ID');
    assert(res.body?.position === 0, `Expected position 0, got ${res.body?.position}`);
    mcQuestionId = res.body.id;
  });

  await test('Instructor adds true/false question (201)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        question: 'JWT signature verification completely prevents replay attacks on burned refresh tokens.',
        type: 'true_false',
        options: ['True', 'False'],
        correct: '1', // False (requires token rotation blacklist in Redis)
        explanation: 'Stateless signatures alone cannot detect token replay; a server-side Redis burned token store is required.',
        points: 1,
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing question ID');
    assert(res.body?.position === 1, `Expected position 1, got ${res.body?.position}`);
    tfQuestionId = res.body.id;
  });

  await test('Instructor adds text keyword question (201)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/questions`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        question: 'Which relational database does AXumia Learnings use for transactional persistence?',
        type: 'text',
        correct: 'PostgreSQL',
        explanation: 'PostgreSQL 15 provides durable relational data storage via Prisma ORM.',
        points: 1,
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing question ID');
    assert(res.body?.position === 2, `Expected position 2, got ${res.body?.position}`);
    textQuestionId = res.body.id;
  });

  await test('Instructor reorders questions (swaps position 0 and 1)', async () => {
    const res = await req('PATCH', `/api/quizzes/${quizId}/questions/${mcQuestionId}/reorder?direction=down`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
  });

  // ── 4. Anti-Cheat Zero-Leakage & Access Control Gates ────────────────
  await test('Unenrolled student cannot access quiz for non-preview lesson (403)', async () => {
    const res = await req('GET', `/api/quizzes/lesson/${lessonId}`, {
      headers: { Authorization: `Bearer ${unenrolledToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Enrolled student receives sanitized quiz with correct answers and explanations REDACTED', async () => {
    const res = await req('GET', `/api/quizzes/lesson/${lessonId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.questions?.length === 3, `Expected 3 questions, got ${res.body?.questions?.length}`);

    for (const q of res.body.questions) {
      assert(q.correct === undefined, `Anti-cheat violation: 'correct' answer leaked on question ${q.id}`);
      assert(q.explanation === undefined, `Anti-cheat violation: 'explanation' leaked before submission on ${q.id}`);
      assert(Array.isArray(q.options) || q.type === 'text', `Options missing on question ${q.id}`);
      assert(q.question, `Question prompt missing on question ${q.id}`);
    }
  });

  await test('Instructor receives full unredacted quiz details for editing studio', async () => {
    const res = await req('GET', `/api/quizzes/lesson/${lessonId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.questions?.length === 3, `Expected 3 questions, got ${res.body?.questions?.length}`);

    for (const q of res.body.questions) {
      assert(q.correct !== undefined, `Instructor must see correct answer for question ${q.id}`);
      assert(q.explanation !== undefined, `Instructor must see explanation for question ${q.id}`);
    }
  });

  // ── 5. Attempt Submission & Grading ─────────────────────────────────
  await test('Unenrolled student cannot submit quiz attempt (403)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/attempt`, {
      headers: { Authorization: `Bearer ${unenrolledToken}` },
      body: {
        time_taken: 45,
        answers: [
          { question_id: mcQuestionId, answer: '0' },
          { question_id: tfQuestionId, answer: '0' },
          { question_id: textQuestionId, answer: 'MySQL' },
        ],
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Enrolled student submits failing attempt (0% score -> passed: false)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        time_taken: 60,
        answers: [
          { question_id: mcQuestionId, answer: '0' },         // Wrong (correct: '2')
          { question_id: tfQuestionId, answer: '0' },         // Wrong (correct: '1')
          { question_id: textQuestionId, answer: 'MongoDB' }, // Wrong (correct: 'PostgreSQL')
        ],
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.passed === false, 'Expected quiz attempt to fail');
    assert(res.body?.score === 0, `Expected score 0, got ${res.body?.score}`);
    assert(res.body?.earned === 0, `Expected 0 earned points, got ${res.body?.earned}`);
    // Post-submission feedback: explanations are now visible
    assert(res.body?.answers?.every((a) => a.explanation !== undefined), 'Explanations must be included post-submission');
  });

  await test('Student retrieves past attempts history (1 attempt recorded)', async () => {
    const res = await req('GET', `/api/quizzes/${quizId}/attempts/mine`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected attempts array');
    assert(res.body.length === 1, `Expected 1 past attempt, got ${res.body.length}`);
    assert(res.body[0]?.passed === false, 'Expected attempt status to match');
  });

  await test('Enrolled student submits passing attempt (100% score -> passed: true)', async () => {
    const res = await req('POST', `/api/quizzes/${quizId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        time_taken: 50,
        answers: [
          { question_id: mcQuestionId, answer: '2' },             // Correct (2 pts)
          { question_id: tfQuestionId, answer: '1' },             // Correct (1 pt)
          { question_id: textQuestionId, answer: 'postgresql' },   // Correct case-insensitive (1 pt)
        ],
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.passed === true, 'Expected quiz attempt to pass');
    assert(res.body?.score === 100, `Expected score 100, got ${res.body?.score}`);
    assert(res.body?.earned === res.body?.total, 'Earned points must equal total points');
  });

  // ── 6. Max Attempts Enforcement & Security Gating ───────────────────
  await test('Attempt limit enforcement: 3rd attempt blocked when max_attempts = 2', async () => {
    // 1. Instructor updates quiz max_attempts = 2
    const upRes = await req('PATCH', `/api/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { max_attempts: 2 },
    });
    assert(upRes.status === 200, `Failed to update quiz settings: ${upRes.status}`);

    // 2. Student attempts 3rd submission (already has 2 attempts) -> rejected 400
    const res = await req('POST', `/api/quizzes/${quizId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        time_taken: 30,
        answers: [{ question_id: mcQuestionId, answer: '2' }],
      },
    });
    assert(res.status === 400, `Expected 400 Bad Request on exceeding max_attempts, got ${res.status}`);
  });

  await test('Outsider instructor cannot view student quiz attempts (403)', async () => {
    const res = await req('GET', `/api/quizzes/${quizId}/attempts`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Course instructor can inspect all student submissions for their quiz', async () => {
    const res = await req('GET', `/api/quizzes/${quizId}/attempts`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected attempts list');
    assert(res.body.length === 2, `Expected 2 student attempts, got ${res.body.length}`);
  });

  // ── 7. Quiz Authoring Cleanup ───────────────────────────────────────
  await test('Instructor deletes question and entire quiz cleanly', async () => {
    // 1. Delete single question
    const qDel = await req('DELETE', `/api/quizzes/${quizId}/questions/${textQuestionId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(qDel.status === 200, `Failed to delete question: ${qDel.status}`);

    // 2. Delete entire quiz
    const quizDel = await req('DELETE', `/api/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(quizDel.status === 200, `Failed to delete quiz: ${quizDel.status}`);

    // 3. Confirm reading quiz now returns 404
    const notFound = await req('GET', `/api/quizzes/lesson/${lessonId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(notFound.status === 404, `Expected 404 Not Found, got ${notFound.status}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runQuizRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running quiz regression:', err);
      process.exit(1);
    });
}

