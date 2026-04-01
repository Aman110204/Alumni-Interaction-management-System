'use strict';
const {
  normalizeCollegeId,
  extractCollegeFromHostname,
  getCollegeById,
} = require('../services/tenantService');

async function attachTenantContext(req, res, next) {
  try {
    const rawHost =
      req.headers['x-tenant-host'] ||
      req.headers['x-forwarded-host'] ||
      req.headers.host ||
      req.hostname ||
      '';
    const fromHostname = normalizeCollegeId(extractCollegeFromHostname(rawHost));
    const fromUser = normalizeCollegeId(req.user && req.user.college_id);
    const isLocalhost = !fromHostname;

    const fromHeader = isLocalhost ? normalizeCollegeId(req.headers['x-college-id']) : null;
    const fromBody = isLocalhost ? normalizeCollegeId(req.body && req.body.college_id) : null;
    const fromQuery = isLocalhost ? normalizeCollegeId(req.query && req.query.college_id) : null;

    let collegeId = null;
    let source = null;

    if (fromHostname) {
      const college = await getCollegeById(fromHostname);
      if (!college) {
        return res.status(404).json({ success: false, message: 'Unknown tenant subdomain' });
      }
      collegeId = college.id;
      source = 'subdomain';
    } else {
      collegeId = fromUser || fromHeader || fromBody || fromQuery || null;
      source = fromUser ? 'token' : fromHeader ? 'header' : fromBody ? 'body' : fromQuery ? 'query' : null;

      if (collegeId) {
        const college = await getCollegeById(collegeId);
        if (!college) {
          return res.status(400).json({ success: false, message: 'Invalid college_id' });
        }
        collegeId = college.id;
      }
    }

    if (fromHostname && fromUser && fromHostname !== fromUser) {
      return res.status(403).json({ success: false, message: 'Cross-tenant access denied' });
    }

    req.college_id = collegeId;
    req.tenant = {
      college_id: collegeId,
      source,
      hostname_tenant: fromHostname,
      token_tenant: fromUser,
      is_localhost: isLocalhost,
    };

    next();
  } catch (err) {
    next(err);
  }
}

function requireTenant(req, res, next) {
  if (!req.college_id) {
    return res.status(400).json({ success: false, message: 'Tenant context is required' });
  }
  next();
}

module.exports = { attachTenantContext, requireTenant };
