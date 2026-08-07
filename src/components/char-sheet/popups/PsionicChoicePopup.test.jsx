import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PsionicChoicePopup from './PsionicChoicePopup.jsx';

function renderPopup(overrides = {}) {
  const props = {
    spellName: overrides.spellName || 'Eldritch Blast',
    spellLevel: overrides.spellLevel ?? 1,
    sorceryPointsAvailable: overrides.sorceryPointsAvailable ?? 3,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<PsionicChoicePopup {...props} />),
    onConfirm: props.onConfirm,
    onCancel: props.onCancel,
  };
}

// ── Tests ──

describe('PsionicChoicePopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders the popup overlay and modal', () => {
    renderPopup();
    expect(screen.getByText('Psionic Sorcery')).toBeInTheDocument();
  });

  it('renders the title with brain icon', () => {
    renderPopup();
    expect(screen.getByText('Psionic Sorcery')).toBeInTheDocument();
  });

  it('renders the spell name and level', () => {
    renderPopup({ spellName: 'Firebolt', spellLevel: 2 });
    expect(screen.getByText('Firebolt')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderPopup();
    expect(
      screen.getByText(/Psionic Sorcery allows you to cast this spell using sorcery points/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No Verbal or Somatic components/),
    ).toBeInTheDocument();
  });

  // ── Spell slot option ──

  it('renders the Consume Spell Slot option', () => {
    renderPopup();
    expect(screen.getByText('Consume Spell Slot')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(
      screen.getByText('Standard spell slot expenditure. Verbal, Somatic, and Material components apply normally.'),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with spellSlot when Consume Spell Slot is clicked', () => {
    const { onConfirm } = renderPopup();
    fireEvent.click(screen.getByText('Consume Spell Slot'));
    expect(onConfirm).toHaveBeenCalledWith({ choice: 'spellSlot' });
  });

  // ── Sorcery points option ──

  it('renders the Consume Sorcery Points option', () => {
    renderPopup();
    expect(screen.getByText('Consume Sorcery Points')).toBeInTheDocument();
    expect(screen.getByText('1 SP')).toBeInTheDocument();
    expect(
      screen.getByText('No Verbal or Somatic components. No Material components unless consumed or have cost.'),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with sorceryPoints when Consume Sorcery Points is clicked', () => {
    const { onConfirm } = renderPopup();
    fireEvent.click(screen.getByText('Consume Sorcery Points'));
    expect(onConfirm).toHaveBeenCalledWith({ choice: 'sorceryPoints' });
  });

  it('disables Consume Sorcery Points option when sorceryPointsAvailable is 0', () => {
    renderPopup({ sorceryPointsAvailable: 0 });
    const option = screen.getByText('Consume Sorcery Points').closest('label');
    expect(option).toHaveClass('psionic-choice-option-disabled');
  });

  it('does not call onConfirm when disabled Consume Sorcery Points is clicked', () => {
    const { onConfirm } = renderPopup({ sorceryPointsAvailable: 0 });
    fireEvent.click(screen.getByText('Consume Sorcery Points'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ── Cancel behavior ──

  it('calls onCancel when Escape key is pressed', () => {
    const { onCancel } = renderPopup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('removes Escape key listener on unmount', () => {
    const { onCancel, unmount } = renderPopup();
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when clicking the overlay', () => {
    const { onCancel } = renderPopup();
    const overlay = document.querySelector('.popup-overlay');
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when clicking the modal content directly', () => {
    const { onCancel } = renderPopup();
    const modal = document.querySelector('.popup-modal');
    fireEvent.click(modal);
    expect(onCancel).not.toHaveBeenCalled();
  });

  // ── Dynamic spell level display ──

  it('displays correct SP cost for different spell levels', () => {
    renderPopup({ spellLevel: 3 });
    expect(screen.getByText('3 SP')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
  });

  it('displays correct SP cost for spell level 0', () => {
    renderPopup({ spellLevel: 0 });
    expect(screen.getByText('0 SP')).toBeInTheDocument();
    expect(screen.getByText('Level 0')).toBeInTheDocument();
  });
});
