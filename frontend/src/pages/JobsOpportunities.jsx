import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getOpportunities, updateOpportunityStatus, deleteOpportunity } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar } from '../design/components';
import { filterTenantScoped, getCurrentTenant } from '../utils/tenant';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
  const map = { active: 'badge-green', open: 'badge-green', closed: 'badge-gray', pending: 'badge-amber' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status || 'unknown'}</span>;
}

export default function JobsOpportunities() {
  const toast = useToast();
  const currentTenant = getCurrentTenant();
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCo,     setFilterCo]     = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [filterLoc,    setFilterLoc]    = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [detail,       setDetail]       = useState(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [confirm,      setConfirm]      = useState({ open: false });
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: search || undefined };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCo)   params.company  = filterCo;
      if (filterRole) params.role     = filterRole;
      if (filterLoc)  params.location = filterLoc;
      const r = await getOpportunities(params);
      const d = r.data?.data || r.data;
      // CRITICAL: Filter to current tenant before rendering
      const raw = d.opportunities || d.data || d || [];
      setItems(filterTenantScoped(Array.isArray(raw) ? raw : [], currentTenant));
      setTotal(d.total || d.count || 0);
    } catch { toast('Failed to load jobs/opportunities', 'error'); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterCo, filterRole, filterLoc]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterCo, filterRole, filterLoc]);

  const handleView   = (item) => { setDetail(item); setDetailOpen(true); };
  const handleStatus = (item, status) =>
    setConfirm({ open: true, action: 'status', item, status, message: `Change status of "${item.title}" to "${status}"?` });
  const handleDelete = (item) =>
    setConfirm({ open: true, action: 'delete', item, message: `Delete "${item.title}"? This cannot be undone.` });

  const execute = async () => {
    const { action, item, status } = confirm;
    setConfirm(p => ({ ...p, open: false }));
    try {
      if (action === 'status') { await updateOpportunityStatus(item.id, status === 'open' ? 'active' : status); toast('Status updated ✓'); }
      if (action === 'delete') { await deleteOpportunity(item.id); toast('Listing removed'); }
      load();
    } catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Jobs & Opportunities" />

        <div className="page-title">
          <div className="section-title">Jobs &amp; Opportunities</div>
          <div className="section-sub">{total} listings posted by alumni</div>
        </div>

        {/* Filters */}
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="search-wrap" style={{ flex: '1 1 200px', minWidth: 160 }}>
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" style={{ paddingLeft: 36 }} placeholder="Search title, company…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
          <input className="filter-select" placeholder="Filter company…" value={filterCo}
            onChange={e => setFilterCo(e.target.value)} style={{ minWidth: 130 }} />
          <input className="filter-select" placeholder="Filter role…" value={filterRole}
            onChange={e => setFilterRole(e.target.value)} style={{ minWidth: 130 }} />
          <input className="filter-select" placeholder="Filter location…" value={filterLoc}
            onChange={e => setFilterLoc(e.target.value)} style={{ minWidth: 130 }} />
          <button className="btn btn-secondary" onClick={load}>↺</button>
        </div>

        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="💼" title="No listings found" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Title</th><th>Company</th><th>Location</th>
                  <th>Type</th><th>Posted By</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page-1)*LIMIT+i+1}</td>
                    <td style={{ fontWeight: 600, maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    </td>
                    <td>{item.company || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.location || '—'}</td>
                    <td><span className="badge badge-gray">{item.job_type || 'Full-time'}</span></td>
                    <td style={{ fontSize: 12 }}>{item.alumni_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.created_at)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleView(item)}>View</button>
                        {item.status !== 'active'  && <button className="btn btn-success btn-xs" onClick={() => handleStatus(item, 'active')}>Activate</button>}
                        {item.status === 'active'  && <button className="btn btn-warning btn-xs" onClick={() => handleStatus(item, 'closed')}>Close</button>}
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderTop:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Page {page} of {pages} · {total} total</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p=>p-1)} disabled={page===1}>‹ Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p=>p+1)} disabled={page>=pages}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        <Modal open={detailOpen} title="Job / Opportunity Details" onClose={() => setDetailOpen(false)} lg>
          {detail && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700 }}>{detail.title}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>{detail.company} · {detail.location || 'Remote'}</div>
                </div>
                <div style={{ marginLeft:'auto' }}><StatusBadge status={detail.status} /></div>
              </div>
              <div className="profile-grid">
                {[
                  ['Type',        detail.job_type],
                  ['Salary',      detail.salary],
                  ['Deadline',    fmtDate(detail.deadline)],
                  ['Apply Link',  detail.apply_link],
                  ['Posted By',   detail.alumni_name],
                  ['Posted Date', fmtDate(detail.created_at)],
                  ['Skills',      detail.skills_required],
                ].filter(([,v]) => v).map(([label, val]) => (
                  <div key={label} className="profile-field">
                    <div className="profile-field-label">{label}</div>
                    <div className="profile-field-value">
                      {label === 'Apply Link'
                        ? <a href={val} target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>{val}</a>
                        : val}
                    </div>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div>
                  <div className="profile-field-label">Description</div>
                  <div style={{ fontSize:13.5, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{detail.description}</div>
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmModal
          open={confirm.open}
          title={confirm.action === 'delete' ? 'Delete Listing' : 'Update Status'}
          message={confirm.message}
          onConfirm={execute}
          onCancel={() => setConfirm(p => ({ ...p, open:false }))}
          danger={confirm.action === 'delete'}
        />
      </div>
    </div>
  );
}
