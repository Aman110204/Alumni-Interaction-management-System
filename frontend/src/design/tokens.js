// Design tokens — SaaS neutral system
export const tokens = {
  colors: {
    primary: '#4f46e5',
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  radius: {
    md: '12px',
    sm: '8px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    h1: { fontSize: '1.875rem', lineHeight: 1.2, fontWeight: 700 },
    h2: { fontSize: '1.5rem', lineHeight: 1.3, fontWeight: 600 },
    h3: { fontSize: '1.125rem', lineHeight: 1.3, fontWeight: 600 },
    body: { fontSize: '0.875rem', lineHeight: 1.5 },
    muted: { fontSize: '0.75rem', lineHeight: 1.25, color: '#94a3b8' },
  }
};

export const isCert = t => t.toLowerCase().includes(' by ');
export const parseTags = raw => {
  if (!raw) return [];
  return (typeof raw === 'string' ? raw.split(',') : raw).map(s => s.trim()).filter(Boolean);
};
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
export const fmtDay = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
export const initials = name => (name||'?').split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2) || '?';
export const avatarColor = name => {
  const colors = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];
  return colors[(name||'?').charCodeAt(0) % colors.length];
};
