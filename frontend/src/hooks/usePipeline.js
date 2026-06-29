import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { joinSession, leaveSession, on, sendFollowup } from '../services/socket';
import { usePipelineStore, useAuthStore } from '../store';

export function usePipeline() {
  const store    = usePipelineStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const cleanups = useRef([]);

  useEffect(() => () => { cleanups.current.forEach(f => f()); }, []);

  const startPipeline = useCallback(async (domain, interactionText) => {
    store.reset();
    store.setStatus('running');

    try {
      const { data } = await analysisApi.start({ domain, interactionText });
      const { sessionId } = data;
      store.setSessionId(sessionId);
      joinSession(sessionId);

      cleanups.current = [
        on('agent:start',    ({ agent }) => store.agentStart(agent)),
        on('agent:stream',   ({ agent, token }) => { if (token) store.agentToken(agent, token); }),
        on('agent:complete', ({ agent, output }) => store.agentComplete(agent, output)),
        on('agent:error',    ({ agent }) => store.agentError(agent)),
        on('pipeline:progress', p => store.setProgress(p)),
        on('pipeline:complete', async ({ sessionId: sid, metrics }) => {
          store.setStatus('complete');
          store.setMetrics(metrics);
          try {
            const { data: full } = await analysisApi.get(sid);
            const recs = full.analysis?.parsedResults?.recommendations || [];
            store.setRecs(recs);
          } catch (_) {}
          navigate(`/workspace/${sid}`);
          leaveSession(sid);
        }),
        on('pipeline:error', ({ error }) => {
          store.setError(error);
          leaveSession(sessionId);
        }),
      ];
    } catch (err) {
      store.setError(err.response?.data?.error || err.message);
    }
  }, [navigate]);

  const approveRec = useCallback(async (recId) => {
    store.updateRecStatus(recId, 'approved');
    if (store.sessionId) await analysisApi.updateRec(store.sessionId, recId, 'approved').catch(() => {});
  }, [store.sessionId]);

  const rejectRec = useCallback(async (recId) => {
    store.updateRecStatus(recId, 'rejected');
    if (store.sessionId) await analysisApi.updateRec(store.sessionId, recId, 'rejected').catch(() => {});
  }, [store.sessionId]);

  const askFollowup = useCallback((agentId, question) => {
    if (!store.sessionId || !user) return;
    store.agentStart(agentId);
    sendFollowup(store.sessionId, user._id, agentId, question);
  }, [store.sessionId, user]);

  return { startPipeline, approveRec, rejectRec, askFollowup };
}
