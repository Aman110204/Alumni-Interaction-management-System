import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loading, useToast } from '../components/MessageBox';
import Icon from '../design/icons';
import { StatusBadge, ModalShell, Field, PrimaryBtn, CancelBtn } from '../design/components';
import {
  getFullProfile, requestConnection, getConnectionStatus, startConversation,
  requestMentorship, getMyMentorshipRequests, requestReferral, getAlumniCompanies,
  getAlumniMutuals, sendIntroMessage,
} from '../services/api';
import { getCurrentTenant } from '../utils/tenant';
import { initials, avatarColor, fmtDate } from '../design/tokens';

const S = {
  // FIX: Use relative positioning for page wrapper, no absolute overlapping content
  page:       { background: '#F3F4F6', minHeight: '100vh', paddingBottom: 56 },
  // Cover band is part of normal document flow
  coverBand:  { height: 160, background: 'linear-gradient(120deg,#1D4ED8 0%,#7C3AED 60%,#A855F7 100%)', position: 'relative' },
  container:  { maxWidth: 1100, margin: '0 auto', padding: '0 20px' },
  // Header card uses negative margin-top to let avatar overlap cover — but only avatar, not text content
  headerCard: { background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 16, padding: '0 28px 24px', position: 'relative', marginTop: -30 },
  avatar: (bg) => ({ width: 100, height: 100, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: '#fff', border: '4px solid #fff', marginTop: -52, boxShadow: '0 2px 12px rgba(0,0,0,0.14)', flexShrink: 0 }),
  name:       { fontSize: 23, fontWeight: 800, color: '#111827', margin: '10px 0 2px', letterSpacing: '-0.4px' },
  headline:   { fontSize: 14.5, color: '#374151', marginBottom: 4 },
  meta:       { fontSize: 12.5, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  metaChip:   { display: 'flex', alignItems: 'center', gap: 4 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: '1.5px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  card:       { background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 12, overflow: 'hidden' },
  cardTitle:  { fontSize: 16, fontWeight: 800, color: '#111827', padding: '16px 22px 0', marginBottom: 8 },
  cardBody:   { padding: '0 22px 18px' },
  expItem:    { display: 'flex', gap: 14, padding: '10px 0' },
  expIcon:    { width: 44, height: 44, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  expContent: { flex: 1 },
  expTitle:   { fontSize: 14, fontWeight: 700, color: '#111827' },
  expSub:     { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  groupItem:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' },
  groupName:  { fontSize: 13.5, fontWeight: 700, color: '#111827' },
  groupCount: { fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 20 },
  badgePurple:{ background: '#F3E8FF', color: '#7C3AED', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeBlue:  { background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  // FIX: Back button with proper arrow icon styling, top-left placement
  backBtn:    { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transition: 'background 0.15s' },
};

function Section({ title, children }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const toast      = useToast();
  const tenant     = getCurrentTenant();
  const userType   = new URLSearchParams(location.search).get('type') || 'alumni';

  // Detect if this is the logged-in user's own profile
  const meAlumni  = (() => { try { return JSON.parse(localStorage.getItem('alumni_user') || 'null'); } catch { return null; } })();
  const meStudent = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const me = meAlumni || meStudent;
  const myRole = meAlumni ? 'alumni' : 'student';
  const isOwnProfile = me && String(me.id) === String(userId) && myRole === userType;

  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [connStatus,    setConnStatus]    = useState(null);
  const [connecting,    setConnecting]    = useState(false);
  const [mentorOpen,    setMentorOpen]    = useState(false);
  const [mentorMsg,     setMentorMsg]     = useState('');
  const [mentorSending, setMentorSending] = useState(false);
  const [mentorStatus,  setMentorStatus]  = useState(null);
  const [refOpen,       setRefOpen]       = useState(false);
  const [refCompanies,  setRefCompanies]  = useState([]);
  const [refCompany,    setRefCompany]    = useState('');
  const [refJobTitle,   setRefJobTitle]   = useState('');
  const [refMsg,        setRefMsg]        = useState('');
  const [refSending,    setRefSending]    = useState(false);
  const [introOpen,     setIntroOpen]     = useState(false);
  const [introMsg,      setIntroMsg]      = useState('');
  const [introSending,  setIntroSending]  = useState(false);
  const [introSent,     setIntroSent]     = useState(false);
  const [mutuals,       setMutuals]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, connRes] = await Promise.allSettled([
        getFullProfile(userId, userType),
        getConnectionStatus(userType, userId),
      ]);
      if (profRes.status === 'fulfilled') setProfile(profRes.value.data?.data || profRes.value.data);
      else toast(profRes.reason?.response?.data?.message || 'Failed to load profile', 'error');
      if (connRes.status === 'fulfilled') setConnStatus(connRes.value.data?.data?.status || null);
      if (userType === 'alumni') {
        try {
          const mr = await getMyMentorshipRequests();
          const existing = (mr.data?.data || mr.data || []).find(r => String(r.alumni_id) === String(userId));
          if (existing) setMentorStatus(existing.status);
        } catch {}
        // Load mutual connections & common attributes
        try {
          const mu = await getAlumniMutuals(userId);
          setMutuals(mu.data?.data || mu.data || null);
        } catch {}
      }
    } finally { setLoading(false); }
  }, [userId, userType]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await requestConnection({ other_id: parseInt(userId), other_type: userType });
      toast('Connection request sent', 'success'); setConnStatus('pending');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
    finally { setConnecting(false); }
  };

  const handleMessage = async () => {
    if (connStatus !== 'accepted') { toast('Connect first to send messages', 'error'); return; }
    try {
      await startConversation({ other_id: parseInt(userId), other_type: userType });
      navigate(location.pathname.startsWith('/alumni') ? '/alumni/messages' : '/student/messages');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
  };

  const handleMentorshipRequest = async () => {
    setMentorSending(true);
    try {
      await requestMentorship({ alumni_id: parseInt(userId), message: mentorMsg });
      toast('Mentorship request sent', 'success'); setMentorStatus('pending'); setMentorOpen(false); setMentorMsg('');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
    finally { setMentorSending(false); }
  };

  const openReferralModal = async () => {
    if (connStatus !== 'accepted') { toast('Connect first to request a referral', 'error'); return; }
    try {
      const r = await getAlumniCompanies(userId);
      const list = r.data?.data?.companies || r.data?.companies || [];
      setRefCompanies(list); setRefCompany(list[0] || ''); setRefOpen(true);
    } catch { toast('Failed to load companies', 'error'); }
  };

  const handleReferralRequest = async () => {
    if (!refCompany || !refJobTitle.trim()) { toast('Select company and enter job title', 'error'); return; }
    setRefSending(true);
    try {
      await requestReferral({ alumni_id: parseInt(userId), company: refCompany, job_title: refJobTitle.trim(), message: refMsg.trim() || undefined });
      toast('Referral request sent', 'success'); setRefOpen(false); setRefJobTitle(''); setRefMsg('');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
    finally { setRefSending(false); }
  };

  const handleSendIntro = async () => {
    if (!introMsg.trim()) { toast('Write a message first', 'error'); return; }
    setIntroSending(true);
    try {
      await sendIntroMessage({ alumni_id: parseInt(userId), message: introMsg.trim() });
      toast('Intro sent', 'success'); setIntroSent(true); setIntroOpen(false); setIntroMsg('');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
    finally { setIntroSending(false); }
  };

  if (loading) return <div style={S.page}><div style={{ ...S.container, paddingTop: 60 }}><Loading /></div></div>;
  if (!profile) return (
    <div style={S.page}><div style={S.container}>
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Profile not found</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>This account may be inactive or not exist.</div>
        <button style={{ ...S.btnOutline, marginTop: 20 }} onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div></div>
  );

  const { basic = {}, about = null, links = [], experience = [], education = [], skills = [], connections = {}, groups = {}, referrals = {}, mentorship = [] } = profile || {};
  const bg = avatarColor(basic.full_name);
  const ini = initials(basic.full_name);
  const isSameCollege = basic.college_id === tenant;
  const isConnected = connStatus === 'accepted';
  const isPending   = connStatus === 'pending';
  const isStudent   = !location.pathname.startsWith('/alumni');

  // Own profile → show Edit button; other's profile → show Connect/Message/Mentorship/Referral
  const ActionButtons = () => {
    if (isOwnProfile) {
      // Navigate to own profile edit page
      const editPath = myRole === 'alumni' ? '/alumni/profile' : '/student/profile';
      return (
        <button style={{ ...S.btnPrimary, background: '#374151' }} onClick={() => navigate(editPath)}>
          <Icon name="edit" size={14} color="#fff" /> Edit Profile
        </button>
      );
    }
    return (
      <>
        <ConnBtn />
        {basic?.available_mentorship && isStudent && <MentorBtn />}
        {basic?.available_referral && isStudent && <ReferralBtn />}
        <MessageBtn />
        {basic.linkedin_url && (
          <a href={basic.linkedin_url} target="_blank" rel="noreferrer" style={{ ...S.btnOutline, textDecoration: 'none' }}>
            <Icon name="link" size={13} color="#374151" /> LinkedIn
          </a>
        )}
      </>
    );
  };

  const ConnBtn = () => {
    if (isConnected) return <span style={{ ...S.btnOutline, cursor: 'default', color: '#16A34A', borderColor: '#86EFAC' }}>✓ Connected</span>;
    if (isPending)   return <span style={{ ...S.btnOutline, cursor: 'default', color: '#92400E', borderColor: '#FCD34D' }}>⏳ Pending</span>;
    return <button style={S.btnPrimary} onClick={handleConnect} disabled={connecting}><Icon name="plus" size={14} color="#fff" />{connecting ? 'Sending…' : 'Connect'}</button>;
  };

  const MentorBtn = () => {
    if (mentorStatus === 'pending')  return <span style={{ ...S.btnOutline, cursor: 'default', color: '#92400E', borderColor: '#FCD34D' }}>⏳ Mentorship Pending</span>;
    if (mentorStatus === 'accepted') return <span style={{ ...S.btnOutline, cursor: 'default', color: '#16A34A', borderColor: '#86EFAC' }}>✓ Mentoring</span>;
    if (mentorStatus === 'rejected') return <span style={{ ...S.btnOutline, cursor: 'default', color: '#9CA3AF' }}>Mentorship Declined</span>;
    return <button style={{ ...S.btnOutline, borderColor: '#8B5CF6', color: '#7C3AED' }} onClick={() => setMentorOpen(true)}><Icon name="zap" size={14} color="#7C3AED" /> Mentorship</button>;
  };

  const ReferralBtn = () => {
    if (!isConnected) return <span title="Connect first" style={{ ...S.btnOutline, cursor: 'not-allowed', opacity: 0.5 }}><Icon name="briefcase" size={14} color="#9CA3AF" /> Request Referral</span>;
    return <button style={{ ...S.btnOutline, borderColor: '#2563EB', color: '#2563EB' }} onClick={openReferralModal}><Icon name="briefcase" size={14} color="#2563EB" /> Request Referral</button>;
  };

  const MessageBtn = () => {
    if (isConnected) return <button style={S.btnOutline} onClick={handleMessage}><Icon name="message" size={14} color="#374151" /> Message</button>;
    return <button style={{ ...S.btnOutline, opacity: introSent ? 0.55 : 1, cursor: introSent ? 'not-allowed' : 'pointer' }} onClick={() => !introSent && setIntroOpen(true)}><Icon name="message" size={14} color="#374151" />{introSent ? 'Intro Sent' : 'Send Intro'}</button>;
  };

  return (
    <>
      <div style={S.page}>
        {/* Cover band with back button overlaid inside it — no absolute positioning over content */}
        <div style={S.coverBand}>
          <div style={{ ...S.container, paddingTop: 16 }}>
            <button
              style={S.backBtn}
              onClick={() => navigate(-1)}
              onMouseEnter={e => e.currentTarget.style.background = '#fff'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}
            >
              {/* ← Arrow icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M10 3L5 8L10 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
        </div>
        <div style={S.container}>
          {/* Header card */}
          <div style={S.headerCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={S.avatar(bg)}>{ini}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ActionButtons />
                </div>
                {!isOwnProfile && !isConnected && isStudent && !isPending && (
                  <div style={{ fontSize: 12.5, color: '#6B7280', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 12px' }}>
                    💡 Connect to unlock <strong>messaging</strong> and <strong>referral requests</strong>.
                  </div>
                )}
              </div>
            </div>
            <div style={S.name}>{basic.full_name}</div>
            {basic.headline && <div style={S.headline}>{basic.headline}</div>}
            {(basic.company || basic.designation) && (
              <div style={{ fontSize: 13.5, color: '#374151', marginTop: 2, fontWeight: 600 }}>
                {basic.designation}{basic.designation && basic.company ? ' · ' : ''}{basic.company}
              </div>
            )}
            <div style={S.meta}>
              {basic.college_name    && <span style={S.metaChip}><Icon name="building"   size={13} color="#9CA3AF" /> {basic.college_name}</span>}
              {basic.batch           && <span style={S.metaChip}><Icon name="calendar"   size={13} color="#9CA3AF" /> Batch of {basic.batch}</span>}
              {!basic.batch && basic.graduation_year && <span style={S.metaChip}><Icon name="calendar" size={13} color="#9CA3AF" /> Class of {basic.graduation_year}</span>}
              {basic.location        && <span style={S.metaChip}><Icon name="location"   size={13} color="#9CA3AF" /> {basic.location}</span>}
              {basic.department      && <span style={S.metaChip}><Icon name="graduation" size={13} color="#9CA3AF" /> {basic.department}</span>}
              <span style={{ ...S.metaChip, fontWeight: 700, color: '#2563EB' }}>
                <Icon name="users" size={13} color="#2563EB" /> {connections.count || 0} connection{(connections.count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {!isSameCollege             && <span style={S.badgePurple}>Cross-college</span>}
              {basic.available_mentorship && <span style={S.badgeBlue}>Open to Mentor</span>}
              {basic.available_referral   && <span style={{ ...S.badgeBlue, background: '#F0FDF4', color: '#16A34A' }}>Open to Refer</span>}
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>

            {/* LEFT: main sections */}
            <div>
              {/* Sections always rendered — empty ones show fallback text */}
              <Section title="About">
                {about
                  ? <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0 }}>{about}</p>
                  : <p style={{ fontSize: 13.5, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No bio added yet.</p>
                }
              </Section>
              {links.length > 0 && (
                <Section title="Links">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6', textDecoration: 'none', color: '#374151' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                      >
                        <span style={{ fontSize: 16 }}>🔗</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{l.label}</div>
                          <div style={{ fontSize: 11.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>↗</span>
                      </a>
                    ))}
                  </div>
                </Section>
              )}
              <Section title="Career History">
                {experience.length === 0
                  ? <p style={{ fontSize: 13.5, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No career history added yet.</p>
                  : <div style={{ position: 'relative', paddingLeft: 4 }}>
                      <div style={{ position: 'absolute', left: 21, top: 12, bottom: 12, width: 2, background: 'linear-gradient(to bottom, #2563EB30, #2563EB70, #2563EB30)', borderRadius: 2 }} />
                      {experience.map((e, i) => (
                        <div key={e.id || i} style={{ display: 'flex', gap: 16, paddingTop: i === 0 ? 0 : 16, paddingBottom: i < experience.length - 1 ? 16 : 0, borderBottom: i < experience.length - 1 ? '1px solid #F9FAFB' : 'none', position: 'relative' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: e.is_current ? '#EFF6FF' : '#F9FAFB', border: `2px solid ${e.is_current ? '#2563EB' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                            <Icon name="briefcase" size={18} color={e.is_current ? '#2563EB' : '#9CA3AF'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{e.role}</div>
                              {e.is_current && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#DBEAFE', color: '#2563EB', fontWeight: 700 }}>Current</span>}
                            </div>
                            <div style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, marginTop: 2 }}>{e.company}</div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                              {e.start_date ? fmtDate(e.start_date) : ''}
                              {e.start_date ? ' – ' : ''}
                              {e.is_current ? 'Present' : (e.end_date ? fmtDate(e.end_date) : '')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </Section>
              <Section title="Education">
                {education.length === 0
                  ? <p style={{ fontSize: 13.5, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No education added yet.</p>
                  : education.map((e, i) => (
                    <div key={e.id || i} style={{ ...S.expItem, borderBottom: i < education.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <div style={S.expIcon}><Icon name="graduation" size={20} color="#7C3AED" /></div>
                      <div style={S.expContent}>
                        <div style={S.expTitle}>{e.institution}</div>
                        {e.degree && <div style={S.expSub}>{e.degree}{e.field_of_study ? ` · ${e.field_of_study}` : ''}</div>}
                        <div style={S.expSub}>{e.start_year || ''}{e.start_year && e.end_year ? ' – ' : ''}{e.end_year || ''}</div>
                      </div>
                    </div>
                  ))}
                }
              </Section>
              <Section title="Skills">
                {skills.length === 0
                  ? <p style={{ fontSize: 13.5, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No skills added yet.</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {skills.map((s, i) => <span key={i} style={{ background: '#F3F4F6', color: '#374151', padding: '5px 13px', borderRadius: 20, fontSize: 12.5, fontWeight: 600 }}>{s}</span>)}
                    </div>
                }
              </Section>
              {(referrals.made?.length > 0 || referrals.given?.length > 0) && (
                <Section title="Referrals">
                  {(referrals.made || referrals.given || []).map((r, i, arr) => (
                    <div key={r.id || i} style={{ ...S.expItem, borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <div style={S.expContent}>
                        <div style={S.expTitle}>{r.job_title} at {r.company}</div>
                        {r.alumni_name  && <div style={S.expSub}>Requested from {r.alumni_name}</div>}
                        {r.student_name && <div style={S.expSub}>Requested by {r.student_name}</div>}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </Section>
              )}
              {mentorship.length > 0 && (
                <Section title="Mentorship">
                  {mentorship.map((m, i) => (
                    <div key={m.id || i} style={{ ...S.expItem, borderBottom: i < mentorship.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <div style={S.expContent}>
                        {m.alumni_name   && <div style={S.expTitle}>{m.alumni_name}</div>}
                        {m.student_name  && <div style={S.expTitle}>{m.student_name}</div>}
                        {m.message       && <div style={{ ...S.expSub, fontStyle: 'italic' }}>"{m.message}"</div>}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </Section>
              )}
            </div>

            {/* RIGHT: sidebar */}
            <div>
              {(groups.batch || groups.company || groups.college) && (
                <Section title="Groups">
                  {groups.batch && (
                    <div style={S.groupItem} onClick={() => navigate(`/alumni/network?group=batch`)}>
                      <div><div style={S.groupName}>{groups.batch.label}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{groups.batch.count} members</div></div>
                      <span style={S.groupCount}>{groups.batch.count}</span>
                    </div>
                  )}
                  {groups.company && basic.company && (
                    <div style={S.groupItem} onClick={() => navigate(`/alumni/network?group=company`)}>
                      <div><div style={S.groupName}>{groups.company.label}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{groups.company.count} at this company</div></div>
                      <span style={S.groupCount}>{groups.company.count}</span>
                    </div>
                  )}
                  {groups.college && (
                    <div style={{ ...S.groupItem, borderBottom: 'none' }} onClick={() => navigate(`/alumni/network?group=college`)}>
                      <div><div style={S.groupName}>{groups.college.label}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{groups.college.count} from this college</div></div>
                      <span style={S.groupCount}>{groups.college.count}</span>
                    </div>
                  )}
                </Section>
              )}
              {(connections.count || 0) > 0 && (
                <Section title="Connections">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 13, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{connections.count}</div>
                      <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>
                        {connections.count === 1 ? 'connection' : 'connections'}
                      </div>
                    </div>
                  </div>
                </Section>
              )}

              {/* ── Mutual Connections & Common Attributes ─────────── */}
              {mutuals && userType === 'alumni' && (
                <Section title="You & This Person">
                  {/* Common attributes */}
                  {mutuals.common_attributes && mutuals.common_attributes.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>In Common</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {mutuals.common_attributes.map(attr => {
                          const cfg = {
                            same_department: { color: '#7C3AED', bg: '#F5F3FF', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
                            same_batch:      { color: '#2563EB', bg: '#EFF6FF', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                            same_company:    { color: '#D97706', bg: '#FFFBEB', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                            same_skills:     { color: '#059669', bg: '#ECFDF5', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                            same_college:    { color: '#0891B2', bg: '#ECFEFF', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
                          }[attr.type] || { color: '#6B7280', bg: '#F3F4F6', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
                          return (
                            <div key={attr.type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: cfg.bg }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2"><path d={cfg.icon}/></svg>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{attr.label}</span>
                                <span style={{ fontSize: 11.5, color: '#6B7280', marginLeft: 5 }}>{attr.value}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Mutual connections list */}
                  {mutuals.mutual_connections && mutuals.mutual_connections.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {mutuals.mutual_connections_count} Mutual Connection{mutuals.mutual_connections_count !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {mutuals.mutual_connections.slice(0, 5).map(m => {
                          const inits = (m.full_name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
                          const COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];
                          const bg = COLORS[(m.full_name || '?').charCodeAt(0) % COLORS.length];
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{inits}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</div>
                                {(m.department || m.company) && <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.department || m.company}</div>}
                              </div>
                            </div>
                          );
                        })}
                        {mutuals.mutual_connections_count > 5 && (
                          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>+{mutuals.mutual_connections_count - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  {(!mutuals.common_attributes?.length && !mutuals.mutual_connections?.length) && (
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No common connections yet.</p>
                  )}
                </Section>
              )}
              {basic.college_name && (
                <Section title="College">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="building" size={20} color="#2563EB" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{basic.college_name}</div>
                      {basic.department && <div style={{ fontSize: 12.5, color: '#6B7280' }}>{basic.department}</div>}
                    </div>
                  </div>
                </Section>
              )}
              {(basic.linkedin_url || basic.github_url) && (
                <Section title="Links">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {basic.linkedin_url && <a href={basic.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="linkedin" size={14} color="#2563EB" /> LinkedIn</a>}
                    {basic.github_url   && <a href={basic.github_url}   target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="github"   size={14} color="#374151" /> GitHub</a>}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </div>
      </div>

      {mentorOpen && (
        <ModalShell title="Request Mentorship" subtitle={`Ask ${basic?.full_name} to mentor you`} onClose={() => { setMentorOpen(false); setMentorMsg(''); }} footer={<><CancelBtn onClick={() => { setMentorOpen(false); setMentorMsg(''); }} /><PrimaryBtn label="Send Request" onClick={handleMentorshipRequest} saving={mentorSending} icon="zap" /></>}>
          <Field label="Why do you want mentorship? (optional)" type="textarea" value={mentorMsg} onChange={e => setMentorMsg(e.target.value)} placeholder="Describe your goals…" />
          <p style={{ fontSize: 12.5, color: '#6B7280', marginTop: 8, marginBottom: 0 }}>You can request mentorship without being connected first.</p>
        </ModalShell>
      )}

      {refOpen && (
        <ModalShell title="Request Referral" subtitle={`Ask ${basic?.full_name} for a referral`} onClose={() => { setRefOpen(false); setRefJobTitle(''); setRefMsg(''); }} footer={<><CancelBtn onClick={() => { setRefOpen(false); setRefJobTitle(''); setRefMsg(''); }} /><PrimaryBtn label="Send Referral Request" onClick={handleReferralRequest} saving={refSending} icon="briefcase" disabled={!refCompany || !refJobTitle.trim()} /></>}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Company <span style={{ color: '#DC2626' }}>*</span></label>
            {refCompanies.length === 0 ? <p style={{ fontSize: 13, color: '#DC2626' }}>No companies found for this alumni.</p>
              : <select value={refCompany} onChange={e => setRefCompany(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13.5, background: '#fff' }}>{refCompanies.map(c => <option key={c} value={c}>{c}</option>)}</select>}
          </div>
          <Field label="Job Title / Role *" value={refJobTitle} onChange={e => setRefJobTitle(e.target.value)} placeholder="e.g. Software Engineer Intern" required />
          <Field label="Message (optional)" type="textarea" value={refMsg} onChange={e => setRefMsg(e.target.value)} placeholder="Briefly describe your background…" />
        </ModalShell>
      )}

      {introOpen && (
        <ModalShell title="Send Intro Message" subtitle="One intro message allowed before connecting" onClose={() => { setIntroOpen(false); setIntroMsg(''); }} footer={<><CancelBtn onClick={() => { setIntroOpen(false); setIntroMsg(''); }} /><PrimaryBtn label="Send Intro" onClick={handleSendIntro} saving={introSending} icon="message" disabled={!introMsg.trim()} /></>}>
          <Field label="Your intro message (max 500 chars)" type="textarea" value={introMsg} onChange={e => setIntroMsg(e.target.value.slice(0, 500))} placeholder="Hi! I'd love to connect…" />
          <p style={{ fontSize: 12, color: introMsg.length >= 480 ? '#DC2626' : '#9CA3AF', textAlign: 'right', marginTop: 4 }}>{introMsg.length}/500</p>
          <p style={{ fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>💬 Full messaging unlocks after connection is accepted.</p>
        </ModalShell>
      )}
    </>
  );
}
