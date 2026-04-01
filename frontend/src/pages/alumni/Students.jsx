import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, EmptyState, useToast } from '../../components/MessageBox';
import FilterBar from '../../components/FilterBar';
import { listConnections, listStudents, requestConnection, startConversation } from '../../services/api';
import Icon from '../../design/icons';
import { StatusBadge } from '../../design/components';
import { useNavigate } from 'react-router-dom';
import { ALUMNI_NAV } from './_nav';
import { getCollegeName, getCurrentTenant } from '../../utils/tenant';

const ACCENT = '#7C3AED';
const COLORS  = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];
const colorFor = s => COLORS[(s || '?').charCodeAt(0) % COLORS.length];
const avatar   = name => (name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

const CONN_TAG_CFG = {
  same_department: { label: 'Same Dept',    color: '#7C3AED', bg: '#F5F3FF' },
  same_batch:      { label: 'Same Batch',   color: '#2563EB', bg: '#EFF6FF' },
  same_skills:     { label: 'Same Skills',  color: '#059669', bg: '#ECFDF5' },
};

function ConnTags({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', marginBottom:8 }}>
      {tags.map(t => {
        const c = CONN_TAG_CFG[t] || { label: t, color:'#6B7280', bg:'#F3F4F6' };
        return <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:c.bg, color:c.color, fontWeight:700 }}>{c.label}</span>;
      })}
    </div>
  );
}

export default function Students() {
  const toast         = useToast();
  const navigate      = useNavigate();
  const currentTenant = getCurrentTenant();

  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [connMap,      setConnMap]      = useState({});
  const [scope,        setScope]        = useState('my_college');
  const [filterOpts,   setFilterOpts]   = useState({ departments:[], batches:[], courses:[] });
  const [activeParams, setActiveParams] = useState({
    searchField:'all', searchQuery:'', batch:'', department:'', course:'', sort:'',
  });

  useEffect(() => {
    listConnections().then(r => {
      const d    = r.data?.data || r.data || [];
      const list = Array.isArray(d) ? d : (d.connections || []);
      const map  = {};
      list.forEach(c => {
        const isReq   = c.requester_type === 'alumni' && c.requester_id;
        const otherId = isReq ? c.recipient_id : c.requester_id;
        if (otherId) map[otherId] = c.status === 'accepted' ? 'accepted' : 'pending';
      });
      setConnMap(map);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (pg = 1, params = activeParams) => {
    setLoading(true); setLoadError('');
    try {
      const apiParams = { page:pg, limit:20 };
      if (params.searchQuery)  apiParams.search      = params.searchQuery;
      if (params.searchField && params.searchField !== 'all') apiParams.searchField = params.searchField;
      if (params.department)   apiParams.department  = params.department;
      if (params.batch)        apiParams.batch       = params.batch;
      if (params.course)       apiParams.course      = params.course;
      if (params.sort)         apiParams.sort        = params.sort;

      const r   = await listStudents(apiParams);
      const d   = r.data?.data || r.data;
      const raw = d.students || d || [];

      const filtered = scope === 'all_colleges'
        ? raw
        : raw.filter(s => !s.college_id || s.college_id === currentTenant);

      setStudents(filtered);
      setTotal(d.total || 0);
      setPage(pg);

      const depts   = [...new Set(raw.map(s => s.department).filter(Boolean))].sort();
      const batches = [...new Set(raw.map(s => String(s.year || s.batch || '')).filter(Boolean))].sort();
      setFilterOpts(prev => ({
        departments: [...new Set([...prev.departments, ...depts])].sort(),
        batches:     [...new Set([...prev.batches, ...batches])].sort(),
        courses:     prev.courses,
      }));
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load students';
      toast(msg, 'error'); setLoadError(msg);
    } finally { setLoading(false); }
  }, [activeParams, scope, currentTenant]); // eslint-disable-line

  useEffect(() => { load(1, activeParams); }, [scope]); // eslint-disable-line

  const mergeAndLoad = changes => {
    const merged = { ...activeParams, ...changes };
    setActiveParams(merged);
    load(1, merged);
  };

  const handleConnect = async s => {
    try {
      const r = await requestConnection({ other_id:s.id, other_type:'student', allow_cross_college:scope==='all_colleges' });
      const d = r.data?.data || r.data;
      setConnMap(m => ({ ...m, [s.id]: d?.already_connected || d?.status === 'accepted' ? 'accepted' : 'pending' }));
      toast('Connection request sent ✓','success');
    } catch (e) {
      if (e.response?.status === 409) { setConnMap(m => ({ ...m, [s.id]:'pending' })); toast('Already requested','info'); }
      else toast(e.response?.data?.message || 'Request failed','error');
    }
  };

  const handleMessage = async s => {
    try {
      const r    = await startConversation({ other_type:'student', other_id:s.id, allow_cross_college:scope==='all_colleges' });
      const conv = r.data?.data || r.data;
      navigate('/alumni/messages', { state:{ conversationId:conv.id||conv.conversation_id } });
    } catch (e) { toast(e.response?.data?.message || 'Could not open conversation','error'); }
  };

  const getConnTags = s => {
    const me = (() => { try { return JSON.parse(localStorage.getItem('alumni_user')||'null'); } catch { return null; } })();
    if (!me) return [];
    const tags = [];
    if (me.department && s.department && me.department === s.department) tags.push('same_department');
    if ((me.graduation_year || me.batch) && (s.year || s.batch) &&
        String(me.graduation_year || me.batch) === String(s.year || s.batch)) tags.push('same_batch');
    if (me.skills && s.skills) {
      const a = me.skills.split(',').map(x => x.trim().toLowerCase());
      const b = s.skills.split(',').map(x => x.trim().toLowerCase());
      if (a.some(sk => b.includes(sk))) tags.push('same_skills');
    }
    return tags;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user"
        loginPath="/alumni/login" portalLabel="Alumni" accentColor={ACCENT} />

      <div className="main-content">
        <PortalNavbar title="Students" userKey="alumni_user" />

        <div style={{ marginBottom:16 }}>
          <div className="section-title">Student Directory</div>
          <div className="section-sub">{total} students in the network</div>
        </div>

        {/* Horizontal filter bar replaces the left sidebar */}
        <FilterBar
          accentColor={ACCENT}
          scope={scope}
          onScopeChange={s => setScope(s)}
          filterOpts={filterOpts}
          activeParams={activeParams}
          onFilterChange={changes => mergeAndLoad(changes)}
          onSearch={changes => mergeAndLoad(changes)}
          showScope={true}
          showSearch={true}
          searchFields={[
            { value:'all',        label:'All'        },
            { value:'name',       label:'Name'       },
            { value:'batch',      label:'Batch'      },
            { value:'branch',     label:'Branch'     },
            { value:'department', label:'Department' },
            { value:'skills',     label:'Skills'     },
          ]}
        />

        {loadError && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 16px', color:'#DC2626', fontSize:13, marginBottom:14 }}>
            {loadError}
          </div>
        )}

        {loading ? <Loading /> : students.length === 0 ? (
          <EmptyState icon="🎓" title="No students found" subtitle="Try adjusting your search or filters" />
        ) : (
          <div className="directory-grid">
            {students.map(s => {
              const tags = getConnTags(s);
              return (
                <div key={s.id} className="directory-card">
                  <div className="big-avatar" style={{ background:colorFor(s.full_name) }}>{avatar(s.full_name)}</div>
                  <div className="directory-card-name">{s.full_name}</div>
                  <div className="directory-card-role">{s.department || '—'}</div>
                  {s.year && <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Year {s.year}</div>}
                  <div style={{ marginBottom:6 }}>
                    <span className="badge badge-blue">{getCollegeName(s.college_id || currentTenant)}</span>
                  </div>
                  {s.headline && (
                    <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, textAlign:'center' }}>{s.headline}</div>
                  )}
                  {s.skills && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', marginBottom:8 }}>
                      {s.skills.split(',').slice(0,3).map(sk => (
                        <span key={sk} style={{ fontSize:10, padding:'2px 7px', background:'var(--bg-subtle)', borderRadius:10, color:'var(--text-secondary)' }}>
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <ConnTags tags={tags} />
                  <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/profile/${s.id}?type=student`)}>View Profile</button>
                    {connMap[s.id] === 'accepted' ? <StatusBadge status="accepted" />
                      : connMap[s.id] === 'pending' ? <StatusBadge status="pending" />
                      : (
                        <button className="btn btn-primary btn-sm" style={{ background:ACCENT }} onClick={() => handleConnect(s)}>
                          <Icon name="connections" size={12} color="#fff" /> Connect
                        </button>
                      )}
                    <button className="btn btn-secondary btn-sm" onClick={() => handleMessage(s)}>
                      <Icon name="messages" size={12} color="currentColor" /> Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:24 }}>
            <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={() => load(page-1)}>← Prev</button>
            <span style={{ fontSize:13, padding:'4px 12px', alignSelf:'center' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page>=totalPages} onClick={() => load(page+1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
