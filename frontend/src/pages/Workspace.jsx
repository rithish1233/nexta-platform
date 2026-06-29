import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { usePipelineStore, useAuthStore } from '../store';
import { usePipeline } from '../hooks/usePipeline';
import { joinSession, on } from '../services/socket';

const AGENT_ORDER = ['planner','ingestion','knowledge','analysis','recommendation','explainer','memory'];
const AGENT_META = {
  planner:        { name:'Planner Agent',        icon:'⚡', color:'#6366f1' },
  ingestion:      { name:'Ingestion Agent',       icon:'📥', color:'#0ea5e9' },
  knowledge:      { name:'Knowledge Agent',       icon:'🧠', color:'#8b5cf6' },
  analysis:       { name:'Analysis Agent',        icon:'🔍', color:'#f59e0b' },
  recommendation: { name:'Recommendation Agent',  icon:'🎯', color:'#10b981' },
  explainer:      { name:'Explainer Agent',       icon:'💡', color:'#ec4899' },
  memory:         { name:'Memory Agent',          icon:'💾', color:'#14b8a6' },
};

function Badge({ text, color }) {
  const map = { critical:'#ef4444',high:'#f59e0b',medium:'#3b82f6',low:'#10b981',
    approved:'#10b981',rejected:'#ef4444',pending:'#f59e0b',executed:'#8b5cf6',
    positive:'#10b981',very_positive:'#10b981',negative:'#ef4444',mixed:'#f59e0b',neutral:'#64748b' };
  const c = map[text?.toLowerCase()] || color || '#6366f1';
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:4, background:`${c}20`, border:`1px solid ${c}40`, color:c, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{text||'—'}</span>;
}

function AgentOutputPanel({ agentId, sessionId, onFollowup }) {
  const { agents }              = usePipelineStore();
  const [q, setQ]               = useState('');
  const [showInput, setShowInput] = useState(false);
  const [followupOuts, setFollowupOuts] = useState('');
  const m   = AGENT_META[agentId];
  const ag  = agents[agentId];
  const ref = useRef(null);

  // Listen for follow-up streaming on this agent
  useEffect(() => {
    if (!sessionId) return;
    const off1 = on('agent:start',    ({ agent }) => { if (agent === agentId) setFollowupOuts(p => p + '\n\n--- Follow-up ---\n'); });
    const off2 = on('agent:stream',   ({ agent, token }) => { if (agent === agentId && token) setFollowupOuts(p => p + token); });
    const off3 = on('agent:complete', ({ agent }) => { if (agent === agentId) setShowInput(false); });
    return () => { off1(); off2(); off3(); };
  }, [agentId, sessionId]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [ag.output, followupOuts]);

  function submitFollowup(e) {
    e.preventDefault();
    if (!q.trim()) return;
    onFollowup(agentId, q);
    setQ('');
  }

  const fullOutput = ag.output + (followupOuts || '');

  return (
    <div style={{ background:'#0a0f1e', border:`1px solid ${m.color}33`, borderRadius:12, marginBottom:12, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #0f172a', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>{m.icon}</span>
        <span style={{ fontWeight:700, fontSize:14, color: ag.status==='complete' ? '#10b981' : m.color }}>
          {m.name}
          {ag.status==='complete' && ' ✓'}
        </span>
        {ag.streaming && <div style={{ width:12, height:12, border:`2px solid #1e293b`, borderTopColor:m.color, borderRadius:'50%', animation:'spin 0.8s linear infinite', marginLeft:'auto' }}/>}
        {ag.status==='complete' && (
          <button onClick={() => setShowInput(s=>!s)} style={{ marginLeft:'auto', padding:'4px 12px', background:'transparent', border:`1px solid ${m.color}44`, borderRadius:6, color:m.color, fontSize:11, fontWeight:600 }}>
            {showInput ? 'Cancel' : '💬 Ask follow-up'}
          </button>
        )}
      </div>

      {/* Output */}
      {fullOutput && (
        <div ref={ref} className="mono" style={{ padding:'14px 16px', fontSize:12, color:'#94a3b8', lineHeight:1.75, maxHeight:320, overflowY:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {fullOutput}
          {ag.streaming && <span style={{ display:'inline-block', width:8, height:14, background:m.color, marginLeft:2, animation:'blink 0.6s infinite', verticalAlign:'middle' }}/>}
        </div>
      )}

      {/* Follow-up input */}
      {showInput && (
        <form onSubmit={submitFollowup} style={{ padding:'12px 16px', borderTop:'1px solid #0f172a', display:'flex', gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder={`Ask ${m.name} a follow-up question...`}
            style={{ flex:1, background:'#050d1a', border:'1px solid #1e293b', borderRadius:8, padding:'8px 12px', color:'#f1f5f9', fontSize:13, outline:'none' }}
            autoFocus/>
          <button type="submit" style={{ padding:'8px 16px', background:`${m.color}20`, border:`1px solid ${m.color}60`, borderRadius:8, color:m.color, fontSize:12, fontWeight:700 }}>
            Ask →
          </button>
        </form>
      )}
    </div>
  );
}

function RecCard({ rec, onApprove, onReject, onRerun, sessionId }) {
  const [open, setOpen] = useState(false);
  const pColors = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#10b981' };
  const pc = pColors[rec.priority] || '#6366f1';

  return (
    <div className="slide-up" style={{
      background: rec.status==='approved' ? '#052e16' : rec.status==='rejected' ? '#1c0a0a' : '#0a0f1e',
      border:`1px solid ${rec.status==='approved' ? '#166534' : rec.status==='rejected' ? '#7f1d1d' : '#1e293b'}`,
      borderRadius:12, padding:'18px 20px', marginBottom:10, transition:'all 0.3s',
    }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`${pc}15`, border:`1px solid ${pc}40`, display:'flex', alignItems:'center', justifyContent:'center', color:pc, fontWeight:800, fontSize:13, flexShrink:0 }}>
          {rec.rank}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontWeight:700, fontSize:14, color:'#f1f5f9' }}>{rec.action}</span>
            <Badge text={rec.priority}/>
          </div>
          {rec.description && <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5, marginBottom:8 }}>{rec.description}</p>}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#64748b', marginBottom:6 }}>
            {rec.timeframe && <span>⏱ {rec.timeframe}</span>}
            {rec.owner     && <span>👤 {rec.owner}</span>}
            {rec.confidence > 0 && <span style={{ color: rec.confidence>79?'#10b981':rec.confidence>59?'#f59e0b':'#ef4444' }}>🎯 {rec.confidence}% confidence</span>}
          </div>
          {rec.talkingPoints?.length > 0 && (
            <>
              <button onClick={() => setOpen(o=>!o)} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:12, padding:'4px 0', display:'flex', alignItems:'center', gap:4 }}>
                {open?'▼':'▶'} {open?'Hide':'View'} talking points ({rec.talkingPoints.length})
              </button>
              {open && (
                <div style={{ marginTop:8, padding:'10px 14px', background:'#050d1a', borderRadius:8, border:'1px solid #0f172a' }}>
                  {rec.talkingPoints.map((t,i) => (
                    <div key={i} style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:6, marginBottom:4 }}>
                      <span style={{ color:'#10b981' }}>•</span>{t}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {rec.status === 'pending' && (
        <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid #0f172a' }}>
          <button onClick={() => onApprove(rec.id)} style={{ padding:'7px 16px', background:'#052e16', border:'1px solid #10b981', borderRadius:6, color:'#10b981', fontSize:12, fontWeight:700 }}>✓ Approve</button>
          <button onClick={() => onReject(rec.id)}  style={{ padding:'7px 14px', background:'transparent', border:'1px solid #1e293b', borderRadius:6, color:'#64748b', fontSize:12 }}>✕ Dismiss</button>
        </div>
      )}
      {rec.status !== 'pending' && (
        <div style={{ marginTop:8, fontSize:12, fontWeight:600, color: rec.status==='approved'?'#10b981':'#ef4444' }}>
          {rec.status==='approved' ? '✓ Approved — queued for execution' : '✕ Dismissed'}
          <button onClick={() => onRerun(rec)} style={{ marginLeft:12, background:'none', border:'1px solid #1e293b', borderRadius:4, color:'#475569', fontSize:11, padding:'2px 8px', cursor:'pointer' }}>Re-run</button>
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const { sessionId }  = useParams();
  const navigate       = useNavigate();
  const { agents, recommendations, metrics, status } = usePipelineStore();
  const { user }       = useAuthStore();
  const { approveRec, rejectRec, askFollowup }       = usePipeline();
  const [tab, setTab]  = useState('agents');
  const [dbData, setDbData] = useState(null);
  const [recs, setRecs]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Join socket room in case user navigated directly
    joinSession(sessionId);

    // Load from DB
    setLoading(true);
    analysisApi.get(sessionId).then(r => {
      setDbData(r.data.analysis);
      const dbRecs = r.data.analysis?.parsedResults?.recommendations || [];
      if (dbRecs.length > 0) setRecs(dbRecs);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [sessionId]);

  // Prefer live recs from store
  const displayRecs = recommendations.length > 0 ? recommendations : recs;

  function handleRerun(rec) {
    setRecs(prev => prev.map(r => r.id===rec.id ? {...r, status:'pending'} : r));
  }

  // Merge live agent outputs with DB outputs
  const agentOutputs = dbData?.agentOutputs || {};
  const mergedAgents = {};
  AGENT_ORDER.forEach(id => {
    const liveOut = agents[id].output;
    const dbOut   = agentOutputs[id] || '';
    mergedAgents[id] = {
      ...agents[id],
      output:    liveOut || dbOut,
      streaming: agents[id].streaming,
      status:    agents[id].status !== 'idle' ? agents[id].status : (dbOut ? 'complete' : 'idle'),
    };
  });

  const approvedCount = displayRecs.filter(r=>r.status==='approved').length;
  const pendingCount  = displayRecs.filter(r=>r.status==='pending').length;

  const TABS = [
    { id:'agents',  label:`🤖 Agent Outputs (${AGENT_ORDER.length})` },
    { id:'recs',    label:`⚡ Actions (${displayRecs.length})` },
    { id:'metrics', label:'📊 Metrics' },
  ];

  if (loading && !dbData) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:12 }}>
      <div style={{ width:20, height:20, border:'2px solid #1e293b', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <span style={{ color:'#475569' }}>Loading workspace…</span>
    </div>
  );

  return (
    <div style={{ maxWidth:1050, margin:'0 auto', padding:'32px 24px' }}>
      {/* Header */}
      <div style={{ background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:14, padding:'20px 24px', marginBottom:24 }} className="slide-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
              Analysis — {dbData?.domain || ''}
            </div>
            <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.03em', marginBottom:6 }}>
              {sessionId?.slice(0,8)}…
            </h2>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Badge text={dbData?.status} color={dbData?.status==='completed'?'#10b981':'#f59e0b'}/>
              <span style={{ fontSize:12, color:'#475569' }}>{displayRecs.length} actions · {approvedCount} approved · {pendingCount} pending</span>
            </div>
          </div>
          {(metrics.opportunityScore > 0 || dbData?.metrics?.opportunityScore > 0) && (
            <div style={{ display:'flex', gap:20 }}>
              {[
                { label:'Opportunity', val: metrics.opportunityScore || dbData?.metrics?.opportunityScore || 0, color:'#10b981' },
                { label:'Risk',        val: metrics.riskScore        || dbData?.metrics?.riskScore        || 0, color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'#475569' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:10, padding:4, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:'8px', borderRadius:7, border:'none', background:tab===t.id?'#1e293b':'transparent', color:tab===t.id?'#f1f5f9':'#475569', fontSize:12, fontWeight:tab===t.id?600:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AGENT OUTPUTS ── */}
      {tab === 'agents' && (
        <div className="slide-up">
          {AGENT_ORDER.map(id => (
            <AgentOutputPanel
              key={id} agentId={id} sessionId={sessionId}
              onFollowup={askFollowup}
            />
          ))}
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {tab === 'recs' && (
        <div className="slide-up">
          {displayRecs.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#334155' }}>No recommendations yet. Wait for the pipeline to complete.</div>
            : displayRecs.map(rec => (
              <RecCard key={rec.id} rec={rec} sessionId={sessionId}
                onApprove={approveRec} onReject={rejectRec} onRerun={handleRerun}/>
            ))
          }
        </div>
      )}

      {/* ── METRICS ── */}
      {tab === 'metrics' && (
        <div className="slide-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
          {[
            { label:'Opportunity Score', val:`${metrics.opportunityScore || dbData?.metrics?.opportunityScore || 0}/100`, color:'#10b981' },
            { label:'Risk Score',        val:`${metrics.riskScore        || dbData?.metrics?.riskScore        || 0}/100`, color:'#f59e0b' },
            { label:'Total Actions',     val: metrics.totalActions     || dbData?.metrics?.totalActions     || 0,         color:'#6366f1' },
            { label:'Approved Actions',  val: approvedCount,                                                              color:'#10b981' },
            { label:'Pending Actions',   val: pendingCount,                                                               color:'#f59e0b' },
            { label:'Domain',            val: dbData?.domain || '—',                                                     color:'#8b5cf6' },
            { label:'Status',            val: dbData?.status || '—',                                                     color: dbData?.status==='completed'?'#10b981':'#f59e0b' },
            { label:'Duration',          val: dbData?.metrics?.elapsedMs ? `${(dbData.metrics.elapsedMs/1000).toFixed(1)}s` : '—', color:'#14b8a6' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:10, color:'#334155', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <button onClick={()=>navigate('/')} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #1e293b', background:'transparent', color:'#64748b', fontSize:13 }}>← New Analysis</button>
        <button onClick={()=>navigate('/history')} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #1e293b', background:'transparent', color:'#64748b', fontSize:13 }}>📋 History</button>
        <button onClick={()=>{
          const d = { sessionId, agents: agentOutputs, metrics: dbData?.metrics, recs: displayRecs };
          const b = new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
          const u = URL.createObjectURL(b); const a = document.createElement('a');
          a.href=u; a.download=`nexta-${sessionId?.slice(0,8)}.json`; a.click();
        }} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #1e293b', background:'transparent', color:'#64748b', fontSize:13 }}>↓ Export</button>
      </div>
    </div>
  );
}
