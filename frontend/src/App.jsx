import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/MessageBox';
import { UserProvider } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';

// Admin
import AdminLogin        from './pages/AdminLogin';
import AdminDashboard    from './pages/AdminDashboard';
import ManageStudents    from './pages/ManageStudents';
import ManageAlumni      from './pages/ManageAlumni';
import Events            from './pages/Events';
import AdminMessaging    from './pages/Messaging';
import JobsOpportunities from './pages/JobsOpportunities';
import Referrals         from './pages/Referrals';
import Announcements     from './pages/Announcements';

// Student
import StudentLogin        from './pages/student/StudentLogin';
import StudentRegister     from './pages/student/StudentRegister';
import StudentDashboard    from './pages/student/StudentDashboard';
import StudentProfile      from './pages/student/StudentProfile';
import StudentEvents       from './pages/student/StudentEvents';
import StudentOpps         from './pages/student/StudentOpps';
import StudentInternships  from './pages/student/StudentInternships';
import StudentReferral     from './pages/student/StudentReferral';
import StudentMentorship   from './pages/student/StudentMentorship';
import StudentMessaging    from './pages/student/StudentMessaging';
import AlumniDirectory     from './pages/student/AlumniDirectory';
import StudentConnections  from './pages/student/StudentConnections';

// Alumni
import AlumniLogin          from './pages/alumni/AlumniLogin';
import AlumniRegister       from './pages/alumni/AlumniRegister';
import AlumniDashboard      from './pages/alumni/AlumniDashboard';
import AlumniProfile        from './pages/alumni/AlumniProfile';
import AlumniOpps           from './pages/alumni/AlumniOpps';
import AlumniInternships    from './pages/alumni/AlumniInternships';
import AlumniReferrals      from './pages/alumni/AlumniReferrals';
import AlumniMentorship     from './pages/alumni/AlumniMentorship';
import AlumniMessaging      from './pages/alumni/AlumniMessaging';
import ConnectionRequests   from './pages/alumni/ConnectionRequests';
import Students             from './pages/alumni/Students';
import AlumniEvents         from './pages/alumni/Events';

// ── Shared / Unified ─────────────────────────────────────────────────────────
// Network.jsx replaces: StudentNetwork, AlumniNetwork (student/alumni variants),
// and AlumniNetworkGrouped. One component, same UI for both roles.
// Backend endpoint GET /api/network filters results by role automatically.
import Network         from './pages/Network';
import NetworkGroup    from './pages/NetworkGroup';
import NetworkPage     from './pages/NetworkPage';
import BatchPage       from './pages/BatchPage';
import DepartmentPage  from './pages/DepartmentPage';
import ProfilePage     from './pages/ProfilePage';

import './styles/main.css';

function RequireAdmin({ children })   { return localStorage.getItem('admin_token')  ? children : <Navigate to="/admin/login"   replace />; }
function RequireStudent({ children }) { return localStorage.getItem('token')         ? children : <Navigate to="/student/login" replace />; }
function RequireAlumni({ children })  { return localStorage.getItem('alumni_token') ? children : <Navigate to="/alumni/login"  replace />; }
function RequireAuth({ children })    { return (localStorage.getItem('token') || localStorage.getItem('alumni_token')) ? children : <Navigate to="/student/login" replace />; }

export default function App() {
  // BrowserRouter is the outermost wrapper so all context providers
  // have access to routing. NotificationProvider is mounted ONCE here —
  // it is the SINGLE source of polling for /api/notifications/unread-count.
  // No other component should call getNotifUnreadCount directly.
  return (
    <BrowserRouter>
      <UserProvider>
        <NotificationProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/student/login" replace />} />

              {/* ── STUDENT ── */}
              <Route path="/student/login"          element={<StudentLogin />} />
              <Route path="/student/register"       element={<StudentRegister />} />
              <Route path="/student/dashboard"      element={<RequireStudent><StudentDashboard /></RequireStudent>} />
              <Route path="/student/profile"        element={<RequireStudent><StudentProfile /></RequireStudent>} />
              <Route path="/student/events"         element={<RequireStudent><StudentEvents /></RequireStudent>} />
              <Route path="/student/opportunities"  element={<RequireStudent><StudentOpps /></RequireStudent>} />
              <Route path="/student/internships"    element={<RequireStudent><StudentInternships /></RequireStudent>} />
              <Route path="/student/referrals"      element={<RequireStudent><StudentReferral /></RequireStudent>} />
              <Route path="/student/mentorship"     element={<RequireStudent><StudentMentorship /></RequireStudent>} />
              <Route path="/student/messages"       element={<RequireStudent><StudentMessaging /></RequireStudent>} />
              <Route path="/student/alumni"         element={<RequireStudent><AlumniDirectory /></RequireStudent>} />
              <Route path="/student/connections"    element={<RequireStudent><StudentConnections /></RequireStudent>} />

              {/* Unified network page — students see alumni-only feed (backend-enforced) */}
              <Route path="/student/network"         element={<Navigate to="/network" replace />} />
              {/* Legacy path redirects so old bookmarks keep working */}
              <Route path="/student/alumni-network"  element={<Navigate to="/network" replace />} />
              <Route path="/student/student-network" element={<Navigate to="/network" replace />} />

              {/* ── ALUMNI ── */}
              <Route path="/alumni/login"           element={<AlumniLogin />} />
              <Route path="/alumni/register"        element={<AlumniRegister />} />
              <Route path="/alumni/dashboard"       element={<RequireAlumni><AlumniDashboard /></RequireAlumni>} />
              <Route path="/alumni/profile"         element={<RequireAlumni><AlumniProfile /></RequireAlumni>} />
              <Route path="/alumni/opportunities"   element={<RequireAlumni><AlumniOpps /></RequireAlumni>} />
              <Route path="/alumni/internships"     element={<RequireAlumni><AlumniInternships /></RequireAlumni>} />
              <Route path="/alumni/referrals"       element={<RequireAlumni><AlumniReferrals /></RequireAlumni>} />
              <Route path="/alumni/mentorship"      element={<RequireAlumni><AlumniMentorship /></RequireAlumni>} />
              <Route path="/alumni/messages"        element={<RequireAlumni><AlumniMessaging /></RequireAlumni>} />
              <Route path="/alumni/connections"     element={<RequireAlumni><ConnectionRequests /></RequireAlumni>} />
              <Route path="/alumni/students"        element={<RequireAlumni><Students /></RequireAlumni>} />
              <Route path="/alumni/events"          element={<RequireAlumni><AlumniEvents /></RequireAlumni>} />

              {/* Unified network page — alumni see alumni + students feed (backend-enforced) */}
              <Route path="/alumni/network"         element={<Navigate to="/network" replace />} />
              <Route path="/network/group/:groupType/:groupKey" element={<RequireAuth><NetworkGroup /></RequireAuth>} />
              {/* New Alumni Network feature: Batch → Dept → Members flow */}
              <Route path="/network"                                              element={<RequireAuth><NetworkPage /></RequireAuth>} />
              <Route path="/network/group/batch/:batchYear"                      element={<RequireAuth><BatchPage /></RequireAuth>} />
              <Route path="/network/group/batch/:batchYear/:department"          element={<RequireAuth><DepartmentPage /></RequireAuth>} />
              {/* Legacy path redirects */}
              <Route path="/alumni/alumni-network"  element={<Navigate to="/network" replace />} />

              {/* ── SHARED PROFILE PAGE — full page, no modal ── */}
              <Route path="/profile/:userId"        element={<RequireAuth><ProfilePage /></RequireAuth>} />

              {/* ── ADMIN ── */}
              <Route path="/admin/login"         element={<AdminLogin />} />
              <Route path="/admin/dashboard"     element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
              <Route path="/admin/students"      element={<RequireAdmin><ManageStudents /></RequireAdmin>} />
              <Route path="/admin/alumni"        element={<RequireAdmin><ManageAlumni /></RequireAdmin>} />
              <Route path="/admin/events"        element={<RequireAdmin><Events /></RequireAdmin>} />
              <Route path="/admin/messaging"     element={<RequireAdmin><AdminMessaging /></RequireAdmin>} />
              <Route path="/admin/jobs"          element={<RequireAdmin><JobsOpportunities /></RequireAdmin>} />
              <Route path="/admin/opportunities" element={<RequireAdmin><JobsOpportunities /></RequireAdmin>} />
              <Route path="/admin/referrals"     element={<RequireAdmin><Referrals /></RequireAdmin>} />
              <Route path="/admin/announcements" element={<RequireAdmin><Announcements /></RequireAdmin>} />
              <Route path="/admin"               element={<Navigate to="/admin/dashboard" replace />} />

              <Route path="*" element={<Navigate to="/student/login" replace />} />
            </Routes>
          </ToastProvider>
        </NotificationProvider>
      </UserProvider>
    </BrowserRouter>
  );
}
