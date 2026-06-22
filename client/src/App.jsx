import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Zap, AlertCircle } from 'lucide-react';
import SearchBar from './components/SearchBar';
import AgentThinking from './components/AgentThinking';
import VerdictCard from './components/VerdictCard';
import FinancialMetrics from './components/FinancialMetrics';
import SentimentSection from './components/SentimentSection';
import CompetitiveSection from './components/CompetitiveSection';
import StrengthsRisks from './components/StrengthsRisks';
import PastReports from './components/PastReports';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState('');
  const [pastReportsKey, setPastReportsKey] = useState(0);
  const resultsRef = useRef(null);
  const eventSourceRef = useRef(null);

  const handleSearch = async () => {
    if (!query.trim() || isLoading) return;

    // Reset state
    setIsLoading(true);
    setSteps([]);
    setResult(null);
    setError(null);
    setCurrentCompany(query.trim());

    // Close any existing SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
    }

    const controller = new AbortController();
    eventSourceRef.current = controller;

    try {
      const response = await fetch(`${API}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: query.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6).trim();
          } else if (line === '' && currentEvent && currentData) {
            // Process the event
            try {
              const parsed = JSON.parse(currentData);
              handleSSEEvent(currentEvent, parsed);
            } catch (e) {
              console.error('Parse error:', e, currentData);
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Connection failed. Is the server running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSEEvent = (event, data) => {
    switch (event) {
      case 'start':
        console.log('[SSE] Started:', data.message);
        break;

      case 'step':
        if (data.steps) {
          setSteps([...data.steps]);
        }
        break;

      case 'complete':
        setResult(data);
        setIsLoading(false);
        setPastReportsKey(k => k + 1); // refresh past reports
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        break;

      case 'saved':
        console.log('[SSE] Report saved, id:', data.reportId);
        break;

      case 'error':
        setError(data.message || 'An error occurred during research.');
        setIsLoading(false);
        break;

      default:
        break;
    }
  };

  const handleSelectPastReport = async (reportId) => {
    try {
      const res = await fetch(`${API}/api/reports/${reportId}`);
      const data = await res.json();
      setResult({
        verdict: data.verdict,
        score: data.score,
        company: data.company,
        ticker: data.ticker,
        summary: data.summary,
        reasoning: data.reasoning,
        keyStrengths: data.keyStrengths,
        keyRisks: data.keyRisks,
        recommendation: data.recommendation,
        profile: data.profile,
        financials: data.financials,
        sentimentAnalysis: data.sentimentAnalysis,
        competitiveAnalysis: data.competitiveAnalysis,
      });
      setCurrentCompany(data.company);
      setSteps([]);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error('Failed to load report:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (eventSourceRef.current) eventSourceRef.current.abort(); };
  }, []);

  const showThinking = isLoading && steps.length > 0;
  const showResults = !!result;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">📈</div>
          <span className="logo-text">InvestAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="header-badge">Powered by LangGraph + Groq</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">

        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            AI Investment Research Agent
          </div>
          <h1 className="hero-title">
            Should You{' '}
            <span className="hero-title-gradient">Invest or Pass?</span>
          </h1>
          <p className="hero-subtitle">
            Enter any publicly traded company. Our AI agent researches financials,
            sentiment, and competitive position — then gives you a clear verdict.
          </p>

          {/* Search */}
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </section>

        {/* ── Agent Thinking ── */}
        {(isLoading || (steps.length > 0 && !result)) && (
          <AgentThinking steps={steps} company={currentCompany} />
        )}

        {/* ── Loading spinner while starting ── */}
        {isLoading && steps.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <div className="loading-dots" style={{ justifyContent: 'center' }}>
              <span /><span /><span />
            </div>
            <p style={{ marginTop: 12, fontSize: 14 }}>Initializing research agent...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="error-box animate-in">
            <AlertCircle size={32} color="var(--accent-red)" style={{ marginBottom: 12 }} />
            <h3>Research Failed</h3>
            <p>{error}</p>
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Make sure the server is running on port 5000 and your API keys are set.
            </p>
          </div>
        )}

        {/* ── Results Dashboard ── */}
        {showResults && (
          <section className="results-section animate-in" ref={resultsRef} id="results-section">
            <div className="divider" />

            {/* Verdict — full width */}
            <VerdictCard
              data={{
                verdict: result.verdict,
                score: result.score,
                company: result.company || currentCompany,
                ticker: result.ticker,
                summary: result.summary,
                recommendation: result.recommendation,
                verdictDetails: result.verdictDetails,
              }}
            />

            {/* Financial Metrics — full width */}
            <div style={{ marginTop: 20 }}>
              <FinancialMetrics financials={result.financials} />
            </div>

            {/* Sentiment + Competitive — 2 columns */}
            <div className="results-grid" style={{ marginTop: 20 }}>
              <SentimentSection sentiment={result.sentimentAnalysis} />
              <CompetitiveSection competitive={result.competitiveAnalysis} />
            </div>

            {/* Strengths, Risks, Reasoning */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <StrengthsRisks
                keyStrengths={result.keyStrengths}
                keyRisks={result.keyRisks}
                reasoning={result.reasoning}
              />
            </div>
          </section>
        )}

        {/* ── Past Reports ── */}
        <div className="divider" style={{ marginTop: 60 }} />
        <PastReports key={pastReportsKey} onSelectReport={handleSelectPastReport} />
      </main>
    </div>
  );
}
