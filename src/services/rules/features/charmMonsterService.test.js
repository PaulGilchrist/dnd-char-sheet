// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../automation/index.js', () => ({
  executeHandler: vi.fn(() => Promise.resolve({ type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: 'test' } })),
}));

vi.mock('../combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { triggerCharmMonster } from './charmMonsterService.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';
import { executeHandler } from '../../automation/index.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'TestCampaign';
const mapName = 'TestMap';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    spellAbilities: { saveDc: 14 },
    ...overrides,
  };
}

function makeSpell(overrides = {}) {
  return {
    name: 'Charm Monster',
    level: 4,
    ...overrides,
  };
}

describe('charmMonsterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triggerCharmMonster', () => {
    it('returns null when spell name is missing, null, or does not match "charm monster"', async () => {
      const baseStats = makePlayerStats();

      for (const name of [null, '', 'Charm Person', 'Charm Monster2', 'charm']) {
        const result = await triggerCharmMonster({ name }, { targetName: 'Goblin' }, baseStats, campaignName, mapName);
        expect(result).toBeNull();
      }
    });

    it('matches case-insensitively for charm monster', async () => {
      const baseStats = makePlayerStats();

      for (const name of ['CHARM MONSTER', 'charm monster', 'ChArM MoNsTeR']) {
        getCombatContext.mockResolvedValue({
          creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
        });

        const result = await triggerCharmMonster({ name }, { targetName: 'Goblin' }, baseStats, campaignName, mapName);

        expect(result.type).toBe('popup');
        expect(result.payload.name).toBe('Charm Monster');
      }
    });

    it('selects first non-caster creature when no target specified', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } },
          { name: 'Ogre', type: 'monster', saveBonuses: { WIS: 0 } },
        ],
      });

      const result = await triggerCharmMonster(makeSpell(), undefined, baseStats, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ targetName: 'Goblin' }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('returns popup when no creatures available', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await triggerCharmMonster(makeSpell(), undefined, baseStats, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No target selected');
    });

    it('passes spell save DC from metaCtx', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Goblin', spellSaveDc: 18 }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ saveDc: 18 }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('passes spell save DC from player stats when not in metaCtx', async () => {
      const baseStats = makePlayerStats({ spellAbilities: { saveDc: 16 } });
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Goblin' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ saveDc: 16 }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('passes advantage when target not at full health (NPC)', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Goblin', type: 'monster', currentHp: 5, maxHp: 10, saveBonuses: { WIS: 2 } },
        ],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Goblin' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ advantage: true }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('no advantage when NPC at full health', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Goblin', type: 'monster', currentHp: 10, maxHp: 10, saveBonuses: { WIS: 0 } },
        ],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Goblin' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ advantage: false }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('no advantage when player at full health', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Ally', type: 'player', saveBonuses: { WIS: 3 } },
        ],
      });
      getRuntimeValue.mockImplementation((charName, key) => {
        if (charName === 'Ally' && key === 'currentHitPoints') return 20;
        if (charName === 'Ally' && key === 'hitPoints') return 20;
        return undefined;
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Ally' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ advantage: false }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('passes advantage when player not at full health', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Ally', type: 'player', saveBonuses: { WIS: 3 } },
        ],
      });
      getRuntimeValue.mockImplementation((charName, key) => {
        if (charName === 'Ally' && key === 'currentHitPoints') return 10;
        if (charName === 'Ally' && key === 'hitPoints') return 20;
        return undefined;
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Ally' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ automation: expect.objectContaining({ advantage: true }) }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('uses spell slot level from metaCtx or defaults to 4', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Goblin', slotLevel: 5 }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ spellSlotLevel: 5 }),
        baseStats,
        campaignName,
        mapName,
      );
    });

    it('passes through handler result', async () => {
      const baseStats = makePlayerStats();
      const expectedResult = { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: 'Target charmed' } };
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
      });
      executeHandler.mockResolvedValue(expectedResult);

      const result = await triggerCharmMonster(makeSpell(), { targetName: 'Goblin' }, baseStats, campaignName, mapName);

      expect(result).toBe(expectedResult);
    });

    it('returns error popup when handler throws', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', saveBonuses: { WIS: 0 } }],
      });
      executeHandler.mockRejectedValue(new Error('Handler failed'));

      const result = await triggerCharmMonster(makeSpell(), { targetName: 'Goblin' }, baseStats, campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Failed to execute Charm Monster');
    });

    it('works on non-humanoid creatures without restriction', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Ogre', type: 'monster', saveBonuses: { WIS: 0 } }],
      });
      getMonsterData.mockResolvedValue({ type: 'giant' });

      await triggerCharmMonster(makeSpell(), { targetName: 'Ogre' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalled();
    });

    it('works on dragons', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Red Dragon', type: 'dragon', saveBonuses: { WIS: 5 } }],
      });
      getMonsterData.mockResolvedValue({ type: 'dragon' });

      await triggerCharmMonster(makeSpell(), { targetName: 'Red Dragon' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalled();
    });

    it('works on players', async () => {
      const baseStats = makePlayerStats();
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Ally', type: 'player', saveBonuses: { WIS: 3 } },
        ],
      });

      await triggerCharmMonster(makeSpell(), { targetName: 'Ally' }, baseStats, campaignName, mapName);

      expect(executeHandler).toHaveBeenCalled();
    });
  });
});
