/**
 * DepartmentCard.jsx — Reusable department card for BatchPage
 * Shows: department icon, name, member count, View button
 */
import React from 'react';

const DEPT_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#0D9488', '#9333EA',
];

function deptColor(name, accent) {
  if (!name) return accent;
  return DEPT_COLORS[name.charCodeAt(0) % DEPT_COLORS.length];
}

export default function DepartmentCard({ dept, accentColor = '#2563EB', onView }) {
  const [hov, setHov] = React.useState(false);
  const color = deptColor(dept.deptName, accentColor);

  return (
    <div
      style={{
        background: '#fff',
        border: `1.5px solid ${hov ? color + '50' : '#E5E7EB'}`,
        borderRadius: 16,
        padding: '20px',
        boxShadow: hov ? `0 6px 24px ${color}14` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.16s',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Icon */}
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: color + '14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
          {dept.deptName}
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>
          {(dept.members || []).length} {(dept.members || []).length === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* View button */}
      <button
        onClick={() => onView(dept)}
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 9,
          border: `1.5px solid ${color}`,
          background: hov ? color : 'transparent',
          color: hov ? '#fff' : color,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        View
      </button>
    </div>
  );
}
