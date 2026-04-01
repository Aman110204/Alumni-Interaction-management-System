import { AUTH_COLLEGE_OPTIONS } from '../constants/collegeOptions';

function normalizeHost(hostname) {
  return String(hostname || '').trim().toLowerCase();
}

export function getTenantFromHostname(hostname = window.location.hostname) {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return null;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');
  if (parts.length < 2) {
    return null;
  }

  const candidate = parts[0];
  return AUTH_COLLEGE_OPTIONS.some(option => option.id === candidate) ? candidate : null;
}

export function isSubdomainTenantMode(hostname = window.location.hostname) {
  return !!getTenantFromHostname(hostname);
}

export function isSubdomainMode(hostname = window.location.hostname) {
  return isSubdomainTenantMode(hostname);
}

export function isLocalTenantFallback(hostname = window.location.hostname) {
  return !isSubdomainTenantMode(hostname);
}

function readStoredUser(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function normalizeCollegeId(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

export function getCurrentTenant() {
  const fromHostname = getTenantFromHostname();
  if (fromHostname) return fromHostname;

  const storedUsers = [
    readStoredUser('admin_user'),
    readStoredUser('alumni_user'),
    readStoredUser('user'),
  ];

  for (const stored of storedUsers) {
    const collegeId = normalizeCollegeId(stored?.college_id);
    if (collegeId) return collegeId;
  }

  return null;
}

export function isVisibleToTenant(item, tenant = getCurrentTenant()) {
  if (!item) return false;
  if (!tenant) return true;

  const collegeId = normalizeCollegeId(item.college_id);
  const targetColleges = Array.isArray(item.target_colleges)
    ? item.target_colleges.map(normalizeCollegeId).filter(Boolean)
    : [];

  return (
    collegeId === tenant ||
    item.is_global === true ||
    targetColleges.includes(tenant)
  );
}

export function filterTenantScoped(items, tenant = getCurrentTenant()) {
  return (Array.isArray(items) ? items : []).filter(item => isVisibleToTenant(item, tenant));
}

export function filterUsersByCollege(items, mode = 'my_college', tenant = getCurrentTenant()) {
  const list = Array.isArray(items) ? items : [];
  if (mode === 'all_colleges' || !tenant) return list;
  return list.filter(item => normalizeCollegeId(item?.college_id) === tenant);
}

export function getCollegeName(collegeId) {
  const college = AUTH_COLLEGE_OPTIONS.find(option => option.id === collegeId);
  return college ? college.name : collegeId;
}
