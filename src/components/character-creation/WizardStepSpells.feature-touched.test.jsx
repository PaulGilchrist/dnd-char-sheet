// @improved-by-ai
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardStepSpells from './WizardStepSpells.jsx';

// Mock modals to prevent full rendering and enable reliable assertions
vi.mock('./MagicInitiateModal.jsx', () => ({
  default: vi.fn(({ onClose }) => (
    <div data-testid="magic-initiate-modal">
      <span>Magic Initiate</span>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

vi.mock('./FeyTouchedModal.jsx', () => ({
  default: vi.fn(({ onClose }) => (
    <div data-testid="fey-touched-modal">
      <span>Fey Magic</span>
      <button onClick={onClose}>Close</button>
    </div>
  )),
  ShadowTouchedModal: vi.fn(({ onClose }) => (
    <div data-testid="shadow-touched-modal">
      <span>Shadow Magic</span>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

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

// Shared mutable state for reliable mock overrides — avoids mockResolvedValueOnce race conditions
let currentSpellLimits = { ...defaultSpellLimits };

vi.mock('../../services/rules/spells/spellLimits.js', () => ({
  getSpellLimits: vi.fn().mockImplementation(async () => currentSpellLimits),
  validateSpellSelection: vi.fn().mockResolvedValue({ valid: true, violations: [] }),
}));

vi.mock('../../services/rules/spells/spellValidation.js', () => ({
  getSpellValidationInfo: vi.fn().mockResolvedValue({ warnings: [] }),
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

// Update shared spell limits before each render
const setSpellLimits = (overrides = {}) => {
  currentSpellLimits = { ...defaultSpellLimits, ...overrides };
};

describe('WizardStepSpells feat integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSpellLimits = { ...defaultSpellLimits };
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

    it('renders edit button when Magic Initiate feat is present as a string with instances configured', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('renders edit button when Magic Initiate feat is present as an object with instances configured', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Magic Initiate', index: 'magic-initiate' }], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Magic Initiate')).toBeInTheDocument();
      });
    });

    it('renders the modal when Magic Initiate feat is added but instances do not match', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByTestId('magic-initiate-modal')).toBeInTheDocument();
      });
    });

    it('does not render the modal when instances match the number of Magic Initiate feats', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Cantrip1'], level1Spell: 'Spell1' }] }} />);
      await waitFor(() => {
        expect(screen.queryByTestId('magic-initiate-modal')).not.toBeInTheDocument();
      });
    });

    it('renders the modal when there are two Magic Initiate feats but only one instance', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate', 'Magic Initiate'] }} />);
      await waitFor(() => {
        expect(screen.getByTestId('magic-initiate-modal')).toBeInTheDocument();
      });
    });

    it('excludes Magic Initiate cantrips and level 1 spells from user spell counts', async () => {
      setSpellLimits({ cantrip: 0, level1: 0 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Burning Hands', 'Thunderwave', 'Healing Word'], magicInitiateInstances: [{ class: 'Wizard', cantrips: ['Burning Hands', 'Thunderwave'], level1Spell: 'Healing Word' }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
        const cantripCount = screen.getByText(/Cantrips:/);
        expect(cantripCount.parentElement.textContent).toBe('Cantrips:0/0');
      });
    });

    it('handles null cantrip slots in Magic Initiate instances', async () => {
      setSpellLimits({ cantrip: 2 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Magic Missile'], magicInitiateInstances: [{ class: 'Wizard', cantrips: [null, 'Burning Hands'], level1Spell: null }] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
        const cantripCount = screen.getByText(/Cantrips:/);
        expect(cantripCount.parentElement.textContent).toBe('Cantrips:1/2');
      });
    });

    it('handles empty Magic Initiate instances array gracefully', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Magic Initiate'], magicInitiateInstances: [] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByTestId('magic-initiate-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Fey Touched integration', () => {
    const baseSpells = [
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
      { name: 'Misty Step', index: 'misty_step', level: 1, school: 'Conjuration', description: ['Misty step.'], classes: ['Sorcerer', 'Warlock', 'Wizard'] },
    ];

    it('renders edit button when Fey Touched feat is present as a string with spell set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('renders edit button when Fey Touched feat is present as an object with spell set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Fey Touched', index: 'fey-touched' }], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Fey Magic')).toBeInTheDocument();
      });
    });

    it('renders the modal when Fey Touched feat is present but spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByTestId('fey-touched-modal')).toBeInTheDocument();
      });
    });

    it('does not render the modal when Fey Touched spell is already set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Fey Touched'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByTestId('fey-touched-modal')).not.toBeInTheDocument();
      });
    });

    it('does not render the modal or edit button when Fey Touched feat is not present', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByTestId('fey-touched-modal')).not.toBeInTheDocument();
        expect(screen.queryByText('Edit Fey Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Fey Touched spell from user spell counts', async () => {
      setSpellLimits({ cantrip: 1, level1: 0 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Misty Step'], feyTouchedSpell: 'Misty Step' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
        const level1Count = screen.getByText(/1th level:/);
        expect(level1Count.parentElement.textContent).toBe('1th level:0/0');
      });
    });
  });

  describe('Shadow Touched integration', () => {
    const baseSpells = [
      { name: 'Fireball', index: 'fireball', level: 3, school: 'Evocation', description: ['A ball of fire.'], classes: ['Wizard'] },
      { name: 'Invisibility', index: 'invisibility', level: 2, school: 'Illusion', description: ['Invisibility.'], classes: ['Sorcerer', 'Wizard'] },
    ];

    it('renders edit button when Shadow Touched feat is present as a string with spell set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('renders edit button when Shadow Touched feat is present as an object with spell set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [{ name: 'Shadow Touched', index: 'shadow-touched' }], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Edit Shadow Magic')).toBeInTheDocument();
      });
    });

    it('renders the modal when Shadow Touched feat is present but spell is not set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByTestId('shadow-touched-modal')).toBeInTheDocument();
      });
    });

    it('does not render the modal when Shadow Touched spell is already set', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: ['Shadow Touched'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByTestId('shadow-touched-modal')).not.toBeInTheDocument();
      });
    });

    it('does not render the modal or edit button when Shadow Touched feat is not present', async () => {
      setSpellLimits();
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, feats: [] }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.queryByTestId('shadow-touched-modal')).not.toBeInTheDocument();
        expect(screen.queryByText('Edit Shadow Magic')).not.toBeInTheDocument();
      });
    });

    it('excludes Shadow Touched spell from user spell counts', async () => {
      setSpellLimits({ cantrip: 1, level2: 0 });
      render(<WizardStepSpells {...mockProps} formData={{ ...mockProps.formData, spells: ['Invisibility'], shadowTouchedSpell: 'Invisibility' }} allSpells={baseSpells} />);
      await waitFor(() => {
        expect(screen.getByText('Spell Selection Summary')).toBeInTheDocument();
        const level2Count = screen.getByText(/2th level:/);
        expect(level2Count.parentElement.textContent).toBe('2th level:0/0');
      });
    });
  });

  describe('Combined feat spell counts', () => {
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
        const cantripCount = screen.getByText(/Cantrips:/);
        expect(cantripCount.parentElement.textContent).toBe('Cantrips:1/2');
      });
    });
  });
});
