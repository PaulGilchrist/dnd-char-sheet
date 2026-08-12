import { formatTimestamp } from './log-utils.js';

export function HealingPoolEntry({ entry }) {
  const isDicePool = Array.isArray(entry.rolls) && entry.rolls.length > 0;
  return (
    <div className="log-entry log-healing">
      <div className="log-entry-header">
        <span className="log-icon"><i className="fas fa-hand-holding-heart"></i></span>
        <span className="log-character">{entry.sourceName}</span>
        <span className="log-name">{entry.featureName} → {entry.targetName} (+{entry.amount} HP)</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-hp-details">
        {isDicePool ? (
          <>
            <span className="log-hp-delta">Rolled {entry.diceUsed}d{entry.dieType || 6}: </span>
            <span className="log-dice-rolls">{entry.rolls.join(' + ')}</span>
            <span className="log-hp-current"> = {entry.amount} HP from pool, {entry.poolAfter} remaining</span>
          </>
        ) : (
          <>
            <span className="log-hp-delta">Used {entry.amount} HP point from pool with </span>
            <span className="log-hp-current"> {entry.poolAfter} remaining</span>
          </>
        )}
      </div>
    </div>
  );
}
