// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepBackground from './WizardStepBackground.jsx';

const mockBackgrounds = [
  {
    index: 'acolyte',
    name: 'Acolyte',
    description: 'You devoted yourself to service in a temple.',
    ability_scores: 'Intelligence, Wisdom, Charisma',
    feat: 'Magic Initiate',
    skill_proficiencies: 'Insight and Religion',
    tool_proficiencies: "Calligrapher's Supplies",
  },
  {
    index: 'soldier',
    name: 'Soldier',
    description: 'You were a soldier.',
    ability_scores: 'Strength, Constitution',
    feat: 'Alert',
    skill_proficiencies: 'Athletics and Perception',
    tool_proficiencies: 'One kind of Gaming Set or Musical Instrument',
  },
  {
    index: 'hermit',
    name: 'Hermit',
    description: 'You spent years in solitude, pursuing a craft or seeking enlightenment.',
    ability_scores: 'Wisdom, Medicine',
    feat: '',
    skill_proficiencies: '',
    tool_proficiencies: '',
  },
];

function createMockProps(overrides = {}) {
  return {
    formData: { background: overrides.formData?.background || '' },
    errors: overrides.errors || {},
    backgrounds: overrides.backgrounds || mockBackgrounds,
    ruleset: overrides.ruleset || '2024',
    onInputChange: overrides.onInputChange || vi.fn(),
  };
}

describe('WizardStepBackground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('heading', () => {
    it('should display the step heading', () => {
      render(<WizardStepBackground {...createMockProps()} />);
      expect(screen.getByText('Step 5: Background')).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('should render the background label and select element', () => {
      render(<WizardStepBackground {...createMockProps()} />);
      expect(screen.getByText('Background *')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should populate options from backgrounds array', () => {
      render(<WizardStepBackground {...createMockProps()} />);
      expect(screen.getByText('Select a background')).toBeInTheDocument();
      expect(screen.getByText('Acolyte')).toBeInTheDocument();
      expect(screen.getByText('Soldier')).toBeInTheDocument();
      expect(screen.getByText('Hermit')).toBeInTheDocument();
    });

    it('should pre-select a chosen background', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Soldier' },
          })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('Soldier');
    });

    it('should call onInputChange with the selected value when changed', () => {
      const mockOnChange = vi.fn();
      render(<WizardStepBackground {...createMockProps({ onInputChange: mockOnChange })} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Soldier' } });
      expect(mockOnChange).toHaveBeenCalledWith('background', 'Soldier');
    });

    it('should call onInputChange with empty string when deselecting', () => {
      const mockOnChange = vi.fn();
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
            onInputChange: mockOnChange,
          })}
        />
      );
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });
      expect(mockOnChange).toHaveBeenCalledWith('background', '');
    });
  });

  describe('error display', () => {
    it('should render the error message below the select', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            errors: { background: 'Background is required' },
          })}
        />
      );
      expect(screen.getByText('Background is required')).toBeInTheDocument();
    });

    it('should apply the error class to the select element', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            errors: { background: 'Background is required' },
          })}
        />
      );
      expect(screen.getByRole('combobox')).toHaveClass('error');
    });
  });

  describe('detail card', () => {
    it('should not render a detail card when no background is selected', () => {
      render(<WizardStepBackground {...createMockProps()} />);
      expect(screen.queryByText(/Details$/)).not.toBeInTheDocument();
    });

    it('should not render a detail card when selected background is not found', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Nonexistent Background' },
          })}
        />
      );
      expect(screen.queryByText(/Details$/)).not.toBeInTheDocument();
    });

    it('should render the detail card header when a background is selected', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      expect(screen.getByText('Acolyte Details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show Details' })).toBeInTheDocument();
    });

    it('should expand details when the header is clicked', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      fireEvent.click(screen.getByText('Acolyte Details'));
      expect(screen.getByRole('button', { name: 'Hide Details' })).toBeInTheDocument();
    });

    it('should collapse details when the header is clicked again', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      const header = screen.getByText('Acolyte Details');
      fireEvent.click(header);
      fireEvent.click(header);
      expect(screen.getByRole('button', { name: 'Show Details' })).toBeInTheDocument();
    });

    it('should expand details when the toggle button is clicked independently', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Show Details' }));
      expect(screen.getByRole('button', { name: 'Hide Details' })).toBeInTheDocument();
    });

    it('should collapse details when the toggle button is clicked again', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      const toggle = screen.getByRole('button', { name: 'Show Details' });
      fireEvent.click(toggle);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Details' }));
      expect(screen.getByRole('button', { name: 'Show Details' })).toBeInTheDocument();
    });

    it('should render all detail sections when expanded with full data', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Acolyte' },
          })}
        />
      );
      fireEvent.click(screen.getByText('Acolyte Details'));
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('You devoted yourself to service in a temple.')).toBeInTheDocument();
      expect(screen.getByText('Ability Scores')).toBeInTheDocument();
      expect(screen.getByText('Intelligence, Wisdom, Charisma')).toBeInTheDocument();
      expect(screen.getByText('Feat')).toBeInTheDocument();
      expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
      expect(screen.getByText('Skill Proficiencies')).toBeInTheDocument();
      expect(screen.getByText('Insight and Religion')).toBeInTheDocument();
      expect(screen.getByText('Tool Proficiencies')).toBeInTheDocument();
      expect(screen.getByText("Calligrapher's Supplies")).toBeInTheDocument();
    });

    it('should not render empty sections when fields are falsy', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            formData: { background: 'Hermit' },
          })}
        />
      );
      fireEvent.click(screen.getByText('Hermit Details'));
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Ability Scores')).toBeInTheDocument();
      expect(screen.queryByText('Feat')).not.toBeInTheDocument();
      expect(screen.queryByText('Skill Proficiencies')).not.toBeInTheDocument();
      expect(screen.queryByText('Tool Proficiencies')).not.toBeInTheDocument();
    });
  });

  describe('5e ruleset', () => {
    it('should display the not-available notice', () => {
      render(<WizardStepBackground {...createMockProps({ ruleset: '5e' })} />);
      expect(screen.getByText(/Backgrounds are only available for 2024/)).toBeInTheDocument();
    });

    it('should not render the dropdown or error for 5e ruleset', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            ruleset: '5e',
            errors: { background: 'Background is required' },
          })}
        />
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByText('Background is required')).not.toBeInTheDocument();
    });
  });

  describe('empty backgrounds', () => {
    it('should show a loading message when no backgrounds are available', () => {
      render(<WizardStepBackground {...createMockProps({ backgrounds: [] })} />);
      expect(screen.getByText('Background data not yet loaded. Please try again.')).toBeInTheDocument();
    });

    it('should not render the dropdown or error when backgrounds are empty', () => {
      render(
        <WizardStepBackground
          {...createMockProps({
            backgrounds: [],
            errors: { background: 'Background is required' },
          })}
        />
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByText('Background is required')).not.toBeInTheDocument();
    });
  });
});
