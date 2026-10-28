# Axumia Learnings — V1 Release Specification & Master Verification Guide

> **Document Status:** Complete & Frozen for V1 Launch  
> **Target Market:** Ethiopia (Low-Bandwidth Mobile Optimized, Zero-Cost Cloud Media Architecture)  
> **Regression Test Command:** `npm run test:api` (or `node backend/test/regression/run-all.mjs`)

---

## 1. Executive Summary & V1 Release Cutoff Boundary

To prevent scope creep and guarantee launch readiness, **V1 is strictly scoped to the core value loop**:

```
[Student / Tutor Auth] ──> [Instructor KYC Approval Gate] ──> [Course & 1-on-1 Discovery]
         │                                                                  │
         ▼                                                                  ▼
[Payout Ledger Settlement] <── [Session Escrow & Link] <── [Chapa Webhook & Idempotency]
```

### Strictly Frozen for V2 (Do NOT build before V1 launch):
- ❌ **Gamification, Streaks & Leaderboards**: Distraction before core learning retention is proven.
- ❌ **In-Platform WebRTC Video**: Kept on the **External Meeting Link Handshake** model (Zoom, Google Meet, Teams).
- ❌ **Complex Interactive Quizzes**: Keep course structure to lessons + PDF materials.
- ❌ **Native App Store Binaries**: Focus 100% on the mobile-first responsive PWA web client.
- ❌ **Multi-Currency International FX**: Keep payment gateway focused on Chapa (Telebirr, CBE Birr, cards).

---

## 2. Zero-Cost Media Infrastructure (YouTube + Cloudflare R2)

To eliminate AWS cloud storage and egress bandwidth fees:

| Content Type | Storage & Delivery Layer | Bandwidth / Egress Cost | Protection Mechanism |
| :--- | :--- | :--- | :--- |
| **Course Videos** | **YouTube (Unlisted Mode)** | **$0.00** (Handled by YouTube CDN) | `ProtectedYouTubePlayer`: right-click blocked, transparent shield overlays over YouTube branding/links, sandboxed iframe. |
| **Course PDFs & Slides** | **Cloudflare R2** (`axumia-private`) | **$0.00** ($0 egress fees, 10GB free tier) | Short-lived signed download URLs via `@aws-sdk/client-s3`. |
| **Thumbnails & Avatars** | **Cloudflare R2** (`axumia-public`) | **$0.00** (Free direct CDN cache) | Direct public URL bucket. |
| **KYC Identity Documents** | **Cloudflare R2** (`axumia-private`) | **$0.00** (Free private storage) | Admin-only signed preview URLs. |

---

## 3. V1 Master Implementation Checklist

### Pillar 1: Authentication, Role Security & Sessions (Phase 1)
- [x] **D-auth Integration**: Email/password registration, login, and Google OAuth callbacks.
- [x] **Refresh Token Rotation (RFC 6749 BCP)**: Single-use refresh tokens stored in DB. Consumption rotates token; replay attacks are rejected with `401`.
- [x] **Frontend Silent Refresh**: `AuthContext.tsx` and `api.ts` feature a refresh mutex to prevent concurrent 401 request storms.
- [x] **Role Protection Guards**:
  - `DAuthGuard`: Validates JWT Bearer tokens and extracts user context.
  - `RolesGuard`: Enforces `@Roles('student', 'instructor', 'admin')`.
  - `AdminGuard`: Blocks non-admins from all `/api/admin/*` routes with `403 Forbidden`.
- [x] **Rate Limiting**: Brute-force protection on `/auth/login`, `/auth/register`, and `/payments`.

### Pillar 2: Instructor Onboarding & KYC Approval Gate (Phase 2)
- [x] **Profile & KYC Submission**: `POST /api/users/me/instructor-profile` sets `kyc_status: 'submitted'` and `is_active: false`.
- [x] **No Auto-Approval Loophole**: Fixed vulnerability where instructor registration previously granted auto-approved status.
- [x] **Course Authoring Gate**: Unapproved instructors attempting to create or publish courses receive `403 Forbidden`.
- [x] **Slot Creation Gate**: Unapproved instructors attempting to open calendar slots receive `403 Forbidden`.
- [x] **Admin Verification Queue**:
  - `GET /api/admin/kyc/pending`: Admin inspects applications and signed KYC documents.
  - `PATCH /api/admin/kyc/:profileId`: Admin approves or rejects with reason notes. Rejection sets `is_active: false`.

### Pillar 3: Courses, YouTube Streaming & R2 Materials (Phase 3)
- [x] **Course Structure**: Course metadata, sections, and lesson ordering.
- [x] **Unlisted YouTube Video Integration**:
  - Instructor provides YouTube link; backend extracts `youtube_video_id` and sets `storage_type: 'youtube'`.
  - Non-enrolled students are blocked from paid lessons with `403 Forbidden`.
  - Enrolled students receive protected embed URL (`rel=0&modestbranding=1`).
- [x] **Cloudflare R2 Materials**: `LessonMaterial` records linked with PDFs, slides, and downloadable resources.
- [x] **Learning Player (`/courses/[slug]/learn`)**:
  - Sandboxed `ProtectedYouTubePlayer` preventing link leaks.
  - Lesson progress tracking saved via `POST /api/courses/lessons/:id/progress`.
- [x] **Marketplace Publishing**: Courses with title, description, and at least one lesson publish to public catalog (`GET /api/courses`).

### Pillar 4: 1-on-1 Tutoring, Slot Locking & Meeting Escrow (Phase 4)
- [x] **Future Slot Scheduling**: Instructors create availability slots with start/end time validation.
- [x] **Double-Booking Prevention**: Atomic database transactions lock slots during checkout, rejecting concurrent requests with `400 ("Slot is fully booked")`.
- [x] **Self-Booking Protection**: Tutors are blocked from booking their own slots with `403 Forbidden`.
- [x] **Meeting Link Handshake**:
  - Tutors confirm paid bookings by pasting meeting links.
  - Regex upgraded to support all Zoom subdomains (`us04web.zoom.us/j/`), Google Meet, and Microsoft Teams.
  - Malformed or phishing links rejected with `400 Bad Request`.
- [x] **Atomic Cancellation**: Unconfirmed/unpaid bookings can be cancelled, immediately releasing the slot for other students.
- [x] **Escrow Hold & Session Completion**: Admin/cron marks session `completed`, queuing payout funds for settlement.

### Pillar 5: Financial Ledger, Webhook Idempotency & Payouts (Phase 5)
- [x] **Chapa Payment Initiation**: Generates unique `provider_tx_ref`, records initial pending transaction with commission calculation.
- [x] **Webhook Idempotency**:
  - Network retries from Chapa short-circuit (`already_paid`) without double-crediting.
  - Course purchase uses atomic `upsert` on `{ user_id, course_id }`.
  - Duplicate checkout on owned courses rejected with `400 Bad Request`.
- [x] **Commission Accounting**: Platform deducts defined fee percentage (`platform_fee`), crediting the remainder to instructor balance.
- [x] **Instructor Payout Flow**:
  - Instructor views available earnings (`GET /api/payments/instructor/earnings`).
  - System rejects payout requests exceeding available balance (`400 Bad Request`).
  - Valid requests log pending payouts with Telebirr, CBE Birr, or Bank Transfer details.
- [x] **Admin Settlement Queue**: Admin reviews `GET /api/admin/payouts/pending` and marks settled payouts as `paid`.

### Pillar 6: Production Health, Docker & Kubernetes (Phase 6)
- [x] **Unified Health Probe (`/health`)**: Reports DB status (`SELECT 1`), Redis queue status, latency, and uptime.
- [x] **Kubernetes Alignment**: `k8s/backend.yaml` liveness & readiness probes pointed to `/health` on port 3000.
- [x] **Docker Compose Hardening**:
  - Backend includes `healthcheck` testing `/health`.
  - Frontend `web` uses `condition: service_healthy` on `backend`.
  - Nginx gateway routes `/auth`, `/health`, `/api`, and `/` with gzip compression and WebSocket forwarding.

---

## 4. The Living Master Regression Suite

Axumia uses a **living test harness** designed so existing tests remain permanent guards against regressions as new features are added:

```
backend/test/regression/
├── 01-auth-lifecycle.spec.ts        <- Phase 1: Auth, Tokens & RBAC
├── 01-auth-regression.mjs
├── 02-kyc-gate.spec.ts              <- Phase 2: KYC & Marketplace Gating
├── 02-kyc-regression.mjs
├── 03-course-lifecycle.spec.ts      <- Phase 3: YouTube & R2 Materials
├── 03-course-regression.mjs
├── 04-booking-tutoring.spec.ts      <- Phase 4: Slot Locking & Meeting Escrow
├── 04-booking-regression.mjs
├── 05-payment-idempotency.spec.ts   <- Phase 5: Webhooks & Payouts
├── 05-payment-regression.mjs
└── run-all.mjs                      <- Master Orchestrator (Runs all 5 phases)
```

### Running the Test Suite
Against any live server (`localhost:3000` or staging):
```bash
# Run master suite (zero dependencies required)
npm run test:api

# Or directly:
node backend/test/regression/run-all.mjs --url http://localhost:3000
```

### Adding Tests for Future Features
When adding any new feature, follow the established harness pattern:
1. Create `backend/test/regression/0X-<feature-name>.mjs`.
2. Add assertions for: Happy Path, Security/Role Boundaries, and Idempotency/Edge Cases.
3. Register the new runner in `backend/test/regression/run-all.mjs`.

---

## 5. Production Environment Variables Reference

Ensure the following variables are defined in production:

```env
# ── Server & DB
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/ethiolearn?schema=public"
FRONTEND_URL="https://axumia.com"

# ── Redis Cache & Queue
REDIS_HOST="redis"
REDIS_PORT=6379

# ── Auth & Security
JWT_SECRET="generate-a-strong-64-character-random-secret-key"
JWT_EXPIRES_IN="15m"

# ── Chapa Payment Gateway
CHAPA_SECRET_KEY="CHASECK_TEST-xxxxxxxxxxxx"
CHAPA_PUBLIC_KEY="CHAPUBK_TEST-xxxxxxxxxxxx"
CHAPA_WEBHOOK_SECRET="your-chapa-webhook-secret"

# ── Cloudflare R2 (S3-Compatible Storage)
R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
R2_PUBLIC_BUCKET="axumia-public"
R2_PRIVATE_BUCKET="axumia-private"
R2_PUBLIC_ACCESS_KEY_ID="your-r2-public-access-key"
R2_PUBLIC_SECRET_ACCESS_KEY="your-r2-public-secret-key"
R2_PRIVATE_ACCESS_KEY_ID="your-r2-private-access-key"
R2_PRIVATE_SECRET_ACCESS_KEY="your-r2-private-secret-key"
NEXT_PUBLIC_R2_PUBLIC_DOMAIN="https://pub-xxxxxx.r2.dev"
```

---

## 6. How to Boot the Production Stack

```bash
# 1. Boot all services
docker compose up -d --build

# 2. Verify all containers are healthy
docker compose ps

# 3. Run the complete regression test suite
npm run test:api
```
