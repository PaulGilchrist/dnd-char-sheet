import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../common/buffToggle.js', () => ({
  toggleBuff: vi.fn(),
}));

vi.mock('../class-warlock/tempTeleportHandler.js', () => ({
  handle: vi.fn(),
}));

vi.mock('../class-cleric-paladin/vowOfEnmityHandler.js', () => ({
  handle: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
  loadCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/shared/abilityLookup.js', () => ({
  getAbilityModifier: vi.fn(),
}));

vi.mock('../class-druid/wildShapeCreatureBuilder.js', () => ({
  cleanupWildShape: vi.fn(),
}));

import { handle, restoreAdrenalineRushUses, confirmTelepathicSpeech } from './buffHandler.js';
import * as buffToggle from '../../common/buffToggle.js';
import * as tempTeleportHandler from '../class-warlock/tempTeleportHandler.js';
import * as vowOfEnmityHandler from '../class-cleric-paladin/vowOfEnmityHandler.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as combatData from '../../../encounters/combatData.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as logService from '../../../ui/logService.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as abilityLookup from '../../../../services/shared/abilityLookup.js';
import * as wildShapeCreatureBuilder from '../class-druid/wildShapeCreatureBuilder.js';

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestHero',
    level: 5,
    proficiency: 3,
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Test Buff',
    automation: {
      type: 'buff',
      ...automation,
    },
  };
}

describe('buffHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bonus_action_dash effect', () => {
    it('grants dash uses and decrements when uses are available', async () => {
      const ps = makePlayerStats({ proficiency: 4 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 'proficiency_bonus' });
      runtimeState.getRuntimeValue.mockReturnValue(4);
      runtimeState.setRuntimeValue.mockResolvedValue(undefined);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Dash action as a Bonus Action');
      expect(result.payload.description).toContain('3 uses remaining');
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        ps.name,
        'adrenalineRushUses',
        3,
        campaignName
      );
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          characterName: ps.name,
          abilityName: 'Test Buff',
          description: expect.stringContaining('Dash as a Bonus Action'),
        })
      );
    });

    it('blocks when uses are exhausted', async () => {
      const ps = makePlayerStats({ proficiency: 3 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 'proficiency_bonus' });
      runtimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('no uses remaining');
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('grants temp HP when bonusEffect is temp_hp and expression exists', async () => {
      const ps = makePlayerStats({ proficiency: 3 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 1, bonusEffect: 'temp_hp', bonusExpression: '2d6+2' });
      runtimeState.getRuntimeValue.mockReturnValue(1);
      automationService.evaluateAutoExpression.mockReturnValue(9);

      const result = await handle(action, ps, campaignName, null);

      expect(automationService.evaluateAutoExpression).toHaveBeenCalledWith('2d6+2', ps);
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(ps.name, 'tempHp', 9, campaignName);
      expect(result.payload.description).toContain('Gained 9 temporary hit points');
    });

    it('does not grant temp HP when expression evaluates to zero or negative', async () => {
      const ps = makePlayerStats({ proficiency: 3 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 1, bonusEffect: 'temp_hp', bonusExpression: '1d1' });
      runtimeState.getRuntimeValue.mockReturnValue(1);
      automationService.evaluateAutoExpression.mockReturnValue(0);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(ps.name, 'tempHp', expect.any(Number), campaignName);
    });

    it('uses explicit uses number or usesMax override', async () => {
      const ps = makePlayerStats({ proficiency: 5 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 2 });
      runtimeState.getRuntimeValue.mockReturnValue(2);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(ps.name, 'adrenalineRushUses', 1, campaignName);
    });

    it('defaults usesMax to 1 when uses field is unrecognizable', async () => {
      const ps = makePlayerStats({ proficiency: 5 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 'half' });
      runtimeState.getRuntimeValue.mockReturnValue(null);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(ps.name, 'adrenalineRushUses', 0, campaignName);
    });

    it('uses stored uses value when available', async () => {
      const ps = makePlayerStats({ proficiency: 3 });
      const action = makeAction({ effect: 'bonus_action_dash', uses: 'proficiency_bonus' });
      runtimeState.getRuntimeValue.mockReturnValue(10);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(ps.name, 'adrenalineRushUses', 9, campaignName);
    });
  });

  describe('delegation', () => {
    it('delegates teleport effects to tempTeleportHandler', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'teleport_on_rage' });
      tempTeleportHandler.handle.mockReturnValue({ type: 'popup', payload: {} });

      const result = await handle(action, ps, campaignName, null);

      expect(tempTeleportHandler.handle).toHaveBeenCalledWith(action, ps, campaignName, null);
      expect(result).toEqual({ type: 'popup', payload: {} });
    });

    it('delegates vow_of_enmity to vowOfEnmityHandler', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'vow_of_enmity' });
      vowOfEnmityHandler.handle.mockReturnValue({ type: 'popup', payload: {} });

      const result = await handle(action, ps, campaignName, null);

      expect(vowOfEnmityHandler.handle).toHaveBeenCalledWith(action, ps, campaignName, null);
      expect(result).toEqual({ type: 'popup', payload: {} });
    });
  });

  describe('Dash action trigger', () => {
    it('adds a temp buff to activeBuffs when trigger === dash_action and bonusAmount > 0', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Swift Step',
        automation: {
          type: 'buff',
          trigger: 'dash_action',
          effect: 'speed_bonus',
          bonus: '10 ft',
          duration: '1 round',
        },
      };
      runtimeState.getRuntimeValue.mockReturnValue(null);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Swift Step: +10 ft Speed for this Dash action.');
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        ps.name,
        'activeBuffs',
        expect.arrayContaining([
          expect.objectContaining({ name: 'Swift Step', tempBuff: true, speedBonus: 10 }),
        ]),
        campaignName
      );
    });

    it('falls through to normal buff flow when bonusAmount is 0', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Empty Buff',
        automation: {
          type: 'buff',
          trigger: 'dash_action',
          effect: 'speed_bonus',
          bonus: '0 ft',
        },
      };
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const result = await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalled();
      expect(result.payload.description).toBe('Empty Buff activated on yourself (10 min)');
    });

    it('does not add duplicate temp buff if one already exists', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Swift Step',
        automation: {
          type: 'buff',
          trigger: 'dash_action',
          effect: 'speed_bonus',
          bonus: '10 ft',
        },
      };
      const existingBuff = { name: 'Swift Step', tempBuff: true, speedBonus: 10, duration: 'same_action' };
      runtimeState.getRuntimeValue.mockReturnValue([existingBuff]);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('falls through when trigger is dash_action but effect is not speed_bonus', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Dash Buff',
        automation: {
          type: 'buff',
          trigger: 'dash_action',
          effect: 'some_other_effect',
          bonus: '20 ft',
        },
      };
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalled();
    });
  });

  describe('Required level guard', () => {
    it.each([
      [3, 5, true],
      [5, 5, false],
      [10, 5, false],
    ])('blocks when level %s < requiredLevel %s, allows otherwise', async (level, requiredLevel, shouldBlock) => {
      const ps = makePlayerStats({ level });
      const action = makeAction({ requiredLevel });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const result = await handle(action, ps, campaignName, null);

      if (shouldBlock) {
        expect(result.payload.description).toContain(`requires character level ${requiredLevel}`);
        expect(buffToggle.toggleBuff).not.toHaveBeenCalled();
      } else {
        expect(buffToggle.toggleBuff).toHaveBeenCalled();
      }
    });
  });

  describe('Long rest recharge guard', () => {
    it('blocks when recharge is long_rest and buff is already active', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ recharge: 'long_rest' });
      runtimeState.getRuntimeValue.mockReturnValue([{ name: 'Test Buff' }]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('cannot be used again until a Long Rest');
      expect(buffToggle.toggleBuff).not.toHaveBeenCalled();
    });

    it('allows activation when buff is not active or recharge is not long_rest', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ recharge: 'long_rest' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalled();
    });

    it('does not apply long_rest guard when uses field is present', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ recharge: 'long_rest', uses: 3 });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalled();
    });
  });

  describe('Target resolution', () => {
    it('uses playerStats.name as targetName when target is not willing_creature', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ target: 'self' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        action.automation,
        campaignName,
        ps.name
      );
    });

    it('uses target name from getTargetFromAttacker when target === willing_creature and combatSummary exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ target: 'willing_creature' });
      combatData.getCombatSummary.mockReturnValue({ enemies: [] });
      damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'AllyTarget' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        action.automation,
        campaignName,
        'AllyTarget'
      );
    });

    it('falls back to playerStats.name when target resolution fails', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ target: 'willing_creature' });
      combatData.getCombatSummary.mockReturnValue(null);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        action.automation,
        campaignName,
        ps.name
      );
    });
  });

  describe('Buff toggling', () => {
    it('calls toggleBuff with correct arguments and returns correct description', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ type: 'buff' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const result = await handle(action, ps, campaignName, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        action.automation,
        campaignName,
        ps.name
      );
      expect(result.payload.description).toBe(`${action.name} activated on yourself (10 min)`);
    });

    it('returns toggled OFF description when wasActive is true', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ type: 'buff' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toBe(`${action.name} toggled OFF`);
    });

    it('uses auto.duration in description when provided', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ type: 'buff', duration: '1 hour' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toBe(`${action.name} activated on yourself (1 hour)`);
    });
  });

  describe('Temp HP on buff activation', () => {
    it('sets tempHp when buff was not active and tempHpExpression exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ tempHpExpression: '2d4+3' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      automationService.evaluateAutoExpression.mockReturnValue(7);

      await handle(action, ps, campaignName, null);

      expect(automationService.evaluateAutoExpression).toHaveBeenCalledWith('2d4+3', ps);
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(ps.name, 'tempHp', 7, campaignName);
    });

    it('does not set tempHp when buff was already active, no expression, or result is non-positive', async () => {
      const ps = makePlayerStats();

      // Already active
      const action1 = makeAction({ tempHpExpression: '2d4+3' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });
      automationService.evaluateAutoExpression.mockReturnValue(7);
      await handle(action1, ps, campaignName, null);
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(ps.name, 'tempHp', expect.any(Number), campaignName);

      // No expression
      buffToggle.toggleBuff.mockClear();
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      const action2 = makeAction({});
      await handle(action2, ps, campaignName, null);
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(ps.name, 'tempHp', expect.any(Number), campaignName);

      // Zero result
      buffToggle.toggleBuff.mockClear();
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      const action3 = makeAction({ tempHpExpression: '1d2' });
      automationService.evaluateAutoExpression.mockReturnValue(0);
      await handle(action3, ps, campaignName, null);
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(ps.name, 'tempHp', expect.any(Number), campaignName);
    });

    it('returns wild_shape_select popup for shape_shift when activating', async () => {
      const ps = makePlayerStats({
        level: 7,
        class: { major: { name: 'Druid' }, subclass: { name: 'Circle of the Moon' }, class_levels: [{ level: 7, wild_shape: 2 }] },
      });
      const action = makeAction({ tempHpExpression: '2d6+2', effect: 'shape_shift' });
      runtimeState.getRuntimeValue.mockReturnValue(2);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('wild_shape_select');
      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBe(ps);
      expect(result.payload.campaignName).toBe(campaignName);
    });

    it('returns automation_info with deactivation message when shape_shift is already active', async () => {
      const ps = makePlayerStats({
        level: 7,
        class: { major: { name: 'Druid' }, subclass: { name: 'Circle of the Moon' }, class_levels: [{ level: 7, wild_shape: 2 }] },
      });
      const action = makeAction({ effect: 'shape_shift' });
      runtimeState.getRuntimeValue.mockReturnValue(2);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Test Buff toggled OFF');
      expect(wildShapeCreatureBuilder.cleanupWildShape).toHaveBeenCalledWith(ps.name, campaignName);
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: ps.name,
          abilityName: 'Test Buff',
          description: expect.stringContaining('deactivated Wild Shape'),
        })
      );
    });

    it('blocks shape_shift when no uses remaining', async () => {
      const ps = makePlayerStats({
        level: 7,
        class: { major: { name: 'Druid' }, subclass: { name: 'Circle of the Moon' }, class_levels: [{ level: 7, wild_shape: 0 }] },
      });
      const action = makeAction({ effect: 'shape_shift' });
      runtimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Wild Shape uses remaining');
      expect(buffToggle.toggleBuff).not.toHaveBeenCalled();
    });
  });

  describe('Invisible effect', () => {
    it('adds invisible to activeConditions and sets tracking when wasActive is false', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'invisible' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      runtimeState.getRuntimeValue.mockReturnValue([]);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        ps.name,
        'activeConditions',
        expect.arrayContaining(['invisible']),
        campaignName
      );
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        `_activeInvisibility_${ps.name}`,
        ps.name,
        campaignName
      );
    });

    it('removes invisible from activeConditions when wasActive is true', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'invisible' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });
      runtimeState.getRuntimeValue.mockReturnValue(['bleeding', 'invisible', 'poisoned']);

      await handle(action, ps, campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        ps.name,
        'activeConditions',
        ['bleeding', 'poisoned'],
        campaignName
      );
    });
  });

  describe('See invisibility and Haste effects', () => {
    it('logs activation for see_invisibility, adds expiration for haste on activation, removes speed_zero on haste deactivation', async () => {
      const ps = makePlayerStats();

      // See invisibility activation (no expiration, just logging)
      let action = makeAction({ effect: 'see_invisibility' });
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      await handle(action, ps, campaignName, null);
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: ps.name,
          abilityName: 'Test Buff',
          description: expect.stringContaining('See Invisibility activated'),
        })
      );

      // Haste activation
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      action = makeAction({ effect: 'haste' });
      await handle(action, ps, campaignName, null);
      expect(expirations.addExpiration).toHaveBeenCalled();

      // Haste deactivation removes speed_zero
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });
      runtimeState.getRuntimeValue.mockReturnValue(['speed_zero', 'blinded']);
      action = makeAction({ effect: 'haste' });
      await handle(action, ps, campaignName, null);
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        ps.name,
        'activeConditions',
        ['blinded'],
        campaignName
      );
    });
  });

  describe('Fly speed equals walk speed effect', () => {
    it('is a no-op when toggling off, passes through to normal buff when toggling on', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'fly_speed_equals_walk_speed' });

      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });
      const offResult = await handle(action, ps, campaignName, null);
      expect(offResult.payload.description).toBe('Test Buff toggled OFF');
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();

      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
      const onResult = await handle(action, ps, campaignName, null);
      expect(onResult.payload.description).toContain('activated on yourself');
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('Null/undefined safety', () => {
    it('throws when action, action.automation, or playerStats is missing', async () => {
      const ps = makePlayerStats();
      await expect(handle({ name: 'No Automation' }, ps, campaignName, null)).rejects.toThrow();
      await expect(handle(undefined, ps, campaignName, null)).rejects.toThrow();
      await expect(handle(makeAction(), undefined, campaignName, null)).rejects.toThrow();
    });
  });
});

describe('buffHandler.restoreAdrenalineRushUses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets adrenalineRushUses to null for the given player', () => {
    restoreAdrenalineRushUses('TestHero', campaignName);

    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'TestHero',
      'adrenalineRushUses',
      null,
      campaignName
    );
  });
});

describe('buffHandler.handle - modal delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('advantage_on_stealth (Blessing of the Trickster)', () => {
    it('returns modal when feature is not active and combatSummary has creatures', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'advantage_on_stealth' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({
        creatures: [
          { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 10, size: 'Medium' },
          { name: 'Ally2', type: 'npc', currentHp: 5, maxHp: 8, size: 'Small' },
          { name: 'Enemy1', type: 'monster', currentHp: 20, maxHp: 25, size: 'Large' },
        ],
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('tricksterBlessing');
      expect(result.payload.creatureTargets).toEqual([
        { name: 'Ally1', currentHp: 10, maxHp: 10, size: 'Medium', type: 'player' },
        { name: 'Ally2', currentHp: 5, maxHp: 8, size: 'Small', type: 'npc' },
        { name: 'Enemy1', currentHp: 20, maxHp: 25, size: 'Large', type: 'monster' },
      ]);
    });

    it('returns popup when feature is already active', async () => {
      const ps = makePlayerStats();
      const action = { name: 'Blessing of the Trickster', automation: { type: 'buff', effect: 'advantage_on_stealth' } };
      runtimeState.getRuntimeValue.mockReturnValue([{ name: 'Blessing of the Trickster' }]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('already active');
    });

    it('handles empty creatures list', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'advantage_on_stealth' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({ creatures: [] });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.creatureTargets).toEqual([]);
    });

    it('uses default feature name when action.name is missing', async () => {
      const ps = makePlayerStats();
      const action = { automation: { effect: 'advantage_on_stealth' } };
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({ creatures: [] });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('tricksterBlessing');
    });
  });

  describe('sunlight_aura (Corona of Light)', () => {
    it('returns modal when feature is not active', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'sunlight_aura' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({
        creatures: [
          { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 10 },
          { name: 'Enemy1', type: 'monster', currentHp: 20, maxHp: 25 },
        ],
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('coronaEnemySelection');
      expect(result.payload.creatureTargets).toEqual([
        { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 10 },
        { name: 'Enemy1', type: 'monster', currentHp: 20, maxHp: 25 },
      ]);
    });

    it('excludes self from creature targets', async () => {
      const ps = makePlayerStats({ name: 'TestHero' });
      const action = makeAction({ effect: 'sunlight_aura' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({
        creatures: [
          { name: 'TestHero', type: 'player', currentHp: 10, maxHp: 10 },
          { name: 'Enemy1', type: 'monster', currentHp: 20, maxHp: 25 },
        ],
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.creatureTargets).toEqual([
        { name: 'Enemy1', type: 'monster', currentHp: 20, maxHp: 25 },
      ]);
    });

    it('handles null combatSummary gracefully', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'sunlight_aura' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.creatureTargets).toEqual([]);
    });

    it('returns popup when feature is already active', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'sunlight_aura' });
      runtimeState.getRuntimeValue.mockReturnValue([{ effect: 'sunlight_aura' }]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('already active');
    });
  });

  describe('telepathic_speech', () => {
    it('returns modal when feature is not active', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ effect: 'telepathic_speech' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({
        creatures: [
          { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 10, size: 'Medium' },
          { name: 'TestHero', type: 'player', currentHp: 15, maxHp: 15, size: 'Medium' },
        ],
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('telepathicSpeech');
      expect(result.payload.creatureTargets).toEqual([
        { name: 'Ally1', currentHp: 10, maxHp: 10, size: 'Medium', type: 'player' },
      ]);
    });

    it('excludes self from creature targets', async () => {
      const ps = makePlayerStats({ name: 'TestHero' });
      const action = makeAction({ effect: 'telepathic_speech' });
      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.loadCombatSummary.mockResolvedValue({
        creatures: [
          { name: 'TestHero', type: 'player', currentHp: 15, maxHp: 15, size: 'Medium' },
          { name: 'Ally1', type: 'player', currentHp: 10, maxHp: 10, size: 'Medium' },
        ],
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.creatureTargets).toEqual([
        { name: 'Ally1', currentHp: 10, maxHp: 10, size: 'Medium', type: 'player' },
      ]);
    });

    it('returns popup when feature is already active', async () => {
      const ps = makePlayerStats();
      const action = { name: 'Telepathic Speech', automation: { type: 'buff', effect: 'telepathic_speech' } };
      runtimeState.getRuntimeValue.mockReturnValue([{ name: 'Telepathic Speech' }]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('already active');
    });
  });
});

describe('buffHandler.confirmTelepathicSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.getRuntimeValue.mockReturnValue([]);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
  });

  it('activates with correct CHA-based miles and level-based duration', async () => {
    const ps = makePlayerStats({
      name: 'Channeler',
      level: 7,
      abilities: [{ name: 'Charisma', bonus: 3, save: 6 }],
    });
    const action = { automation: { effect: 'telepathic_speech' }, name: 'Awakened Mind' };
    abilityLookup.getAbilityModifier.mockReturnValue(3);
    buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

    const result = await confirmTelepathicSpeech(action, ps, campaignName, 'Listener');

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('3 miles');
    expect(result.payload.description).toContain('7 minutes');
    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Channeler',
      'awakenedMindTarget',
      'Listener',
      campaignName
    );
    expect(expirations.addExpiration).toHaveBeenCalledWith(
      'Channeler',
      'Channeler',
      expect.arrayContaining([expect.objectContaining({ type: 'remove_active_buff' })]),
      campaignName
    );
    expect(logService.addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        type: 'ability_use',
        characterName: 'Channeler',
        abilityName: 'Awakened Mind',
        description: expect.stringContaining('activated Awakened Mind with Listener'),
      })
    );
  });

  it('deactivates when already active', async () => {
    const ps = makePlayerStats({
      name: 'Channeler',
      level: 5,
      abilities: [{ name: 'Charisma', bonus: 2, save: 5 }],
    });
    const action = { name: 'Awakened Mind', automation: { effect: 'telepathic_speech' } };
    abilityLookup.getAbilityModifier.mockReturnValue(2);
    buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

    const result = await confirmTelepathicSpeech(action, ps, campaignName, 'Listener');

    expect(result.payload.description).toContain('deactivated');
    expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Channeler',
      'awakenedMindTarget',
      null,
      campaignName
    );
    expect(expirations.addExpiration).not.toHaveBeenCalled();
  });

  it('uses feature name default when action.name is missing', async () => {
    const ps = makePlayerStats({
      name: 'Channeler',
      level: 3,
      abilities: [{ name: 'Charisma', bonus: 1, save: 3 }],
    });
    const action = { automation: { effect: 'telepathic_speech' } };
    abilityLookup.getAbilityModifier.mockReturnValue(1);
    buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

    const result = await confirmTelepathicSpeech(action, ps, campaignName, 'Listener');

    expect(result.payload.name).toBe('Telepathic Speech');
    expect(result.payload.description).toContain('Telepathic Speech');
  });

  it('handles CHA modifier of 0 (minimum 1 mile)', async () => {
    const ps = makePlayerStats({
      name: 'Channeler',
      level: 1,
      abilities: [{ name: 'Charisma', bonus: 0, save: 0 }],
    });
    const action = makeAction({ effect: 'telepathic_speech' });
    abilityLookup.getAbilityModifier.mockReturnValue(0);
    buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

    const result = await confirmTelepathicSpeech(action, ps, campaignName, 'Listener');

    expect(result.payload.description).toContain('1 mile');
    expect(result.payload.description).toContain('1 minute');
  });

  it('uses non-Awakened Mind feature name for logging', async () => {
    const ps = makePlayerStats({
      name: 'Channeler',
      level: 10,
      abilities: [{ name: 'Charisma', bonus: 4, save: 7 }],
    });
    const action = makeAction({ effect: 'telepathic_speech', name: 'Telepathic Speech' });
    abilityLookup.getAbilityModifier.mockReturnValue(4);
    buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

    await confirmTelepathicSpeech(action, ps, campaignName, 'Listener');

    expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
      'Channeler',
      'awakenedMindTarget',
      expect.anything(),
      campaignName
    );
  });
});
