import { CheckCircle, XCircle, FileText, Brain } from 'lucide-react';

export default function StrengthsRisks({ keyStrengths = [], keyRisks = [], reasoning }) {
  return (
    <>
      {/* Strengths & Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card animate-in" id="strengths-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CheckCircle size={14} color="var(--accent-green)" />
              </div>
              Key Strengths
            </div>
          </div>
          <ul className="sr-list">
            {keyStrengths.length > 0 ? keyStrengths.map((s, i) => (
              <li key={i} className="sr-item">
                <div className="sr-dot strength" />
                {s}
              </li>
            )) : (
              <li style={{ color: 'var(--text-muted)', fontSize: 14 }}>No strengths identified</li>
            )}
          </ul>
        </div>

        <div className="card animate-in" id="risks-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <XCircle size={14} color="var(--accent-red)" />
              </div>
              Key Risks
            </div>
          </div>
          <ul className="sr-list">
            {keyRisks.length > 0 ? keyRisks.map((r, i) => (
              <li key={i} className="sr-item">
                <div className="sr-dot risk" />
                {r}
              </li>
            )) : (
              <li style={{ color: 'var(--text-muted)', fontSize: 14 }}>No risks identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* AI Reasoning */}
      {reasoning && (
        <div className="card animate-in" id="reasoning-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Brain size={14} color="var(--accent-purple)" />
              </div>
              AI Analyst Reasoning
            </div>
          </div>
          <div className="reasoning-text">{reasoning}</div>
        </div>
      )}
    </>
  );
}
