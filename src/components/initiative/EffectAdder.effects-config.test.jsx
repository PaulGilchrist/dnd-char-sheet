// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';
import { TARGET_EFFECT_DEFINITIONS } from '../../services/combat/conditions/targetEffectDefinitions.js';

describe('EffectAdder - effects config view', () => {
  let props;

  beforeEach(() => {
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

  describe('config header and description', () => {
    it('should show effect icon and label in config header', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const header = document.querySelector('.ea-config-header');
      expect(header).toBeInTheDocument();
      expect(header.querySelector('i')).toHaveClass('fa-bullseye');
      expect(header.querySelector('strong')).toHaveTextContent('Goad');
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
  });

  describe('source field', () => {
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
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Dragon')).toBeInTheDocument();
    });

    it('should have an "Other…" option in source dropdown', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(screen.getByText('Other…')).toBeInTheDocument();
    });

    it('should show custom source input when "Other" is selected', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__other__' } });
      expect(screen.getByPlaceholderText('Custom source name')).toBeInTheDocument();
    });

    it('should not show source field for effects without source', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('No Opportunity Attacks'));
      expect(screen.queryByText('Source (who caused this):')).not.toBeInTheDocument();
    });
  });

  describe('value field', () => {
    it('should show value field when effect has value field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Next Attack +N Bonus'));
      expect(screen.getByText('Value:')).toBeInTheDocument();
      expect(screen.getByLabelText('Value:')).toHaveValue(5);
    });

    it('should use effect defaults when selecting an effect', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      expect(screen.getByLabelText('Value:')).toHaveValue(2);
    });

    it('should reset to defaults when selecting a different effect', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Next Attack +N Bonus'));
      expect(screen.getByLabelText('Value:')).toHaveValue(5);

      fireEvent.change(screen.getByLabelText('Value:'), { target: { value: '99' } });
      expect(screen.getByLabelText('Value:')).toHaveValue(99);

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      expect(screen.getByLabelText('Value:')).toHaveValue(2);
    });

    it('should allow changing value input', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      const valueInput = screen.getByLabelText('Value:');
      fireEvent.change(valueInput, { target: { value: '7' } });
      expect(valueInput).toHaveValue(7);
    });

    it('should handle invalid value input defaulting to 0', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('AC Penalty'));
      const valueInput = screen.getByLabelText('Value:');
      fireEvent.change(valueInput, { target: { value: 'abc' } });
      expect(valueInput).toHaveValue(0);
    });
  });

  describe('ability field', () => {
    it('should show ability field when effect has ability field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Check Disadv'));
      const abilitySelect = screen.getByLabelText('Ability:');
      expect(abilitySelect).toBeInTheDocument();
      const optionValues = Array.from(abilitySelect.options).map(o => o.value);
      expect(optionValues).toContain('wis');
      expect(abilitySelect.value).toBe('wis');
    });

    it('should allow changing ability in effect config', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Check Disadv'));
      const abilitySelect = screen.getByLabelText('Ability:');
      fireEvent.change(abilitySelect, { target: { value: 'str' } });
      expect(abilitySelect.value).toBe('str');
    });
  });

  describe('DC field', () => {
    it('should show DC field when effect has dc field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      expect(screen.getByText('Save DC:')).toBeInTheDocument();
      expect(screen.getByLabelText('Save DC:')).toHaveValue(15);
    });

    it('should allow changing DC in effect config', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
      const dcInput = screen.getByLabelText('Save DC:');
      fireEvent.change(dcInput, { target: { value: '20' } });
      expect(dcInput).toHaveValue(20);
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

  describe('notes field', () => {
    it('should show notes textarea always', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(screen.getByPlaceholderText('GM notes about this effect…')).toBeInTheDocument();
    });

    it('should allow entering notes', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const textarea = screen.getByPlaceholderText('GM notes about this effect…');
      fireEvent.change(textarea, { target: { value: 'GM note here' } });
      expect(textarea).toHaveValue('GM note here');
    });
  });

  describe('back navigation', () => {
    it('should go back to browse when Back is clicked', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      expect(document.querySelector('.ea-config')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(document.querySelector('.ea-config')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
    });
  });

  describe('onApply callback', () => {
    it('should call onApply with source for effect with source field', () => {
      render(<EffectAdder {...props} initialTab='conditions' />);
      fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
      fireEvent.click(screen.getByText('Goad'));
      const select = screen.getByRole('combobox');
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
      const select = screen.getByRole('combobox');
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

    it('should call onApply with undefined source when source is not selected', () => {
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

    it('should call onApply with value when effect has value field', () => {
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
      const select = screen.getByRole('combobox');
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
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });
  });
});
