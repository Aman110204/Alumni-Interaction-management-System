// Shared UI components — design system building blocks
import React, { useState } from 'react';
import Icon from './icons';
import { parseTags, isCert, initials, avatarColor } from './tokens';

/* ── Section Card ─────────────────────────────────────────────────────────── */
export const SectionCard = ({ icon, iconColor = '#667085', title, action, children, noPad }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
    {(icon || title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <Icon name={icon} size={15} color={iconColor} />}
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', letterSpacing: '-0.01em' }}>{title}</span>
        </div>
        {action}
      </div>
    )}
    <div style={noPad ? {} : { padding: '14px 20px' }}>{children}</div>
  </div>
);

/* ── Outline Button ───────────────────────────────────────────────────────── */
export const OutlineBtn = ({ icon, label, onClick, size = 'md', color = '#374151', disabled }) => {
  const pad = size === 'sm' ? '5px 10px' : '7px 14px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: pad, borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color, fontSize: fs, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
      {icon && <Icon name={icon} size={fs - 1} color={color} />}{label}
    </button>
  );
};

/* ── Ghost Button ─────────────────────────────────────────────────────────── */
export const GhostBtn = ({ icon, onClick, color = '#9CA3AF', title }) => (
  <button onClick={onClick} title={title}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 6, color, transition: 'color 0.15s' }}>
    <Icon name={icon} size={14} color={color} />
  </button>
);

/* ── Primary Button ───────────────────────────────────────────────────────── */
export const PrimaryBtn = ({ label, onClick, saving, color = '#2563EB', icon, disabled }) => (
  <button onClick={onClick} disabled={saving || disabled}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 9, border: 'none', background: color, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: (saving || disabled) ? 'not-allowed' : 'pointer', opacity: (saving || disabled) ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
    {icon && !saving && <Icon name={icon} size={14} color="#fff" />}
    {saving ? 'Saving…' : label}
  </button>
);

/* ── Cancel Button ────────────────────────────────────────────────────────── */
export const CancelBtn = ({ onClick }) => (
  <button onClick={onClick}
    style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
    Cancel
  </button>
);

/* ── Save Button ──────────────────────────────────────────────────────────── */
export const SaveBtn = ({ onClick, saving, label = 'Save', color = '#2563EB' }) => (
  <button onClick={onClick} disabled={saving}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 9, border: 'none', background: color, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
    {saving ? 'Saving…' : label}
  </button>
);

/* ── Danger Ghost Button ──────────────────────────────────────────────────── */
export const DangerGhostBtn = ({ icon, onClick, title }) => (
  <button onClick={onClick} title={title}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 6, color: '#EF4444', transition: 'color 0.15s' }}>
    <Icon name={icon} size={14} color="#EF4444" />
  </button>
);

/* ── Field ────────────────────────────────────────────────────────────────── */
export const Field = ({ label, value, onChange, type = 'text', placeholder, autoFocus, rows }) => (
  <div>
    {label && <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>}
    {type === 'textarea' ? (
      <textarea rows={rows || 3} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#111827', lineHeight: 1.5 }} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />
    )}
  </div>
);

/* ── Modal Shell ──────────────────────────────────────────────────────────── */
export const ModalShell = ({ title, subtitle, onClose, children, footer, maxWidth = 520 }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} />
    <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1 }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
          <Icon name="x" size={14} color="#6B7280" />
        </button>
      </div>
      <div style={{ padding: '18px 24px' }}>{children}</div>
      {footer && <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
    </div>
  </div>
);

/* ── Avatar ───────────────────────────────────────────────────────────────── */
export const Avatar = ({ name, size = 40, color }) => {
  const bg = color || avatarColor(name);
  const fs = Math.round(size * 0.38);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px' }}>
      {initials(name)}
    </div>
  );
};

/* ── Chip / Tag ───────────────────────────────────────────────────────────── */
export const Chip = ({ label, variant = 'skill' }) => {
  const styles = {
    skill:  { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
    cert:   { background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
    gray:   { background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' },
    green:  { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' },
    amber:  { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' },
    red:    { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500, ...styles[variant] }}>
      {variant === 'cert' && <Icon name="award" size={11} color="#6D28D9" />}
      {label}
    </span>
  );
};

/* ── Skills & Certifications Modal ───────────────────────────────────────── */
export function SkillsModal({ open, onClose, currentSkills, onSave, saving, accentColor = '#2563EB' }) {
  const [skillsText, setSkillsText] = useState('');
  const [certName,   setCertName]   = useState('');
  const [certBy,     setCertBy]     = useState('');
  const [certs,      setCerts]      = useState([]);

  React.useEffect(() => {
    if (!open) return;
    const tags      = parseTags(currentSkills);
    const skillTags = tags.filter(t => !isCert(t));
    const certTags  = tags.filter(t => isCert(t)).map(t => {
      const idx = t.toLowerCase().lastIndexOf(' by ');
      return { name: t.slice(0, idx).trim(), provider: t.slice(idx + 4).trim() };
    });
    setSkillsText(skillTags.join(', '));
    setCerts(certTags);
    setCertName(''); setCertBy('');
  }, [open, currentSkills]);

  const addCert = () => {
    if (!certName.trim()) return;
    setCerts(c => [...c, { name: certName.trim(), provider: certBy.trim() }]);
    setCertName(''); setCertBy('');
  };

  const handleSave = () => {
    const skillParts = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    const certParts  = certs.map(c => c.provider ? `${c.name} by ${c.provider}` : c.name);
    onSave([...skillParts, ...certParts].join(', '));
  };

  if (!open) return null;
  const preview = skillsText.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <ModalShell title="Edit Skills & Certifications" subtitle="Skills and certifications appear as tags on your profile"
      onClose={onClose}
      footer={<><CancelBtn onClick={onClose} /><PrimaryBtn label="Save" onClick={handleSave} saving={saving} color={accentColor} /></>}>

      {/* Skills */}
      <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Icon name="tag" size={13} color={accentColor} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</span>
        </div>
        <input
          autoFocus
          value={skillsText}
          onChange={e => setSkillsText(e.target.value)}
          placeholder="Example: React, Node.js, Machine Learning, AWS…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827' }}
        />
        <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 5 }}>Comma-separated · each becomes a skill chip</div>
        {preview.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {preview.map(s => <Chip key={s} label={s} variant="skill" />)}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div style={{ background: '#FAFAFF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Icon name="award" size={13} color="#7C3AED" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certifications</span>
        </div>

        {certs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {certs.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #EDE9FE', borderRadius: 8, padding: '9px 12px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</div>
                  {c.provider && <div style={{ fontSize: 11.5, color: '#7C3AED' }}>Issued by {c.provider}</div>}
                </div>
                <GhostBtn icon="trash" color="#EF4444" onClick={() => setCerts(cs => cs.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Certification Name" value={certName} onChange={e => setCertName(e.target.value)} placeholder="AWS Cloud Practitioner" />
          <Field label="Issued By"          value={certBy}   onChange={e => setCertBy(e.target.value)}   placeholder="Amazon" />
        </div>
        <button onClick={addCert} disabled={!certName.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: certName.trim() ? '#F5F3FF' : '#F9FAFB', color: certName.trim() ? '#7C3AED' : '#D1D5DB', border: '1px solid', borderColor: certName.trim() ? '#DDD6FE' : '#E5E7EB', fontSize: 12.5, fontWeight: 500, cursor: certName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          <Icon name="plus" size={12} color={certName.trim() ? '#7C3AED' : '#D1D5DB'} />
          Add Certification
        </button>
      </div>
    </ModalShell>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────────── */
export const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
    {icon && <div style={{ marginBottom: 12, opacity: 0.4 }}><Icon name={icon} size={36} color="#9CA3AF" /></div>}
    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{title}</div>
    {sub && <div style={{ fontSize: 12.5 }}>{sub}</div>}
    {action && <div style={{ marginTop: 14 }}>{action}</div>}
  </div>
);

/* ── Status Badge ─────────────────────────────────────────────────────────── */
export const StatusBadge = ({ status }) => {
  const map = {
    pending:  { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
    accepted: { bg: '#ECFDF5', color: '#059669', label: 'Accepted' },
    approved: { bg: '#ECFDF5', color: '#059669', label: 'Approved' },
    rejected: { bg: '#FEF2F2', color: '#DC2626', label: 'Rejected' },
    open:     { bg: '#EFF6FF', color: '#2563EB', label: 'Open' },
    closed:   { bg: '#F3F4F6', color: '#6B7280', label: 'Closed' },
    active:   { bg: '#ECFDF5', color: '#059669', label: 'Active' },
  };
  const s = map[status?.toLowerCase()] || map.pending;
  return <span style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>;
};
