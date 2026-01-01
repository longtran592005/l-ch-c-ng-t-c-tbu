// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Add authorization header if token exists in local storage
  const token = localStorage.getItem('tbu_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || "Something went wrong");
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, data: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
