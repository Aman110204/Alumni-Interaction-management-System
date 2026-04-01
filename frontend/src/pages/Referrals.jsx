import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getReferrals } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar } from '../design/components';
import { filterTenantScoped, getCurrentTenant, normalizeCollegeId } from '../utils/tenant';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
  const map = { pending: 'badge-amber', accepted: 'badge-green', approved: 'badge-green', rejected: 'badge-red', completed: 'badge-blue' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status || 'pending'}</span>;
}

export default function Referrals() {
  const toast = useToast();
  const currentTenant = getCurrentTenant();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [detail,  setDetail]  = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmState, setConfirm]  = useState({ open: false });
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filter !== 'all') params.status = filter;
      const r = await getReferrals(params);
      const d = r.data?.data || r.data;
      const raw = d.referrals || d.requests || d.data || d || [];
      // CRITICAL: Filter to current tenant before rendering
      const list = filterTenantScoped(Array.isArray(raw) ? raw : [], currentTenant);
      setItems(list);
      setTotal(list.length);
    } catch { toast('Failed to load referrals', 'error'); }
    finally { setLoading(false); }
  }, [page, filter, currentTenant]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const handleView   = (item) => { setDetail(item); setDetailOpen(true); };
  const handleDelete = (item) => setConfirm({ open: true, item, message: `Delete this referral request from ${item.student_name || 'student'}? This cannot be undone.` });

  const executeDelete = async () => {
    const { item } = confirmState;
    setConfirm(p => ({ ...p, open: false }));
    try {
      await api.delete(`/admin/referrals/${item.id}`).catch(() =>
        api.delete(`/referral/request/${item.id}`)
      );
      toast('Referral deleted');
      load();
    } catch (err) { toast(err.response?.data?.message || 'Delete failed', 'error'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Referrals" />

        <div className="page-title">
          <div className="section-title">Referral Requests</div>
          <div className="section-sub">{total} total referral requests</div>
        </div>

        <div className="toolbar">
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
          <button className="btn btn-secondary" onClick={load}>↺ Refresh</button>
        </div>

        {loading ? <Loading /> : items.length === 0 ? (
          <div className="table-wrapper"><EmptyState icon="🔗" title="No referral requests found" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Student</th><th>Alumni</th><th>Company</th><th>Position</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{(page-1)*LIMIT+i+1}</td>
                    <td style={{ fontWeight:600 }}>{item.student_name || item.student?.full_name || '—'}</td>
                    <td style={{ color:'var(--text-muted)' }}>{item.alumni_name || item.alumni?.full_name || '—'}</td>
                    <td>{item.company_name || item.company || '—'}</td>
                    <td>{item.position || item.job_title || '—'}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtDate(item.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleView(item)}>View</button>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item)}>Delete</button>
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

        <Modal open={detailOpen} title="Referral Details" onClose={() => setDetailOpen(false)} lg>
          {detail && (
            <div>
              <div className="profile-grid">
                {[
                  ['Student',        detail.student_name || detail.student?.full_name],
                  ['Alumni',         detail.alumni_name || detail.alumni?.full_name],
                  ['Company',        detail.company_name || detail.company],
                  ['Position',       detail.position || detail.job_title],
                  ['Status',         detail.status],
                  ['Requested On',   fmtDate(detail.created_at)],
                  ['Updated',        fmtDate(detail.updated_at)],
                ].filter(([,v])=>v).map(([l,v]) => (
                  <div key={l} className="profile-field">
                    <div className="profile-field-label">{l}</div>
                    <div className="profile-field-value">{v}</div>
                  </div>
                ))}
              </div>
              {detail.message && (
                <div style={{ marginTop:16 }}>
                  <div className="profile-field-label">Message</div>
                  <div style={{ fontSize:13.5, lineHeight:1.6 }}>{detail.message}</div>
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmModal
          open={confirmState.open}
          title="Delete Referral"
          message={confirmState.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      </div>
    </div>
  );
}
