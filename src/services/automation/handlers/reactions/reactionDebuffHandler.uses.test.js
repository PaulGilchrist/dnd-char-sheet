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
import * as logService from '../../../ui/logService.js';
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

function setupDefaultPath(overrides = {}) {
  const {
    getRuntimeValueReturn,
    usesExpression,
    evaluateAutoExpressionReturn,
    attackEventOverride,
    actionOverrides,
    ...mockOverrides
  } = overrides;

  const action = makeAction(actionOverrides);
  if (usesExpression !== undefined) {
    action.automation.uses_expression = usesExpression;
  }

  if (evaluateAutoExpressionReturn !== undefined) {
    automationService.evaluateAutoExpression.mockReturnValue(evaluateAutoExpressionReturn);
  }

  if (getRuntimeValueReturn !== undefined) {
    useRuntimeState.getRuntimeValue.mockReturnValue(getRuntimeValueReturn);
  }

  targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
  damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
  damageRollback.findLastAttack.mockResolvedValue({
    attackEvent: freshAttackEvent(attackEventOverride),
    attackerName: 'Goblin',
    targetName: 'Goblin',
    primaryDamage: 0,
    secondaryDamage: 0,
    totalDamage: 0,
    damageTypes: [],
    ...mockOverrides,
  });

  return { action };
}

const campaignName = 'TestCampaign';
const mapName = 'DungeonMap';

describe('reactionDebuffHandler — uses decrement & logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReturnValue(undefined);
  });

  describe('uses decrement on successful path', () => {
    it('decrements uses from evaluated expression value when current is undefined', async () => {
      const { action } = setupDefaultPath({
        usesExpression: 'proficiency_bonus',
        evaluateAutoExpressionReturn: 2,
      });

      const result = await handle(action, makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Bard',
        'cuttingwordsUses',
        1,
        campaignName
      );
    });

    it('decrements from current value when getRuntimeValue returns a number', async () => {
      const { action } = setupDefaultPath({
        usesExpression: 3,
        evaluateAutoExpressionReturn: 3,
        getRuntimeValueReturn: 2,
      });

      const result = await handle(action, makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Bard',
        'cuttingwordsUses',
        1,
        campaignName
      );
    });

    it('decrements from max when getRuntimeValue returns null', async () => {
      const { action } = setupDefaultPath({
        usesExpression: 3,
        evaluateAutoExpressionReturn: 3,
        getRuntimeValueReturn: null,
      });

      const result = await handle(action, makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Bard',
        'cuttingwordsUses',
        2,
        campaignName
      );
    });

    it('uses bardicInspirationUses key when no uses_expression is set', async () => {
      const { action } = setupDefaultPath({});

      const result = await handle(action, makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Bard',
        'bardicInspirationUses',
        3,
        campaignName
      );
    });

    it('does not decrement when uses_expression is 0 and bardic max is 0', async () => {
      const ps = makePlayerStats({
        _trackedResources: { bardicInspirationUses: { current: 0, max: 0 } },
      });
      const action = makeAction({ uses_expression: 0 });

      targetResolver.resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      damageUtils.getCombatContext.mockResolvedValue(makeCombatSummary());
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: freshAttackEvent(),
        attackerName: 'Goblin',
        targetName: 'Goblin',
        primaryDamage: 0,
        secondaryDamage: 0,
        totalDamage: 0,
        damageTypes: [],
      });

      await handle(action, ps, campaignName, mapName);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('log entry', () => {
    function setupLogPath() {
      const ps = makePlayerStats({});
      const action = makeAction({});

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
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      return { ps, action };
    }

    it('adds log entry with combat details after successful handling', async () => {
      const { ps, action } = setupLogPath();

      await handle(action, ps, campaignName, mapName);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'Bard',
          abilityName: 'Cutting Words',
          targetName: 'Goblin',
          description: expect.stringContaining('d20(5) + 3 = 8 vs AC 14'),
          timestamp: expect.any(Number),
        })
      );
    });

    it('uses "Feature" as name when action.name is empty', async () => {
      const { ps, action } = setupLogPath();
      action.name = '';

      await handle(action, ps, campaignName, mapName);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          abilityName: 'Feature',
        })
      );
    });
  });
});
