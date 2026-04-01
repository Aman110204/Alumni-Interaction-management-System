/**
 * NetworkPage.jsx  —  /network
 *
 * Alumni Network entry point.
 * v11: Replaced "Search by batch year" with full horizontal FilterBar
 *      (My College | All Colleges, Batch, Dept, Sort By, Search).
 *      Filters hit the hierarchy API and re-render batch list in real-time.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { getNetworkHierarchy, getAlumniFilters } from '../services/api';
import { STUDENT_NAV } from './student/_nav';
import { ALUMNI_NAV } from './alumni/_nav';
import FilterBar from '../components/FilterBar';

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
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${accent}20`, borderTop: `3px solid ${accent}`, animation: 'np-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading network…</span>
      <style>{`@keyframes np-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function BatchRow({ batch, accent, onView, isFirst }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px',
        background: hov ? accent + '06' : '#fff',
        border: `1.5px solid ${hov ? accent + '40' : '#E5E7EB'}`,
        borderRadius: 14, transition: 'all 0.15s',
        boxShadow: hov ? `0 4px 16px ${accent}10` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {batch.label}
            {isFirst && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: accent + '15', color: accent, fontWeight: 700 }}>Latest</span>}
          </div>
          <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3, display: 'flex', gap: 10 }}>
            <span>{batch.count} {batch.count === 1 ? 'member' : 'members'}</span>
            {batch.deptCount > 0 && (
              <><span style={{ color: '#D1D5DB' }}>·</span><span>{batch.deptCount} dept{batch.deptCount !== 1 ? 's' : ''}</span></>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onView(batch)}
        style={{ padding: '9px 24px', borderRadius: 9, border: `1.5px solid ${accent}`, background: hov ? accent : 'transparent', color: hov ? '#fff' : accent, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        View
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}

export default function NetworkPage() {
  const navigate = useNavigate();
  const session  = getSession();
  const isAlumni = session.role === 'alumni';
  const accent   = isAlumni ? '#7C3AED' : '#2563EB';
  const navItems = isAlumni ? ALUMNI_NAV : STUDENT_NAV;

  const [batches,    setBatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [total,      setTotal]      = useState(0);
  const [scope,      setScope]      = useState('my_college');
  const [filterOpts, setFilterOpts] = useState({ batches: [], departments: [], courses: [] });
  const [activeParams, setActiveParams] = useState({
    searchField: 'all', searchQuery: '', batch: '', department: '', course: '', sort: '',
  });

  // Load filter options when scope changes
  useEffect(() => {
    getAlumniFilters(scope)
      .then(r => {
        const d = r.data?.data || r.data;
        setFilterOpts({
          batches:     (d.batches     || []).map(String),
          departments: d.departments  || [],
          courses:     d.courses      || [],
        });
      })
      .catch(() => {});
  }, [scope]);

  const load = useCallback(async (params = activeParams, sc = scope) => {
    setLoading(true); setError('');
    try {
      const apiParams = { scope: sc };
      if (params.batch)       apiParams.batch      = params.batch;
      if (params.department)  apiParams.department = params.department;
      if (params.course)      apiParams.course     = params.course;
      if (params.sort)        apiParams.sort       = params.sort;
      if (params.searchQuery) apiParams.search     = params.searchQuery;
      if (params.searchField && params.searchField !== 'all') apiParams.searchField = params.searchField;

      const r         = await getNetworkHierarchy(apiParams);
      const d         = r.data?.data || r.data || {};
      const hierarchy = Array.isArray(d.hierarchy) ? d.hierarchy : [];

      const normalizeDepts = depts =>
        (depts || []).map(dep => ({
          deptName: dep.deptName || dep.label || dep.key || 'Other',
          members:  dep.members  || dep.users  || [],
        }));

      const batchList = hierarchy.map(b => ({
        key:       b.key,
        label:     b.label,
        count:     b.count ?? (b.depts || []).reduce((s, dep) => s + (dep.users || []).length, 0),
        deptCount: (b.depts || []).length,
        depts:     normalizeDepts(b.depts),
      }));

      setBatches(batchList);
      setTotal(d.total || batchList.reduce((s, b) => s + b.count, 0));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load network. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeParams, scope]); // eslint-disable-line

  // Initial load + reload on scope change
  useEffect(() => { load(activeParams, scope); }, [scope]); // eslint-disable-line

  const mergeAndLoad = changes => {
    const merged = { ...activeParams, ...changes };
    setActiveParams(merged);
    load(merged, scope);
  };

  const handleScopeChange = newScope => {
    setScope(newScope);
    // load() will be triggered by the scope useEffect
  };

  const handleView = batch => {
    navigate(`/network/group/batch/${batch.key}`, {
      state: { groupLabel: batch.label, groupCount: batch.count, scope, departments: batch.depts },
    });
  };

  const isEmpty = !loading && !error && batches.length === 0;

  return (
    <div className="app-layout">
      <PortalSidebar
        navItems={navItems}
        tokenKey={session.tokenKey}
        userKey={session.userKey}
        loginPath={isAlumni ? '/alumni/login' : '/student/login'}
        portalLabel={isAlumni ? 'Alumni' : 'Student'}
        accentColor={accent}
      />
      <div className="main-content">
        <PortalNavbar title="Alumni Network" userKey={session.userKey} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Alumni Network</h1>
            <p style={{ fontSize: 13.5, color: '#9CA3AF', margin: 0 }}>Browse by graduation batch — find your batchmates and connections</p>
          </div>
          {!loading && total > 0 && (
            <div style={{ padding: '8px 16px', borderRadius: 10, background: accent + '10', border: `1px solid ${accent}25`, fontSize: 13, fontWeight: 700, color: accent }}>
              {total} member{total !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Horizontal FilterBar — replaces the old "Search by batch year" input */}
        <FilterBar
          accentColor={accent}
          scope={scope}
          onScopeChange={handleScopeChange}
          filterOpts={filterOpts}
          activeParams={activeParams}
          onFilterChange={changes => mergeAndLoad(changes)}
          onSearch={changes => mergeAndLoad(changes)}
          showScope={true}
          showSearch={true}
          searchFields={[
            { value: 'all',        label: 'All'        },
            { value: 'name',       label: 'Name'       },
            { value: 'batch',      label: 'Batch'      },
            { value: 'department', label: 'Dept'       },
            { value: 'company',    label: 'Company'    },
            { value: 'skills',     label: 'Skills'     },
          ]}
        />

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => load(activeParams, scope)} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#fff', color: '#DC2626', fontSize: 12, cursor: 'pointer' }}>↺ Retry</button>
          </div>
        )}

        {loading ? <Spinner accent={accent} /> : isEmpty ? (
          <div style={{ textAlign: 'center', paddingTop: 72, color: '#9CA3AF' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No batches found</div>
            <div style={{ fontSize: 13.5 }}>Try adjusting your filters or switching to All Colleges.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {batches.map((batch, idx) => (
              <BatchRow key={batch.key} batch={batch} accent={accent} onView={handleView} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
