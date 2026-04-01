/**
 * DepartmentPage.jsx  —  /network/group/batch/:batchYear/:department
 *
 * Shows all members of a specific department within a batch.
 * Each member card has a "View Profile" button → ProfilePage.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { getGroupMembers } from '../services/api';
import { STUDENT_NAV } from './student/_nav';
import { ALUMNI_NAV } from './alumni/_nav';

const AVATAR_COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2','#0D9488','#9333EA'];
const avatarColor = name => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = name => (name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

function getSession() {
  try {
    const u = JSON.parse(localStorage.getItem('alumni_user') || 'null');
    if (u && localStorage.getItem('alumni_token'))
      return { user: u, role: 'alumni', tokenKey: 'alumni_token', userKey: 'alumni_user' };
  } catch {}
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u && localStorage.getItem('token'))
      return { user: u, role: 'student', tokenKey: 'token', userKey: 'user' };
  } catch {}
  return { user: null, role: 'student', tokenKey: 'token', userKey: 'user' };
}

function Spinner({ accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '72px 0', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${accent}20`, borderTop: `3px solid ${accent}`, animation: 'dp-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading members…</span>
      <style>{`@keyframes dp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MemberCard({ member, accent, onView }) {
  const [hov, setHov] = React.useState(false);
  const name = member.full_name || member.name || '?';
  const bg   = avatarColor(name);
  const subtitle = [
    member.designation && member.company ? `${member.designation} @ ${member.company}` : member.company,
    member.role === 'student' ? 'Student' : null,
  ].filter(Boolean).join(' · ') || member.department || '—';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hov ? accent + '40' : '#E5E7EB'}`,
        borderRadius: 16, padding: '22px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        boxShadow: hov ? `0 6px 24px ${accent}12` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.16s', textAlign: 'center',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0, boxShadow: `0 4px 12px ${bg}50` }}>
        {initials(name)}
      </div>

      {/* Name + role */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </div>
        {member.available_mentorship && (
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>
            ✓ Mentor
          </span>
        )}
        {member.role === 'student' && (
          <span style={{ display: 'inline-block', marginTop: 6, marginLeft: 4, fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>
            Student
          </span>
        )}
      </div>

      {/* View Profile button */}
      <button
        onClick={() => onView(member)}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `1.5px solid ${accent}`, background: hov ? accent : 'transparent', color: hov ? '#fff' : accent, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
      >
        View Profile
      </button>
    </div>
  );
}

export default function DepartmentPage() {
  const { batchYear, department } = useParams();
  const navigate                  = useNavigate();
  const location                  = useLocation();
  const session                   = getSession();
  const isAlumni                  = session.role === 'alumni';
  const accent                    = isAlumni ? '#7C3AED' : '#2563EB';
  const navItems                  = isAlumni ? ALUMNI_NAV : STUDENT_NAV;

  const stateData  = location.state || {};
  const deptName   = decodeURIComponent(department);
  const stateScope = stateData.scope || 'my_college';
  const batchLabel = stateData.batchLabel || `Batch ${batchYear}`;

  const [members, setMembers] = useState(stateData.members || []);
  const [loading, setLoading] = useState(!stateData.members?.length);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await getGroupMembers('batch', batchYear, { scope: stateScope, department: deptName });
      const d = r.data?.data || r.data;
      const allDepts = d.departments || [];
      const thisDept = allDepts.find(dep => dep.deptName?.toLowerCase() === deptName.toLowerCase());
      setMembers(thisDept?.members || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load members.');
    } finally { setLoading(false); }
  }, [batchYear, deptName, stateScope]);

  useEffect(() => {
    if (!stateData.members?.length) load();
    // eslint-disable-next-line
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const n = (m.full_name || m.name || '').toLowerCase();
      const c = (m.company || '').toLowerCase();
      const d = (m.designation || '').toLowerCase();
      return n.includes(q) || c.includes(q) || d.includes(q);
    });
  }, [search, members]);

  const handleView = member => navigate(`/profile/${member.id}?type=${member.role || 'alumni'}`);
  const isEmpty = !loading && !error && filtered.length === 0;

  return (
    <div className="app-layout">
      <PortalSidebar navItems={navItems} tokenKey={session.tokenKey} userKey={session.userKey}
        loginPath={isAlumni ? '/alumni/login' : '/student/login'}
        portalLabel={isAlumni ? 'Alumni' : 'Student'} accentColor={accent} />

      <div className="main-content">
        <PortalNavbar title="Alumni Network" userKey={session.userKey} />

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {batchLabel}
        </button>

        {/* Dept header banner */}
        <div style={{ background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`, border: `1.5px solid ${accent}28`, borderRadius: 16, padding: '22px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent, marginBottom: 2 }}>{batchLabel}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>{deptName}</h1>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Search */}
        {members.length > 4 && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search members by name, company…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 11, border: `1.5px solid ${search ? accent + '60' : '#E5E7EB'}`, fontSize: 13.5, outline: 'none', background: '#fff', color: '#111827', transition: 'all 0.15s', boxSizing: 'border-box' }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>}
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={load} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#fff', color: '#DC2626', fontSize: 12, cursor: 'pointer' }}>↺ Retry</button>
          </div>
        )}

        {loading ? <Spinner accent={accent} /> : isEmpty ? (
          <div style={{ textAlign: 'center', paddingTop: 72, color: '#9CA3AF' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{search ? 'No matching members' : 'No members found'}</div>
            <div style={{ fontSize: 13.5 }}>{search ? 'Try a different search term.' : 'No members in this department yet.'}</div>
            {search && <button onClick={() => setSearch('')} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${accent}`, background: accent + '10', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear Search</button>}
          </div>
        ) : (
          <>
            {search && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Showing {filtered.length} member{filtered.length !== 1 ? 's' : ''}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {filtered.map(member => <MemberCard key={`${member.role}-${member.id}`} member={member} accent={accent} onView={handleView} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
