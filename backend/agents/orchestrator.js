const Groq   = require('groq-sdk');
const { Analysis, Memory, AgentLog } = require('../models');

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model — llama3-70b is best quality on Groq, 8b is faster
// Options: 'llama3-70b-8192' | 'llama3-8b-8192' | 'mixtral-8x7b-32768'
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'llama3-70b-8192';

/* ─────────────────────────────────────────────
   AGENT REGISTRY
───────────────────────────────────────────── */
const AGENT_META = {
  planner:        { name: 'Planner Agent',        icon: '⚡', color: '#6366f1', step: 1, max_tokens: 400  },
  ingestion:      { name: 'Ingestion Agent',       icon: '📥', color: '#0ea5e9', step: 2, max_tokens: 600  },
  knowledge:      { name: 'Knowledge Agent',       icon: '🧠', color: '#8b5cf6', step: 3, max_tokens: 600  },
  analysis:       { name: 'Analysis Agent',        icon: '🔍', color: '#f59e0b', step: 4, max_tokens: 900  },
  recommendation: { name: 'Recommendation Agent',  icon: '🎯', color: '#10b981', step: 5, max_tokens: 900  },
  explainer:      { name: 'Explainer Agent',       icon: '💡', color: '#ec4899', step: 6, max_tokens: 700  },
  memory:         { name: 'Memory Agent',          icon: '💾', color: '#14b8a6', step: 7, max_tokens: 350  },
};

/* ─────────────────────────────────────────────
   SYSTEM PROMPTS
───────────────────────────────────────────── */
const PROMPTS = {
  planner: (domain, interaction) => `You are the Planner Agent for a ${domain} platform.
Read this customer interaction and write a concise plan in 3-4 sentences.
Cover: main objective, top 2-3 focus areas, risk level (low/medium/high).
Be direct. No JSON.

INTERACTION:
${interaction}`,

  ingestion: (domain, interaction, plan) => `You are the Ingestion Agent for a ${domain} platform.
Extract key facts from this interaction. Be concise and structured:
- Company name, industry, size
- Key contacts and roles
- Top 3 pain points (quote where possible)
- Budget range and timeline
- Competitors mentioned
- Sentiment and engagement level

PLAN: ${plan}

INTERACTION:
${interaction}`,

  knowledge: (domain, ingested, pastMemory) => `You are the Knowledge Agent for a ${domain} platform.
Based on the customer data, provide:
- 2 relevant sales playbooks and why they apply
- Competitive intel for each competitor mentioned
- 2-3 industry insights relevant to this customer
- Key warning patterns to watch

${pastMemory ? `PAST DEALS:\n${pastMemory}\n` : ''}

CUSTOMER DATA:
${ingested}`,

  analysis: (domain, ingested, knowledge) => `You are the Analysis Agent for a ${domain} platform.
Provide a structured analysis:
- Opportunity Score: X/100 (one line reason)
- Risk Score: X/100 (one line reason)
- Close Probability: X%
- Deal Velocity: stalled/slow/medium/fast/accelerating
- Sales Stage: awareness/interest/evaluation/decision/negotiation
- Top 2 opportunities with impact
- Top 2 risks with mitigation
- Decision makers: name, role, influence, sentiment
- Top 2 information gaps
- Next best action moment

CUSTOMER DATA:
${ingested}

KNOWLEDGE:
${knowledge}`,

  recommendation: (domain, ingested, analysis) => `You are the Recommendation Agent for a ${domain} platform.
Generate exactly 6 ranked next best actions. For each write:
ACTION [number]: [title]
PRIORITY: critical/high/medium/low
TIMEFRAME: [deadline]
OWNER: [role]
DESCRIPTION: [2 sentences — what to do]
EXPECTED OUTCOME: [measurable result]
CONFIDENCE: [0-100]%
TALKING POINTS:
- [point 1]
- [point 2]
---

Be specific to this customer. No generic advice.

CUSTOMER DATA:
${ingested}

ANALYSIS:
${analysis}`,

  explainer: (domain, recommendations, analysis, ingested) => `You are the Explainer Agent for a ${domain} platform.
For each of the 6 actions, write 2-3 sentences each for:
WHY: Reason tied to the customer interaction
EVIDENCE: Direct fact or quote from the interaction
RISK IF IGNORED: Consequence of skipping this action

RECOMMENDATIONS:
${recommendations}

CUSTOMER DATA:
${ingested}`,

  memory: (domain, company, ingested, recommendations) => `You are the Memory Agent for a ${domain} platform.
Write a short memory entry:
- COMPANY: ${company || 'Unknown'}
- KEY LEARNINGS: 3 bullet points
- WATCH POINTS: 2 bullet points
- SUMMARY: One sentence

CUSTOMER DATA:
${ingested}

RECOMMENDATIONS:
${recommendations}`,
};

/* ─────────────────────────────────────────────
   GROQ STREAMING CALL
───────────────────────────────────────────── */
async function streamAgent(agentId, prompt, sessionId, io) {
  const meta = AGENT_META[agentId];

  io.to(sessionId).emit('agent:start', {
    agent:     agentId,
    agentName: meta.name,
    icon:      meta.icon,
    color:     meta.color,
    step:      meta.step,
    total:     7,
  });

  let fullText = '';

  try {
    const stream = await groq.chat.completions.create({
      model:       GROQ_MODEL(),
      max_tokens:  meta.max_tokens,
      temperature: 0.3,
      stream:      true,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    // Stream tokens live to frontend
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullText += token;
        io.to(sessionId).emit('agent:stream', {
          agent: agentId,
          token,
          done:  false,
        });
      }
      if (chunk.choices[0]?.finish_reason) {
        io.to(sessionId).emit('agent:stream', { agent: agentId, token: '', done: true });
      }
    }

  } catch (err) {
    const errMsg = err?.message || 'Groq API error';
    io.to(sessionId).emit('agent:error', { agent: agentId, error: errMsg });
    throw err;
  }

  io.to(sessionId).emit('agent:complete', {
    agent:     agentId,
    agentName: meta.name,
    output:    fullText,
    step:      meta.step,
    total:     7,
  });

  // Non-blocking log
  AgentLog.create({
    sessionId,
    agent:   agentId,
    level:   'success',
    message: `Completed (${fullText.length} chars)`,
  }).catch((e) => console.warn(`[AgentLog] write failed for ${agentId}:`, e.message));

  return fullText;
}

/* ─────────────────────────────────────────────
   FOLLOW-UP: single agent re-run
───────────────────────────────────────────── */
async function rerunAgent(agentId, sessionId, userId, question, io) {
  const analysis = await Analysis.findOne({ sessionId, userId });
  if (!analysis) throw new Error('Session not found');

  const domain   = analysis.domain;
  const ingested = analysis.agentOutputs.ingestion || '';
  const prevOut  = analysis.agentOutputs[agentId]  || '';

  const followUpPrompt = `You are the ${AGENT_META[agentId].name} for a ${domain} platform.
The user has a follow-up question about your previous analysis.

YOUR PREVIOUS OUTPUT:
${prevOut}

USER QUESTION: ${question}

Answer directly and specifically, referencing the customer context where relevant.`;

  const output = await streamAgent(agentId, followUpPrompt, sessionId, io);

  await Analysis.findOneAndUpdate(
    { sessionId },
    { [`agentOutputs.${agentId}`]: prevOut + '\n\n--- FOLLOW-UP ---\n' + output }
  );

  return output;
}

/* ─────────────────────────────────────────────
   MAIN PIPELINE
───────────────────────────────────────────── */
async function runAgentPipeline(sessionId, userId, domain, interactionText, io) {
  const start = Date.now();

  try {
    // ── 1. PLANNER ──────────────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 1, total: 7, percent: 5,
      message: 'Planner building orchestration plan...',
    });

    const planOutput = await streamAgent(
      'planner',
      PROMPTS.planner(domain, interactionText),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.planner':  planOutput,
      'agentStatuses.planner': 'done',
    });

    // ── 2. INGESTION ────────────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 2, total: 7, percent: 20,
      message: 'Ingestion agent extracting customer data...',
    });

    const ingestionOutput = await streamAgent(
      'ingestion',
      PROMPTS.ingestion(domain, interactionText, planOutput),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.ingestion':  ingestionOutput,
      'agentStatuses.ingestion': 'done',
    });

    const companyMatch = ingestionOutput.match(/company[:\s]+([^\n,]+)/i);
    const company      = companyMatch ? companyMatch[1].trim() : 'Unknown';

    // ── 3. KNOWLEDGE ────────────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 3, total: 7, percent: 35,
      message: 'Knowledge agent retrieving playbooks and intel...',
    });

    const pastMemories = await Memory
      .find({ userId, domain })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const pastMemoryText = pastMemories.length > 0
      ? pastMemories
          .map(m => `[${m.company}] ${m.summary || ''}\nLearnings: ${(m.keyLearnings || []).join('; ')}`)
          .join('\n\n')
      : '';

    const knowledgeOutput = await streamAgent(
      'knowledge',
      PROMPTS.knowledge(domain, ingestionOutput, pastMemoryText),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.knowledge':  knowledgeOutput,
      'agentStatuses.knowledge': 'done',
    });

    // ── 4. ANALYSIS ─────────────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 4, total: 7, percent: 50,
      message: 'Analysis agent scoring opportunity and risks...',
    });

    const analysisOutput = await streamAgent(
      'analysis',
      PROMPTS.analysis(domain, ingestionOutput, knowledgeOutput),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.analysis':  analysisOutput,
      'agentStatuses.analysis': 'done',
    });

    const oppMatch  = analysisOutput.match(/opportunity score[:\s]+(\d+)/i);
    const riskMatch = analysisOutput.match(/risk score[:\s]+(\d+)/i);
    const oppScore  = oppMatch  ? parseInt(oppMatch[1])  : 0;
    const riskScore = riskMatch ? parseInt(riskMatch[1]) : 0;

    // ── 5. RECOMMENDATION ───────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 5, total: 7, percent: 65,
      message: 'Recommendation agent generating next best actions...',
    });

    const recOutput = await streamAgent(
      'recommendation',
      PROMPTS.recommendation(domain, ingestionOutput, analysisOutput),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.recommendation':  recOutput,
      'agentStatuses.recommendation': 'done',
    });

    const recommendations = parseRecommendations(recOutput);

    // ── 6. EXPLAINER ────────────────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 6, total: 7, percent: 80,
      message: 'Explainer agent building evidence chains...',
    });

    const explainerOutput = await streamAgent(
      'explainer',
      PROMPTS.explainer(domain, recOutput, analysisOutput, ingestionOutput),
      sessionId, io
    );

    await Analysis.findOneAndUpdate({ sessionId }, {
      'agentOutputs.explainer':  explainerOutput,
      'agentStatuses.explainer': 'done',
    });

    // ── 7. MEMORY (non-blocking) ─────────────────
    io.to(sessionId).emit('pipeline:progress', {
      step: 7, total: 7, percent: 93,
      message: 'Memory agent storing learnings...',
    });

    // Fire and forget — don't block pipeline completion
    (async () => {
      try {
        const memoryOutput = await streamAgent(
          'memory',
          PROMPTS.memory(domain, company, ingestionOutput, recOutput),
          sessionId, io
        );

        await Analysis.findOneAndUpdate({ sessionId }, {
          'agentOutputs.memory':  memoryOutput,
          'agentStatuses.memory': 'done',
        });

        const learningsMatch = memoryOutput.match(/KEY LEARNINGS:([\s\S]*?)(?:WATCH|$)/i);
        const watchMatch     = memoryOutput.match(/WATCH POINTS:([\s\S]*?)(?:SUMMARY|$)/i);
        const summaryMatch   = memoryOutput.match(/SUMMARY:([\s\S]*?)$/i);

        await Memory.create({
          userId, domain, company, sessionId,
          summary:           summaryMatch   ? summaryMatch[1].trim().slice(0, 300) : '',
          keyLearnings:      extractBullets(learningsMatch ? learningsMatch[1] : ''),
          futureWatchPoints: extractBullets(watchMatch     ? watchMatch[1]     : ''),
        });
      } catch (memErr) {
        console.warn('[Memory Agent] non-blocking error:', memErr.message);
      }
    })();

    // ── FINALIZE ────────────────────────────────
    const elapsed = Date.now() - start;

    await Analysis.findOneAndUpdate({ sessionId }, {
      status:      'completed',
      completedAt: new Date(),
      'parsedResults.recommendations': recommendations,
      'metrics.opportunityScore': oppScore,
      'metrics.riskScore':        riskScore,
      'metrics.totalActions':     recommendations.length,
      'metrics.elapsedMs':        elapsed,
    });

    io.to(sessionId).emit('pipeline:complete', {
      sessionId,
      elapsed,
      metrics: {
        opportunityScore: oppScore,
        riskScore:        riskScore,
        totalActions:     recommendations.length,
      },
    });

    io.to(sessionId).emit('pipeline:progress', {
      step: 7, total: 7, percent: 100,
      message: `Pipeline complete in ${(elapsed / 1000).toFixed(1)}s`,
    });

  } catch (err) {
    console.error('[Pipeline Error]', err.message);
    await Analysis.findOneAndUpdate({ sessionId }, { status: 'failed', error: err.message });
    io.to(sessionId).emit('pipeline:error', { sessionId, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function parseRecommendations(text) {
  const blocks = text.split(/ACTION\s*\d+:/i).filter(b => b.trim());
  return blocks.slice(0, 6).map((block, i) => {
    const get = (key) => {
      const m = block.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const talksMatch = block.match(/TALKING POINTS:([\s\S]*?)(?:---|$)/i);
    const talks = talksMatch
      ? talksMatch[1].split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
      : [];

    return {
      id:              `rec_${String(i + 1).padStart(3, '0')}`,
      rank:            i + 1,
      action:          block.split('\n')[0].trim().slice(0, 100),
      description:     get('DESCRIPTION'),
      category:        'engagement',
      priority:        get('PRIORITY') || 'high',
      timeframe:       get('TIMEFRAME'),
      owner:           get('OWNER'),
      expectedOutcome: get('EXPECTED OUTCOME'),
      confidence:      parseInt(get('CONFIDENCE')) || 75,
      effort:          'medium',
      impact:          'high',
      talkingPoints:   talks,
      status:          'pending',
    };
  });
}

function extractBullets(text) {
  return text
    .split('\n')
    .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
    .filter(l => l.length > 10)
    .slice(0, 5);
}

/* ─────────────────────────────────────────────
   SOCKET HANDLERS
───────────────────────────────────────────── */
function registerSocketHandlers(socket, io) {
  socket.on('join:session', ({ sessionId }) => {
    socket.join(sessionId);
    console.log(`[Socket] ${socket.id} joined ${sessionId}`);
  });

  socket.on('leave:session', ({ sessionId }) => socket.leave(sessionId));

  socket.on('agent:followup', async ({ sessionId, userId, agentId, question }) => {
    try {
      await rerunAgent(agentId, sessionId, userId, question, io);
    } catch (err) {
      socket.emit('agent:error', { agent: agentId, error: err.message });
    }
  });
}

module.exports = { runAgentPipeline, registerSocketHandlers, AGENT_META };