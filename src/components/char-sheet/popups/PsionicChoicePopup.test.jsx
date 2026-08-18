// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

describe('PsionicChoicePopup', () => {
  // ── Rendering ──

  it('renders the popup with title, spell name, and description', () => {
    renderPopup({ spellName: 'Eldritch Blast', spellLevel: 1 });
    expect(screen.getByText('Psionic Sorcery')).toBeInTheDocument();
    expect(screen.getByText('Eldritch Blast')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(
      screen.getByText(/Psionic Sorcery allows you to cast this spell using sorcery points/),
    ).toBeInTheDocument();
  });

  it('renders the spell name and level dynamically with different values', () => {
    renderPopup({ spellName: 'Firebolt', spellLevel: 2 });
    expect(screen.getByText('Firebolt')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  it('renders both choice options', () => {
    renderPopup();
    expect(screen.getByText('Consume Spell Slot')).toBeInTheDocument();
    expect(screen.getByText('Consume Sorcery Points')).toBeInTheDocument();
  });

  // ── Spell slot option ──

  it('renders spell slot option with correct cost and description', () => {
    renderPopup({ spellLevel: 3 });
    expect(screen.getByText('Consume Spell Slot')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
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

  it('renders sorcery points option with correct cost and description', () => {
    renderPopup({ spellLevel: 3 });
    expect(screen.getByText('Consume Sorcery Points')).toBeInTheDocument();
    expect(screen.getByText('3 SP')).toBeInTheDocument();
    expect(
      screen.getByText('No Verbal or Somatic components. No Material components unless consumed or have cost.'),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with sorceryPoints when Consume Sorcery Points is clicked', () => {
    const { onConfirm } = renderPopup();
    fireEvent.click(screen.getByText('Consume Sorcery Points'));
    expect(onConfirm).toHaveBeenCalledWith({ choice: 'sorceryPoints' });
  });

  it('prevents Consume Sorcery Points action when no sorcery points available', () => {
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
    const { onCancel, container } = renderPopup();
    const overlay = container.querySelector('.popup-overlay');
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when clicking the modal content', () => {
    const { onCancel } = renderPopup();
    fireEvent.click(screen.getByText('Psionic Sorcery'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  // ── Edge cases ──

  it('handles spell level 0', () => {
    renderPopup({ spellLevel: 0 });
    expect(screen.getByText('Level 0')).toBeInTheDocument();
    expect(screen.getByText('0 SP')).toBeInTheDocument();
  });

  it('handles default props without calling callbacks', () => {
    const { onConfirm, onCancel } = renderPopup({});
    expect(screen.getByText('Eldritch Blast')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('1 SP')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
