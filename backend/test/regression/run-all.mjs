#!/usr/bin/env node
/**
 * RUN-ALL.MJS
 * Master Release Gateway Test Runner for AXumia Learnings.
 *
 * Runs all 12 critical gateway test suites sequentially and exits with code 0 on
 * total success, or code 1 if any regression is detected.
 *
 * Usage:
 *   node backend/test/regression/run-all.mjs [--url http://localhost:3000]
 */

import { runAuthRegression } from './01-auth-regression.mjs';
import { runKycRegression } from './02-kyc-regression.mjs';
import { runCourseRegression } from './03-course-regression.mjs';
import { runLearningRegression } from './04-learning-regression.mjs';
import { runQuizRegression } from './05-quiz-regression.mjs';
import { runTutoringRegression } from './06-tutoring-regression.mjs';
import { runHelpEscrowRegression } from './07-help-escrow-regression.mjs';
import { runPaymentsRegression } from './08-payments-regression.mjs';
import { runResourcesRegression } from './09-resources-regression.mjs';
import { runReviewsRegression } from './10-reviews-regression.mjs';
import { runGamificationRegression } from './11-gamification-regression.mjs';
import { runStorageMonitoringRegression } from './12-storage-monitoring-regression.mjs';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};

async function main() {
  console.log(`\n${c.bold}${c.cyan}╔════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   AXumia Learnings — Master Comprehensive Release Gateway Runner          ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚════════════════════════════════════════════════════════════════════════════╝${c.reset}`);

  const suites = [
    { name: 'Gateway 1: Auth, Token Lifecycle & RBAC Security', runner: runAuthRegression },
    { name: 'Gateway 2: Instructor KYC & Compliance Gate', runner: runKycRegression },
    { name: 'Gateway 3: Courses, Curriculum & Zero-Leakage Gate', runner: runCourseRegression },
    { name: 'Gateway 4: Learning Progress, Heartbeat & Certificates Gate', runner: runLearningRegression },
    { name: 'Gateway 5: Quizzes, Anti-Cheat & Assessment Gating Gate', runner: runQuizRegression },
    { name: 'Gateway 6: 1-on-1 Tutoring, Slots & Collision Locking Gate', runner: runTutoringRegression },
    { name: 'Gateway 7: Help Requests, Bidding & Escrow Release Gate', runner: runHelpEscrowRegression },
    { name: 'Gateway 8: Chapa Payments, Webhook HMAC & Payouts Gate', runner: runPaymentsRegression },
    { name: 'Gateway 9: Shared Resources, RBAC Authoring & Downloads Gate', runner: runResourcesRegression },
    { name: 'Gateway 10: Reviews, Verified Attendance & Anti-Tamper Gate', runner: runReviewsRegression },
    { name: 'Gateway 11: Gamification, XP Anti-Tamper & Leaderboard Gate', runner: runGamificationRegression },
    { name: 'Gateway 12: R2 Storage Security & Session Health Gate', runner: runStorageMonitoringRegression },
  ];

  let allPassed = true;
  const results = [];

  for (const suite of suites) {
    const start = Date.now();
    try {
      const success = await suite.runner();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      results.push({ name: suite.name, success, elapsed });
      if (!success) {
        allPassed = false;
      }
    } catch (err) {
      console.error(`\nSuite "${suite.name}" crashed with error:`, err);
      results.push({ name: suite.name, success: false, elapsed: 0 });
      allPassed = false;
    }
  }

  console.log(`\n${c.bold}══════════════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  COMPREHENSIVE RELEASE GATEWAY SUMMARY:${c.reset}`);
  console.log(`${c.bold}══════════════════════════════════════════════════════════════════════════════${c.reset}`);

  for (const res of results) {
    const icon = res.success ? `${c.green}✔ PASS${c.reset}` : `${c.red}✖ FAIL${c.reset}`;
    console.log(`  ${icon}  ${res.name.padEnd(68)} [${res.elapsed}s]`);
  }

  console.log(`${c.bold}══════════════════════════════════════════════════════════════════════════════${c.reset}`);
  if (allPassed) {
    console.log(`\n  ${c.green}${c.bold}ALL 12 GATEWAY RELEASE SUITES PASSED! PRODUCTION RELEASE APPROVED.${c.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${c.red}${c.bold}GATEWAY REGRESSION DETECTED! RELEASE MUST BE BLOCKED.${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal runner failure:', err);
  process.exit(1);
});
