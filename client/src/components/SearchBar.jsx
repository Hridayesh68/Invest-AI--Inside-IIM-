import { Search, Loader2, Zap } from 'lucide-react';

const SUGGESTIONS = ['Apple', 'Tesla', 'Zomato', 'Nvidia', 'Infosys', 'Amazon'];

export default function SearchBar({ value, onChange, onSearch, isLoading }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' && !isLoading) onSearch();
  };

  return (
    <div className="search-container">
      <div className="search-wrapper">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            id="company-search"
            className="search-input"
            type="text"
            placeholder="Enter company name (e.g. Apple, Tesla, Zomato...)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
        <button
          id="research-btn"
          className="search-btn"
          onClick={onSearch}
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 0.8s linear infinite' }} />
              Researching...
            </>
          ) : (
            <>
              <Zap size={18} />
              Analyze
            </>
          )}
        </button>
      </div>
      <div className="search-suggestions">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            id={`suggestion-${s.toLowerCase()}`}
            className="suggestion-chip"
            onClick={() => { onChange(s); }}
            disabled={isLoading}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
