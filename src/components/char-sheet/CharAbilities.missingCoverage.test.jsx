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
      { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [{ name: 'Perception', bonus: 3 }] },
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

function getMocks() {
  return vi.mocked(useLoggedDiceRoll).mock.results[0].value;
}

function findClickableByText(text) {
  const clickableEls = document.querySelectorAll('.clickable');
  return Array.from(clickableEls).find((el) => el.textContent === text);
}

describe('CharAbilities getAbilityCheckBonus behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns ability.bonus when wisCheckReplace is not set', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{}} />);
    const bonusCell = findClickableByText('+4');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', 4, expect.any(Object));
  });

  it('returns max(1, wisdom.bonus) for Charisma when wisCheckReplace is set', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 1, save: 1, totalScore: 12, skills: [] },
        { name: 'Wisdom', bonus: 5, save: 7, totalScore: 20, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    const charismaRow = Array.from(document.querySelectorAll('.abilities')).find(el => el.querySelector('.left')?.textContent === 'Charisma');
    const bonusCell = charismaRow ? charismaRow.querySelector('.abilities > div:nth-child(3)') : null;
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Charisma', 5, expect.any(Object));
  });

  it('returns min bonus of 1 for Charisma when wisCheckReplace is set and wisdom bonus is negative', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 1, save: 1, totalScore: 12, skills: [] },
        { name: 'Wisdom', bonus: -3, save: -1, totalScore: 4, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    const charismaRow = Array.from(document.querySelectorAll('.abilities')).find(el => el.querySelector('.left')?.textContent === 'Charisma');
    const bonusCell = charismaRow ? charismaRow.querySelector('.abilities > div:nth-child(3)') : null;
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Charisma', 1, expect.any(Object));
  });
});

describe('CharAbilities getSkillBonus edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('calculates primal knowledge bonus with expertise when raging', () => {
    const stats = createPlayerStats({
      level: 5,
      automation: { primalKnowledge: ['Athletics'], passives: [] },
      skillProficiencies: ['Athletics'],
      expertise: ['Athletics'],
      abilities: [
        { name: 'Strength', bonus: 3, save: 5, totalScore: 16, skills: [{ name: 'Athletics', bonus: 5 }] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} isRaging={true} />);
    expect(screen.getByText('Athletics (Expert) (+9)')).toBeInTheDocument();
  });

  it('combines jack of all trades with exhaustion penalty', () => {
    const stats = createPlayerStats({
      level: 10,
      automation: { primalKnowledge: [], passives: [{ type: 'jack_of_all_trades' }] },
      skillProficiencies: ['Athletics'],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 2 }] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} exhaustionPenalty={1} />);
    // Acrobatics: skill.bonus(2) + floor(prof(4)/2)(2) - exhaustion(1) = 3
    expect(screen.getByText('Acrobatics (+3)')).toBeInTheDocument();
  });

  it('applies passWithoutTraceBonus to Stealth with exhaustion penalty', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Stealth', bonus: 6 }] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ passWithoutTraceBonus: '3' }} exhaustionPenalty={1} />);
    // Stealth: 6 + 3 - 1 = 8
    expect(screen.getByText('Stealth (+8)')).toBeInTheDocument();
  });

  it('calculates primal knowledge bonus without proficiency when raging', () => {
    const stats = createPlayerStats({
      level: 5,
      automation: { primalKnowledge: ['Stealth'], passives: [] },
      skillProficiencies: [],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 3, save: 5, totalScore: 16, skills: [{ name: 'Stealth', bonus: 1 }] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} isRaging={true} />);
    // Strength bonus(3) only, not proficient
    expect(screen.getByText('Stealth (+3)')).toBeInTheDocument();
  });

  it('uses proficiency calculation at level 1', () => {
    const stats = createPlayerStats({
      level: 1,
      automation: { primalKnowledge: [], passives: [{ type: 'jack_of_all_trades' }] },
      skillProficiencies: ['Athletics'],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 6 }] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [{ name: 'Acrobatics', bonus: 0 }] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} />);
    // Proficiency = Math.floor((1-1)/4 + 2) = 2, half = 1
    // Acrobatics: 0 + 1 = 1
    expect(screen.getByText('Acrobatics (+1)')).toBeInTheDocument();
  });
});

describe('CharAbilities getSaveBonus behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns 0 when saveBonusExpression is missing', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    // STR save: 6 + 0 = 6
    expect(saveCells[0].textContent).toBe('+6');
  });

  it('returns 0 when ability abbreviation is not in saveBonusAbilities', () => {
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
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['WIS'] }} />);
    const container = document.querySelector('.char-abilities');
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    // STR not in saveBonusAbilities, so save = 6
    expect(saveCells[0].textContent).toBe('+6');
  });

  it('parses multiple numeric parts in saveBonusExpression', () => {
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
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: '+2 + 3 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />);
    const container = document.querySelector('.char-abilities');
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    // STR save: 6 + 2 + 3 + 2(wis) = 13
    expect(saveCells[0].textContent).toBe('+13');
  });

  it('handles NaN parsing in saveBonusExpression gracefully', () => {
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
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: 'abc', saveBonusAbilities: ['STR'] }} />);
    const container = document.querySelector('.char-abilities');
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    // parseInt('abc') = NaN, skipped, save = 6
    expect(saveCells[0].textContent).toBe('+6');
  });

  it('handles exception in saveBonusExpression parsing gracefully', () => {
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
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveBonusExpression: null, saveBonusAbilities: ['STR'] }} />);
    const container = document.querySelector('.char-abilities');
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    // null expression returns 0 early
    expect(saveCells[0].textContent).toBe('+6');
  });
});

describe('CharAbilities getSaveAdvantageSource behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns null when no save advantage sources exist', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    expect(saveCells[0].title).toBe('');
  });

  it('matches positive integers in saveBonusExpression as warding bond', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />);
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    expect(saveCells[0].title).toContain('+2');
    expect(saveCells[0].title).toContain('Warding Bond');
  });

  it('does not match zero or negative integers as warding bond', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+0 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />);
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    expect(saveCells[0].title).not.toContain('Warding Bond');
  });

  it('uses computedStats.saveModifiers when saveModifiers is undefined', () => {
    const stats = createPlayerStats({
      saveModifiers: undefined,
      computedStats: {
        saveModifiers: [
          { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Computed Resistance' },
        ],
      },
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'] }} />);
    const saveCells = container.querySelectorAll('.abilities > div:nth-child(4)');
    expect(saveCells[0].title).toContain('Computed Resistance');
  });
});

describe('CharAbilities makeCheckContext edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns undefined context when conditionEffects is empty object', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{}} />);
    const bonusCell = findClickableByText('+4');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', 4, {});
  });

  it('passes strCheckReplace context for STR ability check', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 2, save: 4, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strCheckReplace: true }} />);
    const bonusCell = findClickableByText('+2');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ strCheckReplace: true, strScore: 14 }));
  });

  it('passes wisCheckReplace context for Wisdom ability check', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -3, save: 0, totalScore: 4, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    const bonusCell = findClickableByText('-3');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Wisdom', expect.any(Number), expect.objectContaining({ wisCheckReplace: true, wisCheckMinBonus: 1 }));
  });

  it('passes autoRerollForChecks context with bonus', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoRerollForChecks: true, autoRerollCondition: 'roll_equals_1', autoRerollBonus: 5 }} />);
    const bonusCell = findClickableByText('+4');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ autoReroll: true, autoRerollCondition: 'roll_equals_1', autoRerollBonus: 5 }));
  });

  it('passes strokeOfLuck in check context', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ strokeOfLuck: true }} />);
    const bonusCell = findClickableByText('+4');
    expect(bonusCell).toBeTruthy();
    fireEvent.click(bonusCell);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ strokeOfLuck: true }));
  });
});

describe('CharAbilities makeSaveContext edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns forcedMode and autoFail undefined when conditionEffects is empty', () => {
    render(<CharAbilities {...defaultProps} />);
    const saveCell = findClickableByText('+6');
    expect(saveCell).toBeTruthy();
    fireEvent.click(saveCell);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', 6, expect.objectContaining({ forcedMode: undefined, autoFail: undefined }));
  });

  it('passes strSaveReplace context with strScore for save', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 2, save: 4, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Constitution', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Charisma', bonus: 0, save: 0, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strSaveReplace: true }} />);
    const saveCell = findClickableByText('+4');
    expect(saveCell).toBeTruthy();
    fireEvent.click(saveCell);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith(expect.any(String), expect.any(Number), expect.objectContaining({ strSaveReplace: true, strScore: 14 }));
  });

  it('passes forcedMode disadvantage for ability in saveDisadvantage', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['dex'] }} />);
    const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
    fireEvent.click(saveCells[1]);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Dexterity', expect.any(Number), expect.objectContaining({ forcedMode: 'disadvantage' }));
  });

  it('passes forcedMode advantage for ability in saveAdvantageAbilities', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageAbilities: ['DEX'] }} />);
    const saveCells = document.querySelectorAll('.abilities > div:nth-child(4)');
    fireEvent.click(saveCells[1]);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Dexterity', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
  });
});

describe('CharAbilities equipment loading edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('handles missing abilities gracefully', () => {
    const stats = createPlayerStats({
      level: 5,
      toolProficiencies: [],
      inventory: { equipped: ["Healer's Kit"], backpack: [] },
      abilities: undefined,
    });
    expect(() => render(<CharAbilities {...defaultProps} playerStats={stats} />)).toThrow();
  });

  it('handles missing inventory back pack gracefully', async () => {
    const stats = createPlayerStats({
      level: 5,
      toolProficiencies: [],
      inventory: { equipped: [] },
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} />);
    expect(screen.queryByText("Healer's Kit")).not.toBeInTheDocument();
  });
});
