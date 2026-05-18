export interface RegistrationPayload {
  email: string;
  name: string;
  rollNo: string;
  githubUsername: string;
  accessCode: string;
}

export interface RegisterResponse {
  clientId: string;
  clientSecret: string;
  accessCode?: string;
  localFallback?: boolean;
}

export interface AuthPayload {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientId: string;
  clientSecret: string;
}

export interface AuthResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  expires_in?: number;
  localFallback?: boolean;
}

export interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
}
