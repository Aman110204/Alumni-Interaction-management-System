import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, ConfirmModal, useToast, Modal } from '../components/MessageBox';
import { getStudents, approveStudent, blockStudent, deleteStudent, startConversation, studentRegister } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar } from '../design/components';
import { filterTenantScoped, getCollegeName, getCurrentTenant, normalizeCollegeId } from '../utils/tenant';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ approved, active }) {
  if (!active)   return <span className="badge badge-gray">Inactive</span>;
  if (approved)  return <span className="badge badge-green">Approved</span>;
  return         <span className="badge badge-amber">Pending</span>;
}

export default function ManageStudents() {
  const toast = useToast();
  const navigate = useNavigate();
  const currentTenant = getCurrentTenant();
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [confirmState, setConfirm]  = useState({ open: false, action: null, student: null });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName:'', email:'', password:'', confirmPassword:'', department:'', year:'' });
  const [saving, setSaving] = useState(false);
  const LIMIT = 20;

  const BRANCHES = [
    "Computer Science (CSE)",
    "Information Science (ISE)", 
    "Electronics & Communication (ECE)",
    "Electrical & Electronics (EEE)",
    "Mechanical Engineering",
    "Civil Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science",
    "Robotics",
    "Biotechnology",
    "Chemical Engineering",
    "Aerospace Engineering"
  ];

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.fullName?.trim()) return toast('Full name is required', 'error');
    if (!createForm.email?.trim()) return toast('Email is required', 'error');
    if (!createForm.password?.trim()) return toast('Password is required', 'error');
    if (createForm.password.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (createForm.password !== createForm.confirmPassword) return toast('Passwords do not match', 'error');
    if (!createForm.department) return toast('Department is required', 'error');
    if (!createForm.year) return toast('Year is required', 'error');

    setSaving(true);
    try {
      await studentRegister({
        fullName: createForm.fullName,
        email: createForm.email,
        password: createForm.password,
        department: createForm.department,
        year: createForm.year
      });
      toast('Student account created successfully ✓');
      setCreateOpen(false);
      setCreateForm({ fullName:'', email:'', password:'', confirmPassword:'', department:'', year:'' });
      loadStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: search || undefined };
      if (filter === 'approved')  params.is_approved = true;
      if (filter === 'pending')   params.is_approved = false;
      const r = await getStudents(params);
      const d = r.data?.data || r.data;
      setStudents(filterTenantScoped(d.students || d.data || d || [], currentTenant));
      setTotal(d.total || d.count || 0);
    } catch (err) {
      toast('Failed to load students', 'error');
    } finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const handleViewProfile = (s) => {
    navigate(`/profile/${s.id}?type=student`);
  };

  const handleAction = (action, student) => {
    const msgs = {
      approve: `Approve ${student.full_name || student.name}?`,
      block:   `Block/reject ${student.full_name || student.name}? They won't be able to access the platform.`,
      delete:  `Permanently delete ${student.full_name || student.name}? This cannot be undone.`,
    };
    setConfirm({ open: true, action, student, message: msgs[action] });
  };

  const executeAction = async () => {
    const { action, student } = confirmState;
    setConfirm(p => ({ ...p, open: false }));
    try {
      if (action === 'approve') { await approveStudent(student.id); toast(`${student.full_name || 'Student'} approved ✓`); }
      if (action === 'block')   { await blockStudent(student.id);   toast(`${student.full_name || 'Student'} blocked`); }
      if (action === 'delete')  { await deleteStudent(student.id);  toast(`Student deleted`); }
      loadStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleMessage = async (s) => {
    try {
      const r = await startConversation({ other_type: 'student', other_id: s.id });
      const conv = r.data?.data || r.data;
      navigate('/admin/messaging', { state: { conversationId: conv.id || conv.conversation_id } });
    } catch (err) { toast(err.response?.data?.message || 'Could not start conversation', 'error'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Student Management" />

        <div className="page-title">
          <div className="section-title">Manage Students</div>
          <div className="section-sub">{total} total students in database</div>
        </div>

        <div className="toolbar" style={{ flexWrap:'wrap', gap:8, justifyContent:'space-between' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, flex:1 }}>
            <div className="search-wrap" style={{ flex:'1 1 200px', minWidth:160 }}>
              <Icon name="search" size={14} color="var(--text-faint)" />
              <input
                className="search-input"
                style={{ paddingLeft: 36 }}
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Students</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn btn-secondary" onClick={loadStudents}>↺ Refresh</button>
          </div>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={14} color="#fff" style={{ marginRight: 6 }} /> Create Student
          </button>
        </div>

        {loading ? <Loading /> : students.length === 0 ? (
          <div className="table-wrapper"><EmptyState icon="🎓" title="No students found" text="Try adjusting your search or filters." /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Year</th>
                  <th>College</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                          {(s.full_name || s.name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.full_name || s.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                    <td>{s.branch || s.department || '—'}</td>
                    <td>{s.year || s.graduation_year || '—'}</td>
                    <td><span className="badge badge-blue">{getCollegeName(normalizeCollegeId(s.college_id) || currentTenant)}</span></td>
                    <td><StatusBadge approved={s.is_approved} active={s.is_active !== false} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(s.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-info btn-xs" onClick={() => handleViewProfile(s)}>View</button>
                        <button className="btn btn-secondary btn-xs" onClick={() => handleMessage(s)}>Message</button>
                        {!s.is_approved && <button className="btn btn-success btn-xs" onClick={() => handleAction('approve', s)}><Icon name="check" size={12} color="#fff" /> Approve</button>}
                        {!s.is_approved && <button className="btn btn-danger btn-xs" onClick={() => handleAction('block', s)}>✗ Reject</button>}
                        {s.is_approved  && <button className="btn btn-warning btn-xs" onClick={() => handleAction('block', s)}>Block</button>}
                        <button className="btn btn-danger btn-xs" onClick={() => handleAction('delete', s)}>Delete</button>
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

        {/* Create Student Modal */}
        <Modal open={createOpen} title="Create New Student" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                placeholder="John Doe"
                value={createForm.fullName}
                onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-input"
                type="email"
                placeholder="john@example.com"
                value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                className="form-input"
                type="password"
                placeholder="At least 6 characters"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                className="form-input"
                type="password"
                placeholder="Repeat password"
                value={createForm.confirmPassword}
                onChange={e => setCreateForm(p => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-input"
                value={createForm.department}
                onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))}
                required
              >
                <option value="">Select Department</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <select
                className="form-input"
                value={createForm.year}
                onChange={e => setCreateForm(p => ({ ...p, year: e.target.value }))}
                required
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />
                    Creating...
                  </>
                ) : (
                  'Create Student'
                )}
              </button>
            </div>
          </form>
        </Modal>


        {/* Confirm Modal */}
        <ConfirmModal
          open={confirmState.open}
          title="Confirm Action"
          message={confirmState.message}
          onConfirm={executeAction}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
          danger={confirmState.action === 'delete' || confirmState.action === 'block'}
        />
      </div>
    </div>
  );
}
