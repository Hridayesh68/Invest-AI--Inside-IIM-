const { ChatGroq } = require('@langchain/groq');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { StateGraph, Annotation, END } = require('@langchain/langgraph');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { fetchFinancialData, findTicker } = require('../tools/financialData');

// ─── LLM Setup ────────────────────────────────────────────────────────────────
function getGroqLLM() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 4096,
  });
}

function getGeminiLLM() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
}

/**
 * Calls LLM with Groq primary, Gemini fallback.
 */
async function callLLM(messages) {
  try {
    const groq = getGroqLLM();
    const response = await groq.invoke(messages);
    return { content: response.content, provider: 'groq' };
  } catch (err) {
    console.warn('[agent] Groq failed, falling back to Gemini:', err.message);
    try {
      const gemini = getGeminiLLM();
      const response = await gemini.invoke(messages);
      return { content: response.content, provider: 'gemini' };
    } catch (fallbackErr) {
      throw new Error(`Both LLMs failed. Groq: ${err.message} | Gemini: ${fallbackErr.message}`);
    }
  }
}

/**
 * Safely parses JSON from an LLM response string.
 * Tries multiple extraction strategies.
 */
function parseJSON(text, fallback = {}) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (_) {}
  try {
    // Extract first {...} block (handles markdown code fences too)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}
  return fallback;
}

// ─── State Schema (Annotation API — LangGraph v1.x) ──────────────────────────
// IMPORTANT: Node names must NOT match state key names in LangGraph.
// We use node names: stepProfile, stepFinancials, stepSentiment, stepCompetitive, stepVerdict
const AgentState = Annotation.Root({
  companyName:        Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  ticker:             Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  steps:              Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  profile:            Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  financials:         Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  sentimentAnalysis:  Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  competitiveAnalysis:Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  verdictDetails:     Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  verdict:            Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  score:              Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  summary:            Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  reasoning:          Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  keyStrengths:       Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  keyRisks:           Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  recommendation:     Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  agentError:         Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
});

// ─── Node: stepProfile — Company Profile & Ticker Discovery ──────────────────
async function stepProfile(state) {
  const steps = [...state.steps, { id: 1, title: 'Company Identification', status: 'running' }];
  try {
    const ticker = await findTicker(state.companyName);
    if (!ticker) {
      throw new Error(`Could not find a publicly traded company matching "${state.companyName}"`);
    }

    const messages = [
      new SystemMessage(`You are an expert financial analyst. Provide a concise company profile. Always respond with valid JSON only, no markdown fences.`),
      new HumanMessage(`Provide a structured profile for: "${state.companyName}" (ticker: ${ticker}).
Include:
1. What the company does (2-3 sentences)
2. Business model
3. Key markets/geographies
4. Main products/services
5. Founded year and key milestones
6. Recent developments

Respond ONLY with valid JSON (no markdown):
{
  "description": "...",
  "businessModel": "...",
  "markets": "...",
  "keyProducts": ["...", "..."],
  "founded": "...",
  "milestones": ["...", "..."],
  "recentDevelopments": "..."
}`),
    ];

    const result = await callLLM(messages);
    const profile = parseJSON(result.content, { description: result.content });

    const updatedSteps = steps.map(s =>
      s.id === 1 ? { ...s, status: 'done', detail: `Found ticker: ${ticker}` } : s
    );
    return { ticker, profile, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] stepProfile error:', error.message);
    const updatedSteps = steps.map(s =>
      s.id === 1 ? { ...s, status: 'error', detail: error.message } : s
    );
    return { agentError: error.message, steps: updatedSteps };
  }
}

// ─── Node: stepFinancials — Financial Data & Analysis ────────────────────────
async function stepFinancials(state) {
  if (state.agentError) return {};
  const steps = [...state.steps, { id: 2, title: 'Financial Analysis', status: 'running' }];
  try {
    const rawFinancials = await fetchFinancialData(state.ticker);

    const messages = [
      new SystemMessage(`You are a seasoned equity analyst. Respond ONLY with valid JSON, no markdown fences.`),
      new HumanMessage(`Analyze the financial health of ${state.companyName} (${state.ticker}):

${JSON.stringify(rawFinancials, null, 2)}

Respond ONLY with valid JSON:
{
  "financialHealthScore": <0-100>,
  "valuationAssessment": "overvalued|fairly valued|undervalued",
  "valuationRationale": "...",
  "profitabilityAssessment": "...",
  "debtAssessment": "...",
  "growthOutlook": "...",
  "analystConsensus": "...",
  "redFlags": ["..."],
  "positives": ["..."],
  "summary": "2-3 sentence summary"
}`),
    ];

    const result = await callLLM(messages);
    const analysis = parseJSON(result.content, {});
    const financials = { ...rawFinancials, analysis };

    const updatedSteps = steps.map(s =>
      s.id === 2 ? {
        ...s, status: 'done',
        detail: `Market Cap: ${rawFinancials.marketCapFormatted || 'N/A'} | P/E: ${rawFinancials.peRatio?.toFixed(2) || 'N/A'}`
      } : s
    );
    return { financials, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] stepFinancials error:', error.message);
    const updatedSteps = steps.map(s =>
      s.id === 2 ? { ...s, status: 'error', detail: error.message } : s
    );
    return { steps: updatedSteps };
  }
}

// ─── Node: stepSentiment — Market Sentiment Analysis ─────────────────────────
async function stepSentiment(state) {
  if (state.agentError) return {};
  const steps = [...state.steps, { id: 3, title: 'Sentiment & News Analysis', status: 'running' }];
  try {
    const messages = [
      new SystemMessage(`You are a financial news analyst. Respond ONLY with valid JSON, no markdown fences.`),
      new HumanMessage(`Analyze market sentiment for ${state.companyName} (${state.ticker}).

Company context:
${JSON.stringify(state.profile, null, 2)}

Respond ONLY with valid JSON:
{
  "overallSentiment": "bullish|neutral|bearish",
  "sentimentScore": <-100 to 100>,
  "mediaAttention": "high|medium|low",
  "investorSentiment": "very positive|positive|neutral|negative|very negative",
  "recentCatalysts": ["..."],
  "regulatoryRisks": "...",
  "macroFactors": "...",
  "insiderActivity": "...",
  "institutionalInterest": "...",
  "keyThemes": ["theme1", "theme2"],
  "sentimentSummary": "2-3 sentence summary"
}`),
    ];

    const result = await callLLM(messages);
    const sentimentAnalysis = parseJSON(result.content, {});

    const updatedSteps = steps.map(s =>
      s.id === 3 ? {
        ...s, status: 'done',
        detail: `Sentiment: ${sentimentAnalysis.overallSentiment || 'analyzed'} | Score: ${sentimentAnalysis.sentimentScore ?? 'N/A'}`
      } : s
    );
    return { sentimentAnalysis, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] stepSentiment error:', error.message);
    const updatedSteps = steps.map(s =>
      s.id === 3 ? { ...s, status: 'error', detail: error.message } : s
    );
    return { steps: updatedSteps };
  }
}

// ─── Node: stepCompetitive — Competitive Analysis ────────────────────────────
async function stepCompetitive(state) {
  if (state.agentError) return {};
  const steps = [...state.steps, { id: 4, title: 'Competitive Analysis', status: 'running' }];
  try {
    const messages = [
      new SystemMessage(`You are a strategic business analyst. Respond ONLY with valid JSON, no markdown fences.`),
      new HumanMessage(`Perform a competitive analysis for ${state.companyName} (${state.ticker}).

Financial context:
- Market Cap: ${state.financials?.marketCapFormatted || 'N/A'}
- Sector: ${state.financials?.sector || 'N/A'}
- Industry: ${state.financials?.industry || 'N/A'}

Respond ONLY with valid JSON:
{
  "moatStrength": "wide|narrow|none",
  "moatSources": ["..."],
  "mainCompetitors": [{"name": "...", "ticker": "...", "threat": "high|medium|low"}],
  "marketPosition": "market leader|strong player|niche player|struggling",
  "marketShare": "...",
  "competitiveThreats": ["..."],
  "disruptionRisk": "high|medium|low",
  "disruptionRationale": "...",
  "supplyChainRisk": "high|medium|low",
  "geopoliticalExposure": "high|medium|low",
  "competitiveSummary": "2-3 sentence assessment"
}`),
    ];

    const result = await callLLM(messages);
    const competitiveAnalysis = parseJSON(result.content, {});

    const updatedSteps = steps.map(s =>
      s.id === 4 ? {
        ...s, status: 'done',
        detail: `Moat: ${competitiveAnalysis.moatStrength || 'assessed'} | Position: ${competitiveAnalysis.marketPosition || 'N/A'}`
      } : s
    );
    return { competitiveAnalysis, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] stepCompetitive error:', error.message);
    const updatedSteps = steps.map(s =>
      s.id === 4 ? { ...s, status: 'error', detail: error.message } : s
    );
    return { steps: updatedSteps };
  }
}

// ─── Node: stepVerdict — Final Investment Verdict ────────────────────────────
async function stepVerdict(state) {
  if (state.agentError) return {};
  const steps = [...state.steps, { id: 5, title: 'Generating Investment Verdict', status: 'running' }];
  try {
    const messages = [
      new SystemMessage(`You are a top investment analyst. Respond ONLY with valid JSON, no markdown fences.`),
      new HumanMessage(`Provide a final investment verdict for ${state.companyName} (${state.ticker}).

## Company Profile:
${JSON.stringify(state.profile, null, 2)}

## Financial Analysis:
${JSON.stringify(state.financials?.analysis, null, 2)}
Key metrics: Market Cap ${state.financials?.marketCapFormatted}, P/E ${state.financials?.peRatio?.toFixed(2) ?? 'N/A'}, Revenue Growth ${state.financials?.revenueGrowth != null ? (state.financials.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}

## Sentiment:
${JSON.stringify(state.sentimentAnalysis, null, 2)}

## Competitive Position:
${JSON.stringify(state.competitiveAnalysis, null, 2)}

Respond ONLY with valid JSON:
{
  "verdict": "INVEST|PASS|HOLD",
  "confidenceScore": <0-100>,
  "investmentHorizon": "short-term (<1yr)|medium-term (1-3yr)|long-term (3yr+)",
  "riskLevel": "low|moderate|high|very high",
  "targetReturn": "expected % return or range",
  "keyStrengths": ["top 3-5 reasons TO invest"],
  "keyRisks": ["top 3-5 reasons AGAINST investing"],
  "catalysts": ["near-term catalysts"],
  "reasoning": "3-4 paragraph detailed reasoning",
  "recommendation": "1-2 sentence actionable recommendation",
  "summary": "One powerful headline sentence"
}`),
    ];

    const result = await callLLM(messages);
    const verdictData = parseJSON(result.content, { verdict: 'HOLD', confidenceScore: 50 });

    const updatedSteps = steps.map(s =>
      s.id === 5 ? {
        ...s, status: 'done',
        detail: `Verdict: ${verdictData.verdict} | Confidence: ${verdictData.confidenceScore}%`
      } : s
    );

    return {
      verdict:        verdictData.verdict || 'HOLD',
      score:          verdictData.confidenceScore || 50,
      summary:        verdictData.summary || '',
      reasoning:      verdictData.reasoning || '',
      keyStrengths:   verdictData.keyStrengths || [],
      keyRisks:       verdictData.keyRisks || [],
      recommendation: verdictData.recommendation || '',
      verdictDetails: verdictData,
      steps:          updatedSteps,
    };
  } catch (error) {
    console.error('[agent] stepVerdict error:', error.message);
    const updatedSteps = steps.map(s =>
      s.id === 5 ? { ...s, status: 'error', detail: error.message } : s
    );
    return { agentError: error.message, steps: updatedSteps };
  }
}

// ─── Build LangGraph ──────────────────────────────────────────────────────────
// Node names are deliberately different from all state field names to comply
// with LangGraph.js v1.x constraint: node name != state channel name
function buildResearchGraph() {
  const graph = new StateGraph(AgentState)
    .addNode('stepProfile',    stepProfile)
    .addNode('stepFinancials', stepFinancials)
    .addNode('stepSentiment',  stepSentiment)
    .addNode('stepCompetitive',stepCompetitive)
    .addNode('stepVerdict',    stepVerdict)
    .addEdge('__start__',       'stepProfile')
    .addEdge('stepProfile',    'stepFinancials')
    .addEdge('stepFinancials', 'stepSentiment')
    .addEdge('stepSentiment',  'stepCompetitive')
    .addEdge('stepCompetitive','stepVerdict')
    .addEdge('stepVerdict',    '__end__');

  return graph.compile();
}

/**
 * Runs the full investment research agent with live step callbacks.
 * @param {string} companyName
 * @param {function} onStep - called after each node completes
 * @returns {object} final state
 */
async function runInvestmentAgent(companyName, onStep = null) {
  const agent = buildResearchGraph();
  const initialInput = { companyName };
  let finalState = { companyName, steps: [] };

  for await (const chunk of await agent.stream(initialInput, { streamMode: 'updates' })) {
    // chunk is { nodeName: { ...updatedFields } }
    const [nodeName, updates] = Object.entries(chunk)[0];
    finalState = { ...finalState, ...updates };
    if (onStep) {
      onStep({ node: nodeName, state: finalState });
    }
  }

  return finalState;
}

module.exports = { runInvestmentAgent };
