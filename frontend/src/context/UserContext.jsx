import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Fix 11: Global user context — prevents repeated profile data reloads across pages
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState({ admin: null, alumni: null, student: null });

  useEffect(() => {
    const admin   = (() => { try { return JSON.parse(localStorage.getItem('admin_user')  || 'null'); } catch { return null; } })();
    const alumni  = (() => { try { return JSON.parse(localStorage.getItem('alumni_user') || 'null'); } catch { return null; } })();
    const student = (() => { try { return JSON.parse(localStorage.getItem('user')        || 'null'); } catch { return null; } })();
    setUsers({ admin, alumni, student });
  }, []);

  const setUser = useCallback((role, userData) => {
    const keyMap = { admin: 'admin_user', alumni: 'alumni_user', student: 'user' };
    if (userData) localStorage.setItem(keyMap[role], JSON.stringify(userData));
    else localStorage.removeItem(keyMap[role]);
    setUsers(prev => ({ ...prev, [role]: userData }));
  }, []);

  const clearUser = useCallback((role) => setUser(role, null), [setUser]);
  const getUser   = useCallback((role) => users[role], [users]);

  return (
    <UserContext.Provider value={{ users, setUser, clearUser, getUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(role) {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return role ? ctx.getUser(role) : ctx;
}

export default UserContext;
