import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, useToast, Modal } from '../components/MessageBox';
import { getAlumniList, approveAlumni, rejectAlumni, deleteAlumni, startConversation, getPendingAlumni, alumniRegister } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';
import Icon from '../design/icons';
import { filterTenantScoped, getCollegeName, getCurrentTenant, normalizeCollegeId } from '../utils/tenant';
import SearchBar from '../components/SearchBar';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ alumni }) {
  const s = alumni.status || ((alumni.is_approved ?? alumni.isApproved) ? 'approved' : 'pending');
  if (s === 'approved') return <span className="badge badge-green">Approved</span>;
  if (s === 'rejected') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-amber">Pending</span>;
}

export default function ManageAlumni() {
  const toast = useToast();
  const navigate = useNavigate();
  const currentTenant = getCurrentTenant();

  const [alumni,       setAlumni]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [filterOpts,   setFilterOpts]   = useState({ departments: [], companies: [], batches: [] });
  const [createOpen,   setCreateOpen]   = useState(false);
  const [createForm,   setCreateForm]   = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    department: '', graduationYear: '', company: '', designation: ''
  });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirm] = useState({ open: false });

  // Active search params
  const [activeParams, setActiveParams] = useState({
    searchField: 'all', searchQuery: '', batch: '', department: '', company: '', skills: '',
  });

  const LIMIT = 20;

  const BRANCHES = [
    "Computer Science (CSE)", "Information Science (ISE)",
    "Electronics & Communication (ECE)", "Electrical & Electronics (EEE)",
    "Mechanical Engineering", "Civil Engineering",
    "Artificial Intelligence & Machine Learning", "Data Science",
    "Robotics", "Biotechnology", "Chemical Engineering", "Aerospace Engineering"
  ];

  // Load filter options once
  useEffect(() => {
    // We use admin alumni list which is tenant-scoped; filter options from alumni/filter-options
    import('../services/api').then(({ getAlumniFilters }) => {
      getAlumniFilters().then(r => {
        const d = r.data?.data || r.data;
        setFilterOpts({ departments: d.departments || [], companies: d.companies || [], batches: d.batches || [] });
      }).catch(() => {});
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (activeParams.searchQuery) params.search = activeParams.searchQuery;
      if (tab === 'approved') params.is_approved = true;
      if (tab === 'pending')  params.is_approved = false;
      if (activeParams.company)    params.company    = activeParams.company;
      if (activeParams.department) params.department = activeParams.department;
      if (activeParams.batch)      params.graduation_year = activeParams.batch;

      const r = await getAlumniList(params);
      const d = r.data?.data || r.data;
      setAlumni(filterTenantScoped(d.alumni || d.data || d || [], currentTenant));
      setTotal(d.total || d.count || 0);
      getPendingAlumni({ limit: 1 })
        .then(pr => { const pd = pr.data?.data || pr.data; setPendingCount(pd.total || 0); })
        .catch(() => {});
    } catch {
      toast('Failed to load alumni', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeParams, tab, currentTenant]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeParams, tab]);

  const handleSearch = (params) => {
    setActiveParams(params);
    setPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.fullName?.trim())  return toast('Full name is required', 'error');
    if (!createForm.email?.trim())     return toast('Email is required', 'error');
    if (!createForm.password?.trim())  return toast('Password is required', 'error');
    if (createForm.password.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (createForm.password !== createForm.confirmPassword) return toast('Passwords do not match', 'error');
    if (!createForm.department)        return toast('Department is required', 'error');

    setSaving(true);
    try {
      await alumniRegister({
        fullName:       createForm.fullName,
        email:          createForm.email,
        password:       createForm.password,
        department:     createForm.department,
        graduationYear: createForm.graduationYear,
        company:        createForm.company,
        designation:    createForm.designation,
      });
      toast('Alumni account created successfully ✓');
      setCreateOpen(false);
      setCreateForm({ fullName:'', email:'', password:'', confirmPassword:'', department:'', graduationYear:'', company:'', designation:'' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewProfile = (a) => navigate(`/profile/${a.id}?type=alumni`);

  const handleMessage = async (a) => {
    try {
      const r = await startConversation({ other_type: 'alumni', other_id: a.id });
      const conv = r.data?.data || r.data;
      navigate('/admin/messaging', { state: { conversationId: conv.id || conv.conversation_id } });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not start conversation', 'error');
    }
  };

  const handleAction = (action, item) => {
    const name = item.full_name || item.fullName || 'this alumni';
    const msgs = {
      approve: `Approve ${name}? They will gain access to the alumni portal.`,
      reject:  `Reject registration for ${name}? They will be notified.`,
      delete:  `Permanently delete ${name}? This cannot be undone.`,
    };
    setConfirm({ open: true, action, item, message: msgs[action] });
  };

  const executeAction = async () => {
    const { action, item } = confirmState;
    const name = item?.full_name || item?.fullName || 'Alumni';
    setConfirm(p => ({ ...p, open: false }));
    try {
      if (action === 'approve') { await approveAlumni(item.id); toast(`${name} approved ✓`); }
      if (action === 'reject')  { await rejectAlumni(item.id);  toast(`${name} rejected`); }
      if (action === 'delete')  { await deleteAlumni(item.id);  toast('Alumni deleted'); }
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Alumni Management" />

        {/* Header + Create button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="page-title" style={{ margin: 0 }}>
            <div className="section-title">Manage Alumni</div>
            <div className="section-sub">{total} alumni in database</div>
          </div>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={14} color="#fff" style={{ marginRight: 6 }} /> Create Alumni
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['all', 'All Alumni'], ['pending', '⏳ Pending Approval'], ['approved', '✅ Approved']].map(([val, label]) => (
            <button key={val}
              className={`btn ${tab === val ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '5px 14px' }}
              onClick={() => setTab(val)}>
              {label}
              {val === 'pending' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: '#DC2626', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* New SearchBar */}
        <div style={{ marginBottom: 16 }}>
          <SearchBar
            accentColor="#6366F1"
            filterOptions={filterOpts}
            onSearch={handleSearch}
            initialValues={activeParams}
          />
        </div>

        {loading ? <Loading /> : alumni.length === 0 ? (
          <EmptyState icon="👥" title="No alumni found" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Company</th>
                  <th>Designation</th><th>Batch</th><th>Branch</th><th>College</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alumni.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: 'var(--info)', flexShrink: 0 }}>
                          {(a.full_name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{a.full_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.email}</td>
                    <td>{a.company || '—'}</td>
                    <td>{a.designation || '—'}</td>
                    <td>{a.graduation_year || a.batch || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td>
                      <span className="badge badge-blue">
                        {getCollegeName(normalizeCollegeId(a.college_id) || currentTenant)}
                      </span>
                    </td>
                    <td><StatusBadge alumni={a} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleViewProfile(a)}>View</button>
                        <button className="btn btn-secondary btn-xs" onClick={() => handleMessage(a)}>Message</button>
                        {(a.status === 'pending' || (!a.status && !a.is_approved)) && (
                          <button className="btn btn-success btn-xs" onClick={() => handleAction('approve', a)}>
                            <Icon name="check" size={12} color="#fff" /> Approve
                          </button>
                        )}
                        {(a.status === 'pending' || (!a.status && !a.is_approved)) && (
                          <button className="btn btn-danger btn-xs" onClick={() => handleAction('reject', a)}>✗ Reject</button>
                        )}
                        {a.status === 'approved' && (
                          <button className="btn btn-warning btn-xs" onClick={() => handleAction('reject', a)}>Revoke</button>
                        )}
                        <button className="btn btn-danger btn-xs" onClick={() => handleAction('delete', a)}>Delete</button>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹ Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pages}>Next ›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <>
          <Modal open={createOpen} title="Create New Alumni" onClose={() => setCreateOpen(false)}>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Jane Doe" value={createForm.fullName}
                  onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="jane@example.com" value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" placeholder="At least 6 characters" value={createForm.password}
                  onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" type="password" placeholder="Repeat password" value={createForm.confirmPassword}
                  onChange={e => setCreateForm(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="form-input" value={createForm.department}
                  onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))} required>
                  <option value="">Select Department</option>
                  {BRANCHES.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Graduation Year</label>
                <input className="form-input" type="number" placeholder="2023" min="1980" max="2030"
                  value={createForm.graduationYear} onChange={e => setCreateForm(p => ({ ...p, graduationYear: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" placeholder="Google, Microsoft..." value={createForm.company}
                  onChange={e => setCreateForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" placeholder="Software Engineer" value={createForm.designation}
                  onChange={e => setCreateForm(p => ({ ...p, designation: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (<><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Creating...</>) : 'Create Alumni'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={confirmState.open}
            title="Confirm Action"
            message={confirmState.message}
            onConfirm={executeAction}
            onCancel={() => setConfirm(p => ({ ...p, open: false }))}
            danger={confirmState.action !== 'approve'}
          />
        </>
      </div>
    </div>
  );
}
