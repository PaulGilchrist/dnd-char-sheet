// CLA-291 regression: Reliable Talent must floor ONLY proficient skill/tool checks
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharAbilities from './CharAbilities';
import DiceRollResult from './DiceRollResult.jsx';
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
  loadEquipment: vi.fn(() => Promise.resolve([
    { name: "Thieves' Tools", equipment_category: 'Tools', ability: 'Dexterity' },
    { name: "Navigator's Tools", equipment_category: 'Tools', ability: 'Wisdom' },
  ])),
}));

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
    name: 'Rogue Test',
    level: 17,
    abilities: [
      { name: 'Strength', bonus: 0, save: 2, totalScore: 10, skills: [{ name: 'Athletics', bonus: 6 }] },
      { name: 'Dexterity', bonus: 2, save: 4, totalScore: 14, skills: [{ name: 'Acrobatics', bonus: 2 }] },
      { name: 'Constitution', bonus: 1, save: 3, totalScore: 11, skills: [] },
      { name: 'Intelligence', bonus: 0, save: 0, totalScore: 10, skills: [{ name: 'Arcana', bonus: 6 }] },
      { name: 'Wisdom', bonus: 1, save: 1, totalScore: 12, skills: [{ name: 'Animal Handling', bonus: 1 }, { name: 'Insight', bonus: 7 }] },
      { name: 'Charisma', bonus: 0, save: 2, totalScore: 10, skills: [] },
    ],
    skillProficiencies: ['Athletics', 'Arcana', 'Insight'],
    toolProficiencies: ["Thieves' Tools"],
    expertise: [],
    inventory: { equipped: ["Thieves' Tools", "Navigator's Tools"], backpack: [] },
    automation: { passives: [] },
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    allAbilityScores: mockAllAbilityScores,
    playerStats: createPlayerStats(),
    campaignName: 'test-campaign',
    exhaustionPenalty: 0,
    conditionEffects: {},
    isRaging: false,
    ...overrides,
  };
}

function getMocks() {
  const results = vi.mocked(useLoggedDiceRoll).mock.results;
  return results[results.length - 1].value;
}

function findClickableByPrefix(prefix) {
  const clickableEls = Array.from(document.querySelectorAll('.clickable'));
  return clickableEls.find((el) => el.textContent.startsWith(prefix));
}

describe('CLA-291 makeCheckContext reliableTalent proficiency gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('stamps reliableTalent for PROFICIENT skill checks', () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    fireEvent.click(findClickableByPrefix('Insight'));
    const ctx = getMocks().rollSkillCheck.mock.calls[0][2] || {};
    expect(ctx.reliableTalent).toBe(true);
  });

  it('does NOT stamp reliableTalent for NON-PROFICIENT skill checks', () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    fireEvent.click(findClickableByPrefix('Animal Handling'));
    const ctx = getMocks().rollSkillCheck.mock.calls[0][2] || {};
    expect(ctx.reliableTalent).toBeUndefined();
  });

  it('does NOT stamp reliableTalent for raw ability check cells', () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    fireEvent.click(findClickableByPrefix('Strength'));
    // Strength name cell opens the popup, bonus cell (+0) rolls the check — use the bonus cell of the STR row
    const bonusCells = Array.from(document.querySelectorAll('.abilities .clickable'));
    const strBonusCell = bonusCells.find((el) => el.textContent.trim() === '+0');
    if (strBonusCell) fireEvent.click(strBonusCell);
    const abilityCalls = getMocks().rollAbilityCheck.mock.calls.filter(c => c[0] === 'Strength');
    expect(abilityCalls.length).toBeGreaterThan(0);
    const ctx = abilityCalls[abilityCalls.length - 1][2] || {};
    expect(ctx.reliableTalent).toBeUndefined();
  });

  it('stamps reliableTalent for PROFICIENT tool checks', async () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    const toolCell = await (async () => {
      for (let i = 0; i < 20; i++) {
        const el = findClickableByPrefix("Thieves' Tools");
        if (el) return el;
        await new Promise((r) => setTimeout(r, 50));
      }
      return null;
    })();
    expect(toolCell).toBeTruthy();
    fireEvent.click(toolCell);
    const ctx = getMocks().rollAbilityCheck.mock.calls[0][2] || {};
    expect(ctx.reliableTalent).toBe(true);
  });

  it('does NOT stamp reliableTalent for NON-PROFICIENT tool checks', async () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    const toolCell = await (async () => {
      for (let i = 0; i < 20; i++) {
        const el = findClickableByPrefix("Navigator's Tools");
        if (el) return el;
        await new Promise((r) => setTimeout(r, 50));
      }
      return null;
    })();
    expect(toolCell).toBeTruthy();
    fireEvent.click(toolCell);
    const ctx = getMocks().rollAbilityCheck.mock.calls[0][2] || {};
    expect(ctx.reliableTalent).toBeUndefined();
  });

  it('stamps nothing else spuriously when reliableTalent modifier is present but check is not proficient', () => {
    render(<CharAbilities {...defaultProps({ conditionEffects: { reliableTalent: true } })} />);
    fireEvent.click(findClickableByPrefix('Acrobatics'));
    const ctx = getMocks().rollSkillCheck.mock.calls[0][2];
    expect(ctx).toEqual({});
    expect('reliableTalent' in ctx).toBe(false);
  });
});

describe('CLA-291 DiceRollResult floor respects the reliableTalent flag', () => {
  it('floors low d20 totals when flag set on a skill roll', () => {
    const { container } = render(
      <DiceRollResult name="Insight" type="d20" rolls={[4]} bonus={7} rollType="skill" reliableTalent={true} />
    );
    const rt = container.querySelector('.dice-roll-reliable-talent');
    expect(rt).toBeInTheDocument();
    expect(rt.textContent).toContain('10');
  });

  it('does NOT floor when flag not set', () => {
    const { container } = render(
      <DiceRollResult name="Animal Handling" type="d20" rolls={[4]} bonus={1} rollType="skill" />
    );
    expect(container.querySelector('.dice-roll-reliable-talent')).not.toBeInTheDocument();
  });
});
