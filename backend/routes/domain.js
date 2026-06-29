/* ── HISTORY ── */
const historyRouter = require('express').Router();
const { Analysis, Memory } = require('../models');
const { protect } = require('../middleware/auth');

historyRouter.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, domain } = req.query;
    const filter = { userId: req.user._id };
    if (domain) filter.domain = domain;
    const analyses = await Analysis.find(filter)
      .sort({ startedAt: -1 }).limit(+limit).skip((+page - 1) * +limit)
      .select('-interactionText -agentOutputs').lean();
    const total = await Analysis.countDocuments(filter);
    res.json({ analyses, total, page: +page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

historyRouter.get('/memory', protect, async (req, res) => {
  try {
    const memories = await Memory.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ memories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

historyRouter.delete('/:sessionId', protect, async (req, res) => {
  try {
    await Analysis.deleteOne({ sessionId: req.params.sessionId, userId: req.user._id });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── DOMAIN ── */
const domainRouter = require('express').Router();

const DOMAINS = [
  { id: 'saas',          label: 'SaaS Sales',             icon: '☁️' },
  { id: 'staffing',      label: 'Staffing & Recruitment',  icon: '👥' },
  { id: 'energy',        label: 'Energy Management',       icon: '⚡' },
  { id: 'csuccess',      label: 'Customer Success',        icon: '🏆' },
  { id: 'fintech',       label: 'FinTech Advisory',        icon: '💹' },
  { id: 'healthcare',    label: 'Healthcare Sales',        icon: '🏥' },
  { id: 'manufacturing', label: 'Manufacturing B2B',       icon: '🏭' },
];

const SAMPLES = {
  saas: `Meeting Notes – Acme Corp Discovery Call
Date: June 24, 2026 | Duration: 52 min
Attendees: Sarah Chen (VP Sales, Us), Mike Torres (AE, Us), Lisa Park (CTO, Acme), David Kim (Head of Engineering, Acme), Priya Nair (Procurement, Acme)

CURRENT STATE:
- Using Salesforce + 4 custom scripts. High manual overhead.
- David mentioned 3 data breaches in 18 months with current vendor. Compliance is board-level priority.
- Current contract renewal in October 2026. Looking to transition before then.
- Budget pre-approved: $250K–$400K/year. Currently spending $180K.

KEY QUOTES:
- Lisa: "Our team spends 40% of their time on manual reporting. It's unsustainable."
- David: "We need something our devs can actually extend. We hate black boxes."
- David: "The mobile UX on our current tool is embarrassing."

REQUIREMENTS:
- SOC2 Type II, GDPR compliance (EU expansion Q4 2026)
- REST API + webhook support
- Real-time analytics dashboard
- AI-powered recommendations
- Under 3-month implementation

COMPETITIVE: Also evaluating HubSpot Enterprise. Internal build on the table but David said "we don't want to maintain it". HubSpot quoted $220K.

POSITIVE SIGNALS:
- Lisa asked about SOC2 Type II certification
- David requested API documentation after the call
- Priya asked about payment terms (annual vs quarterly)
- Meeting ran 22 minutes over scheduled time

NEXT STEPS DISCUSSED:
- Send security whitepaper by Friday
- Schedule technical deep-dive next week
- Share 2 fintech customer references
- Prepare ROI calculator`,

  staffing: `Email Thread – TalentBridge Global
Date: June 18–24, 2026

FROM: Rachel Foster <rfoster@talentbridge.com>
We lost 3 key placements this month to faster competitors. Our ATS is 7 years old, no API access.
Stats: 450 active job orders, 12,000 candidate profiles, 25 recruiters. Coordinators spend 4+ hours daily on manual matching.

We evaluated two other vendors — one couldn't handle volume, the other's AI felt like a black box. We need explainability. Budget: $85K–$120K/year. Decision by July 15. Board approved.

Can we see the matching explanation feature this week?`,
};

domainRouter.get('/', (_req, res) => res.json({ domains: DOMAINS }));
domainRouter.get('/samples', (_req, res) => res.json({ samples: SAMPLES }));

module.exports = { historyRouter, domainRouter };
