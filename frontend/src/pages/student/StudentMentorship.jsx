import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { getMyMentorshipRequests, requestMentorship, listAlumni } from '../../services/api';
import Icon from '../../design/icons';
import { ModalShell, Field, PrimaryBtn, CancelBtn, Avatar, EmptyState, StatusBadge } from '../../design/components';
import { avatarColor } from '../../design/tokens';
import { STUDENT_NAV } from './_nav';
import { filterUsersByCollege, getCollegeName, getCurrentTenant } from '../../utils/tenant';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

export default function StudentMentorship() {
  const toast = useToast();
  const ACTIVE_LIMIT = 5; // must match backend MENTORSHIP_ACTIVE_LIMIT

  const [requests, setRequests] = useState([]);
  const [alumni,   setAlumni]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [scope,    setScope]    = useState('my_college');
  const [form,     setForm]     = useState({ alumni_id:'', message:'' });
  const currentTenant = getCurrentTenant();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rR, aR] = await Promise.all([getMyMentorshipRequests(), listAlumni({ limit:100 })]);
      const rd = rR.data?.data || rR.data; setRequests(Array.isArray(rd) ? rd : (rd?.requests || []));
      const ad = aR.data?.data || aR.data;
      setAlumni(filterUsersByCollege(ad.alumni || ad || [], scope, currentTenant));
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [scope, currentTenant]);
  useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    if (!form.alumni_id) { toast('Select an alumni', 'error'); return; }
    setSaving(true);
    try {
      await requestMentorship({
        alumni_id: parseInt(form.alumni_id, 10),
        message: form.message,
        allow_cross_college: scope === 'all_colleges',
      });
      toast('Mentorship request sent ✓', 'success'); setFormOpen(false); setForm({ alumni_id:'', message:'' }); load();
    } catch (err) { toast(err.response?.data?.message || 'Request failed', 'error'); }
    finally { setSaving(false); }
  };

  const mentors      = alumni.filter(a => a.available_mentorship);
  const activeCount  = requests.filter(r => r.status === 'pending' || r.status === 'accepted').length;
  const atLimit      = activeCount >= ACTIVE_LIMIT;

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#2563EB" />
      <div className="main-content">
        <PortalNavbar title="Mentorship" userKey="user" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Mentorship</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
              {mentors.length} alumni available · {requests.length} requests sent
              {atLimit && (
                <span style={{ marginLeft:8, background:'#FEF3C7', color:'#92400E', padding:'2px 8px', borderRadius:20, fontSize:11.5, fontWeight:600 }}>
                  ⚠ Limit reached ({activeCount}/{ACTIVE_LIMIT})
                </span>
              )}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select className="filter-select" value={scope} onChange={e => setScope(e.target.value)}>
              <option value="my_college">My College</option>
              <option value="all_colleges">All Colleges</option>
            </select>
            <button
              className="btn btn-primary"
              style={{ background: atLimit ? '#9CA3AF' : '#2563EB', cursor: atLimit ? 'not-allowed' : 'pointer' }}
              onClick={() => !atLimit && setFormOpen(true)}
              title={atLimit ? `Active request limit reached (${ACTIVE_LIMIT})` : 'Request a mentor'}
              disabled={atLimit}
            >
              <Icon name="plus" size={14} color="#fff" /> Request Mentor
            </button>
          </div>
        </div>

        {loading ? <Loading /> : (
          <>
            {/* My requests */}
            {requests.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>My Requests</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {requests.map(r => (
                    <div key={r.id} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                      <Avatar name={r.alumni_name} size={42} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{r.alumni_name || '—'}</div>
                        <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:1 }}>{[r.alumni_designation, r.alumni_company].filter(Boolean).join(' at ')}</div>
                        <div style={{ marginTop: 4 }}>
                          <span className="badge badge-blue">{getCollegeName(r.alumni_college_id || r.college_id || currentTenant)}</span>
                        </div>
                        {r.message && <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>"{r.message}"</div>}
                        {r.response_message && <div style={{ fontSize:12.5, color:'var(--success)', marginTop:4 }}>Response: "{r.response_message}"</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                        <StatusBadge status={r.status} />
                        <div style={{ fontSize:11, color:'var(--text-faint)' }}>{fmt(r.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available mentors */}
            {mentors.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Available Mentors ({mentors.length})</div>
                <div className="mentor-grid">
                  {mentors.map(a => {
                    const alreadySent = requests.some(r => String(r.alumni_id) === String(a.id));
                    const bg = avatarColor(a.full_name);
                    return (
                      <div key={a.id} className="mentor-card">
                        <div style={{ width:56, height:56, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff', margin:'0 auto 10px' }}>
                          {(a.full_name||'?').split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{a.full_name}</div>
                        <div style={{ fontSize:12.5, color:'var(--text-muted)', marginBottom:10 }}>{[a.designation, a.company].filter(Boolean).join(' at ')}</div>
                        <div style={{ marginBottom: 8 }}>
                          <span className="badge badge-blue">{getCollegeName(a.college_id || currentTenant)}</span>
                        </div>
                        {a.department && <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>{a.department}</div>}
                        {(() => {
                          const existingReq = requests.find(r => String(r.alumni_id) === String(a.id));
                          if (existingReq) return <StatusBadge status={existingReq.status} />;
                          if (atLimit) return (
                            <span title={`Active request limit reached (${ACTIVE_LIMIT})`}
                              style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#9CA3AF',
                                       padding:'5px 10px', borderRadius:6, border:'1px solid #E5E7EB', cursor:'not-allowed' }}>
                              🔒 Limit reached
                            </span>
                          );
                          return (
                            <button className="btn btn-primary btn-sm" style={{ background:'#2563EB' }}
                              onClick={() => { setForm({ alumni_id: String(a.id), message:'' }); setFormOpen(true); }}>
                              Request Mentorship
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {mentors.length === 0 && requests.length === 0 && (
              <div className="card" style={{ padding:0 }}>
                <EmptyState icon="mentorship" title="No mentors available yet" sub="Alumni who enable mentoring will appear here" />
              </div>
            )}
          </>
        )}

        {formOpen && (
          <ModalShell
            title="Request Mentorship"
            subtitle={`Send a mentorship request · ${activeCount}/${ACTIVE_LIMIT} active`}
            onClose={() => setFormOpen(false)}
            footer={<><CancelBtn onClick={() => setFormOpen(false)} /><PrimaryBtn label="Send Request" onClick={handleRequest} saving={saving} color="#2563EB" icon="mentorship" /></>}
          >
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Select Alumni</div>
                <select value={form.alumni_id} onChange={e => setForm(p => ({ ...p, alumni_id: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #D1D5DB', fontSize:13.5, fontFamily:'inherit', outline:'none', color:'#111827' }}>
                  <option value="">— Choose an alumni mentor —</option>
                  {alumni.filter(a => a.available_mentorship).map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}{a.company ? ' (' + a.company + ')' : ''}</option>
                  ))}
                </select>
              </div>
              <Field label="Message (optional)" type="textarea" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Tell them about yourself and what you're looking for in a mentor…" />
            </div>
          </ModalShell>
        )}
      </div>
    </div>
  );
}
