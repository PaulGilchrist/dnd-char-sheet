// @improved-by-ai
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

  describe('initial rendering', () => {
    it('renders the popup with header, spell info, and creature targets', () => {
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      expect(screen.getByRole('heading', { name: 'Dispel Magic' })).toBeInTheDocument();
      expect(screen.getByText(/Level 3/)).toBeInTheDocument();
      expect(screen.getByText(/Abjuration/)).toBeInTheDocument();
      expect(screen.getByText('Choose effects to remove')).toBeInTheDocument();
      expect(screen.getByText('Target:')).toBeInTheDocument();
      expect(screen.getByText('Goblin')).toBeInTheDocument();
      expect(screen.getByText('Skeleton')).toBeInTheDocument();
      expect(screen.getByText('Orc')).toBeInTheDocument();
    });

    it('renders buttons with correct labels', () => {
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      expect(screen.getByText('Cast')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders with custom description when provided', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ description: 'Pick effects to remove' })} />);
      expect(screen.getByText('Pick effects to remove')).toBeInTheDocument();
    });

    it('renders with empty creature targets list', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('Cast')).toBeInTheDocument();
      expect(screen.getByText('Target:')).toBeInTheDocument();
      expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
    });
  });

  // ── Button labels ──

  describe('button labels', () => {
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
  });

  // ── Confirm button state ──

  describe('confirm button state', () => {
    it('is disabled when no target is selected', () => {
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      expect(screen.getByText('Cast')).toBeDisabled();
    });

    it('is disabled when a target is selected but no checkboxes are selected', () => {
      mockLoadTargetData.mockReturnValue([]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('Cast')).toBeDisabled();
    });

    it('is enabled after selecting a target and at least one checkbox', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
        { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      fireEvent.click(screen.getByText('Blessing'));
      expect(screen.getByText('Cast')).not.toBeDisabled();
    });
  });

  // ── Target selection ──

  describe('target selection', () => {
    it('selects a target when its row is clicked', () => {
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText(/✓\s*Goblin/)).toBeInTheDocument();
    });

    it('updates selection to a different target when clicked', () => {
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText(/✓\s*Goblin/)).toBeInTheDocument();
      expect(screen.getByText('Skeleton').textContent).not.toMatch(/✓/);

      fireEvent.click(screen.getByText('Orc'));
      expect(screen.getByText(/✓\s*Orc/)).toBeInTheDocument();
      expect(screen.getByText('Goblin').textContent).not.toMatch(/✓/);
    });

    it('resets checkbox selections when switching targets', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      fireEvent.click(screen.getByText('Blessing'));
      expect(screen.getByText('Cast')).not.toBeDisabled();

      fireEvent.click(screen.getByText('Orc'));
      expect(screen.getByText('Cast')).toBeDisabled();
      expect(screen.queryByText(/✓\s*Blessing/)).not.toBeInTheDocument();
    });

    it('calls loadTargetData with the selected target name', () => {
      mockLoadTargetData.mockReturnValue([]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(mockLoadTargetData).toHaveBeenCalledWith('Goblin');
    });
  });

  // ── loadTargetData behavior ──

  describe('loadTargetData behavior', () => {
    it('renders checkboxes returned synchronously', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
        { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('Blessing')).toBeInTheDocument();
      expect(screen.getByText('Shield')).toBeInTheDocument();
    });

    it('renders checkboxes returned from a resolved promise', async () => {
      mockLoadTargetData.mockReturnValue(Promise.resolve([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      ]));
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      await waitFor(() => {
        expect(screen.getByText('Blessing')).toBeInTheDocument();
      });
    });

    it('shows empty state when loadTargetData returns empty array', () => {
      mockLoadTargetData.mockReturnValue([]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('No effects on this target')).toBeInTheDocument();
    });

    it('uses custom noItemsMessage when loadTargetData returns empty array', () => {
      mockLoadTargetData.mockReturnValue([]);
      render(<TargetWithCheckboxesPopup {...makeProps({ noItemsMessage: 'Nothing to remove' })} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('Nothing to remove')).toBeInTheDocument();
    });

    it('shows empty state when loadTargetData returns null', () => {
      mockLoadTargetData.mockReturnValue(null);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('No effects on this target')).toBeInTheDocument();
    });

    it('shows empty state when loadTargetData returns undefined', () => {
      mockLoadTargetData.mockReturnValue(undefined);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      expect(screen.getByText('No effects on this target')).toBeInTheDocument();
    });

    it('shows empty state when loadTargetData promise rejects', async () => {
      mockLoadTargetData.mockReturnValue(Promise.reject(new Error('fail')));
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      await waitFor(() => {
        expect(screen.getByText('No effects on this target')).toBeInTheDocument();
      });
    });

    it('shows effects section label with the selected target name', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Orc'));
      expect(screen.getByText(/Effects to remove from Orc/)).toBeInTheDocument();
    });
  });

  // ── Checkbox selection ──

  describe('checkbox selection', () => {
    it('toggles checkbox selection on/off', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      const blessing = screen.getByText('Blessing');

      fireEvent.click(blessing);
      expect(blessing.textContent).toMatch(/✓/);
      expect(screen.getByText('Cast')).not.toBeDisabled();

      fireEvent.click(blessing);
      expect(blessing.textContent).not.toMatch(/✓/);
      expect(screen.getByText('Cast')).toBeDisabled();
    });

    it('allows selecting multiple checkboxes', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
        { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
        { id: '3', label: 'Haste', selectionData: { type: 'buff', name: 'Haste' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));

      fireEvent.click(screen.getByText('Blessing'));
      fireEvent.click(screen.getByText('Shield'));

      expect(screen.getByText(/Blessing/).textContent).toMatch(/✓/);
      expect(screen.getByText(/Shield/).textContent).toMatch(/✓/);
      expect(screen.getByText('Cast')).not.toBeDisabled();
    });
  });

  // ── Confirm behavior ──

  describe('confirm behavior', () => {
    it('calls onConfirm with targetName and selections when confirmed', () => {
      mockLoadTargetData.mockReturnValue([
        { id: '1', label: 'Blessing', selectionData: { type: 'buff', name: 'Blessing' } },
        { id: '2', label: 'Shield', selectionData: { type: 'buff', name: 'Shield' } },
      ]);
      render(<TargetWithCheckboxesPopup {...makeProps()} />);
      fireEvent.click(screen.getByText('Goblin'));
      fireEvent.click(screen.getByText('Blessing'));
      fireEvent.click(screen.getByText('Shield'));

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
      fireEvent.click(screen.getByText('Goblin'));
      fireEvent.click(screen.getByText('Cast'));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Skip behavior ──

  describe('skip behavior', () => {
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
      fireEvent.click(screen.getByText('Goblin'));
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
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders with null spell gracefully', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ spell: null })} />);
      expect(screen.getByText('Spell')).toBeInTheDocument();
    });

    it('renders with missing spell name gracefully', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ spell: {} })} />);
      expect(screen.getByText('Spell')).toBeInTheDocument();
    });

    it('shows default level when spell has no level', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ spell: {}, defaultLevel: 3 })} />);
      expect(screen.getByText(/Level 3/)).toBeInTheDocument();
    });

    it('uses provided defaultLevel and school when spell has no level/school', () => {
      render(<TargetWithCheckboxesPopup {...makeProps({ spell: {}, defaultLevel: 5, school: 'Necromancy' })} />);
      expect(screen.getByText(/Level 5/)).toBeInTheDocument();
      expect(screen.getByText(/Necromancy/)).toBeInTheDocument();
    });
  });
});
