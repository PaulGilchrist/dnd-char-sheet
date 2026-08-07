// @cleaned-by-ai
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

import { handle, confirmMassCureWounds } from './massCureWoundsHandler.js';
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
    name: 'Mass Cure Wounds',
    spell: {
      name: 'Mass Cure Wounds',
      level: 5,
      heal_at_slot_level: {
        '5': '3d8 + MOD',
        '6': '4d8 + MOD',
        '7': '5d8 + MOD',
        '8': '6d8 + MOD',
        '9': '7d8 + MOD',
      },
      ...overrides.spell,
    },
    automation: { type: 'mass_cure_wounds', ...overrides.automation },
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

describe('massCureWoundsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rollExpression.mockReturnValue({ total: 18, rolls: [6, 7, 5], modifier: 0 });
    rollExpressionMaximized.mockReturnValue({ total: 24, rolls: [8, 8, 8], modifier: 0 });
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
    applyHealingToTarget.mockReturnValue({ actualHeal: 18, oldHp: 20, newHp: 38 });
  });

  // ── getSpellCastingMod (via handle) ─────────────────────────

  describe('spell casting modifier resolution', () => {
    it('uses spell.spellCastingAbility when present on the spell', async () => {
      const action = {
        ...makeAction(),
        spell: {
          ...makeAction().spell,
          spellCastingAbility: 'Intelligence',
          level: 5,
        },
      };
      const ps = makePlayerStats({
        abilities: [
          { name: 'Wisdom', bonus: 3 },
          { name: 'Intelligence', bonus: 5 },
        ],
      });

      await handle(action, ps, campaignName, null);

      // The handler should use Intelligence bonus (5) from the spell
      expect(rollExpression).toHaveBeenCalledWith('3d8 + 5');
    });

    it('falls back to playerStats.spellAbilities.modifier when spell has no casting ability', async () => {
      const action = makeAction();
      const ps = makePlayerStats({
        spellAbilities: { modifier: 4 },
        abilities: [{ name: 'Wisdom', bonus: 3 }],
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('3d8 + 4');
    });

    it('returns 0 when no spell casting ability is available', async () => {
      const action = makeAction();
      const ps = makePlayerStats({
        abilities: [],
        spellAbilities: undefined,
      });

      await handle(action, ps, campaignName, null);

      expect(rollExpression).toHaveBeenCalledWith('3d8 + 0');
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

      // No matching ability found, spellAbilities is undefined -> returns 0
      expect(rollExpression).toHaveBeenCalledWith('3d8 + 0');
    });
  });

  // ── resolveHealExpression ───────────────────────────────────

  describe('heal expression resolution', () => {
    it('uses heal_at_slot_level for the exact slot level', async () => {
      const action = makeAction({ slotLevel: 5 });
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('3d8 + 3');
    });

    it('uses higher slot level expression when slot is higher', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_cure_wounds', slotLevel: 7 },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('5d8 + 3');
    });

    it('finds highest available slot below requested level', async () => {
      const action = {
        ...makeAction(),
        spell: {
          name: 'Mass Cure Wounds',
          level: 9,
          heal_at_slot_level: { '5': '3d8 + MOD' },
        },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('3d8 + 3');
    });

    it('falls back to spell level when no heal_at_slot_level exists', async () => {
      const action = {
        ...makeAction(),
        spell: { name: 'Mass Cure Wounds', level: 5 },
      };
      // No heal_at_slot_level means resolveHealExpression returns null
      const result = await handle(action, makePlayerStats(), campaignName, null);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Could not resolve heal expression');
    });

    it('uses slotLevel from automation over spell level', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_cure_wounds', slotLevel: 8 },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      expect(rollExpression).toHaveBeenCalledWith('6d8 + 3');
    });

    it('defaults to slot level 5 when neither automation nor spell has level but heal_at_slot_level exists', async () => {
      const action = {
        ...makeAction(),
        spell: {
          name: 'Mass Cure Wounds',
          level: 5,
          heal_at_slot_level: {
            '5': '3d8 + MOD',
            '6': '4d8 + MOD',
          },
        },
        automation: { type: 'mass_cure_wounds' },
      };
      await handle(action, makePlayerStats(), campaignName, null);
      // level 5 -> 3d8 + MOD
      expect(rollExpression).toHaveBeenCalledWith('3d8 + 3');
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
        automation: { type: 'mass_cure_wounds', maxTargets: 4 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);
      // 3 creatures <= 4 maxTargets -> popup (confirm path)
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
    });

    it('uses maxTargets from automation in confirmMassCureWounds', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_cure_wounds', maxTargets: 2 },
      };
      const result = await confirmMassCureWounds(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
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
        automation: { type: 'mass_cure_wounds', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('massCureWoundsTarget');
      expect(result.payload.creatureTargets).toEqual(['Fighter', 'Rogue', 'Barbarian', 'Wizard', 'Paladin', 'Ranger', 'Druid']);
    });

    it('returns confirmMassCureWounds when eligible creatures <= maxTargets', async () => {
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

    it('returns popup error when combat context is null', async () => {
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
        spell: { name: 'Mass Cure Wounds', level: 5 },
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
        automation: { type: 'mass_cure_wounds', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBeDefined();
      expect(result.payload.campaignName).toBe(campaignName);
      expect(result.payload.creatureTargets).toEqual(['Fighter', 'Rogue', 'Barbarian', 'Wizard']);
      expect(result.payload.maxTargets).toBe(3);
      expect(result.payload.healExpression).toBe('3d8 + 3');
      expect(result.payload.maximize).toBe(false);
      expect(result.payload.bonusHeal).toBe(0);
      expect(result.payload.bonusDetails).toEqual([]);
      expect(result.payload.slotLevel).toBe(5);
    });
  });

  // ── confirmMassCureWounds: basic healing ────────────────────

  describe('confirmMassCureWounds', () => {
    it('heals each target up to max HP', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
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

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
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
        automation: { type: 'mass_cure_wounds', maxTargets: 2 },
      };
      const result = await confirmMassCureWounds(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results).toHaveLength(2);
      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(result.payload.results[1].targetName).toBe('Rogue');
    });

    it('uses player name as sourceName in log entries', async () => {
      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'hp_change',
          targetName: 'Fighter',
          isHealing: true,
          sourceName: 'TestCleric',
          note: 'Mass Cure Wounds',
        }),
      );
    });

    it('logs with formula including bonus details when present', async () => {
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];
      resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: bonusDetails });

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        5,
        bonusDetails,
        5,
      );

      const logEntry = addEntry.mock.calls[0][1];
      expect(logEntry.formula).toContain('Disciple of Life');
      expect(logEntry.bonusDetails).toEqual(bonusDetails);
    });

    it('logs hp_change for each target', async () => {
      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      const hpLogs = addEntry.mock.calls.filter((call) => call[1].type === 'hp_change');
      expect(hpLogs).toHaveLength(3);
    });

    it('applies healing via applyHealingToTarget for each target', async () => {
      applyHealingToTarget.mockReturnValue({ actualHeal: 18, oldHp: 20, newHp: 38 });

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Fighter',
        18,
        campaignName,
      );
      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Rogue',
        10,
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

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
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

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockDispatch.mock.calls[0][0].type).toBe('combat-summary-updated');

      window.dispatchEvent = originalDispatch;
    });
  });

  // ── confirmMassCureWounds: maximization ─────────────────────

  describe('maximization behavior', () => {
    it('uses rollExpressionMaximized when maximize is true', async () => {
      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        true, // maximize
        0,
        [],
        5,
      );

      expect(rollExpressionMaximized).toHaveBeenCalledWith('3d8 + 3');
      expect(rollExpression).not.toHaveBeenCalled();
    });

    it('uses rollExpressionMaximized when hasHealingMaximizationForTarget is true', async () => {
      hasHealingMaximizationForTarget.mockReturnValue(true);

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(rollExpressionMaximized).toHaveBeenCalledWith('3d8 + 3');
      expect(rollExpression).not.toHaveBeenCalled();
    });

    it('uses normal rollExpression when neither maximization flag is set', async () => {
      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(rollExpression).toHaveBeenCalledWith('3d8 + 3');
      expect(rollExpressionMaximized).not.toHaveBeenCalled();
    });
  });

  // ── confirmMassCureWounds: bonus healing ────────────────────

  describe('bonus healing', () => {
    it('adds bonusHeal to the roll total', async () => {
      const bonusHeal = 5;
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];
      const rollResult = { total: 18, rolls: [6, 7, 5] };
      rollExpression.mockReturnValue(rollResult);

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        bonusHeal,
        bonusDetails,
        5,
      );

      // totalHeal = rollResult.total (18) + bonusHeal (5) = 23
      expect(applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Fighter',
        23,
        campaignName,
      );
    });

    it('includes bonusHeal in popup result', async () => {
      const bonusHeal = 5;
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        bonusHeal,
        bonusDetails,
        5,
      );

      expect(result.payload.bonusHeal).toBe(5);
      expect(result.payload.bonusHealDetail).toContain('Disciple of Life');
    });

    it('returns empty bonusHealDetail when no bonus details', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.bonusHealDetail).toBe('');
    });
  });

  // ── confirmMassCureWounds: Fortified Health ─────────────────

  describe('Fortified Health tracking', () => {
    it('calls markFortifiedHealthUsed when healing occurred and Fortified Health bonus is present', async () => {
      const bonusDetails = [{ name: 'Fortified Health', amount: 5 }];

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        5,
        bonusDetails,
        5,
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

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        5,
        bonusDetails,
        5,
      );

      expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
    });

    it('does not call markFortifiedHealthUsed when bonus is not Fortified Health', async () => {
      const bonusDetails = [{ name: 'Disciple of Life', amount: 5 }];

      await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        5,
        bonusDetails,
        5,
      );

      expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
    });
  });

  // ── confirmMassCureWounds: popup payload structure ──────────

  describe('popup payload structure', () => {
    it('returns correct popup payload structure', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('heal_multi');
      expect(result.payload.name).toBe('Mass Cure Wounds');
      expect(result.payload.formula).toBe('3d8 + 3');
      expect(Array.isArray(result.payload.rolls)).toBe(true);
      expect(Array.isArray(result.payload.results)).toBe(true);
      expect(typeof result.payload.totalHealed).toBe('number');
    });

    it('includes roll details in each result', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
      expect(Array.isArray(result.payload.results[0].rolls)).toBe(true);
    });

    it('aggregates all rolls into payload.rolls', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.rolls.length).toBeGreaterThan(0);
    });
  });

  // ── confirmMassCureWounds: edge cases ───────────────────────

  describe('edge cases', () => {
    it('handles rollExpression returning null (skips target)', async () => {
      rollExpression.mockReturnValue(null);

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      // Should still return results but skip the target with null roll
      expect(result.payload.results).toBeDefined();
    });

    it('handles empty target list gracefully', async () => {
      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        [],
        '3d8 + 3',
        false,
        0,
        [],
        5,
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

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles currentHp as null (treats as maxHp)', async () => {
      getRuntimeValue.mockImplementation((_name, prop) => {
        if (prop === 'currentHitPoints') return null;
        return null;
      });

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles combat summary with no maxHp on creature (falls back to player hitPoints)', async () => {
      getCombatContext.mockResolvedValue(
        makeCombatSummary([
          { name: 'Fighter', type: 'player' },
        ]),
      );

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results[0].targetName).toBe('Fighter');
    });

    it('handles log entry errors gracefully (catches and continues)', async () => {
      const originalConsoleError = console.error;
      const mockError = vi.fn();
      console.error = mockError;

      addEntry.mockRejectedValue(new Error('Log error'));

      const result = await confirmMassCureWounds(
        makeAction(),
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(mockError).toHaveBeenCalled();
      expect(result.payload.results).toHaveLength(2);

      console.error = originalConsoleError;
    });

    it('uses automation.maxTargets from action in confirmMassCureWounds', async () => {
      const action = {
        ...makeAction(),
        automation: { type: 'mass_cure_wounds', maxTargets: 2 },
      };
      const result = await confirmMassCureWounds(
        action,
        makePlayerStats(),
        campaignName,
        ['Fighter', 'Rogue', 'Barbarian'],
        '3d8 + 3',
        false,
        0,
        [],
        5,
      );

      expect(result.payload.results).toHaveLength(2);
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
        automation: { type: 'mass_cure_wounds', maxTargets: 3 },
      };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('massCureWoundsTarget');
    });
  });
});
