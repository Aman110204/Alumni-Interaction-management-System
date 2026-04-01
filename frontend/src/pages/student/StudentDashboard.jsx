import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading } from '../../components/MessageBox';
import { getStudentDashboard, getPublicAnnouncements, getMyApplications, getMyEventRegistrations } from '../../services/api';
import { STUDENT_NAV } from './_nav';
import ActivityFeed from '../../components/ActivityFeed';
import { GraduationCap, Briefcase, Share2, Calendar, Users, Megaphone, ChevronRight, BookOpen, MessageCircle, Bell } from 'lucide-react';
import { filterTenantScoped, getCollegeName, getCurrentTenant } from '../../utils/tenant';

const QUICK_ACTIONS = [
  { label: 'Browse Alumni Network',  path: '/student/alumni-network',  Icon: GraduationCap },
  { label: 'Browse Student Network', path: '/student/student-network', Icon: Users        },
  { label: 'Find Opportunities',     path: '/student/opportunities',   Icon: Briefcase    },
  { label: 'Find Internships',       path: '/student/internships',     Icon: BookOpen     },
  { label: 'Find a Mentor',          path: '/student/mentorship',      Icon: GraduationCap },
  { label: 'Request Referral',       path: '/student/referrals',       Icon: Share2       },
  { label: 'Upcoming Events',        path: '/student/events',          Icon: Calendar     },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const currentTenant = getCurrentTenant();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [myApps,        setMyApps]        = useState([]);
  const [myEvents,      setMyEvents]      = useState([]);

  useEffect(() => {
    Promise.all([
      getStudentDashboard(),
      getPublicAnnouncements({ limit: 5 }),
      getMyApplications().catch(() => ({ data: [] })),
      getMyEventRegistrations().catch(() => ({ data: [] })),
    ]).then(([dashR, annR, appsR, eventsR]) => {
      setData(dashR.data?.data || dashR.data);
      const annD = annR.data?.data || annR.data;
      setAnnouncements(filterTenantScoped(annD.announcements || [], currentTenant));
      const appsD = appsR.data?.data || appsR.data;
      setMyApps(Array.isArray(appsD) ? appsD : (appsD?.applications || []));
      const evD = eventsR.data?.data || eventsR.data;
      setMyEvents(Array.isArray(evD) ? evD : (evD?.registrations || evD?.events || []));
    }).catch(() => setLoadError('Failed to load. Please refresh.'))
      .finally(() => setLoading(false));
  }, [currentTenant]);

  const d    = data || {};
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();

  // Personal stats derived from real API data
  const myStats = [
    {
      label: 'My Applications',
      value: myApps.length,
      icon: <Briefcase size={18} color="#2563EB" strokeWidth={2} />,
      bg: '#EFF6FF', color: '#2563EB',
      path: '/student/opportunities',
      sub: myApps.length === 0 ? 'No applications yet' : `${myApps.filter(a => a.status === 'accepted').length} accepted`,
    },
    {
      label: 'Events Registered',
      value: myEvents.length,
      icon: <Calendar size={18} color="#7C3AED" strokeWidth={2} />,
      bg: '#F5F3FF', color: '#7C3AED',
      path: '/student/events',
      sub: d.upcoming_events > 0 ? `${d.upcoming_events} upcoming` : 'No upcoming events',
    },
    {
      label: 'Pending Mentorship',
      value: d.stats?.pending_mentorship ?? 0,
      icon: <GraduationCap size={18} color="#059669" strokeWidth={2} />,
      bg: '#ECFDF5', color: '#059669',
      path: '/student/mentorship',
      sub: 'Awaiting response',
    },
    {
      label: 'Pending Referrals',
      value: d.stats?.pending_referrals ?? 0,
      icon: <Share2 size={18} color="#D97706" strokeWidth={2} />,
      bg: '#FFFBEB', color: '#D97706',
      path: '/student/referrals',
      sub: 'Awaiting response',
    },
  ];

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#2563EB" />
      <div className="main-content">
        <PortalNavbar title="Dashboard" userKey="user" />

        {loading ? <Loading /> : loadError ? (
          <div style={{ padding: 16, background: 'var(--danger-light)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>{loadError}</div>
        ) : (
          <>
            {/* Announcements banner */}
            {announcements.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {announcements.slice(0, 2).map(ann => (
                  <div key={ann.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', background: '#EFF6FF', borderLeft: '3px solid #2563EB', borderRadius: 8, marginBottom: 8 }}>
                    <Megaphone size={15} color="#2563EB" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1E40AF' }}>{ann.title}</div>
                      <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>{ann.description?.slice(0, 120)}</div>
                      <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>{getCollegeName(ann.college_id || currentTenant)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Welcome */}
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
                Welcome back, {d.profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student'} 👋
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
                {d.profile?.department ? `${d.profile.department}${d.profile?.year ? ` · Year ${d.profile.year}` : ''}` : 'Your student dashboard'}
              </p>
            </div>

            {/* Network overview row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)', cursor:'pointer' }} onClick={() => navigate('/network')}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Users size={20} color="#2563EB" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{d.total_alumni || 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alumni in your Network</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>Click to explore →</div>
              </div>
              <div style={{ flex: 1, minWidth: 130, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)', cursor:'pointer' }} onClick={() => navigate('/student/opportunities')}>
                <div style={{ width:36, height:36, borderRadius:9, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                  <Briefcase size={18} color="#059669" strokeWidth={2} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>{d.open_opportunities || 0}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Open Jobs</div>
              </div>
              <div style={{ flex: 1, minWidth: 130, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)', cursor:'pointer' }} onClick={() => navigate('/student/internships')}>
                <div style={{ width:36, height:36, borderRadius:9, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                  <BookOpen size={18} color="#16A34A" strokeWidth={2} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A', lineHeight: 1 }}>{d.open_internships || '—'}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Internships</div>
              </div>
              {(d.stats?.unread_notifications > 0) && (
                <div style={{ flex: 1, minWidth: 130, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                    <Bell size={18} color="#D97706" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>{d.stats.unread_notifications}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Unread Alerts</div>
                </div>
              )}
            </div>

            {/* My personal activity stats */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>My Activity</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                {myStats.map(s => (
                  <div key={s.label} onClick={() => navigate(s.path)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* My recent applications (if any) */}
            {myApps.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border-lite)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>My Recent Applications</span>
                  <Link to="/student/opportunities" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>View all →</Link>
                </div>
                <div>
                  {myApps.slice(0, 3).map((app, idx) => (
                    <div key={app.id || idx} style={{ padding: '11px 20px', borderBottom: idx < Math.min(myApps.length, 3) - 1 ? '1px solid var(--border-lite)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Briefcase size={14} color="#2563EB" strokeWidth={2} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{app.title || 'Job Application'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.company || ''}{app.job_type ? ` · ${app.job_type}` : ''}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 20, background: app.status === 'accepted' ? '#ECFDF5' : app.status === 'rejected' ? '#FEF2F2' : '#F5F3FF', color: app.status === 'accepted' ? '#059669' : app.status === 'rejected' ? '#DC2626' : '#7C3AED', fontWeight: 600 }}>
                        {app.status || 'Applied'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My upcoming events */}
            {d.recent_events?.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border-lite)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>My Upcoming Events</span>
                  <Link to="/student/events" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>View all →</Link>
                </div>
                <div>
                  {d.recent_events.map((ev, idx) => (
                    <div key={ev.id} style={{ padding: '11px 20px', borderBottom: idx < d.recent_events.length - 1 ? '1px solid var(--border-lite)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar size={14} color="#7C3AED" strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Two column grid */}
            <div className="two-col-grid">
              {/* Quick Actions */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-lite)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Quick Actions</span>
                </div>
                <div style={{ padding: '6px 0' }}>
                  {QUICK_ACTIONS.map(({ label, path, Icon }, idx) => (
                    <button key={path} onClick={() => navigate(path)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 20px', background: 'none', border: 'none', borderBottom: idx < QUICK_ACTIONS.length - 1 ? '1px solid var(--border-lite)' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)', fontSize: 13.5, fontWeight: 500 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = '#2563EB'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} strokeWidth={2} color="var(--text-muted)" />
                      </div>
                      <span style={{ flex: 1 }}>{label}</span>
                      <ChevronRight size={14} color="var(--text-faint)" strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <ActivityFeed limit={5} />

              {/* Announcements */}
              {announcements.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-lite)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Announcements</span>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    {announcements.slice(0, 3).map((ann, idx) => (
                      <div key={ann.id} style={{ padding: '12px 20px', borderBottom: idx < 2 && idx < announcements.length - 1 ? '1px solid var(--border-lite)' : 'none' }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', marginBottom: 3 }}>{ann.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ann.description?.slice(0, 120)}{ann.description?.length > 120 ? '…' : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{getCollegeName(ann.college_id || currentTenant)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
