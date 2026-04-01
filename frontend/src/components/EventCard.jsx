import React from 'react';
import '../styles/main.css';
import Icon from '../design/icons';

const TYPE_COLORS = {
  workshop:   '#2563EB', seminar:    '#059669',
  networking: '#7C3AED', webinar:    '#D97706',
  general:    '#6B7280',
};

export default function EventCard({ event, onEdit, onDelete }) {
  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const typeKey  = (event.event_type || 'general').toLowerCase();
  const barColor = TYPE_COLORS[typeKey] || TYPE_COLORS.general;

  return (
    <div className="event-card">
      {/* Banner image or colour bar */}
      {event.banner_url ? (
        <img
          src={event.banner_url}
          alt={event.title}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      {/* Colour-bar fallback — always rendered, hidden when image loads */}
      <div style={{ height: 4, background: barColor, display: event.banner_url ? 'none' : 'block' }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Type badge + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {event.event_type && (
            <span style={{ fontSize: 11, fontWeight: 600, color: barColor, background: barColor + '18', padding: '2px 9px', borderRadius: 20 }}>
              {event.event_type}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="events" size={11} color="var(--text-faint)" />
            {fmtDate(event.event_date || event.start_date)}
            {event.time_slot ? ' · ' + event.time_slot : ''}
          </span>
        </div>

        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
          {event.title}
        </div>

        {event.description && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
            {event.description.slice(0, 120)}{event.description.length > 120 ? '…' : ''}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {event.location && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="mappin" size={11} color="var(--text-faint)" />{event.location}
            </span>
          )}
          {event.speaker && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="profile" size={11} color="var(--text-faint)" />{event.speaker}
            </span>
          )}
          {(event.max_capacity || event.max_participants) && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="users" size={11} color="var(--text-faint)" />
              Max {event.max_capacity || event.max_participants} attendees
            </span>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="action-btns">
            {onEdit && (
              <button className="btn btn-info btn-sm" onClick={() => onEdit(event)}>
                <Icon name="edit" size={12} color="currentColor" /> Edit
              </button>
            )}
            {onDelete && (
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(event)}>
                <Icon name="trash" size={12} color="currentColor" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
