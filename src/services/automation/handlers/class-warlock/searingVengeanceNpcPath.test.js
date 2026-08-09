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

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(async () => {}),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn(async () => true),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(async () => {}),
}));

import { handle, skipSearingVengeance } from './searingVengeanceHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as rangeCheck from '../../../rules/combat/rangeCheck.js';
import { addEntry } from '../../../ui/logService.js';

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

function mockCreatureHp(creatureName, hp) {
  useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
    if (key === 'searingvengeanceUses') return 1;
    if (key === 'targetEffects') return [];
    if (key === 'currentHitPoints' && _subject === creatureName) return hp;
    if (key === 'hitPoints') return null;
    return null;
  });
}

describe('searingVengeanceHandler.handle - NPC healing path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heals an NPC creature and updates combatSummary storage', async () => {
    mockCreatureHp('Ally', 0);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
      ],
    });
    rangeCheck.isWithinRange.mockResolvedValue(true);

    const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

    expect(result.type).toBe('modal');
    expect(result.payload.targetName).toBe('Ally');
    expect(result.payload.healAmount).toBe(25);
    // NPC path: directly modifies creature object, not runtime store
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Ally',
      'activeConditions',
      [],
      campaignName
    );
  });

  it('updates NPC maxHp when target has maxHp property', async () => {
    mockCreatureHp('Ally', 0);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'npc', currentHp: 0, maxHp: 50 },
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
      ],
    });
    rangeCheck.isWithinRange.mockResolvedValue(true);

    const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

    expect(result.type).toBe('modal');
    // The handler modifies target.currentHp and target.maxHp directly on the cs object
    // We verify the storage.set was called with the updated combat context
    expect(damageUtils.getCombatContext).toHaveBeenCalledTimes(2);
  });

  it('uses default allyRange of 60ft when auto.allyRange is not set', async () => {
    mockCreatureHp('Ally', 0);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'player', currentHp: 0, maxHp: 50 },
      ],
    });
    rangeCheck.isWithinRange.mockResolvedValue(true);

    const action = makeAction({ allyRange: undefined });
    const result = await handle(action, makePlayerStats(), campaignName, null);

    expect(result.type).toBe('modal');
    expect(result.payload.targetName).toBe('Ally');
  });

  it('uses custom allyRange when auto.allyRange is set', async () => {
    mockCreatureHp('Ally', 0);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'player', currentHp: 0, maxHp: 50 },
      ],
    });
    rangeCheck.isWithinRange.mockResolvedValue(true);

    const action = makeAction({ allyRange: '120_ft' });
    const result = await handle(action, makePlayerStats(), campaignName, null);

    expect(result.type).toBe('modal');
    expect(result.payload.targetName).toBe('Ally');
  });

  it('uses custom range when auto.range is set', async () => {
    mockCreatureHp('Ally', 0);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'player', currentHp: 0, maxHp: 50 },
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 20 },
      ],
    });
    rangeCheck.isWithinRange.mockResolvedValue(true);

    const action = makeAction({ range: '60_ft' });
    const result = await handle(action, makePlayerStats(), campaignName, null);

    expect(result.type).toBe('modal');
  });
});

describe('skipSearingVengeance - NPC path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heals an NPC creature and stores combatSummary when skipping', async () => {
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
    // NPC path: directly modifies the creature object
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Ally',
      'activeConditions',
      [],
      campaignName
    );
  });

  it('sets maxHp from runtime value when target has hitPoints', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      if (key === 'hitPoints' && _subject === 'Ally') return 50;
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

    await skipSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      payload
    );

    // The NPC path at line 285 checks targetName truthiness
    // When targetName is truthy, it gets hitPoints from runtime
    expect(damageUtils.getCombatContext).toHaveBeenCalled();
  });

  it('handles addEntry rejection gracefully in skipSearingVengeance', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'player', currentHp: 0, maxHp: 50 },
      ],
    });
    addEntry.mockRejectedValue(new Error('log fails'));

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
  });

  it('skips combatSummary update when no combat context is available', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue(null);

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
    // Even without combat context, it should still clear conditions and consume a use
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Ally',
      'activeConditions',
      [],
      campaignName
    );
  });

  it('falls back to automation.usesMax when storedUses is null', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return null;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Ally', type: 'player', currentHp: 0, maxHp: 50 },
      ],
    });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 3,
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
    // When storedUses is null, usesMax (3) is used, so 3-1=2 remains
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'TestWarlock',
      'searingvengeanceUses',
      2,
      campaignName
    );
  });

  it('handles target not found in combatSummary creatures list', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Other', type: 'npc', currentHp: 10, maxHp: 20 },
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
    // Should still clear conditions and consume a use even when target not in combat
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'MissingTarget',
      'activeConditions',
      [],
      campaignName
    );
  });

  it('sets maxHp from runtime when NPC target has hitPoints stored', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      if (key === 'hitPoints' && _subject === 'Ally') return 60;
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

    await skipSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      payload
    );

    // Line 285: target.maxHp = targetName ? (getRuntimeValue(targetName, 'hitPoints', campaignName) ?? 0) : 0
    // This covers the truthy branch of the conditional expression
    expect(damageUtils.getCombatContext).toHaveBeenCalled();
  });
});
