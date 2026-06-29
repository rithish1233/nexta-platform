import { io } from 'socket.io-client';
let socket = null;
export function getSocket() {
  if (!socket) socket = io('http://localhost:5000', { withCredentials: true, transports: ['websocket','polling'] });
  return socket;
}
export const joinSession  = id => getSocket().emit('join:session',  { sessionId: id });
export const leaveSession = id => getSocket().emit('leave:session', { sessionId: id });
export const sendFollowup = (sessionId, userId, agentId, question) =>
  getSocket().emit('agent:followup', { sessionId, userId, agentId, question });
export const on  = (ev, cb) => { getSocket().on(ev, cb);  return () => getSocket().off(ev, cb); };
export const off = (ev, cb) => getSocket().off(ev, cb);
