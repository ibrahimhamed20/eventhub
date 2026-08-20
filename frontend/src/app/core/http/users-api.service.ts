import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ListUsersParams,
  PaginatedUsersResponse,
  UpdateUserRoleRequest,
} from '../models/user.model';
import { User, UserRole } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/users`;

  listUsers(params: ListUsersParams = {}): Observable<PaginatedUsersResponse> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<PaginatedUsersResponse>(this.baseUrl, { params: httpParams });
  }

  getUserById(id: number): Observable<User> {
    return this.http
      .get<{ user: User }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.user));
  }

  updateUserRole(id: number, role: UserRole): Observable<User> {
    const payload: UpdateUserRoleRequest = { role };
    return this.http
      .patch<{ user: User }>(`${this.baseUrl}/${id}/role`, payload)
      .pipe(map((res) => res.user));
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
