import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { useToast } from '../../components/MessageBox';
import { getConversations, getConvMessages, sendConvMessage, startConversation, listStudents, markAllNotifsRead } from '../../services/api';
import { ALUMNI_NAV } from './_nav';
import Icon from '../../design/icons';
import { avatarColor } from '../../design/tokens';
import { filterUsersByCollege, getCollegeName, getCurrentTenant } from '../../utils/tenant';

/* ── Helpers ────────────────────────────────────────────────────────── */
const relTime = ts => {
  if (!ts) return '';
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
};
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';
const inits   = (n='') => (n||'?').split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2)||'?';

const convId   = c => c?.conversation_id ?? c?.id ?? null;
const convName = c => c?.other_name || c?.title || `Conversation #${convId(c)}`;

/* ── New Conversation Modal ─────────────────────────────────────────── */
function NewConvModal({ open, onClose, onStart, accentColor = '#7C3AED' }) {
  const toast    = useToast();
  const location = useLocation();
  const currentTenant = getCurrentTenant();
  const [students,  setStudents]  = useState([]);
  const [query,     setQuery]     = useState('');
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [scope,     setScope]     = useState('my_college');

  useEffect(() => {
    if (!open) return;
    setSelected(null); setQuery('');
    setLoading(true);
    listStudents({ limit: 100 })
      .then(r => { const d = r.data?.data || r.data; setStudents(filterUsersByCollege(d.students || d || [], scope, currentTenant)); })
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [open, scope, currentTenant]);

  // Filter as user types
  const filtered = students.filter(s => {
    if (!s.is_approved) return false;
    const q = query.toLowerCase();
    return !q || (s.full_name||'').toLowerCase().includes(q) || (s.department||'').toLowerCase().includes(q);
  });

  const handleStart = async () => {
    if (!selected) { toast('Select a student first', 'error'); return; }
    setSaving(true);
    try {
      await onStart({ other_id: selected.id, other_type: 'student', allow_cross_college: scope === 'all_colleges' });
      onClose();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not start conversation', 'error');
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Conversation</span>
          <button className="modal-close" onClick={onClose}>
            <Icon name="x" size={14} color="currentColor" />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>
            Select a student to start a conversation with
          </p>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <Icon name="search" size={14} color="var(--text-faint)"
              style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input className="form-input" style={{ paddingLeft:34 }}
              placeholder="Search students by name or department…"
              value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom:12 }}>
            <select className="form-input" value={scope} onChange={e => setScope(e.target.value)}>
              <option value="my_college">My College</option>
              <option value="all_colleges">All Colleges</option>
            </select>
          </div>

          {/* List */}
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', maxHeight:260, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:24, textAlign:'center' }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                No students found{query ? ` matching "${query}"` : ''}
              </div>
            ) : filtered.map(s => {
              const isSelected = selected?.id === s.id;
              const bg = avatarColor(s.full_name);
              const sub = [s.department, s.year ? `Year ${s.year}` : null].filter(Boolean).join(' · ');
              return (
                <div key={s.id} onClick={() => setSelected(isSelected ? null : s)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', cursor:'pointer',
                    borderBottom:'1px solid var(--border-lite)',
                    background: isSelected ? `${accentColor}12` : 'transparent',
                    transition:'background 0.1s' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:bg, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {inits(s.full_name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text)' }}>{s.full_name}</div>
                    {sub && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>{sub}</div>}
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{getCollegeName(s.college_id || currentTenant)}</div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, transition:'all 0.15s',
                    border:`2px solid ${isSelected ? accentColor : 'var(--border)'}`,
                    background: isSelected ? accentColor : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {isSelected && <Icon name="check" size={11} color="#fff" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection preview */}
          {selected && (
            <div style={{ marginTop:10, padding:'9px 13px', borderRadius:8, display:'flex', alignItems:'center',
              gap:8, background:`${accentColor}10`, border:`1px solid ${accentColor}30` }}>
              <Icon name="check" size={13} color={accentColor} />
              <span style={{ fontSize:13, color:accentColor, fontWeight:500 }}>
                Starting chat with <strong>{selected.full_name}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: accentColor }}
            onClick={handleStart} disabled={saving || !selected}>
            {saving ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function AlumniMessaging() {
  const toast    = useToast();
  const location = useLocation();
  const user = (() => { try { return JSON.parse(localStorage.getItem('alumni_user')||'null'); } catch { return null; } })();
  const ACCENT = '#7C3AED';

  const [convs,    setConvs]    = useState([]);
  const [active,   setActive]   = useState(null);
  const [msgs,     setMsgs]     = useState([]);
  const [text,     setText]     = useState('');
  const [loadC,    setLoadC]    = useState(true);
  const [loadM,    setLoadM]    = useState(false);
  const [sending,  setSending]  = useState(false);
  const [newOpen,  setNewOpen]  = useState(false);
  const bottomRef  = useRef(null);

  const loadConvs = useCallback(async () => {
    try {
      const r = await getConversations();
      const d = r.data?.data || r.data;
      setConvs((Array.isArray(d) ? d : (d?.conversations || [])).filter(Boolean));
    } catch { /* silent */ } finally { setLoadC(false); }
  }, []);

  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 10000);
    return () => clearInterval(t);
  }, [loadConvs]);

  // Auto-select conversation from navigation state (e.g. from Students page)
  useEffect(() => {
    if (!location.state?.conversationId || convs.length === 0) return;
    const found = convs.find(c => convId(c) === location.state.conversationId);
    if (found) setActive(found);
  }, [convs, location.state]);

  useEffect(() => {
    if (!active) return;
    const cid = convId(active);
    if (!cid) return;
    setLoadM(true); setMsgs([]);
    getConvMessages(cid)
      .then(r => { const d = r.data?.data || r.data; setMsgs(Array.isArray(d) ? d : (d?.messages || [])); })
      .catch(() => toast('Failed to load messages', 'error'))
      .finally(() => setLoadM(false));
    // Silently clear message-type notifications when a conversation is opened
    markAllNotifsRead().catch(() => {});
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const cid = convId(active);
    if (!cid) return;
    const t = setInterval(async () => {
      try { const r = await getConvMessages(cid); const d = r.data?.data || r.data; setMsgs(Array.isArray(d) ? d : (d?.messages || [])); } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const doSend = async () => {
    if (!text.trim() || !active || sending) return;
    const cid = convId(active);
    if (!cid) { toast('Invalid conversation', 'error'); return; }
    const msg = text.trim(); setText(''); setSending(true);
    setMsgs(p => [...p, { id:Date.now(), message:msg, sender_id:user?.id, sender_type:'alumni', created_at:new Date().toISOString(), _temp:true }]);
    try {
      await sendConvMessage(cid, msg); loadConvs();
    } catch (err) {
      setMsgs(p => p.filter(m => !m._temp));
      toast(err.response?.data?.message || 'Failed to send', 'error');
      setText(msg);
    } finally { setSending(false); }
  };

  const handleStartConv = async (data) => {
    const r    = await startConversation(data);
    const conv = r.data?.data || r.data;
    await loadConvs();
    if (conv) setActive(conv);
  };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={ALUMNI_NAV} tokenKey="alumni_token" userKey="alumni_user" loginPath="/alumni/login" portalLabel="Alumni" accentColor={ACCENT} />
      <div className="main-content" style={{ paddingBottom:0 }}>
        <PortalNavbar title="Messages" userKey="alumni_user" />
        <div style={{ marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', margin:0 }}>Messages</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Chat with students and admin</p>
        </div>

        <div className="messaging-layout">
          {/* Sidebar */}
          <div className="conversations-panel">
            <div className="conversations-header">
              <span>Conversations</span>
              <button className="btn btn-primary btn-sm" style={{ padding:'5px 12px', fontSize:12, background:ACCENT }}
                onClick={() => setNewOpen(true)}>
                <Icon name="plus" size={12} color="#fff" /> New
              </button>
            </div>
            <div className="conversations-list">
              {loadC ? (
                <div style={{ padding:24, textAlign:'center' }}><div className="spinner" /></div>
              ) : convs.length === 0 ? (
                <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                  No conversations yet.<br />
                  <button onClick={() => setNewOpen(true)} style={{ marginTop:10, background:'none', border:'none', color:ACCENT, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Start one →
                  </button>
                </div>
              ) : convs.map(c => {
                const name = convName(c);
                const cid  = convId(c);
                const bg   = avatarColor(name);
                return (
                  <div key={cid} className={`conversation-item${active && convId(active)===cid?' active':''}`} onClick={() => setActive(c)}>
                    <div className="conv-avatar" style={{ background:bg }}>{inits(name)}</div>
                    <div className="conv-info">
                      <div className="conv-name">{name}</div>
                      <div className="conv-preview">{c.last_message || 'No messages yet'}</div>
                    </div>
                    <div className="conv-meta">
                      <div className="conv-time">{relTime(c.last_message_at || c.updated_at)}</div>
                      {c.unread_count > 0 && <div className="unread-badge">{c.unread_count}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat panel */}
          <div className="chat-panel">
            {!active ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:10, color:'var(--text-muted)' }}>
                <Icon name="messages" size={40} color="var(--border)" />
                <div style={{ fontSize:15, fontWeight:600, color:'var(--text)' }}>Select a conversation</div>
                <div style={{ fontSize:13 }}>Or <button onClick={() => setNewOpen(true)} style={{ background:'none', border:'none', color:ACCENT, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>start a new one</button></div>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <div className="conv-avatar" style={{ background: avatarColor(convName(active)) }}>{inits(convName(active))}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{convName(active)}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>
                      {active.other_type || 'Student'}
                    </div>
                  </div>
                </div>
                <div className="chat-messages">
                  {loadM ? (
                    <div style={{ alignSelf:'center', padding:20 }}><div className="spinner" /></div>
                  ) : msgs.length === 0 ? (
                    <div style={{ alignSelf:'center', fontSize:13, color:'var(--text-muted)', padding:24 }}>No messages yet</div>
                  ) : msgs.map(m => {
                    const isOwn = m.sender_type === 'alumni' && String(m.sender_id) === String(user?.id);
                    return (
                      <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:isOwn?'flex-end':'flex-start' }}>
                        {!isOwn && <div style={{ fontSize:10.5, color:'var(--text-muted)', marginBottom:3, paddingLeft:4 }}>{m.sender_name || 'Student'}</div>}
                        <div className={`msg-bubble ${isOwn?'sent':'received'}`} style={isOwn ? { background:ACCENT } : {}}>
                          {m.message || m.content}
                          <div className="msg-time">{fmtTime(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="chat-input-bar">
                  <textarea className="chat-input" placeholder="Type a message…" value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); }}}
                    rows={1} />
                  <button className="btn btn-primary" style={{ flexShrink:0, background:ACCENT }}
                    onClick={doSend} disabled={!text.trim()||sending}>
                    {sending
                      ? <span className="spinner" style={{ width:14, height:14, borderWidth:2, borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} />
                      : <Icon name="send" size={15} color="#fff" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NewConvModal open={newOpen} onClose={() => setNewOpen(false)} onStart={handleStartConv} accentColor={ACCENT} />
    </div>
  );
}
