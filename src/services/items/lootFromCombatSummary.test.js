// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { clearDataCache } from '../ui/dataLoader.js';

import { generateLootFromCombatSummary } from './lootGenerator.js';

function createMockResponse(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('generateLootFromCombatSummary', () => {
  let getRuntimeValue;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(createMockResponse([]));
    clearDataCache();
    vi.clearAllMocks();

    getRuntimeValue = vi.fn().mockReturnValue(null);
    vi.doMock('../../hooks/runtime/useRuntimeState.js', () => ({
      getRuntimeValue,
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  // ── Early return / null handling ─────────────────────────────────

  it('returns empty result when combatSummary is null', async () => {
    const result = await generateLootFromCombatSummary(null, [], 'TestCampaign');
    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('returns empty result when combatSummary.creatures is null', async () => {
    const result = await generateLootFromCombatSummary({ creatures: null }, [], 'TestCampaign');
    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  // ── Summoned creature filtering ──────────────────────────────────

  it('excludes NPC creatures summoned by a player in the character list', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
        { index: 'orc', name: 'Orc', xp: 200, challenge_rating: 1 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Goblin 1', source: 'Druid', effect: 'summoned' }];
      }
      return null;
    });

    // Re-import after setting up mock
    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Orc 1', type: 'npc', monsterIndex: 'orc' },
      ],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(200);
  });

  it('includes NPC creatures summoned by GM regardless of character list', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Goblin 1', source: 'GM', effect: 'summoned' }];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' }],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes NPC creatures without summoned effect', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' }],
    };

    const result = await func(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  // ── Non-NPC creatures bypass summoned check ──────────────────────

  it('includes non-NPC creatures (elemental) even when summoned by a player', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'fire_elemental', name: 'Fire Elemental', xp: 100, challenge_rating: 2 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Fire Elemental', source: 'Druid', effect: 'summoned' }];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Fire Elemental', type: 'elemental', monsterIndex: 'fire_elemental' }],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(100);
  });

  // ── Creatures without monsterIndex ───────────────────────────────

  it('excludes XP from creatures without monsterIndex even when summoned', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Custom Creature', source: 'Druid', effect: 'summoned' }];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Custom Creature', type: 'npc' }],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(0);
  });

  // ── Summoner not in character list ───────────────────────────────

  it('includes NPC summoned by a source not in the character list', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Goblin 1', source: 'Wizard', effect: 'summoned' }];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' }],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    // Wizard is not in the character list, so the creature is included
    expect(result.totalEncounterXp).toBe(50);
  });

  // ── Characters parameter edge cases ──────────────────────────────

  it('handles empty characters array', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' }],
    };

    const result = await func(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('handles undefined characters as empty', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' }],
    };

    const result = await func(combatSummary, undefined, 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  // ── Aggregation ──────────────────────────────────────────────────

  it('aggregates XP across multiple creatures of the same type', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin 2', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin 3', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await func(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(150);
  });

  it('aggregates XP across multiple creature types', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
        { index: 'orc', name: 'Orc', xp: 200, challenge_rating: 1 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin 2', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Orc 1', type: 'npc', monsterIndex: 'orc' },
        { name: 'Orc 2', type: 'npc', monsterIndex: 'orc' },
        { name: 'Orc 3', type: 'npc', monsterIndex: 'orc' },
      ],
    };

    const result = await func(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(700);
  });

  // ── Missing monster data ─────────────────────────────────────────

  it('handles missing monster data gracefully (no match in monster registry)', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockReturnValue(null);

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [{ name: 'Unknown', type: 'npc', monsterIndex: 'nonexistent' }],
    };

    const result = await func(combatSummary, [], 'TestCampaign');

    // Creature passes filter (not summoned) but has no matching monster data, so 0 XP
    expect(result.totalEncounterXp).toBe(0);
  });

  // ── Mixed filtering scenarios ────────────────────────────────────

  it('filters some creatures and includes others in the same combat', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
        { index: 'orc', name: 'Orc', xp: 200, challenge_rating: 1 },
        { index: 'treant', name: 'Treant', xp: 400, challenge_rating: 5 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'Druid', effect: 'summoned' },
          { target: 'Orc 1', source: 'GM', effect: 'summoned' },
        ];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Orc 1', type: 'npc', monsterIndex: 'orc' },
        { name: 'Treant 1', type: 'npc', monsterIndex: 'treant' },
      ],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    // Druid's summon excluded, GM summon + treant included
    expect(result.totalEncounterXp).toBe(600);
  });

  it('excludes multiple creatures summoned by the same player', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
        { index: 'wolf', name: 'Wolf', xp: 50, challenge_rating: 0.25 },
        { index: 'owlbear', name: 'Owlbear', xp: 300, challenge_rating: 3 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [
          { target: 'Goblin 1', source: 'Druid', effect: 'summoned' },
          { target: 'Wolf 1', source: 'Druid', effect: 'summoned' },
        ];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Wolf 1', type: 'npc', monsterIndex: 'wolf' },
        { name: 'Owlbear 1', type: 'npc', monsterIndex: 'owlbear' },
      ],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(300);
  });

  // ── Creatures with no monsterIndex (custom creatures) ────────────

  it('includes custom creatures (no monsterIndex) regardless of summoned status', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([
        { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      ]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'targetEffects') {
        return [{ target: 'Dragon', source: 'Druid', effect: 'summoned' }];
      }
      return null;
    });

    const { generateLootFromCombatSummary: func } = await import('./lootGenerator.js');

    const combatSummary = {
      creatures: [
        { name: 'Dragon', type: 'npc' },
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await func(combatSummary, [{ name: 'Druid' }], 'TestCampaign');

    // Dragon has no monsterIndex so it passes the filter but contributes 0 XP
    // Goblin is NOT summoned (targetEffects is for 'Dragon', not 'Goblin 1'), so it's included
    expect(result.totalEncounterXp).toBe(50);
  });
});
