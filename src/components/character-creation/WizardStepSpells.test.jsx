// @improved-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepSpells from './WizardStepSpells.jsx';
import * as spellLimits from '../../services/rules/spells/spellLimits.js';
import * as spellValidation from '../../services/rules/spells/spellValidation.js';

vi.mock('./SelectableList.jsx', () => ({
  default: vi.fn((props) => {
    const {
      title,
      resultLabel,
      renderSummary,
      items = [],
      renderItem,
      className,
    } = props;
    return (
      <div data-testid="selectable-list" className={className}>
        <h2>{title}</h2>
        {resultLabel && <div data-testid="result-label">{resultLabel}</div>}
        {renderSummary && <div data-testid="summary">{renderSummary()}</div>}
        {items.map((item, index) =>
          renderItem ? renderItem(item, index, {
            isSelected: index === 0,
            isPreSelected: index === 1,
            isExpanded: true,
            onToggle: vi.fn(),
            onToggleExpand: vi.fn(),
          }) : null
        )}
      </div>
    );
  }),
}));

const defaultSpellLimits = {
  cantrip: 3,
  level1: 2, level2: 0, level3: 0, level4: 0,
  level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
  spellType: 'known',
  preparedSpells: null,
};

vi.mock('../../services/rules/spells/spellLimits.js', () => ({
  getSpellLimits: vi.fn(() => Promise.resolve(defaultSpellLimits)),
  validateSpellSelection: vi.fn(() => Promise.resolve({ valid: true, violations: [] })),
}));

vi.mock('../../services/rules/spells/spellValidation.js', () => ({
  getSpellValidationInfo: vi.fn(() => Promise.resolve({ warnings: [] })),
}));

const mockProps = {
  formData: {
    class: { name: 'Wizard', subclass: { name: 'Evocation' } },
    level: 5,
    rules: '5e',
    spells: ['Fireball'],
  },
  allSpells: [
    { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
    { name: 'Magic Missile', index: 'magic_missile', level: 0, school: 'Evocation', description: ['A missile.'], classes: ['Wizard'] },
  ],
  onArrayFieldChange: vi.fn(),
};

// Shared helper to reduce per-test setup noise
const setSpellLimits = (overrides = {}) => {
  spellLimits.getSpellLimits.mockResolvedValueOnce({ ...defaultSpellLimits, ...overrides });
};

describe('WizardStepSpells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the step title and spells from allSpells', async () => {
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Step 9: Spells')).toBeInTheDocument();
      });
    });

    it('renders all available spells in the list', async () => {
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
        expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      });
    });

    it('shows auto-assigned label for pre-selected spells', async () => {
      render(<WizardStepSpells {...mockProps} preSelectedSpells={['Magic Missile']} />);
      await waitFor(() => {
        expect(screen.getByText('(Auto-assigned)')).toBeInTheDocument();
      });
    });
  });

  describe('Spell summary', () => {
    it('renders the spell selection summary header', async () => {
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });

    it('shows per-level breakdown for known-spell mode', async () => {
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('1th level:')).toBeInTheDocument();
        expect(screen.getByText('3th level:')).toBeInTheDocument();
      });
    });

    it('shows 0/limit when no spells are selected', async () => {
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(screen.getByText('0/3')).toBeInTheDocument();
      });
    });

    it('highlights exceeded counts with the exceeded class', async () => {
      const overLimitSpells = [
        { name: 'C1', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'C2', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'C3', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'C4', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={overLimitSpells} formData={{ ...mockProps.formData, spells: ['C1', 'C2', 'C3', 'C4'] }} />);
      await waitFor(() => {
        const countEl = screen.getByText('4/3');
        expect(countEl).toHaveClass('exceeded');
      });
    });
  });

  describe('Prepared spell mode', () => {
    const preparedLimits = {
      cantrip: 3,
      preparedSpells: 4,
      spellType: 'prepared',
      level1: 2, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
    };

    it('shows prepared spells count instead of per-level breakdown', async () => {
      setSpellLimits(preparedLimits);
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Prepared Spells:')).toBeInTheDocument();
        expect(screen.queryByText('1th level:')).not.toBeInTheDocument();
      });
    });

    it('highlights exceeded prepared spell count', async () => {
      setSpellLimits({ ...preparedLimits, preparedSpells: 2 });
      const manySpells = [
        { name: 'S1', level: 1, school: 'Abjuration', classes: ['Wizard'], description: [] },
        { name: 'S2', level: 1, school: 'Abjuration', classes: ['Wizard'], description: [] },
        { name: 'S3', level: 2, school: 'Evocation', classes: ['Wizard'], description: [] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={manySpells} formData={{ ...mockProps.formData, spells: ['S1', 'S2', 'S3'] }} />);
      await waitFor(() => {
        const countEl = screen.getByText('3/2');
        expect(countEl).toHaveClass('exceeded');
      });
    });
  });

  describe('Edge cases', () => {
    it('renders with empty spells and empty allSpells', async () => {
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: [] }} allSpells={[]} />);
      await waitFor(() => {
        expect(screen.getByText('Step 9: Spells')).toBeInTheDocument();
      });
    });

    it('does not crash when a selected spell is not found in allSpells', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} allSpells={[]} formData={{ ...mockProps.formData, spells: ['NonExistentSpell'] }} />);
      await waitFor(() => {
        expect(screen.getByTestId('selectable-list')).toBeInTheDocument();
      });
    });

    it('renders when allSpells is null', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} allSpells={null} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(screen.getByTestId('selectable-list')).toBeInTheDocument();
      });
    });
  });

  describe('Spell validation warnings', () => {
    it('renders warnings when getSpellValidationInfo returns warnings', async () => {
      spellValidation.getSpellValidationInfo.mockResolvedValueOnce({
        warnings: [{ message: 'Spell chosen outside of class spell list', type: 'warning' }],
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Fireball', 'Unknown Spell'] }} />);
      await waitFor(() => {
        expect(screen.getByText(/Spell chosen outside/)).toBeInTheDocument();
      });
    });

    it('clears warnings when getSpellValidationInfo returns an empty array', async () => {
      spellValidation.getSpellValidationInfo.mockResolvedValueOnce({ warnings: [] });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.queryByText(/Spell chosen outside/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Spell limit error handling', () => {
    it('logs error and uses fallback limits when getSpellLimits rejects', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      spellLimits.getSpellLimits.mockRejectedValueOnce(new Error('Network error'));

      render(<WizardStepSpells formData={{ class: { name: 'Wizard' }, level: 5, spells: [] }} allSpells={[]} onArrayFieldChange={vi.fn()} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching spell limits:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Spell detail rendering', () => {
    const richSpell = {
      name: 'Bless',
      index: 'bless',
      level: 1,
      school: 'Abjuration',
      description: ['You bless your allies'],
      classes: ['Cleric'],
      ritual: true,
      concentration: true,
      components: ['V', 'S', 'M'],
      material: 'a holy symbol',
      damage: { damage_type: 'Radiant' },
      casting_time: '1 action',
      duration: 'Concentration, up to 1 minute',
    };

    const baseProps = { ...mockProps, allSpells: [richSpell], formData: { ...mockProps.formData, spells: ['Bless'] } };

    it('shows spell detail tags when properties are present', async () => {
      const { container } = render(<WizardStepSpells {...baseProps} />);
      await waitFor(() => {
        expect(container.querySelector('.spell-ritual')).toHaveTextContent('Ritual');
        expect(container.querySelector('.spell-concentration')).toHaveTextContent('Concentration');
        expect(container.querySelector('.spell-duration')).toHaveTextContent('Duration: Concentration, up to 1 minute');
        expect(container.querySelector('.spell-casting-time')).toHaveTextContent('Casting: 1 action');
        expect(container.querySelector('.spell-description')).toHaveTextContent('You bless your allies');
        expect(container.querySelector('.spell-components')).toHaveTextContent('V, S, M');
        expect(container.querySelector('.spell-damage')).toHaveTextContent('Radiant');
        expect(container.querySelector('.spell-material')).toHaveTextContent('a holy symbol');
        expect(container.querySelector('.spell-school')).toHaveTextContent('Abjuration');
      });
    });

    it('omits tags when properties are absent', async () => {
      const { container } = render(<WizardStepSpells {...baseProps} allSpells={[{ ...richSpell, ritual: false, concentration: false, duration: null, components: [], damage: null, material: null, school: undefined }]} />);
      await waitFor(() => {
        expect(container.querySelector('.spell-ritual')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-concentration')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-duration')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-components')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-damage')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-material')).not.toBeInTheDocument();
        expect(container.querySelector('.spell-school')).toHaveTextContent('Unknown');
      });
    });
  });

  describe('Pre-selected spells excluded from counts', () => {
    it('excludes pre-selected spells from spell counts at cantrip and level 1', async () => {
      setSpellLimits({
        cantrip: 3, level1: 1, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const allSpells = [
        { name: 'PreSelCantrip', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'PreSel1', level: 1, school: 'Abjuration', classes: ['Wizard'], description: [] },
        { name: 'PreSel2', level: 1, school: 'Abjuration', classes: ['Wizard'], description: [] },
        { name: 'UserSpell', level: 1, school: 'Abjuration', classes: ['Wizard'], description: [] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={allSpells} formData={{ ...mockProps.formData, spells: ['PreSelCantrip', 'PreSel1', 'PreSel2', 'UserSpell'] }} preSelectedSpells={['PreSelCantrip', 'PreSel1', 'PreSel2']} />);
      await waitFor(() => {
        expect(screen.getByText('1/1')).toBeInTheDocument();
      });
    });
  });

  describe('All spells available regardless of slot level', () => {
    it('shows all spells regardless of character spell slot level', async () => {
      setSpellLimits({
        cantrip: 3, level1: 4, level2: 3, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const allSpells = [
        { name: 'Cantrip', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'Level1', level: 1, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'Level2', level: 2, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'Level3', level: 3, school: 'Evocation', classes: ['Wizard'], description: [] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={allSpells} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(screen.getByText('Cantrip')).toBeInTheDocument();
        expect(screen.getByText('Level1')).toBeInTheDocument();
        expect(screen.getByText('Level2')).toBeInTheDocument();
        expect(screen.getByText('Level3')).toBeInTheDocument();
      });
    });

    it('shows all spell levels even when character has no spell slots', async () => {
      setSpellLimits({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const allSpells = [
        { name: 'Cantrip1', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'Level1', level: 1, school: 'Evocation', classes: ['Wizard'], description: [] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={allSpells} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(screen.getByText('Cantrip1')).toBeInTheDocument();
        expect(screen.getByText('Level1')).toBeInTheDocument();
      });
    });
  });

  describe('2024 ruleset support', () => {
    it('uses 2024 ruleset when formData.rules is 2024', async () => {
      setSpellLimits({
        cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, rules: '2024' }} />);
      await waitFor(() => {
        expect(spellLimits.getSpellLimits).toHaveBeenCalledWith('Wizard', 5, '2024', expect.any(String), expect.any(Object), undefined);
      });
    });
  });

  describe('Major name extraction', () => {
    it('uses class.major.name when available, falling back to subclass.name', async () => {
      setSpellLimits({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, class: { name: 'Wizard', major: { name: 'Evocation' } } }} />);
      await waitFor(() => {
        expect(spellLimits.getSpellLimits).toHaveBeenCalledWith('Wizard', 5, '5e', 'Evocation', expect.any(Object), undefined);
      });

      vi.clearAllMocks();
      setSpellLimits({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, class: { name: 'Wizard', major: null, subclass: { name: 'School of Necromancy' } } }} />);
      await waitFor(() => {
        expect(spellLimits.getSpellLimits).toHaveBeenCalledWith('Wizard', 5, '5e', 'School of Necromancy', expect.any(Object), undefined);
      });
    });
  });

  describe('Class filter Wizard extension', () => {
    it('adds Fighter and Rogue to Wizard spells in class filter', async () => {
      setSpellLimits();
      const wizardFighterSpell = { name: 'Shield', index: 'shield', level: 1, school: 'Abjuration', description: ['Protect self.'], classes: ['Wizard', 'Fighter'] };
      render(<WizardStepSpells {...mockProps} allSpells={[wizardFighterSpell]} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(screen.getByText('Shield')).toBeInTheDocument();
      });
    });
  });

  describe('Spell validation error handling', () => {
    it('logs error and clears warnings when getSpellValidationInfo rejects', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      spellValidation.getSpellValidationInfo.mockRejectedValueOnce(new Error('Validation error'));

      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Fireball'] }} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error validating spells:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Known spell mode totalPrepared', () => {
    it('returns 0 for totalPrepared when spellType is known', async () => {
      setSpellLimits({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Spell validation useEffect', () => {
    it('calls validateSpellSelection during validation', async () => {
      setSpellLimits();
      spellLimits.validateSpellSelection.mockResolvedValueOnce({ valid: true, violations: [] });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(spellLimits.validateSpellSelection).toHaveBeenCalled();
      });
    });

    it('shows validation error message when spell limit exceeded', async () => {
      setSpellLimits();
      spellLimits.validateSpellSelection.mockResolvedValueOnce({ valid: false, violations: ['Too many level 1 spells'] });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(spellLimits.validateSpellSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Spell validation warnings useEffect', () => {
    it('does not call getSpellValidationInfo when formData.spells is empty', async () => {
      spellValidation.getSpellValidationInfo.mockResolvedValueOnce({ warnings: [] });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(spellValidation.getSpellValidationInfo).not.toHaveBeenCalled();
      });
    });

    it('passes formData, spells, allSpells, version, and preSelected to getSpellValidationInfo', async () => {
      setSpellLimits();
      spellValidation.getSpellValidationInfo.mockResolvedValueOnce({ warnings: [] });
      render(<WizardStepSpells {...mockProps} preSelectedSpells={['Fireball']} />);
      await waitFor(() => {
        expect(spellValidation.getSpellValidationInfo).toHaveBeenCalledWith(
          expect.objectContaining({ rules: '5e' }),
          ['Fireball'],
          expect.any(Array),
          '5e',
          ['Fireball']
        );
      });
    });
  });

  describe('Spell counts useEffect', () => {
    it('counts spells correctly when allSpells is provided', async () => {
      setSpellLimits();
      const allSpells = [
        { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: [], classes: ['Wizard'] },
        { name: 'Magic Missile', index: 'magic_missile', level: 0, school: 'Evocation', description: [], classes: ['Wizard'] },
      ];
      render(<WizardStepSpells {...mockProps} allSpells={allSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });

    it('handles spell not found in allSpells gracefully', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} allSpells={[]} formData={{ ...mockProps.formData, spells: ['UnknownSpell'] }} />);
      await waitFor(() => {
        expect(screen.getByTestId('selectable-list')).toBeInTheDocument();
      });
    });
  });

  describe('getLevelClass', () => {
    it('applies cantrip class to level 0 spells', async () => {
      setSpellLimits();
      const cantripSpell = { name: 'Fire Bolt', index: 'fire_bolt', level: 0, school: 'Evocation', description: [], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[cantripSpell]} formData={{ ...mockProps.formData, spells: ['Fire Bolt'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('cantrip');
      });
    });

    it('applies low class to levels 1-3', async () => {
      setSpellLimits();
      const lowSpell = { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: [], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[lowSpell]} formData={{ ...mockProps.formData, spells: ['Fireball'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('low');
      });
    });

    it('applies mid class to levels 4-5', async () => {
      setSpellLimits();
      const midSpell = { name: 'Dominate Person', index: 'dominate_person', level: 5, school: 'Enchantment', description: [], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[midSpell]} formData={{ ...mockProps.formData, spells: ['Dominate Person'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('mid');
      });
    });

    it('applies high class to levels 6+', async () => {
      setSpellLimits();
      const highSpell = { name: 'Power Word Kill', index: 'power_word_kill', level: 9, school: 'Enchantment', description: [], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[highSpell]} formData={{ ...mockProps.formData, spells: ['Power Word Kill'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('high');
      });
    });
  });
});
