import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store';

const inp = { width:'100%', padding:'11px 14px', background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:8, color:'#f1f5f9', fontSize:14, outline:'none' };
const btn = (dis) => ({ width:'100%', padding:'13px', borderRadius:9, border:'none', background: dis?'#0f172a':'linear-gradient(135deg,#6366f1,#8b5cf6)', color: dis?'#334155':'#fff', fontSize:15, fontWeight:700, cursor: dis?'not-allowed':'pointer' });

export function LoginPage() {
  const [email, setEmail] = useState('demo@nexta.ai');
  const [password, setPassword] = useState('demo1234');
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore(); const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault(); setLoading(true); setErr('');
    try { const { data } = await authApi.login({ email, password }); setAuth(data.user, data.token); navigate('/'); }
    catch(e) { setErr(e.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }} className="slide-up">
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}>⚡</div>
          <div style={{ fontWeight:900, fontSize:26, letterSpacing:'-0.04em' }}>NextA</div>
          <div style={{ color:'#475569', fontSize:13, marginTop:4 }}>Intelligent Next Best Action Platform</div>
          <div style={{ marginTop:8, fontSize:11, color:'#334155', padding:'4px 10px', background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:20, display:'inline-block' }}>
            Powered by Groq + llama3.2 · 100% Local
          </div>
        </div>
        <div style={{ background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:14, padding:28 }}>
          <form onSubmit={submit}>
            {[{label:'Email',type:'email',val:email,set:setEmail},{label:'Password',type:'password',val:password,set:setPassword}].map(f => (
              <div key={f.label} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:500, display:'block', marginBottom:6 }}>{f.label}</label>
                <input style={inp} type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} required/>
              </div>
            ))}
            {err && <div style={{ padding:'10px 12px', background:'#1c0a0a', border:'1px solid #7f1d1d', borderRadius:6, color:'#fca5a5', fontSize:13, marginBottom:14 }}>{err}</div>}
            <button style={btn(loading)} disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</button>
          </form>
          <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:'#475569' }}>
            No account? <Link to="/register" style={{ color:'#818cf8' }}>Create one</Link>
          </div>
        </div>
        <div style={{ marginTop:16, padding:'10px 14px', background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:8, fontSize:12, color:'#475569' }}>
          <strong style={{ color:'#6366f1' }}>Demo:</strong> demo@nexta.ai / demo1234
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'analyst', domain:'saas' });
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore(); const navigate = useNavigate();
  const ch = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault(); setLoading(true); setErr('');
    try { const { data } = await authApi.register(form); setAuth(data.user, data.token); navigate('/'); }
    catch(e) { setErr(e.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420 }} className="slide-up">
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}>⚡</div>
          <div style={{ fontWeight:900, fontSize:24, letterSpacing:'-0.04em' }}>Create account</div>
        </div>
        <div style={{ background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:14, padding:28 }}>
          <form onSubmit={submit}>
            {[{l:'Full name',k:'name',t:'text'},{l:'Email',k:'email',t:'email'},{l:'Password',k:'password',t:'password'}].map(f=>(
              <div key={f.k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:500, display:'block', marginBottom:6 }}>{f.l}</label>
                <input style={inp} type={f.t} value={form[f.k]} onChange={ch(f.k)} required/>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {[{l:'Role',k:'role',opts:[['analyst','Analyst'],['manager','Manager'],['admin','Admin']]},
                {l:'Domain',k:'domain',opts:[['saas','SaaS Sales'],['staffing','Staffing'],['fintech','FinTech'],['csuccess','Customer Success']]}
              ].map(f=>(
                <div key={f.k}>
                  <label style={{ fontSize:12, color:'#64748b', fontWeight:500, display:'block', marginBottom:6 }}>{f.l}</label>
                  <select style={{ ...inp }} value={form[f.k]} onChange={ch(f.k)}>
                    {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {err && <div style={{ padding:'10px 12px', background:'#1c0a0a', border:'1px solid #7f1d1d', borderRadius:6, color:'#fca5a5', fontSize:13, marginBottom:14 }}>{err}</div>}
            <button style={btn(loading)} disabled={loading}>{loading?'Creating…':'Create account →'}</button>
          </form>
          <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:'#475569' }}>
            Have account? <Link to="/login" style={{ color:'#818cf8' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
