import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
}));

import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

import { generateLootFromCombatSummary } from './lootGenerator.js';
import { clearDataCache } from '../ui/dataLoader.js';

function createMockResponse(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('generateLootFromCombatSummary', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(createMockResponse([]));
    clearDataCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty when combatSummary is null', async () => {
    const result = await generateLootFromCombatSummary(null, [], 'TestCampaign');
    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('returns empty when creatures is missing', async () => {
    const result = await generateLootFromCombatSummary({ creatures: null }, [], 'TestCampaign');
    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('excludes player-summoned creatures from loot calculation', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      { index: 'orc', name: 'Orc', xp: 200, challenge_rating: 1 / 4 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'Druid', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Orc 1', type: 'npc', monsterIndex: 'orc' },
      ],
    };
    const characters = [{ name: 'Druid' }, { name: 'Wizard' }];

    const result = await generateLootFromCombatSummary(combatSummary, characters, 'TestCampaign');

    expect(result.totalEncounterXp).toBe(200);
  });

  it('includes GM-summoned creatures in loot calculation', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'GM', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };
    const characters = [{ name: 'Druid' }];

    const result = await generateLootFromCombatSummary(combatSummary, characters, 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes creatures without summoned effect', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes non-NPC creatures regardless of summoned status', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'fire_elemental', name: 'Fire Elemental', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Fire Elemental', source: 'Druid', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Fire Elemental', type: 'elemental', monsterIndex: 'fire_elemental' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes creatures without monsterIndex regardless of summoned status', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Custom Creature', source: 'Druid', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Custom Creature', type: 'npc' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    // Custom Creature has no monsterIndex so it won't contribute to XP
    expect(result.totalEncounterXp).toBe(0);
  });

  it('includes creature when summoner source is GM', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'GM', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes creature when summoned by player NOT in character list', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'Wizard', effect: 'summoned' },
        ];
      }
      return null;
    });

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    // Wizard is NOT in the character list, so the summoned creature is included
    expect(result.totalEncounterXp).toBe(50);
  });

  it('handles empty characters array', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('handles undefined characters as empty', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, undefined, 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('aggregates multiple creatures of the same type', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin 2', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin 3', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(150);
  });

  it('handles missing monster data gracefully', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Unknown', type: 'npc', monsterIndex: 'nonexistent' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(0);
  });
});
