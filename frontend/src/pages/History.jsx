import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyApi } from '../services/api';

const DOMAIN_ICONS = { saas:'☁️', staffing:'👥', energy:'⚡', csuccess:'🏆', fintech:'💹', healthcare:'🏥', manufacturing:'🏭' };

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [memories, setMemories] = useState([]);
  const [tab, setTab]           = useState('analyses');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([historyApi.list({ limit:50 }), historyApi.getMemory()])
      .then(([h,m]) => { setAnalyses(h.data.analyses||[]); setMemories(m.data.memories||[]); })
      .finally(() => setLoading(false));
  }, []);

  async function del(sessionId, e) {
    e.stopPropagation(); setDeleting(sessionId);
    await historyApi.delete(sessionId).catch(()=>{});
    setAnalyses(p => p.filter(a => a.sessionId !== sessionId));
    setDeleting(null);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:12 }}>
      <div style={{ width:20, height:20, border:'2px solid #1e293b', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <span style={{ color:'#475569' }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'36px 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:'-0.03em', marginBottom:4 }}>History</h1>
          <p style={{ color:'#475569', fontSize:13 }}>{analyses.length} analyses · {memories.length} memory records</p>
        </div>
        <button onClick={()=>navigate('/')} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700 }}>+ New Analysis</button>
      </div>

      <div style={{ display:'flex', gap:2, background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[{id:'analyses',label:`Analyses (${analyses.length})`},{id:'memory',label:`Memory (${memories.length})`}].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'7px 18px', borderRadius:7, border:'none', background:tab===t.id?'#1e293b':'transparent', color:tab===t.id?'#f1f5f9':'#475569', fontSize:13, fontWeight:tab===t.id?600:400 }}>{t.label}</button>
        ))}
      </div>

      {tab === 'analyses' && (
        analyses.length === 0
          ? <div style={{ textAlign:'center', padding:60, color:'#334155' }}>
              No analyses yet. <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:14 }}>Run your first one →</button>
            </div>
          : analyses.map(a => (
            <div key={a.sessionId} onClick={()=>navigate(`/workspace/${a.sessionId}`)} className="slide-up"
              style={{ background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:12, padding:'16px 20px', marginBottom:10, cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#1e293b'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='#0f172a'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{DOMAIN_ICONS[a.domain]||'📊'}</span>
                    <span style={{ fontWeight:700, fontSize:14, color:'#f1f5f9' }}>{a.sessionId?.slice(0,8)}… · {a.domain}</span>
                    <span style={{ padding:'2px 8px', borderRadius:4, background: a.status==='completed'?'#10b98120':'#f59e0b20', border:`1px solid ${a.status==='completed'?'#10b98140':'#f59e0b40'}`, color: a.status==='completed'?'#10b981':'#f59e0b', fontSize:10, fontWeight:700 }}>{a.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#334155' }}>{new Date(a.startedAt).toLocaleString()}</div>
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
                  {a.metrics?.opportunityScore > 0 && (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:900, color:'#10b981' }}>{a.metrics.opportunityScore}</div>
                      <div style={{ fontSize:9, color:'#475569' }}>Opportunity</div>
                    </div>
                  )}
                  <button onClick={e=>del(a.sessionId,e)} disabled={deleting===a.sessionId}
                    style={{ padding:'6px 10px', background:'transparent', border:'1px solid #1e293b', borderRadius:6, color:'#475569', fontSize:12 }}>
                    {deleting===a.sessionId?'…':'🗑'}
                  </button>
                </div>
              </div>
            </div>
          ))
      )}

      {tab === 'memory' && (
        memories.length === 0
          ? <div style={{ textAlign:'center', padding:60, color:'#334155' }}>No memory records yet.</div>
          : memories.map((m,i) => (
            <div key={i} className="slide-up" style={{ background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:12, padding:'16px 20px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <span style={{ fontWeight:700, fontSize:14, color:'#f1f5f9' }}>{m.company||'Unknown'}</span>
                  <span style={{ fontSize:12, color:'#475569', marginLeft:10 }}>{m.domain}</span>
                </div>
                <div style={{ fontSize:11, color:'#334155' }}>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
              {m.summary && <div style={{ fontSize:13, color:'#94a3b8', marginBottom:8, lineHeight:1.5 }}>{m.summary}</div>}
              {m.keyLearnings?.slice(0,3).map((l,j) => (
                <div key={j} style={{ fontSize:12, color:'#64748b', display:'flex', gap:6, marginBottom:3 }}>
                  <span style={{ color:'#6366f1' }}>•</span>{l}
                </div>
              ))}
            </div>
          ))
      )}
    </div>
  );
}
