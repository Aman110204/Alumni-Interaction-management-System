import React, { useEffect, useState } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import Icon from '../../design/icons';
import { ModalShell, SkillsModal, Chip } from '../../design/components';
import {
  getMyStudentProfile, updateMyStudentProfile,
  getMyEducation, addEducation, updateEducation, deleteEducation,
} from '../../services/api';
import { parseTags, isCert } from '../../design/tokens';
import { STUDENT_NAV } from './_nav';

const EMPTY_EDU  = { institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' };
const EMPTY_LINK = { label: '', url: '' };
const ACCENT     = '#1D4ED8';

/* ── atoms ─────────────────────────────────────────────────────────────────── */
const Lbl = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{children}</div>
);
const FField = ({ label, value, onChange, type = 'text', placeholder, rows = 3 }) => (
  <div>
    {label && <Lbl>{label}</Lbl>}
    {type === 'textarea'
      ? <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#111827', lineHeight: 1.6, boxSizing: 'border-box' }} />
      : <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
    }
  </div>
);
const Card = ({ children, style = {} }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 10, overflow: 'hidden', ...style }}>
    {children}
  </div>
);
const CardHeader = ({ title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{title}</div>
    {action}
  </div>
);
const CardBody = ({ children }) => (
  <div style={{ padding: '14px 22px 20px' }}>{children}</div>
);
const EditBtn = ({ onClick, label = 'Edit' }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
    <Icon name="edit" size={13} color="#6B7280" /> {label}
  </button>
);

const linkIcon = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('linkedin'))  return '🔗';
  if (l.includes('github'))    return '⚡';
  if (l.includes('portfolio') || l.includes('website')) return '🌐';
  if (l.includes('resume') || l.includes('cv')) return '📄';
  if (l.includes('twitter') || l.includes('x.com')) return '🐦';
  return '🔗';
};

export default function StudentProfile() {
  const toast = useToast();
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [education,    setEducation]    = useState([]);
  const [editing,      setEditing]      = useState(false);
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [skillsOpen,   setSkillsOpen]   = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [eduOpen,      setEduOpen]      = useState(false);
  const [eduForm,      setEduForm]      = useState(EMPTY_EDU);
  const [eduEditId,    setEduEditId]    = useState(null);
  const [savingEdu,    setSavingEdu]    = useState(false);
  // Links
  const [linksEditOpen, setLinksEditOpen] = useState(false);
  const [linksForm,     setLinksForm]     = useState([]);
  const [savingLinks,   setSavingLinks]   = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([getMyStudentProfile(), getMyEducation('student')])
      .then(([pr, ed]) => {
        const p = pr.data?.data || pr.data;
        setProfile(p);
        setForm({
          full_name: p.full_name || '', phone: p.phone || '',
          department: p.department || '', year: p.year || '',
          bio: p.bio || '',
          skills: Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || ''),
          headline: p.headline || '', location: p.location || '',
          linkedin_url: p.linkedin_url || '', github_url: p.github_url || '',
          resume_url: p.resume_url || '',
        });
        setLinksForm(Array.isArray(p.profile_links) ? p.profile_links : []);
        const edData = ed.data?.data || ed.data;
        setEducation(Array.isArray(edData) ? edData : []);
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadAll(); }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try { await updateMyStudentProfile(form); toast('Profile saved ✓', 'success'); setEditing(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };
  const handleSaveSkills = async (combined) => {
    setSavingSkills(true);
    try { await updateMyStudentProfile({ skills: combined }); toast('Skills saved ✓', 'success'); setSkillsOpen(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingSkills(false); }
  };
  const openEduAdd  = () => { setEduForm(EMPTY_EDU); setEduEditId(null); setEduOpen(true); };
  const openEduEdit = (e) => {
    setEduForm({ institution: e.institution||'', degree: e.degree||'', field_of_study: e.field_of_study||'', start_year: e.start_year||'', end_year: e.end_year||'' });
    setEduEditId(e.id); setEduOpen(true);
  };
  const handleSaveEdu = async () => {
    setSavingEdu(true);
    try {
      if (eduEditId) await updateEducation('student', eduEditId, eduForm);
      else await addEducation('student', eduForm);
      toast('Education saved ✓', 'success'); setEduOpen(false); loadAll();
    } catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingEdu(false); }
  };
  const handleDeleteEdu = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await deleteEducation('student', id); toast('Deleted'); loadAll(); }
    catch { toast('Delete failed', 'error'); }
  };

  // Links
  const openLinksEdit = () => { setLinksForm(Array.isArray(profile?.profile_links) ? [...profile.profile_links] : []); setLinksEditOpen(true); };
  const addLink    = () => setLinksForm(lf => [...lf, { ...EMPTY_LINK }]);
  const removeLink = (i) => setLinksForm(lf => lf.filter((_, idx) => idx !== i));
  const updateLink = (i, field, val) => setLinksForm(lf => lf.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const handleSaveLinks = async () => {
    for (const l of linksForm) {
      if (!l.label.trim()) return toast('Each link must have a label', 'error');
      if (!l.url.trim())   return toast('Each link must have a URL', 'error');
      if (!/^https?:\/\/.+/.test(l.url.trim())) return toast(`Invalid URL: ${l.url}`, 'error');
    }
    setSavingLinks(true);
    try { await updateMyStudentProfile({ profile_links: linksForm }); toast('Links saved ✓', 'success'); setLinksEditOpen(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingLinks(false); }
  };

  if (loading) return <div className="app-layout"><div className="main-content"><Loading /></div></div>;
  if (error)   return <div className="app-layout"><div className="main-content"><div style={{ padding: 20, background: '#FEF2F2', borderRadius: 12, color: '#DC2626' }}>{error}</div></div></div>;

  const p         = profile || {};
  const inits     = (p.full_name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  const tags      = parseTags(p.skills);
  const skillTags = tags.filter(t => !isCert(t));
  const certTags  = tags.filter(t =>  isCert(t));
  const links     = Array.isArray(p.profile_links) ? p.profile_links : [];

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor={ACCENT} />
      <div className="main-content" style={{ maxWidth: 860, padding: '0 0 48px' }}>
        <PortalNavbar title="My Profile" userKey="user" />

        {/* ── HEADER CARD ─────────────────────────────────────────────────── */}
        <Card>
          {/* Cover banner — relative container, avatar absolutely positioned at its bottom edge */}
          <div style={{
            position: 'relative',
            height: 130,
            background: 'linear-gradient(135deg,#1D4ED8 0%,#2563EB 55%,#7C3AED 100%)',
            borderRadius: '12px 12px 0 0',
          }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 2,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Icon name="edit" size={12} color="#fff" /> Edit Profile
            </button>

            {/* Avatar — protrudes below cover; content area has top padding to clear it */}
            <div style={{
              position: 'absolute', bottom: -44, left: 24, zIndex: 3,
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)',
              border: '4px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 16px rgba(29,78,216,0.25)',
            }}>
              {inits}
            </div>
          </div>

          {/* Content — padding-top: 52px creates the gap for the avatar */}
          <div style={{ padding: '52px 24px 22px' }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', margin: '0 0 4px' }}>{p.full_name || '—'}</h1>
            {p.headline && <p style={{ fontSize: 14.5, color: '#374151', margin: '0 0 8px' }}>{p.headline}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
              {(p.department || p.year) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="book" size={13} color="#9CA3AF" />
                  {p.department}{p.year && ` · Year ${p.year}`}
                </span>
              )}
              {p.usn && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="profile" size={13} color="#9CA3AF" />
                  <span style={{ fontFamily: 'monospace' }}>{p.usn}</span>
                </span>
              )}
              {p.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="mappin" size={13} color="#9CA3AF" />
                  {p.location}
                </span>
              )}
            </div>

            {/* Built-in links */}
            {(p.linkedin_url || p.github_url || p.resume_url) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#EFF6FF', color: ACCENT, fontSize: 12.5, fontWeight: 500, border: '1px solid #BFDBFE', textDecoration: 'none' }}><Icon name="linkedin" size={13} color={ACCENT} /> LinkedIn</a>}
                {p.github_url   && <a href={p.github_url}   target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#F9FAFB', color: '#374151', fontSize: 12.5, fontWeight: 500, border: '1px solid #E5E7EB', textDecoration: 'none' }}><Icon name="github"   size={13} color="#374151" /> GitHub</a>}
                {p.resume_url   && <a href={p.resume_url}   target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#F0FDF4', color: '#059669', fontSize: 12.5, fontWeight: 500, border: '1px solid #A7F3D0', textDecoration: 'none' }}><Icon name="file"     size={13} color="#059669" /> Resume</a>}
              </div>
            )}
          </div>
        </Card>

        {/* ── Analytics strip ── */}
        <Card>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {[
                { label: 'Profile views',      value: '—', icon: 'profile',     color: ACCENT },
                { label: 'Connections',        value: '—', icon: 'connections', color: '#7C3AED' },
                { label: 'Search appearances', value: '—', icon: 'search',      color: '#059669' },
              ].map((item, i) => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 16px', borderRight: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={item.icon} size={14} color={item.color} />
                    <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* ── About ── */}
        <Card>
          <CardHeader title="About" action={<EditBtn onClick={() => setEditing(true)} />} />
          <CardBody>
            {p.bio
              ? <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0 }}>{p.bio}</p>
              : <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No bio yet — click Edit Profile to add one.</div>
            }
          </CardBody>
        </Card>

        {/* ── Links section ── */}
        <Card>
          <CardHeader title="Links" action={<EditBtn onClick={openLinksEdit} label={links.length ? 'Edit' : '+ Add'} />} />
          <CardBody>
            {links.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>
                No links yet — add your portfolio, resume, or social profiles.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6', textDecoration: 'none', color: '#374151', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{linkIcon(l.label)}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{l.label}</div>
                      <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 1, wordBreak: 'break-all' }}>{l.url}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>↗</span>
                  </a>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Education ── */}
        <Card>
          <CardHeader title="Education" action={<EditBtn onClick={openEduAdd} label="+ Add" />} />
          <CardBody>
            {education.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No education entries yet.</div>
            ) : (
              <div>
                {education.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < education.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="book" size={20} color={ACCENT} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111827' }}>{e.institution}</div>
                        <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{[e.degree, e.field_of_study].filter(Boolean).join(' · ')}</div>
                        {(e.start_year || e.end_year) && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{e.start_year || '?'} – {e.end_year || 'Present'}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEduEdit(e)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }}><Icon name="edit" size={14} color="#6B7280" /></button>
                      <button onClick={() => handleDeleteEdu(e.id)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }}><Icon name="trash" size={14} color="#EF4444" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Skills & Certifications ── */}
        <Card>
          <CardHeader title="Skills & Certifications" action={<EditBtn onClick={() => setSkillsOpen(true)} />} />
          <CardBody>
            {tags.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No skills or certifications yet — click Edit to add.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {skillTags.length > 0 && (
                  <div>
                    <Lbl>Skills</Lbl>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {skillTags.map(sk => <Chip key={sk} label={sk} variant="skill" />)}
                    </div>
                  </div>
                )}
                {certTags.length > 0 && (
                  <div>
                    <Lbl>Certifications</Lbl>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {certTags.map(ct => {
                        const idx  = ct.toLowerCase().lastIndexOf(' by ');
                        const name = ct.slice(0, idx).trim();
                        const by   = ct.slice(idx + 4).trim();
                        return (
                          <span key={ct} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '5px 14px', background: '#F5F3FF', color: '#6D28D9', borderRadius: 20, fontWeight: 500, border: '1px solid #DDD6FE' }}>
                            <Icon name="award" size={12} color="#7C3AED" />
                            {name}{by && <span style={{ color: '#A78BFA', fontWeight: 400, fontSize: 12 }}>· {by}</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Skills Modal ── */}
      <SkillsModal open={skillsOpen} onClose={() => setSkillsOpen(false)} currentSkills={p.skills} onSave={handleSaveSkills} saving={savingSkills} accentColor={ACCENT} />

      {/* ── Edit Profile Modal ── */}
      {editing && (
        <ModalShell title="Edit Profile" onClose={() => setEditing(false)}
          footer={<>
            <button onClick={() => setEditing(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveProfile} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Full Name',    field: 'full_name' },
              { label: 'Headline',     field: 'headline' },
              { label: 'Phone',        field: 'phone',       type: 'tel' },
              { label: 'Location',     field: 'location' },
              { label: 'Department',   field: 'department' },
              { label: 'Year',         field: 'year' },
              { label: 'LinkedIn URL', field: 'linkedin_url', type: 'url' },
              { label: 'GitHub URL',   field: 'github_url',   type: 'url' },
            ].map(({ label, field, type = 'text' }) => (
              <FField key={field} label={label} type={type} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <FField label="Resume URL" type="url" value={form.resume_url || ''} onChange={e => setForm(f => ({ ...f, resume_url: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <FField label="Bio" type="textarea" value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell the alumni network about yourself…" />
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Links Edit Modal ── */}
      {linksEditOpen && (
        <ModalShell title="Edit Links" subtitle="Add portfolio, resume, or social profile links" onClose={() => setLinksEditOpen(false)} maxWidth={560}
          footer={<>
            <button onClick={() => setLinksEditOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveLinks} disabled={savingLinks} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingLinks ? 0.7 : 1 }}>{savingLinks ? 'Saving…' : 'Save Links'}</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {linksForm.length === 0 && (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No links yet. Click "+ Add Link" below.</div>
            )}
            {linksForm.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F9FAFB', borderRadius: 10, padding: '12px' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                  <div>
                    <Lbl>Label</Lbl>
                    <input value={l.label} onChange={e => updateLink(i, 'label', e.target.value)} placeholder="e.g. Portfolio"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <Lbl>URL</Lbl>
                    <input value={l.url} onChange={e => updateLink(i, 'url', e.target.value)} placeholder="https://..." type="url"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={() => removeLink(i)} style={{ padding: '6px 8px', marginTop: 20, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, flexShrink: 0 }}>
                  <Icon name="trash" size={15} color="#EF4444" />
                </button>
              </div>
            ))}
            <button onClick={addLink} style={{ padding: '9px', borderRadius: 8, border: '1.5px dashed #BFDBFE', background: '#EFF6FF', color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Add Link
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Education Modal ── */}
      {eduOpen && (
        <ModalShell title={eduEditId ? 'Edit Education' : 'Add Education'} onClose={() => setEduOpen(false)}
          footer={<>
            <button onClick={() => setEduOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveEdu} disabled={savingEdu} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingEdu ? 0.7 : 1 }}>{savingEdu ? 'Saving…' : 'Save'}</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FField label="Institution *" value={eduForm.institution}     onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))}     placeholder="e.g. IIT Bombay" />
            <FField label="Degree"        value={eduForm.degree}          onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))}          placeholder="e.g. B.Tech" />
            <FField label="Field of Study" value={eduForm.field_of_study} onChange={e => setEduForm(f => ({ ...f, field_of_study: e.target.value }))}  placeholder="e.g. Computer Science" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label="Start Year" type="number" value={eduForm.start_year} onChange={e => setEduForm(f => ({ ...f, start_year: e.target.value }))} placeholder="2020" />
              <FField label="End Year"   type="number" value={eduForm.end_year}   onChange={e => setEduForm(f => ({ ...f, end_year: e.target.value }))}   placeholder="2024" />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
