const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  company: { type: String, required: true },
  ticker: { type: String, default: 'N/A' },
  verdict: { type: String, enum: ['INVEST', 'PASS', 'HOLD'], required: true },
  score: { type: Number, min: 0, max: 100 },
  summary: { type: String },
  profile: { type: mongoose.Schema.Types.Mixed },
  financials: { type: mongoose.Schema.Types.Mixed },
  sentimentAnalysis: { type: mongoose.Schema.Types.Mixed },
  competitiveAnalysis: { type: mongoose.Schema.Types.Mixed },
  reasoning: { type: String },
  keyStrengths: [{ type: String }],
  keyRisks: [{ type: String }],
  recommendation: { type: String },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
