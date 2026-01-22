import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tự động detect hostname để xây dựng URL
 * Cho phép vừa chạy trên localhost vừa chạy trên mạng LAN
 * 
 * @param port - Port của service
 * @param path - Path (ví dụ: '/api' hoặc '')
 * @returns URL đầy đủ dựa vào hostname hiện tại
 */
export function getServiceUrl(port: string | number, path: string = ''): string {
  // Nếu đang chạy trên server (SSR) hoặc không có window
  if (typeof window === 'undefined') {
    return `http://localhost:${port}${path}`;
  }
  
  const { hostname, protocol } = window.location;
  
  // Debug log để kiểm tra
  console.log(`[getServiceUrl] hostname: ${hostname}, port: ${port}, path: ${path}`);
  
  // Tự động build URL dựa vào hostname đang truy cập
  // - Nếu truy cập từ localhost -> dùng localhost
  // - Nếu truy cập từ IP (192.168.x.x) -> dùng IP đó
  const url = `${protocol}//${hostname}:${port}${path}`;
  console.log(`[getServiceUrl] Generated URL: ${url}`);
  return url;
}

/**
 * Lấy API Base URL (backend Express)
 */
export function getApiBaseUrl(): string {
  // Hardcode port để đảm bảo hoạt động (env có thể không load đúng)
  const apiPort = '3000';
  return getServiceUrl(apiPort, '/api');
}

/**
 * Lấy Python API Base URL (FastAPI service)
 */
export function getPythonApiUrl(): string {
  // Hardcode port để đảm bảo hoạt động
  const pythonPort = '8081';
  return getServiceUrl(pythonPort, '');
}

/**
 * Lấy Backend Root URL (không có /api, dùng cho uploads)
 */
export function getBackendRootUrl(): string {
  const apiPort = '3000';
  return getServiceUrl(apiPort, '');
}
