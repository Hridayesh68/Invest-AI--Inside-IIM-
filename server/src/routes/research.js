const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { runInvestmentAgent } = require('../agents/investmentAgent');

// POST /api/research — Stream agent progress via SSE
router.post('/research', async (req, res) => {
  const { company } = req.body;

  if (!company || company.trim().length < 2) {
    return res.status(400).json({ error: 'Please provide a valid company name.' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('start', { message: `Starting research on "${company}"...`, company });

    let finalState;
    finalState = await runInvestmentAgent(company.trim(), ({ node, state }) => {
      sendEvent('step', {
        node,
        steps: state.steps,
        ticker: state.ticker,
      });
    });

    if (finalState.agentError) {
      sendEvent('error', { message: finalState.agentError });
      res.end();
      return;
    }

    // Save to MongoDB
    try {
      const report = new Report({
        company: finalState.companyName,
        ticker: finalState.ticker,
        verdict: finalState.verdict,
        score: finalState.score,
        summary: finalState.summary,
        profile: finalState.profile,
        financials: finalState.financials,
        sentimentAnalysis: finalState.sentimentAnalysis,
        competitiveAnalysis: finalState.competitiveAnalysis,
        reasoning: finalState.reasoning,
        keyStrengths: finalState.keyStrengths,
        keyRisks: finalState.keyRisks,
        recommendation: finalState.recommendation,
      });
      const saved = await report.save();
      sendEvent('saved', { reportId: saved._id });
    } catch (dbError) {
      console.error('[routes] MongoDB save error:', dbError.message);
      // Don't fail — still send results
    }

    sendEvent('complete', {
      company: finalState.companyName,
      verdict: finalState.verdict,
      score: finalState.score,
      ticker: finalState.ticker,
      summary: finalState.summary,
      reasoning: finalState.reasoning,
      keyStrengths: finalState.keyStrengths,
      keyRisks: finalState.keyRisks,
      recommendation: finalState.recommendation,
      profile: finalState.profile,
      financials: finalState.financials,
      sentimentAnalysis: finalState.sentimentAnalysis,
      competitiveAnalysis: finalState.competitiveAnalysis,
      verdictDetails: finalState.verdictDetails,
      steps: finalState.steps,
    });

  } catch (error) {
    console.error('[routes] Research error:', error.message);
    sendEvent('error', { message: error.message || 'An unexpected error occurred.' });
  } finally {
    res.end();
  }
});

// GET /api/reports — Get past research reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({})
      .select('company ticker verdict score summary createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/:id — Get single report
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reports/:id — Delete a report
router.delete('/reports/:id', async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
