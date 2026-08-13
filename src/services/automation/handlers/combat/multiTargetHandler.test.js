import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
  rangeToFeet: vi.fn(),
  getDistanceFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../common/targetResolver.js', () => ({
  resolveMapPositions: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../rules/features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './multiTargetHandler.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { resolveMapPositions } from '../../common/targetResolver.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const mapName = 'tavern-map';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestHero',
    level: 5,
    proficiencyBonus: 3,
    hitPoints: 30,
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Word of Creation',
    automation: {
      range: '30 ft',
      ...automation,
    },
  };
}

function makeCombatSummary(creatures = [], players = []) {
  return { creatures, players, placedItems: [] };
}

// ── Tests ──────────────────────────────────────────────────────

describe('multiTargetHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatSummary.mockImplementation((_name) => {
      return { creatures: [], players: [], placedItems: [] };
    });
  });

  describe('combat context validation', () => {
    it('should return popup when no combat context exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      getCombatContext.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No combat context found');
    });

    it('should use default feature name when action.name is missing and no combat context', async () => {
      const ps = makePlayerStats();
      const action = { automation: { range: '30 ft' } };
      getCombatContext.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.name).toBe('Words of Creation');
    });

    it('should return popup when first target not found in combat summary', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ payload: { targetName: 'Goblin' } });
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Orc' }]));

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No first target found');
    });

    it('should return popup when action.payload has no targetName', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ payload: {} });
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No first target found');
    });
  });

  describe('multi-target selection popup', () => {
    it('should return multi_target_selection popup with creature targets', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      const cs = makeCombatSummary(
        [
          { name: 'Goblin', type: 'monster', currentHp: 5, maxHp: 7 },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: 'Ally', type: 'player', currentHp: 20, maxHp: 30 },
        ],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      );
      getCombatContext.mockResolvedValue(cs);
      getCombatSummary.mockReturnValue(cs);
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('multi_target_selection');
      expect(result.payload.firstTargetName).toBe('Goblin');
      expect(result.payload.range).toBe('30 ft');
      expect(result.payload.creatureTargets).toContain('Orc');
      expect(result.payload.creatureTargets).toContain('Ally');
    });

    it('should exclude the first target from creatureTargets', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      const cs = makeCombatSummary(
        [
          { name: 'Goblin', type: 'monster' },
          { name: 'Orc', type: 'monster' },
          { name: 'Ally', type: 'player' },
        ],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      );
      getCombatContext.mockResolvedValue(cs);
      getCombatSummary.mockReturnValue(cs);
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.creatureTargets).not.toContain('Goblin');
      expect(result.payload.creatureTargets).toContain('Orc');
    });

    it('should use default feature name when action.name is missing', async () => {
      const ps = makePlayerStats();
      const action = {
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.name).toBe('Words of Creation');
    });

    it('should resolve map positions when mapName is provided', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue({ attackerPos: { gridX: 5, gridY: 10 } });

      await handle(action, ps, campaignName, mapName);

      expect(resolveMapPositions).toHaveBeenCalledWith(campaignName, mapName, ps.name);
    });

    it('should skip map resolution when mapName is null', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(30);

      await handle(action, ps, campaignName, null);

      expect(resolveMapPositions).not.toHaveBeenCalled();
    });

    it('should use default range when automation.range is missing', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: {},
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(10);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.range).toBe('10 ft');
    });

    it('should include spellFilter in payload when provided', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft', spellFilter: ['evocation', 'conjuration'] },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.spellFilter).toEqual(['evocation', 'conjuration']);
    });

    it('should use empty array for spellFilter when not provided', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary([{ name: 'Goblin' }]));
      getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin' }]));
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.spellFilter).toEqual([]);
    });
  });

  describe('range-based creature filtering', () => {
    it('should filter creatures within range when attackerPos is available', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      const cs = makeCombatSummary(
        [
          { name: 'Goblin', type: 'monster' },
          { name: 'Orc', type: 'monster' },
          { name: 'Ally', type: 'player' },
        ],
        [{ name: 'TestHero', gridX: 1, gridY: 1 }, { name: 'Ally', gridX: 3, gridY: 3 }]
      );
      getCombatContext.mockResolvedValue(cs);
      getCombatSummary.mockReturnValue(cs);
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue({ attackerPos: { gridX: 1, gridY: 1 } });

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.creatureTargets).toContain('Ally');
      expect(result.payload.creatureTargets).not.toContain('Goblin');
    });

    it('should include all creatures when attackerPos is null but range is specified', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '30 ft' },
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary(
        [{ name: 'Goblin', type: 'monster' }, { name: 'Orc', type: 'monster' }, { name: 'Ally', type: 'player' }],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      ));
      getCombatSummary.mockReturnValue(makeCombatSummary(
        [{ name: 'Goblin', type: 'monster' }, { name: 'Orc', type: 'monster' }, { name: 'Ally', type: 'player' }],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      ));
      rangeToFeet.mockReturnValue(30);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.creatureTargets).toContain('Orc');
      expect(result.payload.creatureTargets).toContain('Ally');
      expect(result.payload.creatureTargets).not.toContain('Goblin');
    });

    it('should include all creatures when range is null', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: {},
        payload: { targetName: 'Goblin' },
      };
      getCombatContext.mockResolvedValue(makeCombatSummary(
        [{ name: 'Goblin', type: 'monster' }, { name: 'Orc', type: 'monster' }, { name: 'Ally', type: 'player' }],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      ));
      getCombatSummary.mockReturnValue(makeCombatSummary(
        [{ name: 'Goblin', type: 'monster' }, { name: 'Orc', type: 'monster' }, { name: 'Ally', type: 'player' }],
        [{ name: 'TestHero', gridX: 5, gridY: 10 }]
      ));
      rangeToFeet.mockReturnValue(null);
      resolveMapPositions.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.creatureTargets).toContain('Orc');
      expect(result.payload.creatureTargets).toContain('Ally');
      expect(result.payload.creatureTargets).not.toContain('Goblin');
    });

    it('should exclude creatures out of range when attackerPos and range are both available', async () => {
      const ps = makePlayerStats();
      const action = {
        name: 'Word of Creation',
        automation: { range: '10 ft' },
        payload: { targetName: 'Goblin' },
      };
      const cs = makeCombatSummary(
        [
          { name: 'Goblin', type: 'monster' },
          { name: 'Nearby', type: 'monster' },
          { name: 'FarAway', type: 'monster' },
        ],
        [{ name: 'TestHero', gridX: 1, gridY: 1 }]
      );
      getCombatContext.mockResolvedValue(cs);
      getCombatSummary.mockReturnValue(cs);
      rangeToFeet.mockReturnValue(10);
      resolveMapPositions.mockResolvedValue({ attackerPos: { gridX: 1, gridY: 1 } });

      const result = await handle(action, ps, campaignName, mapName);

      expect(result.payload.creatureTargets).toContain('Nearby');
      expect(result.payload.creatureTargets).toContain('FarAway');
      expect(result.payload.creatureTargets).not.toContain('Goblin');
    });
  });
});
