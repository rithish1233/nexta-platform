const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { Analysis, AgentLog } = require('../models');
const { protect } = require('../middleware/auth');
const { runAgentPipeline } = require('../agents/orchestrator');

// Start pipeline
router.post('/start', protect, async (req, res) => {
  try {
    const { domain, interactionText } = req.body;
    if (!domain || !interactionText?.trim())
      return res.status(400).json({ error: 'domain and interactionText required' });

    const sessionId = uuidv4();
    await Analysis.create({ userId: req.user._id, sessionId, domain, interactionText });

    res.status(201).json({ sessionId });

    // Run async - don't await
    runAgentPipeline(sessionId, req.user._id, domain, interactionText, req.io)
      .catch(err => console.error('[Pipeline crash]', err));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get full analysis
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const a = await Analysis.findOne({ sessionId: req.params.sessionId, userId: req.user._id });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ analysis: a });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get logs
router.get('/:sessionId/logs', protect, async (req, res) => {
  try {
    const logs = await AgentLog.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update recommendation status
router.patch('/:sessionId/recommendations/:recId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const analysis = await Analysis.findOne({ sessionId: req.params.sessionId, userId: req.user._id });
    if (!analysis) return res.status(404).json({ error: 'Not found' });

    const rec = analysis.parsedResults.recommendations?.find(r => r.id === req.params.recId);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    rec.status      = status;
    if (status === 'approved') { rec.approvedAt = new Date(); rec.approvedBy = req.user.name; }

    analysis.metrics.approvedActions = analysis.parsedResults.recommendations.filter(r => r.status === 'approved').length;
    await analysis.save();
    res.json({ recommendation: rec });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rerun specific agent via HTTP (alternative to socket)
router.post('/:sessionId/rerun/:agentId', protect, async (req, res) => {
  try {
    const { question } = req.body;
    const { rerunAgent } = require('../agents/orchestrator');
    // This will stream via socket, HTTP just confirms start
    res.json({ started: true });
    rerunAgent(req.params.agentId, req.params.sessionId, req.user._id, question || 'Provide more detail', req.io)
      .catch(console.error);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
