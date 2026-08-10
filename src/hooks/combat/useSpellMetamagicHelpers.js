import { getCombatSummary } from '../../services/encounters/combatData.js';

export function getCreatureTargets(excludeName, campaignName, characters = []) {
  const cs = getCombatSummary(campaignName);
  if (cs?.creatures) {
    return cs.creatures.map(c => c.name);
  }
  return characters.map(c => c.name);
}
