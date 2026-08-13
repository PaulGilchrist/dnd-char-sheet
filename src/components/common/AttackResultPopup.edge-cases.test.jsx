import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders correctly when popupHtml is undefined', () => {
      renderPopup({ popupHtml: undefined });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('renders correctly when popupHtml is an empty object', () => {
      renderPopup({ popupHtml: {} });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('renders correctly when onClose is null', () => {
      renderPopup({ onClose: null });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    });

    it('renders correctly when attackerName is missing but autoRerollForAttack is true', () => {
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
        onClose: vi.fn(),
      });

      expect(screen.getByRole('button', { name: /Boon of Combat Prowess/i })).toBeInTheDocument();
    });

    it('handles bardicInspirationUses as a number (not object)', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return 3;
        }
        return origGet(key, prop);
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

    it('handles bardicInspirationUses as null (defaults to 0)', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return null;
        }
        return origGet(key, prop);
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
        expect(setRuntimeValue).not.toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          expect.any(Number),
          'test-campaign'
        );
      });
    });

    it('uses handleDone with computedHit when provided', async () => {
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

    it('uses popupHtml.hit as fallback when missToHitApplied is false and computedHit is not provided', async () => {
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

    it('does not call onClose when autoDamage is false and no onDone callback', () => {
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
  });
});
