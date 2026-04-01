import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast, ConfirmModal } from '../../components/MessageBox';
import { getAlumniPostedOpps, createAlumniOpportunity, updateAlumniOpportunity, deleteAlumniOpportunity } from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import Icon from '../../design/icons';
import { ModalShell, Field, PrimaryBtn, CancelBtn, GhostBtn, EmptyState, StatusBadge } from '../../design/components';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance'];
const INTERN_TYPE = 'Internship';
const EMPTY_JOB = {
  title: '',
  company: '',
  location: '',
  job_type: 'Full-time',
  salary: '',
  description: '',
  skills_required: '',
  apply_link: '',
  deadline: '',
  openings_count: 1,
};
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

function OppCard({ opp, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="opportunities" size={18} color="#7C3AED" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{opp.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{opp.company}{opp.location ? ` · ${opp.location}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 48 }}>
            {opp.job_type && <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', fontWeight: 600 }}>{opp.job_type}</span>}
            {opp.openings_count > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Openings: {opp.openings_count}</span>}
            {opp.salary && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opp.salary}</span>}
            {opp.deadline && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deadline: {fmt(opp.deadline)}</span>}
            <StatusBadge status={opp.status || 'open'} />
          </div>
          {opp.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, marginLeft: 48 }}>{opp.description.slice(0, 140)}{opp.description.length > 140 ? '...' : ''}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <GhostBtn icon="edit" onClick={() => onEdit(opp)} title="Edit" />
          <GhostBtn icon="trash" onClick={() => onDelete(opp)} color="#EF4444" title="Delete" />
        </div>
      </div>
    </div>
  );
}

function OppForm({ form, setForm, errors }) {
  const inp = k => ({
    value: form[k] || '',
    onChange: e => setForm(p => ({ ...p, [k]: e.target.value })),
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Job Title *" {...inp('title')} placeholder="Software Engineer" autoFocus />
      {errors.title && <div className="form-error" style={{ gridColumn: '1/-1', marginTop: -10 }}>{errors.title}</div>}
      <Field label="Company *" {...inp('company')} placeholder="Google" />
      {errors.company && <div className="form-error" style={{ gridColumn: '1/-1', marginTop: -10 }}>{errors.company}</div>}
      <Field label="Location" {...inp('location')} placeholder="Bangalore / Remote" />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Job Type</div>
        <select
          value={form.job_type}
          onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }}
        >
          {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>No. of Openings</div>
        <input
          type="number"
          min="1"
          max="999"
          value={form.openings_count || 1}
          onChange={e => setForm(p => ({ ...p, openings_count: parseInt(e.target.value, 10) || 1 }))}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }}
        />
      </div>
      <Field label="Salary / Package" {...inp('salary')} placeholder="8-12 LPA" />
      {errors.salary && <div className="form-error" style={{ gridColumn: '1/-1', marginTop: -10 }}>{errors.salary}</div>}
      <Field label="Application Deadline" type="date" {...inp('deadline')} />
      {errors.deadline && <div className="form-error" style={{ gridColumn: '1/-1', marginTop: -10 }}>{errors.deadline}</div>}
      <Field label="Apply Link" type="url" {...inp('apply_link')} placeholder="company.com/jobs" />
      {errors.apply_link && <div className="form-error" style={{ gridColumn: '1/-1', marginTop: -10 }}>{errors.apply_link}</div>}
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Description" type="textarea" {...inp('description')} placeholder="Describe the role and responsibilities..." />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Skills Required *" {...inp('skills_required')} placeholder="React, Node.js, SQL..." />
        {errors.skills_required && <div className="form-error">{errors.skills_required}</div>}
      </div>
    </div>
  );
}

export default function AlumniOpps() {
  const toast = useToast();
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_JOB);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAlumniPostedOpps();
      const d = r.data?.data || r.data;
      const all = Array.isArray(d) ? d : (d?.opportunities || []);
      setOpps(all.filter(o => o.job_type !== INTERN_TYPE));
    } catch {
      toast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_JOB });
    setEditId(null);
    setErrors({});
    setOpen(true);
  };

  const openEdit = opp => {
    setForm({
      title: opp.title || '',
      company: opp.company || '',
      location: opp.location || '',
      job_type: opp.job_type || 'Full-time',
      salary: opp.salary || '',
      description: opp.description || '',
      skills_required: opp.skills_required || '',
      apply_link: opp.apply_link || '',
      deadline: opp.deadline ? opp.deadline.split('T')[0] : '',
      status: opp.status || 'active',
      openings_count: opp.openings_count || 1,
    });
    setEditId(opp.id);
    setErrors({});
    setOpen(true);
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = 'Job title is required';
    if (!form.company?.trim()) newErrors.company = 'Company name is required';

    let apply_link = form.apply_link?.trim() || '';
    if (apply_link && !apply_link.match(/^https?:\/\//i)) {
      apply_link = `https://${apply_link}`;
      setForm(p => ({ ...p, apply_link }));
    }
    if (apply_link) {
      try {
        new URL(apply_link);
      } catch {
        newErrors.apply_link = 'Enter a valid URL';
      }
    }
    if (form.deadline && new Date(form.deadline) < new Date()) newErrors.deadline = 'Deadline cannot be in the past';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast('Please fix the highlighted fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, apply_link, job_type: form.job_type };
      if (editId) await updateAlumniOpportunity(editId, payload);
      else await createAlumniOpportunity(payload);
      toast(editId ? 'Updated' : 'Posted', 'success');
      setOpen(false);
      setEditId(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user" loginPath="/alumni/login" portalLabel="Alumni" accentColor="#7C3AED" />
      <div className="main-content">
        <PortalNavbar title="Job Posts" userKey="alumni_user" />

        {loading ? <Loading /> : (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Job Posts</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opps.length} posted</p>
              </div>
              <button className="btn btn-primary" style={{ background: '#7C3AED', fontSize: 13 }} onClick={openCreate}>
                <Icon name="plus" size={13} color="#fff" /> Post a Job
              </button>
            </div>

            {opps.length === 0 ? (
              <div className="card" style={{ padding: 0 }}>
                <EmptyState
                  icon="opportunities"
                  title="No job posts yet"
                  sub="Post full-time, part-time or contract roles"
                  action={<button className="btn btn-primary" style={{ background: '#7C3AED' }} onClick={openCreate}><Icon name="plus" size={13} color="#fff" /> Post Job</button>}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {opps.map(opp => (
                  <OppCard
                    key={opp.id}
                    opp={opp}
                    onEdit={openEdit}
                    onDelete={item => setConfirm({ open: true, item, message: `Delete "${item.title}"?` })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {open && (
          <ModalShell
            title={editId ? 'Edit Job' : 'Post a Job'}
            onClose={() => { setOpen(false); setEditId(null); }}
            maxWidth={620}
            footer={<><CancelBtn onClick={() => { setOpen(false); setEditId(null); }} /><PrimaryBtn label={editId ? 'Save Changes' : 'Post Job'} onClick={handleSave} saving={saving} color="#7C3AED" /></>}
          >
            <OppForm form={form} setForm={setForm} errors={errors} />
          </ModalShell>
        )}

        <ConfirmModal
          open={confirm.open}
          title="Delete Opportunity"
          message={confirm.message}
          onConfirm={async () => {
            const id = confirm.item?.id;
            setConfirm(p => ({ ...p, open: false }));
            try {
              await deleteAlumniOpportunity(id);
              toast('Deleted');
              load();
            } catch {
              toast('Delete failed', 'error');
            }
          }}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      </div>
    </div>
  );
}
