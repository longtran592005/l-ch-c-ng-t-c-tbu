import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kiểm tra xem có đang chạy qua ngrok/tunnel không
 * Ngrok domain thường có dạng: xxxx-xx-xxx.ngrok-free.app
 */
function isExternalTunnel(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname.includes('ngrok') || hostname.includes('trycloudflare') || 
         (!hostname.includes('localhost') && !hostname.match(/^192\.168\./));
}

/**
 * Tự động detect hostname và protocol để xây dựng URL
 * Hỗ trợ cả HTTP và HTTPS, localhost, mạng LAN và ngrok tunnel
 * 
 * @param port - Port của service (bỏ qua nếu chạy qua ngrok)
 * @param path - Path (ví dụ: '/api' hoặc '')
 * @returns URL đầy đủ dựa vào hostname và protocol hiện tại
 */
export function getServiceUrl(port: string | number, path: string = ''): string {
  // Nếu đang chạy trên server (SSR) hoặc không có window
  if (typeof window === 'undefined') {
    return `https://localhost:${port}${path}`;
  }
  
  const { hostname, protocol, host } = window.location;
  
  // Nếu đang chạy qua ngrok/tunnel, tất cả đi qua cùng 1 domain (proxy)
  if (isExternalTunnel()) {
    return `${protocol}//${host}${path}`;
  }
  
  // Tự động build URL dựa vào hostname và protocol đang truy cập
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
  
  const { hostname, protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Nếu đang chạy qua ngrok/tunnel
  if (isExternalTunnel()) {
    return `${wsProtocol}//${host}${path}`;
  }
  
  return `${wsProtocol}//${hostname}:${port}${path}`;
}

/**
 * Lấy API Base URL (backend Express)
 * Nếu qua ngrok: /api (proxy)
 * Nếu local: https://localhost:3000/api
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  return getServiceUrl('3000', '/api');
}

/**
 * Lấy Python API Base URL (FastAPI Whisper service)
 * Nếu qua ngrok: /whisper (proxy)
 * Nếu local: https://localhost:8081
 */
export function getPythonApiUrl(): string {
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}/whisper`;
  }
  return getServiceUrl('8081', '');
}

/**
 * Lấy RAG Service URL
 * Nếu qua ngrok: /rag (proxy)
 * Nếu local: https://localhost:8002
 */
export function getRagServiceUrl(): string {
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}/rag`;
  }
  return getServiceUrl('8002', '');
}

/**
 * Lấy Backend Root URL (không có /api, dùng cho uploads)
 */
export function getBackendRootUrl(): string {
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return getServiceUrl('3000', '');
}
