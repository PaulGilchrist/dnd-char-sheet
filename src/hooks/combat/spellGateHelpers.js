import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getCsAndTargets(campaignName, opts = {}) {
  const { excludeCaster = false, includeCaster = false, casterName = '' } = opts;
  const cs = getCombatSummary(campaignName);
  if (!cs?.creatures) {
    console.error(`Creature targets empty for unknown: cs=${cs ? 'exists' : 'null'}, characters.length=undefined`);
    return { cs, creatureTargets: [] };
  }
  let creatureTargets = cs.creatures.map(c => c.name);
  if (excludeCaster) {
    creatureTargets = creatureTargets.filter(n => n !== casterName);
  }
  if (includeCaster && !creatureTargets.includes(casterName)) {
    creatureTargets.unshift(casterName);
  }
  return { cs, creatureTargets };
}

export function extractMaxTargets(spell) {
  const upcastAtSlotLevel = spell.upcast_at_slot_level;
  if (!upcastAtSlotLevel || typeof upcastAtSlotLevel !== 'object') return null;
  const effectiveSlotLevel = spell.upcastLevel || spell.level;
  const value = upcastAtSlotLevel[String(effectiveSlotLevel)];
  if (value && typeof value === 'string') {
    const match = value.match(/(\d+)\s+targets?/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export async function resolveHumanoids(campaignName, casterName) {
  const cs = getCombatSummary(campaignName);
  const nonCasterCreatures = cs?.creatures?.filter(c => c.name !== casterName) || [];
  const targets = [];
  for (const creature of nonCasterCreatures) {
    if (creature.type === 'player') {
      targets.push(creature.name);
    } else {
      try {
        const monsterData = await getMonsterData(creature.name, null);
        if (monsterData?.type && monsterData.type.toLowerCase() === 'humanoid') {
          targets.push(creature.name);
        }
      } catch { /* default to excluding */ }
    }
  }
  return targets;
}

export async function resolveBeasts(campaignName) {
  const cs = getCombatSummary(campaignName);
  const allCreatureNames = cs?.creatures?.map(c => c.name) || [];
  const beastTargets = [];
  for (const creatureName of allCreatureNames) {
    const csCheck = getCombatSummary(campaignName);
    const creature = csCheck?.creatures?.find(c => c.name === creatureName);
    if (creature?.type === 'player') continue;
    try {
      const monsterData = await getMonsterData(creatureName, null);
      if (monsterData?.type && monsterData.type.toLowerCase() === 'beast') {
        beastTargets.push(creatureName);
      }
    } catch { /* Not a known monster, skip */ }
  }
  return beastTargets;
}

export function makePending(type, spell, extra = {}) {
  return {
    spell,
    spellName: spell.name,
    spellLevel: spell.level || 0,
    castingTime: spell.casting_time,
    ...extra,
  };
}
