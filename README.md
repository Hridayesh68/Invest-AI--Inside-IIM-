# InvestAI — AI Investment Research Agent

> **Take-Home Assignment** | AI Product Development Engineer (Intern) | InsideIIM × Altuni AI Labs

---

## Overview

**InvestAI** is an autonomous AI agent that takes a company name, performs multi-dimensional research, and delivers a clear **INVEST / PASS / HOLD** verdict with a confidence score (0–100) and detailed reasoning.

The agent researches:
- 📊 **Financial health** — market cap, P/E, margins, revenue growth, debt, FCF (via Yahoo Finance)
- 📰 **Sentiment & news** — market mood, investor sentiment, key catalysts
- ⚔️ **Competitive position** — economic moat, main competitors, disruption risk
- 🧠 **AI verdict** — synthesizes all data into a final investment decision

Results stream live in the UI step-by-step, and every report is saved to MongoDB for future reference.

---

## How to Run

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Set environment variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
MONGODB_URI=mongodb+srv://...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
PORT=5000
```

### 3. Run

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open **http://localhost:5173**

---

## How It Works — Architecture

```
User → React Frontend (Vite)
         ↕ POST /api/research (Server-Sent Events)
       Node.js + Express Backend
         ↕
       LangGraph.js StateGraph
         ├─ Node 1: companyProfile   → Find ticker, LLM company overview
         ├─ Node 2: financialAnalysis → Yahoo Finance API + LLM analysis
         ├─ Node 3: sentimentAnalysis → LLM sentiment from general knowledge
         ├─ Node 4: competitiveAnalysis → LLM moat & competitor analysis
         └─ Node 5: finalVerdict     → Synthesize → INVEST/PASS/HOLD + score
         ↕
       MongoDB (persist all reports)
```

### Agent Framework: LangGraph.js
The agent is built as a **StateGraph** — a directed acyclic graph where each node enriches the shared state. This means:
- Each analysis step gets full context from prior steps
- The final verdict node sees all research before deciding
- Steps run sequentially (compound context building)

### LLM: Groq (primary) + Gemini (fallback)
- **Groq** (`llama-3.3-70b-versatile`) is the primary LLM — extremely fast inference (~300 tok/s)
- **Gemini** (`gemini-1.5-flash`) auto-activates if Groq fails or rate-limits
- All prompts are structured to return JSON for reliable parsing

### Streaming: Server-Sent Events (SSE)
Instead of waiting 30–60 seconds for a full response, the UI receives live step updates via SSE. Each LangGraph node completion sends an event to the frontend, so users see the agent "thinking" in real time.

### Data: Yahoo Finance (yahoo-finance2)
Free, no API key needed. Fetches: price, market cap, P/E, forward P/E, EPS, revenue, margins, debt/equity, FCF, 52-week range, analyst consensus, target prices.

---

## Key Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|---|---|---|
| **Groq over OpenAI** | 10x faster, free tier, llama-3.3-70b is excellent for analysis | Groq may rate-limit at high volume |
| **Yahoo Finance (free)** | No API key needed, comprehensive data | Real-time data only, limited history |
| **SSE over WebSocket** | Simpler server-side, works over HTTP/1.1, no upgrade needed | Unidirectional only (but sufficient here) |
| **LangGraph sequential flow** | Each node builds on prior state — richer final verdict | Slower than parallel; ~45s total |
| **MongoDB persistence** | Users can revisit past analyses without re-running the agent | Adds latency on save; schema is flexible |
| **No real news API** | Kept stack minimal per requirement (Yahoo Finance only) | Sentiment is based on LLM knowledge, not live news |

**Left out:**
- Real-time news (would add Tavily/NewsAPI with more time)
- Portfolio tracking / watchlist
- Historical chart visualization (Recharts ready but not wired to historical data)
- User authentication

---

## Example Runs

### Apple (AAPL) — INVEST
> "Apple's wide economic moat (brand, ecosystem lock-in, services growth) combined with healthy margins (26% net) and $65B FCF makes it a strong long-term hold with upside. Verdict: **INVEST** | Score: 82"

### Tesla (TSLA) — HOLD
> "Tesla faces margin compression from price cuts and intensifying EV competition. Strong brand and energy business provide upside, but valuation remains stretched at current levels. Verdict: **HOLD** | Score: 54"

### Zomato — INVEST
> "Zomato's transition to profitability, strong India market position, and Blinkit hypergrowth make it a compelling growth story despite ongoing cash burn. Verdict: **INVEST** | Score: 71"

---

## What I Would Improve With More Time

1. **Live news ingestion** — Integrate Tavily or NewsAPI for real-time sentiment
2. **Historical charts** — Plot 1Y/5Y price performance using Yahoo Finance historical data
3. **Multi-company comparison** — Side-by-side INVEST/PASS scoring for a watchlist
4. **Portfolio mode** — Track a basket of stocks, get aggregate risk score
5. **Voice input** — Speak a company name, get verbal verdict (ElevenLabs TTS)
6. **Vercel deployment** — Deploy frontend to Vercel + backend to Railway/Render
7. **Better error recovery** — Retry individual failed LangGraph nodes instead of whole pipeline
8. **DCF model** — Integrate a simple Discounted Cash Flow calculation for intrinsic value

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Vanilla CSS |
| Backend | Node.js + Express |
| AI Orchestration | LangChain.js + LangGraph.js |
| Primary LLM | Groq (llama-3.3-70b-versatile) |
| Fallback LLM | Google Gemini (gemini-1.5-flash) |
| Financial Data | yahoo-finance2 (free) |
| Database | MongoDB Atlas (Mongoose) |
| Streaming | Server-Sent Events (SSE) |

---

*Built with AI assistance (Antigravity IDE / Claude) as part of the InsideIIM AI Product Intern assignment.*
