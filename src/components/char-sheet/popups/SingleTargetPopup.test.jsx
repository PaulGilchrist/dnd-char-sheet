// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SingleTargetPopup from './SingleTargetPopup.jsx';

const mockSpell = { name: 'Burning Hands', level: 1 };
const mockCreatureTargets = ['Goblin', 'Skeleton', 'Orc'];
const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

function makeProps(overrides = {}) {
  return {
    spell: mockSpell,
    creatureTargets: mockCreatureTargets,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    icon: 'fa-solid fa-fire',
    title: 'Burning Hands',
    school: 'Evocation',
    defaultLevel: 1,
    description: 'Select a target',
    confirmLabel: 'Cast',
    cancelLabel: 'Cancel',
    ...overrides,
  };
}

describe('SingleTargetPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders popup with icon, title, and spell info', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    expect(screen.getByRole('heading', { name: 'Burning Hands' })).toBeInTheDocument();
    expect(screen.getByText(/Level 1.*Evocation/)).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<SingleTargetPopup {...makeProps({ description: 'Pick one creature' })} />);
    expect(screen.getByText('Pick one creature')).toBeInTheDocument();
  });

  it('renders creature targets in the target selection list', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    expect(screen.getByText(/Goblin/)).toBeInTheDocument();
    expect(screen.getByText(/Skeleton/)).toBeInTheDocument();
    expect(screen.getByText(/Orc/)).toBeInTheDocument();
  });

  it('renders the target label', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    expect(screen.getByText('Target:')).toBeInTheDocument();
  });

  // ── Target selection ──

  it('selects a target when clicking a creature row', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText(/Goblin/).textContent).toContain('\u2713');
  });

  it('switches selection to a different target', () => {
    render(<SingleTargetPopup {...makeProps()} />);

    const goblinRow = screen.getByText(/Goblin/).closest('div');
    const orcRow = screen.getByText(/Orc/).closest('div');

    fireEvent.click(goblinRow);
    expect(screen.getByText(/Goblin/).textContent).toContain('\u2713');
    expect(screen.getByText(/Orc/).textContent).not.toContain('\u2713');

    fireEvent.click(orcRow);
    expect(screen.getByText(/Orc/).textContent).toContain('\u2713');
    expect(screen.getByText(/Goblin/).textContent).not.toContain('\u2713');
  });

  // ── Button behavior ──

  it('disables confirm button when no target is selected', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'Cast' })).toBeDisabled();
  });

  it('enables confirm button after selecting a target', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByRole('button', { name: 'Cast' })).not.toBeDisabled();
  });

  it('calls onConfirm with the selected target when confirm is clicked', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    const orcRow = screen.getByText(/Orc/).closest('div');
    fireEvent.click(orcRow);
    fireEvent.click(screen.getByText('Cast'));
    expect(mockOnConfirm).toHaveBeenCalledWith(['Orc']);
  });

  it('does not call onConfirm when confirm is clicked without a target', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    fireEvent.click(screen.getByText('Cast'));
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('uses custom confirmLabel when provided', () => {
    render(<SingleTargetPopup {...makeProps({ confirmLabel: 'Cast Spell' })} />);
    expect(screen.getByRole('button', { name: 'Cast Spell' })).toBeInTheDocument();
  });

  it('uses default confirmLabel "Cast {title}" when confirmLabel is not provided', () => {
    render(<SingleTargetPopup {...makeProps({ confirmLabel: undefined })} />);
    expect(screen.getByRole('button', { name: 'Cast Burning Hands' })).toBeInTheDocument();
  });

  it('uses custom cancelLabel when provided', () => {
    render(<SingleTargetPopup {...makeProps({ cancelLabel: 'Nope' })} />);
    expect(screen.getByRole('button', { name: 'Nope' })).toBeInTheDocument();
  });

  it('uses default cancelLabel "Cancel" when cancelLabel is not provided', () => {
    render(<SingleTargetPopup {...makeProps({ cancelLabel: undefined })} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onSkip when cancel button is clicked', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  // ── Skip behavior ──

  it('calls onSkip when Escape key is pressed', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkip for non-Escape key presses', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockOnSkip).not.toHaveBeenCalled();
  });

  it('calls onSkip when overlay background is clicked', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    const overlay = document.querySelector('.popup-overlay');
    fireEvent.click(overlay);
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkip when modal content is clicked', () => {
    render(<SingleTargetPopup {...makeProps()} />);
    const modal = document.querySelector('.popup-modal');
    fireEvent.click(modal);
    expect(mockOnSkip).not.toHaveBeenCalled();
  });

  // ── Edge cases ──

  it('renders with empty creature targets list', () => {
    render(<SingleTargetPopup {...makeProps({ creatureTargets: [] })} />);
    expect(screen.getByRole('button', { name: 'Cast' })).toBeInTheDocument();
    expect(screen.getByText('Target:')).toBeInTheDocument();
    expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
  });

  it('renders with null spell gracefully', () => {
    render(<SingleTargetPopup {...makeProps({ spell: null })} />);
    expect(screen.getByText(/Spell/)).toBeInTheDocument();
  });

  it('renders with missing spell name gracefully', () => {
    render(<SingleTargetPopup {...makeProps({ spell: {} })} />);
    expect(screen.getByText(/Spell/)).toBeInTheDocument();
  });

  it('shows default level and school when spell has no level or school', () => {
    render(<SingleTargetPopup {...makeProps({ spell: {}, defaultLevel: 3 })} />);
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
  });

  it('uses provided defaultLevel when spell has no level', () => {
    render(<SingleTargetPopup {...makeProps({ spell: {}, defaultLevel: 5, school: 'Necromancy' })} />);
    expect(screen.getByText(/Level 5/)).toBeInTheDocument();
    expect(screen.getByText(/Necromancy/)).toBeInTheDocument();
  });
});
