import { loadMapData } from '../../maps/mapsService.js';
import { getDistanceFeet } from './rangeValidation.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

/**
 * Universal range check — single source of truth.
 * ALL range checks in the codebase must go through this function.
 *
 * @param {string} sourceName
 * @param {string} targetName
 * @param {number|null} inRangeDistance — in feet, null means always in range
 * @returns {Promise<boolean>}
 */
export async function isWithinRange(sourceName, targetName, inRangeDistance) {
  const campaignName = getRuntimeValue('__campaign__', 'campaignName');
  const activeMapName = getRuntimeValue('__map__', 'activeMapName');
  if (!activeMapName) return true;
  if (inRangeDistance == null) return true;
  try {
    const data = await loadMapData(campaignName, activeMapName);
    if (!data) return true;
    const tokens = [...(data.players || []), ...(data.placedItems || [])];
    const hasPosition = t => !!t && Number.isFinite(t.gridX) && Number.isFinite(t.gridY);
    // Gridless fallback: an active map with no positioned tokens cannot measure distance.
    if (!tokens.some(hasPosition)) return true;
    const source = tokens.find(t => t.name === sourceName);
    const target = tokens.find(t => t.name === targetName);
    // Once the active map tracks token positions, unplaced creatures cannot
    // satisfy a range check (no phantom adjacency).
    if (!hasPosition(source) || !hasPosition(target)) return false;
    const dist = getDistanceFeet(source, target);
    if (dist == null) return true;
    return dist <= inRangeDistance;
  } catch {
    return true;
  }
}

/**
 * Pure distance comparator — for cases where distance is already computed.
 * Internal use only; prefer isWithinRange for all new code.
 */
export function isDistanceInRange(dist, rangeFt) {
  if (rangeFt == null) return true;
  return dist == null || dist <= rangeFt;
}

/**
 * Check if targetName is within range of referenceName's position.
 * Useful for effects that radiate from a target (not the caster).
 *
 * @param {string} referenceName - The creature/item whose position is the center
 * @param {string} targetName - The creature to check
 * @param {number|null} rangeFt - Range in feet, null means always in range
 * @returns {Promise<boolean>}
 */
export async function isWithinRangeOf(referenceName, targetName, rangeFt) {
  return isWithinRange(referenceName, targetName, rangeFt);
}
