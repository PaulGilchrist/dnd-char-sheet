import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DiceTray, { DicePopup } from './DiceTray.jsx';
import * as diceRoller from '../../services/dice/diceRoller.js';

function renderDiceTray(props = {}) {
  return render(<DiceTray onRoll={vi.fn()} {...props} />);
}

describe('DiceTray', () => {
  it('renders all 7 dice buttons with correct labels', () => {
    renderDiceTray();
    const diceLabels = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
    for (const label of diceLabels) {
      expect(screen.getByTitle(`Roll ${label}`)).toBeInTheDocument();
    }
  });

  it.each([
    { label: 'd4', sides: 4 },
    { label: 'd6', sides: 6 },
    { label: 'd8', sides: 8 },
    { label: 'd10', sides: 10 },
    { label: 'd12', sides: 12 },
    { label: 'd20', sides: 20 },
    { label: 'd100', sides: 100 },
  ])('calls onRoll with correct label and value when %s is clicked', ({ label, sides }) => {
    const onRoll = vi.fn();
    vi.spyOn(diceRoller, 'rollDie').mockReturnValue(sides);
    renderDiceTray({ onRoll });
    screen.getByTitle(`Roll ${label}`).click();
    expect(onRoll).toHaveBeenCalledWith({ label, value: sides });
  });

  it('renders SVG icons for d4, d8, d10, d12, d100 buttons', () => {
    renderDiceTray();
    const svgDice = ['d4', 'd8', 'd10', 'd12', 'd100'];
    for (const label of svgDice) {
      const btn = screen.getByTitle(`Roll ${label}`);
      expect(btn.querySelector('svg')).toBeInTheDocument();
    }
  });

  it('renders Font Awesome icons for d6, d20 buttons', () => {
    renderDiceTray();
    const faDice = ['d6', 'd20'];
    for (const label of faDice) {
      const btn = screen.getByTitle(`Roll ${label}`);
      expect(btn.querySelector('.fa-solid')).toBeInTheDocument();
    }
  });

  it('renders SVG icon for d100 button', () => {
    renderDiceTray();
    const btn = screen.getByTitle('Roll d100');
    const svg = btn.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg.querySelector('circle')).toBeInTheDocument();
  });
});

describe('DicePopup', () => {
  const mockResult = { label: 'd20', value: 15 };

  it('renders the result value and label', () => {
    const onClose = vi.fn();
    render(<DicePopup result={mockResult} onClose={onClose} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('d20')).toBeInTheDocument();
  });

  it('renders the dismiss instruction text', () => {
    const onClose = vi.fn();
    render(<DicePopup result={mockResult} onClose={onClose} />);
    expect(screen.getByText('click anywhere to dismiss')).toBeInTheDocument();
  });

  it.each([
    { label: 'd4', hasSvg: true },
    { label: 'd6', hasSvg: false },
    { label: 'd8', hasSvg: true },
    { label: 'd10', hasSvg: true },
    { label: 'd12', hasSvg: true },
    { label: 'd20', hasSvg: false },
    { label: 'd100', hasSvg: true },
  ])('renders %s icon as SVG when hasSvg is %s', ({ label }) => {
    const onClose = vi.fn();
    const { container } = render(<DicePopup result={{ label, value: 1 }} onClose={onClose} />);
    const resultIcon = container.querySelector('.dice-tray-result-icon');
    if (label === 'd4' || label === 'd8' || label === 'd10' || label === 'd12' || label === 'd100') {
      expect(resultIcon.querySelector('svg')).toBeInTheDocument();
    } else {
      expect(resultIcon.querySelector('.fa-solid')).toBeInTheDocument();
    }
  });

  it('renders the result icon wrapper', () => {
    const onClose = vi.fn();
    const { container } = render(<DicePopup result={mockResult} onClose={onClose} />);
    expect(container.querySelector('.dice-tray-result-icon')).toBeInTheDocument();
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<DicePopup result={mockResult} onClose={onClose} />);
    const overlay = container.querySelector('.dice-tray-popup-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the modal is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<DicePopup result={mockResult} onClose={onClose} />);
    const modal = container.querySelector('.dice-tray-popup-modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<DicePopup result={mockResult} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose after unmounting', () => {
    const onClose = vi.fn();
    const { unmount } = render(<DicePopup result={mockResult} onClose={onClose} />);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
