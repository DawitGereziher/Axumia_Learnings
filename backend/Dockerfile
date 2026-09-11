# Production Dockerfile for NestJS API (Monorepo context)
# Build from root directory: docker build -t ethiolearn-backend -f backend/Dockerfile .

# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# ── Step 1: Install D-auth dependencies ──────────────────────────────────────
COPY D-auth/package.json ./D-auth/package.json
WORKDIR /usr/src/app/D-auth
RUN npm install --omit=dev

# ── Step 2: Install backend dependencies ─────────────────────────────────────
WORKDIR /usr/src/app
COPY backend/package*.json ./backend/
WORKDIR /usr/src/app/backend
RUN npm install

# ── Step 3: Copy source files ─────────────────────────────────────────────────
WORKDIR /usr/src/app
COPY D-auth ./D-auth
COPY backend/ ./backend/

# ── Step 4: Generate Prisma Client ───────────────────────────────────────────
WORKDIR /usr/src/app/backend
RUN npx prisma generate

# ── Step 5: Build NestJS ─────────────────────────────────────────────────────
# Increase heap limit to prevent OOM during TypeScript compilation
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build


# ── Step 6: Prune dev dependencies ───────────────────────────────────────────
RUN npm prune --production

# --- PRODUCTION STAGE ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy D-auth with its OWN node_modules (so jsonwebtoken, bcrypt etc. resolve)
COPY --from=builder /usr/src/app/D-auth ./D-auth

# Copy backend production assets
COPY --from=builder /usr/src/app/backend/package*.json ./backend/
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules
COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/backend/prisma ./backend/prisma

WORKDIR /usr/src/app/backend

EXPOSE 3000

CMD ["node", "dist/main.js"]
