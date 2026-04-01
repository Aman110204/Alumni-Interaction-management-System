import React from 'react';
import ConnectionsPage from '../ConnectionsPage';
import { ALUMNI_NAV } from './_nav';

export default function ConnectionRequests() {
  return (
    <ConnectionsPage
      portalRole="alumni"
      navItems={ALUMNI_NAV}
      tokenKey="alumni_token"
      userKey="alumni_user"
      loginPath="/alumni/login"
      portalLabel="Alumni"
      accentColor="#7C3AED"
    />
  );
}
