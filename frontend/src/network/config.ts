export const WS_ENABLE = ((import.meta as any)?.env?.VITE_WS_ENABLE ?? 'true') !== 'false';
export const WS_HOST = (import.meta as any)?.env?.VITE_WS_URL || (import.meta as any)?.env?.VITE_WS_HOST || 'http://localhost:4000';
export const SOCKET_OPTS = {
  transports: ['websocket', 'polling']
};