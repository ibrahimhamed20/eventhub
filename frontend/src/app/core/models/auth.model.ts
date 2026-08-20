export type UserRole = 'attendee' | 'organizer' | 'admin';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'attendee' | 'organizer';
}

export interface LoginRequest {
  email: string;
  password: string;
}
