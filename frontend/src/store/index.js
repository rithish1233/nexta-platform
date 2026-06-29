import { create } from 'zustand';

export const useAuthStore = create(set => ({
  user: null, token: localStorage.getItem('nexta_token'), isLoading: true,
  setAuth:    (user, token) => { localStorage.setItem('nexta_token', token); set({ user, token }); },
  logout:     ()            => { localStorage.removeItem('nexta_token'); set({ user: null, token: null }); },
  setUser:    user          => set({ user }),
  setLoading: v             => set({ isLoading: v }),
}));

const AGENT_IDS = ['planner','ingestion','knowledge','analysis','recommendation','explainer','memory'];

export const usePipelineStore = create((set, get) => ({
  sessionId:    null,
  status:       'idle',  // idle | running | complete | error
  progress:     { step: 0, total: 7, percent: 0, message: '' },
  agents:       Object.fromEntries(AGENT_IDS.map(id => [id, {
    status:  'idle',   // idle | running | complete | error
    output:  '',
    streaming: false,
  }])),
  activeAgent:  null,
  error:        null,
  recommendations: [],
  metrics:      {},

  setSessionId: id     => set({ sessionId: id }),
  setStatus:    s      => set({ status: s }),
  setProgress:  p      => set({ progress: p }),
  setError:     e      => set({ error: e, status: 'error' }),
  setMetrics:   m      => set({ metrics: m }),
  setRecs:      recs   => set({ recommendations: recs }),

  agentStart: (agentId) => set(state => ({
    activeAgent: agentId,
    agents: { ...state.agents, [agentId]: { ...state.agents[agentId], status: 'running', output: '', streaming: true } },
  })),

  agentToken: (agentId, token) => set(state => ({
    agents: { ...state.agents, [agentId]: {
      ...state.agents[agentId],
      output: state.agents[agentId].output + token,
    }},
  })),

  agentComplete: (agentId, output) => set(state => ({
    agents: { ...state.agents, [agentId]: { status: 'complete', output, streaming: false } },
  })),

  agentError: (agentId) => set(state => ({
    agents: { ...state.agents, [agentId]: { ...state.agents[agentId], status: 'error', streaming: false } },
  })),

  updateRecStatus: (recId, status) => set(state => ({
    recommendations: state.recommendations.map(r => r.id === recId ? { ...r, status } : r),
  })),

  appendAgentOutput: (agentId, text) => set(state => ({
    agents: { ...state.agents, [agentId]: {
      ...state.agents[agentId],
      output: state.agents[agentId].output + text,
    }},
  })),

  reset: () => set({
    sessionId: null, status: 'idle', activeAgent: null, error: null, recommendations: [], metrics: {},
    progress: { step: 0, total: 7, percent: 0, message: '' },
    agents: Object.fromEntries(AGENT_IDS.map(id => [id, { status: 'idle', output: '', streaming: false }])),
  }),
}));
