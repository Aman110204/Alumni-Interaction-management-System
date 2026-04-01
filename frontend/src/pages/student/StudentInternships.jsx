import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { listOpportunities } from '../../services/api';
import Icon from '../../design/icons';
import { ModalShell, EmptyState, Chip } from '../../design/components';
import { STUDENT_NAV } from './_nav';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STUDENT_ACCENT = '#2563EB';
const STUDENT_ACCENT_BG = '#EFF6FF';

export default function StudentInternships() {
  const toast = useToast();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listOpportunities({ limit: 50, job_type: 'Internship' });
      const d = r.data?.data || r.data;
      setInterns((d.opportunities || d || []).filter(o => o.job_type === 'Internship'));
    } catch {
      toast('Failed to load internships', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = interns.filter(o => {
    const q = search.toLowerCase();
    return !q || (o.title || '').toLowerCase().includes(q) || (o.company || '').toLowerCase().includes(q);
  });

  const handleApply = (opp) => {
    if (opp.apply_link) {
      window.open(opp.apply_link, '_blank', 'noreferrer');
    } else {
      toast('No application link provided for this internship', 'info');
    }
  };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor={STUDENT_ACCENT} />
      <div className="main-content">
        <PortalNavbar title="Internships" userKey="user" />
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', margin: 0 }}>Internships</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Internship opportunities posted by alumni - {interns.length} available</p>
        </div>

        <div className="toolbar" style={{ marginBottom: 18 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" placeholder="Search by title or company..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <Loading /> : filtered.length === 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <EmptyState icon="opportunities" title="No internships found" sub="Check back later - alumni post new internships regularly" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(opp => (
              <div key={opp.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: STUDENT_ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="opportunities" size={20} color={STUDENT_ACCENT} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{opp.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{opp.company}{opp.location ? ' · ' + opp.location : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                      <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 20, background: STUDENT_ACCENT_BG, color: STUDENT_ACCENT, fontWeight: 600 }}>Internship</span>
                      {opp.openings_count > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Openings: {opp.openings_count}</span>}
                      {opp.salary && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opp.salary}</span>}
                      {opp.deadline && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Deadline: {fmt(opp.deadline)}</span>}
                      {opp.posted_by_name && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>by {opp.posted_by_name}</span>}
                    </div>
                    {opp.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>{opp.description.slice(0, 130)}{opp.description.length > 130 ? '...' : ''}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-lite)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDetail(opp)}>View Details</button>
                  <button className="btn btn-primary btn-sm" style={{ background: STUDENT_ACCENT }} onClick={() => handleApply(opp)}>
                    <Icon name="referrals" size={12} color="#fff" /> Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {detail && (
          <ModalShell
            title="Internship Details"
            onClose={() => setDetail(null)}
            maxWidth={560}
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
                <button className="btn btn-primary" style={{ background: STUDENT_ACCENT }} onClick={() => { handleApply(detail); setDetail(null); }}>
                  Apply Now ->
                </button>
              </>
            }
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{detail.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{detail.company}{detail.location ? ' · ' + detail.location : ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['Type', 'Internship'],
                  ['Stipend', detail.salary],
                  ['Openings', detail.openings_count ? `${detail.openings_count} position${detail.openings_count > 1 ? 's' : ''}` : null],
                  ['Posted By', detail.posted_by_name],
                  ['Deadline', detail.deadline ? fmt(detail.deadline) : null],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {detail.apply_link && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Apply Link</div>
                  <a href={detail.apply_link} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontSize: 13.5 }}>Apply Here</a>
                </div>
              )}
              {detail.description && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Description</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)' }}>{detail.description}</p>
                </div>
              )}
              {detail.skills_required && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Skills Required</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detail.skills_required.split(',').map(s => s.trim()).filter(Boolean).map(s => <Chip key={s} label={s} variant="skill" />)}
                  </div>
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </div>
    </div>
  );
}
