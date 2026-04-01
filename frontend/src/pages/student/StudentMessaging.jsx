import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { PortalSidebar, PortalNavbar } from '../../components/PortalLayout';
import { Loading, useToast, Modal } from '../../components/MessageBox';
import { getConversations, getConvMessages, sendConvMessage, startConversation, listAlumni, markAllNotifsRead } from '../../services/api';
import { STUDENT_NAV } from './_nav';
import { filterUsersByCollege, getCollegeName, getCurrentTenant } from '../../utils/tenant';


const COLORS = ['#1D4ED8','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];
const colorFor = s => COLORS[(s||'?').charCodeAt(0)%COLORS.length];
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';
const fmtDay   = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '';

// Backend returns conversation_id (not id)
const convId   = (c) => c?.conversation_id ?? c?.id ?? null;
const convName = (c) => c?.other_name || c?.title || 'Unknown';

export default function StudentMessaging() {
  const toast    = useToast();
  const location = useLocation();
  const currentTenant = getCurrentTenant();
  const myUser   = (() => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch { return null; } })();
  const myId     = myUser?.id;

  const [convs,   setConvs]   = useState([]);
  const [active,  setActive]  = useState(null);
  const [messages,setMessages]= useState([]);
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [alumni,  setAlumni]  = useState([]);
  const [selAlum, setSelAlum] = useState('');
  const [scope,   setScope]   = useState('my_college');
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadConvs = useCallback(async () => {
    try {
      const r = await getConversations();
      const list = r.data?.data || r.data || [];
      setConvs((Array.isArray(list) ? list : (list.conversations || [])).filter(Boolean));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const loadMsgs = useCallback(async (cid) => {
    if (!cid) return;
    try {
      const r = await getConvMessages(cid);
      const d = r.data?.data || r.data;
      setMessages(Array.isArray(d) ? d : (d?.messages || []));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadConvs();
    listAlumni({ limit:100 }).then(r => {
      const d = r.data?.data || r.data;
      setAlumni(filterUsersByCollege(d.alumni || d || [], scope, currentTenant));
    }).catch(()=>{});
  }, [loadConvs, scope, currentTenant]);

  // Auto-select from navigation state
  useEffect(() => {
    if (!location.state?.conversationId || convs.length === 0) return;
    const found = convs.find(c => convId(c) === location.state.conversationId);
    if (found) selectConv(found);
  }, [convs, location.state]);

  const selectConv = (c) => {
    setActive(c);
    const cid = convId(c);
    loadMsgs(cid);
    clearInterval(pollRef.current);
    if (cid) pollRef.current = setInterval(() => loadMsgs(cid), 4000);
    // Mark any unread message-type notifications as read silently
    markAllNotifsRead().catch(() => {});
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleSend = async () => {
    if (!text.trim() || !active) return;
    const cid = convId(active);
    if (!cid) { toast('Invalid conversation', 'error'); return; }
    const msgText = text.trim();
    setText('');
    setSending(true);
    const temp = { id: Date.now(), message: msgText, sender_type:'student', sender_id:myId, created_at: new Date().toISOString(), _temp:true };
    setMessages(p => [...p, temp]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 30);
    try {
      await sendConvMessage(cid, msgText);
      loadMsgs(cid);
    } catch (err) {
      setMessages(p => p.filter(m => !m._temp));
      toast(err.response?.data?.message || 'Send failed', 'error');
      setText(msgText);
    } finally { setSending(false); }
  };

  const handleNew = async () => {
    if (!selAlum) { toast('Select an alumni', 'error'); return; }
    try {
      const r = await startConversation({ other_type:'alumni', other_id: parseInt(selAlum, 10), allow_cross_college: scope === 'all_colleges' });
      const conv = r.data?.data || r.data;
      setNewOpen(false); setSelAlum('');
      await loadConvs();
      if (conv) selectConv(conv);
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  return (
    <div className="app-layout">
      <PortalSidebar navItems={STUDENT_NAV} tokenKey="token" userKey="user" loginPath="/student/login" portalLabel="Student" accentColor="#1D4ED8" />
      <div className="main-content" style={{ padding:0, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', paddingTop:'var(--header-h)' }}>
        <PortalNavbar title="Messages" userKey="user" />

        {/* Full-height chat layout below navbar */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Conversation sidebar */}
          <div style={{ width:280, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg-card)', flexShrink:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>Conversations</span>
              <button className="btn btn-primary btn-sm" style={{ background:'#1D4ED8', padding:'4px 10px', fontSize:11 }} onClick={() => setNewOpen(true)}>+ New</button>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading
                ? <div style={{ padding:20, textAlign:'center' }}><span className="spinner" /></div>
                : convs.length === 0
                  ? <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No conversations yet.</div>
                  : convs.filter(Boolean).map(c => {
                    const name = convName(c);
                    const cid  = convId(c);
                    const inits = name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)||'?';
                    return (
                      <div key={cid} onClick={() => selectConv(c)}
                        style={{ padding:'12px 16px', cursor:'pointer', background: convId(active)===cid ? 'var(--accent-light)' : 'transparent', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:colorFor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>{inits}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between' }}>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                            <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0, marginLeft:4 }}>{fmtDay(c.last_message_at||c.updated_at)}</span>
                          </div>
                          <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{c.last_message || 'Start a conversation'}</div>
                        </div>
                        {c.unread_count > 0 && <span style={{ background:'#1D4ED8', color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px', flexShrink:0 }}>{c.unread_count}</span>}
                      </div>
                    );
                  })
              }
            </div>
          </div>

          {/* Chat area */}
          {!active ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:'var(--text-muted)' }}>
              <div style={{ fontSize:40 }}>💬</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Select a conversation</div>
              <div style={{ fontSize:12 }}>Or start a new one</div>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {/* Chat header */}
              <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:colorFor(convName(active)), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>
                  {convName(active).split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)||'?'}
                </div>
                <div style={{ fontWeight:700, fontSize:14 }}>{convName(active)}</div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
                {messages.map(m => {
                  const mine = m.sender_type === 'student' && String(m.sender_id) === String(myId);
                  return (
                    <div key={m.id} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth:'70%', padding:'8px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#1D4ED8' : 'var(--bg)', color: mine ? '#fff' : 'var(--text)', fontSize:13.5, lineHeight:1.5, opacity: m._temp ? 0.7 : 1 }}>
                        {m.message || m.content}
                        <div style={{ fontSize:10, marginTop:4, opacity:0.7, textAlign:'right' }}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0, background:'var(--bg-card)' }}>
                <input className="form-input" style={{ flex:1 }} placeholder="Type a message…" value={text}
                  onChange={e=>setText(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()} />
                <button className="btn btn-primary" style={{ background:'#1D4ED8' }} onClick={handleSend} disabled={sending||!text.trim()}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        <Modal open={newOpen} title="New Conversation" onClose={() => setNewOpen(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ background:'#1D4ED8' }} onClick={handleNew}>Start Chat</button>
          </>}>
          <div className="form-group">
            <label className="form-label">Scope</label>
            <select className="form-input" value={scope} onChange={e=>setScope(e.target.value)}>
              <option value="my_college">My College</option>
              <option value="all_colleges">All Colleges</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select Alumni</label>
            <select className="form-input" value={selAlum} onChange={e=>setSelAlum(e.target.value)}>
              <option value="">— Choose an alumni —</option>
              {alumni.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}{a.company ? ` (${a.company})` : ''} - {getCollegeName(a.college_id || currentTenant)}</option>
              ))}
            </select>
          </div>
        </Modal>
      </div>
    </div>
  );
}
