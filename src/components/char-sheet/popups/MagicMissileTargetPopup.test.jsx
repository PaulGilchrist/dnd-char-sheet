// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MagicMissileTargetPopup from './MagicMissileTargetPopup.jsx';

// ── Helpers ──

function summaryContains(assigned, total) {
  return (content, element) =>
    element !== null &&
    element.tagName.toLowerCase() === 'div' &&
    element.classList.contains('magic-missile-summary') &&
    element.textContent.includes(`${assigned}`) &&
    element.textContent.includes(`${total}`);
}

// ── Test fixtures ──

const baseSpell = {
  name: 'Magic Missile',
  level: 1,
};

const creatureTargets = ['Goblin', 'Orc', 'Bugbear'];

function makeProps(overrides = {}) {
  return {
    spell: baseSpell,
    playerStats: { name: 'Test Wizard' },
    campaignName: 'test-campaign',
    totalMissiles: 3,
    missileDamage: '1d4 + 1',
    creatureTargets,
    onConfirm: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  };
}

// ── Tests ──

describe('MagicMissileTargetPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Default rendering ──

  it('renders the popup with title, spell name, missile count, damage info, and creature targets', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    expect(screen.getByText(/Distribute Magic Missiles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Magic Missile/i)[1]).toBeInTheDocument();
    expect(screen.getByText(/3 Missiles to Assign/)).toBeInTheDocument();
    expect(screen.getByText(/1d4 \+ 1/)).toBeInTheDocument();
    expect(screen.getByText(/Force damage/)).toBeInTheDocument();
    expect(screen.getByText('Goblin')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
    expect(screen.getByText('Bugbear')).toBeInTheDocument();
  });

  it('renders all creature targets with number inputs, Cancel and Cast buttons', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cast All Missiles/i })).toBeInTheDocument();
  });

  it('shows singular "Missile" when totalMissiles is 1', () => {
    render(<MagicMissileTargetPopup {...makeProps({ totalMissiles: 1 })} />);
    expect(screen.getByText(/1 Missile to Assign/)).toBeInTheDocument();
  });

  // ── Initial state ──

  it('defaults all targets to 0 with 0/3 summary', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach(input => expect(input).toHaveValue(0));
    expect(screen.getByText(summaryContains(0, 3))).toBeInTheDocument();
  });

  it('disables cast button when missiles unassigned', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    expect(castButton).toBeDisabled();
  });

  // ── Current target highlighting ──

  it('marks current target with (Current) label', () => {
    render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Orc' })} />);
    expect(screen.getByText(/Orc \(Current\)/i)).toBeInTheDocument();
  });

  it('does not highlight any row when currentTargetName is not in the list', () => {
    render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Unknown Creature' })} />);
    creatureTargets.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`${name} \\(Current\\)`))).not.toBeInTheDocument();
    });
  });

  // ── currentTargetName auto-assigns missiles ──

  it('auto-assigns all missiles to currentTargetName on mount when its value is 0', () => {
    render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Orc' })} />);
    const inputs = screen.getAllByRole('spinbutton');
    const orcIndex = creatureTargets.indexOf('Orc');
    expect(inputs[orcIndex]).toHaveValue(3);
    expect(screen.getByText(summaryContains(3, 3))).toBeInTheDocument();
  });

  // ── Input validation ──

  it('updates total assigned when input changes', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    expect(screen.getByText(summaryContains(2, 3))).toBeInTheDocument();
  });

  it('prevents negative, empty, and non-numeric input values', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');

    fireEvent.change(inputs[0], { target: { value: '-5' } });
    expect(screen.getByText(summaryContains(0, 3))).toBeInTheDocument();

    fireEvent.change(inputs[0], { target: { value: '' } });
    expect(screen.getByText(summaryContains(0, 3))).toBeInTheDocument();

    fireEvent.change(inputs[0], { target: { value: 'abc' } });
    expect(screen.getByText(summaryContains(0, 3))).toBeInTheDocument();
  });

  it('clamps values exceeding total missiles', () => {
    render(<MagicMissileTargetPopup {...makeProps({ totalMissiles: 3 })} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '99' } });
    expect(inputs[0]).toHaveValue(3);
    expect(screen.getByText(summaryContains(3, 3))).toBeInTheDocument();
  });

  // ── Cast button state ──

  it('enables cast button when all missiles assigned', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    fireEvent.change(inputs[1], { target: { value: '1' } });
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    expect(castButton).not.toBeDisabled();
  });

  it('disables cast button when only partial missiles assigned', () => {
    render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '1' } });
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    expect(castButton).toBeDisabled();
  });

  // ── Confirm / skip callbacks ──

  it('calls onConfirm with distribution when all missiles assigned and cast clicked', () => {
    const onConfirm = vi.fn();
    render(<MagicMissileTargetPopup {...makeProps({ onConfirm })} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    fireEvent.change(inputs[1], { target: { value: '1' } });
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    fireEvent.click(castButton);
    expect(onConfirm).toHaveBeenCalledWith({
      distribution: { Goblin: 2, Orc: 1, Bugbear: 0 },
    });
  });

  it('includes all creature targets in distribution even those with 0 missiles', () => {
    const onConfirm = vi.fn();
    render(<MagicMissileTargetPopup {...makeProps({ onConfirm })} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '3' } });
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    fireEvent.click(castButton);
    const callArgs = onConfirm.mock.calls[0][0];
    expect(callArgs.distribution).toHaveProperty('Bugbear', 0);
    expect(callArgs.distribution).toHaveProperty('Orc', 0);
  });

  it('calls onSkip when Cancel button or Escape key triggers skip', () => {
    const onSkip = vi.fn();
    render(<MagicMissileTargetPopup {...makeProps({ onSkip })} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onSkip).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('does not call onSkip when non-Escape key is triggered', () => {
    const onSkip = vi.fn();
    render(<MagicMissileTargetPopup {...makeProps({ onSkip })} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onSkip).not.toHaveBeenCalled();
  });

  // ── Edge cases ──

  it('renders with empty creature targets list', () => {
    render(<MagicMissileTargetPopup {...makeProps({ creatureTargets: [] })} />);
    expect(screen.getByRole('button', { name: /Cast All Missiles/i })).toBeInTheDocument();
    const inputs = screen.queryAllByRole('spinbutton');
    expect(inputs).toHaveLength(0);
  });

  it('shows 0/0 and enables cast button when totalMissiles is 0', () => {
    render(<MagicMissileTargetPopup {...makeProps({ totalMissiles: 0 })} />);
    expect(screen.getByText(summaryContains(0, 0))).toBeInTheDocument();
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    expect(castButton).not.toBeDisabled();
  });

  it('calls onConfirm with creature targets all at 0 when totalMissiles is 0', () => {
    const onConfirm = vi.fn();
    render(<MagicMissileTargetPopup {...makeProps({ totalMissiles: 0, onConfirm })} />);
    const castButton = screen.getByRole('button', { name: /Cast All Missiles/i });
    fireEvent.click(castButton);
    expect(onConfirm).toHaveBeenCalledWith({
      distribution: { Goblin: 0, Orc: 0, Bugbear: 0 },
    });
  });

  it('handles null or missing spell name gracefully', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps({ spell: null })} />);
    expect(screen.getByText(/Spell/)).toBeInTheDocument();
    rerender(<MagicMissileTargetPopup {...makeProps({ spell: {} })} />);
    expect(screen.getByText(/Spell/)).toBeInTheDocument();
  });

  // ── currentTargetName re-render behavior ──

  it('does not override existing distribution when currentTargetName already has missiles', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    expect(screen.getByText(summaryContains(2, 3))).toBeInTheDocument();

    rerender(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Goblin' })} />);
    expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(2);
    expect(screen.getByText(summaryContains(2, 3))).toBeInTheDocument();
  });

  it('assigns missiles to new currentTargetName when it was at 0', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Goblin' })} />);
    const goblinIndex = creatureTargets.indexOf('Goblin');
    expect(screen.getAllByRole('spinbutton')[goblinIndex]).toHaveValue(3);

    rerender(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Bugbear', totalMissiles: 5 })} />);
    const bugbearIndex = creatureTargets.indexOf('Bugbear');
    expect(screen.getAllByRole('spinbutton')[bugbearIndex]).toHaveValue(5);
    expect(screen.getByText(summaryContains(5, 5))).toBeInTheDocument();
  });

  it('does not clear previous target when currentTargetName changes to a different target', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Goblin' })} />);
    const goblinIndex = creatureTargets.indexOf('Goblin');
    expect(screen.getAllByRole('spinbutton')[goblinIndex]).toHaveValue(3);

    rerender(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Orc', totalMissiles: 4 })} />);
    const orcIndex = creatureTargets.indexOf('Orc');
    expect(screen.getAllByRole('spinbutton')[orcIndex]).toHaveValue(4);
    expect(screen.getByText(summaryContains(7, 4))).toBeInTheDocument();
  });

  it('does not re-assign when currentTargetName changes to a target that already has missiles', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps()} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '2' } });
    expect(screen.getByText(summaryContains(2, 3))).toBeInTheDocument();

    rerender(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Orc', totalMissiles: 5 })} />);
    const orcIndex = creatureTargets.indexOf('Orc');
    expect(screen.getAllByRole('spinbutton')[orcIndex]).toHaveValue(2);
    expect(screen.getByText(summaryContains(2, 5))).toBeInTheDocument();
  });

  it('does not assign missiles when currentTargetName is not in creatureTargets list on re-render', () => {
    const { rerender } = render(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Goblin' })} />);
    const goblinIndex = creatureTargets.indexOf('Goblin');
    expect(screen.getAllByRole('spinbutton')[goblinIndex]).toHaveValue(3);

    rerender(<MagicMissileTargetPopup {...makeProps({ currentTargetName: 'Unknown Creature' })} />);
    expect(screen.getAllByRole('spinbutton')[goblinIndex]).toHaveValue(3);
    expect(screen.getByText(summaryContains(3, 3))).toBeInTheDocument();
  });
});
