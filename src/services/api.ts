// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiError {
  message: string;
  code?: string;
  error?: string | { message: string };
}

interface ErrorResponse {
  error?: ApiError | string;
  message?: string;
}

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

  // Check if API_BASE_URL is configured
  if (!API_BASE_URL) {
    console.error('VITE_API_BASE_URL is not configured. Please set it in your .env file.');
    throw new Error('API base URL is not configured. Please check your environment variables.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ErrorResponse | null = null;
      try {
        errorData = await response.json() as ErrorResponse;
      } catch {
        errorData = { message: response.statusText || "Something went wrong" };
      }

      // Try to get more detailed error message
      const errorMessage =
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
        errorData?.message ||
        `HTTP ${response.status}: ${response.statusText}`;

      console.error('API Error:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error: unknown) {
    // Handle network errors (backend not running)
    if (error instanceof Error) {
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error(`Failed to connect to backend at ${API_BASE_URL}. Make sure the backend server is running.`);
        throw new Error(`Không thể kết nối đến server. Vui lòng kiểm tra backend server có đang chạy không. (${API_BASE_URL})`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
