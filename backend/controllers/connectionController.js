'use strict';
const connectionService = require('../services/connectionService');
const { success, created, error } = require('../utils/response');

const listRequests = async (req, res, next) => {
  try {
    const rawConnections = await connectionService.listMyConnectionRequests(req.user.id, req.user.role, req.college_id);
    const connections = connectionService.addConnectionMatchFlags(rawConnections, req.user.id, req.user.role);
    const grouped = connectionService.listMyGroupedConnections(connections, req.user.id, req.user.role);
    return success(res, {
      connections,
      pending: grouped.pending,
      classmates: grouped.classmates,
      batchmates: grouped.batchmates,
      others: grouped.others,
      counts: {
        pending: grouped.pending.length,
        classmates: grouped.classmates.length,
        batchmates: grouped.batchmates.length,
        others: grouped.others.length,
        accepted: grouped.classmates.length + grouped.batchmates.length + grouped.others.length,
      },
    });
  } catch (err) { next(err); }
};

const listIncoming = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const all = await connectionService.listMyConnectionRequests(req.user.id, req.user.role, req.college_id);
    const filtered = all.filter(r => r.recipient_id === req.user.id && r.recipient_type === req.user.role && r.status === 'pending');
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return success(res, { connections: paginated, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) { next(err); }
};

const listOutgoing = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const all = await connectionService.listMyConnectionRequests(req.user.id, req.user.role, req.college_id);
    const filtered = all.filter(r => r.requester_id === req.user.id && r.requester_type === req.user.role && r.status === 'pending');
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return success(res, { connections: paginated, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) { next(err); }
};

const listAccepted = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const all = await connectionService.listMyConnectionRequests(req.user.id, req.user.role, req.college_id);
    const filtered = all.filter(r => r.status === 'accepted');
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return success(res, { connections: paginated, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) { next(err); }
};

const createRequest = async (req, res, next) => {
  try {
    const otherId   = parseInt(req.body.other_id, 10);
    const otherType = req.body.other_type;
    if (!otherId || isNaN(otherId) || !otherType) {
      return error(res, 'other_id and other_type are required');
    }
    const data = await connectionService.createConnectionRequest({
      requesterId:   req.user.id,
      requesterType: req.user.role,
      collegeId: req.college_id,
      recipientId:   otherId,
      recipientType: otherType,
      message:       req.body.message,
      allowCrossCollege: req.body.allow_cross_college === true || req.body.allow_cross_college === 'true',
    });
    return created(res, data, data.already_connected ? 'Users are already connected' : 'Connection request sent');
  } catch (err) { next(err); }
};

const respond = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!requestId || isNaN(requestId)) return error(res, 'Invalid connection request ID');
    const status = String(req.body.status || '').toLowerCase();
    const data = await connectionService.respondToConnectionRequest(requestId, req.user.id, req.user.role, req.college_id, status);
    return success(res, data, `Connection request ${status}`);
  } catch (err) { next(err); }
};

const accept = async (req, res, next) => {
  req.body = { ...req.body, status: 'accepted' };
  return respond(req, res, next);
};

const reject = async (req, res, next) => {
  req.body = { ...req.body, status: 'rejected' };
  return respond(req, res, next);
};

const getStatus = async (req, res, next) => {
  try {
    const otherId   = parseInt(req.params.otherId, 10);
    const otherType = req.params.otherType;
    if (!otherId || isNaN(otherId) || !otherType) return error(res, 'Invalid participant');
    const data = await connectionService.getConnectionStatus(req.user.id, req.user.role, req.college_id, otherId, otherType);
    return success(res, data || null);
  } catch (err) { next(err); }
};

module.exports = { listRequests, listIncoming, listOutgoing, listAccepted, createRequest, respond, accept, reject, getStatus };
