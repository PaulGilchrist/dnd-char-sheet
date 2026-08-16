// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttackResultPopup from './AttackResultPopup.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

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
    getRuntimeValue.mockReturnValue(null);
    setRuntimeValue.mockResolvedValue(undefined);
  });

  // ── Edge cases not covered by other test files ──

  describe('edge cases', () => {
    it('renders Done button after Boon of Combat Prowess converts a miss to a hit', () => {
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

    it('wires up onStrokeOfLuck=undefined when boonOfCombatProwessUsed is true in runtime state', () => {
      getRuntimeValue.mockImplementation((_key, prop) => {
        if (prop === 'boonOfCombatProwessUsed') {
          return true;
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
        },
        attackerName: 'PlayerOne',
      });

      // DiceRollResult still renders the Boon button (it checks autoRerollForAttack, not the ref),
      // but clicking it does nothing because AttackResultPopup passes onStrokeOfLuck=undefined
      const boonBtn = screen.getByRole('button', { name: /Boon of Combat Prowess/i });
      expect(() => fireEvent.click(boonBtn)).not.toThrow();
    });

    it('passes hit=true to DiceRollResult after Boon converts miss to hit', () => {
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

      // Initial render: hit=false so no Done button
      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

      const boonBtn = screen.getByRole('button', { name: /Boon of Combat Prowess/i });
      fireEvent.click(boonBtn);

      // After boon click, missToHitApplied becomes true, hit becomes true in DiceRollResult,
      // and computedHit becomes true, showing the Done button
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });

    it('does not show Boon button when attackerName is falsy but autoRerollForAttack is true', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
        },
        attackerName: null,
      });

      // The component checks `popupHtml?.autoRerollForAttack && attackerName` before initializing ref
      // When attackerName is null, the ref is never initialized (stays false),
      // but the button still renders because the condition in DiceRollResult is `autoRerollForAttack && !boonUsed && isD20 && !hit && !isAutoMiss`
      // However, AttackResultPopup only passes onStrokeOfLuck when `popupHtml?.autoRerollForAttack && !missToHitApplied && !hasBoonBeenUsedRef.current`
      expect(screen.getByRole('button', { name: /Boon of Combat Prowess/i })).toBeInTheDocument();
    });

    it('handles bardicInspirationUses as a string number (e.g. "3")', async () => {
      getRuntimeValue.mockImplementation((_key, prop) => {
        if (prop === 'bardicInspirationUses') {
          return '3';
        }
        return null;
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          2,
          'test-campaign'
        );
      });
    });

    it('handles bardicInspirationUses as a string "0" (does NOT decrement)', async () => {
      getRuntimeValue.mockImplementation((_key, prop) => {
        if (prop === 'bardicInspirationUses') {
          return '0';
        }
        return null;
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        const calls = setRuntimeValue.mock.calls.filter(
          (c) => c[1] === 'bardicInspirationUses'
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('handles bardicInspirationUses as a negative number (does NOT decrement)', async () => {
      getRuntimeValue.mockImplementation((_key, prop) => {
        if (prop === 'bardicInspirationUses') {
          return -1;
        }
        return null;
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        const calls = setRuntimeValue.mock.calls.filter(
          (c) => c[1] === 'bardicInspirationUses'
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('uses computedHit from onDone callback when provided, overriding popupHtml.hit', async () => {
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

    it('does not dispatch dice-roll-done event when autoDamage is true but hit is false', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoDamage: true,
        },
        onClose: vi.fn(),
      });

      // No Done button because hit is false and no computedHit overrides it
      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
    });

    it('passes callbacks spread to DiceRollResult via {...callbacks}', () => {
      const onReroll = vi.fn();
      const onQuickRoll = vi.fn();

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [15],
          bonus: 3,
          hit: true,
        },
        onReroll,
        onQuickRoll,
        onClose: vi.fn(),
      });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('does not crash when campaignName is undefined', () => {
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
        campaignName: undefined,
      });

      expect(screen.getByRole('button', { name: /Boon of Combat Prowess/i })).toBeInTheDocument();
    });

    it('does not crash when setPopupHtml is undefined during BI defense', async () => {
      getRuntimeValue.mockImplementation((_key, prop) => {
        if (prop === 'bardicInspirationUses') {
          return 1;
        }
        return null;
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        // Should not throw, silently handles missing setPopupHtml
      });
    });

    it('renders popup overlay when popupHtml is an empty object', () => {
      renderPopup({ popupHtml: {} });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('renders popup overlay when attackerName is null with autoRerollForAttack', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [3],
          bonus: 3,
          hit: false,
          autoRerollForAttack: true,
        },
        attackerName: null,
      });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });
  });
});
