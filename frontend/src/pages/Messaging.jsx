import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Loading, EmptyState, useToast, Modal } from '../components/MessageBox';
import { getStudents, getAlumniList, listAcceptedConnections } from '../services/api';
import { Avatar } from '../design/components';
import { getConversations, getMessages, sendMessage, startConversation } from '../services/api';
import '../styles/main.css';
import Icon from '../design/icons';
import { StatusBadge, EmptyState as DSEmpty } from '../design/components';


// ── Helpers ───────────────────────────────────────────────────────────────────
const relTime = (ts) => {
  if (!ts) return '';
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1)    return 'just now';
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const initials = (name = '') => (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

// Backend conversation helpers
const convId = (c) => c?.conversation_id ?? c?.id ?? null;
const convName = (c) => c?.other_name || c?.title || `Conversation #${convId(c)}`;

// ── Conversation List ──────────────────────────────────────────────────────────
function ConversationList({ conversations, active, onSelect, onNew, loading }) {
  return (
    <div className="conversations-panel">
      <div className="conversations-header">
        <span>Conversations</span>
        <button
          className="btn btn-primary btn-sm"
          style={{ padding: '5px 12px', fontSize: 12 }}
          onClick={onNew}
        >+ New</button>
      </div>
      <div className="conversations-list">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No conversations yet
          </div>
        ) : (
          conversations.map(conv => {
            const name = convName(conv);
            return (
              <div
                key={convId(conv)}
                className={`conversation-item${convId(active) === convId(conv) ? ' active' : ''}`}
                onClick={() => onSelect(conv)}
              >
                <div className="conv-avatar" style={{ background: convId(conv) % 2 === 0 ? 'var(--info)' : 'var(--accent)' }}>
                  {initials(name)}
                </div>
                <div className="conv-info">
                  <div className="conv-name">{name}</div>
                  <div className="conv-preview">
                    {conv.last_message || 'No messages yet'}
                  </div>
                </div>
                <div className="conv-meta">
                  <div className="conv-time">{relTime(conv.last_message_at || conv.updated_at)}</div>
                  {(conv.unread_count > 0) && (
                    <div className="unread-badge">{conv.unread_count}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Chat Window ────────────────────────────────────────────────────────────────
function ChatWindow({ conversation, messages, onSend, loadingMsgs }) {
  const [text, setText]   = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const adminUser = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; } })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSend(text.trim());
    setText('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!conversation) {
    return (
      <div className="chat-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon="💬" title="Select a conversation" text="Choose from the left or start a new one." />
      </div>
    );
  }

  const name      = convName(conversation);
  const otherType = conversation.other_type || '';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="conv-avatar" style={{ background: 'var(--accent)' }}>
          {initials(name)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {otherType}
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {loadingMsgs ? (
          <div style={{ alignSelf: 'center', padding: 20 }}><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_type === 'admin' && String(msg.sender_id) === String(adminUser?.id);
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                {!isOwn && (
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>
                    {msg.sender_name || 'User'}
                  </div>
                )}
                <div className={`msg-bubble ${isOwn ? 'sent' : 'received'}`}>
                  {msg.message || msg.content}
                  <div className="msg-time">{fmtTime(msg.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : '➤ Send'}
        </button>
      </div>
    </div>
  );
}

// ── Start Conversation Modal ───────────────────────────────────────────────────
// Messaging is only allowed between connected users; this modal shows connected peers only.
function UserPickerModal({ open, onClose, onStart }) {
  const [type, setType] = useState('student');
  const [search, setSearch] = useState('');
  const [allConnected, setAllConnected] = useState([]);  // all accepted connections
  const [users, setUsers] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Load connected peers once when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const me = (() => { try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('alumni_user') || '{}'); } catch { return {}; } })();
    listAcceptedConnections()
      .then(r => {
        const list = r.data?.data || r.data || [];
        const peers = list
          .filter(c => c.status === 'accepted')
          .map(c => {
            const isRequester = c.requester_id === me?.id;
            return {
              id:         isRequester ? c.recipient_id   : c.requester_id,
              type:       isRequester ? c.recipient_type : c.requester_type,
              full_name:  isRequester ? c.recipient_name : c.requester_name,
              department: isRequester ? c.recipient_department : c.requester_department,
              company:    isRequester ? c.recipient_company : c.requester_company,
              designation:isRequester ? c.recipient_designation : c.requester_designation,
            };
          })
          .filter(p => p.id);
        setAllConnected(peers);
        setUsers(peers.filter(p => p.type === type));
      })
      .catch(() => toast('Failed to load connections', 'error'))
      .finally(() => setLoading(false));
  }, [open]);

  // Filter by type + search client-side (peers already trust backend)
  useEffect(() => {
    const filtered = allConnected
      .filter(p => p.type === type)
      .filter(p => !search || (p.full_name || '').toLowerCase().includes(search.toLowerCase()));
    setUsers(filtered);
    setSelUser(null);
  }, [type, search, allConnected]);

  const handleSelect = (u) => {
    if (selUser?.id === u.id) setSelUser(null);
    else setSelUser(u);
  };

  const handleStart = async () => {
    if (!selUser) return;
    try {
      await onStart({ other_id: selUser.id, other_type: selUser.type || type });
      onClose();
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to start conversation', 'error');
    }
  };

  if (!open) return null;

  const subLine = (u) => (u.type || type) === 'student' ? `${u.department || ''} · ${u.year || ''}`.trim() : `${u.company || ''} · ${u.designation || ''}`.trim() || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Start New Conversation</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label className="form-label">With</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={`btn ${type === 'student' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setType('student'); setSearch(''); setSelUser(null); }}>Student</button>
              <button className={`btn ${type === 'alumni' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setType('alumni'); setSearch(''); setSelUser(null); }}>Alumni</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Name, department, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {allConnected.filter(p => p.type === type).length === 0
                ? <span>You have no accepted <strong>{type}</strong> connections yet.<br /><span style={{ fontSize: 12 }}>You can only message connected users.</span></span>
                : 'No matching users found. Try a different search.'}
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {users.slice(0, 15).map((u) => (
                <div key={u.id} className={`user-row ${selUser?.id === u.id ? 'selected' : ''}`} onClick={() => handleSelect(u)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}>
                  <Avatar name={u.full_name || u.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subLine(u)}</div>
                  </div>
                  {selUser?.id === u.id && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color="#fff" /></div>}
                </div>
              ))}
            </div>
          )}
          {selUser && (
            <div style={{ padding: 12, borderTop: '1px solid var(--border-lite)', background: 'var(--bg)', marginTop: 12, borderRadius: '0 0 12px 12px' }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>Messaging {selUser.name} ({subLine(selUser)})</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStart} disabled={!selUser || loading}>
            {loading ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Main Messaging Page ────────────────────────────────────────────────────────
export default function Messaging() {
  const toast    = useToast();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [active,        setActive]        = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [newConvOpen,   setNewConvOpen]   = useState(false);

  // Poll conversations every 10s
  const loadConversations = useCallback(async () => {
    try {
      const r = await getConversations();
      const d = r.data?.data || r.data;
      setConversations((Array.isArray(d) ? d : d.conversations || []).filter(Boolean));

    } catch { /* silently fail */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Auto-select conversation from navigation state (from ManageAlumni/ManageStudents)
  useEffect(() => {
    if (location.state?.conversationId && conversations.length > 0) {
    const found = conversations.find(c => convId(c) === parseInt(location.state.conversationId));
      if (found) setActive(found);
    }
  }, [conversations, location.state]);

  // Load messages when active changes
  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    setMessages([]);
    getMessages(convId(active))
      .then(r => {
        const d = r.data?.data || r.data;
        setMessages(Array.isArray(d) ? d : d.messages || []);
      })
      .catch(() => toast('Failed to load messages', 'error'))
      .finally(() => setLoadingMsgs(false));
  }, [active]);

  // Poll messages every 4s when a conversation is open
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(async () => {
      try {
        const r = await getMessages(convId(active));
        const d = r.data?.data || r.data;
        setMessages(Array.isArray(d) ? d : d.messages || []);
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [active]);

  const handleSend = async (text) => {
    if (!active) return;
    try {
      await sendMessage(convId(active), text);
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: text,
        sender_type: 'admin',
        created_at: new Date().toISOString(),
      }]);
      loadConversations();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send message', 'error');
    }
  };

  const handleStart = async (data) => {
    const r = await startConversation(data);
    const conv = r.data?.data || r.data;
    await loadConversations();
    setActive(conv);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Messaging" />

        <div className="page-title">
          <div className="section-title">Admin Messaging</div>
          <div className="section-sub">Communicate with students and alumni</div>
        </div>

        <div className="messaging-layout" style={{ height: "calc(100vh - var(--header-h) - 160px)" }}>
          <ConversationList
            conversations={conversations}
            active={active}
            onSelect={setActive}
            onNew={() => setNewConvOpen(true)}
            loading={loadingConvs}
          />
          <ChatWindow
            conversation={active}
            messages={messages}
            onSend={handleSend}
            loadingMsgs={loadingMsgs}
          />
        </div>
      </div>

      <UserPickerModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onStart={handleStart}
      />
    </div>
  );
}
