// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardStepRaceClass from './WizardStepRaceClass.jsx';

const mockCascadingSelectProps = vi.fn();

vi.mock('./CascadingSelect.jsx', () => {
  function MockCascadingSelect(props) {
    mockCascadingSelectProps(props);
    const {
      label,
      childLabel,
      errorKey,
      errors,
      onInputChange,
      fieldName,
      formData,
      subOptionsSelector,
    } = props;
    const selectedParentValue = formData?.[fieldName]?.name || '';
    const availableSubOptions = subOptionsSelector
      ? subOptionsSelector(selectedParentValue)
      : [];
    return (
      <div data-testid={`cascading-select-${fieldName}`}>
        <label>{label} *</label>
        {childLabel && <label>{childLabel} *</label>}
        <select
          data-testid={`select-${fieldName}`}
          value={selectedParentValue}
          onChange={(e) => onInputChange(fieldName, { name: e.target.value })}
          className={errors[fieldName] ? 'error' : ''}
        >
          <option value="">Select a {label.toLowerCase()}</option>
          <option value="Option1">Option1</option>
          <option value="Option2">Option2</option>
        </select>
        {availableSubOptions.length > 0 && (
          <div>
            <span data-testid={`sub-options-count-${fieldName}`}>
              {availableSubOptions.length}
            </span>
          </div>
        )}
        {errorKey && errors?.[errorKey] && (
          <span className="error-message">{errors[errorKey]}</span>
        )}
      </div>
    );
  }
  return { default: MockCascadingSelect };
});

const makeRacesData = () => [
  { name: 'Human', subraces: ['Variant', 'Standard'] },
  { name: 'Elf', subraces: ['High Elf', 'Wood Elf'] },
  { name: 'Dwarf', subraces: ['Hill Dwarf', 'Mountain Dwarf'] },
];

const makeClassSubtypes = () => [
  { className: 'Cleric', subtypes: ['Order of the Keeper', 'Order of the Storm'] },
  { className: 'Druid', subtypes: ['Circle of the Land', 'Circle of the Moon'] },
  { className: 'Fighter', subtypes: ['Champion', 'Battle Master'] },
];

const makeOnInputChange = vi.fn();

const makeProps = (overrides = {}) => ({
  formData: { race: '', subrace: '', class: {} },
  errors: {},
  racesData: makeRacesData(),
  classSubtypes: makeClassSubtypes(),
  ruleset: '5e',
  onInputChange: makeOnInputChange,
  ...overrides,
});

describe('WizardStepRaceClass', () => {
  beforeEach(() => {
    makeOnInputChange.mockClear();
    mockCascadingSelectProps.mockClear();
  });

  describe('structure and labels', () => {
    it('renders the wizard step container with heading, race/class selects, and subrace/subclass child labels', () => {
      render(<WizardStepRaceClass {...makeProps()} />);
      expect(screen.getByText('Step 3: Race & Class')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-race')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-class')).toBeInTheDocument();
      expect(screen.getByText(/Subrace \*/)).toBeInTheDocument();
      expect(screen.getByText(/Subclass \*/)).toBeInTheDocument();
    });

    it('passes correct props to race CascadingSelect', () => {
      render(<WizardStepRaceClass {...makeProps()} />);

      const raceProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'race'
      );

      expect(raceProps).toBeDefined();
      expect(raceProps[0].label).toBe('Race');
      expect(raceProps[0].childLabel).toBe('Subrace');
      expect(raceProps[0].fieldName).toBe('race');
      expect(raceProps[0].childFieldName).toBe('subrace');
      expect(raceProps[0].errorKey).toBe('subrace');
      expect(raceProps[0].loadingText).toBe('Loading races...');
      expect(raceProps[0].childExtraFields).toEqual({ description: '' });
    });

    it('passes correct props to class CascadingSelect', () => {
      render(<WizardStepRaceClass {...makeProps()} />);

      const classProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'class'
      );

      expect(classProps).toBeDefined();
      expect(classProps[0].label).toBe('Class');
      expect(classProps[0].childLabel).toBe('Subclass');
      expect(classProps[0].fieldName).toBe('class');
      expect(classProps[0].childFieldName).toBe('subclass');
      expect(classProps[0].errorKey).toBe('subclass');
      expect(classProps[0].optionsKey).toBe('className');
      expect(classProps[0].loadingText).toBe('Loading classes...');
      expect(classProps[0].childExtraFields).toEqual({ type: '' });
    });
  });

  describe('5e ruleset', () => {
    it('does not render Divine Order or Primal Order selects', () => {
      render(<WizardStepRaceClass {...makeProps({ ruleset: '5e' })} />);
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });

    it('renders class CascadingSelect with subclass options when a class is selected', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '5e',
            formData: { race: '', subrace: '', class: { name: 'Fighter' } },
          })}
        />
      );
      expect(screen.getByText(/Subclass \*/)).toBeInTheDocument();
    });
  });

  describe('2024 ruleset — Cleric shows Divine Order', () => {
    const props = () =>
      makeProps({
        ruleset: '2024',
        formData: { race: '', subrace: '', class: { name: 'Cleric' } },
      });

    const getDivineOrderSelect = () => {
      const defaultOption = screen.getByText('Select a Divine Order');
      return defaultOption.closest('select');
    };

    it('renders Divine Order select with required asterisk, options, and empty default', () => {
      render(<WizardStepRaceClass {...props()} />);
      expect(screen.getByText('Divine Order *')).toBeInTheDocument();
      expect(screen.getByText('Protector')).toBeInTheDocument();
      expect(screen.getByText('Thaumaturge')).toBeInTheDocument();
      expect(getDivineOrderSelect()).toHaveValue('');
    });

    it('does not render Primal Order when Cleric is selected', () => {
      render(<WizardStepRaceClass {...props()} />);
      expect(screen.queryByText(/Primal Order/)).not.toBeInTheDocument();
    });

    it('applies error class and renders error message for divineOrder', () => {
      render(
        <WizardStepRaceClass
          {...props()}
          errors={{ divineOrder: 'Please select a divine order' }}
        />
      );
      expect(getDivineOrderSelect()).toHaveClass('error');
      expect(screen.getByText('Please select a divine order')).toBeInTheDocument();
    });

    it('calls onInputChange with class object including divineOrder when a divine order is selected', () => {
      render(<WizardStepRaceClass {...props()} />);
      const select = getDivineOrderSelect();
      fireEvent.change(select, { target: { value: 'Protector' } });
      expect(makeOnInputChange).toHaveBeenCalledWith('class', {
        name: 'Cleric',
        divineOrder: 'Protector',
      });
    });

    it('shows pre-selected divineOrder in the select', () => {
      render(
        <WizardStepRaceClass
          {...props()}
          formData={{ race: '', subrace: '', class: { name: 'Cleric', divineOrder: 'Protector' } }}
        />
      );
      expect(getDivineOrderSelect()).toHaveValue('Protector');
    });

    it('preserves existing class properties when updating divineOrder', () => {
      render(
        <WizardStepRaceClass
          {...props()}
          formData={{ race: '', subrace: '', class: { name: 'Cleric', divineOrder: 'Thaumaturge' } }}
        />
      );
      const select = getDivineOrderSelect();
      fireEvent.change(select, { target: { value: 'Protector' } });
      expect(makeOnInputChange).toHaveBeenCalledWith('class', {
        name: 'Cleric',
        divineOrder: 'Protector',
      });
    });
  });

  describe('2024 ruleset — Druid shows Primal Order', () => {
    const props = () =>
      makeProps({
        ruleset: '2024',
        formData: { race: '', subrace: '', class: { name: 'Druid' } },
      });

    const getPrimalOrderSelect = () => {
      const defaultOption = screen.getByText('Select a Primal Order');
      return defaultOption.closest('select');
    };

    it('renders Primal Order select with required asterisk, options, and empty default', () => {
      render(<WizardStepRaceClass {...props()} />);
      expect(screen.getByText('Primal Order *')).toBeInTheDocument();
      expect(screen.getByText('Magician')).toBeInTheDocument();
      expect(screen.getByText('Warden')).toBeInTheDocument();
      expect(getPrimalOrderSelect()).toHaveValue('');
    });

    it('does not render Divine Order when Druid is selected', () => {
      render(<WizardStepRaceClass {...props()} />);
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
    });

    it('applies error class and renders error message for primalOrder', () => {
      render(
        <WizardStepRaceClass
          {...props()}
          errors={{ primalOrder: 'Please select a primal order' }}
        />
      );
      expect(getPrimalOrderSelect()).toHaveClass('error');
      expect(screen.getByText('Please select a primal order')).toBeInTheDocument();
    });

    it('calls onInputChange with class object including primalOrder when a primal order is selected', () => {
      render(<WizardStepRaceClass {...props()} />);
      const select = getPrimalOrderSelect();
      fireEvent.change(select, { target: { value: 'Warden' } });
      expect(makeOnInputChange).toHaveBeenCalledWith('class', {
        name: 'Druid',
        primalOrder: 'Warden',
      });
    });

    it('shows pre-selected primalOrder in the select', () => {
      render(
        <WizardStepRaceClass
          {...props()}
          formData={{ race: '', subrace: '', class: { name: 'Druid', primalOrder: 'Warden' } }}
        />
      );
      expect(getPrimalOrderSelect()).toHaveValue('Warden');
    });
  });

  describe('2024 ruleset — non-Druid/non-Cleric hides order selects', () => {
    it('does not render Divine Order or Primal Order for Fighter', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Fighter' } },
          })}
        />
      );
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });

    it('does not render order selects when class is not set', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: {} },
          })}
        />
      );
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });
  });

  describe('formData edge cases', () => {
    it('renders without order selects when class is undefined', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            formData: { race: '', subrace: '', class: undefined },
          })}
        />
      );
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });

    it('renders without order selects when class is null', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            formData: { race: '', subrace: '', class: null },
          })}
        />
      );
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });

    it('renders without order selects when class name is empty string', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            formData: { race: '', subrace: '', class: { name: '' } },
          })}
        />
      );
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });

    it('renders correctly when selected race or class not found in data', () => {
      const racesData = [{ name: 'Human', subraces: ['Variant'] }];
      const classSubtypes = [{ className: 'Cleric', subtypes: ['Order'] }];
      render(
        <WizardStepRaceClass
          {...makeProps({
            racesData,
            classSubtypes,
            formData: {
              race: 'Nonexistent',
              subrace: '',
              class: { name: 'Nonexistent' },
            },
          })}
        />
      );
      expect(screen.getByText('Step 3: Race & Class')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-race')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-class')).toBeInTheDocument();
    });

    it('renders with selected race subrace and divineOrder populated', () => {
      const racesData = [{ name: 'Human', subraces: ['Variant', 'Standard'] }];
      const classSubtypes = [
        { className: 'Cleric', subtypes: ['Order of the Keeper'] },
      ];
      render(
        <WizardStepRaceClass
          {...makeProps({
            racesData,
            classSubtypes,
            formData: {
              race: { name: 'Human' },
              subrace: 'Variant',
              class: { name: 'Cleric', divineOrder: 'Thaumaturge' },
            },
            ruleset: '2024',
          })}
        />
      );
      expect(screen.getByText('Step 3: Race & Class')).toBeInTheDocument();
      expect(screen.getByText('Divine Order *')).toBeInTheDocument();
      expect(screen.getByText('Thaumaturge')).toBeInTheDocument();
    });

    it('renders without errors when racesData and classSubtypes are empty arrays', () => {
      render(
        <WizardStepRaceClass
          {...makeProps({
            racesData: [],
            classSubtypes: [],
          })}
        />
      );
      expect(screen.getByText('Step 3: Race & Class')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-race')).toBeInTheDocument();
      expect(screen.getByTestId('cascading-select-class')).toBeInTheDocument();
    });
  });

  describe('input change handling', () => {
    it('calls onInputChange when race CascadingSelect changes', () => {
      render(<WizardStepRaceClass {...makeProps()} />);
      const raceProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'race'
      );
      raceProps[0].onInputChange('race', { name: 'Elf' });
      expect(makeOnInputChange).toHaveBeenCalledWith('race', { name: 'Elf' });
    });

    it('calls onInputChange when class CascadingSelect changes', () => {
      render(<WizardStepRaceClass {...makeProps()} />);
      const classProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'class'
      );
      classProps[0].onInputChange('class', { name: 'Fighter' });
      expect(makeOnInputChange).toHaveBeenCalledWith('class', { name: 'Fighter' });
    });
  });

  describe('dynamic class switching in 2024 ruleset', () => {
    it('switches from Divine Order to Primal Order when class changes from Cleric to Druid', () => {
      const { rerender } = render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Cleric' } },
          })}
        />
      );
      expect(screen.getByText('Divine Order *')).toBeInTheDocument();
      expect(screen.queryByText(/Primal Order/)).not.toBeInTheDocument();

      rerender(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Druid' } },
          })}
        />
      );

      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.getByText('Primal Order *')).toBeInTheDocument();
    });

    it('switches from Primal Order to Divine Order when class changes from Druid to Cleric', () => {
      const { rerender } = render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Druid' } },
          })}
        />
      );
      expect(screen.getByText('Primal Order *')).toBeInTheDocument();
      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();

      rerender(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Cleric' } },
          })}
        />
      );

      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
      expect(screen.getByText('Divine Order *')).toBeInTheDocument();
    });

    it('hides both order selects when class changes from Cleric to Fighter', () => {
      const { rerender } = render(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Cleric' } },
          })}
        />
      );
      expect(screen.getByText('Divine Order *')).toBeInTheDocument();

      rerender(
        <WizardStepRaceClass
          {...makeProps({
            ruleset: '2024',
            formData: { race: '', subrace: '', class: { name: 'Fighter' } },
          })}
        />
      );

      expect(screen.queryByText('Divine Order')).not.toBeInTheDocument();
      expect(screen.queryByText('Primal Order')).not.toBeInTheDocument();
    });
  });

  describe('prop forwarding', () => {
    it('passes errors and formData props to both CascadingSelect instances', () => {
      const errors = { race: 'Required', subrace: 'Required', subclass: 'Required' };
      const formData = {
        race: { name: 'Human' },
        subrace: { name: 'Variant' },
        class: { name: 'Fighter' },
      };
      render(<WizardStepRaceClass {...makeProps({ errors, formData })} />);

      const raceProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'race'
      );
      const classProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'class'
      );

      expect(raceProps[0].errors).toBe(errors);
      expect(raceProps[0].formData).toBe(formData);
      expect(classProps[0].errors).toBe(errors);
      expect(classProps[0].formData).toBe(formData);
    });

    it('passes ruleset prop to both CascadingSelect instances', () => {
      render(<WizardStepRaceClass {...makeProps({ ruleset: '2024' })} />);

      const raceProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'race'
      );
      const classProps = mockCascadingSelectProps.mock.calls.find(
        (call) => call[0].fieldName === 'class'
      );

      expect(raceProps[0].ruleset).toBe('2024');
      expect(classProps[0].ruleset).toBe('2024');
    });
  });
});
