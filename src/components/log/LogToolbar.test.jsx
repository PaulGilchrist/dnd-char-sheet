import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { note, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── TOOLBAR & STRUCTURE ───────────────────────
  describe('toolbar', () => {
    it('renders heading, textarea, add button, and character select', () => {
      setup(Log, []);
      expect(screen.getByRole('heading', { name: /campaign log/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add a note to the log...')).toBeInTheDocument();
      expect(q('.log-add-btn')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Anonymous' })).toBeInTheDocument();
    });

    it('hides select when no characters', () => {
      setup(Log, [], true, []);
      expect(() => screen.getByRole('combobox')).toThrow();
    });

    it('populates select options from character list', () => {
      setup(Log, [], true, [{ name: 'L' }, { name: 'G' }]);
      expect(screen.getByRole('option', { name: 'L' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'G' })).toBeInTheDocument();
    });
  });

  // ── LOADING & EMPTY STATES ───────────────────────
  describe('loading/empty states', () => {
    it('shows loading when not initialized, hides entries', () => {
      setup(Log, [note()], false);
      expect(screen.getByText('Loading log...')).toBeInTheDocument();
      expect(screen.queryByText(/hi/i)).not.toBeInTheDocument();
    });

    it('shows empty state when initialized with no entries', () => {
      setup(Log, []);
      expect(screen.queryByText(/Loading log/i)).not.toBeInTheDocument();
      expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();
    });

    it('hides empty msg when entries exist', () => {
      setup(Log, [note()]);
      expect(screen.queryByText(/no entries yet/i)).not.toBeInTheDocument();
    });
  });
});
