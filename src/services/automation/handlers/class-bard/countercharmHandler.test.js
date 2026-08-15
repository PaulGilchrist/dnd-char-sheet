// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './countercharmHandler.js';
import { addEntry } from '../../../ui/logService.js';
import { findLastAttack } from '../../common/damageRollback.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';
import { removeCondition } from '../../../combat/conditions/conditionSaveService.js';

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../common/damageRollback.js', () => ({
  findLastAttack: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../combat/conditions/conditionSaveService.js', () => ({
  removeCondition: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn(),
}));

vi.mock('../../common/infoPopup.js', () => ({
  infoPopup: vi.fn((name, desc, auto) => ({
    type: 'popup',
    payload: { type: 'automation_info', name, description: desc, automation: auto },
  })),
}));

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const mapName = 'tavern-map';

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
    name: 'Countercharm',
    automation: {
      range: '30 ft',
      ...automation,
    },
  };
}

function makeAttackResult(overrides = {}) {
  return {
    attackEvent: null,
    attackerName: null,
    targetName: null,
    primaryDamage: 0,
    secondaryDamage: 0,
    totalDamage: 0,
    damageTypes: [],
    ...overrides,
  };
}

function makeAttackEvent(overrides = {}) {
  return {
    rollType: 'attack',
    d20: 8,
    bonus: 2,
    targetAc: 13,
    hit: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeSaveEvent(overrides = {}) {
  return {
    rollType: 'save',
    d20: 8,
    bonus: 2,
    saveDc: 13,
    saveResult: 'failure',
    saveType: 'Wisdom',
    actionName: 'Charm Person',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeCheckEvent(overrides = {}) {
  return {
    rollType: 'check',
    d20: 8,
    bonus: 2,
    checkName: 'Persuasion',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('countercharmHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findLastAttack.mockResolvedValue(makeAttackResult());
    getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'TestHero', type: 'player' },
        { name: 'Ally1', type: 'player' },
        { name: 'Goblin', type: 'npc' },
      ],
    });
    isWithinRange.mockResolvedValue(true);
  });

  describe('no recent roll', () => {
    it('should return popup when findLastAttack returns no attackEvent', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Countercharm');
      expect(result.payload.description).toContain('No recent D20 test found');
    });

    it('should handle findLastAttack returning null gracefully', async () => {
      findLastAttack.mockResolvedValue(null);

      const ps = makePlayerStats();
      const action = makeAction();

      await expect(handle(action, ps, campaignName, null)).rejects.toThrow();
    });

    it('should return popup when target is out of range', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent(),
        targetName: 'TestHero',
      }));
      isWithinRange.mockResolvedValue(false);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No recent D20 test found');
    });

    it('should perform range check even without a map', async () => {
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent(),
        targetName: 'TestHero',
      }));

      const ps = makePlayerStats();
      const action = makeAction();

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Target: TestHero');
      expect(isWithinRange).toHaveBeenCalledWith('TestHero', 'TestHero', 30);
    });
  });

  describe('save roll type', () => {
    it('should identify self as target when player failed their own save', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 8, saveDc: 13, saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Countercharm');
      expect(result.payload.description).toContain('Target: TestHero');
      expect(result.payload.description).toContain('Original Wisdom save');
      expect(result.payload.description).toContain('Reroll with Advantage');
    });

    it('should identify ally as target when ally failed their save', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 5, saveDc: 14, saveResult: 'failure' }),
        targetName: 'Ally1',
      }));

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.description).toContain('Target: Ally1');
      expect(result.payload.description).toContain('Original Wisdom save');
    });

    it('should identify NPC as target when NPC failed their save', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 5, saveDc: 14, saveResult: 'failure' }),
        targetName: 'Goblin',
      }));

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.description).toContain('Target: Goblin');
    });

    it('should display no effect when save already succeeded', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 15, saveDc: 13, saveResult: 'success' }),
        targetName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Succeeded');
      expect(result.payload.description).toContain('already succeeded');
    });

    it('should display still a failure when reroll does not meet DC', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 3, saveDc: 15, saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Failed');
      expect(result.payload.description).toContain('Still a failure');
    });

    it('should display turned failure into success when reroll meets DC', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 3, saveDc: 15, saveResult: 'failure' }),
        targetName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.95);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('turned a failure into a success');
    });

    it('should remove charmed and frightened conditions when save is converted to success', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 3, saveDc: 15, saveResult: 'failure' }),
        targetName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.95);

      await handle(action, ps, campaignName, null);

      expect(removeCondition).toHaveBeenCalledWith(
        expect.any(Object),
        'TestHero',
        'charmed',
        expect.any(Function),
        expect.any(Function),
      );
      expect(removeCondition).toHaveBeenCalledWith(
        expect.any(Object),
        'TestHero',
        'frightened',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('should not remove conditions when save already succeeded', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ d20: 15, saveDc: 13, saveResult: 'success' }),
        targetName: 'TestHero',
      }));

      await handle(action, ps, campaignName, null);

      expect(removeCondition).not.toHaveBeenCalled();
    });
  });

  describe('attack roll type', () => {
    it('should identify attacker as target and show reroll info', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeAttackEvent({ d20: 8, targetAc: 13, hit: false }),
        attackerName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Target: TestHero');
      expect(result.payload.description).toContain('Original roll');
      expect(result.payload.description).toContain('Reroll with Advantage');
    });

    it('should display turned miss into hit when reroll meets AC', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeAttackEvent({ d20: 8, targetAc: 13, hit: false }),
        attackerName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.95);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('MISS');
      expect(result.payload.description).toContain('turned a miss into a hit');
    });

    it('should display still a miss when reroll does not meet AC', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeAttackEvent({ d20: 2, targetAc: 18, hit: false }),
        attackerName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('MISS');
      expect(result.payload.description).toContain('Still a miss');
    });

    it('should display no effect when attack already hit', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeAttackEvent({ d20: 15, targetAc: 13, hit: true }),
        attackerName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('already succeeded');
    });
  });

  describe('ability check roll type', () => {
    it('should identify character who made the check', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeCheckEvent({ d20: 8 }),
        attackerName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Target: TestHero');
      expect(result.payload.description).toContain('Persuasion');
      expect(result.payload.description).toContain('Reroll with Advantage');
    });

    it('should display "Ability check" when checkName is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeCheckEvent({ d20: 8, checkName: null }),
        attackerName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Ability check');
    });

    it('should display improved result when reroll is higher', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeCheckEvent({ d20: 5 }),
        attackerName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.95);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('improved the result');
    });

    it('should show no improvement message when reroll is not higher', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeCheckEvent({ d20: 15 }),
        attackerName: 'TestHero',
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).not.toContain('improved the result');
    });
  });

  describe('custom feature name', () => {
    it('should use custom name in popup and description', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Bardic Countercharm',
        automation: { range: '30 ft' },
      };
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.name).toBe('Bardic Countercharm');
      expect(result.payload.description).toContain('<b>Bardic Countercharm</b>');
    });
  });

  describe('logging', () => {
    it('should log ability use with correct data for self target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      await handle(action, ps, campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestHero',
        abilityName: 'Countercharm',
        description: expect.stringContaining('TestHero used Countercharm on TestHero'),
        targetName: 'TestHero',
        timestamp: expect.any(Number),
      });
    });

    it('should log ability use with ally target name', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'Ally1',
      }));

      await handle(action, ps, campaignName, mapName);

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestHero',
        abilityName: 'Countercharm',
        description: expect.stringContaining('TestHero used Countercharm on Ally1'),
        targetName: 'Ally1',
        timestamp: expect.any(Number),
      });
    });

    it('should include creature types in log description', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      await handle(action, ps, campaignName, null);

      const logCall = addEntry.mock.calls[0][1];
      expect(logCall.description).toContain('Source: player');
      expect(logCall.description).toContain('Target: player');
    });

    it('should include outcome and effect details in log', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'TestHero',
      }));

      await handle(action, ps, campaignName, null);

      const logCall = addEntry.mock.calls[0][1];
      expect(logCall.description).toContain('save');
      expect(logCall.description).toContain('Outcome:');
    });

    it('should log with null creature types when creature not found in combat context', async () => {
      const ps = makePlayerStats({ name: 'UnknownBard' });
      const action = makeAction();
      findLastAttack.mockResolvedValue(makeAttackResult({
        attackEvent: makeSaveEvent({ saveResult: 'failure' }),
        targetName: 'UnknownBard',
      }));
      getCombatContext.mockResolvedValue({
        creatures: [],
      });

      await handle(action, ps, campaignName, null);

      const logCall = addEntry.mock.calls[0][1];
      expect(logCall.description).toContain('unknown');
    });
  });
});
