import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharAbilities from './CharAbilities';

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

const mockStore = new Map();
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
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
      { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [{ name: 'Perception', bonus: 3 }] },
      { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
    ],
    skillProficiencies: ['Athletics', 'Arcana'],
    automation: { primalKnowledge: ['Athletics'], passives: [] },
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

function getSaveTexts(container) {
  const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
  return Array.from(saveCells).map(c => c.textContent);
}

describe('CharAbilities save bonus rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('save bonus expression', () => {
    it('adds save bonus to save value when saveBonusExpression is set with valid abilities', () => {
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
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />);
      const container = document.querySelector('.char-abilities');
      const saveTexts = getSaveTexts(container);
      // STR save: 6 + 2 + 2(wisdom bonus) = +10
      expect(saveTexts).toContain('+10');
    });

    it('does not add save bonus when ability abbreviation is not in saveBonusAbilities', () => {
      const stats = createPlayerStats({
        level: 5,
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['WIS'] }} />);
      const container = document.querySelector('.char-abilities');
      const saveTexts = getSaveTexts(container);
      // STR save should be +6 (no bonus since STR not in saveBonusAbilities)
      expect(saveTexts).toContain('+6');
    });

    it('parses wisdom_modifier from saveBonusExpression correctly', () => {
      const stats = createPlayerStats({
        level: 5,
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 3, save: 5, totalScore: 16, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR'] }} />);
      const container = document.querySelector('.char-abilities');
      const saveTexts = getSaveTexts(container);
      // STR save: 6 + 2 + 3(wisdom bonus) = +11
      expect(saveTexts).toContain('+11');
    });

    it('returns 0 save bonus when saveBonusExpression is missing', () => {
      const { container } = render(<CharAbilities {...defaultProps} />);
      const saveTexts = getSaveTexts(container);
      expect(saveTexts).toContain('+6');
    });

    it('handles invalid saveBonusExpression gracefully', () => {
      const stats = createPlayerStats({
        level: 5,
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: 'invalid+expression', saveBonusAbilities: ['STR'] }} />);
      const container = document.querySelector('.char-abilities');
      const saveTexts = getSaveTexts(container);
      // Should still show +6 (parseInt('invalid') = NaN, skipped)
      expect(saveTexts).toContain('+6');
    });
  });

  describe('save advantage source tooltip', () => {
    it('shows tooltip with spell resistance source', () => {
      const stats = createPlayerStats({
        saveModifiers: [
          { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Spell Resistance' },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'] }} />);
      const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
      const strSave = saveCells[0];
      expect(strSave.title).toBe('Spell Resistance');
    });

    it('shows tooltip with multiple save advantage sources', () => {
      const stats = createPlayerStats({
        saveModifiers: [
          { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Spell Resistance' },
          { target: 'saving_throw', effect: 'advantage', condition: 'some_condition', source: 'Warding Bond' },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'], saveAdvantageCount: 1 }} />);
      const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
      const strSave = saveCells[0];
      expect(strSave.title).toContain('Spell Resistance');
      expect(strSave.title).toContain('Warding Bond');
    });

    it('shows tooltip with warding bond bonus', () => {
      render(<CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2 [Warding Bond]' }} />);
      const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
      const strSave = saveCells[0];
      expect(strSave.title).toContain('+2 [Warding Bond]');
    });

    it('has no tooltip when no save advantage sources exist', () => {
      render(<CharAbilities {...defaultProps} />);
      const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
      const strSave = saveCells[0];
      expect(strSave.title).toBe('');
    });
  });
});
