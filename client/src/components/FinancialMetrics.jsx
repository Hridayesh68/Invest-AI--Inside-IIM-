import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react';

function fmt(value, prefix = '', suffix = '', decimals = 2) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `${prefix}${num.toFixed(decimals)}${suffix}`;
}

function fmtPct(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtLarge(value) {
  if (!value) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function colorClass(value, positiveIsGood = true) {
  if (value === null || value === undefined || isNaN(value)) return '';
  const isPositive = value > 0;
  if (positiveIsGood) return isPositive ? 'positive' : 'negative';
  return isPositive ? 'negative' : 'positive';
}

function MetricCell({ label, value, sub, colorCls }) {
  return (
    <div className="metric-cell">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorCls || ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

export default function FinancialMetrics({ financials }) {
  if (!financials) return null;
  const { analysis } = financials;

  const metrics = [
    {
      label: 'Market Cap',
      value: financials.marketCapFormatted || fmtLarge(financials.marketCap),
    },
    {
      label: 'Current Price',
      value: financials.currentPrice ? `${financials.currency || '$'}${financials.currentPrice.toFixed(2)}` : 'N/A',
    },
    {
      label: 'P/E Ratio',
      value: fmt(financials.peRatio, '', 'x'),
      sub: financials.forwardPE ? `Fwd: ${fmt(financials.forwardPE, '', 'x')}` : null,
      colorCls: financials.peRatio > 40 ? 'negative' : financials.peRatio > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Revenue Growth',
      value: fmtPct(financials.revenueGrowth),
      colorCls: colorClass(financials.revenueGrowth),
    },
    {
      label: 'Profit Margin',
      value: fmtPct(financials.profitMargins),
      colorCls: colorClass(financials.profitMargins),
    },
    {
      label: 'Gross Margin',
      value: fmtPct(financials.grossMargins),
      colorCls: colorClass(financials.grossMargins),
    },
    {
      label: 'ROE',
      value: fmtPct(financials.returnOnEquity),
      colorCls: colorClass(financials.returnOnEquity),
    },
    {
      label: 'Debt/Equity',
      value: fmt(financials.debtToEquity, '', '%'),
      colorCls: financials.debtToEquity > 100 ? 'negative' : financials.debtToEquity > 50 ? 'neutral' : 'positive',
    },
    {
      label: 'Total Revenue',
      value: fmtLarge(financials.totalRevenue),
    },
    {
      label: 'Free Cash Flow',
      value: fmtLarge(financials.freeCashflow),
      colorCls: colorClass(financials.freeCashflow),
    },
    {
      label: '52W High',
      value: financials.fiftyTwoWeekHigh ? `$${financials.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A',
    },
    {
      label: '52W Low',
      value: financials.fiftyTwoWeekLow ? `$${financials.fiftyTwoWeekLow.toFixed(2)}` : 'N/A',
    },
    {
      label: 'Beta',
      value: fmt(financials.beta, '', 'x'),
      sub: 'Market Sensitivity',
      colorCls: financials.beta > 1.5 ? 'negative' : financials.beta > 0 ? 'positive' : '',
    },
    {
      label: 'Dividend Yield',
      value: fmtPct(financials.dividendYield),
      colorCls: colorClass(financials.dividendYield),
    },
    {
      label: 'Analyst Target',
      value: financials.targetMeanPrice ? `$${financials.targetMeanPrice.toFixed(2)}` : 'N/A',
      sub: financials.numberOfAnalystOpinions ? `${financials.numberOfAnalystOpinions} analysts` : null,
    },
    {
      label: 'Consensus',
      value: financials.recommendationKey ? financials.recommendationKey.replace(/-/g, ' ').toUpperCase() : 'N/A',
      colorCls:
        financials.recommendationKey === 'strong_buy' || financials.recommendationKey === 'buy'
          ? 'positive'
          : financials.recommendationKey === 'sell' || financials.recommendationKey === 'strong_sell'
            ? 'negative'
            : 'neutral',
    },
  ];

  return (
    <div className="card animate-in" id="financial-metrics-card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <BarChart2 size={14} color="var(--accent-blue)" />
          </div>
          Financial Metrics
        </div>
        {analysis?.valuationAssessment && (
          <span
            className="verdict-tag"
            style={{
              color:
                analysis.valuationAssessment === 'undervalued' ? 'var(--accent-green)'
                  : analysis.valuationAssessment === 'overvalued' ? 'var(--accent-red)'
                    : 'var(--accent-yellow)',
            }}
          >
            {analysis.valuationAssessment}
          </span>
        )}
      </div>

      <div className="metrics-grid">
        {metrics.map((m) => (
          <MetricCell key={m.label} {...m} />
        ))}
      </div>

      {analysis?.summary && (
        <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {analysis.summary}
        </p>
      )}
    </div>
  );
}
