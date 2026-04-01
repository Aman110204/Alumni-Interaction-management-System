import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alumniRegister } from '../../services/api';
import '../../styles/main.css';
import { AUTH_COLLEGE_OPTIONS } from '../../constants/collegeOptions';
import { getCollegeName, getTenantFromHostname, isLocalTenantFallback, isSubdomainTenantMode } from '../../utils/tenant';

const BRANCHES = [
  "Computer Science (CSE)",
  "Information Science (ISE)",
  "Electronics & Communication (ECE)",
  "Electrical & Electronics (EEE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
  "Robotics",
  "Biotechnology",
  "Chemical Engineering",
  "Aerospace Engineering"
];

export default function AlumniRegister() {
  const navigate = useNavigate();
  const tenantFromHost = getTenantFromHostname();
  const manualCollegeSelection = isLocalTenantFallback();
  const subdomainTenantMode = isSubdomainTenantMode();
  const [form, setForm] = useState({ fullName:'', email:'', password:'', confirm_password:'', company:'', designation:'', location:'', graduationYear:'', department:'', phone:'', college_id: tenantFromHost || '' });
  const [colleges] = useState(AUTH_COLLEGE_OPTIONS);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const inp = k => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.fullName||!form.email||!form.password||!form.college_id) { setError('Name, email, password and college are required.'); return; }
    if (form.password !== form.confirm_password)     { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)                    { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await alumniRegister({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        company: form.company,
        designation: form.designation,
        location: form.location,
        graduationYear: form.graduationYear,
        department: form.department,
        phone: form.phone,
        ...(subdomainTenantMode ? {} : { college_id: form.college_id }),
      });
      navigate('/alumni/login', { state:{ registered:true } });
    } catch (err) { setError(err.response?.data?.message || 'Registration failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page" style={{ background:'linear-gradient(135deg,#064E3B 0%,#059669 55%,#10B981 100%)' }}>
      <div className="login-card" style={{ maxWidth:560 }}>
        <div className="login-logo">
          <div className="login-logo-mark" style={{ color:'#059669' }}>Gully Connect</div>
          <div className="login-logo-sub">Gully Network</div>
        </div>
        <div className="login-title">Join as Alumni</div>
        <div className="login-sub">Your profile will be reviewed before activation</div>
        {error && <div className="login-error">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label" htmlFor="fullName">Full Name *</label>
              <input id="fullName" className="form-input" placeholder="Priya Sharma" {...inp('fullName')} />
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label" htmlFor="college_id">{manualCollegeSelection ? 'Select College *' : 'College'}</label>
              {manualCollegeSelection ? (
                <select id="college_id" className="form-input" {...inp('college_id')}>
                  <option value="">Select College</option>
                  {colleges.map(college => (
                    <option key={college.id} value={college.id}>
                      {college.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input id="college_id" className="form-input" value={getCollegeName(form.college_id)} readOnly />
              )}
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label" htmlFor="email">Email Address *</label>
              <input id="email" className="form-input" type="email" placeholder="you@company.com" {...inp('email')} autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password *</label>
              <input id="password" className="form-input" type="password" placeholder="Min. 6 characters" {...inp('password')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm_password">Confirm Password *</label>
              <input id="confirm_password" className="form-input" type="password" placeholder="Repeat password" {...inp('confirm_password')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="company">Company</label>
              <input id="company" className="form-input" placeholder="Google, Amazon…" {...inp('company')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="designation">Designation</label>
              <input id="designation" className="form-input" placeholder="Software Engineer" {...inp('designation')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="department">Department</label>
              <select
                id="department"
                className="form-input"
                {...inp('department')}
              >
                <option value="">Select Branch</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="graduationYear">Graduation Year</label>
              <input id="graduationYear" className="form-input" type="number" placeholder="2020" min="1980" max="2030" {...inp('graduationYear')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="location">Location</label>
              <input id="location" className="form-input" placeholder="Bangalore, India" {...inp('location')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone</label>
              <input id="phone" className="form-input" placeholder="+91 9876543210" {...inp('phone')} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:11, marginTop:4, background:'#059669', border:'none' }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width:16,height:16,borderWidth:2 }} /> Submitting…</> : 'Submit Registration'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-muted)' }}>
          Already have an account? <a href="/alumni/login" style={{ color:'#059669', fontWeight:600 }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
