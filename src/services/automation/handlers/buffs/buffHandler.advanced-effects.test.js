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

import { handle, restoreAdrenalineRushUses } from './buffHandler.js';
import * as buffToggle from '../../common/buffToggle.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as combatData from '../../../encounters/combatData.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as logService from '../../../ui/logService.js';
import * as expirations from '../../../rules/effects/expirations.js';
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

describe('buffHandler.handle - advanced effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buffToggle.toggleBuff.mockReturnValue({ wasActive: false });
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

  describe('restoreAdrenalineRushUses', () => {
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
});
