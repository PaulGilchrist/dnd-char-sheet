import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MultiResistanceSelectionModal from './MultiResistanceSelectionModal.jsx';

const baseProps = {
  title: 'Resistance Selection',
  icon: 'fa-shield-halved',
  damageTypes: ['Acid', 'Fire', 'Cold', 'Lightning'],
  existingTypes: [],
  maxSelections: 2,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

const defaultResult = {
  type: 'popup',
  payload: {
    type: 'automation_info',
    name: 'Resistance Selection',
    description: 'Resistance to Acid and Fire selected.',
  },
};

describe('MultiResistanceSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders the modal overlay and content', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with title and icon', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(screen.getByText('Resistance Selection')).toBeInTheDocument();
      const icons = document.querySelectorAll('i.fa-solid.fa-shield-halved');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders the instruction paragraph for a new selection', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(
        screen.getByText(/Choose 2 damage types to gain resistance to:/)
      ).toBeInTheDocument();
    });

    it('renders checkboxes for each damage type', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(screen.getByLabelText('Acid')).toBeInTheDocument();
      expect(screen.getByLabelText('Fire')).toBeInTheDocument();
      expect(screen.getByLabelText('Cold')).toBeInTheDocument();
      expect(screen.getByLabelText('Lightning')).toBeInTheDocument();
    });

    it('renders checkboxes with correct labels', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      const labels = document.querySelectorAll('label');
      const checkboxLabels = Array.from(labels).map(l => l.querySelector('strong')?.textContent).filter(Boolean);
      expect(checkboxLabels).toContain('Acid');
      expect(checkboxLabels).toContain('Fire');
      expect(checkboxLabels).toContain('Cold');
      expect(checkboxLabels).toContain('Lightning');
    });

    it('renders all checkboxes unchecked on initial render', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        expect(cb.checked).toBe(false);
      });
    });

    it('renders the Choose Resistances button', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(
        screen.getByRole('button', { name: 'Choose Resistances' })
      ).toBeInTheDocument();
    });

    it('renders the Cancel button', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('disables the Choose Resistances button when no types are selected', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(
        screen.getByRole('button', { name: 'Choose Resistances' })
      ).toBeDisabled();
    });

    it('does not show result-specific elements on initial render', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    });
  });

  // ── Existing types display ──

  describe('existing types', () => {
    it('renders the instruction paragraph for changing existing types', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire', 'Cold'] })} />);
      expect(
        screen.getByText(/Change resistance types \(currently Fire, Cold\):/)
      ).toBeInTheDocument();
    });

    it('marks existing types as selected on initial render', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire', 'Cold'] })} />);
      expect(screen.getByLabelText('Fire')).toBeChecked();
      expect(screen.getByLabelText('Cold')).toBeChecked();
      expect(screen.getByLabelText('Acid')).not.toBeChecked();
      expect(screen.getByLabelText('Lightning')).not.toBeChecked();
    });

    it('shows "(current)" label for existing types that are not selected after deselection', () => {
      // existingTypes=['Fire','Cold'], maxSelections=2 → both pre-selected, no (current) labels initially
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire', 'Cold'], maxSelections: 2 })} />);
      // Both Fire and Cold are selected, so no (current) labels
      let labels = document.querySelectorAll('label');
      let coldLabel = Array.from(labels).find(l => {
        const strong = l.querySelector('strong');
        return strong && strong.textContent === 'Cold';
      });
      expect(coldLabel.querySelector('span')).not.toBeInTheDocument();

      // Deselect Fire → Fire is now existing but not selected → (current) appears
      fireEvent.click(screen.getByLabelText('Fire'));
      labels = document.querySelectorAll('label');
      coldLabel = Array.from(labels).find(l => {
        const strong = l.querySelector('strong');
        return strong && strong.textContent === 'Fire';
      });
      expect(coldLabel.querySelector('span')).toBeInTheDocument();
      expect(coldLabel.querySelector('span').textContent).toBe('(current)');
    });

    it('hides "(current)" label after an existing type is re-selected', () => {
      // existingTypes=['Fire','Cold'], maxSelections=2 → both pre-selected
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire', 'Cold'], maxSelections: 2 })} />);

      // Deselect Fire to trigger (current) label
      const labels1 = document.querySelectorAll('label');
      const fireLabel1 = Array.from(labels1).find(l => {
        const strong = l.querySelector('strong');
        return strong && strong.textContent === 'Fire';
      });
      fireEvent.click(fireLabel1);

      let labels = document.querySelectorAll('label');
      let fireLabel = Array.from(labels).find(l => {
        const strong = l.querySelector('strong');
        return strong && strong.textContent === 'Fire';
      });
      expect(fireLabel.querySelector('span')).toBeInTheDocument();

      // Re-select Fire → (current) should disappear
      fireEvent.click(fireLabel);
      labels = document.querySelectorAll('label');
      fireLabel = Array.from(labels).find(l => {
        const strong = l.querySelector('strong');
        return strong && strong.textContent === 'Fire';
      });
      expect(fireLabel.querySelector('span')).not.toBeInTheDocument();
    });

    it('changes button text to "Change Resistances" when existing types exist', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire'] })} />);
      expect(
        screen.getByRole('button', { name: 'Change Resistances' })
      ).toBeInTheDocument();
    });

    it('enables the Change Resistances button when existing types exist', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire'] })} />);
      expect(
        screen.getByRole('button', { name: 'Change Resistances' })
      ).toBeEnabled();
    });

    it('disables the Change Resistances button after deselecting all existing types', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire'] })} />);
      expect(
        screen.getByRole('button', { name: 'Change Resistances' })
      ).toBeEnabled();
      fireEvent.click(screen.getByLabelText('Fire'));
      expect(
        screen.getByRole('button', { name: 'Change Resistances' })
      ).toBeDisabled();
    });
  });

  // ── Selection behavior ──

  describe('selection behavior', () => {
    it('toggles a checkbox on when clicked', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(screen.getByLabelText('Acid')).toBeChecked();
    });

    it('toggles a checkbox off when clicked again', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(screen.getByLabelText('Acid')).toBeChecked();
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(screen.getByLabelText('Acid')).not.toBeChecked();
    });

    it('selects multiple types up to maxSelections', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      expect(screen.getByLabelText('Acid')).toBeChecked();
      expect(screen.getByLabelText('Fire')).toBeChecked();
    });

    it('prevents selecting more than maxSelections', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      // Third type should be disabled
      expect(screen.getByLabelText('Cold')).toBeDisabled();
      expect(screen.getByLabelText('Lightning')).toBeDisabled();
    });

    it('enables the confirm button after selecting types', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      expect(
        screen.getByRole('button', { name: 'Choose Resistances' })
      ).toBeDisabled();
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(
        screen.getByRole('button', { name: 'Choose Resistances' })
      ).toBeEnabled();
    });

    it('allows deselecting a type after reaching maxSelections', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      expect(screen.getByLabelText('Cold')).toBeDisabled();
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(screen.getByLabelText('Cold')).not.toBeDisabled();
    });

    it('allows switching selection (deselect one, select another)', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      expect(screen.getByLabelText('Cold')).toBeDisabled();
      fireEvent.click(screen.getByLabelText('Fire'));
      fireEvent.click(screen.getByLabelText('Cold'));
      expect(screen.getByLabelText('Cold')).toBeChecked();
      expect(screen.getByLabelText('Fire')).not.toBeChecked();
    });

    it('enables confirm button after switching selection', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      fireEvent.click(screen.getByLabelText('Fire'));
      // Only Acid selected, button should be enabled
      expect(
        screen.getByRole('button', { name: 'Choose Resistances' })
      ).toBeEnabled();
    });
  });

  // ── maxSelections variations ──

  describe('maxSelections variations', () => {
    it('allows selecting exactly 1 type when maxSelections is 1', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 1 })} />);
      expect(
        screen.getByText(/Choose 1 damage type to gain resistance to:/)
      ).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(screen.getByLabelText('Fire')).toBeDisabled();
    });

    it('allows selecting all types when maxSelections equals the number of types', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 4 })} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      fireEvent.click(screen.getByLabelText('Cold'));
      fireEvent.click(screen.getByLabelText('Lightning'));
      expect(screen.getByLabelText('Acid')).toBeChecked();
      expect(screen.getByLabelText('Fire')).toBeChecked();
      expect(screen.getByLabelText('Cold')).toBeChecked();
      expect(screen.getByLabelText('Lightning')).toBeChecked();
    });

    it('allows selecting all types when maxSelections exceeds the number of types', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 10 })} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      expect(screen.getByLabelText('Cold')).not.toBeDisabled();
    });

    it('shows singular "type" in instruction when maxSelections is 1', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 1 })} />);
      expect(
        screen.getByText(/Choose 1 damage type to gain resistance to:/)
      ).toBeInTheDocument();
    });

    it('shows plural "types" in instruction when maxSelections > 1', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 3 })} />);
      expect(
        screen.getByText(/Choose 3 damage types to gain resistance to:/)
      ).toBeInTheDocument();
    });
  });

  // ── Confirm flow ──

  describe('confirm flow', () => {
    it('calls onConfirm with selected types when confirmed', async () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      expect(baseProps.onConfirm).toHaveBeenCalledWith(['Acid', 'Fire']);
    });

    it('does not call onConfirm when no types are selected', async () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      expect(baseProps.onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with a single type when maxSelections is 1', async () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: 1 })} />);
      fireEvent.click(screen.getByLabelText('Cold'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      expect(baseProps.onConfirm).toHaveBeenCalledWith(['Cold']);
    });

    it('calls onConfirm with existing types when no changes made', async () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Fire', 'Cold'] })} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Change Resistances' }));
      });
      expect(baseProps.onConfirm).toHaveBeenCalledWith(['Fire', 'Cold']);
    });

    it('transitions to result state after confirm', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('does not transition to result state when onConfirm returns null', async () => {
      baseProps.onConfirm.mockResolvedValue(null);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Choose Resistances' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
      });
    });

    it('does not transition to result state when onConfirm returns undefined', async () => {
      baseProps.onConfirm.mockResolvedValue(undefined);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Choose Resistances' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
      });
    });
  });

  // ── Result screen ──

  describe('result screen', () => {
    it('displays the result description from onConfirm', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(
          screen.getByText('Resistance to Acid and Fire selected.')
        ).toBeInTheDocument();
      });
    });

    it('renders HTML content via dangerouslySetInnerHTML', async () => {
      const htmlResult = {
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Resistance Selection',
          description: '<strong>Resistance:</strong> Acid and <em>Fire</em> selected.',
        },
      };
      baseProps.onConfirm.mockResolvedValue(htmlResult);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.querySelector('strong')).toBeInTheDocument();
        expect(body.querySelector('em')).toBeInTheDocument();
      });
    });

    it('hides selection checkboxes in result state', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(screen.queryByLabelText('Acid')).not.toBeInTheDocument();
      });
    });

    it('hides Cancel and Choose buttons in result state', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Choose Resistances' })).not.toBeInTheDocument();
      });
    });
  });

  // ── Close behavior ──

  describe('close behavior', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Done button is clicked in result state', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      const onClose = vi.fn();
      render(<MultiResistanceSelectionModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the overlay background', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the modal content', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });

    it('does not close when clicking a checkbox label', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });

    it('does not close in result state when clicking overlay', async () => {
      baseProps.onConfirm.mockResolvedValue(defaultResult);
      const onClose = vi.fn();
      render(<MultiResistanceSelectionModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByLabelText('Acid'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Choose Resistances' }));
      });
      await waitFor(() => {
        const overlay = document.querySelector('.sp-overlay');
        fireEvent.click(overlay);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Customization props ──

  describe('customization props', () => {
    it('renders custom title when provided', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ title: 'Elemental Resistance' })} />);
      expect(screen.getByText('Elemental Resistance')).toBeInTheDocument();
    });

    it('renders custom icon when provided', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ icon: 'fa-fire' })} />);
      const icons = document.querySelectorAll('i.fa-solid.fa-fire');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders default title when not provided', () => {
      const props = {
        icon: 'fa-shield-halved',
        damageTypes: ['Fire'],
        maxSelections: 1,
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      };
      render(<MultiResistanceSelectionModal {...props} />);
      expect(screen.getByText('Resistance Selection')).toBeInTheDocument();
    });

    it('renders default icon when not provided', () => {
      const props = {
        title: 'Test',
        damageTypes: ['Fire'],
        maxSelections: 1,
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      };
      render(<MultiResistanceSelectionModal {...props} />);
      const icons = document.querySelectorAll('i.fa-solid.fa-shield-halved');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders with empty damage types array', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ damageTypes: [] })} />);
      expect(screen.getByText(/Choose 2 damage types to gain resistance to:/)).toBeInTheDocument();
      expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    });

    it('renders with no existing types (undefined)', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: undefined })} />);
      expect(screen.getByText(/Choose 2 damage types to gain resistance to:/)).toBeInTheDocument();
    });

    it('renders with undefined maxSelections without crashing', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ maxSelections: undefined })} />);
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders with undefined onConfirm without crashing', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ onConfirm: undefined })} />);
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders with undefined onClose without crashing', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ onClose: undefined })} />);
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders with all damage types as existing types', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Acid', 'Fire', 'Cold', 'Lightning'] })} />);
      expect(screen.getByText(/Change resistance types \(currently Acid, Fire, Cold, Lightning\):/)).toBeInTheDocument();
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        expect(cb.checked).toBe(true);
      });
    });

    it('shows "(current)" for existing types when some are deselected', () => {
      render(<MultiResistanceSelectionModal {...makeProps({ existingTypes: ['Acid', 'Fire', 'Cold', 'Lightning'], maxSelections: 2 })} />);
      // All 4 are existing and pre-selected (maxSelections=2 but all are pre-selected)
      // Deselect Acid and Fire
      fireEvent.click(screen.getByLabelText('Acid'));
      fireEvent.click(screen.getByLabelText('Fire'));
      // Cold and Lightning are existing but not selected → should show (current)
      const currentSpans = document.querySelectorAll('span[style*="margin-left: 8px"]');
      expect(currentSpans.length).toBe(2);
      currentSpans.forEach(span => {
        expect(span.textContent).toBe('(current)');
      });
    });
  });

  // ── Button types ──

  describe('button types', () => {
    it('renders buttons without explicit type attribute (defaults to submit)', () => {
      render(<MultiResistanceSelectionModal {...baseProps} />);
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      buttons.forEach(btn => {
        expect(btn.type).toBe('submit');
      });
    });
  });
});
