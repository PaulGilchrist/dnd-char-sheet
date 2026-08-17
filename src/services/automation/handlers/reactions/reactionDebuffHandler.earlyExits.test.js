// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './reactionDebuffHandler.js';

vi.mock('../../common/targetResolver.js', () => ({
  resolveTarget: vi.fn(),
  resolveMapPositions: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
  rangeToFeet: vi.fn(),
  getDistanceFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  findLastAttack: vi.fn().mockResolvedValue({
    attackEvent: null,
    attackerName: null,
    targetName: null,
    primaryDamage: 0,
    secondaryDamage: 0,
    totalDamage: 0,
    damageTypes: [],
  }),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../common/infoPopup.js', () => ({
  infoPopup: vi.fn().mockImplementation((name, description, automation, extraProps) => {
    const result = {
      type: 'popup',
      payload: {
        type: 'automation_info',
        name,
        description,
        automation,
      },
    };
    if (extraProps) {
      Object.assign(result, extraProps);
    }
    return result;
  }),
}));

import * as targetResolver from '../../common/targetResolver.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as rangeValidation from '../../../rules/combat/rangeValidation.js';
import * as rangeCheck from '../../../rules/combat/rangeCheck.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as damageRollback from '../../common/damageRollback.js';
import * as automationService from '../../../combat/automation/automationService.js';

function makePlayerStats(overrides = {}) {
  return {
    name: 'Bard',
    proficiency: 2,
    level: 3,
    class: {
      name: 'Bard',
      class_levels: [
        { level: 1, bardic_die: 6 },
        { level: 2, bardic_die: 6 },
        { level: 3, bardic_die: 8 },
      ],
    },
    abilities: [
      { name: 'Wisdom', bonus: 2 },
      { name: 'Charisma', bonus: 4 },
    ],
    characterAdvancement: [],
    _trackedResources: {
      bardicInspirationUses: { current: 4, max: 4 },
    },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Cutting Words',
    automation: {
      type: 'reaction_debuff',
      range: '60_ft',
      effect: '',
      uses_expression: null,
      recharge: 'long_rest',
      ...automation,
    },
  };
}

function makeCombatSummary(creatures = []) {
  return { round: 1, creatures };
}

function freshAttackEvent(options = {}) {
  return {
    d20: 15,
    bonus: 5,
    targetName: 'Goblin',
    targetAc: 14,
    effectiveAc: null,
    hit: true,
    timestamp: Date.now(),
    ...options,
  };
}

function fullAttackSetup(options = {}) {
  targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
  damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
  damageRollback.findLastAttack.mockResolvedValue({
    attackEvent: freshAttackEvent(options),
    attackerName: 'Goblin',
    targetName: 'Goblin',
    primaryDamage: options.primaryDamage ?? 10,
    secondaryDamage: 0,
    totalDamage: options.totalDamage ?? (options.hit ? 10 : 0),
    damageTypes: options.damageTypes || ['Piercing'],
  });
}

const campaignName = 'TestCampaign';
const mapName = 'DungeonMap';

describe('reactionDebuffHandler — early exits: shield, uses, target/range/combat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rangeValidation.rangeToFeet.mockReset();
    rangeValidation.getDistanceFeet.mockReset();
    rangeCheck.isWithinRange.mockReset().mockResolvedValue(true);
  });

  describe('early exit: requiresShield', () => {
    it('returns popup when requiresShield and no shield equipped', async () => {
      const ps = makePlayerStats({ inventory: { equipped: [] } });
      const action = makeAction({ requiresShield: true });

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('holding a Shield');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('proceeds to default path when shield is equipped (plain or magic + prefix)', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['+1 Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      const action = makeAction({ requiresShield: true });

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: freshAttackEvent({ d20: 5, bonus: 3, hit: false }),
        attackerName: 'Goblin',
        targetName: 'Goblin',
        primaryDamage: 0,
        secondaryDamage: 0,
        totalDamage: 0,
        damageTypes: [],
      });

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Attack roll');
    });

    it('returns popup when requiresShield and equipped item is not a shield', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword', weapon_category: 'martial_melee' }],
      });
      const action = makeAction({ requiresShield: true });

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('holding a Shield');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('early exit: uses exhausted', () => {
    function setupExhausted(usesExpression = 3, recharge = 'long_rest') {
      const ps = makePlayerStats({});
      const action = makeAction({ uses_expression: usesExpression, recharge });
      automationService.evaluateAutoExpression.mockReturnValue(3);
      useRuntimeState.getRuntimeValue.mockReturnValue(0);
      return { ps, action };
    }

    it('returns popup when usesUsed equals effectiveUsesMax (numeric)', async () => {
      const { ps, action } = setupExhausted(3, 'long_rest');
      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('no uses remaining');
      expect(result.payload.description).toContain('Long Rest');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('returns popup when usesUsed equals effectiveUsesMax (string expression)', async () => {
      const { ps, action } = setupExhausted('proficiency_bonus', 'long_rest');
      automationService.evaluateAutoExpression.mockReturnValue(2);
      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('no uses remaining');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('mentions Short Rest when recharge is short_rest', async () => {
      const { ps, action } = setupExhausted(3, 'short_rest');
      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Short or Long Rest');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('proceeds when usesUsed is less than effectiveUsesMax', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({ uses_expression: 3 });
      automationService.evaluateAutoExpression.mockReturnValue(3);
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      fullAttackSetup();

      await handle(action, ps, campaignName, mapName);

      expect(targetResolver.resolveTarget).toHaveBeenCalled();
    });

    it('skips uses check when effectiveUsesMax is 0 (bardic fallback)', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({});

      fullAttackSetup();

      await handle(action, ps, campaignName, mapName);

      expect(targetResolver.resolveTarget).toHaveBeenCalled();
    });

    it('proceeds when getRuntimeValue returns null (treated as max)', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({ uses_expression: 3 });
      automationService.evaluateAutoExpression.mockReturnValue(3);
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      fullAttackSetup();

      await handle(action, ps, campaignName, mapName);

      expect(targetResolver.resolveTarget).toHaveBeenCalled();
    });
  });

  describe('early exit: target, range, combat', () => {
    it('returns popup when no target resolved', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({});
      targetResolver.resolveTarget.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('requires a target');
    });

    it('returns popup when out of range', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({ uses_expression: 3 });
      automationService.evaluateAutoExpression.mockReturnValue(3);
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      rangeValidation.rangeToFeet.mockReturnValue(30);
      targetResolver.resolveMapPositions.mockResolvedValue({
        attackerPos: { gridX: 0, gridY: 0 },
        targetPos: { gridX: 20, gridY: 0 },
      });
      rangeValidation.getDistanceFeet.mockReturnValue(50);
      rangeCheck.isWithinRange.mockResolvedValue(false);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('out of range');
    });

    it('skips range check when rangeToFeet returns null', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({});

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      rangeValidation.rangeToFeet.mockReturnValueOnce(null);
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: freshAttackEvent(),
        attackerName: 'Goblin',
        targetName: 'Goblin',
        primaryDamage: 10,
        secondaryDamage: 0,
        totalDamage: 10,
        damageTypes: ['Piercing'],
      });

      await handle(action, ps, campaignName, mapName);

      expect(targetResolver.resolveMapPositions).toHaveBeenCalledWith(campaignName, 'Bard');
    });

    it('skips range check when mapName is falsy', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({});

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: freshAttackEvent(),
        attackerName: 'Goblin',
        targetName: 'Goblin',
        primaryDamage: 10,
        secondaryDamage: 0,
        totalDamage: 10,
        damageTypes: ['Piercing'],
      });

      await handle(action, ps, campaignName, null);

      expect(targetResolver.resolveMapPositions).not.toHaveBeenCalled();
    });

    it('returns popup when no combat context', async () => {
      const ps = makePlayerStats({});
      const action = makeAction({ uses_expression: 3 });
      automationService.evaluateAutoExpression.mockReturnValue(3);
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      damageUtils.getCombatContext.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No combat context found');
    });
  });
});
