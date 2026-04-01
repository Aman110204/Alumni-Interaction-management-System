import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { getMyReferralRequests, requestReferral, listAlumni, getAlumniCompanies, listAcceptedConnections } from '../../services/api';
import Icon from '../../design/icons';
import { ModalShell, Field, PrimaryBtn, CancelBtn, EmptyState, StatusBadge } from '../../design/components';
import { STUDENT_NAV } from './_nav';
import { filterUsersByCollege, getCollegeName, getCurrentTenant } from '../../utils/tenant';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function StudentReferral() {
  const toast = useToast();
  const currentTenant = getCurrentTenant();
  const [referrals,        setReferrals]        = useState([]);
  const [alumni,           setAlumni]           = useState([]);  // only connected alumni
  const [loading,          setLoading]          = useState(true);
  const [formOpen,         setFormOpen]         = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [form,             setForm]             = useState({ alumni_id: '', company: '', job_title: '', message: '' });
  const [companies,        setCompanies]        = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError,     setCompanyError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load referrals + only alumni with accepted connections (referral requires connection)
      const [rR, cR] = await Promise.all([getMyReferralRequests(), listAcceptedConnections()]);
      const rd = rR.data?.data || rR.data;
      setReferrals(Array.isArray(rd) ? rd : (rd?.referrals || []));
      const connList = cR.data?.data || cR.data || [];
      // Extract connected alumni IDs from accepted connections
      const connectedAlumni = connList
        .filter(c => c.status === 'accepted' && (c.requester_type === 'alumni' || c.recipient_type === 'alumni'))
        .map(c => {
          const me = JSON.parse(localStorage.getItem('user') || '{}');
          return c.requester_type === 'alumni' && c.requester_id !== me.id
            ? { id: c.requester_id, full_name: c.requester_name, company: c.requester_company }
            : c.recipient_type === 'alumni' && c.recipient_id !== me.id
            ? { id: c.recipient_id, full_name: c.recipient_name, company: c.recipient_company }
            : null;
        })
        .filter(Boolean);
      setAlumni(filterUsersByCollege(connectedAlumni, 'my_college', currentTenant));
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [currentTenant]);

  useEffect(() => { load(); }, [load]);

  const handleAlumniChange = async (alumniId) => {
    setForm(p => ({ ...p, alumni_id: alumniId, company: '', job_title: '' }));
    setCompanies([]); setCompanyError('');
    if (!alumniId) return;
    setLoadingCompanies(true);
    try {
      const r = await getAlumniCompanies(parseInt(alumniId));
      const d = r.data?.data || r.data;
      const list = d.companies || [];
      setCompanies(list);
      if (list.length === 0) setCompanyError('This alumni has no listed companies. They cannot provide referrals.');
    } catch { setCompanyError('Could not load company list for this alumni.'); }
    finally { setLoadingCompanies(false); }
  };

  const handleRequest = async () => {
    if (!form.alumni_id || !form.company || !form.job_title) { toast('Alumni, company and job title are required', 'error'); return; }
    setSaving(true);
    try {
      await requestReferral({ alumni_id: parseInt(form.alumni_id), company: form.company, job_title: form.job_title, message: form.message });
      toast('Referral request sent ✓', 'success');
      setFormOpen(false); setForm({ alumni_id: '', company: '', job_title: '', message: '' }); setCompanies([]); load();
    } catch (err) { toast(err.response?.data?.message || 'Request failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleClose = () => { setFormOpen(false); setForm({ alumni_id: '', company: '', job_title: '', message: '' }); setCompanies([]); setCompanyError(''); };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#2563EB" />
      <div className="main-content">
        <PortalNavbar title="Referrals" userKey="user" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', margin: 0 }}>Referrals</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Request alumni referrals · {referrals.length} sent</p>
          </div>
          <button className="btn btn-primary" style={{ background: '#2563EB' }} onClick={() => setFormOpen(true)} disabled={alumni.length === 0}>
            <Icon name="plus" size={14} color="#fff" /> Request Referral
          </button>
        </div>

        {loading ? <Loading /> : referrals.length === 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <EmptyState icon="referrals" title="No referral requests yet" sub="Request a referral from alumni working at companies you'd like to join"
              action={<button className="btn btn-primary btn-sm" style={{ background: '#2563EB' }} onClick={() => setFormOpen(true)} disabled={alumni.length === 0}><Icon name="plus" size={13} color="#fff" /> Request Your First Referral</button>} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {referrals.map(r => (
              <div key={r.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="briefcase" size={20} color="#2563EB" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.job_title || r.position || '—'} at {r.company || '—'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Requested from <strong>{r.alumni_name || '—'}</strong></div>
                  {r.message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{r.message}"</div>}
                  {r.response && <div style={{ fontSize: 12.5, color: 'var(--success)', marginTop: 4 }}>Alumni said: "{r.response}"</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <StatusBadge status={r.status} />
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{fmt(r.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {formOpen && (
          <ModalShell title="Request a Referral" subtitle="Only companies where the alumni has worked are shown" onClose={handleClose}
            footer={<><CancelBtn onClick={handleClose} /><PrimaryBtn label="Send Request" onClick={handleRequest} saving={saving} color="#2563EB" disabled={!form.company || !form.job_title} /></>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>1. Select Alumni * <span style={{ fontWeight: 400, textTransform: 'none', color: '#9CA3AF', fontSize: 11 }}>(connected only)</span></div>
                <select value={form.alumni_id} onChange={e => handleAlumniChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }}>
                  <option value="">— Choose an alumni —</option>
                  {alumni.map(a => <option key={a.id} value={a.id}>{a.full_name}{a.company ? ` (${a.company})` : ''}</option>)}
                </select>
              </div>

              {form.alumni_id && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    2. Company *
                    {companies.length > 0 && <span style={{ marginLeft: 6, background: '#DCFCE7', color: '#16A34A', padding: '1px 7px', borderRadius: 20, fontSize: 10, textTransform: 'none' }}>{companies.length} valid</span>}
                  </div>
                  {loadingCompanies ? (
                    <div style={{ fontSize: 13, color: '#6B7280' }}>Loading valid companies…</div>
                  ) : companyError ? (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>⚠ {companyError}</div>
                  ) : (
                    <>
                      <select value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }}>
                        <option value="">— Select company —</option>
                        {companies.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                      <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 4 }}>Only companies where this alumni has worked (current or previous).</div>
                    </>
                  )}
                </div>
              )}

              {form.company && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>3. Job Title *</div>
                  <input value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} placeholder="e.g. Software Engineer…"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              )}

              {form.job_title && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Message (optional)</div>
                  <textarea rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Introduce yourself…"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#111827' }} />
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </div>
    </div>
  );
}
