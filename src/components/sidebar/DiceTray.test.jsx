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
  return render(<DiceTray onRoll={vi.fn()} {...props} />);
}

function renderPopup(result = { label: 'd20', value: 15 }) {
  const onClose = vi.fn();
  const utils = render(<DicePopup result={result} onClose={onClose} />);
  return { onClose, ...utils };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiceTray', () => {
  describe('rendering', () => {
    it('renders all 7 dice buttons', () => {
      renderDiceTray();
      DICE.forEach(({ label }) => {
        expect(screen.getByTitle(`Roll ${label}`)).toBeInTheDocument();
      });
    });

    it('wraps buttons in a .dice-tray container', () => {
      const { container } = renderDiceTray();
      expect(container.querySelector('.dice-tray')).toBeInTheDocument();
    });

    it.each(DICE)('renders a $label roll button with its icon', ({ label }) => {
      renderDiceTray();
      const button = screen.getByTitle(`Roll ${label}`);
      const isSvgDie = ['d4', 'd8', 'd10', 'd12', 'd100'].includes(label);
      const isFaDie = ['d6', 'd20'].includes(label);
      if (isSvgDie) {
        expect(button.querySelector('svg')).toBeInTheDocument();
      } else if (isFaDie) {
        expect(button.querySelector('.fa-solid')).toBeInTheDocument();
      }
    });

    it.each(DICE)('renders a $label dice-label span inside the button', ({ label }) => {
      renderDiceTray();
      const button = screen.getByTitle(`Roll ${label}`);
      const diceLabel = button.querySelector('.dice-label');
      expect(diceLabel).toBeInTheDocument();
      expect(diceLabel.textContent).toBe(label);
    });
  });

  describe('rolling', () => {
    it.each(DICE)('calls onRoll with the result of rolling $label', ({ label, sides }) => {
      const onRoll = vi.fn();
      const rollDieSpy = vi.spyOn(diceRoller, 'rollDie').mockReturnValue(MOCK_ROLL_VALUE);
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle(`Roll ${label}`));
      expect(rollDieSpy).toHaveBeenCalledWith(sides);
      expect(onRoll).toHaveBeenCalledWith({ label, value: MOCK_ROLL_VALUE });
    });

    it('forwards a real roll from the dice roller within the die range', () => {
      const onRoll = vi.fn();
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle('Roll d20'));
      expect(onRoll).toHaveBeenCalledTimes(1);
      const result = onRoll.mock.calls[0][0];
      expect(result.label).toBe('d20');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(20);
    });

    it('calls onRoll with value at boundaries for d4', () => {
      const onRoll = vi.fn();
      const rollDieSpy = vi.spyOn(diceRoller, 'rollDie');
      rollDieSpy.mockReturnValueOnce(1).mockReturnValueOnce(4);

      renderDiceTray({ onRoll });
      const button = screen.getByTitle('Roll d4');

      fireEvent.click(button);
      expect(onRoll).toHaveBeenLastCalledWith({ label: 'd4', value: 1 });

      fireEvent.click(button);
      expect(onRoll).toHaveBeenLastCalledWith({ label: 'd4', value: 4 });
    });
  });
});

describe('DicePopup', () => {
  describe('rendering', () => {
    it.each(DICE)('renders the result icon for $label', ({ label }) => {
      const { container } = renderPopup({ label, value: 1 });
      const resultIcon = container.querySelector('.dice-tray-result-icon');
      expect(resultIcon).toBeInTheDocument();
      const isSvgDie = ['d4', 'd8', 'd10', 'd12', 'd100'].includes(label);
      const isFaDie = ['d6', 'd20'].includes(label);
      if (isSvgDie) {
        expect(resultIcon.querySelector('svg')).toBeInTheDocument();
      } else if (isFaDie) {
        expect(resultIcon.querySelector('.fa-solid')).toBeInTheDocument();
      }
    });

    it('renders an unknown die label text without an icon', () => {
      const { container } = renderPopup({ label: 'dX', value: 5 });
      const resultIcon = container.querySelector('.dice-tray-result-icon');
      expect(resultIcon).toBeInTheDocument();
      expect(resultIcon.querySelector('svg')).not.toBeInTheDocument();
      expect(resultIcon.querySelector('.fa-solid')).not.toBeInTheDocument();
      expect(screen.getByText('dX')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders the rolled value and die label', () => {
      renderPopup();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('d20')).toBeInTheDocument();
    });

    it('renders the dismiss hint', () => {
      renderPopup();
      expect(screen.getByText('click anywhere to dismiss')).toBeInTheDocument();
    });

    it('renders the popup with correct modal and overlay structure', () => {
      const { container } = renderPopup();
      expect(container.querySelector('.dice-tray-popup-overlay')).toBeInTheDocument();
      expect(container.querySelector('.dice-tray-popup-modal')).toBeInTheDocument();
      expect(container.querySelector('.dice-tray-result')).toBeInTheDocument();
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
