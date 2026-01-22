import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tự động detect hostname và protocol để xây dựng URL
 * Hỗ trợ cả HTTP và HTTPS, localhost và mạng LAN
 * 
 * @param port - Port của service
 * @param path - Path (ví dụ: '/api' hoặc '')
 * @returns URL đầy đủ dựa vào hostname và protocol hiện tại
 */
export function getServiceUrl(port: string | number, path: string = ''): string {
  // Nếu đang chạy trên server (SSR) hoặc không có window
  if (typeof window === 'undefined') {
    return `https://localhost:${port}${path}`;
  }
  
  const { hostname, protocol } = window.location;
  
  // Tự động build URL dựa vào hostname và protocol đang truy cập
  // - Protocol sẽ tự động là https:// hoặc http:// tùy vào cách user truy cập
  // - Hostname sẽ là localhost hoặc IP (192.168.x.x)
  const url = `${protocol}//${hostname}:${port}${path}`;
  return url;
}

/**
 * Lấy WebSocket URL (tự động chuyển https -> wss, http -> ws)
 */
export function getWebSocketUrl(port: string | number, path: string = ''): string {
  if (typeof window === 'undefined') {
    return `wss://localhost:${port}${path}`;
  }
  
  const { hostname, protocol } = window.location;
  // https: -> wss:, http: -> ws:
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${hostname}:${port}${path}`;
}

/**
 * Lấy API Base URL (backend Express)
 */
export function getApiBaseUrl(): string {
  const apiPort = '3000';
  return getServiceUrl(apiPort, '/api');
}

/**
 * Lấy Python API Base URL (FastAPI Whisper service)
 */
export function getPythonApiUrl(): string {
  const pythonPort = '8081';
  return getServiceUrl(pythonPort, '');
}

/**
 * Lấy RAG Service URL
 */
export function getRagServiceUrl(): string {
  const ragPort = '8002';
  return getServiceUrl(ragPort, '');
}

/**
 * Lấy Backend Root URL (không có /api, dùng cho uploads)
 */
export function getBackendRootUrl(): string {
  const apiPort = '3000';
  return getServiceUrl(apiPort, '');
}
