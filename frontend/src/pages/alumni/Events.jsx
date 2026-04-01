import React, { useEffect, useState, useCallback } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import { getStudentEvents } from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import Icon from '../../design/icons';
import { EmptyState } from '../../design/components';
import { EventCard } from '../student/StudentEvents';

export default function AlumniEvents() {
  const toast = useToast();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getStudentEvents({ limit:50 }); const d = r.data?.data || r.data; setEvents(d.events || d || []); }
    catch { toast('Failed to load events', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => !search || (e.title||'').toLowerCase().includes(search.toLowerCase()) || (e.location||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user" loginPath="/alumni/login" portalLabel="Alumni" accentColor="#7C3AED" />
      <div className="main-content">
        <PortalNavbar title="Events" userKey="alumni_user" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Upcoming Events</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Stay connected through college events</p>
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
            {filtered.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>
    </div>
  );
}
