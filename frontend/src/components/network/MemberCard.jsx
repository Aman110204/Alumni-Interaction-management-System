/**
 * MemberCard.jsx — Reusable member card for DepartmentPage
 * Shows: avatar initials, name, role/company, View Profile button
 */
import React from 'react';

const AVATAR_COLORS = [
  '#1D4ED8', '#059669', '#7C3AED', '#D97706',
  '#DC2626', '#0891B2', '#0D9488', '#9333EA',
];

const avatarColor = (name) =>
  AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export default function MemberCard({ member, accentColor = '#2563EB', onViewProfile }) {
  const [hov, setHov] = React.useState(false);
  const name = member.full_name || member.name || '?';
  const bg = avatarColor(name);

  const subtitle = [
    member.designation && member.company
      ? `${member.designation} @ ${member.company}`
      : member.company,
    member.role === 'student' ? 'Student' : null,
  ]
    .filter(Boolean)
    .join(' · ') || member.department || '—';

  return (
    <div
      style={{
        background: '#fff',
        border: `1.5px solid ${hov ? accentColor + '40' : '#E5E7EB'}`,
        borderRadius: 16,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        boxShadow: hov ? `0 6px 24px ${accentColor}12` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.16s',
        textAlign: 'center',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Avatar */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: bg,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: `0 4px 12px ${bg}40`,
        }}
      >
        {initials(name)}
      </div>

      {/* Name + subtitle */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#6B7280',
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
        {member.available_mentorship && (
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 10.5,
              padding: '2px 8px',
              borderRadius: 10,
              background: '#ECFDF5',
              color: '#059669',
              fontWeight: 700,
            }}
          >
            ✓ Mentor
          </span>
        )}
      </div>

      {/* View Profile button */}
      <button
        onClick={() => onViewProfile(member)}
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 9,
          border: `1.5px solid ${accentColor}`,
          background: hov ? accentColor : 'transparent',
          color: hov ? '#fff' : accentColor,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        View Profile
      </button>
    </div>
  );
}
