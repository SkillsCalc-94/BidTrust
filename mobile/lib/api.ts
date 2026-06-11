import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Lazy import to avoid circular deps — auth.ts imports api.ts
function getSupabase() {
  return require('./supabase').default;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    // Use supabase client directly to get the session token — most reliable approach
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (_) {
    // Fallback: parse storage manually
    try {
      if (Platform.OS === 'web') {
        const keys = Object.keys(window.localStorage);
        const supabaseKey =
          keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) ||
          keys.find((k) => k.includes('supabase') && k.includes('auth'));
        if (supabaseKey) {
          const raw = window.localStorage.getItem(supabaseKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const token =
              parsed?.access_token ||
              parsed?.currentSession?.access_token ||
              parsed?.session?.access_token;
            if (token) return { Authorization: `Bearer ${token}` };
          }
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const keys = await AsyncStorage.getAllKeys();
        const supabaseKey = keys.find((k: string) => k.includes('supabase') && k.includes('auth'));
        if (supabaseKey) {
          const raw = await AsyncStorage.getItem(supabaseKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const token =
              parsed?.access_token ||
              parsed?.currentSession?.access_token ||
              parsed?.session?.access_token;
            if (token) return { Authorization: `Bearer ${token}` };
          }
        }
      }
    } catch (_2) {}
  }
  return {};
}

async function get<T = any>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

async function post<T = any>(path: string, body?: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

async function put<T = any>(path: string, body?: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

async function del<T = any>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

async function postFormData<T = any>(path: string, formData: FormData): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type for multipart/form-data — browser sets it with boundary
      ...authHeader,
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = { get, post, put, delete: del, postFormData, getAuthHeader };
export default api;
