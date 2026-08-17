// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
  rollExpression: vi.fn(),
  rollExpressionDoubled: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../../ui/utils.js', () => ({
  DEBUG_FORCE_CRIT: false,
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, applyFlurryOfBlows } from './bonusAttacksHandler.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { addEntry } from '../../../ui/logService.js';
import { rollD20, rollExpression, rollExpressionDoubled } from '../../../dice/diceRoller.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { getTargetFromAttacker } from '../../../rules/combat/damageUtils.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { endInvisibilityOnHostileAction } from '../../../rules/features/invisibilityService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';
const mapName = 'test-map';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestMonk',
    attacks: [{ hitBonus: 6, damage: '1d6+3', damageType: 'Bludgeoning' }],
    ...overrides,
  };
}

function makeCreature(name, hp = 10, ac = 12) {
  return { name, currentHp: hp, maxHp: hp, ac };
}

function makeCombatSummary(creatures) {
  return { creatures };
}

function mockDefaultDamageResult() {
  applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });
  rollExpression.mockReturnValue({ total: 5, rolls: [3, 2], modifier: 0 });
  rollExpressionDoubled.mockReturnValue({ total: 10, rolls: [3, 2, 3, 2], modifier: 0 });
}

// ── Tests ──────────────────────────────────────────────────────

describe('bonusAttacksHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatSummary.mockReturnValue(null);
    getTargetFromAttacker.mockReturnValue(null);
    getRuntimeValue.mockReturnValue(null);
    mockDefaultDamageResult();
  });

  describe('handle', () => {
    const action = {
      name: 'Heightened Flurry of Blows',
      automation: {
        type: 'bonus_attacks',
        attacks: 3,
        attackType: 'unarmed_strike',
      },
    };

    it('returns popup with automation_info type when no combat context', async () => {
      const result = await handle(action, makePlayerStats(), campaignName, mapName);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe(action.name);
      expect(result.payload.description).toContain('No combat context found');
      expect(result.payload.description).toContain(action.name);
      expect(result.payload.automation).toBe(action.automation);
    });

    it('returns popup when combat has no creatures', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([]));
      const result = await handle(action, makePlayerStats(), campaignName, mapName);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No valid targets found');
    });

    it('returns popup when only the player is in combat', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([makeCreature('TestMonk', 20, 12)]));
      const result = await handle(action, makePlayerStats(), campaignName, mapName);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No valid targets found');
    });

    it('returns modal with creature targets excluding the player', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([
        makeCreature('TestMonk', 20, 12),
        makeCreature('Goblin', 7, 15),
        makeCreature('Orc', 15, 13),
      ]));

      const result = await handle(action, makePlayerStats(), campaignName, mapName);
      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('flurryOfBlows');
      expect(result.payload.creatureTargets).toEqual(['Goblin', 'Orc']);
      expect(result.payload.numAttacks).toBe(3);
      expect(result.payload.attackBonus).toBe(6);
      expect(result.payload.damageFormula).toBe('1d6+3');
      expect(result.payload.damageType).toBe('Bludgeoning');
      expect(result.payload.currentTargetName).toBeNull();
      expect(result.payload.campaignName).toBe(campaignName);
      expect(result.payload.mapName).toBe(mapName);
    });

    it('uses default attack values when playerStats.attacks is undefined', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([makeCreature('Goblin', 7, 15)]));
      const playerStats = makePlayerStats({ attacks: undefined });
      const result = await handle(action, playerStats, campaignName, mapName);
      expect(result.payload.attackBonus).toBe(0);
      expect(result.payload.damageFormula).toBe('1d4+0');
      expect(result.payload.damageType).toBe('Bludgeoning');
    });

    it('uses default attack values when first attack entry is undefined', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([makeCreature('Goblin', 7, 15)]));
      const playerStats = makePlayerStats({ attacks: [undefined] });
      const result = await handle(action, playerStats, campaignName, mapName);
      expect(result.payload.attackBonus).toBe(0);
      expect(result.payload.damageFormula).toBe('1d4+0');
      expect(result.payload.damageType).toBe('Bludgeoning');
    });

    it('passes action and playerStats through in modal payload', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([makeCreature('Goblin', 7, 15)]));
      const playerStats = makePlayerStats();
      const result = await handle(action, playerStats, campaignName, mapName);
      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBe(playerStats);
    });
  });

  describe('applyFlurryOfBlows', () => {
    const action = {
      name: 'Heightened Flurry of Blows',
      automation: {
        type: 'bonus_attacks',
        attacks: 3,
      },
    };

    const combatSummary = makeCombatSummary([
      makeCreature('TestMonk', 20, 12),
      makeCreature('Goblin', 7, 15),
      makeCreature('Orc', 15, 13),
    ]);

    it('returns null when distribution is falsy', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      const result = await applyFlurryOfBlows(action, makePlayerStats(), campaignName, mapName, null, 3);
      expect(result).toBeNull();
    });

    it('returns null when combat summary is unavailable', async () => {
      getCombatSummary.mockReturnValue(null);
      const result = await applyFlurryOfBlows(action, makePlayerStats(), campaignName, mapName, { Goblin: 1 }, 1);
      expect(result).toBeNull();
    });

    it('skips targets with 0 attacks and logs ability use', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      const result = await applyFlurryOfBlows(action, makePlayerStats(), campaignName, mapName, { Goblin: 0, Orc: 3 }, 3);
      expect(result.type).toBe('popup');
      expect(addEntry).toHaveBeenCalled();
      const abilityUseEntry = addEntry.mock.calls.find(
        call => call[1].type === 'ability_use'
      );
      expect(abilityUseEntry).toBeDefined();
      expect(abilityUseEntry[1].description).toContain('making 3 unarmed strikes');
      expect(abilityUseEntry[1].description).toContain('Total damage dealt: 0');
    });

    it('performs correct number of attacks per target', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20)
        .mockReturnValueOnce(18)
        .mockReturnValueOnce(12)
        .mockReturnValueOnce(20);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 2, Orc: 1 },
        3
      );

      expect(rollD20).toHaveBeenCalledTimes(3);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('3/3 hits');
      expect(result.payload.description).toContain('1 critical');
    });

    it('returns popup with summary fields', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe(action.name);
    });

    it('includes detailed attack results for hits, misses, and crits', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20)
        .mockReturnValueOnce(1)   // natural 1 → auto miss
        .mockReturnValueOnce(20)  // natural 20 → crit
        .mockReturnValueOnce(10); // normal hit (6+10=16 >= 15)

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1, Orc: 2 },
        3
      );

      const desc = result.payload.description;
      expect(desc).toContain('Miss');
      expect(desc).toContain('CRIT');
      expect(desc).toContain('Hit');
      expect(desc).toContain('AC 15');
      expect(desc).toContain('AC 13');
      expect(desc).toContain('doubled dice');
      expect(desc).toContain('Bludgeoning');
      expect(desc).toContain('d20: 1 + 6 = 7');
      expect(desc).toContain('d20: 20 + 6 = 26');
    });

    it('does not deal damage on natural 1 (auto miss)', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(1);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(applyDamageToTarget).not.toHaveBeenCalled();
    });

    it('uses doubled damage dice on natural 20 (crit)', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(20);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(rollExpressionDoubled).toHaveBeenCalledWith('1d6+3');
      expect(rollExpression).not.toHaveBeenCalled();
    });

    it('uses normal damage dice on non-crit hit', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(15);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(rollExpression).toHaveBeenCalledWith('1d6+3');
      expect(rollExpressionDoubled).not.toHaveBeenCalled();
    });

    it('includes openHandTargets when player has open_hand_technique and hits', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      const actionWithOpenHand = {
        name: 'Flurry of Blows',
        automation: {
          type: 'bonus_attacks',
          attacks: 1,
        },
      };

      const playerStatsWithOpenHand = makePlayerStats({
        automation: {
          actions: [
            { type: 'open_hand_technique', name: 'Open Hand Technique' },
          ],
        },
      });

      const result = await applyFlurryOfBlows(
        actionWithOpenHand,
        playerStatsWithOpenHand,
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.openHandTargets).toEqual([
        {
          targetName: 'Goblin',
          action: { type: 'open_hand_technique', name: 'Open Hand Technique' },
          playerStats: playerStatsWithOpenHand,
          campaignName,
          mapName,
        },
      ]);
    });

    it('does not include openHandTargets when player lacks open_hand_technique', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.openHandTargets).toBeUndefined();
    });

    it('does not include openHandTargets when attack misses', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(1);

      const actionWithOpenHand = {
        name: 'Flurry of Blows',
        automation: {
          type: 'bonus_attacks',
          attacks: 1,
        },
      };

      const playerStatsWithOpenHand = makePlayerStats({
        automation: {
          actions: [
            { type: 'open_hand_technique', name: 'Open Hand Technique' },
          ],
        },
      });

      const result = await applyFlurryOfBlows(
        actionWithOpenHand,
        playerStatsWithOpenHand,
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.openHandTargets).toBeUndefined();
    });

    it('includes openHandTargets when attack hits even if damage is 0', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 7 });

      const actionWithOpenHand = {
        name: 'Flurry of Blows',
        automation: {
          type: 'bonus_attacks',
          attacks: 1,
        },
      };

      const playerStatsWithOpenHand = makePlayerStats({
        automation: {
          actions: [
            { type: 'open_hand_technique', name: 'Open Hand Technique' },
          ],
        },
      });

      const result = await applyFlurryOfBlows(
        actionWithOpenHand,
        playerStatsWithOpenHand,
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.openHandTargets).toEqual([
        {
          targetName: 'Goblin',
          action: { type: 'open_hand_technique', name: 'Open Hand Technique' },
          playerStats: playerStatsWithOpenHand,
          campaignName,
          mapName,
        },
      ]);
    });

    it('only includes openHandTargets once per target even with multiple hits', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      const actionWithOpenHand = {
        name: 'Flurry of Blows',
        automation: {
          type: 'bonus_attacks',
          attacks: 3,
        },
      };

      const playerStatsWithOpenHand = makePlayerStats({
        automation: {
          actions: [
            { type: 'open_hand_technique', name: 'Open Hand Technique' },
          ],
        },
      });

      const result = await applyFlurryOfBlows(
        actionWithOpenHand,
        playerStatsWithOpenHand,
        campaignName,
        mapName,
        { Goblin: 3 },
        3
      );

      expect(result.openHandTargets).toHaveLength(1);
      expect(result.openHandTargets[0].targetName).toBe('Goblin');
    });

    it('skips targets in distribution that are not in combat', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { UnknownEnemy: 2, Goblin: 1 },
        3
      );

      expect(rollD20).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('popup');
    });

    it('skips self when self appears in distribution', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { TestMonk: 2, Goblin: 1 },
        3
      );

      expect(rollD20).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('popup');
    });

    it('calls applyDamageToTarget with correct arguments on hit', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(applyDamageToTarget).toHaveBeenCalledWith(
        combatSummary,
        'Goblin',
        5,
        ['Bludgeoning'],
        campaignName,
        [],
        false,
        'TestMonk'
      );
    });

    it('logs attack roll entry for each attack', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      const attackEntries = addEntry.mock.calls.filter(
        call => call[1].rollType === 'attack'
      );
      expect(attackEntries.length).toBe(1);
      expect(attackEntries[0][1].characterName).toBe('TestMonk');
      expect(attackEntries[0][1].targetName).toBe('Goblin');
      expect(attackEntries[0][1].targetAc).toBe(15);
      expect(attackEntries[0][1].hit).toBe(true);
    });

    it('logs damage and hp_change entries on hit with damage', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      const damageEntries = addEntry.mock.calls.filter(
        call => call[1].rollType === 'damage'
      );
      const hpEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'hp_change'
      );
      expect(damageEntries.length).toBe(1);
      expect(hpEntries.length).toBe(1);
      expect(hpEntries[0][1].delta).toBe(-4);
      expect(hpEntries[0][1].sourceName).toBe('TestMonk');
    });

    it('does not log damage or hp_change on miss', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(1);

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      const damageEntries = addEntry.mock.calls.filter(
        call => call[1].rollType === 'damage'
      );
      const hpEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'hp_change'
      );
      expect(damageEntries.length).toBe(0);
      expect(hpEntries.length).toBe(0);
    });

    it('handles creatures with missing ac/defaulting to 10', async () => {
      getCombatSummary.mockReturnValue(makeCombatSummary([
        makeCreature('TestMonk', 20, 12),
        { name: 'Mystery', currentHp: 5, maxHp: 5 },
      ]));
      vi.mocked(rollD20).mockReturnValue(12);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Mystery: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('AC 10');
    });

    it('handles null/undefined applyDamageToTarget result gracefully', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue(null);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('0 damage');
    });

    it('handles null/undefined rollExpression result gracefully', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      rollExpression.mockReturnValue(null);
      applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 7 });

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('0 damage');
    });

    it('ends invisibility when dealing damage > 0', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith(
        'TestMonk',
        campaignName
      );
    });

    it('does not end invisibility when damage is 0', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 0, newHp: 7 });

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(endInvisibilityOnHostileAction).not.toHaveBeenCalled();
    });

    it('uses playerStats.automation.actions for open_hand_technique lookup', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      const playerStatsNoAutomation = makePlayerStats({ automation: undefined });

      const result = await applyFlurryOfBlows(
        action,
        playerStatsNoAutomation,
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.openHandTargets).toBeUndefined();
    });

    it('uses playerStats.automation.actions without actions array', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      const playerStatsNoActions = makePlayerStats({ automation: {} });

      const result = await applyFlurryOfBlows(
        action,
        playerStatsNoActions,
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.openHandTargets).toBeUndefined();
    });

    it('reports correct pluralization for crit count in description', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(20);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.payload.description).toContain('1 critical');
    });

    it('reports plural "criticals" when multiple crits', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(20);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 2 },
        2
      );

      expect(result.payload.description).toContain('2 criticals');
    });

    it('reports "0 criticals" when no crits', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(10);

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1 },
        1
      );

      expect(result.payload.description).toContain('0 criticals');
    });

    it('accumulates total damage across multiple targets', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      const result = await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 1, Orc: 1 },
        2
      );

      expect(result.payload.description).toContain('2 hits');
      expect(result.payload.description).toContain('8 damage');
    });

    it('logs ability_use entry with correct summary', async () => {
      getCombatSummary.mockReturnValue(combatSummary);
      vi.mocked(rollD20).mockReturnValue(18);
      applyDamageToTarget.mockReturnValue({ finalDamage: 4, newHp: 6 });

      await applyFlurryOfBlows(
        action,
        makePlayerStats(),
        campaignName,
        mapName,
        { Goblin: 2 },
        2
      );

      const abilityEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'ability_use'
      );
      expect(abilityEntries.length).toBe(1);
      expect(abilityEntries[0][1].abilityName).toBe(action.name);
      expect(abilityEntries[0][1].description).toContain('2 unarmed strikes');
      expect(abilityEntries[0][1].description).toContain('Total damage dealt: 8');
    });
  });
});
