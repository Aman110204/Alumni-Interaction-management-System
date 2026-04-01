import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading } from '../components/MessageBox';
import { getDashboard, getAdminAnnouncements } from '../services/api';
import '../styles/main.css';
import { filterTenantScoped, getCurrentTenant } from '../utils/tenant';

const Bar = ({ label, value, max, color }) => {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ fontWeight:500, color:'var(--text-2)' }}>{label}</span>
        <span style={{ color:'var(--text-muted)', fontWeight:600 }}>{value}</span>
      </div>
      <div style={{ height:6, background:'var(--border)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:10, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
};

import { Users, CheckCircle, GraduationCap, Share2, Briefcase, Calendar, MessageCircle, Plus, Megaphone } from 'lucide-react';

const STATS = d => [
  { label:'Total Students',    value:d.students,          icon:<Users size={16} strokeWidth={2} />,      color:'#800000', bg:'#FDF0F0', path:'/admin/students' },
  { label:'Approved Students', value:d.approved_students, icon:<CheckCircle size={16} strokeWidth={2} />,         color:'#059669', bg:'#ECFDF5', path:'/admin/students?filter=approved' },
  { label:'Total Alumni',      value:d.alumni,            icon:<GraduationCap size={16} strokeWidth={2} />,        color:'#2563EB', bg:'#EFF6FF', path:'/admin/alumni' },
  { label:'Pending Referrals', value:d.pending_referrals, icon:<Share2 size={16} strokeWidth={2} />,     color:'#D97706', bg:'#FFFBEB', path:'/admin/referrals' },
  { label:'Opportunities',     value:d.opportunities,     icon:<Briefcase size={16} strokeWidth={2} />, color:'#7C3AED', bg:'#F5F3FF', path:'/admin/jobs' },
  { label:'Events',            value:d.events,            icon:<Calendar size={16} strokeWidth={2} />,        color:'#DC2626', bg:'#FEF2F2', path:'/admin/events' },
  { label:'Pending Mentorship',value:d.pending_mentorship,icon:<GraduationCap size={16} strokeWidth={2} />,    color:'#0891B2', bg:'#E0F2FE', path:'/admin/students' },
  { label:'Total Messages',    value:d.messages,          icon:<MessageCircle size={16} strokeWidth={2} />,      color:'#374151', bg:'#F3F4F6', path:'/admin/messaging' },
];


export default function AdminDashboard() {
  const currentTenant = getCurrentTenant();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data?.data || r.data))
      .catch(() => setLoadError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));
    getAdminAnnouncements({ limit:5 })
      .then(r => {
        const d = r.data?.data || r.data;
        setAnnouncements(filterTenantScoped(d.announcements || [], currentTenant));
      })
      .catch(() => {});
  }, [currentTenant]);

  const d = data || {};
  const maxUser = Math.max(d.students||0, d.alumni||0, 1);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Dashboard" />
        {loading ? <Loading /> : loadError ? (
          <div style={{ padding:16, background:'var(--danger-light)', borderRadius:10, color:'var(--danger)', fontSize:13 }}>{loadError}</div>
        ) : (
          <>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Platform Overview</h1>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Real-time stats for your Gully Connect platform</p>
            </div>

            {/* Stats grid */}
            <div className="stats-grid" style={{ marginBottom:22 }}>
              {STATS(d).map(s => (
                <Link key={s.label} to={s.path} className="stat-card" style={{ textDecoration:'none', borderLeft:`3px solid ${s.color}` }}>
                  <div className="stat-icon" style={{ background:s.bg, width:34, height:34, borderRadius:8 }}>
                    {s.icon}
                  </div>
                  <div className="stat-value" style={{ color:s.color }}>{s.value ?? '—'}</div>
                  <div className="stat-label">{s.label}</div>
                </Link>
              ))}
            </div>

            <div className="two-col-grid" style={{ marginBottom:18 }}>
              {/* User distribution */}
              <div className="chart-card">
                <div className="chart-label">User Distribution</div>
                <Bar label="Students (Total)"    value={d.students||0}          max={maxUser} color="var(--accent)" />
                <Bar label="Students (Approved)" value={d.approved_students||0} max={maxUser} color="var(--success)" />
                <Bar label="Alumni (Total)"      value={d.alumni||0}            max={maxUser} color="var(--info)" />
                <Bar label="Alumni (Approved)"   value={d.approved_alumni||0}   max={maxUser} color="#7C3AED" />
              </div>

              {/* Pending actions */}
              <div className="chart-card">
                <div className="chart-label">Pending Actions</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Student Approvals',   val:d.pending_students,   color:'var(--accent)',   icon:<Users size={14} strokeWidth={2} />,    path:'/admin/students?filter=pending' },
                    { label:'Alumni Approvals',    val:d.pending_alumni,     color:'var(--info)',     icon:<GraduationCap size={14} strokeWidth={2} />,      path:'/admin/alumni?filter=pending' },
                    { label:'Mentorship Requests', val:d.pending_mentorship, color:'var(--success)',  icon:<GraduationCap size={14} strokeWidth={2} />,  path:'/admin/students' },
                    { label:'Referral Requests',   val:d.pending_referrals,  color:'var(--warning)',  icon:<Share2 size={14} strokeWidth={2} />,   path:'/admin/referrals' },
                  ].map(item => (
                    <Link key={item.label} to={item.path} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg)', borderRadius:9, textDecoration:'none', transition:'background 0.15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${item.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {item.icon}
                        </div>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--text-2)' }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize:18, fontWeight:800, color:item.color }}>{item.val ?? 0}</span>
                    </Link>
                  ))}

                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="chart-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Announcements</div>
                <Link to="/admin/announcements" className="btn btn-primary btn-sm" style={{ fontSize:12 }}>
                  <Plus size={12} color="#fff" strokeWidth={2} /> New
                </Link>
              </div>
              {announcements.length === 0 ? (
                <div style={{ fontSize:13, color:'var(--text-muted)', padding:'8px 0' }}>No announcements yet. <Link to="/admin/announcements" style={{ color:'var(--accent)' }}>Post one</Link></div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {announcements.map(ann => (
                    <div key={ann.id} style={{ padding:'11px 14px', background:'var(--bg)', borderRadius:9, borderLeft:'3px solid var(--accent)', display:'flex', alignItems:'flex-start', gap:10 }}>
                      <Megaphone size={14} color="var(--accent)" strokeWidth={2} style={{ marginTop:2, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{ann.title}</div>
                        <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ann.description}</div>
                        <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>{ann.posted_by} · {new Date(ann.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
