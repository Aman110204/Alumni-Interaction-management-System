import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentRegister } from '../../services/api';
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

export default function StudentRegister() {
  const navigate = useNavigate();
  const tenantFromHost = getTenantFromHostname();
  const manualCollegeSelection = isLocalTenantFallback();
  const subdomainTenantMode = isSubdomainTenantMode();
  const [form, setForm] = useState({ full_name:'', email:'', password:'', confirm_password:'', department:'', year:'', usn:'', phone:'', college_id: tenantFromHost || '' });
  const [colleges] = useState(AUTH_COLLEGE_OPTIONS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inp = (k) => ({ value: form[k], onChange: e => setForm(p=>({...p,[k]:e.target.value})) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name||!form.email||!form.password||!form.college_id) { setError('Name, email, password and college are required.'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      // Pass fields directly — api.js normalises fullName, usn, department, year
      await studentRegister({
        fullName:   form.full_name,
        email:      form.email,
        password:   form.password,
        usn:        form.usn,
        department: form.department,
        year:       form.year,
        phone:      form.phone,
        ...(subdomainTenantMode ? {} : { college_id: form.college_id }),
      });
      navigate('/student/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page portal-student">
      <div className="login-card" style={{ maxWidth: 540 }}>
        <div className="login-logo">
          <div className="login-logo-mark">Gully Connect</div>
          <div className="login-logo-sub">Student Portal</div>
        </div>
        <div className="login-title">Create Account</div>
        <div className="login-sub">Registration requires admin approval before you can log in</div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label" htmlFor="full_name">Full Name *</label>
              <input id="full_name" className="form-input" placeholder="Rahul Sharma" {...inp('full_name')} />
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
              <input id="email" className="form-input" type="email" placeholder="you@college.edu" {...inp('email')} autoComplete="email" />
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
              <label className="form-label" htmlFor="department">Branch / Department</label>
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
              <label className="form-label" htmlFor="year">Current Year</label>
              <select id="year" className="form-input" {...inp('year')}>
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="usn">USN / Roll Number</label>
              <input id="usn" className="form-input mono" placeholder="21CS001" {...inp('usn')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input id="phone" className="form-input" placeholder="+91 9876543210" {...inp('phone')} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%',justifyContent:'center',padding:11,marginTop:4 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}} /> Creating account…</> : 'Create Account'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-muted)' }}>
          Already have an account? <a href="/student/login" style={{ color:'var(--accent)',fontWeight:600 }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
