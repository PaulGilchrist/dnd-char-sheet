import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharAbilities from './CharAbilities';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  const mockFn = vi.fn(() => ({
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

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(() => Promise.resolve([])),
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
      { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Deception', bonus: 2 }, { name: 'Intimidation', bonus: 2 }, { name: 'Performance', bonus: 2 }, { name: 'Persuasion', bonus: 2 }] },
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

function getMocks() {
  return vi.mocked(useLoggedDiceRoll).mock.results[0].value;
}

function getBonusCells(container) {
  return container.querySelectorAll('.abilities > div:nth-child(3)');
}

function getSaveCells(container) {
  return container.querySelectorAll('.abilities > div:nth-child(4)');
}

describe('CharAbilities event listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('handles internal-skill-check event with checkType check', () => {
    render(<CharAbilities {...defaultProps} />);
    const event = new CustomEvent('internal-skill-check', { detail: { skillName: 'Strength', checkType: 'check' } });
    window.dispatchEvent(event);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), undefined);
  });

  it('handles internal-skill-check event with checkType skill', () => {
    render(<CharAbilities {...defaultProps} />);
    const event = new CustomEvent('internal-skill-check', { detail: { skillName: 'Athletics', checkType: 'skill' } });
    window.dispatchEvent(event);
    expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Athletics', expect.any(Number), undefined);
  });

  it('does nothing when event has no skillName', () => {
    render(<CharAbilities {...defaultProps} />);
    const event = new CustomEvent('internal-skill-check', { detail: { checkType: 'check' } });
    window.dispatchEvent(event);
    expect(getMocks().rollAbilityCheck).not.toHaveBeenCalled();
    expect(getMocks().rollSkillCheck).not.toHaveBeenCalled();
  });

  it('does nothing when skillName does not match any ability', () => {
    render(<CharAbilities {...defaultProps} />);
    const event = new CustomEvent('internal-skill-check', { detail: { skillName: 'NonExistent', checkType: 'check' } });
    window.dispatchEvent(event);
    expect(getMocks().rollAbilityCheck).not.toHaveBeenCalled();
  });

  it('does nothing when skillName does not match any skill', () => {
    render(<CharAbilities {...defaultProps} />);
    const event = new CustomEvent('internal-skill-check', { detail: { skillName: 'NonExistent', checkType: 'skill' } });
    window.dispatchEvent(event);
    expect(getMocks().rollSkillCheck).not.toHaveBeenCalled();
  });
});

describe('CharAbilities getAbilityCheckBonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns ability.bonus normally when wisCheckReplace is not set', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', 4, {});
  });

  it('replaces Charisma check bonus with Wisdom max(1, wisMod) when wisCheckReplace is set', () => {
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
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[5]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Charisma', 3, expect.objectContaining({ wisCheckReplace: true, wisCheckMinBonus: 3 }));
  });

  it('caps ability check bonus at minimum 1 when wisCheckReplace is set and wisMod is negative', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -3, save: 0, totalScore: 4, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[5]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Charisma', 1, expect.objectContaining({ wisCheckReplace: true, wisCheckMinBonus: 1 }));
  });
});

describe('CharAbilities getSkillBonus - wisCheckReplace for charisma skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('replaces charisma skill bonuses with wisdom-based calculation when wisCheckReplace is set', () => {
    const stats = createPlayerStats({
      level: 5,
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: ['Deception'],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 3, save: 5, totalScore: 16, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Deception', bonus: 2 }] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    expect(screen.getByText('Deception (+6)')).toBeInTheDocument();
  });

  it('does not replace non-charisma skill bonuses when wisCheckReplace is set', () => {
    const stats = createPlayerStats({
      level: 5,
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: ['Athletics'],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 3, save: 5, totalScore: 16, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    expect(screen.getByText('Athletics (+8)')).toBeInTheDocument();
  });

  it('handles wisCheckReplace with expertise for charisma skills', () => {
    const stats = createPlayerStats({
      level: 5,
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: ['Persuasion'],
      expertise: ['Persuasion'],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: 2, save: 4, totalScore: 14, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Persuasion', bonus: 2 }] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ wisCheckReplace: true }} />);
    expect(screen.getByText('Persuasion (Expert) (+8)')).toBeInTheDocument();
  });
});

describe('CharAbilities makeCheckContext - advanced condition effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('peerlessAthleteAdvantageSkills', () => {
    it('passes forcedMode advantage for skills listed in peerlessAthleteAdvantageSkills', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ peerlessAthleteAdvantageSkills: ['Athletics'] }} />);
      const athleticsElements = screen.getAllByText(/Athletics/);
      fireEvent.click(athleticsElements[0]);
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Athletics', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
    });

    it('does not pass advantage for skills not listed in peerlessAthleteAdvantageSkills', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ peerlessAthleteAdvantageSkills: ['Athletics'] }} />);
      const acrobaticsElements = screen.getAllByText(/Acrobatics/);
      fireEvent.click(acrobaticsElements[0]);
      const callArgs = getMocks().rollSkillCheck.mock.calls[0];
      const ctx = callArgs[2];
      expect(ctx.forcedMode).not.toBe('advantage');
    });
  });

  describe('abilityCheckAdvantageSkills', () => {
    it('passes forcedMode advantage for skills listed in abilityCheckAdvantageSkills', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Deception', bonus: 2 }] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ abilityCheckAdvantageSkills: ['Deception'] }} />);
      const deceptionElements = screen.getAllByText(/Deception/);
      fireEvent.click(deceptionElements[0]);
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Deception', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
    });
  });

  describe('Powerful Build (strCheckAdvantage)', () => {
    it('passes forcedMode advantage for Strength-related checks when strCheckAdvantage is set', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ strCheckAdvantage: true }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
    });

    it('passes forcedMode advantage for Athletics when strCheckAdvantage is set', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strCheckAdvantage: true }} />);
      const athleticsElements = screen.getAllByText(/Athletics/);
      fireEvent.click(athleticsElements[0]);
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Athletics', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
    });

    it('does not pass advantage for non-STR checks when strCheckAdvantage is set', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strCheckAdvantage: true }} />);
      const acrobaticsElements = screen.getAllByText(/Acrobatics/);
      fireEvent.click(acrobaticsElements[0]);
      const callArgs = getMocks().rollSkillCheck.mock.calls[0];
      const ctx = callArgs[2];
      expect(ctx.forcedMode).not.toBe('advantage');
    });
  });

  describe('Ray of Enfeeblement (strCheckDisadvantage)', () => {
    it('passes forcedMode disadvantage for Strength checks when strCheckDisadvantage is set', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ strCheckDisadvantage: true }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'disadvantage' }));
    });

    it('does not pass disadvantage for non-STR checks when strCheckDisadvantage is set', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ strCheckDisadvantage: true }} />);
      const acrobaticsElements = screen.getAllByText(/Acrobatics/);
      fireEvent.click(acrobaticsElements[0]);
      const callArgs = getMocks().rollSkillCheck.mock.calls[0];
      const ctx = callArgs[2];
      expect(ctx.forcedMode).not.toBe('disadvantage');
    });
  });

  describe('Hex (abilityCheckDisadvantageAbilities)', () => {
    it('passes forcedMode disadvantage for abilities listed in abilityCheckDisadvantageAbilities', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Deception', bonus: 2 }] },
        ],
      });
      render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ abilityCheckDisadvantageAbilities: ['CHA'] }} />);
      const deceptionElements = screen.getAllByText(/Deception/);
      fireEvent.click(deceptionElements[0]);
      expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Deception', expect.any(Number), expect.objectContaining({ forcedMode: 'disadvantage' }));
    });

    it('does not pass disadvantage for non-targeted abilities', () => {
      const stats = createPlayerStats({
        abilities: [
          { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
          { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
          { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
          { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
          { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
          { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
        ],
      });
      const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ abilityCheckDisadvantageAbilities: ['CHA'] }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
      const ctx = callArgs[2];
      expect(ctx.forcedMode).not.toBe('disadvantage');
    });
  });

  describe('autoRerollForChecks', () => {
    it('passes autoReroll context with condition and bonus when autoRerollForChecks is set', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ autoRerollForChecks: true, autoRerollCondition: 'roll_equals_1', autoRerollBonus: 5 }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ autoReroll: true, autoRerollCondition: 'roll_equals_1', autoRerollBonus: 5 }));
    });
  });
});

describe('CharAbilities makeSaveContext - advanced condition effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  describe('restoreBalance', () => {
    it('passes forcedMode normal when restoreBalance is set', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ restoreBalance: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'normal' }));
    });

    it('overrides saveDisadvantage with restoreBalance', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'], restoreBalance: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'normal' }));
    });

    it('overrides saveAdvantageCount with restoreBalance', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageCount: 2, restoreBalance: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'normal' }));
    });
  });

  describe('strokeOfLuck in saves', () => {
    it('passes strokeOfLuck context when save is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ strokeOfLuck: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ strokeOfLuck: true }));
    });
  });

  describe('luckyAdvantage in saves', () => {
    it('passes luckyAdvantage context when save is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ luckyAdvantage: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ luckyAdvantage: true }));
    });
  });

  describe('luckyDisadvantage in saves', () => {
    it('passes luckyDisadvantage context when save is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ luckyDisadvantage: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ luckyDisadvantage: true }));
    });
  });

  describe('darkOnesLuck in saves', () => {
    it('passes darkOnesLuck context when save is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ darkOnesLuck: true }} />);
      const saveCells = getSaveCells(container);
      fireEvent.click(saveCells[0]);
      expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ darkOnesLuck: true }));
    });
  });
});

describe('CharAbilities penalized CSS classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('applies stat--penalized to bonus cells when exhaustionPenalty > 0', () => {
    const { container } = render(<CharAbilities {...defaultProps} exhaustionPenalty={1} />);
    const bonusCells = getBonusCells(container);
    bonusCells.forEach(cell => {
      expect(cell.classList.contains('stat--penalized')).toBe(true);
    });
  });

  it('applies stat--penalized to bonus cells when abilityCheckDisadvantage is set', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantage: true }} />);
    const bonusCells = getBonusCells(container);
    bonusCells.forEach(cell => {
      expect(cell.classList.contains('stat--penalized')).toBe(true);
    });
  });

  it('applies stat--penalized to bonus cells when abilityCheckDisadvantageAbilities includes the full ability name', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantageAbilities: ['Strength'] }} />);
    const bonusCells = getBonusCells(container);
    expect(bonusCells[0].classList.contains('stat--penalized')).toBe(true);
    expect(bonusCells[1].classList.contains('stat--penalized')).toBe(false);
  });

  it('applies stat--penalized to save cells when exhaustionPenalty > 0', () => {
    const { container } = render(<CharAbilities {...defaultProps} exhaustionPenalty={1} />);
    const saveCells = getSaveCells(container);
    saveCells.forEach(cell => {
      expect(cell.classList.contains('stat--penalized')).toBe(true);
    });
  });

  it('applies stat--penalized to save cells when autoFailSaves includes the ability', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['str'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].classList.contains('stat--penalized')).toBe(true);
  });

  it('applies stat--penalized to save cells when saveDisadvantage includes the ability', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveDisadvantage: ['str'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].classList.contains('stat--penalized')).toBe(true);
  });

  it('applies stat--buffed to save cells when save advantage exists', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageAbilities: ['STR'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].classList.contains('stat--buffed')).toBe(true);
  });

  it('applies stat--penalized to skill cells when abilityCheckDisadvantage is set', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantage: true }} />);
    const skillClickableEls = container.querySelectorAll('.abilities .clickable');
    const firstSkill = Array.from(skillClickableEls).find(el => el.textContent.includes('Athletics'));
    if (firstSkill) {
      expect(firstSkill.classList.contains('stat--penalized')).toBe(true);
    }
  });
});

describe('CharAbilities isExpert display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('shows (Expert) suffix for skills with expertise', () => {
    const stats = createPlayerStats({
      level: 5,
      expertise: ['Athletics'],
      skillProficiencies: ['Athletics'],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} />);
    expect(screen.getByText('Athletics (Expert) (+8)')).toBeInTheDocument();
  });

  it('does not show (Expert) for non-expertised skills', () => {
    const stats = createPlayerStats({
      level: 5,
      expertise: [],
      skillProficiencies: ['Athletics'],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} />);
    expect(screen.getByText('Athletics (+8)')).toBeInTheDocument();
    expect(screen.queryByText('Athletics (Expert) (+8)')).not.toBeInTheDocument();
  });
});

describe('CharAbilities bardic inspiration integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('includes bardicInspiration in check context when bardicInspirationDie is set', () => {
    mockStore.set('Test Fighter:bardicInspirationDie', 'd6');
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ bardicInspiration: true, bardicInspirationDie: 'd6' }));
  });

  it('includes bardicInspiration in save context when bardicInspirationDie is set', () => {
    mockStore.set('Test Fighter:bardicInspirationDie', 'd8');
    const { container } = render(<CharAbilities {...defaultProps} />);
    const saveCells = getSaveCells(container);
    fireEvent.click(saveCells[0]);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ bardicInspiration: true, bardicInspirationDie: 'd8' }));
  });

  it('includes bardicInspiration in skill check context when bardicInspirationDie is set', () => {
    mockStore.set('Test Fighter:bardicInspirationDie', 'd6');
    render(<CharAbilities {...defaultProps} />);
    const athleticsElements = screen.getAllByText(/Athletics/);
    fireEvent.click(athleticsElements[0]);
    expect(getMocks().rollSkillCheck).toHaveBeenCalledWith('Athletics', expect.any(Number), expect.objectContaining({ bardicInspiration: true, bardicInspirationDie: 'd6' }));
  });

  it('does not include bardicInspiration when bardicInspirationDie is not set', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    const callArgs = getMocks().rollAbilityCheck.mock.calls[0];
    const ctx = callArgs[2];
    expect(ctx).not.toHaveProperty('bardicInspiration');
  });
});

describe('CharAbilities luckyDisadvantageActive prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes luckyDisadvantage context when luckyDisadvantageActive prop is true', () => {
    const { container } = render(<CharAbilities {...defaultProps} luckyDisadvantageActive={true} />);
    const saveCells = getSaveCells(container);
    fireEvent.click(saveCells[0]);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ luckyDisadvantage: true }));
  });

  it('does not pass luckyDisadvantage when luckyDisadvantageActive prop is false', () => {
    const { container } = render(<CharAbilities {...defaultProps} luckyDisadvantageActive={false} />);
    const saveCells = getSaveCells(container);
    fireEvent.click(saveCells[0]);
    const callArgs = getMocks().rollSavingThrow.mock.calls[0];
    const ctx = callArgs[2];
    expect(ctx).not.toHaveProperty('luckyDisadvantage');
  });
});

describe('CharAbilities getSaveAdvantageSource - tooltip building', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('returns null tooltip when no save advantage sources exist', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].title).toBe('');
  });

  it('includes spell resistance source in tooltip', () => {
    const stats = createPlayerStats({
      saveModifiers: [
        { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Spell Resistance' },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].title).toContain('Spell Resistance');
  });

  it('includes warding bond bonus in tooltip when saveBonusExpression has positive value', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveBonusExpression: '+2 + wisdom_modifier', saveBonusAbilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].title).toContain('+2');
    expect(saveCells[0].title).toContain('Warding Bond');
  });

  it('combines multiple save advantage sources in tooltip', () => {
    const stats = createPlayerStats({
      saveModifiers: [
        { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Spell Resistance' },
        { target: 'saving_throw', effect: 'advantage', condition: 'some_condition', source: 'Warding Bond' },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'], saveAdvantageCount: 1 }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].title).toContain('Spell Resistance');
    expect(saveCells[0].title).toContain('Warding Bond');
  });

  it('uses computedStats.saveModifiers when saveModifiers is not present', () => {
    const stats = createPlayerStats({
      saveModifiers: undefined,
      computedStats: {
        saveModifiers: [
          { target: 'saving_throw', effect: 'advantage', condition: 'against_spell', source: 'Computed Resistance' },
        ],
      },
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} conditionEffects={{ saveAdvantage: ['against_spell'] }} />);
    const saveCells = getSaveCells(container);
    expect(saveCells[0].title).toContain('Computed Resistance');
  });
});

describe('CharAbilities makeCheckContext - d20Floor10', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes d20Floor10 context when ability check is clicked', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ d20Floor10: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ d20Floor10: true }));
  });
});

describe('CharAbilities makeCheckContext - tacticalMind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes tacticalMind context with bonus when ability check is clicked', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ tacticalMind: true, tacticalMindBonus: '+2' }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ tacticalMind: true, tacticalMindBonus: '+2' }));
  });

  it('passes tacticalMind context with null bonus when tacticalMindBonus is not set', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ tacticalMind: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ tacticalMind: true, tacticalMindBonus: null }));
  });
});

describe('CharAbilities makeCheckContext - reliableTalent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes reliableTalent context when ability check is clicked', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ reliableTalent: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ reliableTalent: true }));
  });
});

describe('CharAbilities makeCheckContext - psiBolsteredKnack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes psiBolsteredKnack context for Soulknife rogues at level 3+', () => {
    const stats = createPlayerStats({
      level: 5,
      class: { name: 'Rogue', major: { name: 'Soulknife' } },
      class_levels: [{ level: 5, energy: { energy_die_type: 6 } }],
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: [],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ psiBolsteredKnack: true, psiBolsteredKnackDieSize: 6 }));
  });

  it('does not pass psiBolsteredKnack for non-Soulknife classes', () => {
    const stats = createPlayerStats({
      level: 5,
      class: { name: 'Fighter', major: { name: 'Battle Master' } },
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: [],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.not.objectContaining({ psiBolsteredKnack: true }));
  });

  it('does not pass psiBolsteredKnack for Soulknife rogues below level 3', () => {
    const stats = createPlayerStats({
      level: 2,
      class: { name: 'Rogue', major: { name: 'Soulknife' } },
      automation: { primalKnowledge: [], passives: [] },
      skillProficiencies: [],
      expertise: [],
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    const { container } = render(<CharAbilities {...defaultProps} playerStats={stats} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.not.objectContaining({ psiBolsteredKnack: true }));
  });
});

describe('CharAbilities signFormatter output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('formats positive bonuses with + prefix', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    expect(bonusCells[0].textContent).toBe('+4');
  });

  it('formats negative bonuses with - prefix', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    expect(bonusCells[4].textContent).toBe('-1');
  });

  it('formats zero bonuses with +0 prefix', () => {
    const { container } = render(<CharAbilities {...defaultProps} />);
    const bonusCells = getBonusCells(container);
    expect(bonusCells[3].textContent).toBe('+0');
  });
});

describe('CharAbilities skill separator rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('renders comma separator between multiple skills on the same ability', () => {
    const stats = createPlayerStats({
      abilities: [
        { name: 'Strength', bonus: 4, save: 6, totalScore: 14, skills: [{ name: 'Athletics', bonus: 8 }] },
        { name: 'Dexterity', bonus: 2, save: 4, totalScore: 12, skills: [{ name: 'Acrobatics', bonus: 6 }, { name: 'Sleight of Hand', bonus: 6 }] },
        { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
        { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [{ name: 'Arcana', bonus: 2 }] },
        { name: 'Wisdom', bonus: -1, save: 1, totalScore: 9, skills: [{ name: 'Perception', bonus: 3 }] },
        { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
      ],
    });
    render(<CharAbilities {...defaultProps} playerStats={stats} />);
    expect(screen.getByText('Acrobatics (+6)')).toBeInTheDocument();
    expect(screen.getByText('Sleight of Hand (+6)')).toBeInTheDocument();
  });
});

describe('CharAbilities saveAdvantageAbilities abbreviation matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('matches saveAdvantageAbilities with 3-letter abbreviation', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageAbilities: ['DEX'] }} />);
    const saveTexts = Array.from(getSaveCells(container)).map(c => c.textContent);
    expect(saveTexts).toContain('+4 (Adv)');
  });

  it('does not match saveAdvantageAbilities when abbreviation does not match', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ saveAdvantageAbilities: ['STR'] }} />);
    const saveTexts = Array.from(getSaveCells(container)).map(c => c.textContent);
    expect(saveTexts).not.toContain('+4 (Adv)');
  });
});

describe('CharAbilities autoFailSaves abbreviation matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('shows AUTO FAIL for dex when autoFailSaves includes dex', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['dex'] }} />);
    expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
  });

  it('shows AUTO FAIL for constitution when autoFailSaves includes con', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['con'] }} />);
    expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
  });

  it('shows AUTO FAIL for intelligence when autoFailSaves includes int', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['int'] }} />);
    expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
  });

  it('shows AUTO FAIL for wisdom when autoFailSaves includes wis', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['wis'] }} />);
    expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
  });

  it('shows AUTO FAIL for charisma when autoFailSaves includes cha', () => {
    render(<CharAbilities {...defaultProps} conditionEffects={{ autoFailSaves: ['cha'] }} />);
    expect(screen.getByText('AUTO FAIL')).toBeInTheDocument();
  });
});

describe('CharAbilities characters prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('passes characters prop to useLoggedDiceRoll', () => {
    const characters = [{ name: 'Creature 1' }, { name: 'Creature 2' }];
    render(<CharAbilities {...defaultProps} characters={characters} />);
    expect(vi.mocked(useLoggedDiceRoll).mock.calls[0][2]).toEqual({ characters });
  });
});

describe('CharAbilities combination of effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('combines abilityCheckDisadvantage with strokeOfLuck in check context', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ abilityCheckDisadvantage: true, strokeOfLuck: true }} />);
    const bonusCells = getBonusCells(container);
    fireEvent.click(bonusCells[0]);
    expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ forcedMode: 'disadvantage', strokeOfLuck: true }));
  });

  it('combines autoRerollForSaves with strokeOfLuck in save context', () => {
    const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ autoRerollForSaves: true, autoRerollCondition: 'frightened', autoRerollBonus: 2, strokeOfLuck: true }} />);
    const saveCells = getSaveCells(container);
    fireEvent.click(saveCells[0]);
    expect(getMocks().rollSavingThrow).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ autoReroll: true, autoRerollCondition: 'frightened', autoRerollBonus: 2 }));
  });
});
