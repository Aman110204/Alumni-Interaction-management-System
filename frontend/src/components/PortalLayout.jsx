import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import '../styles/main.css';
import Icon from '../design/icons';
import { LayoutDashboard, User, Users, Link2, MessageCircle, Briefcase, Share2, GraduationCap, Calendar, LogOut } from 'lucide-react';
import { getNotifications, markNotifRead, markAllNotifsRead } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { avatarColor } from '../design/tokens';
import { AUTH_COLLEGE_OPTIONS } from '../constants/collegeOptions';
import { getCollegeName, getTenantFromHostname, isLocalTenantFallback, isSubdomainTenantMode } from '../utils/tenant';

// ── PortalSidebar ─────────────────────────────────────────────────────────
export function PortalSidebar({ navItems, tokenKey, userKey, loginPath, portalLabel, accentColor }) {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; } })();
  const name = user?.full_name || user?.name || user?.username || portalLabel;
  const inits = (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleLogout = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    navigate(loginPath, { replace: true });
  };

  const accentStyle = accentColor ? {
    '--accent': accentColor,
    '--accent-light': accentColor + '18',
  } : {};

  const portalClass = loginPath.includes('student') ? 'portal-student'
                    : loginPath.includes('alumni')  ? 'portal-alumni'
                    : 'portal-admin';

  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`sidebar ${portalClass} ${collapsed ? 'collapsed' : ''}`} title={collapsed ? 'Click toggle to expand' : undefined}>
      <div className="sidebar-logo">
        <div className="logo-mark">Gully Connect</div>
        <div className="logo-sub">{portalLabel === 'Alumni' ? 'Gully Network' : portalLabel === 'Student' ? 'Student Network' : `${portalLabel} Portal`}</div>
        <button 
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar (←)' : 'Collapse sidebar (→)'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div style={{ flex: 1, paddingBottom: 8 }}>
        {navItems.map(section => (
          <React.Fragment key={section.label}>
            <span className="nav-section-label">{section.label}</span>
            {section.items.map(item => {

              return (
              <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={item.label}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ marginLeft: 'auto', background: accentColor || 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="nav-spacer" />

      {/* User info */}
      <div className="sidebar-user" style={{ padding: '10px 16px', borderTop: '1px solid var(--border-lite)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: accentColor || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {inits}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{portalLabel}</div>
        </div>
      </div>
      <button className="nav-item logout" onClick={handleLogout} style={{ margin: '2px 8px 8px', borderRadius: 8, width: 'calc(100% - 16px)' }} title="Sign Out">
        <span className="nav-icon"><LogOut size={16} strokeWidth={2} /></span>
        <span className="nav-label">Sign Out</span>
      </button>
    </nav>
  );
}

// ── PortalNavbar ──────────────────────────────────────────────────────────
export function PortalNavbar({ title, userKey }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; } })();
  const name = user?.full_name || user?.username || '';
  const inits = (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const { unreadCount, markRefresh } = useNotifications();
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-mark message notifications as read when the user is already on the messages page
  useEffect(() => {
    const isOnMessages = window.location.pathname.includes('/messages');
    if (!isOnMessages || unreadCount === 0) return;
    // Small delay so the page has finished loading
    const t = setTimeout(async () => {
      try {
        // Fetch unread message-type notifications and mark them read
        const r = await getNotifications({ limit: 50 });
        const d = r.data?.data || r.data;
        const msgNotifs = (d.notifications || d || []).filter(n => n.type === 'message' && !n.is_read);
        if (msgNotifs.length > 0) {
          await Promise.all(msgNotifs.map(n => markNotifRead(n.id).catch(() => {})));
          markRefresh();
        }
      } catch { /* silent */ }
    }, 1200);
    return () => clearTimeout(t);
  }, [unreadCount, markRefresh]);

  const openBell = useCallback(async () => {
    setOpen(prev => {
      if (prev) return false; // toggle off
      return true;
    });
    // Load notifications when opening
    setLoading(true);
    try {
      const r = await getNotifications({ limit: 15 });
      const d = r.data?.data || r.data;
      setNotifs(d.notifications || d || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
      markRefresh();
    } catch { /* ignore */ }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotifsRead();
      setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
      markRefresh();
    } catch { /* ignore */ }
  };

  const avatarBg = avatarColor(name);

  return (
    <header className="header">
      <div className="header-title">{title}</div>
      <div className="header-right">
        <span className="header-date">{dateStr}</span>

        {/* Notification Bell — ref wraps both button and panel */}
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button className="notif-btn" onClick={openBell} aria-label="Notifications">
            <Icon name="bell" size={15} color="currentColor" />
            {unreadCount > 0 && (
              <span className="badge badge-indigo" style={{ position: 'absolute', top: -6, right: -6, fontSize: 10, fontWeight: 700 }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-lite)' }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAll} style={{ fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Mark all read</button>
                )}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Loading…</div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No notifications yet</div>
                ) : notifs.map(n => (
                  <div key={n.id}
                    onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
                    style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-lite)', background: n.is_read ? 'transparent' : 'var(--accent-light)', cursor: n.is_read ? 'default' : 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: n.type === 'message' ? '#EFF6FF' : n.type === 'connection_request' ? '#F5F3FF' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Icon name={n.type === 'message' ? 'messages' : n.type === 'connection_request' ? 'connections' : 'bell'} size={12} color={n.type === 'message' ? '#2563EB' : n.type === 'connection_request' ? '#7C3AED' : 'var(--accent)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {n.title && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{n.title}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 3 }}>
                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="avatar" style={{ background: avatarBg, borderRadius: 9 }}>{inits}</div>
      </div>
    </header>
  );
}

// ── RequirePortal ──────────────────────────────────────────────────────────
export function RequirePortal({ tokenKey, loginPath, children }) {
  return localStorage.getItem(tokenKey) ? children : <Navigate to={loginPath} replace />;
}

// ── PortalLogin ────────────────────────────────────────────────────────────
export function PortalLogin({ title, subtitle, loginFn, tokenKey, userKey, redirectPath, registerPath, accentColor, bgClass }) {
  const tenantFromHost = React.useMemo(() => getTenantFromHostname(), []);
  const manualCollegeSelection = React.useMemo(() => isLocalTenantFallback(), []);
  const subdomainTenantMode = React.useMemo(() => isSubdomainTenantMode(), []);
  const [form, setForm] = React.useState({ email: '', password: '', college_id: tenantFromHost || '' });
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [colleges] = React.useState(AUTH_COLLEGE_OPTIONS);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (location.state?.registered) {
      setInfo('Registration submitted! Your account is pending admin approval.');
    }
  }, [location.state]);

  React.useEffect(() => {
    if (tenantFromHost) {
      setForm(prev => ({ ...prev, college_id: tenantFromHost }));
    }
  }, [tenantFromHost]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!form.email || !form.password || !form.college_id) { setError('Email, password and college are required.'); return; }
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        ...(subdomainTenantMode ? {} : { college_id: form.college_id }),
      };
      const res = await loginFn(payload);
      const d = res.data?.data || res.data;
      localStorage.setItem(tokenKey, d.token);
      localStorage.setItem(userKey, JSON.stringify(d.user));
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const accent = accentColor || '#800000';

  return (
    <div className={`login-page ${bgClass || ''}`} style={{ background: accentColor ? undefined : undefined }}>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark" style={{ color: accent }}>Gully Connect</div>
          <div className="login-logo-sub">{title}</div>
        </div>
        <div className="login-title">Welcome back</div>
        <div className="login-sub">{subtitle}</div>
        {info  && <div className="login-error" style={{ background: '#ECFDF5', color: '#059669', borderColor: '#A7F3D0' }}>✓ {info}</div>}
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {manualCollegeSelection ? (
            <div className="form-group">
              <label className="form-label">Select College</label>
              <select
                className="form-input"
                value={form.college_id}
                onChange={e => setForm(p => ({ ...p, college_id: e.target.value }))}
              >
                <option value="">Select College</option>
                {colleges.map(college => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">College</label>
              <input
                className="form-input"
                value={getCollegeName(form.college_id)}
                readOnly
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input id="email" className="form-input" type="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="password" className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', background: accent, marginTop: 4 }}
            disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', marginRight: 6 }} />Signing in…</> : 'Sign In'}
          </button>
        </form>
        {registerPath && (
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <a href={registerPath} style={{ color: accent, fontWeight: 600 }}>Register here</a>
          </div>
        )}
      </div>
    </div>
  );
}
