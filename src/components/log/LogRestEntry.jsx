import { formatTimestamp } from './log-utils.js';

export function RestEntry({ entry }) {
  const isLong = entry.type === 'long_rest';
  return (
    <div className={`log-entry log-rest ${isLong ? 'log-rest-long' : 'log-rest-short'}`}>
      <div className="log-entry-header">
        <span className="log-icon"><i className={`fas ${isLong ? 'fa-moon' : 'fa-bed'}`}></i></span>
        <span className="log-character">{entry.message?.split(' | ')[0]?.split('. ')[0] || entry.message}</span>
        <span className="log-name">{isLong ? 'Long Rest' : 'Short Rest'}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-rest-details">
        {entry.message && (
          <span>{entry.message}</span>
        )}
      </div>
    </div>
  );
}
