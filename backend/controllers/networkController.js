'use strict';
const networkService = require('../services/networkService');
const { success } = require('../utils/response');

/* ─── GET /api/network/groups ─────────────────────────────────────────────── */
const getNetworkGroups = async (req, res, next) => {
  try {
    const { groupType, scope } = req.query;
    const data = await networkService.getNetworkGroups({
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      groupType: groupType || 'college',
      scope: scope || 'my_college',
    });
    return success(res, data);
  } catch (err) { next(err); }
};

/* ─── GET /api/network/group/:groupType/:groupKey ─────────────────────────── */
const getGroupMembers = async (req, res, next) => {
  try {
    const { groupType, groupKey } = req.params;
    const { search, department, batch, page, scope } = req.query;

    // TASK 1 DEBUG — log every inbound request
    const data = await networkService.getGroupMembers({
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      groupType,
      groupKey: decodeURIComponent(groupKey),
      search,
      department,
      batch,
      page: parseInt(page, 10) || 1,
      scope: scope || 'my_college',
    });
    return success(res, data);
  } catch (err) { next(err); }
};

/* ─── GET /api/network/search?q= ─────────────────────────────────────────── */
const searchNetwork = async (req, res, next) => {
  try {
    const { q, scope, groupType, groupKey } = req.query;
    if (!q || !q.trim()) return res.json({ data: [] });

    const data = await networkService.searchNetwork({
      q: q.trim(),
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      scope: scope || 'my_college',
      groupType,
      groupKey: groupKey ? decodeURIComponent(groupKey) : undefined,
    });
    return res.json({ data });
  } catch (err) { next(err); }
};

/* ─── Legacy: GET /api/network ───────────────────────────────────────────── */
const getNetwork = async (req, res, next) => {
  try {
    const { page, limit, search, department, company, scope } = req.query;    const data = await networkService.getNetworkUsers({
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      department,
      company,
      scope: scope || 'my_college',
    });
    return success(res, data);
  } catch (err) { next(err); }
};

/* ─── Legacy: GET /api/network/grouped ──────────────────────────────────── */
const getNetworkGrouped = async (req, res, next) => {
  try {
    const { groupBy, scope, search, department } = req.query;    const data = await networkService.getNetworkGrouped({
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      groupBy: groupBy || 'college',
      scope: scope || 'my_college',
      search,
      department,
    });
    return success(res, { groups: data, groupBy: groupBy || 'college' });
  } catch (err) { next(err); }
};

/* ─── GET /api/network/hierarchy ────────────────────────────────────────── */
const getNetworkHierarchy = async (req, res, next) => {
  try {
    const { scope, searchField, batch, department, course, company, sort } = req.query;
    const data = await networkService.getNetworkHierarchy({
      userId: req.user.id,
      userRole: req.user.role,
      collegeId: req.college_id,
      scope: scope || 'my_college',
      searchField,
      batch,
      department,
      course,
      company,
      sort,
    });
    return success(res, data);
  } catch (err) { next(err); }
};

module.exports = {
  getNetwork,
  getNetworkGrouped,
  getNetworkGroups,
  getGroupMembers,
  searchNetwork,
  getNetworkHierarchy,
};
