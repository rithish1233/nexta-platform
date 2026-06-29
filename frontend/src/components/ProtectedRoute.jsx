import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi } from '../services/api';

export default function ProtectedRoute({ children }) {
  const { token, user, setUser, setLoading, isLoading, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (user)   { setLoading(false); return; }
    authApi.me()
      .then(r => { setUser(r.data.user); setLoading(false); })
      .catch(()  => { logout(); navigate('/login'); });
  }, [token]);

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:12 }}>
      <div style={{ width:22, height:22, border:'2px solid #1e293b', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <span style={{ color:'#475569', fontSize:14 }}>Loading…</span>
    </div>
  );

  return children;
}
