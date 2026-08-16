// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepSpecial from './WizardStepSpecial.jsx';

vi.mock('../common/PreviewToggle.jsx', () => ({
  default: function MockPreviewToggle({ value, onChange, placeholder }) {
    return (
      <textarea
        className="preview-toggle-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  },
}));

describe('WizardStepSpecial', () => {
  const baseProps = {
    formData: {
      specialActions: [{ name: 'Action 1', description: 'Description 1', details: null }],
    },
    onArrayFieldChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step header and add action form', () => {
      render(<WizardStepSpecial {...baseProps} />);
      expect(screen.getByText('Step 12: Special Actions')).toBeInTheDocument();
      expect(screen.getByText('Add New Action')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Action name (required)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Additional details (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Action' })).toBeInTheDocument();
    });

    it('should render existing actions with name, description, details, and remove button', () => {
      render(<WizardStepSpecial {...baseProps} />);
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText('Custom Special Actions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('should not render the actions list section when there are no actions', () => {
      const props = {
        ...baseProps,
        formData: { specialActions: [] },
      };
      render(<WizardStepSpecial {...props} />);
      expect(screen.queryByText('Custom Special Actions')).not.toBeInTheDocument();
    });

    it('should not render description paragraph when description is empty string', () => {
      const props = {
        ...baseProps,
        formData: {
          specialActions: [{ name: 'Action', description: '', details: null }],
        },
      };
      const { container } = render(<WizardStepSpecial {...props} />);
      expect(screen.getByText('Action')).toBeInTheDocument();
      const actionLi = container.querySelector('.wizard-step li');
      const paragraphs = actionLi.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });

    it('should not render details paragraph when details is empty string', () => {
      const props = {
        ...baseProps,
        formData: {
          specialActions: [{ name: 'Action', description: 'Desc', details: '' }],
        },
      };
      render(<WizardStepSpecial {...props} />);
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Desc')).toBeInTheDocument();
    });
  });

  describe('normalization', () => {
    it('should normalize string actions to objects with name/description/details', () => {
      const props = {
        ...baseProps,
        formData: {
          specialActions: ['Plain String Action'],
        },
      };
      render(<WizardStepSpecial {...props} />);
      expect(screen.getByText('Plain String Action')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('should handle undefined specialActions gracefully', () => {
      const props = {
        ...baseProps,
        formData: {},
      };
      const { container } = render(<WizardStepSpecial {...props} />);
      expect(screen.getByText('Step 12: Special Actions')).toBeInTheDocument();
      expect(container.querySelector('.form-group')).toBeTruthy();
      expect(screen.queryByText('Custom Special Actions')).not.toBeInTheDocument();
    });
  });

  describe('adding actions', () => {
    it('should add a new action with trimmed fields and clear the form', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [],
          newSpecialAction: { name: '  Trimmed Action  ', description: '  Desc  ', details: '   ' },
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Action' }));
      expect(mockOnChange).toHaveBeenCalledWith(
        'specialActions',
        [{ name: 'Trimmed Action', description: 'Desc', details: null }]
      );
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', {});
    });

    it('should not add an action when name is empty or whitespace-only', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [],
          newSpecialAction: { name: '   ', description: 'Desc', details: '' },
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Action' }));
      const specialActionsCalls = mockOnChange.mock.calls.filter((c) => c[0] === 'specialActions');
      expect(specialActionsCalls).toHaveLength(0);
    });

    it('should not add an action when name is undefined or missing', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [],
          newSpecialAction: { description: 'Desc', details: '' },
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Action' }));
      const specialActionsCalls = mockOnChange.mock.calls.filter((c) => c[0] === 'specialActions');
      expect(specialActionsCalls).toHaveLength(0);
    });

    it('should append to existing actions without replacing them', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [{ name: 'Existing', description: 'Old', details: null }],
          newSpecialAction: { name: 'New', description: 'New Desc', details: 'New details' },
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Action' }));
      expect(mockOnChange).toHaveBeenCalledWith('specialActions', [
        { name: 'Existing', description: 'Old', details: null },
        { name: 'New', description: 'New Desc', details: 'New details' },
      ]);
    });
  });

  describe('removing actions', () => {
    it('should remove only the clicked action when multiple actions exist', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [
            { name: 'Action 1', description: 'Desc 1', details: null },
            { name: 'Action 2', description: 'Desc 2', details: 'Details 2' },
            { name: 'Action 3', description: 'Desc 3', details: null },
          ],
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      fireEvent.click(removeButtons[1]);
      expect(mockOnChange).toHaveBeenCalledWith('specialActions', [
        { name: 'Action 1', description: 'Desc 1', details: null },
        { name: 'Action 3', description: 'Desc 3', details: null },
      ]);
    });

    it('should remove the only action when there is just one', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [{ name: 'Only Action', description: 'Solo', details: null }],
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(mockOnChange).toHaveBeenCalledWith('specialActions', []);
    });

    it('should handle removal from normalized string actions', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: ['String Action 1', 'String Action 2'],
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      fireEvent.click(removeButtons[0]);
      expect(mockOnChange).toHaveBeenCalledWith('specialActions', [
        { name: 'String Action 2', description: '', details: null },
      ]);
    });
  });

  describe('form field updates', () => {
    it('should update new action fields on typing', () => {
      const mockOnChange = vi.fn();
      render(<WizardStepSpecial {...baseProps} onArrayFieldChange={mockOnChange} />);

      const nameInput = screen.getByPlaceholderText('Action name (required)');
      fireEvent.change(nameInput, { target: { value: 'New Action Name' } });
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', { name: 'New Action Name' });

      const descriptionTextarea = screen.getByPlaceholderText('Description');
      fireEvent.change(descriptionTextarea, { target: { value: 'A powerful new description' } });
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', {
        description: 'A powerful new description',
      });

      const detailsTextarea = screen.getByPlaceholderText('Additional details (optional)');
      fireEvent.change(detailsTextarea, { target: { value: 'Some important details' } });
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', {
        details: 'Some important details',
      });
    });

    it('should preserve existing newSpecialAction fields when updating one field', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [],
          newSpecialAction: { name: 'Existing Name', description: 'Existing Desc', details: 'Existing Details' },
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);

      const nameInput = screen.getByPlaceholderText('Action name (required)');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', {
        name: 'Updated Name',
        description: 'Existing Desc',
        details: 'Existing Details',
      });
    });

    it('should handle undefined newSpecialAction gracefully', () => {
      const mockOnChange = vi.fn();
      const props = {
        ...baseProps,
        formData: {
          specialActions: [],
          newSpecialAction: undefined,
        },
        onArrayFieldChange: mockOnChange,
      };
      render(<WizardStepSpecial {...props} />);

      const nameInput = screen.getByPlaceholderText('Action name (required)');
      expect(nameInput).toHaveValue('');
      fireEvent.change(nameInput, { target: { value: 'New Action' } });
      expect(mockOnChange).toHaveBeenCalledWith('newSpecialAction', {
        name: 'New Action',
      });
    });
  });
});
