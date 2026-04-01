import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getOpportunities, updateOpportunityStatus, deleteOpportunity } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar } from '../design/components';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
  const map = { open: 'badge-green', closed: 'badge-gray', pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status || 'unknown'}</span>;
}

export default function Opportunities() {
  const toast = useToast();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [detail,  setDetail]  = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmState, setConfirm] = useState({ open: false });
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: search || undefined };
      if (filter !== 'all') params.status = filter;
      const r = await getOpportunities(params);
      const d = r.data?.data || r.data;
      setItems(d.opportunities || d.data || d || []);
      setTotal(d.total || d.count || 0);
    } catch { toast('Failed to load opportunities', 'error'); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const handleView = (item) => { setDetail(item); setDetailOpen(true); };
  const handleStatusChange = (item, status) =>
    setConfirm({ open: true, action: 'status', item, status, message: `Change status of "${item.title}" to "${status}"?` });
  const handleDelete = (item) =>
    setConfirm({ open: true, action: 'delete', item, message: `Delete "${item.title}"? This cannot be undone.` });

  const execute = async () => {
    const { action, item, status } = confirmState;
    setConfirm(p => ({ ...p, open: false }));
    try {
      if (action === 'status') { await updateOpportunityStatus(item.id, status); toast(`Status updated to "${status}" ✓`); }
      if (action === 'delete') { await deleteOpportunity(item.id); toast('Opportunity deleted'); }
      load();
    } catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Opportunities" />

        <div className="page-title">
          <div className="section-title">Manage Opportunities</div>
          <div className="section-sub">{total} total opportunities</div>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" style={{ paddingLeft: 36 }} placeholder="Search opportunities…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
          <button className="btn btn-secondary" onClick={load}>↺ Refresh</button>
        </div>

        {loading ? <Loading /> : items.length === 0 ? (
          <div className="table-wrapper"><EmptyState icon="🚀" title="No opportunities found" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Title</th><th>Posted By</th><th>Type</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page-1)*LIMIT+i+1}</td>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.alumni_name || item.posted_by || '—'}</td>
                    <td><span className="badge badge-blue">{item.opportunity_type || item.type || 'job'}</span></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleView(item)}>View</button>
                        {item.status !== 'open'   && <button className="btn btn-success btn-xs" onClick={() => handleStatusChange(item, 'open')}>Open</button>}
                        {item.status !== 'closed' && <button className="btn btn-warning btn-xs" onClick={() => handleStatusChange(item, 'closed')}>Close</button>}
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {pages}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p=>p-1)} disabled={page===1}>‹ Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p=>p+1)} disabled={page>=pages}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        )}

        <Modal open={detailOpen} title="Opportunity Details" onClose={() => setDetailOpen(false)} lg>
          {detail && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{detail.title}</div>
                <StatusBadge status={detail.status} />
              </div>
              <div className="profile-grid">
                {[
                  ['Type',        detail.opportunity_type || detail.type],
                  ['Posted By',   detail.alumni_name || detail.posted_by],
                  ['Company',     detail.company_name || detail.company],
                  ['Location',    detail.location],
                  ['Salary',      detail.salary_range || detail.salary],
                  ['Deadline',    fmtDate(detail.application_deadline || detail.deadline)],
                  ['Posted',      fmtDate(detail.created_at)],
                  ['Apply Link',  detail.apply_link || detail.application_link],
                ].filter(([,v])=>v).map(([l,v]) => (
                  <div key={l} className="profile-field">
                    <div className="profile-field-label">{l}</div>
                    <div className="profile-field-value">{v}</div>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div style={{ marginTop: 16 }}>
                  <div className="profile-field-label">Description</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{detail.description}</div>
                </div>
              )}
              {detail.requirements && (
                <div style={{ marginTop: 12 }}>
                  <div className="profile-field-label">Requirements</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{detail.requirements}</div>
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmModal
          open={confirmState.open}
          title="Confirm Action"
          message={confirmState.message}
          onConfirm={execute}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
          danger={confirmState.action === 'delete'}
        />
      </div>
    </div>
  );
}
