export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SOLD_OUT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ValidationErrorDetail {
  code?: string;
  expected?: string;
  received?: string;
  path: (string | number)[];
  message: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code: ApiErrorCode;
    details?: ValidationErrorDetail[] | unknown;
    path?: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
