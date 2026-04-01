import React, { useState } from 'react';
import '../styles/main.css';
import Icon from '../design/icons';
import { getNotifications, markAllNotifsRead } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar({ title }) {
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; } })();
  const inits = (name='') => (name||'AD').split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);

  const { unreadCount, markRefresh } = useNotifications();
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  const openBell = async () => {
    const next = !open; setOpen(next);
    if (next) {
      setLoading(true);
      try { const r = await getNotifications({ limit: 12 }); const d = r.data?.data || r.data; setNotifs(d.notifications || d || []); }
      catch { /* ignore */ } finally { setLoading(false); }
    }
  };

  return (
    <header className="header">
      <div className="header-title">{title}</div>
      <div className="header-right">
        <span className="header-date">{dateStr}</span>
        <div style={{ position:'relative' }}>
          <button className="notif-btn" onClick={openBell}>
            <Icon name="bell" size={15} color="currentColor" />
{unreadCount > 0 && <span className="badge badge-indigo" style={{ position:'absolute', top:-6, right:-6, fontSize:10, minWidth:18, height:18, fontWeight:700 }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {open && (
            <>
              <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:300, background:'#fff', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,0.12)', zIndex:200 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border-lite)' }}>
                  <span style={{ fontWeight:700, fontSize:13.5 }}>Notifications</span>
                  {unreadCount > 0 && <button onClick={async () => { await markAllNotifsRead().catch(()=>{}); setNotifs(ns => ns.map(n=>({...n,is_read:true}))); markRefresh(); }} style={{ fontSize:11.5, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Mark all read</button>}
                </div>
                <div style={{ maxHeight:320, overflowY:'auto' }}>
                  {loading ? <div style={{ padding:20, textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>Loading…</div>
                  : notifs.length === 0 ? <div style={{ padding:24, textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>No notifications yet</div>
                  : notifs.map(n => (
                    <div key={n.id} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-lite)', background:n.is_read?'transparent':'var(--accent-light)', display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:26, height:26, borderRadius:7, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name={n.type==='message'?'messages':'bell'} size={12} color="var(--accent)" />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12.5, color:'var(--text)', lineHeight:1.4 }}>{n.message}</div>
                        <div style={{ fontSize:10.5, color:'var(--text-faint)', marginTop:2 }}>{new Date(n.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="avatar" style={{ borderRadius:9 }}>{inits(user?.full_name || user?.username || 'Admin')}</div>
      </div>
    </header>
  );
}
