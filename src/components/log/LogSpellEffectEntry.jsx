import { formatTimestamp } from './log-utils.js';

export function SpellEffectEntry({ entry }) {
  return (
    <div className="log-entry log-spell-effect">
      <div className="log-entry-header">
        <span className="log-icon"><i className="fas fa-hand-holding-medical"></i></span>
        <span className="log-character">{entry.characterName}</span>
        <span className="log-name">{entry.spellName}</span>
        {entry.targetName && <span className="log-target">→ {entry.targetName}</span>}
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-spell-effect-details">
        {entry.effects && entry.effects.length > 0 && (
          <ul className="log-effects-list">
            {entry.effects.map((effect, i) => (
              <li key={i}>{effect}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
