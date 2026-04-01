import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading } from '../../components/MessageBox';
import {
  getAlumniDashboard, getPublicAnnouncements, getAlumniPostedOpps,
  getNotifications, listAlumni, listConnections, requestConnection,
} from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import { filterTenantScoped, getCollegeName, getCurrentTenant } from '../../utils/tenant';
import {
  Users, Briefcase, GraduationCap, Share2, MessageCircle,
  Link2, Calendar, ChevronRight, BookOpen, Bell, UserPlus, Zap,
} from 'lucide-react';

const ACCENT = '#7C3AED';

/* ── helpers ─────────────────────────────────────────────────────────── */
const COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];
const avatarBg   = n => COLORS[(n || '?').charCodeAt(0) % COLORS.length];
const initials   = n => (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
const timeAgo    = ts => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
};

const NOTIF_ICON = {
  message:    { bg: '#ECFDF5', color: '#059669', Icon: MessageCircle },
  mentorship: { bg: '#FEF3C7', color: '#D97706', Icon: GraduationCap },
  referral:   { bg: '#FFF7ED', color: '#EA580C', Icon: Share2        },
  connection: { bg: '#EFF6FF', color: '#2563EB', Icon: Link2         },
  event:      { bg: '#F0FDF4', color: '#16A34A', Icon: Calendar      },
  opportunity:{ bg: '#F5F3FF', color: '#7C3AED', Icon: Briefcase     },
  default:    { bg: '#F1F5F9', color: '#64748B', Icon: Bell          },
};

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ label, value, icon, bg, color, path, sub, navigate }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => navigate(path)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: '#fff', border: `1.5px solid ${hov ? color + '40' : '#E5E7EB'}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: hov ? `0 4px 18px ${color}14` : '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</div>
      <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel = 'View all' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</span>
      {linkTo && <Link to={linkTo} style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>{linkLabel} →</Link>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  );
}

/* Live activity feed from real notifications */
function LiveActivityFeed({ notifications, loading }) {
  if (loading) return (
    <Card>
      <SectionHeader title="Recent Activity" />
      <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
    </Card>
  );
  if (!notifications.length) return (
    <Card>
      <SectionHeader title="Recent Activity" />
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌟</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No activity yet</div>
        <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>Start connecting to see updates here</div>
      </div>
    </Card>
  );
  return (
    <Card>
      <SectionHeader title="Recent Activity" linkTo="/alumni/messages" linkLabel="Messages" />
      <div>
        {notifications.map((n, idx) => {
          const type = n.type || 'default';
          const cfg  = NOTIF_ICON[type] || NOTIF_ICON.default;
          const { Icon, bg, color } = cfg;
          const isLast = idx === notifications.length - 1;
          return (
            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 20px', borderBottom: isLast ? 'none' : '1px solid #F9FAFB', background: n.is_read ? 'transparent' : '#FAFAFA' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#111827', lineHeight: 1.4 }}>{n.message || n.title}</div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, flexShrink: 0, marginTop: 5 }} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* 3 classmates from same batch+dept not yet connected */
function ClassmateSuggestions({ suggestions, connMap, onConnect, loading }) {
  if (loading) return (
    <Card>
      <SectionHeader title="People You May Know" />
      <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Finding classmates…</div>
    </Card>
  );
  if (!suggestions.length) return null;
  return (
    <Card>
      <SectionHeader title="People You May Know" linkTo="/network" linkLabel="See network" />
      <div>
        {suggestions.map((p, idx) => {
          const status = connMap[p.id];
          const isLast = idx === suggestions.length - 1;
          const tags = [];
          if (p._tag_batch)  tags.push({ label: `Class of ${p.graduation_year}`, color: '#2563EB', bg: '#EFF6FF' });
          if (p._tag_dept)   tags.push({ label: p.department, color: '#7C3AED', bg: '#F5F3FF' });
          if (p._tag_company)tags.push({ label: p.company, color: '#D97706', bg: '#FFFBEB' });
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: isLast ? 'none' : '1px solid #F9FAFB' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: avatarBg(p.full_name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                {initials(p.full_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {[p.designation, p.company].filter(Boolean).join(' at ') || p.department || '—'}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {tags.map(t => (
                    <span key={t.label} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: t.bg, color: t.color, fontWeight: 700 }}>{t.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {status === 'accepted' ? (
                  <span style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>✓ Connected</span>
                ) : status === 'pending' ? (
                  <span style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>Pending</span>
                ) : (
                  <button onClick={() => onConnect(p)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${ACCENT}`, background: 'transparent', color: ACCENT, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ACCENT; }}>
                    <UserPlus size={13} strokeWidth={2.5} /> Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* Mutual connections section */
function MutualConnections({ connections, loading }) {
  if (loading || !connections.length) return null;
  return (
    <Card>
      <SectionHeader title="Your Connections" linkTo="/alumni/connections" linkLabel={`View all ${connections.length}`} />
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {connections.slice(0, 6).map(c => {
            const name = c.other_user?.full_name || c.full_name || '?';
            const dept = c.other_user?.department || c.department;
            const company = c.other_user?.company || c.company;
            return (
              <div key={c.id || c.other_user?.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', borderRadius: 10, border: '1px solid #F3F4F6', background: '#FAFAFA', textAlign: 'center', gap: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarBg(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {initials(name)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{name}</div>
                {(dept || company) && <div style={{ fontSize: 10.5, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{company || dept}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function AlumniDashboard() {
  const navigate      = useNavigate();
  const currentTenant = getCurrentTenant();

  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [myOpps,        setMyOpps]        = useState([]);

  // Live sections
  const [notifications,  setNotifications]  = useState([]);
  const [notifsLoading,  setNotifsLoading]  = useState(true);
  const [suggestions,    setSuggestions]    = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(true);
  const [connections,    setConnections]    = useState([]);
  const [connMap,        setConnMap]        = useState({});
  const [connsLoading,   setConnsLoading]   = useState(true);

  // Core dashboard data
  useEffect(() => {
    Promise.all([
      getAlumniDashboard(),
      getPublicAnnouncements({ limit: 5 }),
      getAlumniPostedOpps().catch(() => ({ data: [] })),
    ]).then(([dashR, annR, oppsR]) => {
      setData(dashR.data?.data || dashR.data);
      const annD = annR.data?.data || annR.data;
      setAnnouncements(filterTenantScoped(annD.announcements || [], currentTenant));
      const oppsD = oppsR.data?.data || oppsR.data;
      setMyOpps(Array.isArray(oppsD) ? oppsD : (oppsD?.opportunities || []));
    }).catch(() => setLoadError('Failed to load. Please refresh.'))
      .finally(() => setLoading(false));
  }, [currentTenant]);

  // Live notifications (replaces static activity feed)
  useEffect(() => {
    setNotifsLoading(true);
    getNotifications({ limit: 8 })
      .then(r => {
        const d = r.data?.data || r.data;
        setNotifications(d.notifications || d || []);
      })
      .catch(() => {})
      .finally(() => setNotifsLoading(false));
  }, []);

  // Connections + classmate suggestions
  useEffect(() => {
    setConnsLoading(true);
    listConnections()
      .then(r => {
        const d    = r.data?.data || r.data || [];
        const list = Array.isArray(d) ? d : (d.connections || []);
        const accepted = list.filter(c => c.status === 'accepted');
        setConnections(accepted);

        // Build connMap for suggestion cards
        const map = {};
        list.forEach(c => {
          const isReq   = c.requester_type === 'alumni';
          const otherId = isReq ? c.recipient_id : c.requester_id;
          if (otherId) map[otherId] = c.status === 'accepted' ? 'accepted' : 'pending';
        });
        setConnMap(map);

        return map;
      })
      .catch(() => ({}))
      .finally(() => setConnsLoading(false));
  }, []);

  // Classmate suggestions — same batch & dept, not yet connected
  useEffect(() => {
    const me = (() => { try { return JSON.parse(localStorage.getItem('alumni_user') || 'null'); } catch { return null; } })();
    if (!me) { setSuggestLoading(false); return; }

    setSuggestLoading(true);
    const params = { limit: 20, scope: 'my_college' };
    if (me.graduation_year) params.batch      = me.graduation_year;
    if (me.department)      params.department = me.department;

    listAlumni(params)
      .then(r => {
        const d    = r.data?.data || r.data;
        const list = d.alumni || d || [];
        // Filter: not self, not already connected/pending, scored by closeness
        const scored = list
          .filter(a => String(a.id) !== String(me.id))
          .map(a => {
            let score = 0;
            const tags = {};
            if (me.graduation_year && a.graduation_year && String(me.graduation_year) === String(a.graduation_year)) {
              score += 3; tags._tag_batch = true;
            }
            if (me.department && a.department && me.department === a.department) {
              score += 2; tags._tag_dept = true;
            }
            if (me.company && a.company && me.company.toLowerCase() === a.company.toLowerCase()) {
              score += 4; tags._tag_company = true;
            }
            return { ...a, ...tags, _score: score };
          })
          .filter(a => a._score > 0)
          .sort((a, b) => b._score - a._score)
          .slice(0, 3);

        setSuggestions(scored);
      })
      .catch(() => {})
      .finally(() => setSuggestLoading(false));
  }, []);

  const handleConnect = async person => {
    try {
      await requestConnection({ other_id: person.id, other_type: 'alumni' });
      setConnMap(m => ({ ...m, [person.id]: 'pending' }));
    } catch (e) {
      if (e.response?.status === 409) setConnMap(m => ({ ...m, [person.id]: 'pending' }));
    }
  };

  const d    = data || {};
  const user = (() => { try { return JSON.parse(localStorage.getItem('alumni_user') || 'null'); } catch { return null; } })();
  const myJobs    = myOpps.filter(o => o.job_type !== 'Internship');
  const myInterns = myOpps.filter(o => o.job_type === 'Internship');
  const activeOpps = myOpps.filter(o => o.status === 'active' || o.status === 'open');

  const myStats = [
    { label: 'Jobs Posted',       value: myJobs.length,                       icon: <Briefcase    size={18} color="#7C3AED" strokeWidth={2}/>, bg:'#F5F3FF', color:'#7C3AED', path:'/alumni/opportunities', sub:`${activeOpps.filter(o=>o.job_type!=='Internship').length} active` },
    { label: 'Internships Posted',value: myInterns.length,                    icon: <BookOpen     size={18} color="#059669" strokeWidth={2}/>, bg:'#ECFDF5', color:'#059669', path:'/alumni/internships',   sub:`${activeOpps.filter(o=>o.job_type==='Internship').length} active` },
    { label: 'Pending Mentorship',value: d.stats?.pending_mentorship ?? 0,    icon: <GraduationCap size={18} color="#0891B2" strokeWidth={2}/>, bg:'#E0F2FE', color:'#0891B2', path:'/alumni/mentorship',    sub:'Needs your response' },
    { label: 'Pending Referrals', value: d.stats?.pending_referrals ?? 0,     icon: <Share2       size={18} color="#D97706" strokeWidth={2}/>, bg:'#FFFBEB', color:'#D97706', path:'/alumni/referrals',     sub:'Needs your response' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Browse Students',    path: '/alumni/students',    icon: <Users size={15} strokeWidth={2} color="#6B7280"/>       },
    { label: 'Alumni Network',     path: '/network',            icon: <GraduationCap size={15} strokeWidth={2} color="#6B7280"/>},
    { label: 'View Connections',   path: '/alumni/connections', icon: <Link2 size={15} strokeWidth={2} color="#6B7280"/>       },
    { label: 'Post a Job',         path: '/alumni/opportunities',icon: <Briefcase size={15} strokeWidth={2} color="#6B7280"/>  },
    { label: 'Post Internship',    path: '/alumni/internships', icon: <BookOpen size={15} strokeWidth={2} color="#6B7280"/>    },
    { label: 'Mentorship Requests',path: '/alumni/mentorship',  icon: <GraduationCap size={15} strokeWidth={2} color="#6B7280"/>},
    { label: 'Upcoming Events',    path: '/alumni/events',      icon: <Calendar size={15} strokeWidth={2} color="#6B7280"/>   },
  ];

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user"
        loginPath="/alumni/login" portalLabel="Alumni" accentColor={ACCENT} />
      <div className="main-content">
        <PortalNavbar title="Dashboard" userKey="alumni_user" />

        {loading ? <Loading /> : loadError ? (
          <div style={{ padding:16, background:'#FEF2F2', borderRadius:10, color:'#DC2626', fontSize:13 }}>{loadError}</div>
        ) : (
          <>
            {/* ── Welcome banner ─────────────────────────────────── */}
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
                Welcome back, {d.profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Alumni'} 👋
              </h1>
              <p style={{ fontSize: 13.5, color: '#6B7280', margin: 0 }}>
                {d.profile?.designation && d.profile?.company
                  ? `${d.profile.designation} at ${d.profile.company}`
                  : 'Your Gully Network home'}
              </p>
            </div>

            {/* ── Pending-action banner ───────────────────────────── */}
            {(d.stats?.pending_mentorship > 0 || d.stats?.pending_referrals > 0 || d.stats?.unread_notifications > 0) && (
              <div style={{ display:'flex', gap:8, padding:'10px 16px', background:'#FFF7ED', borderLeft:'3px solid #D97706', borderRadius:8, marginBottom:18, alignItems:'center' }}>
                <Bell size={15} color="#D97706" strokeWidth={2} style={{ flexShrink:0 }} />
                <div style={{ fontSize:13, color:'#92400E', fontWeight:500 }}>
                  You have {[
                    d.stats?.pending_mentorship > 0 && `${d.stats.pending_mentorship} mentorship request${d.stats.pending_mentorship > 1 ? 's' : ''}`,
                    d.stats?.pending_referrals  > 0 && `${d.stats.pending_referrals} referral request${d.stats.pending_referrals > 1 ? 's' : ''}`,
                    d.stats?.unread_notifications > 0 && `${d.stats.unread_notifications} unread notification${d.stats.unread_notifications > 1 ? 's' : ''}`,
                  ].filter(Boolean).join(', ')} pending your attention.
                </div>
              </div>
            )}

            {/* ── Activity stats row ──────────────────────────────── */}
            <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>My Activity</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:12, marginBottom:24 }}>
              {myStats.map(s => <StatCard key={s.label} {...s} navigate={navigate} />)}
            </div>

            {/* ── My recent postings ──────────────────────────────── */}
            {myOpps.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionHeader title="My Recent Postings" linkTo="/alumni/opportunities" />
                <div>
                  {myOpps.slice(0, 4).map((opp, idx) => {
                    const isIntern = opp.job_type === 'Internship';
                    const color    = isIntern ? '#059669' : ACCENT;
                    const bg       = isIntern ? '#ECFDF5' : '#F5F3FF';
                    return (
                      <div key={opp.id} style={{ padding:'11px 20px', borderBottom: idx < Math.min(myOpps.length,4)-1 ? '1px solid #F9FAFB':'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {isIntern ? <BookOpen size={14} color={color} strokeWidth={2}/> : <Briefcase size={14} color={color} strokeWidth={2}/>}
                          </div>
                          <div>
                            <div style={{ fontSize:13.5, fontWeight:600, color:'#111827' }}>{opp.title}</div>
                            <div style={{ fontSize:12, color:'#6B7280' }}>{opp.company}{opp.location ? ` · ${opp.location}` : ''}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <span style={{ fontSize:11.5, padding:'2px 9px', borderRadius:20, background:bg, color, fontWeight:600 }}>{opp.job_type}</span>
                          <span style={{ fontSize:11.5, padding:'2px 9px', borderRadius:20, background: (opp.status==='active'||opp.status==='open') ? '#ECFDF5':'#F3F4F6', color: (opp.status==='active'||opp.status==='open') ? '#059669':'#6B7280', fontWeight:600 }}>{opp.status || 'active'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── Three-column main grid ──────────────────────────── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>

              {/* Col 1: Live activity feed */}
              <LiveActivityFeed notifications={notifications} loading={notifsLoading} />

              {/* Col 2: People you may know */}
              <ClassmateSuggestions
                suggestions={suggestions}
                connMap={connMap}
                onConnect={handleConnect}
                loading={suggestLoading}
              />
            </div>

            {/* ── Mutual / existing connections grid ─────────────── */}
            <div style={{ marginBottom: 18 }}>
              <MutualConnections connections={connections} loading={connsLoading} />
            </div>

            {/* ── Bottom row: Quick actions + Announcements ──────── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>

              {/* Quick Actions */}
              <Card>
                <SectionHeader title="Quick Actions" />
                <div>
                  {QUICK_ACTIONS.map((a, idx) => (
                    <Link key={a.path} to={a.path}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom: idx < QUICK_ACTIONS.length-1 ? '1px solid #F9FAFB':'none', textDecoration:'none', color:'inherit', transition:'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width:32, height:32, borderRadius:8, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{a.icon}</div>
                      <span style={{ flex:1, fontSize:13.5, fontWeight:500, color:'#111827' }}>{a.label}</span>
                      <ChevronRight size={14} color="#D1D5DB" strokeWidth={2}/>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Announcements */}
              <Card>
                <SectionHeader title="Announcements" linkTo="/announcements" />
                {announcements.length === 0 ? (
                  <div style={{ padding:'40px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📢</div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'#374151', marginBottom:4 }}>No announcements</div>
                    <div style={{ fontSize:12.5, color:'#9CA3AF' }}>Check back later</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {announcements.slice(0, 3).map((ann, idx) => (
                      <div key={ann.id} style={{ padding:'14px 20px', borderBottom: idx < Math.min(announcements.length,3)-1 ? '1px solid #F9FAFB':'none' }}>
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:ACCENT, flexShrink:0, marginTop:5 }}/>
                          <div>
                            <div style={{ fontSize:13.5, fontWeight:700, color:'#111827', marginBottom:3 }}>{ann.title}</div>
                            <div style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.5 }}>{ann.description?.slice(0,100)}{ann.description?.length > 100 ? '…' : ''}</div>
                            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>
                              {new Date(ann.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })} · {getCollegeName(ann.college_id || currentTenant)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Network pulse: connection count + engagement tip ── */}
            <Card style={{ marginBottom: 6 }}>
              <div style={{ padding:'18px 24px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ width:44, height:44, borderRadius:12, background: ACCENT + '14', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Zap size={22} color={ACCENT} strokeWidth={2}/>
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'#111827', marginBottom:3 }}>
                    You have {connections.length} connection{connections.length !== 1 ? 's' : ''} in your network
                  </div>
                  <div style={{ fontSize:13, color:'#6B7280' }}>
                    {connections.length < 5
                      ? 'Start connecting with classmates to grow your Gully Network presence.'
                      : connections.length < 20
                      ? 'Your network is growing! Try connecting with more batchmates.'
                      : 'Great network! Help others by offering mentorship or referrals.'}
                  </div>
                </div>
                <button onClick={() => navigate('/network')}
                  style={{ padding:'9px 20px', borderRadius:9, border:`1.5px solid ${ACCENT}`, background:'transparent', color:ACCENT, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                  Grow Network →
                </button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
