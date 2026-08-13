import { screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { q, setup, beforeEachSetup, mockAddEntry } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── ADDING NOTES ───────────────
  describe('adding notes', () => {
    it('adds note on button click with trimmed text', async () => {
      setup(Log, []);
      fireEvent.change(screen.getByPlaceholderText('Add a note to the log...'), {
        target: { value: ' Hello ' },
      });
      fireEvent.click(q('.log-add-btn'));
      await waitFor(() => {
        expect(mockAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'note', noteText: 'Hello' }),
        );
      });
    });

    it('uses selected char as author, Anonymous when none selected', async () => {
      setup(Log, []);
      fireEvent.change(screen.getByPlaceholderText('Add a note to the log...'), {
        target: { value: 'hi' },
      });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Aragorn' } });
      fireEvent.click(q('.log-add-btn'));
      await waitFor(() => {
        expect(mockAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({ characterName: 'Aragorn' }),
        );
      });
    });

    it('uses Anonymous when no char options available', async () => {
      setup(Log, [], true, []);
      fireEvent.change(screen.getByPlaceholderText('Add a note to the log...'), {
        target: { value: 'hi' },
      });
      fireEvent.click(q('.log-add-btn'));
      await waitFor(() => {
        expect(mockAddEntry).toHaveBeenCalledWith(
          expect.objectContaining({ characterName: 'Anonymous' }),
        );
      });
    });

    it('no-op for empty or whitespace text', () => {
      setup(Log, []);
      fireEvent.click(q('.log-add-btn'));
      expect(mockAddEntry).not.toHaveBeenCalled();
      fireEvent.change(screen.getByPlaceholderText('Add a note to the log...'), {
        target: { value: '    ' },
      });
      fireEvent.click(q('.log-add-btn'));
      expect(mockAddEntry).not.toHaveBeenCalled();
    });

    it('ctrl+enter submits', async () => {
      setup(Log, []);
      const textarea = screen.getByPlaceholderText('Add a note to the log...');
      fireEvent.change(textarea, { target: { value: 'x' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      await waitFor(() => expect(mockAddEntry).toHaveBeenCalled());
    });

    it('meta+enter submits', async () => {
      setup(Log, []);
      const textarea = screen.getByPlaceholderText('Add a note to the log...');
      fireEvent.change(textarea, { target: { value: 'x' } });
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      await waitFor(() => expect(mockAddEntry).toHaveBeenCalled());
    });

    it('plain enter and ctrl+r do NOT submit', () => {
      setup(Log, []);
      const textarea = screen.getByPlaceholderText('Add a note to the log...');
      fireEvent.change(textarea, { target: { value: 'x' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(mockAddEntry).not.toHaveBeenCalled();
      fireEvent.keyDown(textarea, { key: 'r', ctrlKey: true });
      expect(mockAddEntry).not.toHaveBeenCalled();
    });

    it('clears textarea after submit but not on empty note', async () => {
      setup(Log, []);
      const textarea = screen.getByPlaceholderText('Add a note to the log...');
      fireEvent.change(textarea, { target: { value: 'x' } });
      fireEvent.click(q('.log-add-btn'));
      await waitFor(() => expect(textarea).toHaveValue(''));
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.click(q('.log-add-btn'));
      expect(textarea).toHaveValue('   ');
    });
  });
});
