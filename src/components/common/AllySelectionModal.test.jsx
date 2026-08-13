// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AllySelectionModal from './AllySelectionModal.jsx';

describe('AllySelectionModal', () => {
  const defaultCreatures = [
    { name: 'Goblin', type: 'npc', currentHp: 15, maxHp: 20 },
    { name: 'Player Character', type: 'player', currentHp: 30, maxHp: 30 },
    { name: 'Orc', type: 'npc', currentHp: 0, maxHp: 25 },
  ];

  let onConfirm;
  let onCancel;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  function getProps(overrides = {}) {
    return {
      title: 'Select Allies',
      icon: 'fa-shield-halved',
      creatures: defaultCreatures,
      currentAllies: [],
      onConfirm,
      onCancel,
      ...overrides,
    };
  }

  // ── Rendering ──

  it('renders the modal overlay with the title and icon', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('Select Allies')).toBeInTheDocument();
    expect(document.querySelector('.fa-solid.fa-shield-halved')).toBeInTheDocument();
  });

  it('renders all creatures in the list', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('Goblin')).toBeInTheDocument();
    expect(screen.getByText('Player Character')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
  });

  it('labels player creatures with (Player) and NPCs with (NPC)', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('(Player)')).toBeInTheDocument();
    expect(screen.getAllByText('(NPC)').length).toBe(2);
  });

  it('displays HP percentage for non-player creatures', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('(75% HP)')).toBeInTheDocument();
    expect(screen.getByText('(0% HP)')).toBeInTheDocument();
  });

  it('does not display HP for player creatures', () => {
    render(<AllySelectionModal {...getProps()} />);

    const playerCheckbox = screen.getByRole('checkbox', { name: 'Player Character(Player)' });
    const playerRow = playerCheckbox.closest('.secondary-target-row');
    expect(playerRow.querySelector('.secondary-target-hp')).toBeNull();
  });

  it('renders the empty state when no creatures are provided', () => {
    render(<AllySelectionModal {...getProps({ creatures: [] })} />);

    expect(screen.getByText('No creatures available.')).toBeInTheDocument();
  });

  // ── Props fallbacks ──

  it('uses default icon when no icon prop is provided', () => {
    render(<AllySelectionModal {...getProps({ icon: null })} />);

    expect(document.querySelector('.fa-shield-halved')).toBeInTheDocument();
  });

  it('uses custom icon when provided', () => {
    render(<AllySelectionModal {...getProps({ icon: 'fa-dragon' })} />);

    expect(document.querySelector('.fa-dragon')).toBeInTheDocument();
  });

  it('uses default title when no title prop is provided', () => {
    render(<AllySelectionModal {...getProps({ title: null })} />);

    expect(screen.getByText('Select Allies')).toBeInTheDocument();
  });

  // ── Controls ──

  it('renders Select All and Clear All buttons', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('renders the selected count', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  // ── Toggle selection ──

  it('selects a creature when its row is clicked', () => {
    render(<AllySelectionModal {...getProps()} />);

    const rows = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(rows[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(rows[0]).toHaveClass('secondary-target-selected');
  });

  it('deselects a creature when its row is clicked again', () => {
    render(<AllySelectionModal {...getProps()} />);

    const rows = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(rows[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(rows[0]);
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(rows[0]).not.toHaveClass('secondary-target-selected');
  });

  // ── Select All ──

  it('selects all creatures when Select All is clicked', () => {
    render(<AllySelectionModal {...getProps()} />);

    fireEvent.click(screen.getByText('Select All'));

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb).toBeChecked());
  });

  // ── Clear All ──

  it('deselects all creatures when Clear All is clicked', () => {
    render(<AllySelectionModal {...getProps()} />);

    fireEvent.click(screen.getByText('Select All'));
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear All'));
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  // ── Pre-selected allies ──

  it('pre-selects allies from currentAllies prop', () => {
    render(<AllySelectionModal {...getProps({ currentAllies: ['Goblin', 'Orc'] })} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  // ── Confirm ──

  it('calls onConfirm with selected allies when confirm is clicked', () => {
    render(<AllySelectionModal {...getProps()} />);

    fireEvent.click(screen.getByText('Select All'));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Allies/ }));

    expect(onConfirm).toHaveBeenCalledWith(['Goblin', 'Player Character', 'Orc']);
  });

  it('does not call onConfirm when no allies are selected', () => {
    render(<AllySelectionModal {...getProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /Confirm Allies/ }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables confirm button when no allies are selected', () => {
    render(<AllySelectionModal {...getProps()} />);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Allies/ });
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button when at least one ally is selected', () => {
    render(<AllySelectionModal {...getProps()} />);

    const rows = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(rows[0]);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Allies \(1\)/ });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('shows selected count in confirm button label', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(screen.getByRole('button', { name: /Confirm Allies \(0\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Select All'));
    expect(screen.getByRole('button', { name: /Confirm Allies \(3\)/ })).toBeInTheDocument();
  });

  // ── Cancel ──

  it('calls onCancel when cancel button is clicked', () => {
    render(<AllySelectionModal {...getProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel when clicking inside the modal content', () => {
    render(<AllySelectionModal {...getProps()} />);

    const modal = document.querySelector('.sp-modal');
    fireEvent.click(modal);

    expect(onCancel).not.toHaveBeenCalled();
  });

  // ── Multiple creature selection ──

  it('handles selecting and deselecting individual creatures correctly', () => {
    render(<AllySelectionModal {...getProps()} />);

    const rows = document.querySelectorAll('.secondary-target-row');

    fireEvent.click(rows[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(rows[1]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(rows[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(rows[1]);
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  // ── HP display edge cases ──

  it('displays 100% HP for creatures at full health', () => {
    const creatures = [
      { name: 'Healthy Goblin', type: 'npc', currentHp: 20, maxHp: 20 },
    ];
    render(<AllySelectionModal {...getProps({ creatures })} />);

    expect(screen.getByText('(100% HP)')).toBeInTheDocument();
  });

  it('does not display HP when currentHp or maxHp is null', () => {
    const creatures = [
      { name: 'Mysterious Creature', type: 'npc' },
    ];
    render(<AllySelectionModal {...getProps({ creatures })} />);

    expect(screen.getByText('Mysterious Creature')).toBeInTheDocument();
    expect(screen.queryByText(/HP/i)).not.toBeInTheDocument();
  });

  // ── CSS structure ──

  it('renders the correct CSS structure classes', () => {
    render(<AllySelectionModal {...getProps()} />);

    expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    expect(document.querySelector('.sp-header')).toBeInTheDocument();
    expect(document.querySelector('.sp-body')).toBeInTheDocument();
    expect(document.querySelector('.sp-actions')).toBeInTheDocument();
    expect(document.querySelector('.ally-selection-controls')).toBeInTheDocument();
    expect(document.querySelector('.secondary-target-list')).toBeInTheDocument();
  });
});
