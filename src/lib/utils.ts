import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chuyển Date object thành chuỗi "YYYY-MM-DD" theo local timezone.
 * Dùng trước khi gửi API để tránh lệch ngày do JSON.stringify chuyển sang UTC.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tạo Date object từ chuỗi ISO hoặc Date, đảm bảo hiển thị đúng ngày ở mọi timezone.
 * Hàm này extract phần YYYY-MM-DD rồi tạo Date ở noon local time,
 * tránh việc UTC midnight bị lệch sang ngày trước/sau khi hiển thị.
 */
export function parseUTCDateToLocal(value: string | Date): Date {
  const str = typeof value === 'string' ? value : value.toISOString();
  const [datePart] = str.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  // Tạo Date ở noon local time để tránh lệch ngày do timezone
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Kiểm tra có đang chạy ở production mode không
 * Production = deploy qua Nginx reverse proxy (tất cả đi qua 1 domain)
 */
function isProduction(): boolean {
  // Vite inject import.meta.env.MODE khi build
  return import.meta.env.PROD;
}

/**
 * Kiểm tra xem có đang chạy qua ngrok/tunnel không
 */
function isExternalTunnel(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname.includes('ngrok') || hostname.includes('trycloudflare') ||
    (!hostname.includes('localhost') && !hostname.match(/^192\.168\./));
}

/**
 * Tự động detect hostname và protocol để xây dựng URL
 * - Production: relative paths (Nginx proxy handles routing)
 * - Development: direct port access
 */
export function getServiceUrl(port: string | number, path: string = ''): string {
  // Production: tất cả đi qua Nginx, dùng relative path
  if (isProduction()) {
    return path || '';
  }

  if (typeof window === 'undefined') {
    return `https://localhost:${port}${path}`;
  }

  const { hostname, protocol, host } = window.location;

  // Nếu đang chạy qua ngrok/tunnel
  if (isExternalTunnel()) {
    return `${protocol}//${host}${path}`;
  }

  return `${protocol}//${hostname}:${port}${path}`;
}

/**
 * Lấy WebSocket URL
 */
export function getWebSocketUrl(port: string | number, path: string = ''): string {
  if (typeof window === 'undefined') {
    return `wss://localhost:${port}${path}`;
  }

  const { hostname, protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

  // Production: WebSocket qua Nginx
  if (isProduction() || isExternalTunnel()) {
    return `${wsProtocol}//${host}${path}`;
  }

  return `${wsProtocol}//${hostname}:${port}${path}`;
}

/**
 * Lấy API Base URL (backend Express)
 * Production: /api (Nginx proxy)
 * Dev: https://localhost:3000/api
 */
export function getApiBaseUrl(): string {
  if (isProduction()) {
    return '/api';
  }
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  return getServiceUrl('3000', '/api');
}

/**
 * Lấy Python API Base URL (Whisper service)
 * Production: /api/proxy/whisper (qua backend proxy)
 * Dev: https://localhost:8081
 */
export function getPythonApiUrl(): string {
  if (isProduction()) {
    return '/api/proxy/whisper';
  }
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${getApiBaseUrl()}/proxy/whisper`;
  }
  return getServiceUrl('8081', '');
}

/**
 * Lấy RAG Service URL
 * Production: /rag (Nginx proxy) - NOTE: hiện tại đã bỏ, giữ lại cho tương lai
 * Dev: https://localhost:8002
 */
export function getRagServiceUrl(): string {
  if (isProduction()) {
    return '/rag';
  }
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${getApiBaseUrl()}/proxy/rag`;
  }
  return getServiceUrl('8002', '');
}

/**
 * Lấy TTS Service URL
 * Production: /tts (Nginx proxy)
 * Dev: http://localhost:8003
 */
export function getTtsServiceUrl(): string {
  if (isProduction()) {
    return '/tts';
  }
  return getServiceUrl('8003', '');
}

/**
 * Lấy Backend Root URL (không có /api, dùng cho uploads)
 * Production: '' (relative, same origin via Nginx)
 * Dev: https://localhost:3000
 */
export function getBackendRootUrl(): string {
  if (isProduction()) {
    return '';
  }
  if (typeof window !== 'undefined' && isExternalTunnel()) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return getServiceUrl('3000', '');
}

