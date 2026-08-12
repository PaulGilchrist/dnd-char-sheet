import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

export function getSaveDisadvantage(current, campaignName) {
  if (!current) return false;
  if (current.disadvantage) return true;
  const saveType = (current.saveType || '').toLowerCase();
  if (saveType !== 'dex') return false;
  const targetConditions = getRuntimeValue(current.targetName, 'activeConditions', campaignName) || [];
  if (targetConditions.some(c => String(c).toLowerCase() === 'charmed')) return true;
  const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
  return targetEffects.some(te => te.target === current.targetName && te.effect === 'ottos_irresistible_dance');
}
