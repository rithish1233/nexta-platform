const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/* ── USER ── */
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },
  role:      { type: String, enum: ['analyst','manager','admin'], default: 'analyst' },
  domain:    { type: String, default: 'saas' },
  createdAt: { type: Date, default: Date.now },
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function(c) { return bcrypt.compare(c, this.password); };
userSchema.methods.toSafeObject = function() { const o = this.toObject(); delete o.password; return o; };

/* ── RECOMMENDATION ── */
const recSchema = new mongoose.Schema({
  id:              String,
  rank:            Number,
  action:          String,
  description:     String,
  category:        String,
  priority:        String,
  timeframe:       String,
  owner:           String,
  expectedOutcome: String,
  successMetric:   String,
  confidence:      Number,
  effort:          String,
  impact:          String,
  talkingPoints:   [String],
  status:          { type: String, enum: ['pending','approved','rejected','executed'], default: 'pending' },
  approvedAt:      Date,
  approvedBy:      String,
});

/* ── ANALYSIS ── */
const analysisSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId:       { type: String, required: true, unique: true },
  domain:          { type: String, required: true },
  interactionText: { type: String, required: true },
  status:          { type: String, enum: ['running','completed','failed'], default: 'running' },
  agentOutputs:    {
    planner:        { type: String, default: '' },
    ingestion:      { type: String, default: '' },
    knowledge:      { type: String, default: '' },
    analysis:       { type: String, default: '' },
    recommendation: { type: String, default: '' },
    explainer:      { type: String, default: '' },
    memory:         { type: String, default: '' },
  },
  agentStatuses: {
    planner:        { type: String, default: 'idle' },
    ingestion:      { type: String, default: 'idle' },
    knowledge:      { type: String, default: 'idle' },
    analysis:       { type: String, default: 'idle' },
    recommendation: { type: String, default: 'idle' },
    explainer:      { type: String, default: 'idle' },
    memory:         { type: String, default: 'idle' },
  },
  parsedResults: {
    customer:        mongoose.Schema.Types.Mixed,
    analysisData:    mongoose.Schema.Types.Mixed,
    recommendations: [recSchema],
    explanations:    mongoose.Schema.Types.Mixed,
    memoryUpdate:    mongoose.Schema.Types.Mixed,
  },
  metrics: {
    opportunityScore: { type: Number, default: 0 },
    riskScore:        { type: Number, default: 0 },
    totalActions:     { type: Number, default: 0 },
    approvedActions:  { type: Number, default: 0 },
    elapsedMs:        { type: Number, default: 0 },
  },
  error:       String,
  startedAt:   { type: Date, default: Date.now },
  completedAt: Date,
});

/* ── MEMORY ── */
const memorySchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain:             String,
  company:            String,
  sessionId:          String,
  keyLearnings:       [String],
  patternUpdates:     [String],
  successIndicators:  [String],
  futureWatchPoints:  [String],
  summary:            String,
  createdAt:          { type: Date, default: Date.now },
});

/* ── AGENT LOG ── */
const agentLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  agent:     String,
  level:     { type: String, enum: ['info','success','warning','error'], default: 'info' },
  message:   String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = {
  User:      mongoose.model('User', userSchema),
  Analysis:  mongoose.model('Analysis', analysisSchema),
  Memory:    mongoose.model('Memory', memorySchema),
  AgentLog:  mongoose.model('AgentLog', agentLogSchema),
};
