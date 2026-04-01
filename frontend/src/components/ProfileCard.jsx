import React from 'react';
import { avatarColor, initials } from '../design/tokens';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function getProfileCardSecondaryInfo(profile) {
  if (profile.sameCompany && profile.company) return profile.company;

  if ((profile.mutualConnections || 0) > 0) {
    const count = Number(profile.mutualConnections) || 0;
    return `${count} mutual connection${count === 1 ? '' : 's'}`;
  }

  return profile.location || '';
}

export function getProfileCardBadges(profile) {
  const badgeCandidates = [
    profile.isClassmate ? { key: 'classmate', label: 'Classmate', tone: 'blue' } : null,
    profile.sameCompany ? { key: 'same-company', label: 'Same Company', tone: 'green' } : null,
    profile.isBatchmate ? { key: 'batchmate', label: 'Batchmate', tone: 'amber' } : null,
  ].filter(Boolean);

  return badgeCandidates.slice(0, 2);
}

export function buildProfileCardMeta(profile) {
  const branch = profile.branch || profile.department || '';
  const batch = profile.batch || profile.batchYear || profile.graduation_year || profile.year || '';

  return {
    branchBatch: [branch, batch ? `Batch ${batch}` : ''].filter(Boolean).join(' • '),
    secondaryInfo: getProfileCardSecondaryInfo(profile),
    badges: getProfileCardBadges(profile),
  };
}

function badgeStyles(tone) {
  if (tone === 'green') {
    return { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' };
  }
  if (tone === 'amber') {
    return { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' };
  }
  return { background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' };
}

export default function ProfileCard({ profile, onView, onMessage, className = '' }) {
  const [hovered, setHovered] = React.useState(false);
  const name = profile.full_name || profile.name || 'Unknown';
  const meta = buildProfileCardMeta(profile);
  const hoverInfo = profile.hoverInfo || profile.headline || profile.designation || '';

  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#D1D5DB' : '#E5E7EB'}`,
        borderRadius: 16,
        padding: '12px 14px',
        boxShadow: hovered ? '0 6px 18px rgba(15,23,42,0.08)' : '0 1px 3px rgba(15,23,42,0.05)',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: avatarColor(name),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials(name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
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
                marginTop: 2,
                fontSize: 12,
                color: '#6B7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.branchBatch || '—'}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: '#4B5563',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.secondaryInfo || '—'}
            </div>

            {meta.badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {meta.badges.map((badge) => (
                  <span
                    key={badge.key}
                    style={{
                      ...badgeStyles(badge.tone),
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

            {hovered && hoverInfo && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: '#9CA3AF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hoverInfo}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            alignSelf: 'start',
          }}
        >
          <button
            type="button"
            onClick={() => onView?.(profile)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              background: '#fff',
              color: '#374151',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onMessage?.(profile)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#111827',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
}

export function deriveProfileCardFlags({ viewerBranch, viewerBatch, viewerCompany, profile }) {
  const branch = profile.branch || profile.department || '';
  const batch = profile.batch || profile.batchYear || profile.graduation_year || profile.year || '';
  const company = profile.company || '';

  const isClassmate =
    Boolean(normalize(viewerBranch) && normalize(viewerBatch)) &&
    normalize(viewerBranch) === normalize(branch) &&
    normalize(viewerBatch) === normalize(batch);

  const isBatchmate =
    !isClassmate &&
    Boolean(normalize(viewerBatch)) &&
    normalize(viewerBatch) === normalize(batch);

  const sameCompany =
    Boolean(normalize(viewerCompany)) &&
    normalize(viewerCompany) === normalize(company);

  return {
    ...profile,
    isClassmate,
    isBatchmate,
    sameCompany,
  };
}
