import { formatTimestamp } from './log-utils.js';

export function NoteEntry({ entry }) {
   return (
      <div className="log-entry log-note">
        <div className="log-entry-header">
          <span className="log-icon"><i className="fas fa-comment-dots"></i></span>
          <span className="log-character">{entry.characterName}</span>
          <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
        </div>
        <div className="log-note-text">{entry.noteText}</div>
      </div>
   );
}
