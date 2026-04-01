/**
 * Network.jsx - Alumni Network main page (v11)
 * Layout: horizontal FilterBar (replaces left sidebar) + hierarchical batch/dept view
 */
import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { getNetworkHierarchy, getAlumniFilters, searchNetwork } from '../services/api';
import { useNavigate } from 'react-router-dom';
import FilterBar from '../components/FilterBar';
import { STUDENT_NAV } from './student/_nav';
import { ALUMNI_NAV } from './alumni/_nav';

function getSession() {
  try { const u = JSON.parse(localStorage.getItem('alumni_user')||'null'); if (u && localStorage.getItem('alumni_token')) return { user: u, role: 'alumni', tokenKey: 'alumni_token', userKey: 'alumni_user' }; } catch {}
  try { const u = JSON.parse(localStorage.getItem('user')||'null'); if (u && localStorage.getItem('token')) return { user: u, role: 'student', tokenKey: 'token', userKey: 'user' }; } catch {}
  return { user: null, role: 'student', tokenKey: 'token', userKey: 'user' };
}

const COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2','#0D9488','#9333EA'];
const colorFor = n => COLORS[(n||'?').charCodeAt(0) % COLORS.length];
const toInitials = n => (n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);

function UserPill({ user, accent, onView }) {
  const [hov, setHov] = useState(false);
  const name = user.full_name || user.name || '?';
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onView}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`1px solid ${hov?accent+'50':'#F3F4F6'}`, background:hov?accent+'06':'#FAFAFA', cursor:'pointer', transition:'all 0.14s', minWidth:0 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:colorFor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>{toInitials(name)}</div>
      <div style={{ minWidth:0, flex:1 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        <div style={{ fontSize:11.5, color:'#6B7280', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {[user.designation&&user.company?`${user.designation} @ ${user.company}`:user.company, user.role==='student'?'Student':null].filter(Boolean).join(' · ')||user.department||'—'}
        </div>
      </div>
      {user.available_mentorship && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'#ECFDF5', color:'#059669', fontWeight:700, flexShrink:0 }}>Mentor</span>}
    </div>
  );
}

function DeptRow({ deptName, members, accent, onViewUser, defaultOpen=false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom:'1px solid #F3F4F6' }}>
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M9 22V12h6v10"/></svg>
          <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>{deptName}</span>
          <span style={{ fontSize:11, padding:'1px 7px', borderRadius:20, background:accent+'12', color:accent, fontWeight:700 }}>{members.length}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.15s', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div style={{ padding:'8px 20px 16px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>{members.map(u=><UserPill key={`${u.role}-${u.id}`} user={u} accent={accent} onView={()=>onViewUser(u)} />)}</div>}
    </div>
  );
}

function BatchCard({ batch, accent, onViewUser, defaultOpen=false }) {
  const [open, setOpen] = useState(defaultOpen);
  const depts = batch.depts||[];
  const memberCount = batch.count??depts.reduce((s,d)=>s+(d.users||[]).length,0);
  return (
    <div style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${open?accent+'28':'#E5E7EB'}`, marginBottom:10, overflow:'hidden', boxShadow:open?`0 4px 18px ${accent}0e`:'0 1px 4px rgba(0,0,0,0.05)', transition:'all 0.15s' }}>
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', background:open?accent+'05':'#fff', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:accent+'14', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20"/><path d="M15 5.5L16.5 7L19 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize:14.5, fontWeight:800, color:'#111827' }}>{batch.label}</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{memberCount} {memberCount===1?'member':'members'}{depts.length>0&&` · ${depts.length} dept${depts.length!==1?'s':''}`}</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.18s', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div>{depts.map(d=><DeptRow key={d.key} deptName={d.label} members={d.users||[]} accent={accent} onViewUser={onViewUser} defaultOpen={depts.length===1} />)}</div>}
    </div>
  );
}

function SearchBatchCard({ batchData, accent, onViewUser }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${open?accent+'28':'#E5E7EB'}`, marginBottom:10, overflow:'hidden', boxShadow:open?`0 4px 18px ${accent}0e`:'0 1px 4px rgba(0,0,0,0.05)', transition:'all 0.15s' }}>
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', background:open?accent+'05':'#fff', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:accent+'14', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20"/></svg>
          </div>
          <div>
            <div style={{ fontSize:14.5, fontWeight:800, color:'#111827' }}>{batchData.batchLabel}</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{batchData.totalMembers} {batchData.totalMembers===1?'member':'members'}{batchData.departments?.length>0&&` · ${batchData.departments.length} dept${batchData.departments.length!==1?'s':''}`}</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.18s', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div>{(batchData.departments||[]).map(d=><DeptRow key={d.deptName} deptName={d.deptName} members={d.members||[]} accent={accent} onViewUser={onViewUser} defaultOpen={(batchData.departments||[]).length===1} />)}</div>}
    </div>
  );
}

function CollegeCard({ college, accent, onViewUser }) {
  const [open, setOpen] = useState(false);
  const batches = college.batches||[];
  return (
    <div style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${open?accent+'38':'#E5E7EB'}`, marginBottom:12, overflow:'hidden', boxShadow:open?`0 4px 20px ${accent}10`:'0 1px 4px rgba(0,0,0,0.05)', transition:'all 0.15s' }}>
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', background:open?accent+'07':'#fff', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:accent+'16', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8"><path d="M3 9L12 4L21 9V11H3V9Z" fill={accent+'20'}/><path d="M5 11V18H19V11"/><path d="M9 18V14H15V18"/></svg>
          </div>
          <div>
            <div style={{ fontSize:15.5, fontWeight:800, color:'#111827' }}>{college.label}</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{college.count} {college.count===1?'member':'members'}{batches.length>0&&` · ${batches.length} batch${batches.length!==1?'es':''}`}</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.18s', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div style={{ padding:'4px 16px 16px' }}>{batches.map(b=><BatchCard key={b.key} batch={b} accent={accent} onViewUser={onViewUser} />)}</div>}
    </div>
  );
}

function Spinner({ accent }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'64px 0', gap:14 }}>
      <div style={{ width:38, height:38, borderRadius:'50%', border:`3px solid ${accent}20`, borderTop:`3px solid ${accent}`, animation:'net-spin 0.7s linear infinite' }} />
      <span style={{ fontSize:13, color:'#9CA3AF' }}>Loading members…</span>
      <style>{`@keyframes net-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Network() {
  const navigate = useNavigate();
  const session  = getSession();
  const isAlumni = session.role === 'alumni';
  const accent   = isAlumni ? '#7C3AED' : '#2563EB';
  const navItems = isAlumni ? ALUMNI_NAV : STUDENT_NAV;

  const [scope,         setScope]         = useState('my_college');
  const [hierarchy,     setHierarchy]     = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [total,         setTotal]         = useState(0);
  const [filterOpts,    setFilterOpts]    = useState({ departments:[], companies:[], batches:[] });
  const [hasSearch,     setHasSearch]     = useState(false);
  const [activeParams,  setActiveParams]  = useState({ searchField:'all', searchQuery:'', batch:'', department:'', branch:'', company:'', skills:'' });

  useEffect(() => {
    getAlumniFilters(scope).then(r => {
      const d = r.data?.data||r.data;
      setFilterOpts({ departments:d.departments||[], companies:d.companies||[], batches:d.batches||[] });
    }).catch(()=>{});
  }, [scope]);

  const loadHierarchy = useCallback(async (params, sc) => {
    setLoading(true); setError(''); setHierarchy([]); setSearchResults([]);
    try {
      const p = { scope:sc };
      if (params.batch)      p.batch      = params.batch;
      if (params.department) p.department = params.department;
      if (params.branch)     p.branch     = params.branch;
      if (params.company)    p.company    = params.company;
      const r = await getNetworkHierarchy(p);
      const d = r.data?.data||r.data||{};
      setHierarchy(Array.isArray(d.hierarchy)?d.hierarchy:[]);
      setTotal(d.total||0);
    } catch (e) { setError(e.response?.data?.message||'Failed to load network.'); }
    finally { setLoading(false); }
  }, []);

  const loadSearch = useCallback(async (params, sc) => {
    setLoading(true); setError(''); setHierarchy([]); setSearchResults([]);
    try {
      const r = await searchNetwork(params.searchQuery, sc, undefined, undefined);
      const arr = Array.isArray(r.data?.data||r.data)?(r.data?.data||r.data):[];
      setSearchResults(arr);
      setTotal(arr.reduce((s,b)=>s+(b.totalMembers||0),0));
    } catch (e) { setError(e.response?.data?.message||'Search failed.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHierarchy(activeParams, scope); }, [scope]); // eslint-disable-line

  const mergeAndLoad = (changes) => {
    const merged = { ...activeParams, ...changes };
    setActiveParams(merged);
    const searching = !!(merged.searchQuery||merged.batch||merged.department||merged.branch||merged.company);
    setHasSearch(searching);
    if (merged.searchQuery) loadSearch(merged, scope);
    else loadHierarchy(merged, scope);
  };

  const clearSearch = () => {
    const empty = { searchField:'all', searchQuery:'', batch:'', department:'', branch:'', company:'', skills:'' };
    setActiveParams(empty); setHasSearch(false);
    loadHierarchy(empty, scope);
  };

  const handleViewUser = u => navigate(`/profile/${u.id}?type=${u.role||'alumni'}`);
  const isAllColleges  = scope === 'all_colleges';
  const isEmpty = !loading && !error && (hasSearch
    ? searchResults.length===0 || searchResults.every(b=>(b.totalMembers||0)===0)
    : hierarchy.length===0);

  return (
    <div className="app-layout">
      <PortalSidebar navItems={navItems} tokenKey={session.tokenKey} userKey={session.userKey}
        loginPath={isAlumni?'/alumni/login':'/student/login'}
        portalLabel={isAlumni?'Alumni':'Student'} accentColor={accent} />

      <div className="main-content">
        <PortalNavbar title="Network" userKey={session.userKey} />

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:'0 0 4px', letterSpacing:'-0.4px' }}>Alumni Network</h1>
          <p style={{ fontSize:13.5, color:'#9CA3AF', margin:0 }}>
            {!loading&&total>0?`${total} member${total!==1?'s':''} in the network`:'Connect with alumni and students'}
          </p>
        </div>

        {/* Horizontal filter bar — replaces left sidebar */}
        <FilterBar
          accentColor={accent}
          scope={scope}
          onScopeChange={s => { setScope(s); }}
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

        {/* Content area */}
        <div>

            {/* Search results banner */}
            {hasSearch&&!loading&&(
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, padding:'10px 16px', background:accent+'08', borderRadius:10, border:`1px solid ${accent}20` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span style={{ fontSize:13, fontWeight:700, color:accent }}>Search results</span>
                  <span style={{ fontSize:13, color:'#6B7280' }}>— {total} member{total!==1?'s':''} found</span>
                </div>
                <button onClick={clearSearch} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Clear search
                </button>
              </div>
            )}

            {error&&(
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'12px 16px', color:'#DC2626', fontSize:13, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{error}</span>
                <button onClick={()=>hasSearch?loadSearch(activeParams,scope):loadHierarchy(activeParams,scope)} style={{ padding:'4px 12px', borderRadius:8, border:'1px solid #FCA5A5', background:'#fff', color:'#DC2626', fontSize:12, cursor:'pointer' }}>↺ Retry</button>
              </div>
            )}

            {loading ? <Spinner accent={accent} /> : isEmpty ? (
              <div style={{ textAlign:'center', paddingTop:64, color:'#9CA3AF' }}>
                <div style={{ fontSize:46, marginBottom:12 }}>🌐</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#374151', marginBottom:6 }}>No members found</div>
                <div style={{ fontSize:13.5 }}>{hasSearch?'Try adjusting your search or clearing filters.':'Try switching to "All Colleges".'}</div>
                {hasSearch&&<button onClick={clearSearch} style={{ marginTop:14, padding:'8px 20px', borderRadius:8, border:`1.5px solid ${accent}`, background:accent+'10', color:accent, fontSize:13, fontWeight:600, cursor:'pointer' }}>Clear Search</button>}
              </div>
            ) : (
              <div>
                {hasSearch
                  ? searchResults.map(b=><SearchBatchCard key={b.batch} batchData={b} accent={accent} onViewUser={handleViewUser} />)
                  : isAllColleges
                    ? hierarchy.map(col=><CollegeCard key={col.key} college={col} accent={accent} onViewUser={handleViewUser} />)
                    : hierarchy.map((b,i)=><BatchCard key={b.key} batch={b} accent={accent} onViewUser={handleViewUser} defaultOpen={i===0&&hierarchy.length===1} />)
                }
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

export function ConnectionButton({ status, onConnect, onMessage, accentColor='#2563EB' }) {
  if (status==='accepted') return (
    <div style={{ display:'flex', gap:6 }}>
      <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:'#ECFDF5', color:'#059669', fontWeight:600 }}>✓ Connected</span>
      <button onClick={onMessage} style={{ padding:'4px 10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:12, cursor:'pointer' }}>Message</button>
    </div>
  );
  if (status==='pending') return <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:'#FEF3C7', color:'#D97706', fontWeight:600 }}>⏳ Pending</span>;
  return <button style={{ padding:'5px 13px', borderRadius:8, border:'none', background:accentColor, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }} onClick={onConnect}>+ Connect</button>;
}
