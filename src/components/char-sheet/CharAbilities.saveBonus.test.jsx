// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharAbilities from './CharAbilities';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  const mockFn = vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: vi.fn(),
    rollAbilityCheck: vi.fn(),
    rollSavingThrow: vi.fn(),
    rollSkillCheck: vi.fn(),
  }));
  return { default: mockFn };
});

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(() => Promise.resolve([])),
}));

const mockStore = new Map();
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => mockStore),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn((key, prop) => mockStore.get(`${key}:${prop}`) ?? null),
}));

const mockAllAbilityScores = [
  { full_name: 'Strength', description: 'STR desc' },
  { full_name: 'Dexterity', description: 'DEX desc' },
  { full_name: 'Constitution', description: 'CON desc' },
  { full_name: 'Intelligence', description: 'INT desc' },
  { full_name: 'Wisdom', description: 'WIS desc' },
  { full_name: 'Charisma', description: 'CHA desc' },
];

function createPlayerStats(overrides = {}) {
  return {
    name: 'Test Fighter',
    level: 5,
    abilities: [
      { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
      { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
      { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
      { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [{ name: 'Arcana', bonus: 2 }] },
      { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
      { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
    ],
    skillProficiencies: ['Athletics', 'Arcana'],
    automation: { primalKnowledge: [], passives: [] },
    expertise: [],
    ...overrides,
  };
}

const defaultProps = {
  allAbilityScores: mockAllAbilityScores,
  playerStats: createPlayerStats(),
  campaignName: 'test-campaign',
  exhaustionPenalty: 0,
  conditionEffects: {},
  isRaging: false,
  onReroll: vi.fn(),
  onStrokeOfLuck: vi.fn(),
};

function getSaveCell(container, abilityIndex) {
  return container.querySelectorAll('.abilities > div:nth-child(4)')[abilityIndex];
}

function getMocks() {
  return vi.mocked(useLoggedDiceRoll).mock.results[0].value;
}

describe('CharAbilities save bonus rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('save bonus expression with wisdom_modifier', () => {
    it('adds wisdom modifier to all abilities when all are in saveBonusAbilities', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 3, save: 5, totalScore: 16, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      // STR save: 6 + 2 + 3(wis) = +11
      expect(getSaveCell(container, 0).textContent).toBe('+11');
      // WIS save: 5 + 2 + 3(wis) = +10
      expect(getSaveCell(container, 4).textContent).toBe('+10');
    });

    it('only applies wisdom modifier to abilities listed in saveBonusAbilities', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 3, save: 5, totalScore: 16, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['WIS'] }} />
      );
      // STR not in saveBonusAbilities: save = +6
      expect(getSaveCell(container, 0).textContent).toBe('+6');
      // WIS in saveBonusAbilities: 5 + 2 + 3(wis) = +10
      expect(getSaveCell(container, 4).textContent).toBe('+10');
    });

    it('handles negative wisdom modifier in expression', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -2, save: 0, totalScore: 6, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      // STR save: 6 + 2 + (-2) = +6
      expect(getSaveCell(container, 0).textContent).toBe('+6');
      // WIS save: 0 + 2 + (-2) = +0
      expect(getSaveCell(container, 4).textContent).toBe('+0');
    });

    it('handles missing wisdom ability gracefully', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'CHA'] }} />
      );
      // STR save: 6 + 2 + 0(wis missing) = +8
      expect(getSaveCell(container, 0).textContent).toBe('+8');
    });
  });

  describe('save bonus expression with multiple numeric parts', () => {
    it('sums all numeric parts plus wisdom modifier', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + 3 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      // STR save: 6 + 2 + 3 + 2(wis) = +13
      expect(getSaveCell(container, 0).textContent).toBe('+13');
    });

    it('handles expression with only numeric parts and no wisdom modifier', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2 + 3', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      // STR save: 6 + 2 + 3 = +11
      expect(getSaveCell(container, 0).textContent).toBe('+11');
    });

    it('handles expression with only wisdom modifier and no numeric parts', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 5, save: 7, totalScore: 20, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: 'wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      // STR save: 6 + 5(wis) = +11
      expect(getSaveCell(container, 0).textContent).toBe('+11');
    });
  });

  describe('save bonus with exhaustion penalty', () => {
    it('subtracts exhaustion penalty from save display after bonus is applied', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} exhaustionPenalty={1} />
      );
      // STR save: 6 + 2 - 1 = +7
      expect(getSaveCell(container, 0).textContent).toBe('+7');
    });

    it('applies exhaustion penalty when save bonus expression is also present', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} exhaustionPenalty={2} />
      );
      // STR save: 6 + 2 + 2(wis) - 2 = +8
      expect(getSaveCell(container, 0).textContent).toBe('+8');
    });
  });

  describe('save advantage tooltip with save bonus expression', () => {
    it('shows warding bond tooltip when saveBonusExpression has positive value', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(getSaveCell(container, 0).title).toContain('+2 [Warding Bond]');
    });

    it('does not show warding bond tooltip when saveBonusExpression has zero value', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+0 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(getSaveCell(container, 0).title).not.toContain('Warding Bond');
    });

    it('combines warding bond tooltip with spell resistance tooltip', () => {
      const stats = createPlayerStats({
        saveModifiers: [
          { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Spell Resistance' },
        ],
      });
      const { container } = render(
        <CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'], saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(getSaveCell(container, 0).title).toContain('Spell Resistance');
      expect(getSaveCell(container, 0).title).toContain('+2 [Warding Bond]');
    });
  });

  describe('save bonus with auto fail interaction', () => {
    it('shows AUTO FAIL text even when save bonus expression is present', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['str'], saveBonusExpression: '+2', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
      // STR save cell should show AUTO FAIL, not the calculated value
      expect(getSaveCell(container, 0).textContent).toBe('AUTO FAIL');
      // DEX save: 4 + 2 = +6
      expect(getSaveCell(container, 1).textContent).toBe('+6');
    });
  });

  describe('save bonus with save disadvantage styling', () => {
    it('applies stat--penalized class when save bonus expression is present and saveDisadvantage is set', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'], saveBonusExpression: '+2', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(getSaveCell(container, 0).classList.contains('stat--penalized')).toBe(true);
    });

    it('applies stat--buffed class when save bonus expression gives advantage', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageCount: 1, saveBonusExpression: '+2', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      expect(getSaveCell(container, 0).classList.contains('stat--buffed')).toBe(true);
      expect(getSaveCell(container, 0).textContent).toContain('(Adv)');
    });
  });

  describe('save bonus click handler', () => {
    it('includes save bonus in rollSavingThrow call when expression is present', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+3', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      const mockRoll = getMocks().rollSavingThrow;
      fireEvent.click(getSaveCell(container, 0));
      // STR save: 6 + 3 = 9
      expect(mockRoll).toHaveBeenCalledWith('Strength', 9, expect.any(Object));
    });

    it('excludes autoFailSaves abilities from rollSavingThrow even with save bonus', () => {
      const { container } = render(
        <CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['str'], saveBonusExpression: '+3', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />
      );
      const mockRoll = getMocks().rollSavingThrow;
      fireEvent.click(getSaveCell(container, 0));
      expect(mockRoll).not.toHaveBeenCalled();
    });
  });
});
