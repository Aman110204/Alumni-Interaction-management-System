import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import FilterBar from '../../components/FilterBar';
import { listConnections, listAlumni, getAlumniFilters, requestConnection, startConversation } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Icon from '../../design/icons';
import { Avatar, EmptyState, StatusBadge } from '../../design/components';
import { avatarColor } from '../../design/tokens';
import { STUDENT_NAV } from './_nav';
import { getCollegeName, getCurrentTenant } from '../../utils/tenant';

const ACCENT = '#2563EB';

const CONN_TAG_CFG = {
  same_department: { label: 'Same Dept',    color: '#7C3AED', bg: '#F5F3FF' },
  same_batch:      { label: 'Same Batch',   color: '#2563EB', bg: '#EFF6FF' },
  same_skills:     { label: 'Same Skills',  color: '#059669', bg: '#ECFDF5' },
  same_company:    { label: 'Same Company', color: '#D97706', bg: '#FFFBEB' },
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

export default function AlumniDirectory() {
  const toast         = useToast();
  const navigate      = useNavigate();
  const currentTenant = getCurrentTenant();

  const [alumni,       setAlumni]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [connMap,      setConnMap]      = useState({});
  const [scope,        setScope]        = useState('my_college');
  const [filterOpts,   setFilterOpts]   = useState({ departments:[], companies:[], batches:[], courses:[] });
  const [activeParams, setActiveParams] = useState({
    searchField:'all', searchQuery:'', batch:'', department:'', course:'', sort:'',
  });

  useEffect(() => {
    getAlumniFilters(scope).then(r => {
      const d = r.data?.data || r.data;
      setFilterOpts(prev => ({
        departments: d.departments || [],
        companies:   d.companies   || [],
        batches:     d.batches     || [],
        courses:     prev.courses,
      }));
    }).catch(() => {});

    listConnections().then(r => {
      const d    = r.data?.data || r.data || [];
      const list = Array.isArray(d) ? d : (d.connections || []);
      const map  = {};
      list.forEach(c => {
        const isReq = c.requester_type === 'student' && c.requester_id;
        const other = isReq ? c.recipient_id : c.requester_id;
        if (other) map[other] = c.status === 'accepted' ? 'accepted' : 'pending';
      });
      setConnMap(map);
    }).catch(() => {});
  }, [scope]);

  const load = useCallback(async (pg = 1, params = activeParams) => {
    setLoading(true);
    try {
      const apiParams = { page:pg, limit:20, scope };
      if (params.searchQuery) apiParams.search     = params.searchQuery;
      if (params.searchField && params.searchField !== 'all') apiParams.searchField = params.searchField;
      if (params.department)  apiParams.department = params.department;
      if (params.batch)       apiParams.batch      = params.batch;
      if (params.course)      apiParams.course     = params.course;
      if (params.sort)        apiParams.sort       = params.sort;

      const r = await listAlumni(apiParams);
      const d = r.data?.data || r.data;
      setAlumni(d.alumni || d || []);
      setTotal(d.total || 0);
      setPage(pg);
    } catch { toast('Failed to load alumni','error'); }
    finally { setLoading(false); }
  }, [activeParams, scope]); // eslint-disable-line

  useEffect(() => { load(1, activeParams); }, [scope]); // eslint-disable-line

  const mergeAndLoad = changes => {
    const merged = { ...activeParams, ...changes };
    setActiveParams(merged);
    load(1, merged);
  };

  const handleMessage = async a => {
    try {
      const r    = await startConversation({ other_type:'alumni', other_id:a.id, allow_cross_college:scope==='all_colleges' });
      const conv = r.data?.data || r.data;
      navigate('/student/messages', { state:{ conversationId:conv.id||conv.conversation_id } });
    } catch (err) { toast(err.response?.data?.message || 'Could not start conversation','error'); }
  };

  const handleConnect = async a => {
    try {
      const r = await requestConnection({ other_id:a.id, other_type:'alumni', allow_cross_college:scope==='all_colleges' });
      const d = r.data?.data || r.data;
      setConnMap(m => ({ ...m, [a.id]: d?.already_connected || d?.status === 'accepted' ? 'accepted' : 'pending' }));
      toast('Connection request sent ✓','success');
    } catch (e) {
      if (e.response?.status === 409) { setConnMap(m => ({ ...m, [a.id]:'pending' })); toast('Already requested','info'); }
      else toast(e.response?.data?.message || 'Request failed','error');
    }
  };

  const getConnTags = a => {
    const me = (() => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch { return null; } })();
    if (!me) return [];
    const tags = [];
    if (me.department && a.department && me.department === a.department) tags.push('same_department');
    if ((me.graduation_year || me.batch) && a.graduation_year &&
        String(me.graduation_year || me.batch) === String(a.graduation_year)) tags.push('same_batch');
    if (me.skills && a.skills) {
      const x = me.skills.split(',').map(s => s.trim().toLowerCase());
      const y = a.skills.split(',').map(s => s.trim().toLowerCase());
      if (x.some(sk => y.includes(sk))) tags.push('same_skills');
    }
    if (me.company && a.company && me.company.toLowerCase() === a.company.toLowerCase()) tags.push('same_company');
    return tags;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user"
        loginPath="/student/login" portalLabel="Student" accentColor={ACCENT} />

      <div className="main-content">
        <PortalNavbar title="Alumni Directory" userKey="user" />

        <div style={{ marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:'0 0 3px' }}>Alumni Directory</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>{total} alumni in the network</p>
        </div>

        {/* Horizontal filter bar replaces left sidebar */}
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
            { value:'company',    label:'Company'    },
            { value:'position',   label:'Position'   },
            { value:'department', label:'Department' },
          ]}
        />

        {loading ? <Loading /> : alumni.length === 0 ? (
          <div className="card" style={{ padding:0 }}>
            <EmptyState icon="alumni" title="No alumni found" sub="Try adjusting your search or filters" />
          </div>
        ) : (
          <div className="directory-grid">
            {alumni.map(a => {
              const inits = (a.full_name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
              const bg    = avatarColor(a.full_name);
              const tags  = getConnTags(a);
              return (
                <div key={a.id} className="directory-card">
                  <div className="big-avatar" style={{ background:bg }}>{inits}</div>
                  <div className="directory-card-name">{a.full_name}</div>
                  <div className="directory-card-role">{[a.designation, a.company].filter(Boolean).join(' at ') || a.department || '—'}</div>
                  <div style={{ marginBottom:6 }}>
                    <span className="badge badge-blue">{getCollegeName(a.college_id || currentTenant)}</span>
                  </div>
                  {a.graduation_year && (
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:4 }}>Class of {a.graduation_year}</div>
                  )}
                  {a.location && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                      <Icon name="mappin" size={11} color="var(--text-faint)" />{a.location}
                    </div>
                  )}
                  {a.available_mentorship && (
                    <span className="badge badge-green" style={{ marginBottom:8, fontSize:10.5 }}>
                      <Icon name="check" size={10} color="#059669" /> Mentoring
                    </span>
                  )}
                  {/* Connection intelligence tags */}
                  <ConnTags tags={tags} />

                  <div style={{ display:'flex', gap:5, justifyContent:'center', flexWrap:'wrap', marginTop:2 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/profile/${a.id}?type=alumni`)}>View</button>
                    {connMap[a.id] === 'accepted' ? <StatusBadge status="accepted" />
                      : connMap[a.id] === 'pending' ? <StatusBadge status="pending" />
                      : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleConnect(a)}>
                          <Icon name="connections" size={11} color="currentColor" /> Connect
                        </button>
                      )}
                    <button className="btn btn-primary btn-sm" style={{ background:ACCENT }} onClick={() => handleMessage(a)}>
                      <Icon name="messages" size={11} color="#fff" /> Msg
                    </button>
                  </div>
                  {a.linkedin_url && (
                    <div style={{ marginTop:8 }}>
                      <a href={a.linkedin_url} target="_blank" rel="noreferrer"
                        style={{ fontSize:11.5, color:ACCENT, display:'inline-flex', alignItems:'center', gap:4 }}>
                        <Icon name="linkedin" size={11} color={ACCENT} />LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:24 }}>
            <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={() => load(page-1)}>← Prev</button>
            <span style={{ fontSize:13, padding:'4px 12px', alignSelf:'center', color:'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page>=totalPages} onClick={() => load(page+1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
