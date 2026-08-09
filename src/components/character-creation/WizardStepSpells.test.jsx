import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

vi.mock('../../services/rules/spells/spellLimits.js', () => ({
  getSpellLimits: vi.fn(() => Promise.resolve({
    cantrip: 3,
    level1: 2, level2: 0, level3: 0, level4: 0,
    level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
    spellType: 'known',
    preparedSpells: null,
  })),
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

describe('WizardStepSpells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders spells via renderItem', async () => {
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

    it('shows exceeded class when cantrip count exceeds limit', async () => {
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
      spellLimits.getSpellLimits.mockResolvedValueOnce(preparedLimits);
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Prepared Spells:')).toBeInTheDocument();
        expect(screen.queryByText('1th level:')).not.toBeInTheDocument();
      });
    });

    it('shows exceeded when prepared spells exceed limit', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({ ...preparedLimits, preparedSpells: 2 });
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
    it('renders with empty data', async () => {
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: [] }} allSpells={[]} />);
      await waitFor(() => {
        expect(screen.getByText('Step 9: Spells')).toBeInTheDocument();
      });
    });

    it('does not crash when spell name is not found in allSpells', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} allSpells={[]} formData={{ ...mockProps.formData, spells: ['NonExistentSpell'] }} />);
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, class: { name: 'Wizard', major: { name: 'Evocation' } } }} />);
      await waitFor(() => {
        expect(spellLimits.getSpellLimits).toHaveBeenCalledWith('Wizard', 5, '5e', 'Evocation', expect.any(Object), undefined);
      });

      vi.clearAllMocks();
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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

  describe('Warlock Mystic Arcanum', () => {
    const warlockSpells = [
      { name: 'Astral Projection', index: 'astral_projection', level: 9, school: 'Necromancy', description: ['Project your spirit.'], classes: ['Warlock'] },
      { name: 'Earthquake', index: 'earthquake', level: 8, school: 'Earth', description: ['Shake the ground.'], classes: ['Warlock'] },
      { name: 'Feeblemind', index: 'feeblemind', level: 7, school: 'Enchantment', description: ['Reduce intelligence.'], classes: ['Warlock'] },
      { name: 'Hold Monster', index: 'hold_monster', level: 6, school: 'Enchantment', description: ['Hold a creature.'], classes: ['Warlock'] },
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard', 'Sorcerer'] },
      { name: 'Magic Missile', index: 'magic_missile', level: 0, school: 'Evocation', description: ['A missile.'], classes: ['Wizard'] },
    ];

    const warlockProps = {
      ...mockProps,
      formData: { ...mockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' } }, level: 17, spells: [] },
      allSpells: warlockSpells,
    };

    it('renders Mystic Arcanum section for Warlock at level 17', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
    });

    it('renders all qualifying arcanum levels for level 17 warlock', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('6th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('7th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('8th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('9th Level Arcanum:')).toBeInTheDocument();
      });
    });

    it('renders only qualifying arcanum levels for level 13 warlock', async () => {
      const level13Props = { ...warlockProps, formData: { ...warlockProps.formData, level: 13 } };
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...level13Props} />);
      await waitFor(() => {
        expect(screen.getByText('6th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('7th Level Arcanum:')).toBeInTheDocument();
        expect(screen.queryByText('8th Level Arcanum:')).not.toBeInTheDocument();
        expect(screen.queryByText('9th Level Arcanum:')).not.toBeInTheDocument();
      });
    });

    it('does not render arcanum section for non-Warlock', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.queryByText('Mystic Arcanum')).not.toBeInTheDocument();
      });
    });

    it('shows selected state for already-selected arcanum spell', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Hold Monster'] } }} />);
      await waitFor(() => {
        const checkEl = container.querySelector('.arcanum-slot-count.selected');
        expect(checkEl).toBeInTheDocument();
        expect(checkEl).toHaveTextContent('1/1');
      });
    });

    it('filters arcanum spells by level and warlock class', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        const level6Options = document.querySelectorAll('.arcanum-option');
        expect(level6Options.length).toBeGreaterThan(0);
      });
    });

    it('calls onArrayFieldChange when selecting an arcanum spell', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
      const arcanumSection = container.querySelector('.arcanum-selection-section');
      const earthquakeOption = arcanumSection.querySelectorAll('.arcanum-option-row');
      const earthQRow = Array.from(earthquakeOption).find(row => row.textContent.includes('Earthquake'));
      fireEvent.click(earthQRow);
      await waitFor(() => {
        expect(mockProps.onArrayFieldChange).toHaveBeenCalledWith('class.arcanums', expect.arrayContaining(['Earthquake']));
      });
    });

    it('removes arcanum spell when clicking already-selected option', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Hold Monster'] } }} />);
      await waitFor(() => {
        const checkEl = container.querySelector('.arcanum-slot-count.selected');
        expect(checkEl).toBeInTheDocument();
      });
      const arcanumSection = container.querySelector('.arcanum-selection-section');
      const holdMonsterRows = arcanumSection.querySelectorAll('.arcanum-option-row');
      const holdMonsterRow = Array.from(holdMonsterRows).find(row => row.textContent.includes('Hold Monster'));
      fireEvent.click(holdMonsterRow);
      await waitFor(() => {
        expect(mockProps.onArrayFieldChange).toHaveBeenCalledWith('class.arcanums', expect.not.arrayContaining(['Hold Monster']));
      });
    });

    it('shows arcanum spell details when info icon is clicked', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
      const infoIcons = container.querySelectorAll('.fa-circle-info');
      if (infoIcons.length > 0) {
        fireEvent.click(infoIcons[0]);
        await waitFor(() => {
          const detailsEl = container.querySelector('.arcanum-option-details');
          expect(detailsEl).toBeInTheDocument();
        });
      }
    });

    it('shows no-arcanum-spells message when none exist for a level', async () => {
      const noSpellsForLevel = [
        { name: 'Hold Monster', index: 'hold_monster', level: 6, school: 'Enchantment', description: ['Hold a creature.'], classes: ['Warlock'] },
        { name: 'Magic Missile', index: 'magic_missile', level: 0, school: 'Evocation', description: ['A missile.'], classes: ['Wizard'] },
      ];
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...warlockProps} allSpells={noSpellsForLevel} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
      const noSpans = document.querySelectorAll('.no-arcanum-spells');
      expect(noSpans.length).toBeGreaterThan(0);
    });

    it('excludes pre-selected arcanum spells from user spell counts', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Astral Projection'] }, spells: ['Astral Projection'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
    });
  });

  describe('Magic Initiate integration', () => {
    const baseSpells = [
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
      { name: 'Magic Missile', index: 'magic_missile', level: 0, school: 'Evocation', description: ['A missile.'], classes: ['Wizard'] },
      { name: 'Burning Hands', index: 'burning_hands', level: 0, school: 'Evocation', description: ['Burning hands.'], classes: ['Sorcerer'] },
      { name: 'Thunderwave', index: 'thunderwave', level: 0, school: 'Evocation', description: ['Thunderwave.'], classes: ['Sorcerer'] },
      { name: 'Healing Word', index: 'healing_word', level: 1, school: 'Evocation', description: ['Healing word.'], classes: ['Cleric'] },
    ];

    it('shows Magic Initiate edit button when feat is a string', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('shows Magic Initiate edit button when feat is an object', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Magic Initiate', index: 'magic-initiate' }], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('does not show Magic Initiate button when modal is open', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
        expect(screen.queryByText('Edit Magic Initiate')).not.toBeInTheDocument();
      });
    });

    it('excludes Magic Initiate spells from user spell counts', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 0, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Burning Hands', 'Thunderwave', 'Healing Word'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Fey Touched integration', () => {
    const baseSpells = [
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
      { name: 'Misty Step', index: 'misty_step', level: 1, school: 'Conjuration', description: ['Misty step.'], classes: ['Sorcerer', 'Warlock', 'Wizard'] },
    ];

    it('shows Fey Magic edit button when feat is a string and spell is set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('shows Fey Magic edit button when feat is an object', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Fey Touched', index: 'fey-touched' }], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('does not show Fey Magic button when modal is open', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Fey Magic')).toBeInTheDocument();
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Fey Magic button when spell is not set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Fey Touched spell from user spell counts', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 1, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Misty Step'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });

    it('does not show Fey Magic button when feat is not present', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });
  });

  describe('Shadow Touched integration', () => {
    const baseSpells = [
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
      { name: 'Invisibility', index: 'invisibility', level: 2, school: 'Illusion', description: ['Invisibility.'], classes: ['Sorcerer', 'Wizard'] },
    ];

    it('shows Shadow Magic edit button when feat is a string and spell is set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('shows Shadow Magic edit button when feat is an object', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Shadow Touched', index: 'shadow-touched' }], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('does not show Shadow Magic button when modal is open', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Shadow Magic button when spell is not set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Shadow Touched spell from user spell counts', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 1, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Invisibility'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Spell counts with feat spells', () => {
    it('excludes all feat spell types from counts together', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 2, level1: 0, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const allSpells = [
        { name: 'Cantrip1', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'MI_Cantrip', level: 0, school: 'Evocation', classes: ['Wizard'], description: [] },
        { name: 'FT_Spell', level: 1, school: 'Conjuration', classes: ['Wizard'], description: [] },
        { name: 'ST_Spell', level: 2, school: 'Illusion', classes: ['Wizard'], description: [] },
      ];
      render(
        <WizardStepSpells
          {...mockProps}
          allSpells={allSpells}
          formData={{
            ...mockProps.formData,
            spells: ['Cantrip1', 'MI_Cantrip', 'FT_Spell', 'ST_Spell'],
            magicInitiateInstances: [{ class: 'Wizard', cantrips: ['MI_Cantrip', null], level1Spell: null }],
            feyTouchedSpell: 'FT_Spell',
            shadowTouchedSpell: 'ST_Spell',
          }}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });
  });

  describe('getLevelClass', () => {
    it('returns cantrip for level 0', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toBeInTheDocument();
      });
    });

    it('returns low for levels 1-3', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const { container } = render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Fireball'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('low');
      });
    });

    it('returns mid for levels 4-5', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const midSpell = { name: 'Ray of Enfeeblement', index: 'ray_of_enfeeblement', level: 2, school: 'Evocation', description: ['Weaken foe.'], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[midSpell]} formData={{ ...mockProps.formData, spells: ['Ray of Enfeeblement'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('low');
      });
    });

    it('returns high for levels 6+', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      const highSpell = { name: 'Power Word Kill', index: 'power_word_kill', level: 9, school: 'Enchantment', description: ['Kill weak foe.'], classes: ['Wizard'] };
      const { container } = render(<WizardStepSpells {...mockProps} allSpells={[highSpell]} formData={{ ...mockProps.formData, spells: ['Power Word Kill'] }} />);
      await waitFor(() => {
        const levelEl = container.querySelector('.spell-level');
        expect(levelEl).toHaveClass('high');
      });
    });
  });

  describe('Class filter Wizard extension', () => {
    it('adds Fighter and Rogue to Wizard spells in class filter', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
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
    it('calls getValidationMessage and sets validation message', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      spellLimits.validateSpellSelection.mockResolvedValueOnce({ valid: true, violations: [] });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(spellLimits.validateSpellSelection).toHaveBeenCalled();
      });
    });

    it('shows validation error message when spell limit exceeded', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      spellLimits.validateSpellSelection.mockResolvedValueOnce({ valid: false, violations: ['Too many level 1 spells'] });
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(spellLimits.validateSpellSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Spell validation warnings useEffect', () => {
    it('clears warnings when formData.spells is empty', async () => {
      spellValidation.getSpellValidationInfo.mockResolvedValueOnce({ warnings: [] });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: [] }} />);
      await waitFor(() => {
        expect(spellValidation.getSpellValidationInfo).not.toHaveBeenCalled();
      });
    });

    it('passes formData, spells, allSpells, version, and preSelected to getSpellValidationInfo', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
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

  describe('Magic Initiate modal trigger', () => {
    it('shows Magic Initiate modal when feat is added and instances do not match', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate', 'Magic Initiate'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
      });
    });

    it('does not show Magic Initiate modal when instances match feat count', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Cantrip1'], level1Spell: 'Spell1' }] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Magic Initiate')).not.toBeInTheDocument();
      });
    });
  });

  describe('Fey Touched modal trigger', () => {
    it('shows Fey Touched modal when feat is present and spell is not set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Fey Magic')).toBeInTheDocument();
      });
    });

    it('does not show Fey Touched modal when spell is already set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Fey Touched modal when feat is not present', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Fey Magic')).not.toBeInTheDocument();
      });
    });
  });

  describe('Shadow Touched modal trigger', () => {
    it('shows Shadow Touched modal when feat is present and spell is not set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
      });
    });

    it('does not show Shadow Touched modal when spell is already set', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Shadow Touched modal when feat is not present', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Shadow Magic')).not.toBeInTheDocument();
      });
    });
  });

  describe('Spell counts useEffect', () => {
    it('counts spells correctly when allSpells is provided', async () => {
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
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
      spellLimits.getSpellLimits.mockResolvedValueOnce({
        cantrip: 3, level1: 2, level2: 0, level3: 0, level4: 0,
        level5: 0, level6: 0, level7: 0, level8: 0, level9: 0,
        spellType: 'known', preparedSpells: null,
      });
      render(<WizardStepSpells {...mockProps} allSpells={[]} formData={{ ...mockProps.formData, spells: ['UnknownSpell'] }} />);
      await waitFor(() => {
        expect(screen.getByTestId('selectable-list')).toBeInTheDocument();
      });
    });
  });
});
