/**
 * BatchCard.jsx — Reusable batch row card for NetworkPage
 * Shows: batch year, member count, View button
 */
import React from 'react';

export default function BatchCard({ batch, accentColor = '#2563EB', onView }) {
  const [hov, setHov] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: hov ? accentColor + '06' : '#fff',
        border: `1.5px solid ${hov ? accentColor + '40' : '#E5E7EB'}`,
        borderRadius: 14,
        transition: 'all 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Left: icon + batch info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: accentColor + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.2px' }}>
            {batch.label}
          </div>
          <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>
            {batch.count} {batch.count === 1 ? 'member' : 'members'}
            {batch.deptCount > 0 && ` · ${batch.deptCount} department${batch.deptCount !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Right: View button */}
      <button
        onClick={() => onView(batch)}
        style={{
          padding: '8px 20px',
          borderRadius: 9,
          border: `1.5px solid ${accentColor}`,
          background: hov ? accentColor : 'transparent',
          color: hov ? '#fff' : accentColor,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        View
      </button>
    </div>
  );
}
