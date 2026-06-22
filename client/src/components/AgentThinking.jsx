import { Check, X, Loader2, Circle, Building2, BarChart2, Newspaper, Swords, Target } from 'lucide-react';

const STEP_ICONS = {
  companyProfile: Building2,
  financialAnalysis: BarChart2,
  sentimentAnalysis: Newspaper,
  competitiveAnalysis: Swords,
  finalVerdict: Target,
};

const STEP_DEFS = [
  { id: 1, node: 'companyProfile', title: 'Company Identification' },
  { id: 2, node: 'financialAnalysis', title: 'Financial Analysis' },
  { id: 3, node: 'sentimentAnalysis', title: 'Sentiment & News Analysis' },
  { id: 4, node: 'competitiveAnalysis', title: 'Competitive Analysis' },
  { id: 5, node: 'finalVerdict', title: 'Generating Investment Verdict' },
];

function StepIcon({ status, NodeIcon }) {
  if (status === 'running') {
    return (
      <div className="step-icon-wrap running">
        <div className="step-spinner" />
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div className="step-icon-wrap done">
        <Check size={14} color="var(--accent-green)" strokeWidth={3} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="step-icon-wrap error">
        <X size={14} color="var(--accent-red)" strokeWidth={3} />
      </div>
    );
  }
  return (
    <div className="step-icon-wrap pending">
      <Circle size={10} color="var(--text-muted)" />
    </div>
  );
}

export default function AgentThinking({ steps = [], company }) {
  // Merge live steps with static definitions
  const merged = STEP_DEFS.map((def) => {
    const live = steps.find((s) => s.id === def.id);
    return { ...def, status: live?.status || 'pending', detail: live?.detail || '' };
  });

  return (
    <div className="thinking-section animate-in">
      <div className="thinking-title">
        <div className="loading-dots">
          <span /><span /><span />
        </div>
        AI Agent is researching{company ? ` "${company}"` : ''}
      </div>
      <div className="thinking-steps">
        {merged.map((step, idx) => {
          const Icon = STEP_ICONS[step.node] || Circle;
          const isLast = idx === merged.length - 1;
          return (
            <div
              key={step.id}
              className={`thinking-step ${step.status}`}
              id={`step-${step.id}`}
            >
              {!isLast && <div className="step-connector" />}
              <StepIcon status={step.status} NodeIcon={Icon} />
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                {step.detail && (
                  <div className="step-detail">{step.detail}</div>
                )}
                {step.status === 'running' && !step.detail && (
                  <div className="step-detail" style={{ color: 'var(--accent-blue)' }}>
                    Processing...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
