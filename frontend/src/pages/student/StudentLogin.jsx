import React from 'react';
import { PortalLogin } from '../../components/PortalLayout';
import { studentLogin } from '../../services/api';

export default function StudentLogin() {
  return (
    <PortalLogin
      title="Student Portal"
      subtitle="Sign in to connect with alumni and explore opportunities"
      loginFn={studentLogin}
      tokenKey="token"
      userKey="user"
      redirectPath="/student/dashboard"
      registerPath="/student/register"
      accentColor="#2563EB"
      bgClass="student-login"
    />
  );
}
