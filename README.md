# AlumniConnect — Debugged & Refactored

## Project Structure
```
alumniconnect-react/
├── backend/              ← Express + PostgreSQL API (fixed)
│   ├── server.js         ← Serves React build + legacy student/alumni HTML
│   ├── routes/index.js   ← All API routes (+ new delete referral/mentorship)
│   ├── controllers/      ← Fixed adminController (+ deleteReferral, deleteMentorship)
│   ├── services/         ← Fixed adminService (+ deleteReferral, deleteMentorship)
│   └── .env              ← Update DB credentials here
│
└── frontend/             ← React 18 SPA
    ├── src/
    │   ├── App.jsx               ← Router + auth guards
    │   ├── index.js
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── EventCard.jsx
    │   │   └── MessageBox.jsx    ← Toast, Modal, ConfirmModal, Loading, EmptyState
    │   ├── pages/
    │   │   ├── AdminLogin.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── ManageStudents.jsx
    │   │   ├── ManageAlumni.jsx
    │   │   ├── Events.jsx
    │   │   ├── Messaging.jsx     ← Full messaging with polling
    │   │   ├── JobPosts.jsx
    │   │   ├── Opportunities.jsx
    │   │   └── Referrals.jsx
    │   ├── services/
    │   │   └── api.js            ← Axios with auto auth headers + 401 redirect
    │   └── styles/
    │       └── main.css          ← Single global CSS file
    └── package.json
```

## Setup & Run

### 1. Backend
```bash
cd backend
cp .env.example .env   # Set your PostgreSQL credentials
npm install
npm run dev            # Starts on port 5000
```

### 2. Frontend (Development)
```bash
cd frontend
npm install
npm start              # React dev server on port 3000 → proxies to :5000
```

### 3. Frontend (Production build — served by backend)
```bash
cd frontend
npm run build          # Creates frontend/build/
# Backend auto-detects build/ and serves React app at /admin/*
```

## Default Admin Credentials
Username: `admin`  Password: `admin123`
(Run `npm run seed` in backend to create initial data)

## What Was Fixed

### Frontend
- ✅ Converted ALL admin HTML to React JSX functional components
- ✅ Single global CSS (`styles/main.css`) — no inline CSS, no multiple files
- ✅ React Router 6 with auth guards (`RequireAdmin`)
- ✅ JWT stored in localStorage, attached to every API request via interceptor
- ✅ 401 auto-redirects to login

### Admin Buttons
- ✅ View Student Profile (modal with full details)
- ✅ Approve / Block / Delete Student
- ✅ View Alumni Profile (modal)
- ✅ Approve / Reject / Delete Alumni
- ✅ Create / Edit / Delete Events (full form modal)
- ✅ View / Close / Delete Opportunities
- ✅ View / Delete Jobs
- ✅ View / Delete Referrals

### Messaging
- ✅ Loads real conversations from DB (not "No conversations yet")
- ✅ Polling every 10s for new conversations, every 4s for messages
- ✅ Send messages from admin
- ✅ Start new conversation (by participant type + ID)
- ✅ Unread count display

### Backend
- ✅ Added `DELETE /api/admin/referrals/:id`
- ✅ Added `DELETE /api/admin/mentorship/:id`
- ✅ Server auto-detects React build and switches to SPA routing
- ✅ CORS updated for React dev server (localhost:3000)
- ✅ All admin routes protected with `requireAdmin` middleware
