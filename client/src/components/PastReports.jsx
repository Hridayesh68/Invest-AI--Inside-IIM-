import { FileText, Clock, TrendingUp, TrendingDown, Minus, Trash2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function VerdictMini({ verdict }) {
  if (verdict === 'INVEST') return <TrendingUp size={14} color="var(--invest-color)" />;
  if (verdict === 'PASS') return <TrendingDown size={14} color="var(--pass-color)" />;
  return <Minus size={14} color="var(--hold-color)" />;
}

function timeAgo(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function PastReports({ onSelectReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reports`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const deleteReport = async (e, id) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/api/reports/${id}`, { method: 'DELETE' });
      setReports(reports.filter(r => r._id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="past-reports-section">
        <div className="section-header">
          <div className="section-title">
            <FileText size={20} color="var(--accent-blue)" />
            Past Research Reports
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div className="loading-dots" style={{ justifyContent: 'center' }}>
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  if (reports.length === 0) return null;

  return (
    <div className="past-reports-section" id="past-reports">
      <div className="section-header">
        <div className="section-title">
          <FileText size={20} color="var(--accent-blue)" />
          Past Research Reports
        </div>
        <button
          onClick={fetchReports}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RotateCcw size={13} />
          Refresh
        </button>
      </div>
      <div className="reports-grid">
        {reports.map((report) => (
          <div
            key={report._id}
            className="report-card"
            id={`report-${report._id}`}
            onClick={() => onSelectReport && onSelectReport(report._id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="report-card-company">{report.company}</div>
                <div className="report-card-ticker">{report.ticker || 'N/A'}</div>
              </div>
              <button
                onClick={(e) => deleteReport(e, report._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                title="Delete report"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`report-card-verdict ${report.verdict}`}>
                <VerdictMini verdict={report.verdict} />
                &nbsp;{report.verdict}
              </span>
              {report.score !== undefined && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {report.score}/100
                </span>
              )}
            </div>

            {report.summary && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {report.summary}
              </p>
            )}

            <div className="report-card-date">
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
              {timeAgo(report.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
