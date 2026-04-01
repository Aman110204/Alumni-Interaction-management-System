/**
 * BatchPage.jsx  —  /network/group/batch/:batchYear
 *
 * Shows all departments for a batch. Each department card has a "View" button.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { getGroupMembers } from '../services/api';
import { STUDENT_NAV } from './student/_nav';
import { ALUMNI_NAV } from './alumni/_nav';

const DEPT_COLORS = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#0D9488','#9333EA'];
const deptColor = name => DEPT_COLORS[(name || '').charCodeAt(0) % DEPT_COLORS.length];

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
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${accent}20`, borderTop: `3px solid ${accent}`, animation: 'bp-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading departments…</span>
      <style>{`@keyframes bp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DeptCard({ dept, accent, onView }) {
  const [hov, setHov] = React.useState(false);
  const color = deptColor(dept.deptName);
  const count = (dept.members || []).length;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hov ? color + '50' : '#E5E7EB'}`,
        borderRadius: 16, padding: '22px',
        boxShadow: hov ? `0 6px 24px ${color}14` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.16s', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Icon */}
      <div style={{ width: 48, height: 48, borderRadius: 13, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
          {dept.deptName}
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          {count} {count === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* View button */}
      <button
        onClick={() => onView(dept)}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `1.5px solid ${color}`, background: hov ? color : 'transparent', color: hov ? '#fff' : color, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        View
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}

export default function BatchPage() {
  const { batchYear } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const session       = getSession();
  const isAlumni      = session.role === 'alumni';
  const accent        = isAlumni ? '#7C3AED' : '#2563EB';
  const navItems      = isAlumni ? ALUMNI_NAV : STUDENT_NAV;

  const stateData     = location.state || {};
  const stateScope    = stateData.scope || 'my_college';

  const [departments,  setDepartments]  = useState(stateData.departments || []);
  const [totalMembers, setTotalMembers] = useState(stateData.groupCount || 0);
  const [batchLabel,   setBatchLabel]   = useState(stateData.groupLabel || `Batch ${batchYear}`);
  const [loading,      setLoading]      = useState(!stateData.departments?.length);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await getGroupMembers('batch', batchYear, { scope: stateScope });
      const d = r.data?.data || r.data;
      setDepartments(d.departments || []);
      setTotalMembers(d.totalMembers || 0);
      setBatchLabel(d.batchLabel || `Batch ${batchYear}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load batch data.');
    } finally { setLoading(false); }
  }, [batchYear, stateScope]);

  useEffect(() => {
    if (!stateData.departments?.length) load();
    // eslint-disable-next-line
  }, []);

  // Keep totalMembers in sync with dept members if loaded from state
  useEffect(() => {
    if (departments.length && !totalMembers) {
      setTotalMembers(departments.reduce((s, d) => s + (d.members || []).length, 0));
    }
  }, [departments, totalMembers]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? departments.filter(d => d.deptName.toLowerCase().includes(q)) : departments;
  }, [search, departments]);

  const handleView = dept => {
    navigate(`/network/group/batch/${batchYear}/${encodeURIComponent(dept.deptName)}`, {
      state: { batchLabel, batchYear, deptName: dept.deptName, members: dept.members || [], scope: stateScope },
    });
  };

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
          Back to Network
        </button>

        {/* Batch header banner */}
        <div style={{ background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`, border: `1.5px solid ${accent}28`, borderRadius: 16, padding: '22px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent, marginBottom: 2 }}>Alumni Network</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>{batchLabel}</h1>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>
              {totalMembers} member{totalMembers !== 1 ? 's' : ''}
              {departments.length > 0 && ` · ${departments.length} department${departments.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Search */}
        {departments.length > 3 && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search departments…" value={search} onChange={e => setSearch(e.target.value)}
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
            <div style={{ fontSize: 50, marginBottom: 12 }}>🏫</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              {search ? 'No matching departments' : 'No departments found'}
            </div>
            <div style={{ fontSize: 13.5 }}>{search ? 'Try a different search term.' : 'No members added yet.'}</div>
            {search && <button onClick={() => setSearch('')} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${accent}`, background: accent + '10', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear Search</button>}
          </div>
        ) : (
          <>
            {search && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Showing {filtered.length} department{filtered.length !== 1 ? 's' : ''}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {filtered.map(dept => <DeptCard key={dept.deptName} dept={dept} accent={accent} onView={handleView} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
