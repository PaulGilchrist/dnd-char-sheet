// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
  default: {
    set: vi.fn(),
  },
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn(async () => true),
}));

import { handle, skipSearingVengeance } from './searingVengeanceHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import storage from '../../../ui/storage.js';

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWarlock',
    level: 14,
    hitPoints: { max: 70 },
    currentHitPoints: 50,
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Searing Vengeance',
    automation: {
      healExpression: 'floor(target_max_hp / 2)',
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      range: '30_ft',
      condition: 'blinded',
      conditionDuration: 'until_end_of_current_turn',
      uses: 1,
      usesMax: 1,
      recharge: 'long_rest',
      casting_time: '1 reaction',
      trigger: 'death_save_by_ally_or_self',
      allyRange: '60_ft',
      ...automation,
    },
  };
}

describe('searingVengeanceHandler.handle - NPC path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resource validation', () => {
    it('returns a popup when uses are exhausted', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 0;
        return null;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('has no uses remaining');
      expect(result.payload.description).toContain('Long Rest');
    });
  });

  describe('creature at 0 HP check', () => {
    it('returns a popup when no creatures are at 0 HP', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 10, maxHp: 50 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures within 60 feet are at 0 HP');
    });

    it('heals an NPC creature and updates combatSummary storage', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'targetEffects') return [];
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.targetName).toBe('Ally');
      expect(result.payload.healAmount).toBe(25);
      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Ally',
        'activeConditions',
        [],
        campaignName
      );
      expect(damageUtils.getCombatContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('range filtering', () => {
    it('uses default allyRange of 60ft when auto.allyRange is not set', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
        ],
      });

      const action = makeAction({ allyRange: undefined });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.targetName).toBe('Ally');
      expect(result.payload.healAmount).toBe(25);
    });

    it('uses custom allyRange when auto.allyRange is set', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
        ],
      });

      const action = makeAction({ allyRange: '120_ft' });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.targetName).toBe('Ally');
    });

    it('uses custom range when auto.range is set', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      const action = makeAction({ range: '60_ft' });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
    });
  });

  describe('creature targets exclusion', () => {
    it('excludes the NPC target from creature targets', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'currentHitPoints') return null;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.targetName).toBe('Ally');
      expect(result.payload.creatureTargets).not.toContainEqual(
        expect.objectContaining({ name: 'Ally' })
      );
      expect(result.payload.creatureTargets).toEqual([
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
      ]);
    });

    it('excludes the player target from creature targets when player is at 0 HP', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'currentHitPoints' && _subject === 'TestWarlock') return 0;
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
          { name: 'TestWarlock', type: 'player', currentHp: 0, maxHp: 70 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.targetName).toBe('Ally');
      expect(result.payload.creatureTargets).not.toContainEqual(
        expect.objectContaining({ name: 'Ally' })
      );
      expect(result.payload.creatureTargets).not.toContainEqual(
        expect.objectContaining({ name: 'TestWarlock' })
      );
    });
  });

  describe('combatSummary storage', () => {
    it('calls storage.set with updated combatSummary for NPC targets', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
        if (key === 'searingvengeanceUses') return 1;
        if (key === 'targetEffects') return [];
        if (key === 'currentHitPoints' && _subject === 'Ally') return 0;
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
          { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
        ],
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(storage.set).toHaveBeenCalledWith(
        'combatSummary',
        expect.objectContaining({
          creatures: expect.arrayContaining([
            expect.objectContaining({ name: 'Ally', currentHp: 25 }),
          ]),
        }),
        campaignName
      );
    });
  });
});

describe('skipSearingVengeance - NPC path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears conditions and consumes a use for NPC target', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
      ],
    });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
    };

    const result = await skipSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('heals for 25 HP');
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'TestWarlock',
      'searingvengeanceUses',
      0,
      campaignName
    );
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Ally',
      'activeConditions',
      [],
      campaignName
    );
  });

  it('clears conditions and consumes a use when target not found in combat', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'MissingTarget',
      healAmount: 25,
    };

    const result = await skipSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('heals for 25 HP');
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'MissingTarget',
      'activeConditions',
      [],
      campaignName
    );
  });
});
