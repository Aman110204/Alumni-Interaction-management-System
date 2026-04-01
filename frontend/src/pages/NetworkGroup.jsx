/**
 * NetworkGroup.jsx  —  /network/group/:groupType/:groupKey
 *
 * batch groupType  → { departments: [{ deptName, members }] }  (no hierarchy key)
 * other groupTypes → { hierarchy: [{ key, label, count, depts }] }
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { Loading } from '../components/MessageBox';
import { getGroupMembers } from '../services/api';
import { STUDENT_NAV } from './student/_nav';
import { ALUMNI_NAV } from './alumni/_nav';
import SearchBar from '../components/SearchBar';



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

const COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2','#0D9488','#9333EA'];
const colorFor = n => COLORS[(n || '?').charCodeAt(0) % COLORS.length];
const initials  = n => (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

function UserPill({ user, accent, onView }) {
  const [hov, setHov] = useState(false);
  const name = user.full_name || user.name || '?';
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onView}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${hov ? accent + '50' : '#F3F4F6'}`, background: hov ? accent + '06' : '#FAFAFA', cursor: 'pointer', transition: 'all 0.14s', minWidth: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[user.designation && user.company ? `${user.designation} @ ${user.company}` : user.company, user.role === 'student' ? 'Student' : null].filter(Boolean).join(' · ') || user.department || '—'}
        </div>
      </div>
      {user.available_mentorship && (
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#ECFDF5', color: '#059669', fontWeight: 700, flexShrink: 0 }}>Mentor</span>
      )}
    </div>
  );
}

function DeptRow({ deptName, members, accent, onViewUser, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #F3F4F6' }}>
      <button onClick={() => setOpen(p => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M9 22V12h6v10"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{deptName}</span>
          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: accent + '12', color: accent, fontWeight: 700 }}>{members.length}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: '8px 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {members.map(u => <UserPill key={`${u.role}-${u.id}`} user={u} accent={accent} onView={() => onViewUser(u)} />)}
        </div>
      )}
    </div>
  );
}

/* For batch groupType — single batch card showing all departments */
function BatchDeptPanel({ batchLabel, totalMembers, departments, accent, onViewUser }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${accent}28`, marginBottom: 10, overflow: 'hidden', boxShadow: `0 4px 18px ${accent}0e` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px', background: accent + '05', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{batchLabel}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
            {departments.length > 0 && ` · ${departments.length} dept${departments.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      {departments.map(dept => (
        <DeptRow
          key={dept.deptName}
          deptName={dept.deptName}
          members={dept.members || []}
          accent={accent}
          onViewUser={onViewUser}
          defaultOpen={departments.length === 1}
        />
      ))}
    </div>
  );
}

/* For non-batch group types — hierarchy BatchCard */
function HierarchyBatchCard({ batch, accent, onViewUser, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const depts = batch.depts || [];
  const memberCount = batch.count ?? depts.reduce((s, d) => s + (d.users || []).length, 0);
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${open ? accent + '28' : '#E5E7EB'}`, marginBottom: 10, overflow: 'hidden', boxShadow: open ? `0 4px 18px ${accent}0e` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}>
      <button onClick={() => setOpen(p => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: open ? accent + '05' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{batch.label}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {depts.length > 0 && ` · ${depts.length} dept${depts.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div>
          {depts.map(d => (
            <DeptRow key={d.key} deptName={d.label} members={d.users || []} accent={accent} onViewUser={onViewUser} defaultOpen={depts.length === 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner({ accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${accent}20`, borderTop: `3px solid ${accent}`, animation: 'ng-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading members…</span>
      <style>{`@keyframes ng-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function NetworkGroup() {
  const { groupType, groupKey } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const session   = getSession();
  const isAlumni  = session.role === 'alumni';
  const accent    = isAlumni ? '#7C3AED' : '#2563EB';
  const navItems  = isAlumni ? ALUMNI_NAV : STUDENT_NAV;

  const stateLabel = location.state?.groupLabel || groupKey;
  const stateDesc  = location.state?.groupDescription || '';
  const stateCount = location.state?.groupCount;
  const stateScope = location.state?.scope || 'my_college';

  const [isBatch,      setIsBatch]      = useState(groupType === 'batch');
  const [departments,  setDepartments]  = useState([]);
  const [hierarchy,    setHierarchy]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [total,        setTotal]        = useState(stateCount || 0);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [filterOpts,   setFilterOpts]   = useState({ departments: [], companies: [], batches: [] });
  const [activeParams, setActiveParams] = useState({ searchField: 'all', searchQuery: '', batch: '', department: '', company: '', skills: '' });

  const load = useCallback(async (pg = 1, params = activeParams) => {
    setLoading(true); setError('');
    setDepartments([]); setHierarchy([]);
    try {
      const r = await getGroupMembers(groupType, groupKey, {
        search:      params.searchQuery  || undefined,
        searchField: params.searchField  || 'all',
        department:  params.department   || undefined,
        batch:       params.batch        || undefined,
        skills:      params.skills       || undefined,
        page: pg,
        scope: stateScope,
      });
      const d = r.data?.data || r.data;

      if (groupType === 'batch') {
        // Backend: { batch, batchLabel, totalMembers, departments: [{ deptName, members }] }
        const depts = d.departments || [];
        setIsBatch(true);
        setDepartments(depts);
        setTotal(d.totalMembers || 0);
        setPage(1); setPages(1);
        const allMembers = depts.flatMap(dep => dep.members || []);
        setFilterOpts(prev => ({
          departments: [...new Set([...prev.departments, ...allMembers.map(m => m.department).filter(Boolean)])].sort(),
          companies:   [...new Set([...prev.companies,   ...allMembers.map(m => m.company).filter(Boolean)])].sort(),
          batches:     [...new Set([...prev.batches,     ...allMembers.map(m => String(m.batch || '')).filter(Boolean)])].sort((a, b) => b - a),
        }));
      } else {
        // Backend: { hierarchy, total, page, pages, members }
        setIsBatch(false);
        setHierarchy(d.hierarchy || []);
        setTotal(d.total || 0);
        setPage(d.page || 1);
        setPages(d.pages || 1);
        const allMembers = d.members || [];
        setFilterOpts(prev => ({
          departments: [...new Set([...prev.departments, ...allMembers.map(m => m.department).filter(Boolean)])].sort(),
          companies:   [...new Set([...prev.companies,   ...allMembers.map(m => m.company).filter(Boolean)])].sort(),
          batches:     [...new Set([...prev.batches,     ...allMembers.map(m => String(m.graduation_year || '')).filter(Boolean)])].sort((a, b) => b - a),
        }));
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load members. Please try again.');
    } finally { setLoading(false); }
  }, [groupType, groupKey, stateScope, activeParams]);

  useEffect(() => { load(1, activeParams); }, []); // eslint-disable-line

  const handleSearch = params => { setActiveParams(params); load(1, params); };
  const clearFilters = () => {
    const empty = { searchField: 'all', searchQuery: '', batch: '', department: '', company: '', skills: '' };
    setActiveParams(empty); load(1, empty);
  };

  const handleViewMember = u => navigate(`/profile/${u.id}?type=${u.role || 'alumni'}`);

  const hasFilters = activeParams.searchQuery || activeParams.department || activeParams.batch || activeParams.company || activeParams.skills;

  const isEmpty = !loading && !error && (isBatch
    ? departments.length === 0 || departments.every(d => (d.members || []).length === 0)
    : hierarchy.length === 0);

  return (
    <div className="app-layout">
      <PortalSidebar navItems={navItems} tokenKey={session.tokenKey} userKey={session.userKey}
        loginPath={isAlumni ? '/alumni/login' : '/student/login'}
        portalLabel={isAlumni ? 'Alumni' : 'Student'} accentColor={accent} />

      <div className="main-content">
        <PortalNavbar title="Network" userKey={session.userKey} />

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Network
        </button>

        {/* Group header */}
        <div style={{ background: `linear-gradient(135deg, ${accent}14 0%, ${accent}07 100%)`, border: `1.5px solid ${accent}28`, borderRadius: 16, padding: '22px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.4px' }}>{stateLabel}</h1>
              {stateDesc && <p style={{ fontSize: 13.5, color: '#6B7280', margin: '0 0 8px' }}>{stateDesc}</p>}
              <div style={{ fontSize: 13, color: accent, fontWeight: 600 }}>
                {total} {total === 1 ? 'member' : 'members'}
              </div>
            </div>
            <div style={{ padding: '6px 14px', background: accent, borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {groupType === 'batch' ? '🎓' : '🏢'} {groupType.charAt(0).toUpperCase() + groupType.slice(1)} Group
            </div>
          </div>
        </div>

        {/* SearchBar */}
        <div style={{ marginBottom: 16 }}>
          <SearchBar accentColor={accent} filterOptions={filterOpts} onSearch={handleSearch} initialValues={activeParams} />
        </div>

        {/* Active filters banner */}
        {hasFilters && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 16px', background: accent + '08', borderRadius: 10, border: `1px solid ${accent}20` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>
              Search results — {total} member{total !== 1 ? 's' : ''}
            </span>
            <button onClick={clearFilters}
              style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear filters
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => load(1, activeParams)} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#fff', color: '#DC2626', fontSize: 12, cursor: 'pointer' }}>↺ Retry</button>
          </div>
        )}

        {/* Content */}
        {loading ? <Spinner accent={accent} /> : isEmpty ? (
          <div style={{ textAlign: 'center', paddingTop: 64, color: '#9CA3AF' }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No members found</div>
            <div style={{ fontSize: 13.5 }}>Try clearing your search or filters.</div>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${accent}`, background: accent + '10', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {isBatch
              ? <BatchDeptPanel batchLabel={stateLabel} totalMembers={total} departments={departments} accent={accent} onViewUser={handleViewMember} />
              : (
                <div>
                  {hierarchy.map((b, i) => (
                    <HierarchyBatchCard key={b.key} batch={b} accent={accent} onViewUser={handleViewMember} defaultOpen={i === 0 && hierarchy.length === 1} />
                  ))}
                </div>
              )
            }
            {!isBatch && pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
                <button disabled={page === 1} onClick={() => load(page - 1, activeParams)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
                <span style={{ fontSize: 13, padding: '6px 14px', alignSelf: 'center', color: '#6B7280', background: '#F9FAFB', borderRadius: 8 }}>Page {page} of {pages}</span>
                <button disabled={page >= pages} onClick={() => load(page + 1, activeParams)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 13, cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.5 : 1 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
