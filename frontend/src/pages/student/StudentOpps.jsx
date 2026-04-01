import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { listOpportunities } from '../../services/api';
import Icon from '../../design/icons';
import { ModalShell, EmptyState, Chip } from '../../design/components';
import { STUDENT_NAV } from './_nav';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
const JOB_COLORS = { 'Full-time':'#2563EB','Part-time':'#7C3AED','Contract':'#D97706','Freelance':'#6B7280' };

export default function StudentOpps() {
  const toast = useToast();
  const [opps,      setOpps]      = useState([]);
  const [detail,    setDetail]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listOpportunities({ limit:50 });
      const d = r.data?.data || r.data;
      // Filter out internships — they have their own page
      const all = (d.opportunities || d || []);
      setOpps(all.filter(o => o.job_type !== 'Internship'));
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = opps.filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q || (o.title||'').toLowerCase().includes(q) || (o.company||'').toLowerCase().includes(q);
    const matchT = !typeFilter || o.job_type === typeFilter;
    return matchQ && matchT;
  });

  const jobTypes = [...new Set(opps.map(o => o.job_type).filter(Boolean))];

  // When Apply Now is clicked, redirect to the apply_link if present
  const handleApply = (opp) => {
    if (opp.apply_link) {
      window.open(opp.apply_link, '_blank', 'noreferrer');
    } else {
      toast('No external application link provided for this job', 'info');
    }
  };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#2563EB" />
      <div className="main-content">
        <PortalNavbar title="Opportunities" userKey="user" />
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Job Opportunities</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Opportunities posted by alumni — {opps.length} available</p>
        </div>

        <div className="toolbar" style={{ marginBottom:18 }}>
          <div className="search-wrap" style={{ flex:1 }}>
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" placeholder="Search by title or company…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {jobTypes.length > 0 && (
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {loading ? <Loading /> : filtered.length === 0 ? (
          <div className="card" style={{ padding:0 }}><EmptyState icon="opportunities" title="No opportunities found" sub="Check back later or refine your search" /></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(opp => {
              const jc = JOB_COLORS[opp.job_type] || '#6B7280';
              return (
                <div key={opp.id} className="card" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="opportunities" size={20} color="#2563EB" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{opp.title}</div>
                      <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
                        {opp.company}{opp.location ? ' · ' + opp.location : ''}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:8 }}>
                        {opp.job_type && <span style={{ fontSize:11.5, padding:'2px 9px', borderRadius:20, background:`${jc}15`, color:jc, fontWeight:600 }}>{opp.job_type}</span>}
                        {opp.openings_count > 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>👥 {opp.openings_count} opening{opp.openings_count > 1 ? 's' : ''}</span>}
                        {opp.salary   && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{opp.salary}</span>}
                        {opp.deadline && <span style={{ fontSize:12, color:'var(--text-faint)' }}>Deadline: {fmt(opp.deadline)}</span>}
                        {opp.posted_by_name && <span style={{ fontSize:12, color:'var(--text-faint)' }}>by {opp.posted_by_name}</span>}
                      </div>
                      {opp.description && <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:8, lineHeight:1.5 }}>{opp.description.slice(0,130)}{opp.description.length > 130 ? '…' : ''}</p>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-lite)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetail(opp)}>View Details</button>
                    <button className="btn btn-primary btn-sm" style={{ background:'#2563EB' }} onClick={() => handleApply(opp)}>
                      <Icon name="referrals" size={12} color="#fff" /> Apply Now ↗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {detail && (
          <ModalShell title="Opportunity Details" onClose={() => setDetail(null)} maxWidth={560}
            footer={<>
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-primary" style={{ background:'#2563EB' }} onClick={() => { handleApply(detail); setDetail(null); }}>Apply Now ↗</button>
            </>}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:4, color:'var(--text)' }}>{detail.title}</div>
              <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:16 }}>{detail.company}{detail.location ? ' · ' + detail.location : ''}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[
                  ['Job Type', detail.job_type],
                  ['Salary', detail.salary],
                  ['Openings', detail.openings_count ? `${detail.openings_count} position${detail.openings_count > 1 ? 's' : ''}` : null],
                  ['Posted By', detail.posted_by_name],
                  ['Deadline', detail.deadline ? fmt(detail.deadline) : null],
                ].filter(([,v]) => v).map(([l,v]) => (
                  <div key={l}><div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{l}</div><div style={{ fontSize:13.5, color:'var(--text)' }}>{v}</div></div>
                ))}
              </div>
              {detail.apply_link && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Apply Link</div>
                  <a href={detail.apply_link} target="_blank" rel="noreferrer" style={{ color:'var(--info)', fontSize:13.5 }}>Apply Here ↗</a>
                </div>
              )}
              {detail.description && <div style={{ marginBottom:12 }}><div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Description</div><p style={{ fontSize:13.5, lineHeight:1.6, color:'var(--text-2)' }}>{detail.description}</p></div>}
              {detail.skills_required && <div><div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Skills Required</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{detail.skills_required.split(',').map(s => s.trim()).filter(Boolean).map(s => <Chip key={s} label={s} variant="skill" />)}</div></div>}
            </div>
          </ModalShell>
        )}
      </div>
    </div>
  );
}
