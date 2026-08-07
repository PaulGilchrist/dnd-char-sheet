import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
  rollExpressionMaximized: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  resolveHealingBonusesWithDetails: vi.fn(() => ({ totalBonus: 0, details: [] })),
  markFortifiedHealthUsed: vi.fn(),
  hasHealingMaximization: vi.fn(),
  hasHealingMaximizationForTarget: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, confirmMassHealingWord } from './massHealingWordHandler.js';
import { rollExpression, rollExpressionMaximized } from '../../../dice/diceRoller.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyHealingToTarget } from '../../../rules/combat/applyHealing.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import {
  resolveHealingBonusesWithDetails,
  markFortifiedHealthUsed,
  hasHealingMaximization,
  hasHealingMaximizationForTarget,
} from '../../../combat/automation/automationService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCleric',
    level: 10,
    proficiency: 4,
    hitPoints: 50,
    spellAbilities: { modifier: 3 },
    abilities: [{ name: 'Wisdom', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(overrides = {}) {
  return {
    name: 'Mass Healing Word',
    spell: {
      name: 'Mass Healing Word',
      level: 3,
      heal_at_slot_level: {
        '3': '2d6 + MOD',
        '4': '3d6 + MOD',
        '5': '4d6 + MOD',
        '6': '5d6 + MOD',
        '7': '6d6 + MOD',
        '8': '7d6 + MOD',
        '9': '8d6 + MOD',
      },
      ...overrides.spell,
    },
    automation: { type: 'mass_healing_word', ...overrides.automation },
    ...overrides,
  };
}

function makeCombatSummary(creatures) {
  return {
    players: [{ name: 'TestCleric', gridX: 1, gridY: 1 }],
    creatures,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('massHealingWordHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rollExpression.mockReturnValue({ total: 12, rolls: [5, 4, 3], modifier: 0 });
    rollExpressionMaximized.mockReturnValue({ total: 18, rolls: [6, 6, 6], modifier: 0 });
    getCombatContext.mockResolvedValue(
      makeCombatSummary([
        { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
        { name: 'Rogue', maxHp: 30, currentHp: 10, type: 'player' },
        { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
      ]),
    );
    getRuntimeValue.mockImplementation((_name, prop) => {
      if (prop === 'currentHitPoints') return 20;
      return null;
    });
    hasHealingMaximization.mockReturnValue(false);
    hasHealingMaximizationForTarget.mockReturnValue(false);
    resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 0, details: [] });
    applyHealingToTarget.mockReturnValue({ actualHeal: 12, oldHp: 20, newHp: 32 });
  });

  // ── getSpellCastingMod ──────────────────────────────────────

  describe('spell casting modifier resolution', () => {
    it('uses spell.spellCastingAbility when present on the spell', async () => {
      const action = {
        ...makeAction(),
        spell: {
          ...makeAction().spell,
          spellCastingAbility: 'Charisma',
          level: 3,
        },
      };
      const ps = makePlayerStats({
        abilities: [
          { name: 'Wisdom', bonus: 3 },
          { name: 'Charisma', bonus: 5 },
        ],
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 5');
    });

    it('falls back to playerStats.spellAbilities.modifier when spell has no casting ability', async () => {
      const action = makeAction();
      const ps = makePlayerStats({
        spellAbilities: { modifier: 4 },
        abilities: [{ name: 'Wisdom', bonus: 3 }],
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 4');
    });

    it('returns 0 when no spell casting ability is available', async () => {
      const action = makeAction();
      const ps = makePlayerStats({
        abilities: [],
        spellAbilities: undefined,
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 0');
    });

    it('returns 0 when spellCastingAbility does not match any ability', async () => {
      const action = {
        ...makeAction(),
        spell: {
          ...makeAction().spell,
          spellCastingAbility: 'Charisma',
        },
      };
      const ps = makePlayerStats({
        abilities: [{ name: 'Wisdom', bonus: 3 }],
        spellAbilities: undefined,
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 0');
    });

    it('uses spellCastingAbility from playerStats.spellAbilities when spell has no casting ability', async () => {
      const action = makeAction();
      const ps = makePlayerStats({
        spellAbilities: { spellCastingAbility: 'Charisma', modifier: 5 },
        abilities: [
          { name: 'Wisdom', bonus: 3 },
          { name: 'Charisma', bonus: 5 },
        ],
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 5');
    });
  });

  // ── resolveHealExpression ───────────────────────────────────

  describe('heal expression resolution', () => {
    it('uses heal_at_slot_level for the exact slot level', async () => {
      const action = { ...makeAction(), automation: { slotLevel: 3 } };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('2d6 + 3');
    });

    it('uses higher slot level expression when slot is higher', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', slotLevel: 5 },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('4d6 + 3');
    });

    it('finds highest available slot below requested level', async () => {
      const action = {
        ...makeAction(),
        spell: {
          name: 'Mass Healing Word',
          level: 9,
          heal_at_slot_level: { '3': '2d6 + MOD' },
        },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('2d6 + 3');
    });

    it('falls back to spell level when no heal_at_slot_level exists', async () => {
      const action = {
        ...makeAction(),
        spell: { name: 'Mass Healing Word', level: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Could not resolve heal expression');
    });

    it('uses slotLevel from automation over spell level', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', slotLevel: 7 },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('6d6 + 3');
    });

    it('defaults to spell level 3 when no automation slotLevel', async () => {
      const action = makeAction();
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('2d6 + 3');
    });
  });

  // ── handle: maxTargets ──────────────────────────────────────

  describe('maxTargets handling', () => {
    it('defaults maxTargets to 6 when not specified', async () => {
      const action = makeAction();
      const result = await handle(action, makePlayerStats(), campaignName, null);
      // With 3 creatures and default maxTargets=6: eligible <= maxTargets, so popup (confirm path)
      expect(result.type).toBe('popup');
    });

    it('uses maxTargets from automation config in confirm path', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 4 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);
      // 3 creatures <= 4 maxTargets -> popup (confirm path)
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });

    it('uses maxTargets from automation in confirmMassHealingWord', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 2 },
      };
      const result = await confirmMassHealingWord(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );
      expect(result.payload.results).toHaveLength(2);
    });
  });

  // ── handle: return types ────────────────────────────────────

  describe('handle return types', () => {
    it('returns modal when there are more eligible creatures than maxTargets', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
          { name: 'Rogue', maxHp: 30, currentHp: 10, type: 'player' },
          { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
          { name: 'Wizard', maxHp: 25, currentHp: 15, type: 'player' },
          { name: 'Paladin', maxHp: 50, currentHp: 25, type: 'player' },
          { name: 'Ranger', maxHp: 40, currentHp: 20, type: 'npc' },
          { name: 'Druid', maxHp: 35, currentHp: 10, type: 'npc' },
        ]),
      );
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('massHealingWordTarget');
      expect(result.payload.creatureTargets).toEqual([
        'Fighter', 'Rogue', 'Barbarian', 'Wizard', 'Paladin', 'Ranger', 'Druid',
      ]);
    });

    it('returns confirmMassHealingWord when eligible creatures <= maxTargets', async () => {
      const action = makeAction({ maxTargets: 10 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });

    it('returns popup error when no creatures in combat', async () => {
      getCombatContext.mockResolvedValue(makeCombatSummary([]));
      const action = makeAction();
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });

    it('returns null when combat context is null', async () => {
      getCombatContext.mockResolvedValue(null);
      const action = makeAction();
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('filters out creatures without names', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
          { maxHp: 30, currentHp: 10, type: 'npc' },
          { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
        ]),
      );
      const action = makeAction({ maxTargets: 10 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });

    it('returns popup error when heal expression cannot be resolved', async () => {
      const action = {
        ...makeAction(),
        spell: { name: 'Mass Healing Word', level: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Could not resolve heal expression');
    });
  });

  // ── handle: payload contents (modal path) ───────────────────

  describe('handle modal payload contents', () => {
    it('includes all required fields in modal payload', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
          { name: 'Rogue', maxHp: 30, currentHp: 10, type: 'player' },
          { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
          { name: 'Wizard', maxHp: 25, currentHp: 15, type: 'player' },
        ]),
      );
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBeDefined();
      expect(result.payload.campaignName).toBe(campaignName);
      expect(result.payload.creatureTargets).toEqual(['Fighter', 'Rogue', 'Barbarian', 'Wizard']);
      expect(result.payload.maxTargets).toBe(3);
      expect(result.payload.healExpression).toBe('2d6 + 3');
      expect(result.payload.maximize).toBe(false);
      expect(result.payload.bonusHeal).toBe(0);
      expect(result.payload.bonusDetails).toEqual([]);
      expect(result.payload.slotLevel).toBe(3);
    });
  });

  // ── confirmMassHealingWord: basic healing ───────────────────

  describe('confirmMassHealingWord', () => {
    it('heals each target up to max HP', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
      expect(result.payload.results).toHaveLength(2);
      expect(result.payload.totalHealed).toBeGreaterThan(0);
    });

    it('caps healing at missing HP', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'currentHitPoints') {
          if (name === 'Fighter') return 44;
          if (name === 'Rogue') return 10;
        }
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].healAmount).toBeLessThanOrEqual(1);
    });

    it('respects maxTargets by slicing selected targets', async () => {
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return 20;
        return null;
      });

      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 2 },
      };
      const result = await confirmMassHealingWord(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results).toHaveLength(2);
      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(result.payload.results[1].targetName).toBe('Rogue');
    });

    it('uses player name as sourceName in log entries', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'hp_change',
          targetName: 'Fighter',
          isHealing: true,
          sourceName: 'TestCleric',
          note: 'Mass Healing Word',
        }),
      );
    });

    it('logs with formula including bonus details when present', async () => {
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];
      resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: bonusDetails });

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        5,
        bonusDetails,
        3,
      );

      const logEntry = addEntry.mock.calls[0][1];
      expect(logEntry.formula).toContain('Disciple of Life');
      expect(logEntry.bonusDetails).toEqual(bonusDetails);
    });

    it('logs hp_change for each target', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      const hpLogs = addEntry.mock.calls.filter((call) => call[1].type === 'hp_change');
      expect(hpLogs).toHaveLength(3);
    });

    it('applies healing via applyHealingToTarget for each target when actualHeal > 0', async () => {
      applyHealingToTarget.mockReturnValue({ actualHeal: 12, oldHp: 20, newHp: 32 });

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Fighter',
        12,
        campaignName,
      );
      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Rogue',
        expect.any(Number),
        campaignName,
      );
    });

    it('skips healing when actualHeal is 0 (target at full HP)', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'currentHitPoints') {
          if (name === 'Fighter') return 45;
          if (name === 'Rogue') return 10;
        }
        return null;
      });

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      // Fighter should not receive healing (already at max HP)
      const fighterCalls = applyHealingToTarget.mock.calls.filter(
        (call) => call[1] === 'Fighter',
      );
      expect(fighterCalls).toHaveLength(0);
    });

    it('dispatches combat-summary-updated event', async () => {
      const originalDispatch = window.dispatchEvent;
      const mockDispatch = vi.fn();
      window.dispatchEvent = mockDispatch;

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockDispatch.mock.calls[0][0].type).toBe('combat-summary-updated');

      window.dispatchEvent = originalDispatch;
    });

    it('includes formula in popup result', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.formula).toBe('2d6 + 3');
    });

    it('includes name "Mass Healing Word" in popup result', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.name).toBe('Mass Healing Word');
    });
  });

  // ── confirmMassHealingWord: maximization ────────────────────

  describe('maximization behavior', () => {
    it('uses rollExpressionMaximized when maximize is true', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        true, // maximize
        0,
        [],
        3,
      );

      expect(rollExpressionMaximized).toHaveBeenCalledWith('2d6 + 3');
      expect(rollExpression).not.toHaveBeenCalled();
    });

    it('uses rollExpressionMaximized when hasHealingMaximizationForTarget is true', async () => {
      hasHealingMaximizationForTarget.mockReturnValue(true);

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(rollExpressionMaximized).toHaveBeenCalledWith('2d6 + 3');
      expect(rollExpression).not.toHaveBeenCalled();
    });

    it('uses normal rollExpression when neither maximization flag is set', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(rollExpression).toHaveBeenCalledWith('2d6 + 3');
      expect(rollExpressionMaximized).not.toHaveBeenCalled();
    });

    it('prioritizes per-target maximization over global maximize', async () => {
      hasHealingMaximization.mockReturnValue(false);
      hasHealingMaximizationForTarget.mockReturnValue(true);

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(rollExpressionMaximized).toHaveBeenCalledWith('2d6 + 3');
    });
  });

  // ── confirmMassHealingWord: bonus healing ───────────────────

  describe('bonus healing', () => {
    it('adds bonusHeal to the roll total', async () => {
      const bonusHeal = 5;
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];
      const rollResult = { total: 12, rolls: [5, 4, 3] };
      rollExpression.mockReturnValue(rollResult);

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        bonusHeal,
        bonusDetails,
        3,
      );

      // totalHeal = rollResult.total (12) + bonusHeal (5) = 17
      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Fighter',
        17,
        campaignName,
      );
    });

    it('includes bonusHeal in popup result', async () => {
      const bonusHeal = 5;
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        bonusHeal,
        bonusDetails,
        3,
      );

      expect(result.payload.bonusHeal).toBe(5);
      expect(result.payload.bonusHealDetail).toContain('Disciple of Life');
    });

    it('returns empty bonusHealDetail when no bonus details', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.bonusHealDetail).toBe('');
    });

    it('includes bonus details in log formula', async () => {
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];
      resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: bonusDetails });

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        5,
        bonusDetails,
        3,
      );

      const logEntry = addEntry.mock.calls[0][1];
      // formula should contain the base expression + bonus details
      expect(logEntry.formula).toContain('2d6 + 3');
      expect(logEntry.formula).toContain('Disciple of Life');
    });
  });

  // ── confirmMassHealingWord: Fortified Health ────────────────

  describe('Fortified Health tracking', () => {
    it('calls markFortifiedHealthUsed when healing occurred and Fortified Health bonus is present', async () => {
      const bonusDetails = [{ name: 'Fortified Health', amount: 5 }];

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        5,
        bonusDetails,
        3,
      );

      expect(markFortifiedHealthUsed).toHaveBeenCalledWith(
        makePlayerStats(),
        campaignName,
      );
    });

    it('does not call markFortifiedHealthUsed when no healing occurred', async () => {
      const bonusDetails = [{ name: 'Fortified Health', amount: 5 }];
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'currentHitPoints') {
          if (name === 'Fighter') return 45;
        }
        return null;
      });

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        5,
        bonusDetails,
        3,
      );

      expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
    });

    it('does not call markFortifiedHealthUsed when bonus is not Fortified Health', async () => {
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];

      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        5,
        bonusDetails,
        3,
      );

      expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
    });

    it('does not call markFortifiedHealthUsed when no bonus details at all', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
    });
  });

  // ── confirmMassHealingWord: popup payload structure ─────────

  describe('popup payload structure', () => {
    it('returns correct popup payload structure', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
      expect(result.payload.name).toBe('Mass Healing Word');
      expect(result.payload.formula).toBe('2d6 + 3');
      expect(Array.isArray(result.payload.rolls)).toBe(true);
      expect(Array.isArray(result.payload.results)).toBe(true);
      expect(typeof result.payload.totalHealed).toBe('number');
    });

    it('includes roll details in each result', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(Array.isArray(result.payload.results[0].rolls)).toBe(true);
    });

    it('aggregates all rolls into payload.rolls', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.rolls.length).toBeGreaterThan(0);
    });

    it('excludes rawTotal from payload result (only internal)', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].rawTotal).toBeUndefined();
      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(typeof result.payload.results[0].healAmount).toBe('number');
      expect(Array.isArray(result.payload.results[0].rolls)).toBe(true);
    });
  });

  // ── confirmMassHealingWord: edge cases ──────────────────────

  describe('edge cases', () => {
    it('handles rollExpression returning null (skips target)', async () => {
      rollExpression.mockReturnValue(null);

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      // Should still return results but skip the target with null roll
      expect(result.payload.results).toBeDefined();
    });

    it('handles empty target list gracefully', async () => {
      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        [],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
      expect(result.payload.results).toHaveLength(0);
      expect(result.payload.totalHealed).toBe(0);
    });

    it('handles currentHp as empty string (treats as maxHp)', async () => {
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return '';
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles currentHp as null (treats as maxHp)', async () => {
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return null;
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles combat summary with no maxHp on creature (falls back to player hitPoints)', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', type: 'player' },
        ]),
      );

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles log entry errors gracefully (catches and continues)', async () => {
      const originalConsoleError = console.error;
      const mockError = vi.fn();
      console.error = mockError;

      addEntry.mockRejectedValue(new Error('Log error'));

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(mockError).toHaveBeenCalled();
      expect(result.payload.results).toHaveLength(2);

      console.error = originalConsoleError;
    });

    it('uses automation.maxTargets from action in confirmMassHealingWord', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 2 },
      };
      const result = await confirmMassHealingWord(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results).toHaveLength(2);
    });

    it('handles storedHp as a number string', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'currentHitPoints') {
          if (name === 'Fighter') return '15';
          return '20';
        }
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles negative currentHp gracefully (maxHp - currentHp > maxHp)', async () => {
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return -5;
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      // Should still heal, capping at maxHp
      expect(result.payload.results.length).toBeGreaterThan(0);
    });

    it('handles creature with zero maxHp gracefully (caps at 0 healing)', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 0, currentHp: 0, type: 'player' },
        ]),
      );
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return 0;
        return null;
      });

      const result = await confirmMassHealingWord(
        makeAction(),
        makePlayerStats({ hitPoints: 0 }),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(result.payload.results[0].healAmount).toBe(0);
    });
  });

  // ── Integration: handle → confirm flow ──────────────────────

  describe('handle → confirm flow (few targets)', () => {
    it('returns popup directly when eligible creatures <= maxTargets', async () => {
      const action = makeAction({ maxTargets: 10 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });

    it('returns modal when eligible creatures > maxTargets', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
          { name: 'Rogue', maxHp: 30, currentHp: 10, type: 'player' },
          { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
          { name: 'Wizard', maxHp: 25, currentHp: 15, type: 'player' },
        ]),
      );
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('massHealingWordTarget');
    });

    it('returns popup when exactly maxTargets creatures exist', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', maxHp: 45, currentHp: 20, type: 'player' },
          { name: 'Rogue', maxHp: 30, currentHp: 10, type: 'player' },
          { name: 'Barbarian', maxHp: 60, currentHp: 30, type: 'npc' },
        ]),
      );
      const action = {
        ...makeAction(),
        automation: { type: 'mass_healing_word', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });
  });

  // ── Log entry details ───────────────────────────────────────

  describe('log entry details', () => {
    it('includes correct timestamp in log entry', async () => {
      const before = Date.now();
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );
      const after = Date.now();

      const logEntry = addEntry.mock.calls[0][1];
      expect(typeof logEntry.timestamp).toBe('number');
      expect(logEntry.timestamp).toBeGreaterThanOrEqual(before);
      expect(logEntry.timestamp).toBeLessThanOrEqual(after);
    });

    it('includes maxHp in log entry', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      const logEntry = addEntry.mock.calls[0][1];
      expect(logEntry.maxHp).toBe(45);
    });

    it('includes currentHp (newHp) in log entry', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      const logEntry = addEntry.mock.calls[0][1];
      expect(logEntry.currentHp).toBe(32);
    });

    it('includes delta in log entry', async () => {
      await confirmMassHealingWord(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '2d6 + 3',
        false,
        0,
        [],
        3,
      );

      const logEntry = addEntry.mock.calls[0][1];
      expect(logEntry.delta).toBe(12);
    });
  });
});
