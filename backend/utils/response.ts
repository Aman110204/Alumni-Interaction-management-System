import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function success<T>(res: Response, data: T = {} as T, message = 'Success', statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T = {} as T, message = 'Created successfully'): Response {
  return success(res, data, message, 201);
}

export function paginated<T>(
  res: Response,
  { rows, total, page, limit }: { rows: T[]; total: number; page: number; limit: number },
  message = 'Success'
): Response {
  return res.status(200).json({
    success: true,
    message,
    data: rows,
    total: parseInt(String(total), 10),
    page: parseInt(String(page), 10),
    limit: parseInt(String(limit), 10),
    pages: Math.ceil(parseInt(String(total), 10) / parseInt(String(limit), 10)) || 1,
  });
}

export function error(res: Response, message = 'An error occurred', statusCode = 400, errors: unknown = null): Response {
  const body: Record<string, unknown> = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

export function notFound(res: Response, message = 'Resource not found'): Response {
  return error(res, message, 404);
}

export function unauthorized(res: Response, message = 'Unauthorized'): Response {
  return error(res, message, 401);
}

export function forbidden(res: Response, message = 'Access denied'): Response {
  return error(res, message, 403);
}

export function serverError(res: Response, message = 'Internal server error'): Response {
  return error(res, message, 500);
}
