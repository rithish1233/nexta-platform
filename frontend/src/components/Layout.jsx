import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const AGENTS = [
  { name:'Planner',        color:'#6366f1', icon:'⚡' },
  { name:'Ingestion',      color:'#0ea5e9', icon:'📥' },
  { name:'Knowledge',      color:'#8b5cf6', icon:'🧠' },
  { name:'Analysis',       color:'#f59e0b', icon:'🔍' },
  { name:'Recommendations',color:'#10b981', icon:'🎯' },
  { name:'Explainer',      color:'#ec4899', icon:'💡' },
  { name:'Memory',         color:'#14b8a6', icon:'💾' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#030712' }}>
      {/* Sidebar */}
      <aside style={{ width:220, background:'#050d1a', borderRight:'1px solid #0f172a', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:50 }}>
        {/* Logo */}
        <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid #0f172a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚡</div>
            <div>
              <div style={{ fontWeight:900, fontSize:16, letterSpacing:'-0.04em', color:'#f8fafc' }}>NextA</div>
              <div style={{ fontSize:9, color:'#334155', letterSpacing:'0.1em', textTransform:'uppercase' }}>Decision AI · Ollama</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'12px 10px', flex:1 }}>
          {[
            { to:'/',        icon:'⚡', label:'New Analysis', exact:true },
            { to:'/history', icon:'📋', label:'History' },
          ].map(({ to, icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
              borderRadius:8, marginBottom:2, textDecoration:'none',
              background: isActive ? '#6366f115' : 'transparent',
              color:      isActive ? '#818cf8'   : '#475569',
              fontSize:13, fontWeight: isActive ? 600 : 400,
              border:`1px solid ${isActive ? '#6366f133' : 'transparent'}`,
              transition:'all 0.15s',
            })}>
              <span>{icon}</span><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Agent legend */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid #0f172a', borderBottom:'1px solid #0f172a' }}>
          <div style={{ fontSize:9, color:'#1e293b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Agents (Ollama)</div>
          {AGENTS.map(a => (
            <div key={a.name} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:a.color, flexShrink:0 }}/>
              <span style={{ fontSize:11, color:'#334155' }}>{a.icon} {a.name}</span>
            </div>
          ))}
        </div>

        {/* Model info */}
        <div style={{ padding:'10px 14px', borderBottom:'1px solid #0f172a' }}>
          <div style={{ padding:'7px 10px', background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:7 }}>
            <div style={{ fontSize:9, color:'#334155', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>Model</div>
            <div style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>llama3.2</div>
            <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>localhost:11434</div>
          </div>
        </div>

        {/* User */}
        <div style={{ padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'#6366f130', border:'1px solid #6366f140', display:'flex', alignItems:'center', justifyContent:'center', color:'#818cf8', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {user?.name?.[0]?.toUpperCase()||'U'}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'#334155', textTransform:'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%', padding:'7px', background:'transparent', border:'1px solid #0f172a', borderRadius:7, color:'#334155', fontSize:12, cursor:'pointer' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft:220, flex:1, minHeight:'100vh', overflowY:'auto' }}>
        {children}
      </main>
    </div>
  );
}
