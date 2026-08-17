// @cleaned-by-ai
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
    it.each(DICE)('renders a roll button with title and label for $label', ({ label }) => {
      renderDiceTray();
      const button = screen.getByTitle(`Roll ${label}`);
      expect(button).toBeInTheDocument();
      expect(button.querySelector('.dice-label')).toBeInTheDocument();
      expect(button.querySelector('.dice-label').textContent).toBe(label);
    });
  });

  describe('rolling', () => {
    it.each(DICE)('calls onRoll with the result of rolling $label', ({ label, sides: _sides }) => {
      const onRoll = vi.fn();
      vi.spyOn(diceRoller, 'rollDie').mockReturnValue(MOCK_ROLL_VALUE);
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle(`Roll ${label}`));
      expect(onRoll).toHaveBeenCalledWith({ label, value: MOCK_ROLL_VALUE });
    });

    it('calls onRoll with a value within the die range using a real roll', () => {
      const onRoll = vi.fn();
      renderDiceTray({ onRoll });
      fireEvent.click(screen.getByTitle('Roll d20'));
      const result = onRoll.mock.calls[0][0];
      expect(result.label).toBe('d20');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(20);
    });
  });
});

describe('DicePopup', () => {
  describe('rendering', () => {
    it.each(DICE)('renders the result icon for $label', ({ label }) => {
      const { container } = renderPopup({ label, value: 1 });
      const resultIcon = container.querySelector('.dice-tray-result-icon');
      expect(resultIcon).toBeInTheDocument();
      const hasIcon = resultIcon.querySelector('svg') || resultIcon.querySelector('.fa-solid');
      expect(hasIcon).toBeTruthy();
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

    it('renders the rolled value, die label, and dismiss hint', () => {
      renderPopup();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('d20')).toBeInTheDocument();
      expect(screen.getByText('click anywhere to dismiss')).toBeInTheDocument();
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
