import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/main.css';
import Icon from '../design/icons';
import { LayoutDashboard, Users, GraduationCap, Calendar, Briefcase, Link2, MessageCircle, Megaphone, LogOut } from 'lucide-react';

const SECTIONS = [
  { label: 'Main', items: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  ]},
  { label: 'Manage', items: [
    { label: 'Students', path: '/admin/students', icon: <Users size={16} strokeWidth={2} /> },
    { label: 'Alumni', path: '/admin/alumni', icon: <GraduationCap size={16} strokeWidth={2} /> },
    { label: 'Events', path: '/admin/events', icon: <Calendar size={16} strokeWidth={2} /> },
    { label: 'Job Posts', path: '/admin/jobs', icon: <Briefcase size={16} strokeWidth={2} /> },
    { label: 'Referrals', path: '/admin/referrals', icon: <Link2 size={16} strokeWidth={2} /> },
  ]},
  { label: 'Communicate', items: [
    { label: 'Messaging', path: '/admin/messaging', icon: <MessageCircle size={16} strokeWidth={2} /> },
    { label: 'Announcements', path: '/admin/announcements', icon: <Megaphone size={16} strokeWidth={2} /> },
  ]},
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; } })();
  const name = user?.full_name || user?.username || 'Admin';
  const inits = name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2) || 'AD';

  return (
    <nav className={`sidebar portal-admin ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">Gully Connect</div>
        <div className="logo-sub">Admin Portal</div>
        <button 
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar (←)' : 'Collapse sidebar (→)'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div style={{ flex:1, paddingBottom:8 }}>
        {SECTIONS.map(section => (
          <React.Fragment key={section.label}>
            <span className="nav-section-label">{section.label}</span>
            {section.items.map(item => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} title={item.label}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="sidebar-user" style={{ padding:'10px 16px', borderTop:'1px solid var(--border-lite)', display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{inits}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{name}</div>
          <div style={{ fontSize:10, color:'var(--text-faint)' }}>Administrator</div>
        </div>
      </div>
      <button className="nav-item logout" onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin/login'); }} style={{ margin:'2px 8px 8px', borderRadius:8, width:'calc(100% - 16px)' }} title="Sign Out">
        <span className="nav-icon"><LogOut size={16} strokeWidth={2} /></span>
        <span className="nav-label">Sign Out</span>
      </button>
    </nav>
  );
}
