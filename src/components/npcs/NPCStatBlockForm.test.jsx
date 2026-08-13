import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NPCStatBlockForm from './NPCStatBlockForm';

function createFormData(overrides = {}) {
  return {
    name: 'Goblin',
    race: 'Humanoid',
    classRole: 'Scout',
    armorClass: 15,
    hitPoints: '45',
    hitDice: '6d8',
    speed: { walk: '30 ft.' },
    initiativeBonus: '+2',
    abilityScores: { str: 10, dex: 14, con: 12, int: 8, wis: 10, cha: 7 },
    savingThrowBonuses: { str: '+2', dex: '+4' },
    skillBonuses: { perception: '+3', stealth: '+5' },
    damageResistances: ['fire'],
    damageImmunities: [],
    conditionImmunities: ['charmed'],
    actions: [
      { name: 'Longsword', attack_bonus: '+5', damage_dice_primary: '1d8+3', damage_type_primary: 'slashing', damage_dice_secondary: '', damage_type_secondary: '', description: 'Melee Weapon Attack.' },
    ],
    traits: 'Darkvision.',
    reactions: 'Reaction text.',
    ...overrides,
  };
}

const SECTION_HEADINGS = [
  'Combat Stats',
  'Ability Scores',
  'Skill Bonuses',
  'Defenses',
  'Actions',
  'Traits',
  'Reactions',
];

const ABILITY_ABBRS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

describe('NPCStatBlockForm rendering', () => {
  describe('section headings', () => {
    it('renders all section headings', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      SECTION_HEADINGS.forEach((heading) => {
        expect(screen.getByText(heading)).toBeInTheDocument();
      });
    });
  });

  describe('ability scores', () => {
    it('renders all ability score labels', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      ABILITY_ABBRS.forEach((abbr) => {
        expect(screen.getByText(abbr)).toBeInTheDocument();
      });
    });

    it('displays calculated ability modifiers based on scores', () => {
      const data = createFormData({
        abilityScores: { str: 16, dex: 8, con: 10, int: 10, wis: 10, cha: 10 },
      });
      render(<NPCStatBlockForm formData={data} setFormData={vi.fn()} />);
      // Modifier = Math.floor((score - 10) / 2): str=16 -> +3, dex=8 -> -1, con/int/wis/cha=10 -> +0
      expect(screen.getByText('+3')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getAllByText('+0').length).toBe(4);
    });

    it('uses default score of 10 when abilityScores is missing', () => {
      render(<NPCStatBlockForm formData={createFormData({ abilityScores: undefined })} setFormData={vi.fn()} />);
      // All abilities default to 10, so all modifiers are +0
      const zeroModElements = screen.getAllByText('+0');
      expect(zeroModElements.length).toBeGreaterThan(0);
    });

    it('renders saving throw bonus inputs for each ability', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      const saveInputs = screen.getAllByTitle('Saving throw bonus');
      expect(saveInputs).toHaveLength(6);
    });

    it('displays existing saving throw bonus values', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('+2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+4')).toBeInTheDocument();
    });
  });

  describe('skill bonuses', () => {
    it('displays existing skill names', () => {
      const { container } = render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      const skillNameInputs = container.querySelectorAll('.npcs-skill-name');
      const values = Array.from(skillNameInputs).map((input) => input.value);
      expect(values).toContain('perception');
      expect(values).toContain('stealth');
    });

    it('renders remove buttons for each existing skill', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      const removeButtons = screen.getAllByRole('button', { name: /Remove skill/i });
      expect(removeButtons).toHaveLength(2);
    });

    it('does not render remove buttons when no skills exist', () => {
      render(<NPCStatBlockForm formData={createFormData({ skillBonuses: {} })} setFormData={vi.fn()} />);
      const removeButtons = screen.queryAllByRole('button', { name: /Remove skill/i });
      expect(removeButtons).toHaveLength(0);
    });

    it('does not render remove buttons when skillBonuses is undefined', () => {
      render(<NPCStatBlockForm formData={createFormData({ skillBonuses: undefined })} setFormData={vi.fn()} />);
      const removeButtons = screen.queryAllByRole('button', { name: /Remove skill/i });
      expect(removeButtons).toHaveLength(0);
    });

    it('renders Add Skill button', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Add Skill/i })).toBeInTheDocument();
    });
  });

  describe('defenses', () => {
    it('displays damage resistance values', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('fire')).toBeInTheDocument();
    });

    it('displays condition immunity values', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('charmed')).toBeInTheDocument();
    });

    it('shows empty inputs when all defense arrays are empty', () => {
      render(<NPCStatBlockForm formData={createFormData({
        damageResistances: [],
        damageImmunities: [],
        conditionImmunities: [],
      })} setFormData={vi.fn()} />);
      expect(screen.queryByDisplayValue('fire')).toBeNull();
      expect(screen.queryByDisplayValue('charmed')).toBeNull();
    });

    it('shows empty inputs when defense arrays are undefined', () => {
      render(<NPCStatBlockForm formData={createFormData({
        damageResistances: undefined,
        damageImmunities: undefined,
        conditionImmunities: undefined,
      })} setFormData={vi.fn()} />);
      expect(screen.queryByDisplayValue('fire')).toBeNull();
      expect(screen.queryByDisplayValue('charmed')).toBeNull();
    });
  });

  describe('actions', () => {
    it('displays existing action data', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('Longsword')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1d8+3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('slashing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Melee Weapon Attack.')).toBeInTheDocument();
    });

    it('renders remove button for each existing action', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      const removeButtons = screen.getAllByRole('button', { name: /Remove action/i });
      expect(removeButtons).toHaveLength(1);
    });

    it('does not render remove buttons when no actions exist', () => {
      render(<NPCStatBlockForm formData={createFormData({ actions: [] })} setFormData={vi.fn()} />);
      const removeButtons = screen.queryAllByRole('button', { name: /Remove action/i });
      expect(removeButtons).toHaveLength(0);
    });

    it('does not render remove buttons when actions is undefined', () => {
      render(<NPCStatBlockForm formData={createFormData({ actions: undefined })} setFormData={vi.fn()} />);
      const removeButtons = screen.queryAllByRole('button', { name: /Remove action/i });
      expect(removeButtons).toHaveLength(0);
    });

    it('renders Add Action button', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Add Action/i })).toBeInTheDocument();
    });
  });

  describe('traits and reactions', () => {
    it('renders textareas for traits and reactions', () => {
      const { container } = render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThanOrEqual(2);
    });

    it('displays traits and reactions values', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('Darkvision.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Reaction text.')).toBeInTheDocument();
    });

    it('renders empty textareas when traits/reactions are empty', () => {
      render(<NPCStatBlockForm formData={createFormData({ traits: '', reactions: '' })} setFormData={vi.fn()} />);
      const textareas = screen.queryAllByPlaceholderText(/Special traits|Reactions/);
      expect(textareas).toHaveLength(2);
    });

    it('renders empty textareas when traits/reactions are undefined', () => {
      render(<NPCStatBlockForm formData={createFormData({ traits: undefined, reactions: undefined })} setFormData={vi.fn()} />);
      const textareas = screen.queryAllByPlaceholderText(/Special traits|Reactions/);
      expect(textareas).toHaveLength(2);
    });
  });

  describe('combat stats fields', () => {
    it('renders AC, HP, Hit Dice, Speed, and Initiative inputs', () => {
      render(<NPCStatBlockForm formData={createFormData()} setFormData={vi.fn()} />);
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6d8')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30 ft.')).toBeInTheDocument();
    });

    it('renders inputs with empty combat stats', () => {
      render(<NPCStatBlockForm formData={createFormData({
        armorClass: null,
        hitPoints: '',
        hitDice: '',
        initiativeBonus: '',
      })} setFormData={vi.fn()} />);
      expect(screen.queryByDisplayValue('45')).toBeNull();
      expect(screen.queryByDisplayValue('6d8')).toBeNull();
    });
  });

  describe('minimal/empty form data', () => {
    it('renders without crashing with minimal formData', () => {
      const minimalData = {
        armorClass: 10,
        hitPoints: '',
        hitDice: '',
        speed: { walk: '30 ft.' },
        initiativeBonus: '',
        abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrowBonuses: {},
        skillBonuses: {},
        damageResistances: [],
        damageImmunities: [],
        conditionImmunities: [],
        actions: [],
        traits: '',
        reactions: '',
      };
      render(<NPCStatBlockForm formData={minimalData} setFormData={vi.fn()} />);
      expect(screen.getByText('Combat Stats')).toBeInTheDocument();
    });

    it('renders without crashing with empty object', () => {
      render(<NPCStatBlockForm formData={{}} setFormData={vi.fn()} />);
      expect(screen.getByText('Combat Stats')).toBeInTheDocument();
    });
  });
});
