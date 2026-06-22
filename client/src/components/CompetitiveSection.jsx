import { Shield, Swords, AlertTriangle } from 'lucide-react';

export default function CompetitiveSection({ competitive }) {
  if (!competitive) return null;
  const {
    moatStrength, moatSources, mainCompetitors, marketPosition,
    competitiveThreats, disruptionRisk, competitiveSummary, supplyChainRisk,
  } = competitive;

  return (
    <div className="card animate-in" id="competitive-card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Swords size={14} color="var(--accent-cyan)" />
          </div>
          Competitive Position
        </div>
        {marketPosition && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {marketPosition}
          </span>
        )}
      </div>

      {/* Moat */}
      {moatStrength && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Economic Moat
          </div>
          <span className={`moat-badge ${moatStrength.toLowerCase()}`}>
            <Shield size={13} />
            {moatStrength.toUpperCase()} MOAT
          </span>
          {moatSources?.length > 0 && (
            <div className="sentiment-tags" style={{ marginTop: 8 }}>
              {moatSources.map((s, i) => (
                <span key={i} className="sentiment-tag">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {disruptionRisk && (
          <div className="metric-cell">
            <div className="metric-label">Disruption Risk</div>
            <div className={`metric-value ${disruptionRisk === 'high' ? 'negative' : disruptionRisk === 'low' ? 'positive' : 'neutral'}`} style={{ fontSize: 15 }}>
              {disruptionRisk.toUpperCase()}
            </div>
          </div>
        )}
        {supplyChainRisk && (
          <div className="metric-cell">
            <div className="metric-label">Supply Chain Risk</div>
            <div className={`metric-value ${supplyChainRisk === 'high' ? 'negative' : supplyChainRisk === 'low' ? 'positive' : 'neutral'}`} style={{ fontSize: 15 }}>
              {supplyChainRisk.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Competitors */}
      {mainCompetitors?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Main Competitors
          </div>
          <div className="competitors-list">
            {mainCompetitors.slice(0, 5).map((c, i) => (
              <div key={i} className="competitor-item">
                <div>
                  <div className="competitor-name">{c.name}</div>
                  {c.ticker && <div className="competitor-ticker">{c.ticker}</div>}
                </div>
                {c.threat && (
                  <span className={`threat-badge ${c.threat.toLowerCase()}`}>
                    {c.threat}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats */}
      {competitiveThreats?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Competitive Threats
          </div>
          <ul className="sr-list">
            {competitiveThreats.slice(0, 4).map((t, i) => (
              <li key={i} className="sr-item">
                <div className="sr-dot risk" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {competitiveSummary && (
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {competitiveSummary}
        </p>
      )}
    </div>
  );
}
