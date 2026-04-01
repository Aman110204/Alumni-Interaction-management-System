import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getAdminAnnouncements, createAdminAnnouncement, deleteAdminAnnouncement } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar, StatusBadge, EmptyState as DSEmpty } from '../design/components';
import { AUTH_COLLEGE_OPTIONS } from '../constants/collegeOptions';
import { filterTenantScoped, getCollegeName, getCurrentTenant } from '../utils/tenant';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TARGETS = [
  { value: 'all',     label: 'Everyone' },
  { value: 'student', label: 'Students only' },
  { value: 'alumni',  label: 'Alumni only' },
];

export default function Announcements() {
  const toast = useToast();
  const currentTenant = getCurrentTenant();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState({ open: false });
  const [form,     setForm]     = useState({
    title: '',
    description: '',
    target_role: 'all',
    scope: 'college',
    target_colleges: [],
    target_departments: [],
    target_batches: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminAnnouncements({ limit: 50 });
      const d = r.data?.data || r.data;
      setItems(filterTenantScoped(d.announcements || d || [], currentTenant));
    } catch { toast('Failed to load announcements', 'error'); }
    finally { setLoading(false); }
  }, [currentTenant]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast('Title and description are required', 'error'); return;
    }
    setSaving(true);
    try {
      await createAdminAnnouncement({
        ...form,
        target_colleges: form.scope === 'targeted' ? form.target_colleges : [],
        target_departments: form.scope === 'targeted' ? form.target_departments : [],
        target_batches: form.scope === 'targeted' ? form.target_batches.map(v => parseInt(v, 10)).filter(Boolean) : [],
      });
      toast('Announcement posted ✓');
      setFormOpen(false);
      setForm({ title: '', description: '', target_role: 'all', scope: 'college', target_colleges: [], target_departments: [], target_batches: [] });
      load();
    } catch (err) { toast(err.response?.data?.message || 'Failed to post', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (item) =>
    setConfirm({ open: true, item, message: `Delete "${item.title}"? This cannot be undone.` });

  const executeDelete = async () => {
    const { item } = confirm;
    setConfirm(p => ({ ...p, open: false }));
    try {
      await deleteAdminAnnouncement(item.id);
      toast('Announcement deleted');
      load();
    } catch { toast('Delete failed', 'error'); }
  };

  const targetLabel = (r) => TARGETS.find(t => t.value === r)?.label || r;
  const scopeLabel = (item) => item.is_global ? 'Global' : (item.target_colleges?.length ? 'Targeted' : 'College');
  const toggleTargetCollege = (collegeId) => {
    setForm(prev => ({
      ...prev,
      target_colleges: prev.target_colleges.includes(collegeId)
        ? prev.target_colleges.filter(id => id !== collegeId)
        : [...prev.target_colleges, collegeId],
    }));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Announcements" />

        <div className="page-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="section-title">Announcements</div>
            <div className="section-sub">Post updates visible on student &amp; alumni dashboards</div>
          </div>
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>+ New Announcement</button>
        </div>

        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="📢" title="No announcements yet" subtitle="Click 'New Announcement' to post one" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 800 }}>
            {items.map(item => (
              <div key={item.id} className="chart-card" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 22 }}>📢</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</span>
                      <span className={`badge ${item.target_role === 'all' ? 'badge-green' : 'badge-amber'}`}>
                        {targetLabel(item.target_role)}
                      </span>
                      <span className="badge badge-blue">{scopeLabel(item)}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{item.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      Posted by <strong>{item.posted_by || 'Admin'}</strong> · {fmtDate(item.created_at)}
                    </div>
                    {item.target_colleges?.length > 0 && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                        {item.target_colleges.map(collegeId => (
                          <span key={collegeId} className="badge badge-gray">{getCollegeName(collegeId)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal open={formOpen} title="New Announcement" onClose={() => setFormOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Campus Recruitment Drive 2025" />
            </div>
            <div>
              <label className="form-label">Description *</label>
              <textarea className="form-input" rows={4} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Announcement details…" style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="form-label">Visible to</label>
              <select className="filter-select" value={form.target_role}
                onChange={e => setForm(p => ({ ...p, target_role: e.target.value }))}>
                {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Scope</label>
              <select className="filter-select" value={form.scope}
                onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}>
                <option value="college">College only</option>
                <option value="global">Global</option>
                <option value="targeted">Targeted</option>
              </select>
            </div>
            {form.scope === 'targeted' && (
              <>
                <div>
                  <label className="form-label">Target Colleges</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {AUTH_COLLEGE_OPTIONS.map(college => (
                      <button
                        key={college.id}
                        type="button"
                        className={`btn ${form.target_colleges.includes(college.id) ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => toggleTargetCollege(college.id)}
                      >
                        {college.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Target Departments</label>
                  <input
                    className="form-input"
                    placeholder="Comma separated, e.g. CSE, ISE"
                    value={form.target_departments.join(', ')}
                    onChange={e => setForm(p => ({ ...p, target_departments: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))}
                  />
                </div>
                <div>
                  <label className="form-label">Target Batches</label>
                  <input
                    className="form-input"
                    placeholder="Comma separated, e.g. 2025, 2026"
                    value={form.target_batches.join(', ')}
                    onChange={e => setForm(p => ({ ...p, target_batches: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))}
                  />
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Posting…' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </Modal>

        <ConfirmModal
          open={confirm.open}
          title="Delete Announcement"
          message={confirm.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
          danger
        />
      </div>
    </div>
  );
}
