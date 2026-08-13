// @cleaned-by-ai
// ── contextBuilder-map.test.js shared helpers ────────────────────────

export const mockStats = {
  name: 'Fighter1',
  level: 5,
  proficiency: 2,
  class: { class_levels: [{ rage_damage: 2 }] },
  abilities: [
    { name: 'Charisma', bonus: 2 },
    { name: 'Strength', bonus: 4 },
  ],
  automation: { passives: [] },
};

export const mockRangedAttack = {
  name: 'Longbow',
  damage: '1d8+4',
  damageType: 'Piercing',
  hitBonus: 7,
  hitBonusFormula: 'To Hit = 4 + 2 + 1',
  weaponType: 'ranged',
  range: 150,
};

export function makeCombatContext(attackerName, targetName, targetGridX, targetGridY) {
  return {
    creatures: [
      { name: attackerName, targetName },
      { name: targetName, gridX: targetGridX, gridY: targetGridY },
    ],
  };
}

export function makeMapData(players, placedItems) {
  return { players: players || [], placedItems: placedItems || [] };
}
