export type UserRole = 'superadmin' | 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface BandInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string; // base64 data URL
  role: string;  // user's role in this band
}

export interface AuthResponse {
  token: string;
  user: User;
  bands: BandInfo[];
}

export interface SelectBandResponse {
  token: string;
  user: User;
  band: BandInfo;
}

export interface MeResponse {
  user: User;
  band: BandInfo | null;
}

export interface UserPayload {
  username: string;
  displayName?: string;
  password: string;
  role: UserRole;
}

export interface UserUpdate {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  isActive: boolean;
}
