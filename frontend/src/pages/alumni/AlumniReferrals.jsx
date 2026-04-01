import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { getAlumniReferralReqs, respondToReferral } from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import Icon from '../../design/icons';
import { ModalShell, Field, PrimaryBtn, CancelBtn, Avatar, EmptyState, StatusBadge } from '../../design/components';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

export default function AlumniReferrals() {
  const toast = useToast();
  const [reqs, setReqs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [respond, setRespond] = useState(null);
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getAlumniReferralReqs(); const d = r.data?.data || r.data; setReqs(Array.isArray(d) ? d : (d?.referrals || [])); }
    catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doRespond = async () => {
    if (!respond) return;
    setSaving(true);
    try {
      await respondToReferral(respond.req.id, { status: respond.action, response_message: msg });
      toast(respond.action === 'approved' ? 'Referral approved ✓' : 'Referral rejected', 'success');
      setRespond(null); load();
    } catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
    finally { setSaving(false); }
  };

  const pending  = reqs.filter(r => r.status === 'pending');
  const resolved = reqs.filter(r => r.status !== 'pending');

  const ReferralCard = ({ req, showActions }) => (
    <div className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:14 }}>
      <Avatar name={req.student_name} size={44} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{req.student_name || '—'}</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
          <Icon name="briefcase" size={12} color="#9CA3AF" />
          <span>Applying for <strong>{req.position || req.job_title || '—'}</strong> at <strong>{req.company_name || req.company || '—'}</strong></span>
        </div>
        {req.message && (
          <div style={{ fontSize:13, marginTop:8, padding:'8px 12px', background:'var(--bg)', borderRadius:8, color:'var(--text-muted)', fontStyle:'italic', borderLeft:'3px solid var(--border)' }}>
            "{req.message}"
          </div>
        )}
        <div style={{ fontSize:11.5, color:'var(--text-faint)', marginTop:6 }}>Requested {fmt(req.created_at)}</div>
      </div>
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
        {showActions ? (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-success btn-sm" onClick={() => { setRespond({ req, action:'approved' }); setMsg(''); }}>
              <Icon name="check" size={12} color="#fff" /> Approve
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { setRespond({ req, action:'rejected' }); setMsg(''); }}>
              <Icon name="x" size={12} color="#DC2626" /> Reject
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
        <PortalNavbar title="Referrals" userKey="alumni_user" />
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Referral Requests</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{pending.length} pending · {resolved.length} resolved</p>
        </div>

        {loading ? <Loading /> : reqs.length === 0 ? (
          <div className="card" style={{ padding:0 }}>
            <EmptyState icon="referrals" title="No referral requests yet" sub="Students will send you referral requests here" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                  <span style={{ background:'#FFFBEB', color:'#D97706', padding:'2px 8px', borderRadius:20, fontSize:11 }}>{pending.length} Pending</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {pending.map(r => <ReferralCard key={r.id} req={r} showActions />)}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Past Requests ({resolved.length})</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:0.75 }}>
                  {resolved.map(r => <ReferralCard key={r.id} req={r} showActions={false} />)}
                </div>
              </div>
            )}
          </>
        )}

        {respond && (
          <ModalShell
            title={respond.action === 'approved' ? 'Approve Referral' : 'Reject Referral'}
            subtitle={`${respond.req.student_name} → ${respond.req.position || respond.req.job_title} at ${respond.req.company_name || respond.req.company}`}
            onClose={() => setRespond(null)}
            footer={<>
              <CancelBtn onClick={() => setRespond(null)} />
              <PrimaryBtn label={respond.action === 'approved' ? 'Approve' : 'Reject'} onClick={doRespond} saving={saving} color={respond.action === 'approved' ? '#059669' : '#DC2626'} />
            </>}
          >
            <Field
              label="Message to student (optional)"
              type="textarea"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder={respond.action === 'approved' ? 'Let them know next steps…' : 'Explain why you cannot refer at this time…'}
            />
          </ModalShell>
        )}
      </div>
    </div>
  );
}
