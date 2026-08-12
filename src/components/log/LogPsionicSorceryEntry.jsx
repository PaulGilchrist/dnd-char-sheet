import { formatTimestamp } from './log-utils.js';

export function PsionicSorceryEntry({ entry }) {
  return (
    <div className="log-entry log-psionic-sorcery">
      <div className="log-entry-header">
        <span className="log-icon"><i className="fas fa-brain"></i></span>
        <span className="log-character">{entry.characterName}</span>
        <span className="log-name">Psionic Sorcery — {entry.spellName}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-psionic-details">
        <span className="log-psionic-sp-cost">{entry.sorceryPointsSpent} Sorcery Points</span>
        <span className="log-psionic-spell-level">instead of Level {entry.spellLevel} spell slot</span>
        {entry.note && <span className="log-psionic-note">{entry.note}</span>}
      </div>
    </div>
  );
}
