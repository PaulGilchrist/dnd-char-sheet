// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TargetWithTypePopup from './TargetWithTypePopup.jsx';

// ── Test fixtures ──

const baseSpell = { name: 'Protection from Energy', level: 1 };
const creatureTargets = ['Ally1', 'Ally2', 'Ally3'];
const damageTypes = ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'];

function makeProps(overrides = {}) {
  return {
    spell: baseSpell,
    creatureTargets,
    damageTypes,
    onConfirm: vi.fn(),
    onSkip: vi.fn(),
    icon: 'fa-solid fa-shield',
    title: 'Protection from Energy',
    school: 'Abjuration',
    defaultLevel: 1,
    description: 'Select a target and damage type',
    confirmLabel: 'Cast',
    cancelLabel: 'Cancel',
    ...overrides,
  };
}

// ── Helpers ──

function selectTarget(allyName) {
  const row = screen.getByText(new RegExp(`^\\u2713 ${allyName}$|^${allyName}$`)).closest('div[style*="pointer"]')
    ?? screen.getByText(allyName).closest('div');
  fireEvent.click(row);
}

function selectDamageType(typeName) {
  const row = screen.getByText(typeName).closest('div');
  fireEvent.click(row);
}

// ── Tests ──

describe('TargetWithTypePopup', () => {
  // ── Rendering ──

  it('renders the popup with icon, title, spell name, level, and school', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    expect(screen.getByRole('heading', { name: /Protection from Energy/ })).toBeInTheDocument();
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    expect(screen.getByText(/Abjuration/)).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<TargetWithTypePopup {...makeProps({ description: 'Pick target and damage type' })} />);
    expect(screen.getByText('Pick target and damage type')).toBeInTheDocument();
  });

  it('omits the description paragraph when description is not provided', () => {
    render(<TargetWithTypePopup {...makeProps({ description: undefined })} />);
    expect(screen.queryByText('Select a target and damage type')).not.toBeInTheDocument();
  });

  it('renders creature targets and damage type labels', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    expect(screen.getByText('Target:')).toBeInTheDocument();
    expect(screen.getByText('Damage Type:')).toBeInTheDocument();
  });

  it('renders all creature targets and damage types', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    for (const name of creatureTargets) expect(screen.getByText(name)).toBeInTheDocument();
    for (const type of damageTypes) expect(screen.getByText(type)).toBeInTheDocument();
  });

  it('renders no creature names when creatureTargets is empty', () => {
    render(<TargetWithTypePopup {...makeProps({ creatureTargets: [] })} />);
    for (const name of creatureTargets) expect(screen.queryByText(name)).not.toBeInTheDocument();
    expect(screen.getByText('Target:')).toBeInTheDocument();
  });

  it('renders no damage type names when damageTypes is empty', () => {
    render(<TargetWithTypePopup {...makeProps({ damageTypes: [] })} />);
    for (const type of damageTypes) expect(screen.queryByText(type)).not.toBeInTheDocument();
    expect(screen.getByText('Damage Type:')).toBeInTheDocument();
  });

  it('renders buttons with correct labels', () => {
    render(<TargetWithTypePopup {...makeProps({ confirmLabel: 'Cast Spell', cancelLabel: 'Nope' })} />);
    expect(screen.getByText('Cast Spell')).toBeInTheDocument();
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });

  it('uses default confirmLabel "Cast {title}" when confirmLabel is not provided', () => {
    render(<TargetWithTypePopup {...makeProps({ confirmLabel: undefined })} />);
    expect(screen.getByText('Cast Protection from Energy')).toBeInTheDocument();
  });

  it('uses default cancelLabel "Cancel" when cancelLabel is not provided', () => {
    render(<TargetWithTypePopup {...makeProps({ cancelLabel: undefined })} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  // ── Confirm button state ──

  it('disables confirm button when no target is selected', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('disables confirm button when target is selected but no damage type', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('disables confirm button when damage type is selected but no target', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectDamageType('Acid');
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('enables confirm button after selecting both target and damage type', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    selectDamageType('Acid');
    expect(screen.getByText('Cast')).not.toBeDisabled();
  });

  // ── Selection behavior ──

  it('marks the selected target with a checkmark', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    expect(screen.getByText(/\u2713 Ally1/)).toBeInTheDocument();
  });

  it('marks the selected damage type with a checkmark', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectDamageType('Acid');
    expect(screen.getByText(/\u2713 Acid/)).toBeInTheDocument();
  });

  it('switches target selection to a different target', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    expect(screen.getByText(/\u2713 Ally1/)).toBeInTheDocument();
    expect(screen.queryByText(/\u2713 Ally2/)).not.toBeInTheDocument();

    selectTarget('Ally2');
    expect(screen.getByText(/\u2713 Ally2/)).toBeInTheDocument();
    expect(screen.queryByText(/\u2713 Ally1/)).not.toBeInTheDocument();
  });

  it('switches damage type selection to a different damage type', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectDamageType('Acid');
    expect(screen.getByText(/\u2713 Acid/)).toBeInTheDocument();

    selectDamageType('Cold');
    expect(screen.getByText(/\u2713 Cold/)).toBeInTheDocument();
    expect(screen.queryByText(/\u2713 Acid/)).not.toBeInTheDocument();
  });

  it('keeps damage type selected when switching targets', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    selectDamageType('Acid');
    expect(screen.getByText(/\u2713 Acid/)).toBeInTheDocument();

    selectTarget('Ally2');
    expect(screen.getByText(/\u2713 Ally2/)).toBeInTheDocument();
    expect(screen.getByText(/\u2713 Acid/)).toBeInTheDocument();
  });

  it('keeps target selected when switching damage types', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    selectTarget('Ally1');
    selectDamageType('Acid');
    expect(screen.getByText(/\u2713 Ally1/)).toBeInTheDocument();

    selectDamageType('Cold');
    expect(screen.getByText(/\u2713 Ally1/)).toBeInTheDocument();
    expect(screen.getByText(/\u2713 Cold/)).toBeInTheDocument();
  });

  // ── Confirm behavior ──

  it('calls onConfirm with selected target and damage type', () => {
    const onConfirm = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onConfirm })} />);
    selectTarget('Ally2');
    selectDamageType('Fire');
    fireEvent.click(screen.getByText('Cast'));
    expect(onConfirm).toHaveBeenCalledWith({ targetName: 'Ally2', damageType: 'Fire' });
  });

  it('does not call onConfirm when clicking confirm without a target', () => {
    const onConfirm = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onConfirm })} />);
    selectDamageType('Acid');
    fireEvent.click(screen.getByText('Cast'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not call onConfirm when clicking confirm without a damage type', () => {
    const onConfirm = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onConfirm })} />);
    selectTarget('Ally1');
    fireEvent.click(screen.getByText('Cast'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ── Skip behavior ──

  it('calls onSkip when Cancel button is clicked', () => {
    const onSkip = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onSkip })} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Escape key is pressed', () => {
    const onSkip = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onSkip })} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkip for non-Escape key presses', () => {
    const onSkip = vi.fn();
    render(<TargetWithTypePopup {...makeProps({ onSkip })} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onSkip).not.toHaveBeenCalled();
  });

  // ── Edge cases ──

  it('renders with null spell, showing fallback name and default level', () => {
    render(<TargetWithTypePopup {...makeProps({ spell: null, defaultLevel: 3 })} />);
    expect(screen.getByText('Spell')).toBeInTheDocument();
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
  });

  it('renders with empty spell object, showing fallback name and default level', () => {
    render(<TargetWithTypePopup {...makeProps({ spell: {}, defaultLevel: 5, school: 'Necromancy' })} />);
    expect(screen.getByText('Spell')).toBeInTheDocument();
    expect(screen.getByText(/Level 5/)).toBeInTheDocument();
    expect(screen.getByText(/Necromancy/)).toBeInTheDocument();
  });

  it('disables confirm when both lists are empty', () => {
    render(<TargetWithTypePopup {...makeProps({ creatureTargets: [], damageTypes: [] })} />);
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('renders selectable rows as clickable elements', () => {
    render(<TargetWithTypePopup {...makeProps()} />);
    const allyRow = screen.getByText('Ally1').closest('div');
    fireEvent.click(allyRow);
    expect(screen.getByText(/\u2713 Ally1/)).toBeInTheDocument();
  });
});
