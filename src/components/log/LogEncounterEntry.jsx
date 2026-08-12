import { formatTimestamp } from './log-utils.js';

export function EncounterEntry({ entry }) {
  const isStart = entry.action === 'started';
  return (
    <div className={`log-entry log-encounter ${isStart ? 'log-encounter-start' : 'log-encounter-end'}`}>
      <div className="log-entry-header">
        <span className="log-icon">
          <i className={`fas ${isStart ? 'fa-skull' : 'fa-trophy'}`}></i>
        </span>
        <span className="log-name">{isStart ? 'Encounter Started' : 'Encounter Completed'}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-encounter-details">
        <span className="log-encounter-name">{entry.encounterName}</span>
        {isStart && entry.monsters && entry.monsters.length > 0 && (
          <div className="log-encounter-monsters">
            {entry.monsters.map((m, i) => (
              <span key={i} className="log-encounter-monster">{m}{i < entry.monsters.length-1 ? ',' : ''}&nbsp;</span>
            ))}
          </div>
        )}
        {!isStart && entry.xpPerChar > 0 && (
          <span className="log-encounter-xp">
            <i className="fas fa-star"></i>&nbsp;{entry.xpPerChar.toLocaleString()} XP per character
          </span>
        )}
        {!isStart && entry.lootItems && entry.lootItems.length > 0 && (
          <ul className="log-encounter-loot">
            {entry.lootItems.map((item, i) => (
              <li key={i} className="log-encounter-loot-item">{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
