import { formatTimestamp } from './log-utils.js';

export function ConditionEntry({ entry }) {
   const isApplied = entry.action === 'applied';
   return (
      <div className={`log-entry log-condition ${isApplied ? 'log-condition-applied' : 'log-condition-broken'}`}>
        <div className="log-entry-header">
          <span className="log-icon">
            <i className={`fas ${isApplied ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          </span>
          <span className="log-character">{entry.characterName}</span>
          <span className="log-name">{isApplied ? 'Condition Applied' : 'Condition Broken'}</span>
          <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
        </div>
        <div className="log-condition-details">
          <span className="log-condition-name">{entry.condition}</span>
          {isApplied && entry.dc && (
            <span className="log-condition-dc">DC {entry.dc}</span>
          )}
          {isApplied && entry.ability && (
            <span className="log-condition-ability">{entry.ability.toUpperCase()} save</span>
          )}
          {!isApplied && entry.sourceName && (
            <span className="log-condition-source">by {entry.sourceName}</span>
          )}
        </div>
      </div>
    );
 }
