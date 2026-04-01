import React, { useEffect, useState } from 'react';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast } from '../../components/MessageBox';
import {
  getMyAlumniProfile, updateMyAlumniProfile, patchAlumniProfile,
  getAlumniCareerTimeline, addAlumniCareerEntryOwn,
  getMyEducation, addEducation, updateEducation, deleteEducation,
} from '../../services/api';
import Icon from '../../design/icons';
import { ModalShell, SkillsModal, Chip } from '../../design/components';
import { parseTags, isCert, initials, avatarColor, fmtDate } from '../../design/tokens';
import { ALUMNI_NAV } from './_nav';

const EMPTY_CAREER = { company: '', role: '', startDate: '', endDate: '', isCurrent: false };
const EMPTY_EDU    = { institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' };
const EMPTY_LINK   = { label: '', url: '' };

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
const SectionCard = ({ children, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
    marginBottom: 10, overflow: 'hidden', ...style,
  }}>
    {children}
  </div>
);
const SectionHeader = ({ title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{title}</div>
    {action}
  </div>
);
const SectionBody = ({ children }) => (
  <div style={{ padding: '14px 22px 20px' }}>{children}</div>
);
const EditBtn = ({ onClick, label = 'Edit' }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
    <Icon name="edit" size={13} color="#6B7280" /> {label}
  </button>
);
const Toggle = ({ on, onToggle, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <div onClick={onToggle} style={{ width: 42, height: 24, borderRadius: 12, background: on ? '#7C3AED' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
    <span style={{ fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{label}</span>
  </label>
);

/* ── link icon helper ── */
const linkIcon = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('linkedin'))  return '🔗';
  if (l.includes('github'))    return '⚡';
  if (l.includes('twitter') || l.includes('x.com')) return '🐦';
  if (l.includes('portfolio') || l.includes('website')) return '🌐';
  if (l.includes('dribbble') || l.includes('behance')) return '🎨';
  if (l.includes('resume') || l.includes('cv')) return '📄';
  return '🔗';
};

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function AlumniProfile() {
  const toast = useToast();
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [timeline,     setTimeline]     = useState([]);
  const [education,    setEducation]    = useState([]);
  const [editing,      setEditing]      = useState(false);
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [skillsOpen,   setSkillsOpen]   = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [careerOpen,   setCareerOpen]   = useState(false);
  const [careerForm,   setCareerForm]   = useState(EMPTY_CAREER);
  const [savingCareer, setSavingCareer] = useState(false);
  const [eduOpen,      setEduOpen]      = useState(false);
  const [eduForm,      setEduForm]      = useState(EMPTY_EDU);
  const [eduEditId,    setEduEditId]    = useState(null);
  const [savingEdu,    setSavingEdu]    = useState(false);
  // Links
  const [linksEditOpen,  setLinksEditOpen]  = useState(false);
  const [linksForm,      setLinksForm]      = useState([]);
  const [savingLinks,    setSavingLinks]    = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([getMyAlumniProfile(), getAlumniCareerTimeline(), getMyEducation('alumni')])
      .then(([pr, tl, ed]) => {
        const p = pr.data?.data || pr.data;
        setProfile(p);
        setForm({
          full_name: p.full_name || '', phone: p.phone || '', company: p.company || '',
          designation: p.designation || '', location: p.location || '',
          graduation_year: p.graduation_year || '', department: p.department || '',
          linkedin_url: p.linkedin_url || '', github_url: p.github_url || '',
          headline: p.headline || '',
          skills: Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || ''),
          bio: p.bio || '', available_mentorship: !!p.available_mentorship,
          available_referral: p.available_referral !== false,
        });
        setLinksForm(Array.isArray(p.profile_links) ? p.profile_links : []);
        const tlData = tl.data?.data || tl.data; setTimeline(Array.isArray(tlData) ? tlData : []);
        const edData = ed.data?.data || ed.data; setEducation(Array.isArray(edData) ? edData : []);
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadAll(); }, []);

  const handleSaveProfile  = async () => {
    setSaving(true);
    try { await updateMyAlumniProfile(form); toast('Profile saved ✓', 'success'); setEditing(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };
  const handleMentorToggle = async () => {
    const v = !profile?.available_mentorship;
    try { await patchAlumniProfile({ available_mentorship: v }); setProfile(p => ({ ...p, available_mentorship: v })); toast(`Mentoring ${v ? 'enabled' : 'disabled'} ✓`, 'success'); }
    catch { toast('Toggle failed', 'error'); }
  };
  const handleSaveSkills = async (combined) => {
    setSavingSkills(true);
    try { await updateMyAlumniProfile({ skills: combined }); toast('Skills saved ✓', 'success'); setSkillsOpen(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingSkills(false); }
  };
  const handleSaveCareer = async () => {
    setSavingCareer(true);
    try {
      await addAlumniCareerEntryOwn({ company: careerForm.company, role: careerForm.role, startDate: careerForm.startDate || undefined, endDate: careerForm.isCurrent ? undefined : (careerForm.endDate || undefined), isCurrent: careerForm.isCurrent });
      toast('Experience added ✓', 'success'); setCareerOpen(false); setCareerForm(EMPTY_CAREER); loadAll();
    } catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingCareer(false); }
  };
  const openEduAdd  = () => { setEduForm(EMPTY_EDU); setEduEditId(null); setEduOpen(true); };
  const openEduEdit = (e) => { setEduForm({ institution: e.institution || '', degree: e.degree || '', field_of_study: e.field_of_study || '', start_year: e.start_year || '', end_year: e.end_year || '' }); setEduEditId(e.id); setEduOpen(true); };
  const handleSaveEdu = async () => {
    setSavingEdu(true);
    try { if (eduEditId) await updateEducation('alumni', eduEditId, eduForm); else await addEducation('alumni', eduForm); toast('Education saved ✓', 'success'); setEduOpen(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingEdu(false); }
  };
  const handleDeleteEdu = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await deleteEducation('alumni', id); toast('Deleted'); loadAll(); }
    catch { toast('Delete failed', 'error'); }
  };

  /* Links handlers */
  const openLinksEdit = () => {
    setLinksForm(Array.isArray(profile?.profile_links) ? [...profile.profile_links] : []);
    setLinksEditOpen(true);
  };
  const addLink    = () => setLinksForm(lf => [...lf, { ...EMPTY_LINK }]);
  const removeLink = (i) => setLinksForm(lf => lf.filter((_, idx) => idx !== i));
  const updateLink = (i, field, val) => setLinksForm(lf => lf.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const handleSaveLinks = async () => {
    // Validate
    for (const l of linksForm) {
      if (!l.label.trim()) return toast('Each link must have a label', 'error');
      if (!l.url.trim())   return toast('Each link must have a URL', 'error');
      if (!/^https?:\/\/.+/.test(l.url.trim())) return toast(`Invalid URL: ${l.url}`, 'error');
    }
    setSavingLinks(true);
    try { await updateMyAlumniProfile({ profile_links: linksForm }); toast('Links saved ✓', 'success'); setLinksEditOpen(false); loadAll(); }
    catch (e) { toast(e.response?.data?.message || 'Save failed', 'error'); }
    finally { setSavingLinks(false); }
  };

  if (loading) return <div className="app-layout"><div className="main-content"><Loading /></div></div>;
  if (error)   return <div className="app-layout"><div className="main-content"><div style={{ padding: 20, background: '#FEF2F2', borderRadius: 12, color: '#DC2626' }}>{error}</div></div></div>;

  const p = profile || {};
  const tags      = parseTags(p.skills);
  const skillTags = tags.filter(t => !isCert(t));
  const certTags  = tags.filter(t =>  isCert(t));
  const avatarBg  = avatarColor(p.full_name);
  const ini       = initials(p.full_name);
  const links     = Array.isArray(p.profile_links) ? p.profile_links : [];

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user" loginPath="/alumni/login" portalLabel="Alumni" accentColor="#7C3AED" />
      <div className="main-content" style={{ maxWidth: 860, padding: '0 0 48px' }}>
        <PortalNavbar title="My Profile" userKey="alumni_user" />

        {/* ── HEADER CARD ─────────────────────────────────────────────────── */}
        {/*
          Layout fix: cover and avatar are in a single relative container.
          Content sits BELOW the header — no negative margins causing overlap.
          The avatar uses absolute positioning only within its .cover-wrapper,
          which has explicit bottom padding to make space for the avatar overflow.
        */}
        <SectionCard style={{ marginBottom: 10 }}>
          {/* Cover banner */}
          <div style={{
            position: 'relative',
            height: 130,
            background: 'linear-gradient(120deg,#5B21B6 0%,#7C3AED 50%,#A855F7 100%)',
            borderRadius: '12px 12px 0 0',
          }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                position: 'absolute', top: 12, right: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(4px)', zIndex: 2,
              }}
            >
              <Icon name="edit" size={12} color="#fff" /> Edit Profile
            </button>

            {/* Avatar — absolutely positioned at the bottom of the cover, protruding down */}
            <div style={{
              position: 'absolute', bottom: -44, left: 24, zIndex: 3,
              width: 88, height: 88, borderRadius: '50%',
              background: avatarBg, border: '4px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}>
              {ini}
            </div>
          </div>

          {/* Content area — padding-top makes space for the avatar overflow */}
          <div style={{ padding: '52px 24px 22px' }}>
            {/* Action badges — right aligned, same row as avatar space */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -40, marginBottom: 16 }}>
              <button
                onClick={handleMentorToggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  borderRadius: 20, border: '1.5px solid', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', background: 'transparent',
                  borderColor: p.available_mentorship ? '#7C3AED' : '#D1D5DB',
                  color: p.available_mentorship ? '#7C3AED' : '#9CA3AF', transition: 'all 0.2s',
                }}
              >
                <Icon name={p.available_mentorship ? 'check' : 'zap'} size={12} color={p.available_mentorship ? '#7C3AED' : '#9CA3AF'} />
                {p.available_mentorship ? 'Open to Mentoring' : 'Mentoring Off'}
              </button>
            </div>

            {/* Name, headline, meta */}
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', margin: '0 0 4px' }}>{p.full_name || '—'}</h1>
            {p.headline && <p style={{ fontSize: 14.5, color: '#374151', margin: '0 0 8px' }}>{p.headline}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
              {(p.company || p.designation) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="briefcase" size={13} color="#9CA3AF" />
                  {[p.designation, p.company].filter(Boolean).join(' at ')}
                </span>
              )}
              {p.department && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="book" size={13} color="#9CA3AF" />
                  {p.department}{p.graduation_year && ` · Class of ${p.graduation_year}`}
                </span>
              )}
              {p.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                  <Icon name="mappin" size={13} color="#9CA3AF" />
                  {p.location}
                </span>
              )}
            </div>

            {/* Built-in links (LinkedIn + GitHub) */}
            {(p.linkedin_url || p.github_url) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.linkedin_url && (
                  <a href={p.linkedin_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#EFF6FF', color: '#2563EB', fontSize: 12.5, fontWeight: 500, border: '1px solid #BFDBFE', textDecoration: 'none' }}>
                    <Icon name="linkedin" size={13} color="#2563EB" /> LinkedIn
                  </a>
                )}
                {p.github_url && (
                  <a href={p.github_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#F9FAFB', color: '#374151', fontSize: 12.5, fontWeight: 500, border: '1px solid #E5E7EB', textDecoration: 'none' }}>
                    <Icon name="github" size={13} color="#374151" /> GitHub
                  </a>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Analytics strip ── */}
        <SectionCard>
          <SectionBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {[
                { label: 'Profile views', value: '—', icon: 'profile',     color: '#7C3AED' },
                { label: 'Connections',   value: '—', icon: 'connections', color: '#2563EB' },
                { label: 'Mentorships',   value: '—', icon: 'zap',         color: '#059669' },
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
          </SectionBody>
        </SectionCard>

        {/* ── About ── */}
        <SectionCard>
          <SectionHeader title="About" action={<EditBtn onClick={() => setEditing(true)} />} />
          <SectionBody>
            {p.bio
              ? <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0 }}>{p.bio}</p>
              : <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No bio yet — click Edit Profile to add one.</div>
            }
          </SectionBody>
        </SectionCard>

        {/* ── Links section ── */}
        <SectionCard>
          <SectionHeader title="Links" action={<EditBtn onClick={openLinksEdit} label={links.length ? 'Edit' : '+ Add'} />} />
          <SectionBody>
            {links.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>
                No links added yet — click Add to include your portfolio, resume, or social profiles.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: '#F9FAFB', border: '1px solid #F3F4F6',
                      textDecoration: 'none', color: '#374151',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
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
          </SectionBody>
        </SectionCard>

        {/* ── Experience ── */}
        <SectionCard>
          <SectionHeader title="Experience" action={<EditBtn onClick={() => setCareerOpen(true)} label="+ Add" />} />
          <SectionBody>
            {timeline.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No experience added yet.</div>
            ) : (
              <div>
                {timeline.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < timeline.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="briefcase" size={20} color="#2563EB" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111827' }}>{t.role}</div>
                      <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{t.company}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        {fmtDate(t.start_date)} — {t.is_current ? 'Present' : fmtDate(t.end_date)}
                        {t.is_current && <span style={{ marginLeft: 8, background: '#F0FDF4', color: '#16A34A', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Current</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBody>
        </SectionCard>

        {/* ── Education ── */}
        <SectionCard>
          <SectionHeader title="Education" action={<EditBtn onClick={openEduAdd} label="+ Add" />} />
          <SectionBody>
            {education.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No education added yet.</div>
            ) : (
              <div>
                {education.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < education.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="book" size={20} color="#7C3AED" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111827' }}>{e.institution}</div>
                        <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{[e.degree, e.field_of_study].filter(Boolean).join(' · ')}</div>
                        {(e.start_year || e.end_year) && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{e.start_year || '?'} – {e.end_year || 'Present'}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEduEdit(e)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 6 }}><Icon name="edit" size={14} color="#6B7280" /></button>
                      <button onClick={() => handleDeleteEdu(e.id)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', borderRadius: 6 }}><Icon name="trash" size={14} color="#EF4444" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBody>
        </SectionCard>

        {/* ── Skills & Certifications ── */}
        <SectionCard>
          <SectionHeader title="Skills & Certifications" action={<EditBtn onClick={() => setSkillsOpen(true)} />} />
          <SectionBody>
            {tags.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No skills added yet — click Edit to add.</div>
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
                        return <Chip key={ct} label={by ? `${name} · ${by}` : name} variant="cert" />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionBody>
        </SectionCard>
      </div>

      {/* ── Skills Modal ── */}
      <SkillsModal open={skillsOpen} onClose={() => setSkillsOpen(false)} currentSkills={p.skills} onSave={handleSaveSkills} saving={savingSkills} accentColor="#7C3AED" />

      {/* ── Edit Profile Modal ── */}
      {editing && (
        <ModalShell title="Edit Profile" onClose={() => setEditing(false)} maxWidth={620}
          footer={<>
            <button onClick={() => setEditing(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveProfile} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { l: 'Full Name',       f: 'full_name' },
              { l: 'Headline',        f: 'headline' },
              { l: 'Phone',           f: 'phone',           t: 'tel' },
              { l: 'Location',        f: 'location' },
              { l: 'Company',         f: 'company' },
              { l: 'Designation',     f: 'designation' },
              { l: 'Department',      f: 'department' },
              { l: 'Graduation Year', f: 'graduation_year', t: 'number' },
              { l: 'LinkedIn URL',    f: 'linkedin_url',    t: 'url' },
              { l: 'GitHub URL',      f: 'github_url',      t: 'url' },
            ].map(({ l, f, t = 'text' }) => (
              <FField key={f} label={l} type={t} value={form[f] || ''} onChange={e => setForm(fr => ({ ...fr, [f]: e.target.value }))} />
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <FField label="Bio" type="textarea" value={form.bio || ''} onChange={e => setForm(fr => ({ ...fr, bio: e.target.value }))} placeholder="Tell the network about yourself…" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Toggle on={form.available_mentorship} onToggle={() => setForm(fr => ({ ...fr, available_mentorship: !fr.available_mentorship }))} label="Available for Mentorship" />
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Links Edit Modal (separate from main edit, per spec) ── */}
      {linksEditOpen && (
        <ModalShell title="Edit Links" subtitle="Add links to your portfolio, resume, or social profiles" onClose={() => setLinksEditOpen(false)} maxWidth={560}
          footer={<>
            <button onClick={() => setLinksEditOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveLinks} disabled={savingLinks} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingLinks ? 0.7 : 1 }}>{savingLinks ? 'Saving…' : 'Save Links'}</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {linksForm.length === 0 && (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No links yet. Click "+ Add Link" to add one.</div>
            )}
            {linksForm.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F9FAFB', borderRadius: 10, padding: '12px' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                  <div>
                    <Lbl>Label</Lbl>
                    <input
                      value={l.label} onChange={e => updateLink(i, 'label', e.target.value)}
                      placeholder="e.g. Portfolio"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <Lbl>URL</Lbl>
                    <input
                      value={l.url} onChange={e => updateLink(i, 'url', e.target.value)}
                      placeholder="https://..."
                      type="url"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button onClick={() => removeLink(i)} style={{ padding: '6px 8px', marginTop: 20, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', borderRadius: 6, flexShrink: 0 }}>
                  <Icon name="trash" size={15} color="#EF4444" />
                </button>
              </div>
            ))}
            <button onClick={addLink} style={{ padding: '9px', borderRadius: 8, border: '1.5px dashed #C4B5FD', background: '#F5F3FF', color: '#7C3AED', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Add Link
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Career Modal ── */}
      {careerOpen && (
        <ModalShell title="Add Experience" onClose={() => setCareerOpen(false)}
          footer={<>
            <button onClick={() => setCareerOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveCareer} disabled={savingCareer} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingCareer ? 0.7 : 1 }}>{savingCareer ? 'Saving…' : 'Add Entry'}</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FField label="Company *"  value={careerForm.company}   onChange={e => setCareerForm(f => ({ ...f, company: e.target.value }))}   placeholder="Google" />
            <FField label="Role *"     value={careerForm.role}      onChange={e => setCareerForm(f => ({ ...f, role: e.target.value }))}      placeholder="Software Engineer" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label="Start Date" type="date" value={careerForm.startDate} onChange={e => setCareerForm(f => ({ ...f, startDate: e.target.value }))} />
              {!careerForm.isCurrent && <FField label="End Date" type="date" value={careerForm.endDate} onChange={e => setCareerForm(f => ({ ...f, endDate: e.target.value }))} />}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: '#374151' }}>
              <input type="checkbox" checked={careerForm.isCurrent} onChange={e => setCareerForm(f => ({ ...f, isCurrent: e.target.checked, endDate: '' }))} />
              Currently working here
            </label>
          </div>
        </ModalShell>
      )}

      {/* ── Education Modal ── */}
      {eduOpen && (
        <ModalShell title={eduEditId ? 'Edit Education' : 'Add Education'} onClose={() => setEduOpen(false)}
          footer={<>
            <button onClick={() => setEduOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveEdu} disabled={savingEdu} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingEdu ? 0.7 : 1 }}>{savingEdu ? 'Saving…' : 'Save'}</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FField label="Institution *" value={eduForm.institution}    onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))}    placeholder="IIT Bombay" />
            <FField label="Degree"        value={eduForm.degree}         onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))}         placeholder="B.Tech" />
            <FField label="Field of Study" value={eduForm.field_of_study} onChange={e => setEduForm(f => ({ ...f, field_of_study: e.target.value }))} placeholder="Computer Science" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label="Start Year" type="number" value={eduForm.start_year} onChange={e => setEduForm(f => ({ ...f, start_year: e.target.value }))} placeholder="2018" />
              <FField label="End Year"   type="number" value={eduForm.end_year}   onChange={e => setEduForm(f => ({ ...f, end_year: e.target.value }))}   placeholder="2022" />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
