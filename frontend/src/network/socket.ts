import { io, Socket } from 'socket.io-client';

const URL  = import.meta.env.VITE_WS_URL || 'ws://localhost:4001';
const PATH = import.meta.env.VITE_WS_PATH || '/socket.io';

export const socket: Socket = io(URL, {
  path: PATH,
  transports: ['websocket', 'polling'],  // websocket first, fallback to polling
  withCredentials: false,
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  autoConnect: true,
});

socket.on('connect', () => console.info('[WS] connected', socket.id));
socket.on('connect_error', (e) => console.warn('[WS] connect_error', e.message));
socket.on('disconnect', (r) => console.warn('[WS] disconnected:', r));