import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { note, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── ENTRY RENDERING / REVERSE ORDER ───────────────
  describe('entry rendering', () => {
    it('renders entries in reverse order, skips unknown types', () => {
      setup(Log, [note({ id: 'a', noteText: 'First' }), note({ id: 'b', noteText: 'Second' }), { id: '?', type: 'unknown' }]);
      const texts = document.querySelectorAll('.log-note-text');
      expect(texts.length).toBe(2);
      expect(texts[0].textContent).toContain('Second');
      expect(texts[1].textContent).toContain('First');
    });

    it('does NOT render entries when not initialized', () => {
      setup(Log, [note({ noteText: 'hi' })], false);
      expect(screen.queryByText(/hi/i)).not.toBeInTheDocument();
    });
  });

  // ── NOTE ENTRY component ───────────────
  describe('NoteEntry', () => {
    it('renders noteText, character name, timestamp, and icon', () => {
      setup(Log, [note({ noteText: 'Hello' })]);
      expect(q('.log-note-text')).toHaveTextContent(/Hello/i);
      expect(q('.log-note .log-character')).toHaveTextContent(/Frodo/i);
      expect(q('.log-note .log-time')).toBeInTheDocument();
      expect(q('.log-note i.fa-comment-dots')).toBeInTheDocument();
      expect(q('.log-entry.log-note')).toBeInTheDocument();
    });
  });
});
