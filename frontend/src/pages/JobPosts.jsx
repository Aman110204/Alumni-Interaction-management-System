import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getOpportunities, updateOpportunityStatus, deleteOpportunity } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar, StatusBadge, EmptyState as DSEmpty } from '../design/components';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function JobPosts() {
  const toast = useToast();
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [detail,  setDetail]  = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmState, setConfirm]  = useState({ open: false });
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch jobs — either type='job' or all opportunities used as jobs
      const params = { page, limit: LIMIT, search: search || undefined, opportunity_type: 'job' };
      const r = await getOpportunities(params);
      const d = r.data?.data || r.data;
      let list = d.opportunities || d.data || d || [];
      // Fallback: if no type filter worked, just show all
      if (!list.length) {
        const r2 = await getOpportunities({ page, limit: LIMIT, search: search || undefined });
        const d2 = r2.data?.data || r2.data;
        list = d2.opportunities || d2.data || d2 || [];
      }
      setJobs(list);
      setTotal(d.total || d.count || list.length);
    } catch { toast('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleView   = (job) => { setDetail(job); setDetailOpen(true); };
  const handleDelete = (job) => setConfirm({ open: true, item: job, message: `Delete job posting "${job.title}"? This cannot be undone.` });

  const executeDelete = async () => {
    const { item } = confirmState;
    setConfirm(p => ({ ...p, open: false }));
    try { await deleteOpportunity(item.id); toast('Job post deleted'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Delete failed', 'error'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Job Posts" />

        <div className="page-title">
          <div className="section-title">Job Posts</div>
          <div className="section-sub">{total} job listings</div>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" style={{ paddingLeft:36 }} placeholder="Search job postings…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={load}>↺ Refresh</button>
        </div>

        {loading ? <Loading /> : jobs.length === 0 ? (
          <div className="table-wrapper"><EmptyState icon="💼" title="No job posts found" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Job Title</th><th>Company</th><th>Posted By</th><th>Location</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={job.id}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{(page-1)*LIMIT+i+1}</td>
                    <td style={{ fontWeight:600 }}>{job.title}</td>
                    <td style={{ color:'var(--text-muted)' }}>{job.company_name || job.company || '—'}</td>
                    <td style={{ color:'var(--text-muted)' }}>{job.alumni_name || job.posted_by || '—'}</td>
                    <td>{job.location || '—'}</td>
                    <td>
                      <span className={`badge ${job.status==='open'?'badge-green':job.status==='closed'?'badge-gray':'badge-amber'}`}>
                        {job.status || 'open'}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtDate(job.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleView(job)}>View</button>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(job)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderTop:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Page {page} of {pages}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹ Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>p+1)} disabled={page>=pages}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        )}

        <Modal open={detailOpen} title="Job Details" onClose={() => setDetailOpen(false)} lg>
          {detail && (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>{detail.title}</div>
                <span className="badge badge-blue">{detail.opportunity_type || 'job'}</span>
              </div>
              <div className="profile-grid">
                {[
                  ['Company',   detail.company_name || detail.company],
                  ['Location',  detail.location],
                  ['Posted By', detail.alumni_name || detail.posted_by],
                  ['Salary',    detail.salary_range || detail.salary],
                  ['Deadline',  fmtDate(detail.application_deadline)],
                  ['Posted',    fmtDate(detail.created_at)],
                ].filter(([,v])=>v).map(([l,v]) => (
                  <div key={l} className="profile-field">
                    <div className="profile-field-label">{l}</div>
                    <div className="profile-field-value">{v}</div>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div style={{ marginTop:16 }}>
                  <div className="profile-field-label">Description</div>
                  <div style={{ fontSize:13.5, lineHeight:1.6 }}>{detail.description}</div>
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmModal
          open={confirmState.open}
          title="Delete Job Post"
          message={confirmState.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      </div>
    </div>
  );
}
