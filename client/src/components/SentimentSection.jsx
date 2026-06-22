import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from 'lucide-react';

function SentimentBar({ score }) {
  // score is -100 to 100; map to 0-100% for bar
  const pct = Math.max(0, Math.min(100, (score + 100) / 2));
  const cls = score > 20 ? 'bullish' : score < -20 ? 'bearish' : 'neutral';
  return (
    <div className="sentiment-meter">
      <div className="sentiment-fill" style={{ width: `${pct}%` }} data-class={cls}>
        <div className={`sentiment-fill ${cls}`} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export default function SentimentSection({ sentiment }) {
  if (!sentiment) return null;
  const {
    overallSentiment, sentimentScore, mediaAttention, investorSentiment,
    keyThemes, recentCatalysts, sentimentSummary, regulatoryRisks, macroFactors,
  } = sentiment;

  const SentimentIcon = overallSentiment === 'bullish'
    ? TrendingUp : overallSentiment === 'bearish'
      ? TrendingDown : Minus;

  const sentimentColor = overallSentiment === 'bullish'
    ? 'var(--invest-color)' : overallSentiment === 'bearish'
      ? 'var(--pass-color)' : 'var(--hold-color)';

  return (
    <div className="card animate-in" id="sentiment-card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <SentimentIcon size={14} color="var(--accent-purple)" />
          </div>
          Market Sentiment
        </div>
        {overallSentiment && (
          <span style={{ color: sentimentColor, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {overallSentiment}
          </span>
        )}
      </div>

      {sentimentScore !== undefined && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Bearish</span>
            <span style={{ color: sentimentColor }}>Score: {sentimentScore}</span>
            <span>Bullish</span>
          </div>
          <div className="sentiment-meter">
            <div
              className={`sentiment-fill ${overallSentiment || 'neutral'}`}
              style={{ width: `${Math.max(0, Math.min(100, (sentimentScore + 100) / 2))}%` }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, marginBottom: 16 }}>
        {mediaAttention && (
          <div className="metric-cell">
            <div className="metric-label">Media Attention</div>
            <div className={`metric-value ${mediaAttention === 'high' ? 'positive' : 'neutral'}`} style={{ fontSize: 16 }}>
              {mediaAttention.toUpperCase()}
            </div>
          </div>
        )}
        {investorSentiment && (
          <div className="metric-cell">
            <div className="metric-label">Investor Mood</div>
            <div className="metric-value neutral" style={{ fontSize: 13 }}>{investorSentiment}</div>
          </div>
        )}
      </div>

      {keyThemes?.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Key Themes
          </div>
          <div className="sentiment-tags">
            {keyThemes.map((t, i) => (
              <span key={i} className="sentiment-tag">{t}</span>
            ))}
          </div>
        </>
      )}

      {recentCatalysts?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Catalysts
          </div>
          <ul className="sr-list">
            {recentCatalysts.slice(0, 4).map((c, i) => (
              <li key={i} className="sr-item">
                <div className="sr-dot" style={{ background: 'var(--accent-purple)' }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sentimentSummary && (
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {sentimentSummary}
        </p>
      )}
    </div>
  );
}
