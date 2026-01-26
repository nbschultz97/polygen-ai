/**
 * API Client
 * Handles authenticated requests to backend API endpoints
 */

import { supabase } from './authService';

/**
 * Get the current user's access token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST request with authentication
 */
export async function apiPost<T>(
  endpoint: string,
  body: any,
  signal?: AbortSignal
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    signal
  });
}

export const apiClient = {
  getAuthToken,
  apiRequest,
  apiPost
};

export default apiClient;
