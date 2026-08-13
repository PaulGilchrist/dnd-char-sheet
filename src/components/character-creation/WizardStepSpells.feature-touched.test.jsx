// @improved-by-ai
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepSpells from './WizardStepSpells.jsx';
import * as spellLimits from '../../services/rules/spells/spellLimits.js';

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

// Shared helper: set a default mock and override only when needed
const setSpellLimits = (overrides = {}) => {
  spellLimits.getSpellLimits.mockResolvedValueOnce({ ...defaultSpellLimits, ...overrides });
};

describe('WizardStepSpells feat integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Warlock Mystic Arcanum', () => {
    it('renders Mystic Arcanum section for Warlock at level 17', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
    });

    it('renders all four qualifying arcanum levels for level 17 warlock', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('6th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('7th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('8th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('9th Level Arcanum:')).toBeInTheDocument();
      });
    });

    it('renders only 6th and 7th arcanum levels for level 13 warlock', async () => {
      const level13Props = { ...warlockProps, formData: { ...warlockProps.formData, level: 13 } };
      setSpellLimits();
      render(<WizardStepSpells {...level13Props} />);
      await waitFor(() => {
        expect(screen.getByText('6th Level Arcanum:')).toBeInTheDocument();
        expect(screen.getByText('7th Level Arcanum:')).toBeInTheDocument();
        expect(screen.queryByText('8th Level Arcanum:')).not.toBeInTheDocument();
        expect(screen.queryByText('9th Level Arcanum:')).not.toBeInTheDocument();
      });
    });

    it('renders only 6th arcanum level for level 11 warlock', async () => {
      const level11Props = { ...warlockProps, formData: { ...warlockProps.formData, level: 11 } };
      setSpellLimits();
      render(<WizardStepSpells {...level11Props} />);
      await waitFor(() => {
        expect(screen.getByText('6th Level Arcanum:')).toBeInTheDocument();
        expect(screen.queryByText('7th Level Arcanum:')).not.toBeInTheDocument();
      });
    });

    it('does not render arcanum section for level 10 warlock', async () => {
      const level10Props = { ...warlockProps, formData: { ...warlockProps.formData, level: 10 } };
      setSpellLimits();
      render(<WizardStepSpells {...level10Props} />);
      await waitFor(() => {
        expect(screen.queryByText('Mystic Arcanum')).not.toBeInTheDocument();
      });
    });

    it('does not render arcanum section for non-Warlock', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} />);
      await waitFor(() => {
        expect(screen.queryByText('Mystic Arcanum')).not.toBeInTheDocument();
      });
    });

    it('shows selected state for already-selected arcanum spell', async () => {
      setSpellLimits();
      const { container } = render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Hold Monster'] } }} />);
      await waitFor(() => {
        const checkEl = container.querySelector('.arcanum-slot-count.selected');
        expect(checkEl).toBeInTheDocument();
        expect(checkEl).toHaveTextContent('1/1');
      });
    });

    it('filters arcanum spells to only warlock spells at the correct level', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        const level6Options = document.querySelectorAll('.arcanum-option');
        level6Options.forEach(option => {
          expect(option.textContent).not.toContain('Fireball');
          expect(option.textContent).not.toContain('Magic Missile');
        });
      });
    });

    it('calls onArrayFieldChange when selecting an arcanum spell', async () => {
      setSpellLimits();
      const { container } = render(<WizardStepSpells {...warlockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
      const arcanumSection = container.querySelector('.arcanum-selection-section');
      const earthquakeRow = Array.from(arcanumSection.querySelectorAll('.arcanum-option-row'))
        .find(row => row.textContent.includes('Earthquake'));
      fireEvent.click(earthquakeRow);
      await waitFor(() => {
        expect(mockProps.onArrayFieldChange).toHaveBeenCalledWith('class.arcanums', expect.arrayContaining(['Earthquake']));
      });
    });

    it('removes arcanum spell when clicking already-selected option', async () => {
      setSpellLimits();
      const { container } = render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Hold Monster'] } }} />);
      await waitFor(() => {
        const checkEl = container.querySelector('.arcanum-slot-count.selected');
        expect(checkEl).toBeInTheDocument();
      });
      const arcanumSection = container.querySelector('.arcanum-selection-section');
      const holdMonsterRow = Array.from(arcanumSection.querySelectorAll('.arcanum-option-row'))
        .find(row => row.textContent.includes('Hold Monster'));
      fireEvent.click(holdMonsterRow);
      await waitFor(() => {
        expect(mockProps.onArrayFieldChange).toHaveBeenCalledWith('class.arcanums', expect.not.arrayContaining(['Hold Monster']));
      });
    });

    it('shows arcanum spell details when info icon is clicked', async () => {
      setSpellLimits();
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
      setSpellLimits();
      render(<WizardStepSpells {...warlockProps} allSpells={noSpellsForLevel} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
      });
      const noSpans = document.querySelectorAll('.no-arcanum-spells');
      expect(noSpans.length).toBeGreaterThan(0);
    });

    it('excludes pre-selected arcanum spells from user spell counts', async () => {
      setSpellLimits({ cantrip: 2 });
      const { container } = render(<WizardStepSpells {...warlockProps} formData={{ ...warlockProps.formData, class: { name: 'Warlock', subclass: { name: 'Hexblade' }, arcanums: ['Astral Projection'] }, spells: ['Astral Projection'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Mystic Arcanum')).toBeInTheDocument();
        const countEl = container.querySelector('.level-count');
        if (countEl) {
          expect(countEl.textContent).not.toContain('1/2');
        }
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
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('shows Magic Initiate edit button when feat is an object', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Magic Initiate', index: 'magic-initiate' }], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('does not show Magic Initiate edit button when modal is open', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
        expect(screen.queryByText('Edit Magic Initiate')).not.toBeInTheDocument();
      });
    });

    it('excludes Magic Initiate spells from user spell counts', async () => {
      setSpellLimits({ cantrip: 0, level1: 0 });
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
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('shows Fey Magic edit button when feat is an object', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Fey Touched', index: 'fey-touched' }], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('does not show Fey Magic edit button when modal is open', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Fey Magic')).toBeInTheDocument();
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Fey Magic edit button when spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Fey Touched spell from user spell counts', async () => {
      setSpellLimits({ cantrip: 1 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Misty Step'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });

    it('does not show Fey Magic edit button when feat is not present', async () => {
      setSpellLimits();
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
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('shows Shadow Magic edit button when feat is an object', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Shadow Touched', index: 'shadow-touched' }], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('does not show Shadow Magic edit button when modal is open', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Shadow Magic edit button when spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Shadow Touched spell from user spell counts', async () => {
      setSpellLimits({ cantrip: 1 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Invisibility'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
      });
    });

    it('does not show Shadow Magic edit button when feat is not present', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });
  });

  describe('Spell counts with feat spells', () => {
    it('excludes all feat spell types from counts together', async () => {
      setSpellLimits({ cantrip: 2 });
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

  describe('Magic Initiate modal trigger', () => {
    it('shows Magic Initiate modal when feat is added and instances do not match', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate', 'Magic Initiate'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Magic Initiate')).toBeInTheDocument();
      });
    });

    it('does not show Magic Initiate modal when instances match feat count', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Cantrip1'], level1Spell: 'Spell1' }] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Magic Initiate')).not.toBeInTheDocument();
      });
    });
  });

  describe('Fey Touched modal trigger', () => {
    it('shows Fey Touched modal when feat is present and spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Fey Magic')).toBeInTheDocument();
      });
    });

    it('does not show Fey Touched modal when spell is already set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Fey Touched modal when feat is not present', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Fey Magic')).not.toBeInTheDocument();
      });
    });
  });

  describe('Shadow Touched modal trigger', () => {
    it('shows Shadow Touched modal when feat is present and spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} />);
      await waitFor(() => {
        expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
      });
    });

    it('does not show Shadow Touched modal when spell is already set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('does not show Shadow Touched modal when feat is not present', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} />);
      await waitFor(() => {
        expect(screen.queryByText('Shadow Magic')).not.toBeInTheDocument();
      });
    });
  });
});
