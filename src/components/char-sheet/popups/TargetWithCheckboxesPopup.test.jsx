import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TargetWithCheckboxesPopup from './TargetWithCheckboxesPopup.jsx';

const mockSpell = { name: 'Dispel Magic', level: 3 };
const mockCreatureTargets = ['Goblin', 'Skeleton', 'Orc'];
const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();
const mockLoadTargetData = vi.fn();

function makeProps(overrides = {}) {
  return {
    spell: mockSpell,
    creatureTargets: mockCreatureTargets,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    icon: 'fa-solid fa-ban',
    title: 'Dispel Magic',
    school: 'Abjuration',
    defaultLevel: 3,
    description: 'Choose effects to remove',
    confirmLabel: 'Cast',
    cancelLabel: 'Cancel',
    loadTargetData: mockLoadTargetData,
    noItemsMessage: 'No effects on this target',
    ...overrides,
  };
}

describe('TargetWithCheckboxesPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders the popup overlay, modal, and header with icon', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    expect(document.querySelector('.popup-overlay')).toBeInTheDocument();
    expect(document.querySelector('.popup-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dispel Magic' })).toBeInTheDocument();
  });

  it('renders spell name and level/school subtitle', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const spellName = document.querySelector('.metamagic-spell-name');
    expect(spellName).toHaveTextContent('Dispel Magic');
    expect(spellName).toHaveTextContent('Level 3');
    expect(spellName).toHaveTextContent('Abjuration');
  });

  it('renders the description when provided', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ description: 'Pick effects to remove' })} />);
    expect(screen.getByText('Pick effects to remove')).toBeInTheDocument();
  });

  it('renders creature targets in the target selection list', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    expect(screen.getByText('Goblin')).toBeInTheDocument();
    expect(screen.getByText('Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
  });

  it('renders a target label with strong text', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    expect(screen.getByText('Target:')).toBeInTheDocument();
  });

  // ── Confirm/Cancel button labels ──

  it('uses custom confirmLabel when provided', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ confirmLabel: 'Cast Spell' })} />);
    expect(screen.getByText('Cast Spell')).toBeInTheDocument();
  });

  it('uses default confirmLabel "Cast {title}" when confirmLabel is not provided', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ confirmLabel: undefined })} />);
    expect(screen.getByText('Cast Dispel Magic')).toBeInTheDocument();
  });

  it('uses custom cancelLabel when provided', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ cancelLabel: 'Nope' })} />);
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });

  it('uses default cancelLabel "Cancel" when cancelLabel is not provided', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ cancelLabel: undefined })} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  // ── Confirm button state ──

  it('disables confirm button when no target is selected', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('disables confirm button when target is selected but no checkboxes are selected', () => {
    mockLoadTargetData.mockReturnValue([]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('enables confirm button after selecting a target and at least one checkbox', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    const checkboxRow = screen.getByText('Blessing').closest('div');
    fireEvent.click(checkboxRow);
    expect(screen.getByText('Cast')).not.toBeDisabled();
  });

  // ── Target selection ──

  it('shows checkmark (✓) for the selected target', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    const checkmarks = document.querySelectorAll('[style*="76, 175, 80"]');
    expect(checkmarks.length).toBeGreaterThan(0);
    expect(goblinRow.textContent).toContain('\u2713');
  });

  it('updates selection to a different target', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    const orcRow = screen.getByText('Orc').closest('div');

    fireEvent.click(goblinRow);
    expect(goblinRow.textContent).toContain('\u2713');
    expect(orcRow.textContent).not.toContain('\u2713');

    fireEvent.click(orcRow);
    expect(orcRow.textContent).toContain('\u2713');
    expect(goblinRow.textContent).not.toContain('\u2713');
  });

  it('resets selections when switching targets', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    const orcRow = screen.getByText('Orc').closest('div');

    // Select goblin and check a box
    fireEvent.click(goblinRow);
    const blessingRow = screen.getByText('Blessing').closest('div');
    fireEvent.click(blessingRow);
    expect(screen.getByText('Cast')).not.toBeDisabled();

    // Switch to orc - selections reset, new checkboxes load
    fireEvent.click(orcRow);
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('renders selectable rows with cursor pointer style', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    expect(goblinRow).toHaveStyle({ cursor: 'pointer' });
  });

  // ── loadTargetData behavior ──

  it('calls loadTargetData with the selected target name', () => {
    mockLoadTargetData.mockReturnValue([]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    expect(mockLoadTargetData).toHaveBeenCalledWith('Goblin');
  });

  it('renders checkboxes returned synchronously from loadTargetData', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('Blessing')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
  });

  it('renders checkboxes returned from a resolved promise', async () => {
    mockLoadTargetData.mockReturnValue(Promise.resolve([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]));
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    await waitFor(() => {
      expect(screen.getByText('Blessing')).toBeInTheDocument();
    });
  });

  it('shows empty state when loadTargetData returns empty array', () => {
    mockLoadTargetData.mockReturnValue([]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('No effects on this target')).toBeInTheDocument();
  });

  it('uses custom noItemsMessage when loadTargetData returns empty array', () => {
    mockLoadTargetData.mockReturnValue([]);
    render(<TargetWithCheckboxesPopup {...makeProps({ noItemsMessage: 'Nothing to remove' })} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('Nothing to remove')).toBeInTheDocument();
  });

  it('catches promise rejection and shows empty state', async () => {
    mockLoadTargetData.mockReturnValue(Promise.reject(new Error('fail')));
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    await waitFor(() => {
      expect(screen.getByText('No effects on this target')).toBeInTheDocument();
    });
  });

  // ── Checkbox selection ──

  it('shows checkmark (✓) for a selected checkbox', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    const blessingRow = screen.getByText('Blessing').closest('div');
    fireEvent.click(blessingRow);
    expect(screen.getByText(/Blessing/).textContent).toContain('\u2713');
  });

  it('toggles checkbox selection on/off', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    const blessingRow = screen.getByText('Blessing').closest('div');

    // Select
    fireEvent.click(blessingRow);
    expect(screen.getByText(/Blessing/).textContent).toContain('\u2713');
    expect(screen.getByText('Cast')).not.toBeDisabled();

    // Deselect
    fireEvent.click(blessingRow);
    expect(screen.getByText(/Blessing/).textContent).not.toContain('\u2713');
    expect(screen.getByText('Cast')).toBeDisabled();
  });

  it('allows selecting multiple checkboxes', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
      { id: '3', label: 'Haste', selectionData: { type: 'buff', name: 'Haste' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);

    const blessingRow = screen.getByText('Blessing').closest('div');
    const shieldRow = screen.getByText('Shield').closest('div');

    fireEvent.click(blessingRow);
    fireEvent.click(shieldRow);

    expect(screen.getByText(/Blessing/).textContent).toContain('\u2713');
    expect(screen.getByText(/Shield/).textContent).toContain('\u2713');
    expect(screen.getByText('Cast')).not.toBeDisabled();
  });

  it('shows selected checkbox rows with green background style', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    const blessingRow = screen.getByText('Blessing').closest('div');

    expect(blessingRow).not.toHaveStyle({ backgroundColor: 'rgba(76, 175, 80, 0.3)' });
    fireEvent.click(blessingRow);
    expect(blessingRow).toHaveStyle({ backgroundColor: 'rgba(76, 175, 80, 0.3)' });
    expect(blessingRow).toHaveStyle({ border: '1px solid #4CAF50' });
  });

  // ── Confirm behavior ──

  it('calls onConfirm with targetName and selections when confirm is clicked', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);

    const blessingRow = screen.getByText('Blessing').closest('div');
    const shieldRow = screen.getByText('Shield').closest('div');
    fireEvent.click(blessingRow);
    fireEvent.click(shieldRow);

    fireEvent.click(screen.getByText('Cast'));
    expect(mockOnConfirm).toHaveBeenCalledWith({
      targetName: 'Goblin',
      selections: [
        { type: 'buff', name: 'Blessing' },
        { type: 'buff', name: 'Shield' },
      ],
    });
  });

  it('does not call onConfirm when confirm is clicked without selecting a target', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    fireEvent.click(screen.getByText('Cast'));
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('does not call onConfirm when confirm is clicked without selecting any checkboxes', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText(/Goblin/).closest('div');
    fireEvent.click(goblinRow);
    fireEvent.click(screen.getByText('Cast'));
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  // ── Skip behavior ──

  it('calls onSkip when Cancel button is clicked', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when clicking the overlay background', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const overlay = document.querySelector('.popup-overlay');
    fireEvent.click(overlay);
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSkip when clicking inside the modal content', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const modal = document.querySelector('.popup-modal');
    fireEvent.click(modal);
    expect(mockOnSkip).not.toHaveBeenCalled();
  });

  it('calls onSkip when Escape key is pressed', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkip for non-Escape key presses', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockOnSkip).not.toHaveBeenCalled();
  });

  // ── Edge cases ──

  it('renders with empty creature targets list', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ creatureTargets: [] })} />);
    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Target:')).toBeInTheDocument();
    expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
  });

  it('renders with null spell gracefully', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ spell: null })} />);
    expect(document.querySelector('.metamagic-spell-name strong')).toHaveTextContent('Spell');
  });

  it('renders with missing spell name gracefully', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ spell: {} })} />);
    expect(document.querySelector('.metamagic-spell-name strong')).toHaveTextContent('Spell');
  });

  it('shows default level and school when spell has no level/school', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ spell: {}, defaultLevel: 3 })} />);
    const spellName = document.querySelector('.metamagic-spell-name');
    expect(spellName).toHaveTextContent('Level 3');
  });

  it('uses provided defaultLevel when spell has no level', () => {
    render(<TargetWithCheckboxesPopup {...makeProps({ spell: {}, defaultLevel: 5, school: 'Necromancy' })} />);
    const spellName = document.querySelector('.metamagic-spell-name');
    expect(spellName).toHaveTextContent('Level 5');
    expect(spellName).toHaveTextContent('Necromancy');
  });

  it('renders the scrollable target list container', () => {
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const scrollContainer = document.querySelector('[style*="max-height"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveStyle({ 'max-height': '150px' });
  });

  it('renders the effects section after selecting a target', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText(/Effects to remove from/)).toBeInTheDocument();
  });

  it('renders the effects section label with the selected target name', () => {
    mockLoadTargetData.mockReturnValue([
      { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
    ]);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const orcRow = screen.getByText('Orc').closest('div');
    fireEvent.click(orcRow);
    expect(screen.getByText(/Effects to remove from Orc/)).toBeInTheDocument();
  });

  it('renders noItemsMessage when loadTargetData returns null', () => {
    mockLoadTargetData.mockReturnValue(null);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('No effects on this target')).toBeInTheDocument();
  });

  it('renders noItemsMessage when loadTargetData returns undefined', () => {
    mockLoadTargetData.mockReturnValue(undefined);
    render(<TargetWithCheckboxesPopup {...makeProps()} />);
    const goblinRow = screen.getByText('Goblin').closest('div');
    fireEvent.click(goblinRow);
    expect(screen.getByText('No effects on this target')).toBeInTheDocument();
  });
});
