import { User, UserRole } from './auth.model';
import { Pagination } from './api.model';

export interface UserSummary {
  total: number;
  attendees: number;
  organizers: number;
  admins: number;
}

export interface PaginatedUsersResponse {
  data: User[];
  pagination: Pagination;
  summary: UserSummary;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}
