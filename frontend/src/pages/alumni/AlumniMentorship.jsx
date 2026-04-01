import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { getAlumniMentorshipReqs, respondToMentorship } from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import Icon from '../../design/icons';
import { ModalShell, Field, PrimaryBtn, CancelBtn, Avatar, EmptyState, StatusBadge } from '../../design/components';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

export default function AlumniMentorship() {
  const toast = useToast();
  const [reqs, setReqs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [respond, setRespond] = useState(null);
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getAlumniMentorshipReqs(); const d = r.data?.data || r.data; setReqs(Array.isArray(d) ? d : (d?.requests || [])); }
    catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doRespond = async () => {
    if (!respond) return;
    setSaving(true);
    try {
      await respondToMentorship(respond.req.id, { status: respond.action, response_message: msg });
      toast(respond.action === 'accepted' ? 'Mentorship accepted ✓' : 'Request declined', 'success');
      setRespond(null); load();
    } catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
    finally { setSaving(false); }
  };

  const pending  = reqs.filter(r => r.status === 'pending');
  const resolved = reqs.filter(r => r.status !== 'pending');

  const RequestCard = ({ req, showActions }) => (
    <div className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:14 }}>
      <Avatar name={req.student_name} size={44} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{req.student_name || '—'}</div>
        <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:2 }}>
          {[req.student_email, req.department, req.year ? `Year ${req.year}` : null].filter(Boolean).join(' · ')}
        </div>
        {req.message && (
          <div style={{ fontSize:13, marginTop:8, padding:'8px 12px', background:'var(--bg)', borderRadius:8, color:'var(--text-muted)', fontStyle:'italic', borderLeft:'3px solid var(--border)' }}>
            "{req.message}"
          </div>
        )}
        <div style={{ fontSize:11.5, color:'var(--text-faint)', marginTop:6 }}>Sent {fmt(req.created_at)}</div>
      </div>
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
        {showActions ? (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-success btn-sm" onClick={() => { setRespond({ req, action:'accepted' }); setMsg(''); }}>
              <Icon name="check" size={12} color="#fff" /> Accept
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { setRespond({ req, action:'rejected' }); setMsg(''); }}>
              <Icon name="x" size={12} color="#DC2626" /> Decline
            </button>
          </div>
        ) : (
          <StatusBadge status={req.status} />
        )}
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user" loginPath="/alumni/login" portalLabel="Alumni" accentColor="#7C3AED" />
      <div className="main-content">
        <PortalNavbar title="Mentorship" userKey="alumni_user" />
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Mentorship Requests</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{pending.length} pending · {resolved.length} resolved</p>
        </div>

        {loading ? <Loading /> : reqs.length === 0 ? (
          <div className="card" style={{ padding:0 }}>
            <EmptyState icon="mentorship" title="No mentorship requests yet" sub="Students will send you requests here once you enable mentoring on your profile" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:'#FFFBEB', color:'#D97706', padding:'2px 8px', borderRadius:20, fontSize:11 }}>{pending.length} Pending</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {pending.map(r => <RequestCard key={r.id} req={r} showActions />)}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                  Past Requests ({resolved.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:0.75 }}>
                  {resolved.map(r => <RequestCard key={r.id} req={r} showActions={false} />)}
                </div>
              </div>
            )}
          </>
        )}

        {respond && (
          <ModalShell
            title={respond.action === 'accepted' ? 'Accept Mentorship Request' : 'Decline Mentorship Request'}
            subtitle={`From ${respond.req.student_name}`}
            onClose={() => setRespond(null)}
            footer={<>
              <CancelBtn onClick={() => setRespond(null)} />
              <PrimaryBtn
                label={respond.action === 'accepted' ? 'Accept' : 'Decline'}
                onClick={doRespond} saving={saving}
                color={respond.action === 'accepted' ? '#059669' : '#DC2626'}
                icon={respond.action === 'accepted' ? 'check' : 'x'}
              />
            </>}
          >
            {respond.req.message && (
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:13.5, color:'var(--text-muted)', fontStyle:'italic', borderLeft:'3px solid var(--border)' }}>
                "{respond.req.message}"
              </div>
            )}
            <Field
              label={respond.action === 'accepted' ? 'Welcome message (optional)' : 'Reason for declining (optional)'}
              type="textarea"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder={respond.action === 'accepted' ? 'Welcome them and suggest how you can help…' : 'Let them know why and perhaps suggest alternatives…'}
            />
          </ModalShell>
        )}
      </div>
    </div>
  );
}
