import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { PieChart, Pie } from 'recharts';
import { AreaChart, Area } from 'recharts';
import { LineChart, Line } from 'recharts';
import { BarChart2, DollarSign, PieChart as PieIcon, Activity } from 'lucide-react';

function fmtNumber(value) {
  if (!value) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export default function AnalysisCharts({ financials }) {
  const [activeTab, setActiveTab] = useState('margins');

  if (!financials) return null;

  const currency = financials.currency || '$';
  const price = financials.currentPrice || 0;
  
  // ─── Margins & Growth Data ───
  const marginsData = [
    { name: 'Gross Margin', value: (financials.grossMargins || 0) * 100 },
    { name: 'Operating Margin', value: (financials.operatingMargins || 0) * 100 },
    { name: 'Profit Margin', value: (financials.profitMargins || 0) * 100 },
    { name: 'Revenue Growth', value: (financials.revenueGrowth || 0) * 100 },
  ];

  // ─── Debt & Cash Data ───
  const balanceSheetData = [
    { name: 'Total Revenue', amount: financials.totalRevenue || 0, fill: '#3b82f6' },
    { name: 'Total Cash', amount: financials.totalCash || 0, fill: '#10b981' },
    { name: 'Total Debt', amount: financials.totalDebt || 0, fill: '#ef4444' },
  ];

  // ─── Price Comparison Data ───
  const priceRangeData = [];
  if (financials.fiftyTwoWeekLow) priceRangeData.push({ name: '52W Low', price: financials.fiftyTwoWeekLow });
  if (price) priceRangeData.push({ name: 'Current Price', price: price });
  if (financials.targetMeanPrice) priceRangeData.push({ name: 'Analyst Target', price: financials.targetMeanPrice });
  if (financials.fiftyTwoWeekHigh) priceRangeData.push({ name: '52W High', price: financials.fiftyTwoWeekHigh });

  // Custom tooltips
  const percentTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', color: payload[0].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>
            {payload[0].value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const amountTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--accent-blue)', fontWeight: 500 }}>
            {currency}{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const priceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{payload[0].payload.name}</p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--accent-blue)', fontWeight: 500 }}>
            {currency}{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card animate-in" id="analysis-charts-card" style={{ marginTop: 20 }}>
      <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Activity size={14} color="var(--accent-green)" />
          </div>
          Visual Financial Analysis
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
          <button
            onClick={() => setActiveTab('margins')}
            className={`tab-btn ${activeTab === 'margins' ? 'active' : ''}`}
            style={{
              background: activeTab === 'margins' ? 'var(--bg-primary)' : 'transparent',
              border: activeTab === 'margins' ? '1px solid var(--border)' : '1px solid transparent',
              color: activeTab === 'margins' ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Profitability & Growth
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
            style={{
              background: activeTab === 'balance' ? 'var(--bg-primary)' : 'transparent',
              border: activeTab === 'balance' ? '1px solid var(--border)' : '1px solid transparent',
              color: activeTab === 'balance' ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Cash vs Debt
          </button>
          {priceRangeData.length > 0 && (
            <button
              onClick={() => setActiveTab('price')}
              className={`tab-btn ${activeTab === 'price' ? 'active' : ''}`}
              style={{
                background: activeTab === 'price' ? 'var(--bg-primary)' : 'transparent',
                border: activeTab === 'price' ? '1px solid var(--border)' : '1px solid transparent',
                color: activeTab === 'price' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              Price Benchmarks
            </button>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height: 280, marginTop: 20 }}>
        {activeTab === 'margins' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={marginsData}
              margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} unit="%" />
              <Tooltip content={percentTooltip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {marginsData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              <ReferenceLine y={0} stroke="var(--border)" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'balance' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={balanceSheetData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val) => {
                  if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
                  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
                  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                  return val;
                }}
              />
              <Tooltip content={amountTooltip} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {balanceSheetData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'price' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={priceRangeData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${currency}${val}`}
              />
              <Tooltip content={priceTooltip} />
              <Area type="monotone" dataKey="price" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
