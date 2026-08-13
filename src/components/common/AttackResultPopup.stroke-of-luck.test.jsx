import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttackResultPopup from './AttackResultPopup.jsx';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

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

  // ── Stroke of Luck / Miss to Hit ──

  describe('stroke of luck / miss to hit', () => {
    it('shows Stroke of Luck button when strokeOfLuck prop is provided', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          strokeOfLuck: true,
        },
        onClose: vi.fn(),
      });

      expect(screen.getByRole('button', { name: /Stroke of Luck/i })).toBeInTheDocument();
    });

    it('shows Boon of Combat Prowess button when autoRerollForAttack is true and hit is false', () => {
      getRuntimeValue.mockReturnValue(null);

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
        },
        attackerName: 'PlayerOne',
        onClose: vi.fn(),
      });

      expect(screen.getByRole('button', { name: /Boon of Combat Prowess/i })).toBeInTheDocument();
    });

    it('does NOT show Boon of Combat Prowess when autoRerollForAttack is false', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: false,
        },
        attackerName: 'PlayerOne',
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Boon of Combat Prowess/i })).not.toBeInTheDocument();
    });

    it('calls onStrokeOfLuck when Stroke of Luck button is clicked', async () => {
      const onStrokeOfLuck = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          strokeOfLuck: true,
        },
        onStrokeOfLuck,
        onClose: vi.fn(),
      });

      const strokeBtn = screen.getByRole('button', { name: /Stroke of Luck/i });
      fireEvent.click(strokeBtn);

      await waitFor(() => {
        expect(onStrokeOfLuck).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onStrokeOfLuck when Boon of Combat Prowess button is clicked', async () => {
      getRuntimeValue.mockReturnValue(null);
      const onStrokeOfLuck = vi.fn();
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
        },
        attackerName: 'PlayerOne',
        onStrokeOfLuck,
        onClose: vi.fn(),
      });

      const boonBtn = screen.getByRole('button', { name: /Boon of Combat Prowess/i });
      fireEvent.click(boonBtn);

      await waitFor(() => {
        expect(onStrokeOfLuck).toHaveBeenCalledTimes(1);
      });
    });

    it('does NOT show Stroke of Luck when strokeOfLuck prop is false', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          strokeOfLuck: false,
        },
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Stroke of Luck/i })).not.toBeInTheDocument();
    });

    it('does NOT show Stroke of Luck button when popupHtml is null', () => {
      renderPopup({ popupHtml: null });

      expect(screen.queryByRole('button', { name: /Stroke of Luck/i })).not.toBeInTheDocument();
    });

    it('does NOT show Stroke of Luck button when popupHtml is a string', () => {
      renderPopup({ popupHtml: '<b>String popup</b>' });

      expect(screen.queryByRole('button', { name: /Stroke of Luck/i })).not.toBeInTheDocument();
    });
  });

  // ── missToHitApplied state ──

  describe('missToHitApplied state', () => {
    it('treats hit as true when missToHitApplied is true', () => {
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'PlayerOne' && prop === 'boonOfCombatProwessUsed') {
          return null;
        }
        return null;
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
          autoDamage: true,
        },
        attackerName: 'PlayerOne',
        onClose: vi.fn(),
      });

      const boonBtn = screen.getByRole('button', { name: /Boon of Combat Prowess/i });
      fireEvent.click(boonBtn);

      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });

    it('prevents double-clicking Boon of Combat Prowess', async () => {
      getRuntimeValue.mockReturnValue(null);
      const onStrokeOfLuck = vi.fn();

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
        },
        attackerName: 'PlayerOne',
        onStrokeOfLuck,
        onClose: vi.fn(),
      });

      const boonBtn = screen.getByRole('button', { name: /Boon of Combat Prowess/i });
      fireEvent.click(boonBtn);
      fireEvent.click(boonBtn);

      await waitFor(() => {
        expect(onStrokeOfLuck).toHaveBeenCalledTimes(1);
      });
    });
  });
});
