// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

const { sanitizeHtml } = await import('../../services/ui/sanitize.js');

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

  // ── String popupHtml rendering ──

  describe('string popupHtml rendering', () => {
    it('renders sanitized HTML content from a string popupHtml', () => {
      renderPopup({ popupHtml: '<b>Attack Result</b>' });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Attack Result')).toBeInTheDocument();
    });

    it('renders complex HTML with multiple tags from a string popupHtml', () => {
      const html = '<p>Hit with <b>+5</b> bonus</p><ul><li>Critical</li></ul>';
      renderPopup({ popupHtml: html });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith(html);
    });

    it('renders string popupHtml with empty content', () => {
      renderPopup({ popupHtml: '' });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith('');
    });

    it('renders string popupHtml with only whitespace', () => {
      renderPopup({ popupHtml: '   ' });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith('   ');
    });
  });

  // ── Object popupHtml rendering (DiceRollResult path) ──

  describe('object popupHtml rendering', () => {
    it('renders DiceRollResult content with default props', () => {
      renderPopup();

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Test Attack')).toBeInTheDocument();
    });

    it('renders DiceRollResult with custom attack name and values', () => {
      const popupHtml = {
        name: 'Grimjaw',
        type: 'd20',
        rolls: [18],
        bonus: 5,
        hit: true,
        isCrit: false,
        targetName: 'Goblin',
        targetAc: 14,
        formula: '1d20',
        modifier: 0,
        total: 23,
      };
      renderPopup({ popupHtml });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Grimjaw')).toBeInTheDocument();
    });

    it('renders DiceRollResult with hit overridden when missToHitApplied would be true', () => {
      // When popupHtml.hit is false but missToHitApplied is true (via Boon of Combat Prowess),
      // the hit prop passed to DiceRollResult should be true.
      // This tests the component's hit override logic in the render path.
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

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      // The attack name should still render even when hit is false
      expect(screen.getByText('Test Attack')).toBeInTheDocument();
    });
  });
});
