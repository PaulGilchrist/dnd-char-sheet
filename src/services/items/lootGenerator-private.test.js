import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
}));

import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

import {
  normalizeCurrency,
  formatCurrencyString,
  generateLootSuggestions,
  generateLootFromCombatSummary,
} from './lootGenerator.js';

function createMockResponse(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const magicItems = [
  { name: 'Wand of Fireballs', rarity: 'rare', type: 'wand', requiresAttunement: false },
  { name: 'Amulet of Health', rarity: 'very rare', type: 'wondrous item', requiresAttunement: true },
  { name: '+1 Dagger', rarity: 'uncommon', type: 'dagger (weapon)' },
  { name: 'Common Potions', rarity: 'common', type: 'potion' },
  { name: 'Legendary Sword', rarity: 'legendary', type: 'sword', requiresAttunement: true },
  { name: 'Artifact Ring', rarity: 'artifact', type: 'ring' },
];

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests for currency normalization edge cases ──────────────────

describe('normalizeCurrency edge cases', () => {
  it('handles very large GP amounts', () => {
    const result = normalizeCurrency(99999.99);
    expect(result.pp).toBeGreaterThan(0);
    expect(result.gp).toBeLessThan(10);
    expect(result.sp).toBeLessThan(10);
    expect(result.cp).toBeLessThan(10);
  });

  it('handles exactly 10 gp', () => {
    const result = normalizeCurrency(10);
    expect(result).toEqual({ pp: 1, gp: 0, sp: 0, cp: 0 });
  });

  it('handles exactly 100 gp', () => {
    const result = normalizeCurrency(100);
    expect(result).toEqual({ pp: 10, gp: 0, sp: 0, cp: 0 });
  });

  it('handles exactly 1 sp (0.1 gp)', () => {
    const result = normalizeCurrency(0.1);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
  });

  it('handles exactly 1 cp (0.01 gp)', () => {
    const result = normalizeCurrency(0.01);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 0, cp: 1 });
  });

  it('handles 0.09 gp (9 cp)', () => {
    const result = normalizeCurrency(0.09);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 0, cp: 9 });
  });

  it('handles 0.005 gp (rounds to 1 cp)', () => {
    const result = normalizeCurrency(0.005);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 0, cp: 1 });
  });
});

// ── Tests for formatCurrencyString edge cases ────────────────────

describe('formatCurrencyString edge cases', () => {
  it('handles all denominations with value 1', () => {
    expect(formatCurrencyString({ pp: 1, gp: 1, sp: 1, cp: 1 })).toBe(
      '1 platinum piece, 1 gold piece, 1 silver coin, 1 copper coin'
    );
  });

  it('handles only sp and cp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 3, cp: 7 })).toBe('3 silver coins, 7 copper coins');
  });

  it('handles only gp and sp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 5, sp: 2, cp: 0 })).toBe('5 gold pieces, 2 silver coins');
  });

  it('handles only gp and cp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 3, sp: 0, cp: 5 })).toBe('3 gold pieces, 5 copper coins');
  });
});

// ── Tests for generateLootSuggestions with real magic items ──────

describe('generateLootSuggestions with magic items', () => {
  it('generates magic items with various rarities', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse(magicItems))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Dragon', xp: 5000, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(5000);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with +3 notation in rarity', async () => {
    const itemsWithPlus3 = [
      { name: '+3 Longsword', rarity: 'rare (+3)', type: 'sword', requiresAttunement: true },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsWithPlus3))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with empty rarity', async () => {
    const itemsWithEmptyRarity = [
      { name: 'Strange Item', rarity: '', type: 'wondrous item' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsWithEmptyRarity))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with "varies" rarity', async () => {
    const itemsWithVaries = [
      { name: 'Varied Item', rarity: 'varies', type: 'wondrous item' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsWithVaries))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with "unknown" rarity', async () => {
    const itemsWithUnknown = [
      { name: 'Mystery Item', rarity: 'unknown', type: 'wondrous item' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsWithUnknown))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with no type field', async () => {
    const itemsNoType = [
      { name: 'Simple Amulet', rarity: 'uncommon', requiresAttunement: false },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsNoType))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with no requiresAttunement field', async () => {
    const itemsNoAttunement = [
      { name: 'Basic Ring', rarity: 'common', type: 'ring' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(itemsNoAttunement))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles empty magic items array', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles magic items with no requiresAttunement property', async () => {
    const items = [
      { name: 'Basic Staff', rarity: 'uncommon', type: 'staff' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse(items))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});

// ── Tests for generateLootSuggestions with equipment ─────────────

describe('generateLootSuggestions with equipment', () => {
  it('handles equipment with cp cost', async () => {
    const equipWithCP = [
      { name: 'Rations', cost: { quantity: 1, unit: 'cp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithCP));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 50, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with sp cost', async () => {
    const equipWithSP = [
      { name: 'Candle', cost: { quantity: 5, unit: 'sp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithSP));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 50, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with pp cost', async () => {
    const equipWithPP = [
      { name: 'Fine Jewelry', cost: { quantity: 5, unit: 'pp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithPP));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 5000, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(5000);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with Material category', async () => {
    const equipWithMaterial = [
      { name: 'Dragon Breath', cost: { quantity: 100, unit: 'gp' }, equipment_category: 'Material' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithMaterial));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 5000, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(5000);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with missing equipment_category', async () => {
    const equipNoCategory = [
      { name: 'Mystery Item', cost: { quantity: 50, unit: 'gp' } },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipNoCategory));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with zero cost', async () => {
    const equipWithZero = [
      { name: 'Free Item', cost: { quantity: 0, unit: 'gp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithZero));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with negative cost', async () => {
    const equipWithNegative = [
      { name: 'Refund Item', cost: { quantity: -5, unit: 'gp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipWithNegative));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with missing unit in cost', async () => {
    const equipNoUnit = [
      { name: 'Broken Cost', cost: { quantity: 50 }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipNoUnit));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with missing quantity in cost', async () => {
    const equipNoQty = [
      { name: 'Broken Cost', cost: { unit: 'gp' }, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipNoQty));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with null cost', async () => {
    const equipNullCost = [
      { name: 'Null Cost Item', cost: null, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipNullCost));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles equipment with undefined cost', async () => {
    const equipUndefinedCost = [
      { name: 'Undefined Cost Item', cost: undefined, equipment_category: 'Adventuring Gear' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipUndefinedCost));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 500, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});

// ── Tests for generateLootFromCombatSummary with non-NPCs ────────

describe('generateLootFromCombatSummary non-NPC handling', () => {
  it('includes non-NPC creatures without monsterIndex', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Fireball', type: 'spell_effect' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(0);
  });

  it('handles combatSummary with no creatures property', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    const result = await generateLootFromCombatSummary({}, [], 'TestCampaign');

    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('handles combatSummary with empty creatures array', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    const result = await generateLootFromCombatSummary({ creatures: [] }, [], 'TestCampaign');

    expect(result).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('handles null targetEffects', async () => {
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

  it('handles empty targetEffects array', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue([]);

    const combatSummary = {
      creatures: [
        { name: 'Goblin 1', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });
});

// ── Tests for currency generation edge cases via generateLootSuggestions ─

describe('generateLootSuggestions currency generation', () => {
  it('handles poor tier with cp/sp/gp weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 2 },
    ]);
    expect(result.totalEncounterXp).toBe(25);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles moderate tier with sp/gp weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Hobgoblin', xp: 100, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles standard tier with gp/pp weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Ogre', xp: 390, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(390);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles rich tier with gp/pp weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Mammoth', xp: 450, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(450);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles greater tier with pp-only weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Efreeti', xp: 4500, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(4500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles major tier with pp-only weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Lich', xp: 11500, challenge_rating: 13 },
    ]);
    expect(result.totalEncounterXp).toBe(11500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles treasure hoard tier with pp-only weights', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Ancient Red Dragon', xp: 25000, challenge_rating: 24 },
    ]);
    expect(result.totalEncounterXp).toBe(25000);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});

// ── Tests for multiple monsters with mixed types ─────────────────

describe('generateLootSuggestions mixed monsters', () => {
  it('handles mix of CR tiers including none tier', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Spectral Force', xp: 25, challenge_rating: '1/4' },
      { name: 'Goblin', xp: 25, challenge_rating: 2 },
      { name: 'Ogre', xp: 390, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(440);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles all monsters with none tier', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Ghost', xp: 200, challenge_rating: '1/4' },
      { name: 'Spectral Force', xp: 25, challenge_rating: '1/4' },
    ]);
    expect(result.totalEncounterXp).toBe(225);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles monsters with only qty field', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblins', qty: 4 },
    ]);
    expect(result.totalEncounterXp).toBe(0);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});

// ── Tests for generateLootFromCombatSummary with monster aggregation ─

describe('generateLootFromCombatSummary monster aggregation', () => {
  it('aggregates creatures with same monsterIndex', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
      { index: 'orc', name: 'Orc', xp: 200, challenge_rating: 1 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin A', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin B', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Goblin C', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Orc A', type: 'npc', monsterIndex: 'orc' },
        { name: 'Orc B', type: 'npc', monsterIndex: 'orc' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    // 3 goblins (3 * 50 = 150) + 2 orcs (2 * 200 = 400) = 550
    expect(result.totalEncounterXp).toBe(550);
  });

  it('handles mix of npc and non-npc creatures', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin A', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Fire Elemental', type: 'elemental' },
        { name: 'Goblin B', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(100);
  });

  it('handles creatures with no monsterIndex mixed with those that do', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Custom Creature', type: 'npc' },
        { name: 'Goblin A', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Another Custom', type: 'npc' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('handles missing monster data for some indices', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin A', type: 'npc', monsterIndex: 'goblin' },
        { name: 'Unknown Creature', type: 'npc', monsterIndex: 'nonexistent' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'TestCampaign');

    expect(result.totalEncounterXp).toBe(50);
  });

  it('handles campaign name parameter (ignored internally)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([
      { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
    ]));

    getRuntimeValue.mockReturnValue(null);

    const combatSummary = {
      creatures: [
        { name: 'Goblin A', type: 'npc', monsterIndex: 'goblin' },
      ],
    };

    const result = await generateLootFromCombatSummary(combatSummary, [], 'test-campaign');

    expect(result.totalEncounterXp).toBe(50);
  });
});

// ── Tests for lootEntries content validation ─────────────────────

describe('generateLootSuggestions lootEntries content', () => {
  it('returns "No loot" when all monsters are skipped', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'CR0.5', xp: 10, challenge_rating: 0.5 },
      { name: 'CR1', xp: 20, challenge_rating: 1 },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('returns non-empty lootEntries when monsters have treasure', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 3 },
    ]);
    expect(result.lootEntries.length).toBeGreaterThan(0);
  });

  it('handles monsters with zero xp', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Weak Monster', xp: 0, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(0);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});
