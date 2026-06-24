# InvestAI — Autonomous Investment Research Agent

> **Take-Home Assignment** | AI Product Development Engineer (Intern) | InsideIIM × Altuni AI Labs

InvestAI is an advanced, autonomous AI agent designed to research any publicly traded company and deliver a clear **INVEST / PASS / HOLD** verdict. It aggregates financial data, parses market sentiment, assesses competitive moats, and streams step-by-step progress live to the user.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [How to Run (Setup Steps)](#-how-to-run)
3. [How It Works (Approach & Architecture)](#-how-it-works)
4. [Key Decisions & Trade-offs](#-key-decisions--trade-offs)
5. [Example Runs](#-example-runs)
6. [What We Would Improve with More Time](#-what-we-would-improve-with-more-time)
7. [BONUS: LLM Chat Transcript & Pair Programming Logs](#-bonus-llm-chat-transcript)
8. [Zip Archive Download](#-zip-archive-download)

---

## 🔍 Overview

InvestAI conducts multi-dimensional investment analysis in seconds:
- 📊 **Financial Health Stats:** Pulls key financial stats (Market Cap, P/E, Margins, Cash, Debt, FCF) directly from Yahoo Finance.
- 📰 **Sentiment & Catalysts:** Analyzes news narrative and investor mood to determine overall market sentiment (Bullish/Neutral/Bearish).
- ⚔️ **Competitive Landscape:** Assesses economic moat strength, identifies key competitors, and rates industry disruption risk.
- 🧠 **Synthesis & Verdict:** An AI analyst synthesizes all inputs to render a clear verdict, rating confidence (0–100%) and providing actionable reasoning.
- 📈 **Interactive Data Visualizations:** Displays tabbed charts (Margins, Cash vs. Debt, and Price Benchmarks) to visualize metrics.
- 🔄 **Graceful Offline Mode:** Runs seamlessly even if MongoDB is offline or inaccessible, skipping saves and loading fallback empty states without hanging or crashing.

---

## 🚀 How to Run

### Prerequisites
- **Node.js** v20+ (recommended for full `yahoo-finance2` compatibility)
- **MongoDB Atlas** or a local MongoDB database (optional)
- **API Keys** for Groq (Llama 3.3 primary LLM) and Google AI Studio (Gemini 1.5 fallback LLM)

### 1. Installation
Clone the repository and install dependencies in both the `server` and `client` folders:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `server` directory by copying `.env.example`:
```bash
cp server/.env.example server/.env
```
Fill in the following values inside `server/.env`:
```env
MONGODB_URI=mongodb+srv://...       # Your MongoDB connection string
GROQ_API_KEY=gsk_...                # Groq API key (Primary LLM)
GEMINI_API_KEY=AQ...                # Gemini API key (Fallback LLM)
PORT=5000                           # Port for backend server
CLIENT_URL=http://localhost:5173    # Frontend URL (for CORS)
```

### 3. Running the App
Start both processes locally.

**Backend Server:**
```bash
cd server
npm run dev
```
*The server will run on `http://localhost:5000`.*

**Frontend Client:**
```bash
cd client
npm run dev
```
*The React web app will open at `http://localhost:5173/`.*

---

## 🛠️ How It Works

### Approach & Architecture
InvestAI uses a decoupled **React frontend** and **Express backend** powered by **LangGraph.js** to run the agentic workflow.

```
       [ React Frontend (Vite) ]
                  ↕
       [ Express API Server ] (SSE Streams)
                  ↕
       [ LangGraph StateGraph ]
          ├─ Node 1: Company Profile  (Ticker validation & Overview)
          ├─ Node 2: Financial Stats  (Yahoo Finance scraper + LLM Summary)
          ├─ Node 3: Market Sentiment (LLM Catalyst & News Narrative)
          ├─ Node 4: Economic Moat    (Moat strength & Competitor profiles)
          └─ Node 5: Investment Decision (Synthesis & INVEST/PASS/HOLD Verdict)
                  ↕
       [ MongoDB Database ] (Past Reports Storage)
```

1. **State Management (LangGraph.js):** The research pipeline is built using a stateful directed graph (`StateGraph`). Each graph node executes a specialized analytical step and appends its structured data to the shared state, creating a unified compound context for the final verdict.
2. **LLM Orchestration:** `llama-3.3-70b-versatile` via **Groq** serves as the primary intelligence due to its high speeds. If rate limits or timeouts occur, it automatically switches to `gemini-1.5-flash` via **Google AI SDK** as a fallback.
3. **Real-time Streaming:** Long-running agent analyses can feel sluggish. InvestAI uses **Server-Sent Events (SSE)** to stream step logs, ticker updates, and intermediate findings to the UI in real time.
4. **Data Aggregation:** We scrape live financial metrics and analyst consensus using the `yahoo-finance2` library.

---

## ⚖️ Key Decisions & Trade-offs

### 1. Fail-Fast Mongoose Setup vs. Query Buffering
* **Decision:** We globally disabled Mongoose's default command buffering (`bufferCommands: false`) and wrapped all database queries/saves with connectivity state checks.
* **Trade-off:** If MongoDB is offline (e.g., due to Atlas IP whitelisting limits), report saving is skipped and the history list renders an empty state instantly. This ensures the primary analysis feature remains fully functional without 10-second request timeouts or socket hang-ups (`net::ERR_CONNECTION_RESET`).

### 2. Direct Ticker Verification vs. Search Scraper
* **Decision:** Updated the ticker utility to validate input strings directly against Yahoo Finance's quote endpoint.
* **Trade-off:** Ticker symbols input directly (like `ETERNAL.NS` or `AAPL`) skip search query steps, improving lookup speed. If the input is a company name (e.g., "Apple"), it falls back to the search index and filters out non-financial Crunchbase records.

### 3. Recharts tabbed stats visualization
* **Decision:** Integrated interactive tabbed graphs (Profitability, Balance Sheet, Price Ranges) into the dashboard.
* **Trade-off:** Adds a visual layer that requires processing data array ranges client-side, but significantly improves UI appeal.

---

## 📈 Example Runs

### 1. Apple Inc. (`AAPL`) — Verdict: INVEST (Score: 82/100)
- **Summary:** Highly robust business profile, wide economic moat from ecosystem lock-in, strong gross margins (approx. 46%), and massive free cash flow generation.
- **Verdict Details:** High gross margins and services growth make it an attractive long-term hold with low volatility.

### 2. Eternal greetings Ltd (`ETERNAL.NS` / formerly Zomato listing) — Verdict: PASS (Score: 80/100)
- **Background:** Zomato was officially renamed to **Eternal Limited** in March 2025 (trading under `ETERNAL.NS` / `ETERNAL.BO`).
- **Summary:** High debt-to-equity ratio, low operating margins, and negative return on assets make it a very high-risk investment.
- **Verdict Details:** Recommended pass due to underlying balance sheet stress.

---

## 🔮 What We Would Improve with More Time

1. **Live News Crawling:** Integrate Tavily search or NewsAPI inside the Sentiment node to inject actual live weekly news articles instead of relying solely on the LLM's parametric knowledge.
2. **Historical Stock Charts:** Wire the Recharts component to historical datasets (using Yahoo Finance's `chart` endpoint) to plot 1-year and 5-year historical trends.
3. **Discounted Cash Flow (DCF) Calculator:** Code a mathematical DCF modeling script inside the financial tools layer to supply an automated "intrinsic value" estimate alongside the LLM's opinion.
4. **Multi-Stock Comparison:** Create a comparison matrix allowing users to pin 3 companies side-by-side to review verdicts, scores, and P/E ratios.

---

## 💬 BONUS: LLM Chat Transcript

We pair-programmed this assignment interactively with the AI agent. You can view the full development logs, prompt records, and debug timelines in the file:
👉 **[LLM_CHAT_TRANSCRIPT.md](file:///c:/Users/hrida/Documents/Inside%20IIm/Invest%20AI/LLM_CHAT_TRANSCRIPT.md)**

---

## 📦 Zip Archive Download

The project codebase, assets, and README files have been packaged into a single ZIP file for submission.

📁 **Local Path:** [InvestAI_Assignment.zip](file:///c:/Users/hrida/Documents/Inside%20IIm/Invest%20AI/InvestAI_Assignment.zip)

*(See instructions in the response on how to download or access this file if hosted).*
