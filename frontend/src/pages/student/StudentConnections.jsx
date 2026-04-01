import React from 'react';
import ConnectionsPage from '../ConnectionsPage';
import { STUDENT_NAV } from './_nav';

export default function StudentConnections() {
  return (
    <ConnectionsPage
      portalRole="student"
      navItems={STUDENT_NAV}
      tokenKey="token"
      userKey="user"
      loginPath="/student/login"
      portalLabel="Student"
      accentColor="#2563EB"
    />
  );
}
