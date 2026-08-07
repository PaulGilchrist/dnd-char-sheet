import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChoiceListModal } from './ChoiceListModal.jsx';

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

const defaultOptions = [
  { name: 'Option A', description: 'Description A' },
  { name: 'Option B', description: 'Description B' },
  { name: 'Option C', description: 'Description C' },
];

const defaultProps = {
  icon: 'fa-solid fa-star',
  title: 'Select Options',
  description: 'Choose your options below',
  options: defaultOptions,
  onClose: mockOnClose,
  onConfirm: mockOnConfirm,
};

function makeProps(overrides) {
  return { ...defaultProps, ...(overrides || {}) };
}

function clickApply() {
  fireEvent.click(screen.getByRole('button', { name: /Confirm/ }));
}

// ── Initial render ──

describe('ChoiceListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('single select mode (default)', () => {
    it('renders modal with icon, title, and description', () => {
      render(<ChoiceListModal {...makeProps()} />);
      expect(screen.getByText('Select Options')).toBeInTheDocument();
      expect(screen.getByText('Choose your options below')).toBeInTheDocument();
    });

    it('renders all options with radio inputs', () => {
      render(<ChoiceListModal {...makeProps()} />);
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
      expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    });

    it('renders option descriptions', () => {
      render(<ChoiceListModal {...makeProps()} />);
      expect(screen.getByText('— Description A')).toBeInTheDocument();
      expect(screen.getByText('— Description B')).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons', () => {
      render(<ChoiceListModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('disables confirm button when no option is selected', () => {
      render(<ChoiceListModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
    });

    it('uses icon in confirm button', () => {
      render(<ChoiceListModal {...makeProps({ icon: 'fa-fire' })} />);
      const btn = screen.getByRole('button', { name: /Confirm/ });
      expect(btn.querySelector('.fa-fire')).toBeInTheDocument();
    });

    it('uses custom confirm icon when provided', () => {
      render(<ChoiceListModal {...makeProps({ icon: 'fa-star', confirmIcon: 'fa-check' })} />);
      const btn = screen.getByRole('button', { name: /Confirm/ });
      expect(btn.querySelector('.fa-check')).toBeInTheDocument();
    });

    it('uses custom confirm label', () => {
      render(<ChoiceListModal {...makeProps({ confirmLabel: 'Select' })} />);
      expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    });

    it('uses custom cancel label', () => {
      render(<ChoiceListModal {...makeProps({ cancelLabel: 'Dismiss' })} />);
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });

    it('renders without description when description is empty', () => {
      render(<ChoiceListModal {...makeProps({ description: '' })} />);
      expect(screen.queryByText('Choose your options below')).not.toBeInTheDocument();
    });
  });

  describe('selection behavior (single select)', () => {
    it('selects an option when its radio is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[1]);
      expect(radios[1].checked).toBe(true);
    });

    it('enables confirm button after selecting an option', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
    });

    it('switches selection when a different option is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      expect(radios[0].checked).toBe(true);
      fireEvent.click(radios[2]);
      expect(radios[0].checked).toBe(false);
      expect(radios[2].checked).toBe(true);
    });

    it('applies selected style to the chosen option label', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const labels = document.querySelectorAll('label');
      expect(labels[0].className).not.toContain('choice-selected');
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      expect(labels[0].className).toContain('choice-selected');
    });

    it('uses custom inputName for radio inputs', () => {
      render(<ChoiceListModal {...makeProps({ inputName: 'myChoice' })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      expect(radios[0].name).toBe('myChoice');
    });
  });

  describe('multi select mode', () => {
    it('renders checkboxes instead of radios when multiSelect is true', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    });

    it('shows selection count when multiSelect is true', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      expect(screen.getByText('Selected: 0 / 3')).toBeInTheDocument();
    });

    it('updates selection count when options are selected', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('Selected: 2 / 3')).toBeInTheDocument();
    });

    it('disables unselected options when maxSelections is reached', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 2 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(checkboxes[2].disabled).toBe(true);
    });

    it('allows deselecting when at max selections', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 2 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[1]);
      expect(checkboxes[2].disabled).toBe(false);
    });

    it('does not add more than maxSelections', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 2 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
      const checked = document.querySelectorAll('input[type="checkbox"]:checked');
      expect(checked).toHaveLength(2);
    });

    it('disables confirm button when no options selected in multi select', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
    });

    it('enables confirm button when at least one option selected in multi select', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
    });

    it('allows selecting multiple options up to maxSelections', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(true);
    });
  });

  describe('existing selections', () => {
    it('marks existing selections with (current) badge', () => {
      render(<ChoiceListModal {...makeProps({ existingSelections: ['Option A'] })} />);
      expect(screen.getByText('(current)')).toBeInTheDocument();
    });

    it('applies existing style to already selected option', () => {
      render(<ChoiceListModal {...makeProps({ existingSelections: ['Option B'] })} />);
      const labels = document.querySelectorAll('label');
      expect(labels[1].className).toContain('choice-existing');
    });

    it('does not apply existing style to newly selected option', () => {
      render(<ChoiceListModal {...makeProps({ existingSelections: ['Option A'] })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[1]);
      const labels = document.querySelectorAll('label');
      expect(labels[1].className).toContain('choice-selected');
      expect(labels[1].className).not.toContain('choice-existing');
    });

    it('marks existing selections even in multi select mode', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, existingSelections: ['Option A', 'Option C'] })} />);
      expect(screen.getAllByText('(current)').length).toBe(2);
    });
  });

  describe('custom key/label/description functions', () => {
    it('uses custom getOptionKey to track selections', () => {
      const options = [{ id: 1, name: 'Opt1' }, { id: 2, name: 'Opt2' }];
      const props = {
        ...makeProps({ options }),
        getOptionKey: (opt) => opt.id,
      };
      render(<ChoiceListModal {...props} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      fireEvent.click(radios[1]);
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
    });

    it('uses custom getOptionLabel for option text', () => {
      const options = [{ id: 1, label: 'Custom Label' }];
      render(<ChoiceListModal {...makeProps({ options, getOptionLabel: (opt) => opt.label })} />);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('uses custom getOptionDescription for descriptions', () => {
      const options = [{ name: 'Opt1', customDesc: 'Custom description text' }];
      render(<ChoiceListModal {...makeProps({ options, getOptionDescription: (opt) => opt.customDesc })} />);
      expect(screen.getByText('— Custom description text')).toBeInTheDocument();
    });

    it('does not show description span when getOptionDescription returns empty', () => {
      const options = [{ name: 'Opt1', description: '' }];
      render(<ChoiceListModal {...makeProps({ options, getOptionDescription: (opt) => opt.description })} />);
      expect(screen.queryByText('— ')).not.toBeInTheDocument();
    });
  });

  describe('confirm behavior', () => {
    it('calls onConfirm with selected key(s) when confirm is clicked', async () => {
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Confirmed' } });
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Option A');
      });
    });

    it('calls onConfirm with array of selected keys in multi select', async () => {
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Confirmed' } });
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      clickApply();
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(['Option A', 'Option B']);
      });
    });

    it('does not call onConfirm when no option is selected', () => {
      render(<ChoiceListModal {...makeProps()} />);
      clickApply();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when no options selected in multi select', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 3 })} />);
      clickApply();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('enters result view mode when resultView is true and onConfirm returns a result', async () => {
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Result description' } });
      render(<ChoiceListModal {...makeProps({ resultView: true })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.getByText('Result description')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('shows result description as HTML in result view mode', async () => {
      mockOnConfirm.mockResolvedValue({ payload: { description: '<strong>Bold result</strong>' } });
      render(<ChoiceListModal {...makeProps({ resultView: true })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.innerHTML).toContain('<strong>Bold result</strong>');
      });
    });

    it('shows empty result when payload.description is missing', async () => {
      mockOnConfirm.mockResolvedValue({ payload: {} });
      render(<ChoiceListModal {...makeProps({ resultView: true })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.textContent).toBe('');
      });
    });

    it('does not enter result view when resultView is false', async () => {
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Result' } });
      render(<ChoiceListModal {...makeProps({ resultView: false })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
        expect(screen.getByText('Select Options')).toBeInTheDocument();
      });
    });

    it('does not enter result view when onConfirm returns null', async () => {
      mockOnConfirm.mockResolvedValue(null);
      render(<ChoiceListModal {...makeProps({ resultView: true })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
      });
    });
  });

  describe('close/cancel behavior', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal inner content is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not close when an option label is clicked', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const labels = document.querySelectorAll('label');
      fireEvent.click(labels[0]);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Done button is clicked in result view', async () => {
      const onClose = vi.fn();
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Done' } });
      render(<ChoiceListModal {...makeProps({ resultView: true, onClose })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal is clicked in result view', async () => {
      const onClose = vi.fn();
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Done' } });
      render(<ChoiceListModal {...makeProps({ resultView: true, onClose })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when overlay is clicked in result view', async () => {
      const onClose = vi.fn();
      mockOnConfirm.mockResolvedValue({ payload: { description: 'Done' } });
      render(<ChoiceListModal {...makeProps({ resultView: true, onClose })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SelectedComponent rendering', () => {
    it('renders SelectedComponent instead of default labels when provided', () => {
      const SelectedComponent = ({ option, selected, onToggle }) => (
        <div className="custom-option" data-selected={selected} onClick={onToggle}>
          {option.name}
        </div>
      );
      render(<ChoiceListModal {...makeProps({ SelectedComponent })} />);
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(document.querySelectorAll('.custom-option')).toHaveLength(3);
    });

    it('passes selected=true to SelectedComponent when option is selected', () => {
      const SelectedComponent = ({ option, selected, onToggle }) => (
        <div data-selected={selected} onClick={onToggle}>{option.name}</div>
      );
      render(<ChoiceListModal {...makeProps({ SelectedComponent })} />);
      expect(document.querySelectorAll('[data-selected="false"]')).toHaveLength(3);
      fireEvent.click(screen.getByText('Option A'));
      expect(document.querySelector('[data-selected="true"]')).toBeInTheDocument();
    });

    it('passes existing=true to SelectedComponent for existing selections', () => {
      const SelectedComponent = ({ option, existing }) => (
        <div data-existing={existing}>{option.name}</div>
      );
      render(<ChoiceListModal {...makeProps({ SelectedComponent, existingSelections: ['Option A'] })} />);
      expect(document.querySelector('[data-existing="true"]')).toBeInTheDocument();
    });

    it('passes disabled=true to SelectedComponent when at max in multi select', () => {
      const SelectedComponent = ({ option, disabled, onToggle }) => (
        <div data-disabled={disabled} onClick={onToggle}>{option.name}</div>
      );
      render(<ChoiceListModal {...makeProps({ SelectedComponent, multiSelect: true, maxSelections: 2 })} />);
      const optionA = screen.getByText('Option A');
      const optionB = screen.getByText('Option B');
      const optionC = screen.getByText('Option C');
      fireEvent.click(optionA);
      fireEvent.click(optionB);
      // Option C should now be disabled
      expect(optionC.getAttribute('data-disabled')).toBe('true');
    });

    it('calls onToggle on SelectedComponent when clicked', () => {
      const SelectedComponent = ({ option, selected, onToggle }) => (
        <div data-selected={selected} onClick={onToggle}>{option.name}</div>
      );
      render(<ChoiceListModal {...makeProps({ SelectedComponent })} />);
      fireEvent.click(screen.getByText('Option A'));
      const updatedOptionA = screen.getByText('Option A');
      expect(updatedOptionA.getAttribute('data-selected')).toBe('true');
    });
  });

  describe('maxSelections = 0 edge case', () => {
    it('does not allow any selection when maxSelections is 0', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 0 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[0].disabled).toBe(true);
    });
  });

  describe('empty options array', () => {
    it('renders no options when options is empty', () => {
      render(<ChoiceListModal {...makeProps({ options: [] })} />);
      expect(screen.getByText('Select Options')).toBeInTheDocument();
      expect(document.querySelectorAll('.choice-option')).toHaveLength(0);
    });

    it('disables confirm button when options is empty', () => {
      render(<ChoiceListModal {...makeProps({ options: [] })} />);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
    });
  });

  describe('disabled state for single select', () => {
    it('does not disable any option in single select mode', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        expect(radio.disabled).toBe(false);
      });
    });
  });

  describe('choice-disabled class', () => {
    it('applies choice-disabled class when at max in multi select', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 2 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      const labels = document.querySelectorAll('label');
      expect(labels[2].className).toContain('choice-disabled');
    });

    it('does not apply choice-disabled to already selected options', () => {
      render(<ChoiceListModal {...makeProps({ multiSelect: true, maxSelections: 2 })} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      const labels = document.querySelectorAll('label');
      expect(labels[0].className).not.toContain('choice-disabled');
    });
  });

  describe('result view missing payload', () => {
    it('handles result with no payload gracefully', async () => {
      mockOnConfirm.mockResolvedValue({});
      render(<ChoiceListModal {...makeProps({ resultView: true })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      clickApply();
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.textContent).toBe('');
      });
    });
  });

  describe('getOptionKey default behavior', () => {
    it('uses opt.name as key by default', () => {
      render(<ChoiceListModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      fireEvent.click(radios[1]);
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
    });

    it('uses opt.id when name is missing and getOptionKey is default', () => {
      const options = [{ id: 'a' }, { id: 'b' }];
      render(<ChoiceListModal {...makeProps({ options, getOptionKey: (opt) => opt.name || opt.id })} />);
      const radios = document.querySelectorAll('input[type="radio"]');
      fireEvent.click(radios[0]);
      fireEvent.click(radios[1]);
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
    });
  });
});
