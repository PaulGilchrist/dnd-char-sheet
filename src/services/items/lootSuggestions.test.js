import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generateLootSuggestions } from './lootGenerator.js';

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
];

const equipmentData = [
  { name: 'Chain Shirt', cost: { quantity: 75, unit: 'gp' }, equipment_category: 'Armor' },
  { name: 'Longsword', cost: { quantity: 15, unit: 'gp' }, equipment_category: 'Melee Weapons' },
];

const excludedEquip = [
  { name: 'Caravan', cost: { quantity: 5000, unit: 'gp' }, equipment_category: 'Property' },
  { name: 'Warhorse', cost: { quantity: 75, unit: 'gp' }, equipment_category: 'Mounts and Vehicles' },
];

const badEquipment = [
  { name: 'Broken Item', cost: null, equipment_category: 'Weapon' },
  { name: 'No Qty Item', cost: { unit: 'gp' }, equipment_category: 'Armor' },
];

// Stub Math.random to return a fixed value for all calls during a test.
function stubRandom(value) {
  const original = Math.random;
  Math.random = () => value;
  return original;
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateLootSuggestions', () => {
  it('returns empty loot for null, undefined, and empty monsters array', async () => {
    expect(await generateLootSuggestions(null)).toEqual({ lootEntries: [], totalEncounterXp: 0 });
    expect(await generateLootSuggestions(undefined)).toEqual({ lootEntries: [], totalEncounterXp: 0 });
    expect(await generateLootSuggestions([])).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('handles fetch errors gracefully and returns valid structure', async () => {
    global.fetch.mockRejectedValue(new Error('network failure'));
    const result = await generateLootSuggestions([{ name: 'Orc', xp: 200, challenge_rating: 3 }]);
    expect(result).toEqual({
      lootEntries: expect.any(Array),
      totalEncounterXp: 200,
    });
  });

  it('handles non-ok fetch response gracefully and returns valid structure', async () => {
    global.fetch.mockResolvedValue(new Response('', { status: 404 }));
    const result = await generateLootSuggestions([{ name: 'Orc', xp: 200, challenge_rating: 3 }]);
    expect(result).toEqual({
      lootEntries: expect.any(Array),
      totalEncounterXp: 200,
    });
  });

  // ── CR threshold: monsters below 1.5 get no loot ──

  it('skips monsters with CR below 1.5 — returns "No loot" message', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Spectral Force', xp: 25, challenge_rating: '1/4' },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(25);
  });

  it('skips monsters with CR 0', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'No CR', xp: 0, challenge_rating: 0 },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(0);
  });

  it('skips monsters with missing challenge_rating', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'No CR Field', xp: 50 },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(50);
  });

  it('skips monsters with invalid challenge_rating string', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Invalid CR', xp: 50, challenge_rating: 'invalid' },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(50);
  });

  // ── CR threshold: monsters at or above 1.5 get loot ──

  it('includes loot for monsters with CR at or above 1.5', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'CR1.5', xp: 100, challenge_rating: 1.5 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(result.lootEntries.length).toBeGreaterThan(0);
  });

  // ── Fractional CR parsing ──

  it('parses fractional CR strings like "1/2" and "3/4" correctly', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result1 = await generateLootSuggestions([
      { name: 'CR1/2', xp: 50, challenge_rating: '1/2' },
    ]);
    expect(result1.lootEntries).toContain('No loot for these monsters');

    const result2 = await generateLootSuggestions([
      { name: 'CR3/4', xp: 100, challenge_rating: '3/4' },
    ]);
    expect(result2.lootEntries).toContain('No loot for these monsters');
  });

  // ── Quantity handling ──

  it('multiplies XP by qty when present', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblins', xp: 25, challenge_rating: 3, qty: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(125);
  });

  it('treats qty of 0 as 1', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Zero Qty', xp: 50, challenge_rating: 3, qty: 0 },
    ]);
    expect(result.totalEncounterXp).toBe(50);
  });

  // ── Multiple monsters ──

  it('aggregates XP across multiple monsters', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 2 },
      { name: 'Hobgoblin', xp: 150, challenge_rating: 4 },
    ]);
    expect(result.totalEncounterXp).toBe(175);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  // ── Treasure frequency ──

  it('respects treasure frequency 0 for CR < 0.5', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.99);
    try {
      const result = await generateLootSuggestions([
        { name: 'Weak Monster', xp: 10, challenge_rating: 0.25 },
      ]);
      expect(result.lootEntries).toContain('No loot for these monsters');
    } finally {
      Math.random = restore;
    }
  });

  it('respects treasure frequency 0.30 for CR 2 — generates loot when roll below threshold', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.2);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 2 },
      ]);
      expect(result.lootEntries).not.toContain('No loot for these monsters');
    } finally {
      Math.random = restore;
    }
  });

  it('respects treasure frequency 0.50 for CR 4 — generates loot when roll below threshold', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.4);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 4 },
      ]);
      expect(result.lootEntries).not.toContain('No loot for these monsters');
    } finally {
      Math.random = restore;
    }
  });

  it('respects treasure frequency 1.0 for high CR — always generates loot', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.7);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 500, challenge_rating: 5 },
      ]);
      expect(result.lootEntries).not.toContain('No loot for these monsters');
    } finally {
      Math.random = restore;
    }
  });

  // ── Currency generation ──

  it('generates currency when roll falls in currency range (< 0.65)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.5);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.lootEntries.length).toBeGreaterThan(0);
    } finally {
      Math.random = restore;
    }
  });

  // ── Gem generation ──

  it('generates a gem entry when roll falls in gem range (0.65-0.82)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const restore = stubRandom(0.7);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.lootEntries.length).toBeGreaterThan(0);
    } finally {
      Math.random = restore;
    }
  });

  // ── Equipment generation ──

  it('generates an equipment entry when roll falls in equipment range (0.82-0.94)', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipmentData));

    const restore = stubRandom(0.85);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.lootEntries.length).toBeGreaterThan(0);
    } finally {
      Math.random = restore;
    }
  });

  it('excludes Property and Mounts/Vehicles from equipment loot', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(excludedEquip));

    const restore = stubRandom(0.85);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.lootEntries).not.toContainEqual(expect.stringContaining('Caravan'));
      expect(result.lootEntries).not.toContainEqual(expect.stringContaining('Warhorse'));
    } finally {
      Math.random = restore;
    }
  });

  it('handles missing or invalid equipment data gracefully', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(badEquipment));

    const restore = stubRandom(0.85);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = restore;
    }
  });

  // ── Magic item generation ──

  it('generates a magic item entry when roll is >= 0.94', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse(magicItems))
      .mockResolvedValueOnce(createMockResponse([]));

    const restore = stubRandom(0.95);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 500, challenge_rating: 5 },
      ]);
      expect(result.lootEntries.length).toBeGreaterThan(0);
    } finally {
      Math.random = restore;
    }
  });

  // ── Data loading edge cases ──

  it('handles empty magic items data gracefully', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const restore = stubRandom(0.95);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 500, challenge_rating: 5 },
      ]);
      expect(result.lootEntries).not.toContainEqual(expect.stringMatching(/^"/));
    } finally {
      Math.random = restore;
    }
  });

  it('handles empty equipment data gracefully', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const restore = stubRandom(0.85);
    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.lootEntries).not.toContainEqual(expect.stringMatching(/\(\d+ .*gp\)/));
    } finally {
      Math.random = restore;
    }
  });
});
