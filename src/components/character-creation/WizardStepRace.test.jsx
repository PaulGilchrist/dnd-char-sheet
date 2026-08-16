// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WizardStepRace from './WizardStepRace.jsx';

const mockRacesData = [
  { name: 'Human', speed: 30, size: 'Medium', languages: ['Common'], traits: [{ name: 'Extra Language', description: 'You can speak one extra language.' }] },
  { name: 'Elf', speed: 30, size: 'Medium', languages: ['Common', 'Elvish'], traits: [{ name: 'Fey Ancestry', description: 'You have advantage on Wisdom saving throws against being charmed.' }], subraces: [{ name: 'High Elf', description: 'High elves are elegant and graceful.', damage_resistance: '' }] },
  { name: 'Dwarf', speed: 25, size: 'Medium', languages: ['Common', 'Dwarvish'], traits: [{ name: 'Darkvision', description: 'You have darkvision with a range of 60 feet.' }] },
];

const mockAllRacesData = [
  { name: 'Human', description: '<p>Humans are versatile and ambitious.</p>' },
  { name: 'Elf', description: '<p>Elves are magical beings.</p>' },
  { name: 'Dwarf', description: '<p>Dwarves are tough and resilient.</p>' },
];

function createMockProps(overrides = {}) {
  return {
    formData: overrides.formData || { race: { name: '', subrace: { name: '' } } },
    errors: overrides.errors || {},
    racesData: overrides.racesData || mockRacesData,
    allRacesData: overrides.allRacesData || mockAllRacesData,
    ruleset: overrides.ruleset || '5e',
    onInputChange: overrides.onInputChange || vi.fn(),
  };
}

describe('WizardStepRace', () => {
  describe('Render', () => {
    it('should display the step heading', () => {
      render(<WizardStepRace {...createMockProps()} />);
      expect(screen.getByText('Step 3: Race')).toBeInTheDocument();
    });

    it('should render the race dropdown with options', () => {
      render(<WizardStepRace {...createMockProps()} />);
      expect(screen.getByText('Race *')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select.querySelector('option:nth-child(1)')).toHaveTextContent('Select a race');
      expect(select.querySelector('option:nth-child(2)')).toHaveTextContent('Human');
      expect(select.querySelector('option:nth-child(3)')).toHaveTextContent('Elf');
    });

    it('should render with a pre-selected race', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('Human');
    });

    it('should show the detail card when a race is selected', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      expect(screen.getByText('Human Details')).toBeInTheDocument();
    });

    it('should not show the detail card when no race is selected', () => {
      render(<WizardStepRace {...createMockProps()} />);
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should show expanded button when details are collapsed', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      expect(screen.getByRole('button', { name: /Show Details/i })).toBeInTheDocument();
    });

    it('should expand details when the header is clicked', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByRole('button', { name: /Hide Details/i })).toBeInTheDocument();
    });

    it('should collapse details when the header is clicked again', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      fireEvent.click(header);
      expect(screen.getByRole('button', { name: /Show Details/i })).toBeInTheDocument();
    });

    it('should expand details when the toggle button is clicked', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const button = screen.getByRole('button', { name: /Show Details/i });
      fireEvent.click(button);
      expect(screen.getByRole('button', { name: /Hide Details/i })).toBeInTheDocument();
    });

    it('should collapse details when the toggle button is clicked again', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const button = screen.getByRole('button', { name: /Show Details/i });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(screen.getByRole('button', { name: /Show Details/i })).toBeInTheDocument();
    });
  });

  describe('Race selection', () => {
    it('should call onInputChange when race changes', () => {
      const mockOnChange = vi.fn();
      render(<WizardStepRace {...createMockProps({ onInputChange: mockOnChange })} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Elf' } });
      expect(mockOnChange).toHaveBeenCalledWith('race', { name: 'Elf', subrace: { name: '' } });
    });
  });

  describe('Error display', () => {
    it('should render error message and error class when race error exists', () => {
      render(<WizardStepRace {...createMockProps({ errors: { race: 'Race is required' } })} />);
      expect(screen.getByText('Race is required')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('error');
    });
  });

  describe('Detail card content', () => {
    it('should render description when full race data has one', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Humans are versatile and ambitious.')).toBeInTheDocument();
    });

    it('should not render description section when full race data has no description', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } }, allRacesData: [{ name: 'Human' }] })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should render core information section with speed and size', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByText('Core Information')).toBeInTheDocument();
      expect(screen.getByText('30 ft.')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render languages for 5e ruleset', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Elf', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Elf Details/i });
      fireEvent.click(header);
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Common, Elvish')).toBeInTheDocument();
    });

    it('should render languages for 2024 ruleset', () => {
      render(<WizardStepRace {...createMockProps({ ruleset: '2024', formData: { race: { name: 'Elf', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Elf Details/i });
      fireEvent.click(header);
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Common, Elvish')).toBeInTheDocument();
    });

    it('should render racial traits when they exist', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByText('Racial Traits')).toBeInTheDocument();
      expect(screen.getByText('Extra Language')).toBeInTheDocument();
      expect(screen.getByText(/You can speak one extra language/)).toBeInTheDocument();
    });

    it('should not render racial traits section when traits are missing', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } }, racesData: [{ name: 'Human', speed: 30, size: 'Medium' }] })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.queryByText('Racial Traits')).not.toBeInTheDocument();
    });

    it('should render trait descriptions with HTML', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } }, racesData: [{ name: 'Human', speed: 30, size: 'Medium', traits: [{ name: 'Trait', description: '<em>Italic trait</em>' }] }] })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByText(/Italic trait/)).toBeInTheDocument();
    });

    it('should render plain trait descriptions without HTML', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'Human', subrace: { name: '' } } } })} />);
      const header = screen.getByRole('heading', { name: /Human Details/i });
      fireEvent.click(header);
      expect(screen.getByText(/You can speak one extra language/)).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should render gracefully when formData.race is null', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: null } })} />);
      expect(screen.getByText('Step 3: Race')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should render gracefully when formData.race is undefined', () => {
      render(<WizardStepRace {...createMockProps({ formData: {} })} />);
      expect(screen.getByText('Step 3: Race')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should render gracefully when race is not found in racesData', () => {
      render(<WizardStepRace {...createMockProps({ formData: { race: { name: 'NonExistent', subrace: { name: '' } } } })} />);
      expect(screen.getByText('Step 3: Race')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should render gracefully with empty racesData', () => {
      render(<WizardStepRace {...createMockProps({ racesData: [] })} />);
      expect(screen.getByText('Step 3: Race')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.querySelector('option')).toHaveTextContent('Select a race');
    });
  });
});
