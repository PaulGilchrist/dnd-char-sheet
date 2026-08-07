import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';
import { TARGET_EFFECT_DEFINITIONS } from '../../services/combat/conditions/targetEffectDefinitions.js';
import { CONDITIONS } from '../../services/combat/conditions/conditionUtils.js';

describe('EffectAdder', () => {
  let props;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      targetName: 'Goblin',
      initialTab: 'conditions',
      onCancel: vi.fn(),
      onApply: vi.fn(),
      creatures: [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Dragon' },
      ],
    };
  });

  describe('rendering - overlay and modal structure', () => {
    it('should render the overlay with a modal', () => {
      render(<EffectAdder {...props} />);
      expect(document.querySelector('.ea-overlay')).toBeInTheDocument();
      expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    });

    it('should render the target name as heading', () => {
      render(<EffectAdder {...props} />);
      expect(screen.getByRole('heading', { level: 3, name: 'Goblin' })).toBeInTheDocument();
    });

    it.each`
      targetName
      ${'Goblin'}
      ${'Alice the Wizard'}
      ${''}
    `('should render target name "$targetName" in heading', ({ targetName }) => {
      render(<EffectAdder {...props} targetName={targetName} />);
      expect(screen.getByRole('heading', { level: 3, name: targetName || '' })).toBeInTheDocument();
    });

    it('should render three tabs: Conditions, Effects, Concentration', () => {
      render(<EffectAdder {...props} />);
      expect(screen.getByRole('button', { name: 'Conditions' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Effects' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Concentration' })).toBeInTheDocument();
    });

    it('should highlight the initialTab as active', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      expect(document.querySelectorAll('.ea-tab--active')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Conditions' })).toHaveClass('ea-tab--active');

      // Switch to effects tab
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      expect(screen.getByRole('button', { name: 'Effects' })).toHaveClass('ea-tab--active');
      expect(screen.getByRole('button', { name: 'Conditions' })).not.toHaveClass('ea-tab--active');

      // Switch to concentration tab
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByRole('button', { name: 'Concentration' })).toHaveClass('ea-tab--active');
      expect(screen.getByRole('button', { name: 'Conditions' })).not.toHaveClass('ea-tab--active');
    });

    it('should default to "conditions" tab when initialTab is not provided', () => {
      render(<EffectAdder {...props} initialTab={undefined} />);
      expect(screen.getByRole('button', { name: 'Conditions' })).toHaveClass('ea-tab--active');
    });

    it('should call onCancel when the overlay background is clicked', () => {
      render(<EffectAdder {...props} />);
      const overlay = document.querySelector('.ea-overlay');
      fireEvent.click(overlay);
      expect(props.onCancel).toHaveBeenCalled();
    });

    it('should NOT call onCancel when the modal content is clicked', () => {
      render(<EffectAdder {...props} />);
      const modal = document.querySelector('.ea-modal');
      fireEvent.click(modal);
      expect(props.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('tab switching', () => {
    it('should switch to Effects tab when clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      expect(screen.getByRole('button', { name: 'Effects' })).toHaveClass('ea-tab--active');
      expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
    });

    it('should switch to Concentration tab when clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByRole('button', { name: 'Concentration' })).toHaveClass('ea-tab--active');
      expect(screen.getByPlaceholderText('e.g. Hold Person')).toBeInTheDocument();
    });
  });

  describe('conditions tab', () => {
    it('should render all conditions as clickable badges', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      CONDITIONS.forEach(({ key: _key, label }) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should render DC and Save (ability) fields', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const dcInput = screen.getByLabelText('DC');
      expect(dcInput).toBeInTheDocument();
      expect(dcInput).toHaveValue(10);

      const select = screen.getByLabelText('Save');
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('con');
    });

    it('should select a condition and show it as selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const blindedBtn = screen.getByText('Blinded');
      fireEvent.click(blindedBtn);
      expect(blindedBtn).toHaveClass('ea-badge--selected');
    });

    it('should disable Apply button when no condition is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('should enable Apply button when a condition is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByText('Blinded'));
      expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    });

    it('should set the save ability to the condition\'s default ability when selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      // grappled defaults to 'str'
      fireEvent.click(screen.getByText('Grappled'));
      const select = screen.getByLabelText('Save');
      expect(select.value).toBe('str');
    });

    it('should allow changing the DC input', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: '15' } });
      expect(dcInput).toHaveValue(15);
    });

    it('should handle invalid DC input by defaulting to 10', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: 'abc' } });
      expect(dcInput).toHaveValue(10);
    });

    it('should allow changing the save ability', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const select = screen.getByLabelText('Save');
      fireEvent.change(select, { target: { value: 'dex' } });
      expect(select.value).toBe('dex');
    });

    it('should call onApply with correct data when Apply is clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByText('Blinded'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('conditions', {
        conditionKey: 'blinded',
        dc: 10,
        ability: 'con',
      });
    });

    it('should call onApply with custom DC and ability', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByText('Grappled'));
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: '20' } });
      const select = screen.getByLabelText('Save');
      fireEvent.change(select, { target: { value: 'dex' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('conditions', {
        conditionKey: 'grappled',
        dc: 20,
        ability: 'dex',
      });
    });

    it('should call onCancel when Cancel is clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onCancel).toHaveBeenCalled();
    });

    it('should not call onApply when Apply is clicked without a selection', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).not.toHaveBeenCalled();
    });

    it('should have all six ability options in the Save dropdown', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      const select = screen.getByLabelText('Save');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(6);
      expect(options[0]).toHaveValue('str');
      expect(options[1]).toHaveValue('dex');
      expect(options[2]).toHaveValue('con');
      expect(options[3]).toHaveValue('int');
      expect(options[4]).toHaveValue('wis');
      expect(options[5]).toHaveValue('cha');
    });
  });

  describe('effects tab - browsing', () => {
    it('should render a search input when switching to effects tab', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
    });

    it('should render all effects grouped by category', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const groups = ['Attack', 'Defensive', 'Saves & Checks', 'Spells', 'Movement'];
      groups.forEach(group => {
        expect(screen.getByText(group)).toBeInTheDocument();
      });
    });

    it('should render each effect definition as a clickable badge with icon', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      TARGET_EFFECT_DEFINITIONS.forEach(def => {
        expect(screen.getByText(def.label)).toBeInTheDocument();
      });
    });

    it('should show effects with Font Awesome icons', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const firstEffect = TARGET_EFFECT_DEFINITIONS[0];
      const icon = document.querySelector(`.fa-solid.${firstEffect.icon}`);
      expect(icon).toBeInTheDocument();
    });

    it('should show effect badges with tooltip from description', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const firstEffect = TARGET_EFFECT_DEFINITIONS[0];
      const badge = screen.getByText(firstEffect.label);
      expect(badge).toHaveAttribute('title', firstEffect.description);
    });

    it('should show empty message when search matches nothing', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'zzzznotfound' } });
      expect(screen.getByText(/No effects match/)).toBeInTheDocument();
    });

    it('should filter effects by label', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'Goad' } });
      expect(screen.getByText('Goad')).toBeInTheDocument();
      // "Escape the Horde" should not appear
      expect(screen.queryByText('Escape the Horde')).not.toBeInTheDocument();
    });

    it('should filter effects by description', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'Disadvantage on attack' } });
      // Should find effects with "Disadvantage on attack rolls" in description
      expect(screen.queryByText('No effects match')).not.toBeInTheDocument();
    });

    it('should filter effects by group', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'Movement' } });
      expect(screen.getByText('Movement')).toBeInTheDocument();
    });

    it('should filter effects by effect key', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'slasher_enhanced_critical' } });
      expect(screen.getByText('Attack Disadv')).toBeInTheDocument();
    });

    it('should clear selection when search input changes', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // Select an effect
      fireEvent.click(screen.getByText('Goad'));
      // Should show config view
      expect(document.querySelector('.ea-config')).toBeInTheDocument();

      // Type in search - this resets selection and goes back to browse
      const searchInput = screen.getByPlaceholderText('Search effects…');
      fireEvent.change(searchInput, { target: { value: 'a' } });

      // Should return to browse view
      expect(document.querySelector('.ea-config')).not.toBeInTheDocument();
    });

    it('should auto-focus the search input', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      expect(searchInput).toHaveFocus();
    });

    it('should only show groups that have matching effects when searching', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      const searchInput = screen.getByPlaceholderText('Search effects…');
      // Search for something that only exists in "Movement" group
      fireEvent.change(searchInput, { target: { value: 'Speed' } });
      // "Movement" group should appear
      expect(screen.getByText('Movement')).toBeInTheDocument();
    });
  });

  describe('effects tab - selecting and configuring an effect', () => {
    it('should show effect config header with icon and label when an effect is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(document.querySelector('.ea-config')).toBeInTheDocument();
      const header = document.querySelector('.ea-config-header');
      expect(header).toHaveTextContent('Goad');
    });

    it('should show the effect description in the config view', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const def = TARGET_EFFECT_DEFINITIONS.find(d => d.label === 'Goad');
      expect(document.querySelector('.ea-config-desc')).toHaveTextContent(def.description);
    });

    it('should show Back and Apply buttons in config view', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    it('should show source dropdown when effect has source field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(screen.getByText('Source (who caused this):')).toBeInTheDocument();
    });

    it('should populate creature names in source dropdown', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      expect(within(select).getByText('Alice')).toBeInTheDocument();
      expect(within(select).getByText('Bob')).toBeInTheDocument();
      expect(within(select).getByText('Dragon')).toBeInTheDocument();
    });

    it('should have an "Other…" option in source dropdown', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      expect(within(select).getByText('Other…')).toBeInTheDocument();
    });

    it('should show custom source input when "Other" is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      fireEvent.change(select, { target: { value: '__other__' } });
      expect(screen.getByPlaceholderText('Custom source name')).toBeInTheDocument();
    });

    it('should not show source field for effects without source', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "No Opportunity Attacks" has no fields
      fireEvent.click(screen.getByText('No Opportunity Attacks'));
      expect(screen.queryByText('Source (who caused this):')).not.toBeInTheDocument();
    });

    it('should show value field when effect has value field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "Next Attack +N Bonus" has value field, defaults to 5
      fireEvent.click(screen.getByText('Next Attack +N Bonus'));
      expect(screen.getByText('Value:')).toBeInTheDocument();
      const valueInput = screen.getByLabelText('Value:');
      expect(valueInput).toHaveValue(5);
    });

    it('should show ability field when effect has ability field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "Hex (ability check disadvantage)" has ability field, defaults to 'wis'
      fireEvent.click(screen.getByText('Check Disadv'));
      // Find the ability select within the config section
      const config = document.querySelector('.ea-config');
      const abilitySelect = config.querySelectorAll('select')[1]; // Second select (after source)
      expect(abilitySelect).toBeInTheDocument();
      const optionValues = Array.from(abilitySelect.options).map(o => o.value);
      expect(optionValues).toContain('wis');
      // The default ability for Check Disadv is 'wis'
      expect(abilitySelect.value).toBe('wis');
    });

    it('should show DC field when effect has dc field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "Tasha's Hideous Laughter" has dc field, defaults to 15
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      expect(screen.getByText('Save DC:')).toBeInTheDocument();
      const dcInput = screen.getByLabelText('Save DC:');
      expect(dcInput).toHaveValue(15);
    });

    it('should show notes textarea always', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(screen.getByPlaceholderText('GM notes about this effect…')).toBeInTheDocument();
    });

    it('should use effect defaults when selecting an effect', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "AC Penalty" defaults: value=2, source not set
      fireEvent.click(screen.getByText('AC Penalty'));
      const valueInput = screen.getByLabelText('Value:');
      expect(valueInput).toHaveValue(2);
    });

    it('should reset to defaults when selecting a different effect', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // First select an effect with value default 5
      fireEvent.click(screen.getByText('Next Attack +N Bonus'));
      let valueInput = screen.getByLabelText('Value:');
      expect(valueInput).toHaveValue(5);

      // Change the value
      fireEvent.change(valueInput, { target: { value: '99' } });
      expect(valueInput).toHaveValue(99);

      // Go back to browse
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      // Select a different effect with value default 2
      fireEvent.click(screen.getByText('AC Penalty'));
      valueInput = screen.getByLabelText('Value:');
      expect(valueInput).toHaveValue(2);
    });

    it('should allow changing value input', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      const valueInput = screen.getByLabelText('Value:');
      fireEvent.change(valueInput, { target: { value: '7' } });
      expect(valueInput).toHaveValue(7);
    });

    it('should allow changing ability in effect config', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // "Hex (ability check disadvantage)" has ability field, defaults to 'wis'
      fireEvent.click(screen.getByText('Check Disadv'));
      const config = document.querySelector('.ea-config');
      const abilitySelect = config.querySelectorAll('select')[1]; // Second select (after source)
      fireEvent.change(abilitySelect, { target: { value: 'str' } });
      expect(abilitySelect.value).toBe('str');
    });

    it('should allow changing DC in effect config', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      const dcInput = screen.getByLabelText('Save DC:');
      fireEvent.change(dcInput, { target: { value: '20' } });
      expect(dcInput).toHaveValue(20);
    });

    it('should allow entering notes', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const textarea = screen.getByPlaceholderText('GM notes about this effect…');
      fireEvent.change(textarea, { target: { value: 'GM note here' } });
      expect(textarea).toHaveValue('GM note here');
    });

    it('should go back to browse when Back is clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(document.querySelector('.ea-config')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(document.querySelector('.ea-config')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
    });

    it('should call onApply with correct effect data for effect with source only', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      fireEvent.change(select, { target: { value: 'Alice' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('effects', {
        effectKey: 'goad',
        source: 'Alice',
        value: undefined,
        ability: undefined,
        dc: undefined,
        notes: undefined,
      });
    });

    it('should call onApply with custom source when "Other" is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      fireEvent.change(select, { target: { value: '__other__' } });
      const customInput = screen.getByPlaceholderText('Custom source name');
      fireEvent.change(customInput, { target: { value: 'Mysterious Stranger' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('effects', {
        effectKey: 'goad',
        source: 'Mysterious Stranger',
        value: undefined,
        ability: undefined,
        dc: undefined,
        notes: undefined,
      });
    });

    it('should call onApply with undefined source when source is empty', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('effects', {
        effectKey: 'goad',
        source: undefined,
        value: undefined,
        ability: undefined,
        dc: undefined,
        notes: undefined,
      });
    });

    it('should call onApply with value and ability for effects that have those fields', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Next Attack +N Bonus'));
      const valueInput = screen.getByLabelText('Value:');
      fireEvent.change(valueInput, { target: { value: '8' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('effects', {
        effectKey: 'next_attack_bonus',
        source: undefined,
        value: 8,
        ability: undefined,
        dc: undefined,
        notes: undefined,
      });
    });

    it('should call onApply with all fields populated', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      fireEvent.change(select, { target: { value: 'Bob' } });
      const dcInput = screen.getByLabelText('Save DC:');
      fireEvent.change(dcInput, { target: { value: '18' } });
      const textarea = screen.getByPlaceholderText('GM notes about this effect…');
      fireEvent.change(textarea, { target: { value: 'Boss spell' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('effects', {
        effectKey: 'tashas_hideous_laughter',
        source: 'Bob',
        value: undefined,
        ability: undefined,
        dc: 18,
        notes: 'Boss spell',
      });
    });

    it('should not call onApply when no effect is selected in effects tab', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      // In browse mode (no selection), there is no Apply button
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });

    it('should handle invalid value input defaulting to 0', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      const valueInput = screen.getByLabelText('Value:');
      fireEvent.change(valueInput, { target: { value: 'abc' } });
      expect(valueInput).toHaveValue(0);
    });

    it('should handle invalid DC input defaulting to 10', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      const dcInput = screen.getByLabelText('Save DC:');
      fireEvent.change(dcInput, { target: { value: 'abc' } });
      expect(dcInput).toHaveValue(10);
    });
  });

  describe('effects tab - creatureNames sorting', () => {
    it('should sort creature names alphabetically in source dropdown', () => {
      const sortedProps = {
        ...props,
        creatures: [
          { name: 'Zombie' },
          { name: 'Alice' },
          { name: 'Dragon' },
          { name: 'Bob' },
        ],
      };
      render(<EffectAdder {...sortedProps} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
      expect(options).toEqual(['', 'Alice', 'Bob', 'Dragon', 'Zombie', '__other__']);
    });

    it('should filter out creatures with no name', () => {
      const filteredProps = {
        ...props,
        creatures: [
          { name: 'Alice' },
          { name: null },
          { name: undefined },
          { name: '' },
          { name: 'Bob' },
        ],
      };
      render(<EffectAdder {...filteredProps} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
      expect(options).toContain('Alice');
      expect(options).toContain('Bob');
      expect(options).not.toContain('');
    });

    it('should deduplicate creature names', () => {
      const dupProps = {
        ...props,
        creatures: [
          { name: 'Alice' },
          { name: 'Alice' },
          { name: 'Bob' },
        ],
      };
      render(<EffectAdder {...dupProps} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      const options = Array.from(select.querySelectorAll('option'));
      const aliceOptions = options.filter(o => o.value === 'Alice');
      expect(aliceOptions).toHaveLength(1);
    });

    it('should handle empty creatures array', () => {
      const emptyProps = { ...props, creatures: [] };
      render(<EffectAdder {...emptyProps} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
      const options = Array.from(select.querySelectorAll('option'));
      // Should only have the default and "Other" options
      expect(options).toHaveLength(2);
    });

    it('should handle undefined creatures prop', () => {
      const undefProps = { ...props, creatures: undefined };
      render(<EffectAdder {...undefProps} initialTab='conditions' />);
      expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    });
  });

  describe('concentration tab', () => {
    it('should render spell name input and DC field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByText('Spell Name')).toBeInTheDocument();
      expect(screen.getByText('DC')).toBeInTheDocument();
    });

    it('should have spell name input with correct placeholder', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      expect(spellInput).toBeInTheDocument();
    });

    it('should auto-focus the spell name input', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      expect(spellInput).toHaveFocus();
    });

    it('should have DC input defaulting to 10', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const dcInput = screen.getByLabelText('DC');
      expect(dcInput).toHaveValue(10);
    });

    it('should disable Apply when spell name is empty', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('should enable Apply when spell name is entered', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      fireEvent.change(spellInput, { target: { value: 'Fireball' } });
      expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    });

    it('should trim whitespace before applying', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      fireEvent.change(spellInput, { target: { value: '  Fireball  ' } });
      expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    });

    it('should allow changing DC', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: '18' } });
      expect(dcInput).toHaveValue(18);
    });

    it('should handle invalid DC input defaulting to 10', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: 'xyz' } });
      expect(dcInput).toHaveValue(10);
    });

    it('should call onApply with correct concentration data', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      fireEvent.change(spellInput, { target: { value: 'Hold Person' } });
      const dcInput = screen.getByLabelText('DC');
      fireEvent.change(dcInput, { target: { value: '15' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('concentration', {
        spellName: 'Hold Person',
        dc: 15,
      });
    });

    it('should trim whitespace from spell name in onApply', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      const spellInput = screen.getByPlaceholderText('e.g. Hold Person');
      fireEvent.change(spellInput, { target: { value: '  Shield  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).toHaveBeenCalledWith('concentration', {
        spellName: 'Shield',
        dc: 10,
      });
    });

    it('should call onCancel when Cancel is clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.onCancel).toHaveBeenCalled();
    });

    it('should not call onApply when Apply is clicked without spell name', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Concentration' }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(props.onApply).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should render without crashing when all props are minimal', () => {
      render(<EffectAdder targetName='Test' onCancel={vi.fn()} onApply={vi.fn()} creatures={[]} />);
      expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    });

    it('should render without crashing when onApply/onCancel are undefined', () => {
      expect(() => {
        render(<EffectAdder targetName='Test' />);
      }).not.toThrow();
    });
  });
});
