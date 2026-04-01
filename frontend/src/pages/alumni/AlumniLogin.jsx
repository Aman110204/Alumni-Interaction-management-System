import React from 'react';
import { PortalLogin } from '../../components/PortalLayout';
import { alumniLogin } from '../../services/api';

export default function AlumniLogin() {
  return (
    <PortalLogin
      title="Gully Network"
      subtitle="Sign in to post jobs, mentor students and give referrals"
      loginFn={alumniLogin}
      tokenKey="alumni_token"
      userKey="alumni_user"
      redirectPath="/alumni/dashboard"
      registerPath="/alumni/register"
      accentColor="#7C3AED"
      bgClass="alumni-login"
    />
  );
}
