import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

import { handle } from './falseLifeHandler.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import * as logService from '../../../ui/logService.js';
import * as tempHpService from './tempHpService.js';

const CAMPAIGN_NAME = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return { name: 'TestHero', ...overrides };
}

function makeAction(overrides = {}) {
  return {
    name: 'False Life',
    automation: { tempHpExpression: '2d4+4', ...overrides.automation },
    ...overrides,
  };
}

function successRoll(total, formula) {
  return { total, rolls: [], modifier: 0, formula };
}

describe('falseLifeHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    diceRoller.rollExpression.mockReturnValue(successRoll(8, '2d4+4'));
  });

  describe('temp HP expression selection', () => {
    it('uses default 2d4+4 when no expression is provided', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ automation: {} });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });

    it('uses automation.tempHpExpression when provided', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ automation: { tempHpExpression: '3d6+2' } });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('3d6+2');
    });

    it('overrides with spell.heal_at_slot_level when slot level matches', async () => {
      const ps = makePlayerStats();
      const action = makeAction({
        spell: { heal_at_slot_level: { 2: '4d6+4' } },
        spellSlotLevel: 2,
      });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('4d6+4');
    });

    it('falls back to automation.tempHpExpression when no slot-level match', async () => {
      const ps = makePlayerStats();
      const action = makeAction({
        automation: { tempHpExpression: '2d8+3' },
        spell: { heal_at_slot_level: { 2: '4d6+4' } },
        spellSlotLevel: 1,
      });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d8+3');
    });

    it('uses spell.level when spellSlotLevel is absent', async () => {
      const ps = makePlayerStats();
      const action = makeAction({
        spell: { level: 3, heal_at_slot_level: { 3: '5d6+5' } },
      });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('5d6+5');
    });

    it('prefers spellSlotLevel over spell.level', async () => {
      const ps = makePlayerStats();
      const action = makeAction({
        spell: { level: 2, heal_at_slot_level: { 2: '3d6+3', 3: '5d6+5' } },
        spellSlotLevel: 3,
      });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('5d6+5');
    });

    it('falls back to default when spellSlotLevel does not match any key', async () => {
      const ps = makePlayerStats();
      const action = makeAction({
        spell: { heal_at_slot_level: { 5: '10d6+10' } },
        spellSlotLevel: 1,
      });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });
  });

  describe('setTempHp call', () => {
    it('calls setTempHp with the rolled total for the player', async () => {
      const ps = makePlayerStats({ name: 'Gandalf' });
      diceRoller.rollExpression.mockReturnValue(successRoll(12, '3d4+3'));

      await handle(makeAction(), ps, CAMPAIGN_NAME, null);

      expect(tempHpService.setTempHp).toHaveBeenCalledWith(
        'Gandalf',
        12,
        CAMPAIGN_NAME,
      );
    });

    it('does not call setTempHp when roll fails', async () => {
      diceRoller.rollExpression.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), CAMPAIGN_NAME, null);

      expect(tempHpService.setTempHp).not.toHaveBeenCalled();
    });
  });

  describe('campaign logging', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      diceRoller.rollExpression.mockReturnValue(successRoll(10, '2d4+4'));
    });

    it('logs hp_change entry with isTempHp true on success', async () => {
      const ps = makePlayerStats({ name: 'Gandalf' });

      await handle(makeAction(), ps, CAMPAIGN_NAME, null);

      expect(logService.addEntry).toHaveBeenCalledWith(
        CAMPAIGN_NAME,
        expect.objectContaining({
          type: 'hp_change',
          targetName: 'Gandalf',
          delta: 10,
          isTempHp: true,
          sourceName: 'Gandalf',
          note: 'False Life (2d4+4)',
        }),
      );
    });

    it('logs upcast formula when using higher level slot', async () => {
      const ps = makePlayerStats({ name: 'Wizard' });
      diceRoller.rollExpression.mockReturnValue(successRoll(15, '2d4 + 14'));

      await handle(
        makeAction({
          spell: { heal_at_slot_level: { 3: '2d4 + 14' } },
          spellSlotLevel: 3,
        }),
        ps,
        CAMPAIGN_NAME,
        null,
      );

      expect(logService.addEntry).toHaveBeenCalledWith(
        CAMPAIGN_NAME,
        expect.objectContaining({
          type: 'hp_change',
          delta: 15,
          note: 'False Life (2d4 + 14)',
        }),
      );
    });

    it('does not log when roll fails', async () => {
      diceRoller.rollExpression.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), CAMPAIGN_NAME, null);

      expect(logService.addEntry).not.toHaveBeenCalled();
    });
  });

  describe('return payload structure', () => {
    it('returns success popup with correct structure', async () => {
      diceRoller.rollExpression.mockReturnValue(successRoll(11, '2d4+4'));
      const result = await handle(makeAction(), makePlayerStats(), CAMPAIGN_NAME, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('False Life');
      expect(result.payload.description).toBe(
        'False Life: Gained 11 temporary hit points (rolled 2d4+4).',
      );
      expect(result.payload.automation).toEqual({ tempHpExpression: '2d4+4' });
    });

    it('includes automationType when auto.type is set', async () => {
      const action = makeAction({ automation: { type: 'false_life' } });
      const result = await handle(action, makePlayerStats(), CAMPAIGN_NAME, null);

      expect(result.payload.automationType).toBe('false_life');
    });
  });

  describe('roll failure', () => {
    it('returns info popup with error description when roll fails', async () => {
      diceRoller.rollExpression.mockReturnValue(null);
      const result = await handle(
        makeAction({ automation: { tempHpExpression: 'invalid' } }),
        makePlayerStats(),
        CAMPAIGN_NAME,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('False Life');
      expect(result.payload.description).toBe(
        'False Life: Could not roll temp HP (invalid).',
      );
      expect(tempHpService.setTempHp).not.toHaveBeenCalled();
    });

    it('does not call setTempHp or addEntry on roll failure', async () => {
      diceRoller.rollExpression.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), CAMPAIGN_NAME, null);

      expect(tempHpService.setTempHp).not.toHaveBeenCalled();
      expect(logService.addEntry).not.toHaveBeenCalled();
    });
  });

  describe('missing optional fields', () => {
    it('uses default expression when action.automation is undefined', async () => {
      const ps = makePlayerStats();
      const action = { name: 'False Life' };

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });

    it('uses default expression when action.spell is undefined', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });

    it('works with action.automation being null', async () => {
      const ps = makePlayerStats();
      const action = { name: 'False Life', automation: null };

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });

    it('works with action.spell being null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ spell: null });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('2d4+4');
    });

    it('uses spell.level when spellSlotLevel is undefined and spell.level exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ spell: { level: 2, heal_at_slot_level: { 2: '3d6+6' } } });

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('3d6+6');
    });
  });
});
