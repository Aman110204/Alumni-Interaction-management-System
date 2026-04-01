import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import EventCard from '../components/EventCard';
import { Loading, EmptyState, ConfirmModal, Modal, useToast } from '../components/MessageBox';
import { getAdminEvents, createEvent, updateEvent, deleteEvent } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { Avatar, StatusBadge, EmptyState as DSEmpty } from '../design/components';
import { filterTenantScoped, getCurrentTenant } from '../utils/tenant';

const EMPTY_FORM = { title: '', description: '', event_date: '', location: '', event_type: 'seminar', max_capacity: '', speaker: '', banner_url: '', time_slot: '', organizer: '', status: 'upcoming' };

export default function Events() {
  const toast = useToast();
  const currentTenant = getCurrentTenant();
  const [events,       setEvents]       = useState([]);
  const [allEvents,    setAllEvents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [confirmState, setConfirm]      = useState({ open: false });
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrg,    setFilterOrg]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminEvents();
      const d = r.data?.data || r.data;
      const raw = Array.isArray(d) ? d : d.events || d.data || [];
      // CRITICAL: Filter to current tenant before rendering
      const list = filterTenantScoped(raw, currentTenant);
      setAllEvents(list);
      setEvents(list);
    } catch { toast('Failed to load events', 'error'); }
    finally { setLoading(false); }
  }, [currentTenant]);

  useEffect(() => { load(); }, [load]);

  // Client-side filtering for admin events (small dataset)
  useEffect(() => {
    let filtered = [...allEvents];
    if (search)       filtered = filtered.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase()));
    if (filterType)   filtered = filtered.filter(e => e.event_type === filterType);
    if (filterStatus) filtered = filtered.filter(e => e.status === filterStatus);
    if (filterOrg)    filtered = filtered.filter(e => e.organizer?.toLowerCase().includes(filterOrg.toLowerCase()));
    setEvents(filtered);
  }, [search, filterType, filterStatus, filterOrg, allEvents]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit   = (ev) => {
    setEditing(ev);
    setForm({
      title:        ev.title || '',
      description:  ev.description || '',
      event_date:   ev.event_date ? ev.event_date.slice(0,16) : '',
      location:     ev.location || '',
      event_type:   ev.event_type || 'seminar',
      max_capacity: ev.max_capacity || ev.max_participants || '',
      speaker:      ev.speaker || '',
      banner_url:   ev.banner_url || '',
      time_slot:    ev.time_slot || '',
      organizer:    ev.organizer || '',
      status:       ev.status || 'upcoming',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim())      { toast('Title is required', 'error'); return; }
    if (!form.event_date.trim()) { toast('Event date is required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateEvent(editing.id, form);
        toast('Event updated ✓');
      } else {
        await createEvent(form);
        toast('Event created ✓');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = (ev) => setConfirm({ open: true, item: ev, message: `Delete "${ev.title}"? This cannot be undone.` });

  const executeDelete = async () => {
    const { item } = confirmState;
    setConfirm(p => ({ ...p, open: false }));
    try { await deleteEvent(item.id); toast('Event deleted'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Delete failed', 'error'); }
  };

  const inp = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Event Management" />

        <div className="section-header page-title">
          <div>
            <div className="section-title">Events</div>
            <div className="section-sub">{events.length} event{events.length !== 1 ? 's' : ''} shown</div>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
        </div>

        {/* Filters */}
        <div className="toolbar" style={{ flexWrap:'wrap', gap:8, marginBottom:12 }}>
          <div className="search-wrap" style={{ flex:'1 1 180px', minWidth:160 }}>
            <Icon name="search" size={14} color="var(--text-faint)" />
            <input className="search-input" style={{ paddingLeft:36 }} placeholder="Search title, location…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {['seminar','workshop','webinar','networking','reunion','hackathon','General'].map(t =>
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            )}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input className="filter-select" placeholder="Filter organizer…" value={filterOrg}
            onChange={e => setFilterOrg(e.target.value)} style={{ minWidth:140 }} />
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterOrg(''); }}>Clear</button>
        </div>

        {loading ? <Loading /> : events.length === 0 ? (
          <EmptyState icon="📅" title="No events yet" text="Create your first event using the button above." />
        ) : (
          <div className="events-grid">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          open={formOpen}
          title={editing ? 'Edit Event' : 'Create Event'}
          onClose={() => setFormOpen(false)}
          lg
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width:14,height:14,borderWidth:2 }} /> Saving…</> : (editing ? 'Save Changes' : 'Create Event')}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Event Title *</label>
              <input className="form-input" placeholder="Alumni Meet 2025" {...inp('title')} />
            </div>
            <div className="form-group">
              <label className="form-label">Event Date & Time *</label>
              <input className="form-input" type="datetime-local" {...inp('event_date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" placeholder="Main Auditorium / Online" {...inp('location')} />
            </div>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select className="form-input" {...inp('event_type')}>
                <option value="seminar">Seminar</option>
                <option value="workshop">Workshop</option>
                <option value="meetup">Meetup</option>
                <option value="webinar">Webinar</option>
                <option value="hackathon">Hackathon</option>
                <option value="networking">Networking</option>
                <option value="General">General</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input className="form-input" type="number" min="1" placeholder="100" {...inp('max_capacity')} />
            </div>
            <div className="form-group">
              <label className="form-label">Speaker</label>
              <input className="form-input" placeholder="Dr. Jane Smith" {...inp('speaker')} />
            </div>
            <div className="form-group">
              <label className="form-label">Organizer</label>
              <input className="form-input" placeholder="Alumni Cell" {...inp('organizer')} />
            </div>
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <input className="form-input" placeholder="10:00 AM – 12:00 PM" {...inp('time_slot')} />
            </div>
            {editing && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" {...inp('status')}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Banner Image URL</label>
              <input className="form-input" placeholder="https://…/banner.jpg" {...inp('banner_url')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={4} placeholder="Describe the event…" {...inp('description')} />
            </div>
          </div>
        </Modal>

        <ConfirmModal
          open={confirmState.open}
          title="Delete Event"
          message={confirmState.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      </div>
    </div>
  );
}
