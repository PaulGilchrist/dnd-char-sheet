// @cleaned-by-ai
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NPCStatBlockForm from './NPCStatBlockForm';
import { ABILITY_LABELS } from '../../services/npcs/npcFormUtils.js';

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

function renderForm(formData = createFormData()) {
  return render(<NPCStatBlockForm formData={formData} setFormData={vi.fn()} />);
}

function abilityGrid(container) {
  return within(container.querySelector('.npcs-abilities-grid'));
}

function abilityScoreInputs(container) {
  return abilityGrid(container).getAllByRole('spinbutton');
}

function initiativeInput() {
  return screen.getAllByPlaceholderText('+0').find((input) => input.type === 'number');
}

describe('NPCStatBlockForm rendering', () => {
  describe('section headings', () => {
    it('renders all section headings', () => {
      renderForm();
      SECTION_HEADINGS.forEach((heading) => {
        expect(screen.getByText(heading)).toBeInTheDocument();
      });
    });
  });

  describe('ability scores', () => {
    it('renders a label for every ability', () => {
      renderForm();
      Object.values(ABILITY_LABELS).forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('displays calculated ability modifiers from the scores', () => {
      renderForm(createFormData({
        abilityScores: { str: 16, dex: 8, con: 10, int: 10, wis: 10, cha: 10 },
      }));
      expect(screen.getByText('+3')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getAllByText('+0')).toHaveLength(4);
    });

    it('defaults every ability score to 10 when abilityScores is missing', () => {
      const { container } = renderForm(createFormData({ abilityScores: undefined }));
      expect(abilityScoreInputs(container).map((input) => input.value)).toEqual(['10', '10', '10', '10', '10', '10']);
      expect(screen.getAllByText('+0')).toHaveLength(6);
    });

    it('defaults only the missing abilities to 10', () => {
      const { container } = renderForm(createFormData({ abilityScores: { str: 16 } }));
      expect(abilityScoreInputs(container).map((input) => input.value)).toEqual(['16', '10', '10', '10', '10', '10']);
      expect(screen.getAllByText('+0')).toHaveLength(5);
    });

    it('renders a saving throw bonus input for every ability', () => {
      renderForm();
      expect(screen.getAllByTitle('Saving throw bonus')).toHaveLength(6);
    });

    it('maps existing saving throw bonuses to the correct ability', () => {
      const { container } = renderForm();
      const saveInputs = abilityGrid(container).getAllByTitle('Saving throw bonus');
      expect(saveInputs.map((input) => input.value)).toEqual(['+2', '+4', '', '', '', '']);
    });
  });

  describe('skill bonuses', () => {
    it('displays each existing skill name', () => {
      renderForm();
      const skillNameInputs = screen.getAllByPlaceholderText('Skill name');
      expect(skillNameInputs.map((input) => input.value)).toEqual(['perception', 'stealth']);
    });

    it('renders a remove button for every existing skill', () => {
      renderForm();
      expect(screen.getAllByRole('button', { name: /Remove skill/i })).toHaveLength(2);
    });

    it.each([
      { label: 'an empty skill map', overrides: { skillBonuses: {} } },
      { label: 'no skillBonuses', overrides: { skillBonuses: undefined } },
    ])('renders no skill remove buttons when $label is provided', ({ overrides }) => {
      renderForm(createFormData(overrides));
      expect(screen.queryAllByRole('button', { name: /Remove skill/i })).toHaveLength(0);
    });

    it('renders the Add Skill button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /Add Skill/i })).toBeInTheDocument();
    });
  });

  describe('defenses', () => {
    it('displays damage resistance values', () => {
      renderForm();
      expect(screen.getByDisplayValue('fire')).toBeInTheDocument();
    });

    it('displays condition immunity values', () => {
      renderForm();
      expect(screen.getByDisplayValue('charmed')).toBeInTheDocument();
    });

    it.each([
      { label: 'empty arrays', overrides: { damageResistances: [], damageImmunities: [], conditionImmunities: [] } },
      { label: 'missing arrays', overrides: { damageResistances: undefined, damageImmunities: undefined, conditionImmunities: undefined } },
    ])('renders empty defense inputs when $label are provided', ({ overrides }) => {
      renderForm(createFormData(overrides));
      expect(screen.getByPlaceholderText('fire, cold, poison')).toHaveValue('');
      expect(screen.getByPlaceholderText('necrotic, psychic')).toHaveValue('');
      expect(screen.getByPlaceholderText('charmed, frightened')).toHaveValue('');
      expect(screen.queryByDisplayValue('fire')).toBeNull();
      expect(screen.queryByDisplayValue('charmed')).toBeNull();
    });
  });

  describe('actions', () => {
    it('displays existing action data', () => {
      renderForm();
      expect(screen.getByDisplayValue('Longsword')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1d8+3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('slashing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Melee Weapon Attack.')).toBeInTheDocument();
    });

    it('renders a remove button for every existing action', () => {
      renderForm();
      expect(screen.getAllByRole('button', { name: /Remove action/i })).toHaveLength(1);
    });

    it.each([
      { label: 'an empty list', overrides: { actions: [] } },
      { label: 'no actions', overrides: { actions: undefined } },
    ])('renders no action remove buttons when $label is provided', ({ overrides }) => {
      renderForm(createFormData(overrides));
      expect(screen.queryAllByRole('button', { name: /Remove action/i })).toHaveLength(0);
    });

    it('renders an action missing every field without crashing', () => {
      renderForm(createFormData({ actions: [{}] }));
      expect(screen.getByPlaceholderText('Action name')).toHaveValue('');
      expect(screen.getByPlaceholderText('Atk bonus')).toHaveValue('');
      expect(screen.getByPlaceholderText('Primary Damage Dice')).toHaveValue('');
      expect(screen.getByPlaceholderText('Primary Type')).toHaveValue('');
      expect(screen.getByPlaceholderText('Description')).toHaveValue('');
    });

    it('renders the Add Action button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /Add Action/i })).toBeInTheDocument();
    });
  });

  describe('traits and reactions', () => {
    it('renders traits and reactions textareas with their values', () => {
      renderForm();
      expect(screen.getByPlaceholderText('Special traits (one per line or markdown)')).toHaveValue('Darkvision.');
      expect(screen.getByPlaceholderText('Reactions (one per line or markdown)')).toHaveValue('Reaction text.');
    });

    it.each([
      { label: 'empty strings', overrides: { traits: '', reactions: '' } },
      { label: 'undefined', overrides: { traits: undefined, reactions: undefined } },
    ])('renders empty traits and reactions textareas when $label', ({ overrides }) => {
      renderForm(createFormData(overrides));
      expect(screen.getByPlaceholderText('Special traits (one per line or markdown)')).toHaveValue('');
      expect(screen.getByPlaceholderText('Reactions (one per line or markdown)')).toHaveValue('');
    });
  });

  describe('combat stats fields', () => {
    it('renders AC, HP, Hit Dice, Speed, and Initiative inputs with their values', () => {
      renderForm();
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6d8')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30 ft.')).toBeInTheDocument();
      expect(initiativeInput()).toBeInTheDocument();
    });

    it('renders empty combat stat inputs when values are missing', () => {
      renderForm(createFormData({
        armorClass: null,
        hitPoints: '',
        hitDice: '',
        speed: undefined,
        initiativeBonus: '',
      }));
      expect(screen.getByPlaceholderText('10')).toHaveValue(null);
      expect(screen.getByPlaceholderText('e.g., 45')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., 6d8')).toHaveValue('');
      expect(screen.getByPlaceholderText('30 ft.')).toHaveValue('');
      expect(initiativeInput()).toHaveValue(null);
    });
  });

  describe('minimal/empty form data', () => {
    it('renders without crashing with an empty object', () => {
      renderForm({});
      expect(screen.getByText('Combat Stats')).toBeInTheDocument();
    });
  });
});
