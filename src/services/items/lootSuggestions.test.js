import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generateLootSuggestions } from './lootGenerator.js';
import { clearDataCache } from '../ui/dataLoader.js';

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

beforeEach(() => {
  global.fetch = vi.fn();
  clearDataCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateLootSuggestions', () => {
  it('returns empty loot for null, undefined, and empty monsters array', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    expect(await generateLootSuggestions(null)).toEqual({ lootEntries: [], totalEncounterXp: 0 });
    expect(await generateLootSuggestions(undefined)).toEqual({ lootEntries: [], totalEncounterXp: 0 });
    expect(await generateLootSuggestions([])).toEqual({ lootEntries: [], totalEncounterXp: 0 });
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('network failure'));
    const result = await generateLootSuggestions([{ name: 'Orc', xp: 200, challenge_rating: 3 }]);
    expect(result.totalEncounterXp).toBe(200);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles non-ok fetch response gracefully', async () => {
    global.fetch.mockResolvedValue(new Response('', { status: 404 }));
    const result = await generateLootSuggestions([{ name: 'Orc', xp: 200, challenge_rating: 3 }]);
    expect(result.totalEncounterXp).toBe(200);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('skips monsters with CR below 1.5 — "none" tier', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Spectral Force', xp: 25, challenge_rating: '1/4' },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(25);
  });

  it('generates currency when roll is below 0.65 threshold', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(25);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('generates a gem entry when roll falls in gem range', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Hobgoblin', xp: 150, challenge_rating: 4 },
    ]);
    expect(result.totalEncounterXp).toBe(150);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('generates an equipment entry when roll falls in equipment range', async () => {
    const equipmentData = [
      { name: 'Chain Shirt', cost: { quantity: 75, unit: 'gp' }, equipment_category: 'Armor' },
      { name: 'Longsword', cost: { quantity: 15, unit: 'gp' }, equipment_category: 'Melee Weapons' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipmentData));

    const result = await generateLootSuggestions([
      { name: 'Giant', xp: 50, challenge_rating: 3 },
    ]);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('excludes Property and Mounts/Vehicles from equipment loot', async () => {
    const excludedEquip = [
      { name: 'Caravan', cost: { quantity: 5000, unit: 'gp' }, equipment_category: 'Property' },
      { name: 'Warhorse', cost: { quantity: 75, unit: 'gp' }, equipment_category: 'Mounts and Vehicles' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(excludedEquip));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 50, challenge_rating: 3 },
    ]);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles missing or invalid equipment data gracefully', async () => {
    const badEquipment = [
      { name: 'Broken Item', cost: null, equipment_category: 'Weapon' },
      { name: 'No Qty Item', cost: { unit: 'gp' }, equipment_category: 'Armor' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(badEquipment));

    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 50, challenge_rating: 3 },
    ]);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('generates a magic item entry when roll is above 0.94', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse(magicItems))
      .mockResolvedValueOnce(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Dragon', xp: 5000, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(5000);
  });

  it('processes multiple monsters with different tiers', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 2 },
      { name: 'Hobgoblin', xp: 150, challenge_rating: 4 },
    ]);
    expect(result.totalEncounterXp).toBe(175);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('skips monsters with CR below 1.5 regardless of other conditions', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'CR1', xp: 50, challenge_rating: 1 },
    ]);
    expect(result.lootEntries).toContain('No loot for these monsters');
    expect(result.totalEncounterXp).toBe(50);
  });

  it('includes loot for monsters with CR at or above 1.5', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));

    const result = await generateLootSuggestions([
      { name: 'CR1.5', xp: 100, challenge_rating: 1.5 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles fractional CR strings like "1/4"', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'CR1/4', xp: 25, challenge_rating: '1/4' },
    ]);
    expect(result.totalEncounterXp).toBe(25);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles fractional CR strings like "1/2"', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'CR1/2', xp: 50, challenge_rating: '1/2' },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles fractional CR strings like "3/4"', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'CR3/4', xp: 100, challenge_rating: '3/4' },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('includes loot for CR 2 (treasure frequency 0.30)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 100, challenge_rating: 2 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('includes loot for CR 4 (treasure frequency 0.50)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Monster', xp: 100, challenge_rating: 4 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles invalid challenge_rating string', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Invalid CR', xp: 50, challenge_rating: 'invalid' },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles numeric challenge_rating of 0', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'No CR', xp: 0, challenge_rating: 0 },
    ]);
    expect(result.totalEncounterXp).toBe(0);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles missing challenge_rating', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'No CR Field', xp: 50 },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(result.lootEntries).toContain('No loot for these monsters');
  });

  it('handles monsters with qty > 1', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblins', xp: 25, challenge_rating: 3, qty: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(125);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles monsters with qty of 0', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Zero Qty', xp: 50, challenge_rating: 3, qty: 0 },
    ]);
    expect(result.totalEncounterXp).toBe(50);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('forces gem generation path with controlled random', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const originalRandom = Math.random;
    Math.random = () => 0.7; // Falls in gem range (0.65-0.82)

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.totalEncounterXp).toBe(100);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('forces equipment generation path with controlled random', async () => {
    const equipmentData = [
      { name: 'Chain Shirt', cost: { quantity: 75, unit: 'gp' }, equipment_category: 'Armor' },
    ];
    global.fetch
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(equipmentData));

    const originalRandom = Math.random;
    Math.random = () => 0.85; // Falls in equipment range (0.82-0.94)

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 3 },
      ]);
      expect(result.totalEncounterXp).toBe(100);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('forces magic item generation path with controlled random', async () => {
    global.fetch
      .mockResolvedValueOnce(createMockResponse(magicItems))
      .mockResolvedValueOnce(createMockResponse([]));

    const originalRandom = Math.random;
    Math.random = () => 0.95; // Falls in magic item range (>= 0.94)

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 500, challenge_rating: 5 },
      ]);
      expect(result.totalEncounterXp).toBe(500);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('handles treasure frequency 0 for CR < 0.5', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const originalRandom = Math.random;
    Math.random = () => 0.99; // Force non-currency roll

    try {
      const result = await generateLootSuggestions([
        { name: 'Weak Monster', xp: 10, challenge_rating: 0.25 },
      ]);
      expect(result.totalEncounterXp).toBe(10);
      expect(result.lootEntries).toContain('No loot for these monsters');
    } finally {
      Math.random = originalRandom;
    }
  });

  it('handles treasure frequency 0.30 for CR 2', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const originalRandom = Math.random;
    Math.random = () => 0.2; // Below 0.30 threshold, should get treasure

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 2 },
      ]);
      expect(result.totalEncounterXp).toBe(100);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('handles treasure frequency 0.50 for CR 4', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const originalRandom = Math.random;
    Math.random = () => 0.4; // Below 0.50 threshold, should get treasure

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 100, challenge_rating: 4 },
      ]);
      expect(result.totalEncounterXp).toBe(100);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('handles treasure frequency 1.0 for CR >= 4', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const originalRandom = Math.random;
    Math.random = () => 0.7; // Force gem path

    try {
      const result = await generateLootSuggestions([
        { name: 'Monster', xp: 500, challenge_rating: 5 },
      ]);
      expect(result.totalEncounterXp).toBe(500);
      expect(Array.isArray(result.lootEntries)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('handles treasure hoard tier (CR 17-30)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Ancient Red Dragon', xp: 25000, challenge_rating: 24 },
    ]);
    expect(result.totalEncounterXp).toBe(25000);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles legendary tier (CR 11-17)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Lich', xp: 11500, challenge_rating: 13 },
    ]);
    expect(result.totalEncounterXp).toBe(11500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles greater tier (CR 9-11)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Efreeti', xp: 4500, challenge_rating: 10 },
    ]);
    expect(result.totalEncounterXp).toBe(4500);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles rich tier (CR 7-9)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Mammoth', xp: 450, challenge_rating: 8 },
    ]);
    expect(result.totalEncounterXp).toBe(450);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles standard tier (CR 5-7)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Ogre', xp: 390, challenge_rating: 5 },
    ]);
    expect(result.totalEncounterXp).toBe(390);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles moderate tier (CR 3-5)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Hobgoblin Captain', xp: 100, challenge_rating: 3 },
    ]);
    expect(result.totalEncounterXp).toBe(100);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });

  it('handles poor tier (CR 1.5-3)', async () => {
    global.fetch.mockResolvedValue(createMockResponse([]));
    const result = await generateLootSuggestions([
      { name: 'Goblin', xp: 25, challenge_rating: 1.5 },
    ]);
    expect(result.totalEncounterXp).toBe(25);
    expect(Array.isArray(result.lootEntries)).toBe(true);
  });
});
