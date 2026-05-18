import type { AuthPayload, AuthResponse, Notification, RegistrationPayload, RegisterResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5174/evaluation-service';

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function createFallbackRegistration(payload: RegistrationPayload): RegisterResponse {
  return {
    clientId: `local-${payload.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
    clientSecret: `local-secret-${Math.random().toString(36).slice(2, 10)}`,
    localFallback: true
  };
}

function createFallbackAuth(): AuthResponse {
  return {
    token: `local-token-${Math.random().toString(36).slice(2, 12)}`,
    localFallback: true
  };
}

export async function registerUser(payload: RegistrationPayload): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        roll_no: payload.rollNo,
        github_username: payload.githubUsername,
        access_code: payload.accessCode
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        return createFallbackRegistration(payload);
      }
      const body = await safeJson(response);
      throw new Error(body?.message || 'Registration failed');
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('404') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return createFallbackRegistration(payload);
    }
    throw error;
  }
}

export async function authenticateUser(payload: AuthPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        roll_no: payload.rollNo,
        access_code: payload.accessCode,
        client_id: payload.clientId,
        client_secret: payload.clientSecret
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        return createFallbackAuth();
      }
      const body = await safeJson(response);
      throw new Error(body?.message || 'Authentication failed');
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('404') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return createFallbackAuth();
    }
    throw error;
  }
}

export async function fetchNotifications(token: string, filters: { limit: number; page: number; type: string }): Promise<Notification[]> {
  const query = new URLSearchParams();
  query.set('limit', String(filters.limit));
  query.set('page', String(filters.page));
  if (filters.type && filters.type !== 'All') {
    query.set('notification_type', filters.type);
  }

  const response = await fetch(`${API_BASE_URL}/notifications?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.message || 'Unable to load notifications');
  }

  return response.json();
}
