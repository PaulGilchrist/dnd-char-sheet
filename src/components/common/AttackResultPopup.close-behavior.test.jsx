// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttackResultPopup from './AttackResultPopup.jsx';

// ── Mock dependencies ──

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Helpers ──

function renderPopup(props = {}) {
  const defaultProps = {
    popupHtml: { name: 'Test Attack', type: 'd20', rolls: [15], bonus: 3, hit: true },
    onClose: vi.fn(),
    campaignName: 'test-campaign',
    attackerName: 'PlayerOne',
    setPopupHtml: vi.fn(),
    ...props,
  };
  return render(<AttackResultPopup {...defaultProps} />);
}

// ── Tests ──

describe('AttackResultPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── onClose behavior ──

  describe('close behavior', () => {
    it('calls onClose when Done button is clicked with autoDamage and hit', async () => {
      const onClose = vi.fn();
      const setPopupHtml = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: true,
        },
        onClose,
        setPopupHtml,
      });

      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT show Done button when autoDamage and hit are false', async () => {
      const onClose = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoDamage: true,
          autoRerollForAttack: false,
        },
        onClose,
      });

      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });

    it('does NOT show Done button when autoDamage is false', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: false,
        },
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });

    it('does NOT show Done button when autoDamage is true but hit is false and no missToHitApplied', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoDamage: true,
          autoRerollForAttack: false,
        },
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });
  });

  // ── Dice roll done event ──

  describe('dice-roll-done event', () => {
    it('dispatches dice-roll-done event when Done clicked with autoDamage and hit', async () => {
      const onClose = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: true,
          isCrit: true,
        },
        onClose,
      });

      const eventHandler = vi.fn();
      window.addEventListener('dice-roll-done', eventHandler);

      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);

      await waitFor(() => {
        expect(eventHandler).toHaveBeenCalled();
      });

      const detail = eventHandler.mock.calls[0][0].detail;
      expect(detail.autoDamage).toBe(true);
      expect(detail.isCrit).toBe(true);
      expect(detail.hit).toBe(true);

      window.removeEventListener('dice-roll-done', eventHandler);
    });
  });

  // ── Callback passthrough ──

  describe('callback passthrough', () => {
    it('passes additional callbacks to DiceRollResult via spread', () => {
      const onReroll = vi.fn();
      const onQuickRoll = vi.fn();

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [15],
          bonus: 3,
          hit: true,
          autoDamage: true,
        },
        onReroll,
        onQuickRoll,
        onClose: vi.fn(),
      });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('works with no callbacks provided', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [15],
          bonus: 3,
          hit: true,
        },
        onClose: vi.fn(),
      });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });
  });
});
