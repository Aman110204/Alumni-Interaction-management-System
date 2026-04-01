import axios from 'axios';
import { getCurrentTenant, normalizeCollegeId } from '../utils/tenant';

// In development React runs on :3000 and proxies to :5000.
// In production the build is served by the backend itself.
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
});

// ── Auth token helpers ────────────────────────────────────────────────────────
// FIX: Select token based on current portal path — prevents admin token leaking
// into student/alumni requests when multiple tokens exist in localStorage.
function pickToken() {
  const path = window.location.pathname;
  const currentTenant = normalizeCollegeId(getCurrentTenant());
  if (path.startsWith('/admin')) {
    const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; } })();
    const token = localStorage.getItem('admin_token') || null;
    if (currentTenant && normalizeCollegeId(user?.college_id) && normalizeCollegeId(user.college_id) !== currentTenant) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      return null;
    }
    return token;
  }
  if (path.startsWith('/alumni')) {
    const user = (() => { try { return JSON.parse(localStorage.getItem('alumni_user') || 'null'); } catch { return null; } })();
    const token = localStorage.getItem('alumni_token') || null;
    if (currentTenant && normalizeCollegeId(user?.college_id) && normalizeCollegeId(user.college_id) !== currentTenant) {
      localStorage.removeItem('alumni_token');
      localStorage.removeItem('alumni_user');
      return null;
    }
    return token;
  }
  // /student/* and all other paths use the student token
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const token = localStorage.getItem('token') || null;
  if (currentTenant && normalizeCollegeId(user?.college_id) && normalizeCollegeId(user.college_id) !== currentTenant) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
  return token;
}

// Attach JWT on every request
API.interceptors.request.use((config) => {
  const token = pickToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Tenant-Host'] = window.location.host;
  return config;
});

// Global 401 handler
// Uses a debounce flag so multiple simultaneous 401s (e.g. from polling)
// only trigger ONE redirect, not a redirect storm.
let redirecting = false;
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || '';
    const tenantMismatch = status === 403 && /tenant/i.test(message);
    if ((status === 401 || tenantMismatch) && !redirecting) {
      // Skip redirect for background polling endpoints — let them fail silently
      const url = err.config?.url || '';
      const isSilent = url.includes('/notifications/unread-count') ||
                       url.includes('/messages/unread-count');
      if (!isSilent) {
        redirecting = true;
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/admin/login';
        } else if (path.startsWith('/alumni')) {
          localStorage.removeItem('alumni_token');
          localStorage.removeItem('alumni_user');
          window.location.href = '/alumni/login';
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/student/login';
        }
        // Reset flag after redirect completes
        setTimeout(() => { redirecting = false; }, 3000);
      }
    }
    return Promise.reject(err);
  }
);

export default API;

function withOptionalCollegeId(payload) {
  if (!payload || payload.college_id == null || payload.college_id === '') {
    const { college_id, ...rest } = payload || {};
    return rest;
  }
  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
export const adminLogin           = (d)      => API.post('/admin/login', d);
export const getDashboard         = ()       => API.get('/admin/dashboard');
export const getReports           = ()       => API.get('/admin/reports');
export const getColleges          = ()       => API.get('/colleges');

// Students
export const getStudents          = (p)      => API.get('/admin/students', { params: p });
export const getStudentProfile    = (id)     => API.get(`/admin/students/${id}/profile`);
export const approveStudent       = (id)     => API.patch(`/admin/students/${id}/approve`);
export const blockStudent         = (id)     => API.patch(`/admin/students/${id}/reject`);
export const deleteStudent        = (id)     => API.delete(`/admin/students/${id}`);

// Alumni management (admin)
export const getAlumniList        = (p)      => API.get('/admin/alumni', { params: p });
export const getAlumniProfile     = (id)     => API.get(`/admin/alumni/${id}/profile`);
export const approveAlumni        = (id)     => API.patch(`/admin/alumni/${id}/approve`);
export const rejectAlumni         = (id)     => API.patch(`/admin/alumni/${id}/reject`);
export const deleteAlumni         = (id)     => API.delete(`/admin/alumni/${id}`);

// Events (admin)
export const getAdminEvents       = ()       => API.get('/admin/events');
// Normalises max_participants → max_capacity which the backend service expects
export const createEvent          = (d)      => API.post('/admin/events', {
  title:        d.title,
  description:  d.description,
  event_date:   d.event_date,
  location:     d.location,
  event_type:   d.event_type,
  max_capacity: d.max_capacity || d.max_participants || null,
  time_slot:    d.time_slot,
  organizer:    d.organizer,
  speaker:      d.speaker,
});
export const updateEvent          = (id, d)  => API.put(`/admin/events/${id}`, {
  title:        d.title,
  description:  d.description,
  event_date:   d.event_date,
  location:     d.location,
  event_type:   d.event_type,
  max_capacity: d.max_capacity || d.max_participants || null,
  status:       d.status,
});
export const deleteEvent          = (id)     => API.delete(`/admin/events/${id}`);

// Opportunities (admin)
export const getAdminOpportunities      = (p)       => API.get('/admin/opportunities', { params: p });
// Normalises 'open' → 'active' since backend only accepts active/closed/pending
export const updateOpportunityStatus    = (id, s)   => API.patch(`/admin/opportunities/${id}/status`, {
  status: s === 'open' ? 'active' : s,
});
export const deleteAdminOpportunity     = (id)      => API.delete(`/admin/opportunities/${id}`);

// Referrals (admin)
export const getAdminReferrals          = (p)  => API.get('/admin/referrals', { params: p });
export const deleteAdminReferral        = (id) => API.delete(`/admin/referrals/${id}`);

// Messaging (admin uses same conversation endpoints)
export const getConversations           = ()         => API.get('/conversations');
export const getConvMessages            = (cid)      => API.get(`/conversations/${cid}/messages`);
export const sendConvMessage            = (cid, msg) => API.post(`/conversations/${cid}/messages`, { message: msg });
// Start or get existing conversation — normalises participant_* → other_* for the backend
export const startConversation = (d) => {
  const payload = {
    other_id:   d.other_id   || d.participant_id,
    other_type: d.other_type || d.participant_type,
    allow_cross_college: d.allow_cross_college,
  };
  return API.post('/conversations', payload);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT AUTH & PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
export const studentLogin               = (d)  => API.post('/students/login', withOptionalCollegeId(d));
// Normalises frontend field names → backend service field names
export const studentRegister            = (d)  => API.post('/students/register', withOptionalCollegeId({
  fullName:   d.fullName   || d.full_name,
  usn:        d.usn        || d.roll_number,
  department: d.department || d.branch,
  // FIX: Accept 'year' directly (e.g. "1st Year") — do not coerce graduation_year into year
  year:       d.year       || d.graduation_year || '',
  email:      d.email,
  phone:      d.phone,
  password:   d.password,
  college_id: d.college_id,
}));
export const getStudentDashboard        = ()   => API.get('/students/dashboard');
export const getMyStudentProfile        = ()   => API.get('/students/profile');
export const updateMyStudentProfile     = (d)  => API.put('/students/profile', d);

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI AUTH & PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
export const alumniLogin                = (d)  => API.post('/alumni-auth/login', withOptionalCollegeId(d));
export const alumniRegister             = (d)  => API.post('/alumni-auth/register', withOptionalCollegeId(d));
export const getAlumniDashboard         = ()   => API.get('/alumni-auth/dashboard');
export const getMyAlumniProfile         = ()   => API.get('/alumni-auth/profile');
export const updateMyAlumniProfile      = (d)  => API.put('/alumni-auth/profile', d);

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI DIRECTORY (visible to both students & alumni)
// ═══════════════════════════════════════════════════════════════════════════════
export const listAlumni                 = (p)  => API.get('/alumni', { params: p });
export const getAlumniById              = (id) => API.get(`/alumni/${id}`);
export const getAlumniFilters = (scope) => API.get('/alumni/filter-options', { params: scope ? { scope } : {} });

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS (public-ish, requires auth)
// ═══════════════════════════════════════════════════════════════════════════════
export const listEvents                 = (p)  => API.get('/events', { params: p });
export const getEventById               = (id) => API.get(`/events/${id}`);
export const registerForEvent           = (id) => API.post(`/events/${id}/register`);
export const cancelEventRegistration    = (id) => API.delete(`/events/${id}/register`);
export const getMyEventRegistrations    = ()   => API.get('/events/my-registrations');

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════════
export const listOpportunities          = (p)  => API.get('/opportunities', { params: p });
export const getOpportunityById         = (id) => API.get(`/opportunities/${id}`);
export const applyForOpportunity        = (id) => API.post(`/opportunities/${id}/apply`);
export const getMyApplications          = ()   => API.get('/opportunities/my-applications');

// Alumni: manage their own opportunities
// Normalises frontend field names → backend service field names
export const createAlumniOpportunity    = (d)  => API.post('/alumni-opportunities', {
  title:           d.title,
  company:         d.company,
  location:        d.location,
  job_type:        d.job_type,
  description:     d.description,
  skills_required: d.skills_required || d.requirements,
  salary:          d.salary          || d.salary_range,
  apply_link:      d.apply_link,
  deadline:        d.deadline || null,
});
export const getAlumniPostedOpps        = ()   => API.get('/alumni-opportunities');
export const updateAlumniOpportunity    = (id, d) => API.put(`/alumni-opportunities/${id}`, {
  title:           d.title,
  company:         d.company,
  location:        d.location,
  job_type:        d.job_type,
  description:     d.description,
  skills_required: d.skills_required,
  salary:          d.salary,
  apply_link:      d.apply_link || null,
  deadline:        d.deadline   || null,
  status:          d.status,
});
export const deleteAlumniOpportunity    = (id) => API.delete(`/alumni-opportunities/${id}`);

// ═══════════════════════════════════════════════════════════════════════════════
// MENTORSHIP
// ═══════════════════════════════════════════════════════════════════════════════
export const requestMentorship          = (d)      => API.post('/mentorship/request', d);
export const getMyMentorshipRequests    = ()       => API.get('/mentorship/my-requests');
export const getAlumniMentorshipReqs    = ()       => API.get('/alumni-mentorship');
// Normalises response_message → response which the backend validator expects
export const respondToMentorship        = (id, d)  => API.patch(`/alumni-mentorship/${id}/respond`, {
  status:   d.status,
  response: d.response || d.response_message,
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════════════════════
// Normalises position → job_title which the backend validator requires
export const requestReferral            = (d)      => API.post('/referral/request', {
  alumni_id:  d.alumni_id,
  company:    d.company,
  job_title:  d.job_title || d.position,
  resume_url: d.resume_url,
  message:    d.message,
  allow_cross_college: d.allow_cross_college,
});
export const getMyReferralRequests      = ()       => API.get('/referral/my-requests');
export const getAlumniReferralReqs      = ()       => API.get('/alumni-referral');
// Normalises response_message → response which the backend validator expects
export const respondToReferral          = (id, d)  => API.patch(`/alumni-referral/${id}/respond`, {
  status:   d.status,
  response: d.response || d.response_message,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const listConnections            = ()       => API.get('/connections');
// Normalises recipient_*/participant_* aliases → other_* which the backend validator expects
export const requestConnection          = (d)      => API.post('/connections/request', {
  other_id:   d.other_id   || d.recipient_id   || d.participant_id,
  other_type: d.other_type || d.recipient_type  || d.participant_type,
  message:    d.message,
  allow_cross_college: d.allow_cross_college,
});
export const respondToConnection        = (id, d)  => API.patch(`/connections/${id}/respond`, d);
export const getConnectionStatus        = (t, id)  => API.get(`/connections/status/${t}/${id}`);

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const getNotifications           = (p)  => API.get('/notifications', { params: p });
export const getNotifUnreadCount        = ()   => API.get('/notifications/unread-count');
export const markAllNotifsRead          = ()   => API.patch('/notifications/mark-all-read');
export const markNotifRead              = (id) => API.patch(`/notifications/${id}/read`);

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
export const getHistory                 = ()   => API.get('/history');

// ═══════════════════════════════════════════════════════════════════════════════
// ALIASES — used by Admin pages (Messaging, Opportunities, Referrals, JobPosts)
// These map legacy import names to the correct API calls.
// ═══════════════════════════════════════════════════════════════════════════════

// Admin Messaging aliases (Messaging.jsx uses getMessages / sendMessage)
export const getMessages   = (convId) => API.get(`/conversations/${convId}/messages`);
export const sendMessage   = (convId, message) => API.post(`/conversations/${convId}/messages`, { message });

// Admin Opportunities aliases (Opportunities.jsx / JobPosts.jsx)
export const getOpportunities      = (p)       => API.get('/admin/opportunities', { params: p });
export const deleteOpportunity     = (id)      => API.delete(`/admin/opportunities/${id}`);

// Admin Referrals alias (Referrals.jsx)
export const getReferrals          = (p)       => API.get('/admin/referrals', { params: p });

// Admin Announcements
export const getAdminAnnouncements    = (p)    => API.get('/admin/announcements', { params: p });
export const createAdminAnnouncement  = (d)    => API.post('/admin/announcements', d);
export const deleteAdminAnnouncement  = (id)   => API.delete(`/admin/announcements/${id}`);

// Public announcements (student/alumni dashboards)
export const getPublicAnnouncements   = (p)    => API.get('/announcements', { params: p });

// Career timeline (alumni self-service)
export const getAlumniCareerTimeline    = ()       => API.get('/alumni/career-timeline');
export const addAlumniCareerEntryOwn    = (d)      => API.post('/alumni/career-timeline', d);

// Pending alumni
export const getPendingAlumni         = (p)    => API.get('/admin/alumni/pending', { params: p });

// Career timeline (admin adds on behalf of alumni)
export const addAlumniCareerEntry     = (id, d) => API.post(`/admin/alumni/${id}/career`, d);

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS — enhanced
// ═══════════════════════════════════════════════════════════════════════════════
export const listIncomingConnections  = ()       => API.get('/connections/incoming');
export const listOutgoingConnections  = ()       => API.get('/connections/outgoing');
export const listAcceptedConnections  = ()       => API.get('/connections/accepted');
export const acceptConnection         = (id)     => API.put(`/connections/${id}/accept`);
export const rejectConnection         = (id)     => API.put(`/connections/${id}/reject`);

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI — students listing
// ═══════════════════════════════════════════════════════════════════════════════
export const listStudentPeers         = (p)      => API.get('/students/peers',  { params: p });
export const listAlumniPeers          = (p)      => API.get('/alumni/peers',    { params: p });
export const listStudents             = (p)      => API.get('/alumni/students', { params: p });

// ── Unified network endpoint — replaces listStudentPeers / listAlumniPeers ──
// Backend filters by role: student → alumni only, alumni → alumni + students
export const getNetwork               = (p)      => API.get('/network',         { params: p });

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATION HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
export const getMyEducation           = (role)   => API.get(`/${role === 'alumni' ? 'alumni' : 'students'}/education`);
export const addEducation             = (role, d) => API.post(`/${role === 'alumni' ? 'alumni' : 'students'}/education`, d);
export const updateEducation          = (role, id, d) => API.put(`/${role === 'alumni' ? 'alumni' : 'students'}/education/${id}`, d);
export const deleteEducation          = (role, id) => API.delete(`/${role === 'alumni' ? 'alumni' : 'students'}/education/${id}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI PROFILE PATCH (mentor toggle, Feature 6)
// ═══════════════════════════════════════════════════════════════════════════════
export const patchAlumniProfile       = (d)      => API.patch('/alumni/profile', d);

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS — start with a specific user
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ALUMNI NETWORK
// ═══════════════════════════════════════════════════════════════════════════════
export const listAlumniForStudents    = (p)      => API.get('/students/alumni', { params: p });

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROFILE (LinkedIn-style)
// ═══════════════════════════════════════════════════════════════════════════════
export const getFullProfile        = (userId, type = 'alumni') => API.get(`/profile/${userId}`, { params: { type } });

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI COMPANIES (for referral company validation)
// ═══════════════════════════════════════════════════════════════════════════════
export const getAlumniCompanies    = (alumniId) => API.get(`/alumni/${alumniId}/companies`);
export const getAlumniMutuals      = (alumniId) => API.get(`/alumni/${alumniId}/mutuals`);
export const sendIntroMessage      = (d)         => API.post('/messages/intro', d);

// ═══════════════════════════════════════════════════════════════════════════════
// ALUMNI GROUPED
// ═══════════════════════════════════════════════════════════════════════════════
export const getAlumniGrouped      = (type = 'college') => API.get('/alumni/grouped', { params: { type } });

// existing aliases in case not defined above
export const getStudentEvents         = (p)      => API.get('/events', { params: p });
export const getConversationMessages  = (id)     => API.get(`/conversations/${id}/messages`);
export const sendConversationMessage  = (id, msg) => API.post(`/conversations/${id}/messages`, { message: msg });

export const getNetworkGrouped     = (p)         => API.get('/network/grouped', { params: p });
export const searchNetwork         = (q, scope, groupType, groupKey) => API.get('/network/search', { params: { q, scope, groupType, groupKey } });
export const getNetworkHierarchy   = (p)         => API.get('/network/hierarchy', { params: p });
export const getGroupMembers       = (groupType, groupKey, p) => API.get(`/network/group/${groupType}/${encodeURIComponent(groupKey)}`, { params: p });
