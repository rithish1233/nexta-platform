import { useState, useEffect } from 'react';
import { domainApi } from '../services/api';
import { usePipeline } from '../hooks/usePipeline';
import { usePipelineStore } from '../store';

const AGENT_META = {
  planner:        { name:'Planner',        icon:'⚡', color:'#6366f1' },
  ingestion:      { name:'Ingestion',      icon:'📥', color:'#0ea5e9' },
  knowledge:      { name:'Knowledge',      icon:'🧠', color:'#8b5cf6' },
  analysis:       { name:'Analysis',       icon:'🔍', color:'#f59e0b' },
  recommendation: { name:'Recommendations',icon:'🎯', color:'#10b981' },
  explainer:      { name:'Explainer',      icon:'💡', color:'#ec4899' },
  memory:         { name:'Memory',         icon:'💾', color:'#14b8a6' },
};

const AGENT_ORDER = ['planner','ingestion','knowledge','analysis','recommendation','explainer','memory'];

export default function Dashboard() {
  const [domains, setDomains]   = useState([]);
  const [samples, setSamples]   = useState({});
  const [domain, setDomain]     = useState('saas');
  const [text, setText]         = useState('');
  const { startPipeline }       = usePipeline();
  const { status, progress, agents, activeAgent, error } = usePipelineStore();
  const running = status === 'running';

  useEffect(() => {
    domainApi.list().then(r => setDomains(r.data.domains)).catch(()=>{});
    domainApi.samples().then(r => { setSamples(r.data.samples); setText(r.data.samples.saas||''); }).catch(()=>{});
  }, []);

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 24px' }}>
      {/* Hero */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 12px', borderRadius:20,
          background:'#6366f115', border:'1px solid #6366f133', color:'#818cf8', fontSize:11, fontWeight:600,
          letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'blink 2s infinite' }}/>
          7 Real AI Agents · Ollama Local · Real-time Streaming
        </div>
        <h1 style={{ fontSize:40, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.1, marginBottom:10,
          background:'linear-gradient(135deg,#f8fafc 30%,#94a3b8 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Intelligent Next<br/>Best Action
        </h1>
        <p style={{ color:'#64748b', fontSize:15, maxWidth:500 }}>
          Paste any customer interaction. 7 local AI agents run in sequence, streaming their analysis live, then generate ranked next best actions.
        </p>
      </div>

      {/* Agent Pipeline Visual */}
      <div style={{ background:'#0a0f1e', border:'1px solid #0f172a', borderRadius:14, padding:'18px 20px', marginBottom:24, overflowX:'auto' }}>
        <div style={{ fontSize:10, color:'#334155', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>
          Agent Execution Pipeline
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:'max-content' }}>
          {AGENT_ORDER.map((id, i) => {
            const m  = AGENT_META[id];
            const ag = agents[id];
            const isRunning  = ag.status === 'running';
            const isComplete = ag.status === 'complete';
            const isError    = ag.status === 'error';
            return (
              <div key={id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{
                  padding:'8px 12px', borderRadius:9,
                  background: isRunning ? `${m.color}20` : isComplete ? '#10b98115' : '#0f172a',
                  border:`1px solid ${isRunning ? m.color : isComplete ? '#10b98160' : isError ? '#ef444460' : '#1e293b'}`,
                  color: isRunning ? m.color : isComplete ? '#10b981' : isError ? '#ef4444' : '#475569',
                  fontSize:12, fontWeight:500, transition:'all 0.4s', whiteSpace:'nowrap',
                  animation: isRunning ? 'glow 1.5s infinite' : 'none',
                }}>
                  {m.icon} {m.name}
                  {isComplete && <span style={{ marginLeft:6, fontSize:10 }}>✓</span>}
                  {isRunning  && <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:m.color, marginLeft:6, animation:'blink 0.7s infinite' }}/>}
                </div>
                {i < AGENT_ORDER.length-1 && <span style={{ color:'#1e293b', fontSize:14 }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {(running || status === 'complete') && (
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#475569', marginBottom:6 }}>
              <span>{progress.message}</span>
              <span style={{ color: progress.percent===100 ? '#10b981' : '#818cf8' }}>{progress.percent}%</span>
            </div>
            <div style={{ height:3, background:'#0f172a', borderRadius:4, overflow:'hidden' }}>
              <div style={{
                height:'100%', background: progress.percent===100 ? '#10b981' : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                width:`${progress.percent}%`, transition:'width 0.6s ease', borderRadius:4,
              }}/>
            </div>
          </div>
        )}
      </div>

      {/* Live streaming outputs while running */}
      {running && (
        <div style={{ marginBottom:24 }}>
          {AGENT_ORDER.map(id => {
            const ag = agents[id];
            const m  = AGENT_META[id];
            if (ag.status === 'idle') return null;
            return (
              <div key={id} className="slide-up" style={{
                background:'#0a0f1e', border:`1px solid ${ag.status==='running' ? m.color+'44' : '#0f172a'}`,
                borderRadius:12, padding:'14px 16px', marginBottom:10,
                animation: ag.status==='running' ? 'pulse 2s infinite' : 'none',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:ag.output ? 10 : 0 }}>
                  <span style={{ fontSize:16 }}>{m.icon}</span>
                  <span style={{ fontSize:13, fontWeight:600, color: ag.status==='complete' ? '#10b981' : ag.status==='running' ? m.color : '#94a3b8' }}>
                    {m.name}
                    {ag.status==='complete' && ' ✓'}
                  </span>
                  {ag.status==='running' && (
                    <div style={{ marginLeft:'auto', width:14, height:14, border:'2px solid #1e293b', borderTopColor:m.color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  )}
                </div>
                {ag.output && (
                  <div className="mono" style={{
                    fontSize:11, color:'#64748b', lineHeight:1.7, maxHeight:140, overflowY:'auto',
                    whiteSpace:'pre-wrap', wordBreak:'break-word', marginTop:4,
                  }}>
                    {ag.output}
                    {ag.streaming && <span style={{ display:'inline-block', width:8, height:14, background:m.color, marginLeft:2, animation:'blink 0.6s infinite', verticalAlign:'middle' }}/>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Domain + input — only when not running */}
      {!running && (
        <>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:700, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>Business Domain</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {domains.map(d => (
                <button key={d.id} onClick={() => { setDomain(d.id); if(samples[d.id]) setText(samples[d.id]); }} style={{
                  padding:'7px 14px', borderRadius:8,
                  border:`1px solid ${domain===d.id ? '#6366f1' : '#1e293b'}`,
                  background: domain===d.id ? '#6366f115' : '#0a0f1e',
                  color: domain===d.id ? '#818cf8' : '#475569',
                  fontSize:13, fontWeight: domain===d.id ? 600 : 400,
                }}>
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Customer Interaction</div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:11, color:'#334155' }}>{text.length} chars</span>
                <button onClick={() => setText(samples[domain]||'')} style={{ padding:'3px 10px', border:'1px solid #1e293b', borderRadius:5, background:'transparent', color:'#475569', fontSize:11 }}>Load sample</button>
                <button onClick={() => setText('')} style={{ padding:'3px 10px', border:'1px solid #1e293b', borderRadius:5, background:'transparent', color:'#475569', fontSize:11 }}>Clear</button>
              </div>
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Paste meeting notes, emails, call transcripts, CRM updates..."
              rows={13} style={{ width:'100%', background:'#0a0f1e', border:'1px solid #1e293b', borderRadius:10,
                padding:'14px 16px', color:'#cbd5e1', fontSize:13, lineHeight:1.7, resize:'vertical', outline:'none' }}
              onFocus={e=>e.target.style.borderColor='#6366f1'}
              onBlur={e=>e.target.style.borderColor='#1e293b'}/>
          </div>
        </>
      )}

      {error && (
        <div style={{ padding:'12px 16px', background:'#1c0a0a', border:'1px solid #7f1d1d', borderRadius:8, color:'#fca5a5', fontSize:13, marginBottom:16 }}>
          ⚠ {error}
          {error.includes('ECONNREFUSED') && <div style={{ marginTop:6, fontSize:12, color:'#f97316' }}>
            → Make sure Ollama is running: <code style={{ background:'#0f172a', padding:'2px 6px', borderRadius:4 }}>ollama serve</code>
          </div>}
        </div>
      )}

      <button onClick={() => startPipeline(domain, text)} disabled={running||!text.trim()} style={{
        width:'100%', padding:'15px', borderRadius:10, border:'none',
        background: running||!text.trim() ? '#0f172a' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: running||!text.trim() ? '#334155' : '#fff', fontSize:15, fontWeight:700, transition:'all 0.2s',
        cursor: running||!text.trim() ? 'not-allowed' : 'pointer',
      }}>
        {running
          ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <span style={{ width:16, height:16, border:'2px solid #334155', borderTopColor:'#818cf8', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
              Running agents… ({Object.values(agents).filter(a=>a.status==='complete').length}/7 done)
            </span>
          : '⚡ Run Agent Pipeline'}
      </button>
    </div>
  );
}
