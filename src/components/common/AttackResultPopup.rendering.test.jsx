// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering: string popupHtml ──

  describe('rendering with string popupHtml', () => {
    it('renders sanitized HTML when popupHtml is a string', () => {
      renderPopup({ popupHtml: '<b>Attack Result</b>' });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Attack Result')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith('<b>Attack Result</b>');
    });

    it('renders complex HTML with allowed tags', () => {
      const html = '<p>Hit with <b>+5</b> bonus</p><ul><li>Critical</li></ul>';
      renderPopup({ popupHtml: html });

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith(html);
    });
  });

  // ── Rendering: object popupHtml (DiceRollResult) ──

  describe('rendering with object popupHtml', () => {
    it('renders DiceRollResult when popupHtml is an object', () => {
      renderPopup();

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Test Attack')).toBeInTheDocument();
    });

    it('passes popupHtml props to DiceRollResult', () => {
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
  });

  // ── Popup overlay behavior ──

  describe('popup overlay behavior', () => {
    it('renders inside a popup overlay', () => {
      renderPopup();

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('popup-overlay')).toHaveClass('popup-overlay');
    });

    it('has dismiss hint text', () => {
      renderPopup();

      expect(screen.getByText('click to dismiss')).toBeInTheDocument();
    });
  });
});
