import React, { useEffect, useState } from 'react';
import { Briefcase, MessageCircle, GraduationCap, Calendar, Users, Share2, Bell } from 'lucide-react';
import { getNotifications } from '../services/api';

const TYPE_MAP = {
  message:    { Icon: MessageCircle, bg: '#ECFDF5', color: '#059669' },
  mentorship: { Icon: GraduationCap, bg: '#FEF3C7', color: '#D97706' },
  referral:   { Icon: Share2,        bg: '#FFF7ED', color: '#EA580C' },
  connection: { Icon: Users,         bg: '#EFF6FF', color: '#2563EB' },
  event:      { Icon: Calendar,      bg: '#F0FDF4', color: '#16A34A' },
  opportunity:{ Icon: Briefcase,     bg: '#F5F3FF', color: '#7C3AED' },
  default:    { Icon: Bell,          bg: '#F1F5F9', color: '#64748B' },
};

const timeAgo = ts => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
};

export default function ActivityFeed({ limit = 5 }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications({ limit })
      .then(r => {
        const d = r.data?.data || r.data;
        setItems(d.notifications || d || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-lite)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recent Activity</span>
      </div>

      {loading ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌟</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No activity yet</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Start connecting to see updates here</div>
        </div>
      ) : (
        <div style={{ padding: '4px 0' }}>
          {items.slice(0, limit).map((item, idx) => {
            const type = item.type || 'default';
            const { Icon, bg, color } = TYPE_MAP[type] || TYPE_MAP.default;
            const isLast = idx === Math.min(limit, items.length) - 1;
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 20px', borderBottom: isLast ? 'none' : '1px solid var(--border-lite)', background: item.is_read ? 'transparent' : 'var(--bg-subtle)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: item.is_read ? 500 : 700, fontSize: 13.5, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.message || item.title || 'Notification'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{timeAgo(item.created_at)}</div>
                </div>
                {!item.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED', flexShrink: 0, marginTop: 5 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
