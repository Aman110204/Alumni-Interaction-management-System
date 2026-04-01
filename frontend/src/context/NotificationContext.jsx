import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { getNotifUnreadCount } from '../services/api';

const NotificationContext = createContext(null);

// Returns the token that actually matches the current page path —
// the same logic pickToken() uses in api.js. Must stay in sync.
function getActiveToken() {
  const path = window.location.pathname;
  if (path.startsWith('/admin'))  return localStorage.getItem('admin_token')  || null;
  if (path.startsWith('/alumni')) return localStorage.getItem('alumni_token') || null;
  if (path.startsWith('/student'))return localStorage.getItem('token')        || null;
  return null;
}

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const state = useRef({
    timer:     null,
    inflight:  false,
    destroyed: false,
  });

  const pollRef = useRef(null);
  pollRef.current = async function poll() {
    const s = state.current;
    if (s.destroyed || s.inflight) return;

    // Use path-aware token check — matches exactly what api.js sends
    const token = getActiveToken();

    if (!token) {
      setUnreadCount(0);
      // Schedule retry — user might log in and path will change
      if (!s.destroyed) s.timer = setTimeout(() => pollRef.current(), 5000);
      return;
    }

    s.inflight = true;
    try {
      const r = await getNotifUnreadCount();
      if (!s.destroyed) {
        const d = r.data?.data || r.data;
        setUnreadCount(d?.count ?? d ?? 0);
      }
    } catch (err) {
      // On 401 the Axios interceptor handles redirect — just stop polling here
      const status = err?.response?.status;
      if (status === 401) {
        // Token is invalid/expired — stop polling, interceptor will redirect
        if (!s.destroyed) {
          s.inflight = false;
          return; // Do NOT schedule next poll — redirect is coming
        }
      }
    } finally {
      s.inflight = false;
      if (!s.destroyed) {
        s.timer = setTimeout(() => pollRef.current(), 30000);
      }
    }
  };

  useEffect(() => {
    const s = state.current;
    s.destroyed = false;

    pollRef.current();

    return () => {
      s.destroyed = true;
      s.inflight  = false;
      clearTimeout(s.timer);
      s.timer = null;
    };
  }, []);

  const markRefresh = useCallback(() => {
    const s = state.current;
    if (s.destroyed) return;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => pollRef.current(), 1000);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, markRefresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}

export default NotificationContext;
