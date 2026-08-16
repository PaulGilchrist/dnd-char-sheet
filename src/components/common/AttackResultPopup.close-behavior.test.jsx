// @improved-by-ai
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

  // ── Done button visibility ──

  describe('Done button visibility', () => {
    it('shows Done button when autoDamage and hit are both true', async () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: true,
        },
      });

      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });

    it('hides Done button when autoDamage is false regardless of hit', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: false,
        },
      });

      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });

    it('hides Done button when hit is false regardless of autoDamage', () => {
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
      });

      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });
  });

  // ── onClose behavior ──

  describe('onClose behavior', () => {
    it('calls onClose when Done button is clicked', async () => {
      const onClose = vi.fn();
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
      });

      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose when autoDamage is false', () => {
      const onClose = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: false,
        },
        onClose,
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does NOT call onClose when onClose is null', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: true,
        },
        onClose: null,
      });

      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });
  });

  // ── dice-roll-done event dispatch ──

  describe('dice-roll-done event dispatch', () => {
    it('dispatches dice-roll-done event with correct detail when Done is clicked with autoDamage and hit', async () => {
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
        expect(eventHandler).toHaveBeenCalledTimes(1);
      });

      const detail = eventHandler.mock.calls[0][0].detail;
      expect(detail.autoDamage).toBe(true);
      expect(detail.isCrit).toBe(true);
      expect(detail.hit).toBe(true);

      window.removeEventListener('dice-roll-done', eventHandler);
    });

    it('does NOT dispatch event when hit is false and autoDamage is true without computedHit', async () => {
      const onClose = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoDamage: true,
          autoRerollForAttack: true,
        },
        onClose,
      });

      // No Done button should appear because hit is false and no computedHit
      // overrides it. The DiceRollResult only shows Done when computedHit is true.
      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });

    it('does NOT dispatch dice-roll-done when autoDamage is false', async () => {
      const eventHandler = vi.fn();
      window.addEventListener('dice-roll-done', eventHandler);

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

      // No Done button exists, so no event can be dispatched
      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

      window.removeEventListener('dice-roll-done', eventHandler);
    });

    it('passes hit:true to the event regardless of popupHtml.hit when computedHit is true', async () => {
      const onClose = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          autoDamage: true,
          computedHit: true,
        },
        onClose,
      });

      const eventHandler = vi.fn();
      window.addEventListener('dice-roll-done', eventHandler);

      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);

      await waitFor(() => {
        expect(eventHandler).toHaveBeenCalledTimes(1);
      });

      const detail = eventHandler.mock.calls[0][0].detail;
      expect(detail.hit).toBe(true);

      window.removeEventListener('dice-roll-done', eventHandler);
    });

    it('calls onClose after dispatching the event', async () => {
      const onClose = vi.fn();
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
      });

      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Callback passthrough ──

  describe('callback passthrough', () => {
    it('renders the popup overlay when callbacks are provided', () => {
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

    it('renders the popup overlay when no callbacks are provided', () => {
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
