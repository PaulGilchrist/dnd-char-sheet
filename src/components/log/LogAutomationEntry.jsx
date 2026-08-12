import { formatTimestamp } from './log-utils.js';

export function AutomationEntry({ entry }) {
  return (
    <div className="log-entry log-automation">
      <div className="log-entry-header">
        <span className="log-icon"><i className="fas fa-wand-sparkles"></i></span>
        <span className="log-character">{entry.creatureName || entry.characterName || 'Automation'}</span>
        <span className="log-name">{entry.name || entry.automationType || 'Automation'}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-automation-details">
        {entry.description && <span>{entry.description}</span>}
      </div>
    </div>
  );
}
