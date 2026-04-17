# Alumni Connect — Multi-Tenant System

A subdomain-based multi-tenant alumni interaction platform built with **Express + TypeScript + Prisma + PostgreSQL** (backend) and **React** (frontend).

Each college gets its own isolated subdomain. Users from one college cannot authenticate on another college's subdomain.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Incoming Request                     │
│         http://skit.lvh.me:5000/api/student/login       │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           attachTenantContext  (tenant-middleware.ts)    │
│  1. Extracts "skit" from Host header via lib/tenant.ts  │
│  2. Resolves College { id: "skit", subdomain: "skit" }  │
│  3. Attaches req.tenant & req.college_id                │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           studentService.loginStudent()                 │
│  1. Reads college_id from request body                  │
│  2. assertSameTenant(body.college_id, req.hostname)     │
│     → throws 403 if they differ                         │
│  3. Finds student by email+collegeId                    │
│  4. Verifies password → issues JWT with college_id      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           authenticate()  (auth-middleware.ts)          │
│  On subsequent requests:                                │
│  1. Verifies JWT signature                              │
│  2. assertSameTenant(jwt.college_id, hostname_tenant)   │
│     → throws 403 on cross-tenant replay                 │
└─────────────────────────────────────────────────────────┘
```

---

## How Subdomain Routing Works (lvh.me)

`lvh.me` is a free public DNS wildcard that resolves every subdomain to `127.0.0.1`. This means:

| URL | Resolved IP | tenant |
|-----|-------------|--------|
| `http://skit.lvh.me:5000` | `127.0.0.1:5000` | `skit` |
| `http://nps.lvh.me:5000` | `127.0.0.1:5000` | `nps` |
| `http://christ.lvh.me:5000` | `127.0.0.1:5000` | `christ` |
| `http://rv.lvh.me:5000` | `127.0.0.1:5000` | `rv` |
| `http://localhost:5000` | `127.0.0.1:5000` | _(none — localhost fallback)_ |

No `/etc/hosts` edits required. No extra DNS setup. Just start the server and use the URLs above.

The `lib/tenant.ts` utility parses the `Host` header, extracts the leftmost label (the subdomain), and performs a `prisma.college.findUnique({ where: { subdomain } })` lookup. If no college is found, the request is rejected with HTTP 404.

---

## Seeded Colleges

| College ID | Subdomain | Name |
|------------|-----------|------|
| `skit` | `skit` | SKIT College of Engineering |
| `nps` | `nps` | National Public School |
| `christ` | `christ` | Christ University |
| `rv` | `rv` | RV College of Engineering |

Each college gets **500 students + 500 alumni = 1,000 users**, spread across the **last 5 batch years**.

---

## Setup

### Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally (or a connection string to a hosted instance)
- `npm` or `yarn`

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` — at minimum set `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/alumni_connect"
JWT_SECRET=your_64_char_random_secret_here
```

### 3. Run Migrations

```bash
cd backend
npm run db:migrate
# or for the first time (creates the DB):
npx prisma migrate dev --schema=prisma/schema.prisma --name init
```

### 4. Run the Seed Script

Seeds all 4 colleges with 1,000 users each (500 students + 500 alumni):

```bash
cd backend
npm run db:seed
```

Expected output:
```
Starting multi-tenant seed...

  Colleges     : skit, nps, christ, rv
  Batch years  : 2025, 2024, 2023, 2022, 2021
  Students/col : 500
  Alumni/col   : 500

  Seeding: skit (SKIT College of Engineering)
    + admin: admin@skit.alumni.local / admin123
    + students: 500/500
    + alumni: 500/500
    + events & opportunities done
  ...

Sample credentials (password: secret123)

  [skit]
    Student : student0001.skit@alumni.local
    Alumni  : alumni0001.skit@alumni.local
    Admin   : admin@skit.alumni.local  (pw: admin123)
  ...
```

### 5. Start the Dev Server

```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm start
```

---

## Example URLs

### Student Login
```
http://skit.lvh.me:5000/api/student/login
http://nps.lvh.me:5000/api/student/login
http://christ.lvh.me:5000/api/student/login
http://rv.lvh.me:5000/api/student/login
```

### Alumni Login
```
http://skit.lvh.me:5000/api/alumni/login
http://rv.lvh.me:5000/api/alumni/login
```

### Admin Login
```
http://skit.lvh.me:5000/api/admin/login
```

### Frontend (React dev server on port 5173 or 3000)
```
http://skit.lvh.me:5173/student/login
http://nps.lvh.me:5173/alumni/login
```

### Example Login Payload

```json
POST http://skit.lvh.me:5000/api/student/login
Content-Type: application/json

{
  "email": "student0001.skit@alumni.local",
  "password": "secret123",
  "college_id": "skit"
}
```

---

## Cross-Tenant Rejection

Attempting to log in as a SKIT student on the NPS subdomain:

```
POST http://nps.lvh.me:5000/api/student/login
{ "email": "student0001.skit@alumni.local", "password": "secret123", "college_id": "skit" }

→ HTTP 403
{ "success": false, "message": "Cross-tenant access denied: your account does not belong to this college" }
```

---

## Key Files Modified / Added

| File | Status | Purpose |
|------|--------|---------|
| `backend/lib/tenant.ts` | **NEW** | Core tenant resolver utility (`resolveTenantFromHost`, `assertSameTenant`) |
| `backend/lib/createCollege.ts` | **NEW** | College creation helper with auto-subdomain generation |
| `backend/prisma/seed.ts` | **REPLACED** | Multi-college seed: 4 colleges × 1000 users, bulk `createMany` |
| `backend/prisma/schema.prisma` | **UPDATED** | `College.subdomain` unique field added |
| `backend/middleware/tenant-middleware.ts` | **UPDATED** | Uses `resolveTenantFromHost()` from lib/tenant |
| `backend/middleware/auth-middleware.ts` | **UPDATED** | Uses `assertSameTenant()` from lib/tenant |
| `backend/services/student-service.ts` | **UPDATED** | `loginStudent` accepts + enforces `requestTenantId` |
| `backend/services/alumni-service.ts` | **UPDATED** | `loginAlumni` accepts + enforces `requestTenantId` |
| `backend/controllers/student-controller.ts` | **UPDATED** | Passes `hostname_tenant` into `loginStudent` |
| `backend/controllers/alumni-controller.ts` | **UPDATED** | Passes `hostname_tenant` into `loginAlumni` |
| `backend/.env.example` | **UPDATED** | All 4 college subdomain origins added |

---

## Adding a New College

New colleges are automatically assigned a subdomain and are immediately routable. No code changes needed.

**Via the `createCollege` utility:**

```typescript
import { createCollege } from './lib/createCollege';

await createCollege({
  id: 'pesce',
  name: 'PES College of Engineering',
  location: 'Mandya, Karnataka',
  code: 'PESCE',
  subdomain: 'pesce', // optional — auto-derived from name if omitted
});
```

Then access it at:
```
http://pesce.lvh.me:5000/api/student/login
```

**Via Prisma directly:**

```typescript
await prisma.college.create({
  data: {
    id: 'bms',
    name: 'BMS College of Engineering',
    subdomain: 'bms',
    location: 'Bangalore, Karnataka',
    code: 'BMSCE',
  },
});
```

The tenant middleware resolves subdomains dynamically from the database on every request — no server restart required.

---

## Tenant Resolution Flow (lib/tenant.ts)

```
req.headers.host = "skit.lvh.me:5000"
        │
        ▼
extractSubdomainFromHost("skit.lvh.me:5000")
        │  strip port → "skit.lvh.me"
        │  split(".") → ["skit", "lvh", "me"]  (≥3 parts ✓)
        │  return parts[0] → "skit"
        │
        ▼
resolveCollegeBySubdomain("skit")
        │  prisma.college.findUnique({ where: { subdomain: "skit" } })
        │
        ▼
College { id: "skit", name: "SKIT College...", subdomain: "skit", ... }
```

---

## Scripts Reference

```bash
# Backend
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Seed all 4 colleges (1000 users each)
npm run db:reset     # Reset DB and re-migrate (destructive!)
npm run db:studio    # Open Prisma Studio in browser
```
