export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface PaginatedData<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
