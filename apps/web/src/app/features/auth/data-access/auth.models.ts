export interface RegistrationInput {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  fullName: string;
  displayName: string | null;
  email: string;
  username: string;
  createdAt: string;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresAt: string;
}

export interface RegisteredAccount {
  user: RegisteredUser;
  workspace: AuthWorkspace;
}

export interface AuthenticatedAccount extends RegisteredAccount {
  tokens: AuthTokens;
}
