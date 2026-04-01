import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PortalSidebar, PortalNavbar } from '../components/PortalLayout';
import { Loading, useToast } from '../components/MessageBox';
import { listConnections, acceptConnection, rejectConnection, startConversation } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { avatarColor, initials } from '../design/tokens';
import ProfileCard from '../components/ProfileCard';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';

function PendingCard({ c, me, portalRole, onAccept, onReject, onView, accent }) {
  const isReq = c.requester_id === me?.id && c.requester_type === portalRole;
  const name   = isReq ? (c.recipient_name||'Unknown') : (c.requester_name||'Unknown');
  const dept   = isReq ? c.recipient_department   : c.requester_department;
  const co     = isReq ? c.recipient_company       : c.requester_company;
  const desg   = isReq ? c.recipient_designation   : c.requester_designation;
  const batch  = isReq ? c.recipient_graduation_year : c.requester_graduation_year;
  const college= isReq ? c.recipient_college_name  : c.requester_college_name;
  const sub    = [desg, co].filter(Boolean).join(' at ') || dept || '';
  const bg     = avatarColor(name);
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 20px', background:'#fff', borderRadius:12, border:'1.5px solid #EDE9FE', boxShadow:'0 1px 4px rgba(109,40,217,0.06)' }}>
      <div style={{ width:48, height:48, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, fontWeight:700, color:'#fff' }}>{initials(name)}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14.5, color:'#111827' }}>{name}</div>
        {sub && <div style={{ fontSize:12.5, color:'#6B7280', marginTop:2 }}>{sub}</div>}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 10px', marginTop:3 }}>
          {dept   && <span style={{ fontSize:11.5, color:'#9CA3AF' }}>{dept}</span>}
          {batch  && <span style={{ fontSize:11.5, color:'#9CA3AF' }}>Batch {batch}</span>}
          {college&& <span style={{ fontSize:11.5, color:'#9CA3AF' }}>{college}</span>}
        </div>
        {c.message && <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4, fontStyle:'italic' }}>"{c.message}"</div>}
        <div style={{ fontSize:11, color:'#D1D5DB', marginTop:3 }}>{fmtDate(c.created_at)}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, alignItems:'flex-end' }}>
        <span style={{ fontSize:10.5, fontWeight:600, color:'#F59E0B', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'2px 8px' }}>Pending</span>
        {!isReq && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>onAccept(c.id)} style={{ padding:'5px 14px', borderRadius:8, border:'none', background:accent, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Approve</button>
            <button onClick={()=>onReject(c.id)} style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid #E5E7EB', background:'#fff', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>Reject</button>
          </div>
        )}
        <button onClick={()=>onView(c,isReq)} style={{ padding:'4px 12px', borderRadius:8, border:'1.5px solid #E5E7EB', background:'#fff', color:'#6B7280', fontSize:11.5, cursor:'pointer' }}>View Profile</button>
      </div>
    </div>
  );
}

function ViewAllModal({ items, me, portalRole, onAccept, onReject, onView, accent, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, maxWidth:640, width:'100%', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#111827' }}>All Pending Requests</div>
            <div style={{ fontSize:13, color:'#9CA3AF', marginTop:2 }}>{items.length} request{items.length!==1?'s':''} awaiting your approval</div>
          </div>
          <button onClick={onClose} style={{ background:'#F3F4F6', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', color:'#6B7280', fontSize:13, fontWeight:600 }}>Close</button>
        </div>
        <div style={{ overflowY:'auto', padding:'12px 20px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(c=><PendingCard key={c.id} c={c} me={me} portalRole={portalRole} onAccept={onAccept} onReject={onReject} onView={(c2,isReq)=>{ onView(c2,isReq); onClose(); }} accent={accent} />)}
        </div>
      </div>
    </div>
  );
}

/* ── Connection search bar ────────────────────────────────────────── */
function ConnectionSearchBar({ accent, value, onChange }) {
  return (
    <div style={{ position:'relative', maxWidth:420 }}>
      <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="Search connections by name, company, batch…"
        style={{
          width:'100%', paddingLeft:34, paddingRight:value?32:14, paddingTop:9, paddingBottom:9,
          border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:13, color:'#374151',
          background:'#fff', outline:'none', boxSizing:'border-box',
          transition:'border-color 0.15s',
        }}
        onFocus={e=>e.target.style.borderColor=accent}
        onBlur={e=>e.target.style.borderColor='#E5E7EB'}
      />
      {value && (
        <button onClick={()=>onChange('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, lineHeight:1, padding:0 }}>×</button>
      )}
    </div>
  );
}

export default function ConnectionsPage({ portalRole='student', navItems, tokenKey, userKey, loginPath, portalLabel, accentColor='#7C3AED' }) {
  const toast    = useToast();
  const navigate = useNavigate();
  const me = (() => { try { return JSON.parse(localStorage.getItem(userKey)||'null'); } catch { return null; } })();

  const [all,         setAll]         = useState([]);
  const [grouped,     setGrouped]     = useState({ classmates:[], batchmates:[], others:[] });
  const [loading,     setLoading]     = useState(true);
  const [showViewAll, setShowViewAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listConnections();
      const d = r.data?.data||r.data||[];
      const connections = Array.isArray(d)?d:(d.connections||[]);
      setAll(connections);
      setGrouped({
        classmates: Array.isArray(d.classmates)?d.classmates:[],
        batchmates: Array.isArray(d.batchmates)?d.batchmates:[],
        others:     Array.isArray(d.others)?d.others:[],
      });
    } catch { toast('Failed to load connections','error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const getOtherName = (c) => (c.requester_id===me?.id ? c.recipient_name : c.requester_name)||'';
  const getOtherCompany = (c) => (c.requester_id===me?.id ? c.recipient_company : c.requester_company)||'';
  const getOtherBatch = (c) => (c.requester_id===me?.id ? c.recipient_graduation_year : c.requester_graduation_year)||'';
  const getOtherDept = (c) => (c.requester_id===me?.id ? c.recipient_department : c.requester_department)||'';

  // Filter connections by search query
  const matchesSearch = useCallback((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      getOtherName(c).toLowerCase().includes(q) ||
      getOtherCompany(c).toLowerCase().includes(q) ||
      String(getOtherBatch(c)).toLowerCase().includes(q) ||
      getOtherDept(c).toLowerCase().includes(q)
    );
  }, [searchQuery, me?.id]);

  const sortByName = (items) => [...items].sort((a,b) => getOtherName(a).localeCompare(getOtherName(b)));

  const pending     = all.filter(c => c.status==='pending' && c.recipient_id===me?.id && c.recipient_type===portalRole);
  const classmates  = sortByName(grouped.classmates).filter(matchesSearch);
  const batchmates  = sortByName(grouped.batchmates).filter(matchesSearch);
  const others      = sortByName(grouped.others).filter(matchesSearch);
  const accepted    = [...classmates, ...batchmates, ...others];
  const pendingVisible = pending.slice(0,3);
  const hasMore     = pending.length > 3;

  const totalMatched = accepted.length;
  const isFiltering  = searchQuery.trim().length > 0;

  const handleAccept = async id => {
    try { await acceptConnection(id); toast('Connection accepted','success'); load(); }
    catch (e) { toast(e.response?.data?.message||'Error','error'); }
  };

  const handleReject = async id => {
    try { await rejectConnection(id); toast('Rejected'); load(); }
    catch (e) { toast(e.response?.data?.message||'Error','error'); }
  };

  const handleMessage = async c => {
    const otherId   = c.requester_id===me?.id ? c.recipient_id   : c.requester_id;
    const otherType = c.requester_id===me?.id ? c.recipient_type : c.requester_type;
    try {
      const r = await startConversation({ other_id:otherId, other_type:otherType });
      const conv = r.data?.data||r.data;
      navigate(`/${portalRole}/messages`, { state:{ conversationId:conv.id||conv.conversation_id } });
    } catch (e) { toast(e.response?.data?.message||'Could not open conversation','error'); }
  };

  const handleView = (c, isRequesterSide) => {
    const otherId   = isRequesterSide ? c.recipient_id   : c.requester_id;
    const otherType = isRequesterSide ? c.recipient_type : c.requester_type;
    navigate(`/profile/${otherId}?type=${otherType}`);
  };

  const mapConnectionToProfile = (c, groupType) => {
    const isReq = c.requester_id===me?.id && c.requester_type===portalRole;
    return {
      id:             isReq ? c.recipient_id   : c.requester_id,
      role:           isReq ? c.recipient_type : c.requester_type,
      full_name:      isReq ? (c.recipient_name||'Unknown')       : (c.requester_name||'Unknown'),
      department:     isReq ? c.recipient_department               : c.requester_department,
      branch:         isReq ? c.recipient_department               : c.requester_department,
      batch:          isReq ? c.recipient_graduation_year          : c.requester_graduation_year,
      company:        isReq ? c.recipient_company                  : c.requester_company,
      location:       isReq ? c.recipient_location                 : c.requester_location,
      designation:    isReq ? c.recipient_designation              : c.requester_designation,
      sameCompany:    Boolean(c.company_match),
      isClassmate:    groupType==='classmates',
      isBatchmate:    groupType==='batchmates',
      mutualConnections: 0,
      hoverInfo:      c.education_match ? 'Shared education background' : (isReq ? c.recipient_designation : c.requester_designation),
      _connection:    c,
      _isRequesterSide: isReq,
    };
  };

  const GroupSection = ({ title, groupKey, items, subtitle }) => (
    <div style={{ marginTop:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{title}</div>
        <span style={{ fontSize:12, color:'#9CA3AF' }}>{items.length}</span>
        {subtitle && <span style={{ fontSize:12, color:'#D1D5DB' }}>{subtitle}</span>}
      </div>
      {items.length===0 ? (
        <div style={{ padding:'18px 16px', background:'#fff', borderRadius:12, border:'1px solid #F3F4F6', color:'#9CA3AF', fontSize:13 }}>
          {isFiltering ? 'No matches in this group.' : 'No connections in this group yet.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(c=>{
            const profile = mapConnectionToProfile(c, groupKey);
            return (
              <ProfileCard
                key={c.id}
                profile={profile}
                onView={p=>handleView(p._connection, p._isRequesterSide)}
                onMessage={()=>handleMessage(c)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const totalAllConnections = [...grouped.classmates,...grouped.batchmates,...grouped.others].length;

  return (
    <div className="app-layout">
      <PortalSidebar navItems={navItems} tokenKey={tokenKey} userKey={userKey} loginPath={loginPath} portalLabel={portalLabel} accentColor={accentColor} />
      <div className="main-content">
        <PortalNavbar title="Connections" userKey={userKey} />

        {/* Header + search bar */}
        <div style={{ marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:14 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', letterSpacing:'-0.4px', margin:0 }}>My Connections</h1>
              <p style={{ fontSize:13.5, color:'#9CA3AF', marginTop:4 }}>
                {totalAllConnections} connection{totalAllConnections!==1?'s':''}
                {pending.length>0&&` · ${pending.length} pending`}
                {isFiltering&&` · ${totalMatched} match${totalMatched!==1?'es':''}`}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <ConnectionSearchBar
            accent={accentColor}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {loading ? <Loading /> : (
          <>
            {pending.length>0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Pending Approvals</div>
                    <span style={{ fontSize:11, fontWeight:700, background:'#FEF3C7', color:'#D97706', borderRadius:10, padding:'2px 8px', border:'1px solid #FDE68A' }}>{pending.length}</span>
                  </div>
                  {hasMore && <button onClick={()=>setShowViewAll(true)} style={{ fontSize:13, fontWeight:600, color:accentColor, background:'none', border:'none', cursor:'pointer', padding:0 }}>View All</button>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {pendingVisible.map(c=><PendingCard key={c.id} c={c} me={me} portalRole={portalRole} onAccept={handleAccept} onReject={handleReject} onView={handleView} accent={accentColor} />)}
                </div>
                {hasMore && (
                  <button onClick={()=>setShowViewAll(true)} style={{ marginTop:10, width:'100%', padding:10, background:'#F5F3FF', border:'1.5px dashed #C4B5FD', borderRadius:10, fontSize:13, fontWeight:600, color:accentColor, cursor:'pointer' }}>
                    + {pending.length-3} more pending - View All
                  </button>
                )}
              </div>
            )}

            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:12 }}>
                {isFiltering ? 'Search Results' : 'Connected'}
                <span style={{ fontSize:13, fontWeight:400, color:'#9CA3AF', marginLeft:8 }}>
                  {isFiltering ? `${totalMatched} of ${totalAllConnections}` : totalAllConnections}
                </span>
              </div>

              {totalAllConnections===0 ? (
                <div style={{ padding:'40px 24px', background:'#fff', borderRadius:12, border:'1px solid #F3F4F6', textAlign:'center' }}>
                  <div style={{ fontSize:38, marginBottom:12 }}>🤝</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#374151', marginBottom:6 }}>No connections yet</div>
                  <div style={{ fontSize:13.5, color:'#9CA3AF' }}>Visit the Network page to discover and connect with people</div>
                  <button onClick={()=>navigate(`/${portalRole}/network`)} style={{ marginTop:16, padding:'9px 22px', borderRadius:10, border:'none', background:accentColor, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Browse Network</button>
                </div>
              ) : isFiltering && totalMatched===0 ? (
                <div style={{ padding:'32px 24px', background:'#fff', borderRadius:12, border:'1px solid #F3F4F6', textAlign:'center' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#374151', marginBottom:4 }}>No matches found</div>
                  <div style={{ fontSize:13, color:'#9CA3AF' }}>Try a different name, company, or batch</div>
                  <button onClick={()=>setSearchQuery('')} style={{ marginTop:12, padding:'7px 18px', borderRadius:8, border:`1.5px solid ${accentColor}`, background:'transparent', color:accentColor, fontSize:13, fontWeight:600, cursor:'pointer' }}>Clear search</button>
                </div>
              ) : (
                <div>
                  <GroupSection title="Classmates" groupKey="classmates" items={classmates} subtitle="Same branch and same batch" />
                  <GroupSection title="Batchmates" groupKey="batchmates" items={batchmates} subtitle="Same batch, different branch" />
                  <GroupSection title="Others" groupKey="others" items={others} subtitle="Different batch" />
                </div>
              )}
            </div>
          </>
        )}

        {showViewAll && (
          <ViewAllModal items={pending} me={me} portalRole={portalRole} onAccept={handleAccept} onReject={handleReject} onView={handleView} accent={accentColor} onClose={()=>setShowViewAll(false)} />
        )}
      </div>
    </div>
  );
}
