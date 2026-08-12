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

// ── Tests ──

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

  describe('d20Floor10', () => {
    it('passes d20Floor10 context when ability check is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ d20Floor10: true }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ d20Floor10: true }));
    });
  });

  describe('tacticalMind', () => {
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

  describe('reliableTalent', () => {
    it('passes reliableTalent context when ability check is clicked', () => {
      const { container } = render(<CharAbilities {...defaultProps} conditionEffects={{ reliableTalent: true }} />);
      const bonusCells = getBonusCells(container);
      fireEvent.click(bonusCells[0]);
      expect(getMocks().rollAbilityCheck).toHaveBeenCalledWith('Strength', expect.any(Number), expect.objectContaining({ reliableTalent: true }));
    });
  });

  describe('psiBolsteredKnack', () => {
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
});
