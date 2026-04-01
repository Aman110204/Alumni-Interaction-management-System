import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';
import '../styles/main.css';
import { getCurrentTenant, normalizeCollegeId } from '../utils/tenant';

export default function AdminLogin() {
  const [form, setForm]     = useState({ login: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentTenant = normalizeCollegeId(getCurrentTenant());

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('admin_user') || 'null');
      const storedTenant = normalizeCollegeId(stored?.college_id);
      if (currentTenant && storedTenant && storedTenant !== currentTenant) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  }, [currentTenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.login || !form.password) { setError('Both fields are required.'); return; }
    setLoading(true);
    try {
      const res = await adminLogin(form);
      const { token, user } = res.data?.data || res.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page admin-login" style={{ background:'linear-gradient(135deg, #2A0000 0%, #800000 55%, #C0392B 100%)' }}>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark" style={{ color:'#800000' }}>Gully Connect</div>
          <div className="login-logo-sub">Admin Portal</div>
        </div>
        <div className="login-title">Welcome back</div>
        <div className="login-sub">Sign in to manage the platform</div>
        {error && <div className="login-error">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input className="form-input" type="text" placeholder="admin" value={form.login}
              onChange={e => setForm(p => ({ ...p, login: e.target.value }))} autoComplete="username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px', background:'#800000', marginTop:4 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2, borderTopColor:'#fff', marginRight:6 }} />Signing in…</> : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:'var(--text-muted)' }}>
          Default: <code style={{ background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>admin / admin123</code>
        </div>
      </div>
    </div>
  );
}
