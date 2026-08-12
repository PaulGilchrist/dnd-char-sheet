import { formatTimestamp } from './log-utils.js';

export function BuffEntry({ entry }) {
  const isRemoval = entry.action === 'removed';
  const iconClass = isRemoval ? 'fa-heart-crack' : 'fa-heart';
  return (
    <div className={`log-entry log-buff ${isRemoval ? 'log-buff-removed' : 'log-buff-added'}`}>
      <div className="log-entry-header">
        <span className="log-icon"><i className={`fas ${iconClass}`}></i></span>
        <span className="log-character">{entry.characterName}</span>
        <span className="log-name">{isRemoval ? 'Effect Removed' : 'Effect Added'}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-buff-details">
        <span className="log-buff-name">{entry.buffName}</span>
        {entry.reason && <span className="log-buff-reason"> — {entry.reason}</span>}
      </div>
    </div>
  );
}
