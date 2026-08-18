// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DiceTray, { DicePopup } from './DiceTray.jsx';
import * as diceRoller from '../../services/dice/diceRoller.js';

const DICE = [
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 },
  { label: 'd100', sides: 100 },
];

const MOCK_ROLL_VALUE = 7;

function renderDiceTray(props = {}) {
  return render(<DiceTray {...props} />);
}

function renderPopup(result = { label: 'd20', value: 15 }) {
  const onClose = vi.fn();
  const utils = render(<DicePopup result={result} onClose={onClose} />);
  return { onClose, ...utils };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.removeEventListener('keydown', () => {});
});

describe('DiceTray', () => {
  describe('rendering', () => {
    it.each(DICE)(
      'renders a button with title "Roll $label" for each die type',
      ({ label }) => {
        renderDiceTray();
        const button = screen.getByTitle(`Roll ${label}`);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(label);
      },
    );

    it('renders all seven dice buttons', () => {
      renderDiceTray();
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(7);
    });
  });

  describe('rolling', () => {
    it.each(DICE)(
      'calls onRoll with the correct label and rolled value for $label',
      ({ label, sides: _sides }) => {
        const onRoll = vi.fn();
        vi.spyOn(diceRoller, 'rollDie').mockReturnValue(MOCK_ROLL_VALUE);
        renderDiceTray({ onRoll });
        fireEvent.click(screen.getByTitle(`Roll ${label}`));
        expect(onRoll).toHaveBeenCalledWith({ label, value: MOCK_ROLL_VALUE });
      },
    );

    it('calls onRoll with a value within the die range for d20', () => {
      const onRoll = vi.fn();
      vi.spyOn(diceRoller, 'rollDie').mockReturnValue(14);
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle('Roll d20'));
      const result = onRoll.mock.calls[0][0];
      expect(result.label).toBe('d20');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(20);
    });

    it('calls onRoll with a value within the die range for d100', () => {
      const onRoll = vi.fn();
      vi.spyOn(diceRoller, 'rollDie').mockReturnValue(42);
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle('Roll d100'));
      const result = onRoll.mock.calls[0][0];
      expect(result.label).toBe('d100');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(100);
    });
  });
});

describe('DicePopup', () => {
  describe('rendering', () => {
    it.each(DICE)(
      'renders the result icon for $label',
      ({ label }) => {
        renderPopup({ label, value: 1 });
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );

    it('renders the rolled value, die label, and dismiss hint', () => {
      renderPopup();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('d20')).toBeInTheDocument();
      expect(screen.getByText('click anywhere to dismiss')).toBeInTheDocument();
    });

    it('renders an unknown die label without a Font Awesome icon', () => {
      renderPopup({ label: 'dX', value: 5 });
      expect(screen.getByText('dX')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders with a zero value', () => {
      renderPopup({ label: 'd6', value: 0 });
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('d6')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onClose when the overlay is clicked', () => {
      const { container, onClose } = renderPopup();
      fireEvent.click(container.querySelector('.dice-tray-popup-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the modal is clicked', () => {
      const { container, onClose } = renderPopup();
      fireEvent.click(container.querySelector('.dice-tray-popup-modal'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose on Escape but not for other keys', () => {
      const { onClose } = renderPopup();
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stops listening for Escape after unmounting', () => {
      const { onClose, unmount } = renderPopup();
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
