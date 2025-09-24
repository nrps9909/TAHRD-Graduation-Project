import { io, Socket } from 'socket.io-client';
import { WS_HOST, SOCKET_OPTS, WS_ENABLE } from './config';

let socket: Socket | null = null;
let lastLog = 0;

export function getSocket(){
  if (!WS_ENABLE) return null;

  if (!socket) {
    socket = io(WS_HOST, SOCKET_OPTS);
    socket.on('connect', ()=>console.info('[Socket] connected', socket?.id));
    socket.on('connect_error', ()=>{
      const now=Date.now();
      if(now-lastLog>5000){ console.warn('[Socket] offline (retrying)…'); lastLog=now; }
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

// Legacy export for backward compatibility
export const socket = getSocket();