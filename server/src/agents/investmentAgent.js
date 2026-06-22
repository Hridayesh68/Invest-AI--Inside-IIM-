const { ChatGroq } = require('@langchain/groq');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { StateGraph, END } = require('@langchain/langgraph');
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
async function callLLM(messages, options = {}) {
  try {
    const groq = getGroqLLM();
    const response = await groq.invoke(messages, options);
    return { content: response.content, provider: 'groq' };
  } catch (err) {
    console.warn('[agent] Groq failed, falling back to Gemini:', err.message);
    try {
      const gemini = getGeminiLLM();
      const response = await gemini.invoke(messages, options);
      return { content: response.content, provider: 'gemini' };
    } catch (fallbackErr) {
      throw new Error(`Both LLMs failed. Groq: ${err.message} | Gemini: ${fallbackErr.message}`);
    }
  }
}

// ─── Agent State ──────────────────────────────────────────────────────────────
const initialState = {
  companyName: '',
  ticker: null,
  steps: [],          // live progress steps streamed to client
  profile: null,
  financials: null,
  sentimentAnalysis: null,
  competitiveAnalysis: null,
  verdict: null,
  score: null,
  summary: null,
  reasoning: null,
  keyStrengths: [],
  keyRisks: [],
  recommendation: null,
  error: null,
};

// ─── Node: Step 1 — Company Profile & Ticker Discovery ───────────────────────
async function nodeCompanyProfile(state) {
  const steps = [...state.steps, { id: 1, title: 'Company Identification', status: 'running' }];

  try {
    // First find the ticker
    const ticker = await findTicker(state.companyName);
    if (!ticker) {
      throw new Error(`Could not find a publicly traded company matching "${state.companyName}"`);
    }

    const messages = [
      new SystemMessage(`You are an expert financial analyst. Provide a concise company profile.`),
      new HumanMessage(`Provide a structured profile for the company: "${state.companyName}" (ticker: ${ticker}).
        Include:
        1. What the company does (2-3 sentences)
        2. Business model (how it makes money)
        3. Key markets/geographies
        4. Main products/services
        5. Founded year and key milestones
        6. Recent major news (general knowledge)
        
        Respond in JSON format:
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
    let profile;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      profile = jsonMatch ? JSON.parse(jsonMatch[0]) : { description: result.content };
    } catch {
      profile = { description: result.content };
    }

    const updatedSteps = steps.map(s => s.id === 1 ? { ...s, status: 'done', detail: `Found ticker: ${ticker}` } : s);
    return { ...state, ticker, profile, steps: updatedSteps };
  } catch (error) {
    const updatedSteps = steps.map(s => s.id === 1 ? { ...s, status: 'error', detail: error.message } : s);
    return { ...state, error: error.message, steps: updatedSteps };
  }
}

// ─── Node: Step 2 — Financial Analysis ───────────────────────────────────────
async function nodeFinancialAnalysis(state) {
  if (state.error) return state;
  const steps = [...state.steps, { id: 2, title: 'Financial Analysis', status: 'running' }];

  try {
    const rawFinancials = await fetchFinancialData(state.ticker);

    const messages = [
      new SystemMessage(`You are a seasoned equity analyst. Analyze these financial metrics and provide insights.`),
      new HumanMessage(`Analyze the financial health of ${state.companyName} (${state.ticker}) based on these metrics:

${JSON.stringify(rawFinancials, null, 2)}

Provide a structured analysis in JSON:
{
  "financialHealthScore": <0-100>,
  "valuationAssessment": "overvalued|fairly valued|undervalued",
  "valuationRationale": "...",
  "profitabilityAssessment": "...",
  "debtAssessment": "...",
  "growthOutlook": "...",
  "analystConsensus": "...",
  "redFlags": ["...", "..."],
  "positives": ["...", "..."],
  "summary": "2-3 sentence financial summary"
}`),
    ];

    const result = await callLLM(messages);
    let analysis;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      analysis = {};
    }

    const financials = { ...rawFinancials, analysis };
    const updatedSteps = steps.map(s => s.id === 2 ? {
      ...s, status: 'done',
      detail: `Market Cap: ${rawFinancials.marketCapFormatted || 'N/A'} | P/E: ${rawFinancials.peRatio?.toFixed(2) || 'N/A'}`
    } : s);

    return { ...state, financials, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] Financial analysis error:', error.message);
    const updatedSteps = steps.map(s => s.id === 2 ? { ...s, status: 'error', detail: error.message } : s);
    return { ...state, steps: updatedSteps };
  }
}

// ─── Node: Step 3 — Sentiment & News Analysis ────────────────────────────────
async function nodeSentimentAnalysis(state) {
  if (state.error) return state;
  const steps = [...state.steps, { id: 3, title: 'Sentiment & News Analysis', status: 'running' }];

  try {
    const messages = [
      new SystemMessage(`You are a financial news analyst specializing in market sentiment and investor psychology.`),
      new HumanMessage(`Analyze the market sentiment and recent news for ${state.companyName} (${state.ticker}).

Company profile context:
${JSON.stringify(state.profile, null, 2)}

Based on your general knowledge up to your training cutoff, provide a sentiment analysis in JSON:
{
  "overallSentiment": "bullish|neutral|bearish",
  "sentimentScore": <-100 to 100>,
  "mediaAttention": "high|medium|low",
  "investorSentiment": "very positive|positive|neutral|negative|very negative",
  "recentCatalysts": ["positive or negative events that might affect stock"],
  "regulatoryRisks": "...",
  "macroFactors": "...",
  "insiderActivity": "...",
  "institutionalInterest": "...",
  "keyThemes": ["theme1", "theme2"],
  "sentimentSummary": "2-3 sentence summary of market sentiment"
}`),
    ];

    const result = await callLLM(messages);
    let sentimentAnalysis;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      sentimentAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      sentimentAnalysis = {};
    }

    const updatedSteps = steps.map(s => s.id === 3 ? {
      ...s, status: 'done',
      detail: `Sentiment: ${sentimentAnalysis.overallSentiment || 'analyzed'} | Score: ${sentimentAnalysis.sentimentScore || 'N/A'}`
    } : s);

    return { ...state, sentimentAnalysis, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] Sentiment analysis error:', error.message);
    const updatedSteps = steps.map(s => s.id === 3 ? { ...s, status: 'error', detail: error.message } : s);
    return { ...state, steps: updatedSteps };
  }
}

// ─── Node: Step 4 — Competitive Analysis ─────────────────────────────────────
async function nodeCompetitiveAnalysis(state) {
  if (state.error) return state;
  const steps = [...state.steps, { id: 4, title: 'Competitive Analysis', status: 'running' }];

  try {
    const messages = [
      new SystemMessage(`You are a strategic business analyst with deep expertise in competitive intelligence.`),
      new HumanMessage(`Perform a competitive analysis for ${state.companyName} (${state.ticker}).

Financial context:
- Market Cap: ${state.financials?.marketCapFormatted || 'N/A'}
- Sector: ${state.financials?.sector || 'N/A'}
- Industry: ${state.financials?.industry || 'N/A'}

Provide a structured competitive analysis in JSON:
{
  "moatStrength": "wide|narrow|none",
  "moatSources": ["competitive advantages like brand, network effects, switching costs, cost advantages"],
  "mainCompetitors": [
    {"name": "...", "ticker": "...", "threat": "high|medium|low"}
  ],
  "marketPosition": "market leader|strong player|niche player|struggling",
  "marketShare": "...",
  "competitiveThreats": ["...", "..."],
  "disruptionRisk": "high|medium|low",
  "disruptionRationale": "...",
  "supplyChainRisk": "high|medium|low",
  "geopoliticalExposure": "high|medium|low",
  "competitiveSummary": "2-3 sentence competitive assessment"
}`),
    ];

    const result = await callLLM(messages);
    let competitiveAnalysis;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      competitiveAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      competitiveAnalysis = {};
    }

    const updatedSteps = steps.map(s => s.id === 4 ? {
      ...s, status: 'done',
      detail: `Moat: ${competitiveAnalysis.moatStrength || 'assessed'} | Position: ${competitiveAnalysis.marketPosition || 'N/A'}`
    } : s);

    return { ...state, competitiveAnalysis, steps: updatedSteps };
  } catch (error) {
    console.error('[agent] Competitive analysis error:', error.message);
    const updatedSteps = steps.map(s => s.id === 4 ? { ...s, status: 'error', detail: error.message } : s);
    return { ...state, steps: updatedSteps };
  }
}

// ─── Node: Step 5 — Final Verdict ────────────────────────────────────────────
async function nodeFinalVerdict(state) {
  if (state.error) return state;
  const steps = [...state.steps, { id: 5, title: 'Generating Investment Verdict', status: 'running' }];

  try {
    const messages = [
      new SystemMessage(`You are Warren Buffett's top investment analyst. Make a clear, evidence-based investment decision.`),
      new HumanMessage(`Based on comprehensive research, provide a final investment verdict for ${state.companyName} (${state.ticker}).

## Company Profile:
${JSON.stringify(state.profile, null, 2)}

## Financial Analysis:
${JSON.stringify(state.financials?.analysis, null, 2)}
Key metrics: Market Cap ${state.financials?.marketCapFormatted}, P/E ${state.financials?.peRatio?.toFixed(2)}, Revenue Growth ${state.financials?.revenueGrowth ? (state.financials.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}

## Sentiment:
${JSON.stringify(state.sentimentAnalysis, null, 2)}

## Competitive Position:
${JSON.stringify(state.competitiveAnalysis, null, 2)}

Provide your final verdict in JSON:
{
  "verdict": "INVEST|PASS|HOLD",
  "confidenceScore": <0-100>,
  "investmentHorizon": "short-term (<1yr)|medium-term (1-3yr)|long-term (3yr+)",
  "riskLevel": "low|moderate|high|very high",
  "targetReturn": "expected % return or range",
  "keyStrengths": ["top 3-5 reasons TO invest"],
  "keyRisks": ["top 3-5 reasons AGAINST investing"],
  "catalysts": ["near-term catalysts that could move stock"],
  "reasoning": "3-4 paragraph detailed reasoning for the verdict",
  "recommendation": "1-2 sentence actionable recommendation",
  "summary": "One powerful headline sentence that captures the verdict"
}`),
    ];

    const result = await callLLM(messages);
    let verdictData;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      verdictData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      verdictData = { verdict: 'HOLD', confidenceScore: 50 };
    }

    const updatedSteps = steps.map(s => s.id === 5 ? {
      ...s, status: 'done',
      detail: `Verdict: ${verdictData.verdict} | Confidence: ${verdictData.confidenceScore}%`
    } : s);

    return {
      ...state,
      verdict: verdictData.verdict || 'HOLD',
      score: verdictData.confidenceScore || 50,
      summary: verdictData.summary,
      reasoning: verdictData.reasoning,
      keyStrengths: verdictData.keyStrengths || [],
      keyRisks: verdictData.keyRisks || [],
      recommendation: verdictData.recommendation,
      verdictDetails: verdictData,
      steps: updatedSteps,
    };
  } catch (error) {
    console.error('[agent] Final verdict error:', error.message);
    const updatedSteps = steps.map(s => s.id === 5 ? { ...s, status: 'error', detail: error.message } : s);
    return { ...state, error: error.message, steps: updatedSteps };
  }
}

// ─── Build LangGraph ──────────────────────────────────────────────────────────
function buildResearchGraph() {
  const graph = new StateGraph({
    channels: Object.fromEntries(
      Object.keys(initialState).map(k => [k, { value: (x, y) => y ?? x, default: () => initialState[k] }])
    ),
  });

  graph.addNode('companyProfile', nodeCompanyProfile);
  graph.addNode('financialAnalysis', nodeFinancialAnalysis);
  graph.addNode('sentimentAnalysis', nodeSentimentAnalysis);
  graph.addNode('competitiveAnalysis', nodeCompetitiveAnalysis);
  graph.addNode('finalVerdict', nodeFinalVerdict);

  graph.setEntryPoint('companyProfile');
  graph.addEdge('companyProfile', 'financialAnalysis');
  graph.addEdge('financialAnalysis', 'sentimentAnalysis');
  graph.addEdge('sentimentAnalysis', 'competitiveAnalysis');
  graph.addEdge('competitiveAnalysis', 'finalVerdict');
  graph.addEdge('finalVerdict', END);

  return graph.compile();
}

/**
 * Runs the full investment research agent.
 * @param {string} companyName 
 * @param {function} onStep - callback called after each node with current state
 * @returns {object} final research state
 */
async function runInvestmentAgent(companyName, onStep = null) {
  const agent = buildResearchGraph();
  let finalState = { ...initialState, companyName };

  for await (const chunk of await agent.stream({ ...initialState, companyName })) {
    const [nodeName, nodeState] = Object.entries(chunk)[0];
    finalState = { ...finalState, ...nodeState };
    if (onStep) {
      onStep({ node: nodeName, state: finalState });
    }
  }

  return finalState;
}

module.exports = { runInvestmentAgent };
