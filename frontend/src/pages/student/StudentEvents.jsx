import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast, ConfirmModal } from '../../components/MessageBox';
import { listEvents, registerForEvent, getMyEventRegistrations } from '../../services/api';
import Icon from '../../design/icons';
import { EmptyState } from '../../design/components';
import { STUDENT_NAV } from './_nav';


const TYPE_META = {
  Workshop:   { color:'#2563EB', bg:'#EFF6FF' },
  Seminar:    { color:'#059669', bg:'#ECFDF5' },
  Networking: { color:'#7C3AED', bg:'#F5F3FF' },
  Webinar:    { color:'#D97706', bg:'#FFFBEB' },
  General:    { color:'#6B7280', bg:'#F3F4F6' },
};
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}) : '—';

export function EventCard({ ev, registered, onRegister }) {
  const tm = TYPE_META[ev.event_type] || TYPE_META.General;
  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      {/* Banner image — shown when banner_url is set */}
      {ev.banner_url ? (
        <img
          src={ev.banner_url}
          alt={ev.title}
          onError={e => { e.target.style.display = 'none'; }}
          style={{ width:'100%', height:140, objectFit:'cover', display:'block' }}
        />
      ) : (
        <div style={{ height:4, background:tm.color }} />
      )}
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:11.5, fontWeight:600, color:tm.color, background:tm.bg, padding:'3px 9px', borderRadius:20 }}>{ev.event_type || 'General'}</span>
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6, lineHeight:1.3 }}>{ev.title}</div>
        {ev.description && <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12, lineHeight:1.55 }}>{ev.description.slice(0,110)}{ev.description.length > 110 ? '…' : ''}</p>}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {ev.event_date && (
            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--text-muted)' }}>
              <Icon name="events" size={13} color="var(--text-faint)" />
              {fmt(ev.event_date)}{ev.time_slot ? ' · ' + ev.time_slot : ''}
            </div>
          )}
          {ev.location && (
            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--text-muted)' }}>
              <Icon name="mappin" size={13} color="var(--text-faint)" />
              {ev.location}
            </div>
          )}
          {ev.speaker && (
            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--text-muted)' }}>
              <Icon name="profile" size={13} color="var(--text-faint)" />
              {ev.speaker}
            </div>
          )}
        </div>
        {onRegister !== undefined && (
          <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border-lite)' }}>
            {registered
              ? <span className="badge badge-green" style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Icon name="check" size={11} color="#059669" /> Registered</span>
              : <button className="btn btn-primary btn-sm" style={{ background:'#2563EB' }} onClick={onRegister}>Register</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentEvents() {
  const toast = useToast();
  const [events,  setEvents]  = useState([]);
  const [myRegs,  setMyRegs]  = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [confirm, setConfirm] = useState({ open:false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evR, regR] = await Promise.all([listEvents({ limit:50 }), getMyEventRegistrations()]);
      const evData = evR.data?.data || evR.data; setEvents(evData.events || evData || []);
      const regs = regR.data?.data || regR.data || [];
      setMyRegs(new Set((Array.isArray(regs) ? regs : regs.registrations || []).map(r => r.event_id || r.id)));
    } catch { toast('Failed to load events', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => !search || (e.title||'').toLowerCase().includes(search.toLowerCase()) || (e.location||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#2563EB" />
      <div className="main-content">
        <PortalNavbar title="Events" userKey="user" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Events</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Browse and register for upcoming events</p>
          </div>
        </div>
        <div className="toolbar" style={{ marginBottom:18 }}>
          <div className="search-wrap" style={{ flex:1 }}>
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <Loading /> : filtered.length === 0 ? (
          <div className="card" style={{ padding:0 }}><EmptyState icon="events" title="No events found" sub="Check back soon for upcoming events" /></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {filtered.map(ev => (
              <EventCard key={ev.id} ev={ev} registered={myRegs.has(ev.id)}
                onRegister={() => setConfirm({ open:true, event:ev, message:'Register for "' + ev.title + '"?' })} />
            ))}
          </div>
        )}
        <ConfirmModal open={confirm.open} title="Confirm Registration" message={confirm.message}
          onConfirm={async () => {
            const ev = confirm.event; setConfirm(p => ({ ...p, open:false }));
            try { await registerForEvent(ev.id); setMyRegs(prev => new Set([...prev, ev.id])); toast('Registered ✓', 'success'); }
            catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
          }}
          onCancel={() => setConfirm(p => ({ ...p, open:false }))} danger={false} />
      </div>
    </div>
  );
}
