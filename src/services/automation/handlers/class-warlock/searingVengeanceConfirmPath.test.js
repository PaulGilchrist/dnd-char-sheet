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

import { confirmSearingVengeance } from './searingVengeanceHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as diceRoller from '../../../dice/diceRoller.js';
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

function mockRuntimeValues(values) {
  useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
    if (key === 'searingvengeanceUses') return values.searingvengeanceUses;
    if (key === 'targetEffects') return values.targetEffects;
    if (key === 'currentHitPoints') return values.currentHitPoints;
    if (key === 'hitPoints') return values.hitPoints;
    if (key === 'activeConditions') return values.activeConditions;
    return null;
  });
}

describe('confirmSearingVengeance - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when selectedTargets is null', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1 });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: null,
    };

    const result = await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('no creatures selected');
    expect(damageUtils.getCombatContext).not.toHaveBeenCalled();
  });

  it('returns early when selectedTargets is undefined', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1 });

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

    const result = await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('no creatures selected');
    expect(damageUtils.getCombatContext).not.toHaveBeenCalled();
  });

  it('returns popup when no combat active during confirm', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1 });
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
      selectedTargets: ['Goblin'],
    };

    const result = await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toBe('No combat active.');
  });

  it('skips adding blinded condition if creature already has it', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: ['blinded'] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 12, rolls: [6, 6] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    // Should NOT add blinded again since it already exists
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
      'Goblin',
      'activeConditions',
      expect.arrayContaining(['blinded']),
      campaignName
    );
  });

  it('uses default damageType when automation.damageType is not set', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: [] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [5, 5] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    // The log entry at line 206 uses automation.damageType || 'Radiant'
    expect(addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        damageType: 'Radiant',
      })
    );
  });

  it('handles creature not found in combat context for hp_change log', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: [] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [5, 5] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    // hp_change log should use fallback 0 when creature not found
    expect(addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        type: 'hp_change',
        targetName: 'Goblin',
        currentHp: 0,
        maxHp: 0,
      })
    );
  });

  it('handles storedConditions being null', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((_subject, key, _campaign) => {
      if (key === 'searingvengeanceUses') return 1;
      if (key === 'activeConditions') return null;
      return null;
    });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [5, 5] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    // Should treat null conditions as empty array and add blinded
    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Goblin',
      'activeConditions',
      ['blinded'],
      campaignName
    );
  });

  it('handles rollExpression returning undefined total', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: [] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 0, rolls: [] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    const result = await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('0 radiant damage');
  });

  it('handles CHA modifier from abilityModifiers when computedStats is missing', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: [] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 15, rolls: [7, 8] });

    const automation = {
      damageExpression: '2d8 + CHA modifier',
      damageType: 'Radiant',
      usesMax: 1,
    };

    const playerStats = {
      name: 'TestWarlock',
      abilityModifiers: { CHA: 5 },
    };

    const payload = {
      name: 'Searing Vengeance',
      targetName: 'Ally',
      healAmount: 25,
      selectedTargets: ['Goblin'],
    };

    await confirmSearingVengeance(
      automation,
      playerStats,
      campaignName,
      null,
      [],
      payload
    );

    expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d8+5');
  });

  it('continues and logs ability_use even when addEntry rejects for damage log', async () => {
    mockRuntimeValues({ searingvengeanceUses: 1, activeConditions: [] });
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 10, maxHp: 20 },
      ],
    });
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [5, 5] });
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
      selectedTargets: ['Goblin'],
    };

    const result = await confirmSearingVengeance(
      automation,
      makePlayerStats(),
      campaignName,
      null,
      [],
      payload
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Searing Vengeance');
  });
});
