'use strict';

/**
 * All API responses follow the same envelope:
 *   { success: boolean, message: string, data: any }
 *
 * Paginated responses also include:
 *   { success, message, data: [], total, page, limit, pages }
 */

function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, { rows, total, page, limit }, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data:  rows,
    total: parseInt(total, 10),
    page:  parseInt(page, 10),
    limit: parseInt(limit, 10),
    pages: Math.ceil(parseInt(total, 10) / parseInt(limit, 10)) || 1,
  });
}

function error(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Access denied') {
  return error(res, message, 403);
}

function serverError(res, message = 'Internal server error') {
  return error(res, message, 500);
}

module.exports = { success, created, paginated, error, notFound, unauthorized, forbidden, serverError };
