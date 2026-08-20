// @improved-by-ai
import { screen, fireEvent } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { setup, beforeEachSetup, mockAddEntry } from './log-test-utils.jsx';

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
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Anonymous' })).toBeInTheDocument();
    });

    it('hides character select when no characters provided', () => {
      setup(Log, [], true, []);
      expect(() => screen.getByRole('combobox')).toThrow();
    });

    it('add button submits note when clicked', async () => {
      setup(Log, []);
      const textarea = screen.getByPlaceholderText('Add a note to the log...');
      fireEvent.change(textarea, { target: { value: 'Test note' } });
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Test note');
      expect(mockAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'note', noteText: 'Test note' }),
      );
    });
  });
});
