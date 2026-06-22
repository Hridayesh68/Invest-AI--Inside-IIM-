import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Clock, Activity } from 'lucide-react';

function VerdictIcon({ verdict }) {
  if (verdict === 'INVEST') return <TrendingUp size={20} color="var(--invest-color)" />;
  if (verdict === 'PASS') return <TrendingDown size={20} color="var(--pass-color)" />;
  return <Minus size={20} color="var(--hold-color)" />;
}

export default function VerdictCard({ data }) {
  const { verdict, score, company, ticker, summary, recommendation, verdictDetails } = data;
  const verdictClass = verdict?.toLowerCase() || 'hold';

  return (
    <div className={`verdict-card ${verdictClass} animate-in`} id="verdict-card">
      <div className="verdict-layout">
        {/* Left: Badge + Score */}
        <div className="verdict-badge-wrap">
          <div className={`verdict-badge ${verdict}`}>
            <VerdictIcon verdict={verdict} />
            &nbsp;{verdict}
          </div>
          <div
            className="verdict-score-circle"
            style={{
              borderColor:
                verdict === 'INVEST' ? 'rgba(16,185,129,0.4)'
                  : verdict === 'PASS' ? 'rgba(239,68,68,0.4)'
                    : 'rgba(245,158,11,0.4)',
            }}
          >
            <span
              className="verdict-score-num"
              style={{
                color:
                  verdict === 'INVEST' ? 'var(--invest-color)'
                    : verdict === 'PASS' ? 'var(--pass-color)'
                      : 'var(--hold-color)',
              }}
            >
              {score}
            </span>
            <span className="verdict-score-label">score</span>
          </div>
        </div>

        {/* Right: Content */}
        <div className="verdict-content">
          <div className="verdict-company">
            {company} {ticker && ticker !== 'N/A' ? `· ${ticker}` : ''}
          </div>
          <div className="verdict-summary">{summary}</div>

          {/* Meta tags */}
          <div className="verdict-meta">
            {verdictDetails?.riskLevel && (
              <span className="verdict-tag" title="Risk level">
                <Shield size={11} style={{ display: 'inline', marginRight: 4 }} />
                Risk: {verdictDetails.riskLevel}
              </span>
            )}
            {verdictDetails?.investmentHorizon && (
              <span className="verdict-tag">
                <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                {verdictDetails.investmentHorizon}
              </span>
            )}
            {verdictDetails?.targetReturn && (
              <span className="verdict-tag">
                <Activity size={11} style={{ display: 'inline', marginRight: 4 }} />
                Target: {verdictDetails.targetReturn}
              </span>
            )}
          </div>

          {recommendation && (
            <div className="verdict-recommendation">{recommendation}</div>
          )}
        </div>
      </div>
    </div>
  );
}
