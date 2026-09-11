# Ethio Learn — Full Project Analysis
> **Generated:** 2026-07-31 | **Purpose:** Single source of truth to avoid re-analysis in future sessions.

---

## 1. Project Overview

**Name:** Ethio Learn  
**Type:** Two-sided online learning marketplace for Ethiopia  
**Revenue model:**
- Live 1-on-1 tutoring sessions (student books, pays, instructor provides Zoom/Meet link)
- Pre-recorded courses (upload once, sell repeatedly)

**Payment rails:** Chapa (aggregates Telebirr, CBE Birr, HelloCash, cards)  
**Languages supported:** Amharic (am) + English (en)  
**Target market:** Ethiopia — low-bandwidth optimized, mobile-first

---

## 2. Repository Structure

```
online learning/
├── architecture-design.md       ← Design doc (good, detailed)
├── docker-compose.yml           ← 5-service stack
├── nginx.conf                   ← Gateway/router config
├── k8s/                        ← Kubernetes manifests (7 files)
│   ├── namespace.yaml
│   ├── configmap-secrets.yaml
│   ├── backend.yaml
│   ├── web.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── ingress.yaml
├── D-auth/                     ← Custom SSO service (Node.js/Express)
├── backend/                    ← NestJS API (TypeScript)
└── web/                        ← Next.js frontend (TypeScript)
```

---

## 3. Tech Stack (Actual, Not Planned)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Backend | NestJS | ^11.0.1 | Modular monolith |
| ORM | Prisma | ^7.9.1 | With `driverAdapters` preview feature |
| Database | PostgreSQL 15 | Docker image | Port 5433 (host) → 5432 (container) |
| Cache/Queue | Redis 7 | Docker image | BullMQ installed but NOT wired |
| Auth | Custom D-auth | Local package | Google/Facebook/Microsoft/Apple OAuth |
| Frontend | Next.js | Latest | App Router, TypeScript |
| Styling | Tailwind CSS + Custom CSS | Mixed | globals.css has full design system |
| Storage | AWS S3 SDK | ^3.1100 | Credentials mocked in docker-compose |
| Email | Nodemailer | ^9.0.3 | SMTP mocked (Mailtrap) |
| Gateway | Nginx | Alpine | Routes /api → backend, / → web |
| Container | Docker Compose | 3.8 | Also K8s manifests available |

---

## 4. Backend Architecture (NestJS)

### Entry Point: `backend/src/main.ts`
- Helmet security headers ✅
- CORS configured ✅
- Global ValidationPipe ✅
- D-auth router mounted at `/auth` ✅
- Swagger at `/api/docs` (non-production only) ✅
- **MISSING:** Rate limiting middleware
- **MISSING:** `/health` endpoint (K8s liveness probe target not implemented)
- **MISSING:** Compression middleware

### Module Map

| Module | Files | Status | What's Missing |
|---|---|---|---|
| `AppModule` | app.module.ts | ✅ Imports all 7 modules | — |
| `PrismaModule` | prisma/ | ✅ Working | — |
| `UsersModule` | users/ (3 files) | ✅ Basic CRUD | Payout request, earnings endpoint |
| `CoursesModule` | courses/ (3 files) | ✅ Full CRUD + progress | Video upload pre-sign URL endpoint |
| `BookingsModule` | bookings/ (3 files) | ✅ Core flow | No-show handler, payout release trigger |
| `PaymentsModule` | payments/ (4 files) | ✅ Chapa integration | `requestPayout()` method incomplete |
| `ReviewsModule` | reviews/ (unknown) | Unknown | — |
| `NotificationsModule` | notifications/ | ⚠️ STUB | No actual email/SMS sending wired |
| `StorageModule` | storage/ | ✅ S3 signed URLs | — |
| **`AdminModule`** | **MISSING** | 🔴 MISSING | KYC approval, payout management |
| **`QueueModule`** | **MISSING** | 🔴 MISSING | BullMQ installed but never wired |
| **`HealthModule`** | **MISSING** | 🟠 MISSING | K8s probes have no target |

### D-auth Service (`D-auth/`)
- Custom Node.js/Express auth engine (NOT NestJS)
- Uses `PgAdapter` to write directly to Postgres `users` table
- Plugins: `GooglePlugin`, `FacebookPlugin`, `MicrosoftPlugin`, `ApplePlugin`
- Has `adapters/`, `config/`, `core/`, `middleware/`, `models/`, `plugins/`, `routes/`, `utils/`
- **Typo:** `modles/` directory exists alongside `models/` — stale artifact
- Mounted by NestJS main.ts at `/auth/*`

---

## 5. Database Schema (Prisma — Full Map)

```
backend/prisma/schema.prisma — 249 lines

Models:
  User                ← owned by D-auth, read-only to Prisma
  InstructorProfile   ← KYC status, hourly_rate, is_active flag
  Category            ← course categories with slug
  Course              ← title, price, status (draft/published/archived), level, language, tags
  CourseLesson        ← video_key (raw S3), hls_key (transcoded HLS), duration_s
  CoursePurchase      ← user ↔ course, unique constraint enforces one purchase
  LessonProgress      ← watched_s, completed (auto-set at >30s watched)
  AvailabilitySlot    ← instructor calendar slots, is_booked flag
  Booking             ← student ↔ instructor ↔ slot, meeting_link, status enum
  Transaction         ← single append-only ledger for ALL payments, platform_fee column
  Payout              ← instructor earnings settlement, method (bank_transfer/telebirr/cbe)
  Review              ← polymorphic (course OR booking), 1–5 rating
```

**Key design decisions locked in schema:**
1. `meeting_link` is on Booking row (instructor pastes Zoom/Meet URL manually)
2. Single `transactions` table for both booking payments and course purchases
3. `payouts` separate from `transactions` — 7-day hold window for disputes
4. `platform_fee` column on Transaction for commission tracking
5. `search_vector` on Course for Postgres full-text search trigger

---

## 6. Frontend Architecture (Next.js App Router)

### Page Map

| Route | File | Status | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | ✅ Complete | Hero, Features, CTA sections |
| `/login` | `app/login/` | ✅ Exists | |
| `/register` | `app/register/` | ✅ Exists | |
| `/forgot-password` | `app/forgot-password/` | ✅ Exists | |
| `/courses` | `app/courses/page.tsx` | ⚠️ Basic | No live search/filter |
| `/courses/[slug]` | `app/courses/[slug]/` | ✅ Exists | |
| **`/courses/[slug]/learn`** | **MISSING** | 🔴 MISSING | Video player page |
| `/instructors` | `app/instructors/` | ✅ Exists | |
| `/instructor/[id]` | `app/instructor/[id]/` | Unknown | Public profile |
| `/instructor/courses` | `app/instructor/courses/` | ✅ Exists | |
| `/instructor/availability` | `app/instructor/availability/` | ✅ Exists | |
| `/instructor/bookings` | `app/instructor/bookings/` | ✅ Exists | |
| **`/instructor/courses/new`** | **MISSING** | 🟠 MISSING | Course creation wizard |
| `/book-session` | `app/book-session/` | ✅ Exists | |
| `/dashboard` | `app/dashboard/page.tsx` | ⚠️ Partial | Single static page, not role-split |
| `/oauth-success` | `app/oauth-success/` | ✅ Exists | |
| `/payment-success` | `app/payment-success/` | ⚠️ Empty | Directory stub only |
| **`/admin`** | **MISSING** | 🟠 MISSING | Admin panel |

### Component Map

| Component | File | Status |
|---|---|---|
| `Navbar` | `components/Navbar.tsx` | ⚠️ No mobile menu |
| `SsoButtons` | `components/SsoButtons.tsx` | ✅ Complete |
| **`Footer`** | **MISSING** | 🟠 Missing |
| **`ErrorBoundary`** | **MISSING** | 🟠 Missing |
| **`Toast/ToastContext`** | **MISSING** | 🟠 Missing |
| **`VideoPlayer`** | **MISSING** | 🔴 Missing |

### Context / State

| File | Status | Problem |
|---|---|---|
| `context/AuthContext.tsx` | 🔴 **STUB** | `user` always null — 1.2KB file |
| `lib/auth.ts` | ⚠️ Partial | Basic fetch calls, no typed responses |
| **`lib/api.ts`** | **MISSING** | No central API client with auth headers |

### Design System (`globals.css` — 184 lines)
- CSS variables: `--bg-primary`, `--accent`, `--gold`, `--success`, etc.
- Utility classes: `.glass`, `.gradient-text`, `.glow-accent`, `.text-glow`
- Buttons: `.btn-primary`, `.btn-ghost`
- Components: `.card`, `.badge` (accent/gold/success), `.input-field`, `.skeleton`
- Animations: `float`, `pulse-glow`, `fade-up`, `shimmer`
- **Missing:** `.progress-bar`, `.avatar`, `.tooltip`, `.drawer`, `.tab`
- Fonts: Outfit + Inter from Google Fonts ✅

---

## 7. Infrastructure

### Docker Compose (5 services)
```
db       → postgres:15-alpine, port 5433:5432, volume pgdata
redis    → redis:7-alpine, port 6379:6379, volume redisdata
backend  → builds from backend/Dockerfile, port 3000:3000
web      → builds from web/Dockerfile, no exposed port (behind nginx)
nginx    → nginx:alpine, port 80:80, routes via nginx.conf
```

**Issues:**
- `web` service has no healthcheck
- Secrets hardcoded in docker-compose (not using `.env` file)
- `backend` startup command runs `prisma db push` every boot (risky in production)

### Kubernetes (`k8s/` — 7 manifests)
- Namespace: `ethiolearn`
- Services: backend (ClusterIP + NodePort), web, postgres, redis
- Ingress with path-based routing (`/api` → backend, `/` → web)
- ConfigMap for non-secret env, Secrets placeholder for sensitive values
- **Issue:** K8s liveness probe targets `/health` on backend — endpoint doesn't exist

### Nginx (`nginx.conf`)
- `/api/` → backend:3000 (proxy pass)
- `/` → web (proxy pass)
- WebSocket upgrade headers present
- gzip compression enabled

---

## 8. Authentication Flow (D-auth)

```
POST /auth/register       → creates user in postgres via PgAdapter
POST /auth/login          → bcrypt verify → JWT access token (15m) + refresh token
GET  /auth/google         → OAuth redirect
GET  /auth/google/callback → OAuth callback → JWT
GET  /auth/me             → returns current user from JWT
POST /auth/refresh        → exchange refresh token for new access token
POST /auth/logout         → invalidates refresh token
POST /auth/forgot-password → sends reset email
POST /auth/reset-password  → validates token, updates password_hash
```

JWT secret: `ethiolearn_shared_sso_secret_key_12345` (hardcoded — needs env var)

---

## 9. Payment Flow (Chapa)

```
POST /api/payments/initiate → creates pending Transaction → calls Chapa checkout API → returns checkout URL
GET  /api/payments/verify/:ref → polls Chapa for status → marks Transaction 'paid' → triggers access grant
POST /api/payments/webhook → Chapa webhook → verifies HMAC signature → same access grant trigger
```

Platform commission: stored as `platform_fee` on each Transaction row  
Payout model exists in schema but `requestPayout` endpoint is incomplete

---

## 10. What Works End-to-End Today

| Flow | Status |
|---|---|
| User registration (email/password) | ✅ Works |
| User login → JWT | ✅ Works |
| OAuth (Google/Facebook/etc.) | ⚠️ Works if client IDs configured |
| Browse published courses | ✅ Works (API + basic UI) |
| Purchase course via Chapa | ✅ Works (redirects to Chapa) |
| Access course content | ❓ API works, **UI player missing** |
| Book instructor session | ✅ API works, UI needs testing |
| Instructor: create course | ✅ API works, **UI wizard missing** |
| Instructor: upload video | ✅ Pre-sign URL exists, **UI missing** |
| Admin: approve KYC | ❌ No endpoint, no UI |
| Instructor: receive payout | ⚠️ Schema ready, endpoint incomplete |
| Notifications (email/SMS) | ❌ Stub only, nothing sends |
| Video transcoding | ❌ BullMQ not wired, no worker |

---

## 11. Gap Priority List (Ordered)

### 🔴 Critical (Platform Broken Without These)
1. Fix `AuthContext.tsx` stub → `user` is always null
2. Create `/courses/[slug]/learn` video player page
3. Wire BullMQ `QueueModule` (notifications, transcoding)
4. Create `AdminModule` with KYC approval endpoint

### 🟠 High (Core Features Missing)
5. Course creation wizard UI (`/instructor/courses/new`)
6. Complete `requestPayout()` in payments service
7. Rate limiting middleware on auth + payment routes
8. `/health` endpoint for K8s liveness probes
9. Mobile navbar drawer (hamburger menu is there but broken)
10. `ErrorBoundary` + global `Toast` system

### 🟡 Medium (Platform Quality Below Standard)
11. Live search + filter on `/courses` page
12. Dashboard role-split (student / instructor / admin sub-pages)
13. `Footer` component
14. SEO metadata on all pages
15. Payout request UI for instructors

### 🟢 Low / Future
16. Certificate PDF generation on course completion
17. WebSocket real-time notifications
18. React Native mobile app
19. Meilisearch integration (currently using Postgres FTS)
20. Remove stale `D-auth/modles/` typo directory

---

## 12. Environment Variables Reference

### Backend `.env` (key ones)
```
DATABASE_URL         → postgresql://...
JWT_SECRET           → shared with D-auth
REDIS_HOST / PORT    → Redis connection
CHAPA_SECRET_KEY     → Payment gateway
AWS_ACCESS_KEY_ID    → S3 storage
AWS_S3_BUCKET_NAME   → ethio-learn-media
SMTP_HOST/PORT/USER  → Email sending
GOOGLE_CLIENT_ID     → OAuth
FRONTEND_URL         → CORS origin
```

### Frontend `.env`
```
NEXT_PUBLIC_API_URL  → API base URL (http://localhost in docker)
```

---

## 13. Implementation Order (Approved Plan)

Execution is structured in **7 dependency-ordered layers:**

| Layer | Focus | Key Deliverables |
|---|---|---|
| **L1** | Backend: Queue | BullMQ QueueModule, NotificationsProcessor |
| **L2** | Backend: Missing endpoints | AdminModule, rate limiting, /health |
| **L3** | Frontend: Auth | Fix AuthContext, add api.ts client |
| **L4** | Frontend: Dashboard | Role-aware dashboard (student/instructor/admin) |
| **L5** | Frontend: Core pages | Video player, course wizard, payment-success |
| **L6** | Frontend: Polish | Mobile navbar, Footer, ErrorBoundary, Toast |
| **L7** | DevOps | CI/CD GitHub Actions, docker-compose hardening |

---

*This file is the canonical project snapshot. Update it when significant features are completed.*
