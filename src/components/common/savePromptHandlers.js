import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getAbilitySaveBonus } from '../../services/combat/conditions/conditionUtils.js';
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { addEntry } from '../../services/ui/logService.js';
import { getSaveDisadvantage } from './savePromptUtils.js';

function doReroll({ campaignName, characters, activeMapName, current, extraBonus }) {
  if (!current) return;
  let saveBonus = 0;
  try {
    const character = (characters || []).find(c => {
      const name = typeof c === 'string' ? c : c.name;
      return name && name === current.targetName;
    });
    if (character && typeof character !== 'string') {
      saveBonus = getAbilitySaveBonus(character.computedStats || character, current.saveType);
    }
  } catch { /* ignore */ }
  const aura = computeAuraBonus({ targetName: current.targetName, characters, campaignName, activeMapName, allCreatures: getCombatSummary(campaignName)?.creatures });
  return aura.then(a => {
    const roll1 = rollD20();
    const disadv = getSaveDisadvantage(current, campaignName);
    const roll2 = disadv ? rollD20() : roll1;
    const finalRoll = disadv ? Math.min(roll1, roll2) : roll1;
    const total = finalRoll + saveBonus + a.bonus + extraBonus;
    const success = total >= current.saveDc;
    return { success, finalRoll, total, saveBonus: saveBonus + a.bonus + extraBonus, roll1, roll2, mode: disadv ? 'disadvantage' : 'normal', aura: a };
  });
}

function submitReroll(submitSaveResult, result, current, bonusDetail, note, healingName, healingNote) {
  submitSaveResult({
    promptId: current.promptId, targetName: current.targetName, success: result.success,
    roll: result.finalRoll, total: result.total, saveBonus: result.saveBonus,
    rawRolls: [result.roll1, result.roll2], mode: result.mode, bonusDetail,
    saveType: current.saveType, saveDc: current.saveDc, condition: current.condition,
    sourceName: current.sourceName, damageFormula: current.damageFormula,
    damageType: current.damageType, rawDamage: current.rawDamage, dcSuccess: current.dcSuccess,
    secondaryFormula: current.secondaryFormula, secondaryDamageType: current.secondaryDamageType,
    secondaryRawDamage: current.secondaryRawDamage, note, healingName, healingNote,
  });
}

export function createFanaticalFocusHandler({ campaignName, characters, activeMapName, current, rageDamageBonus, fanaticalFocusAvailable, setRerollUsedForSave, submitSaveResult }) {
  return async () => {
    if (!fanaticalFocusAvailable || !current) return;
    setRerollUsedForSave(true);
    setRuntimeValue(current.targetName, 'fanaticalFocusUsed', true, campaignName);
    const result = await doReroll({ campaignName, characters, activeMapName, current, extraBonus: rageDamageBonus });
    submitReroll(submitSaveResult, result, current, `(+${rageDamageBonus} Fanatical Focus)`, 'fanatical_focus_reroll', 'Fanatical Focus', 'fanatical_focus_hp_restore');
  };
}

export function createDisciplinedSurvivorHandler({ campaignName, current, currentFocusPoints, disciplinedSurvivorAvailable, setRerollUsedForSave, submitSaveResult }) {
  return async () => {
    if (!disciplinedSurvivorAvailable || !current) return;
    setRerollUsedForSave(true);
    setRuntimeValue(current.targetName, 'focusPoints', currentFocusPoints - 1, campaignName);
    const result = await doReroll({ campaignName: null, characters: [], activeMapName: null, current, extraBonus: 0 });
    submitReroll(submitSaveResult, result, current, '(-1 Focus Point)', 'disciplined_survivor_reroll', 'Disciplined Survivor', 'disciplined_survivor_hp_restore');
  };
}

export function createGuardedMindHandler({ campaignName, current, guardedMindAvailable, setRerollUsedForSave, submitSaveResult }) {
  return async () => {
    if (!guardedMindAvailable || !current) return;
    setRerollUsedForSave(true);
    setRuntimeValue(current.targetName, '_guardedMind_usedRest', 'rest', campaignName);
    const saveLabel = (current.saveType || 'Save').toUpperCase();
    submitSaveResult({
      promptId: current.promptId, targetName: current.targetName, success: true,
      roll: 20, total: current.saveDc, saveBonus: 0, rawRolls: [20], mode: 'normal',
      bonusDetail: '(Guarded Mind)', saveType: current.saveType, saveDc: current.saveDc,
      condition: current.condition, sourceName: current.sourceName,
      damageFormula: current.damageFormula, damageType: current.damageType,
      rawDamage: current.rawDamage, dcSuccess: current.dcSuccess,
      secondaryFormula: current.secondaryFormula, secondaryDamageType: current.secondaryDamageType,
      secondaryRawDamage: current.secondaryRawDamage, note: 'guarded_mind_reroll',
      healingName: 'Guarded Mind', healingNote: 'guarded_mind_hp_restore',
    });
    addEntry(campaignName, {
      type: 'ability_use', characterName: current.targetName, abilityName: 'Guarded Mind',
      description: `${current.targetName} used Guarded Mind to override a failed ${saveLabel} save.`,
      timestamp: Date.now(),
    }).catch((e) => { console.error('[SavePromptModal] Error:', e); });
  };
}

export function createLivingLegendHandler({ campaignName, characters, activeMapName, current, livingLegendAvailable, setRerollUsedForSave, submitSaveResult }) {
  return async () => {
    if (!livingLegendAvailable || !current) return;
    setRerollUsedForSave(true);
    const result = await doReroll({ campaignName, characters, activeMapName, current, extraBonus: 0 });
    submitReroll(submitSaveResult, result, current, undefined, 'living_legend_reroll', 'Living Legend', 'living_legend_hp_restore');
  };
}
