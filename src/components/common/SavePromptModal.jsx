import { useState, useCallback, useRef, useEffect } from 'react';
import utils from '../../services/ui/utils.js';
import { rollD20, rollExpression } from '../../services/dice/diceRoller.js';
import { sendSaveResult, clearSavePrompt } from '../../services/combat/conditions/savePromptService.js';
import Subscriber from './Subscriber.jsx';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getAbilitySaveBonus } from '../../services/combat/conditions/conditionUtils.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { registerPendingSavePrompt, getPendingSavePrompt } from '../../services/combat/auras/pendingSaveRegistry.js';
import { addEntry } from '../../services/ui/logService.js';
import { getAllyList } from '../../hooks/useAllySelection.js';
import { normalizeSaveType } from '../../services/rules/combat/applyDamage.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import storage from '../../services/ui/storage.js';
import './savePromptModal.css';
import { getPendingPopupSetter } from '../../services/combat/auras/pendingPopupRegistry.js';

function SavePromptModal({ campaignName, characters, activeMapName }) {
  const [prompts, setPrompts] = useState([]);
  const [evasionSelection, setEvasionSelection] = useState(null);
  const [rerollUsedForSave, setRerollUsedForSave] = useState(false);
  const [lastEvasionState, setLastEvasionState] = useState(false);
  const forceRollTo20Ref = useRef(false);
  const selectedAlliesRef = useRef(new Set());

  const current = prompts.length > 0 ? prompts[0] : null;

  const hasShareableEvasion = !current ? false : (() => {
    const normalizedSaveType = normalizeSaveType(current.saveType);
    if (current.dcSuccess !== 'half') return false;
    return (characters || []).some(c => {
      if (utils.getName(c.name) === utils.getName(current.targetName)) return false;
      const ev = c?.computedStats?.evasionEffects;
      return ev?.some(ef => ef.saveType === normalizedSaveType && ef.shareable && ef.shareRange >= 5);
    });
  })();

  const evasionTriggeredIdsRef = useRef(new Set());

  useEffect(() => {
    if (current && hasShareableEvasion && !evasionTriggeredIdsRef.current.has(current.promptId)) {
      evasionTriggeredIdsRef.current.add(current.promptId);
      setEvasionSelection({ selectedAllies: [] });
    }
  }, [current, hasShareableEvasion]);

  const advance = useCallback(() => {
    setPrompts(prev => prev.slice(1));
  }, []);

  const handleEvent = useCallback((event) => {
    if (!event.key || event.data == null) return;
    const prefix = `change-${campaignName}-savePrompt-`;
    if (!event.key.startsWith(prefix)) return;

    setPrompts(prev => {
      if (prev.some(p => p.promptId === event.data.promptId)) return prev;
      const { sourceAttackerName, attackerName: eventDataAttackerName, targetName: dataTargetName, ...restData } = event.data;
      const targetName = dataTargetName || event.key.slice(prefix.length) || null;
      const newPrompt = { targetName, attackerName: eventDataAttackerName || sourceAttackerName, ...restData };

      registerPendingSavePrompt(newPrompt.promptId, { ...newPrompt, campaignName });
      return [...prev, newPrompt];
     });
   }, [campaignName]);

  const handleClearedEvent = useCallback((event) => {
    if (!event.key || event.data == null) return;
    const prefix = `change-${campaignName}-savePromptCleared-`;
    if (!event.key.startsWith(prefix)) return;
    if (!event.data?.promptId) return;

    getPendingSavePrompt(event.data.promptId);
    getPendingPopupSetter(event.data.promptId);

    setPrompts(prev => prev.filter(p => p.promptId !== event.data.promptId));
  }, [campaignName]);

  const handleDismiss = useCallback(() => {
    if (current) {
      const result = current.result;
      if (result) {
        const saveBonus = result.saveBonus;
        const rollMode = result.mode || 'normal';
        const rawRolls = result.rawRolls || [result.roll];

        sendSaveResult(campaignName, current.targetName, {
          promptId: current.promptId,
          success: result.success,
          roll: result.roll,
          total: result.total,
          saveBonus,
          rawRolls,
          mode: rollMode,
          bonusDetail: result.bonusDetail,
        });

        window.dispatchEvent(new CustomEvent('save-result', {
          detail: {
            promptId: current.promptId,
            targetName: current.targetName,
            saveType: current.saveType,
            saveDc: current.saveDc,
            success: result.success,
            roll: result.roll,
            total: result.total,
            saveBonus,
            bonusDetail: result.bonusDetail,
            rawDamage: current.rawDamage,
            dcSuccess: current.dcSuccess,
            rawRolls,
            mode: rollMode,
            evasionActive: lastEvasionState,
          },
        }));
      }
      clearSavePrompt(campaignName, current.targetName);
      advance();
    }
  }, [campaignName, current, lastEvasionState, advance]);

  const handleRollSave = useCallback(async () => {
    if (!current) return;

    let saveBonus = 0;
    let saveModifiers = null;
    let activeConditions = [];
    let character = null;
    try {
      character = (characters || []).find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name && utils.getName(name) === utils.getName(current.targetName);
      });
      if (character && typeof character !== 'string') {
        saveBonus = getAbilitySaveBonus(character.computedStats || character, current.saveType);
        saveModifiers = character.saveModifiers || character.computedStats?.saveModifiers;
        activeConditions = getRuntimeValue(current.targetName, 'activeConditions') || [];
      }
    } catch { /* ignore */ }

    const aura = await computeAuraBonus({ targetName: current.targetName, characters, campaignName, activeMapName, allCreatures: getCombatSummary(campaignName)?.creatures });
    const auraBonus = aura.bonus;

    const targetConditions = getRuntimeValue(current.targetName, 'activeConditions', campaignName) || [];
    const isIncapacitated = targetConditions.some(c => String(c).toLowerCase() === 'incapacitated');
    const targetCharForEvasion = (characters || []).find(c => utils.getName(c.name) === utils.getName(current.targetName));
    const ownEvasion = targetCharForEvasion?.computedStats?.evasionEffects;
    const normalizedSaveType = normalizeSaveType(current.saveType);
    const hasOwnEvasion = !isIncapacitated && ownEvasion?.some(ef => ef.saveType === normalizedSaveType);
    const hasSelectedEvasion = !hasOwnEvasion && !isIncapacitated && selectedAlliesRef.current.has(current.targetName);
    const hasEvasion = hasOwnEvasion || hasSelectedEvasion;
    setLastEvasionState(hasEvasion);

    let hasAdvantage = false;
    if (current.advantage) {
      hasAdvantage = true;
    } else if (!current.disadvantage && saveModifiers && saveModifiers.length > 0) {
      const conditionSet = new Set(activeConditions);
      for (const mod of saveModifiers) {
        if (mod.target === 'saving_throw' && mod.effect === 'advantage') {
          if (mod.condition === 'against_spell') {
            hasAdvantage = true;
            break;
          }
          if (mod.condition && conditionSet.has(mod.condition)) {
            hasAdvantage = true;
            break;
          }
          if (mod.saveType && current.condition && mod.condition === current.condition) {
            hasAdvantage = true;
            break;
          }
        }
      }
    }

    // Dodge: advantage on Dexterity saving throws only
    if (!hasAdvantage && !current.disadvantage) {
      const targetActiveBuffs = getRuntimeValue(current?.targetName, 'activeBuffs', campaignName) || [];
      const isDodgeActive = Array.isArray(targetActiveBuffs) && targetActiveBuffs.some(b => b.effect === 'dodge');
      const isDexSave = (current.saveType || '').toUpperCase() === 'DEX';
      if (isDodgeActive && isDexSave) {
        hasAdvantage = true;
      }
    }

    // Source-restricted save advantage (e.g. Holy Nimbus: advantage against Fiends/Undead for allies)
    if (!hasAdvantage && !current.disadvantage && current.attackerName) {
      const targetName = current.targetName;
      const attackerName = current.attackerName;
      const combatSummary = getCombatSummary(campaignName);
      const attackerCreature = combatSummary?.creatures?.find(c => utils.getName(c.name) === utils.getName(attackerName));
      if (attackerCreature) {
        const attackerType = (attackerCreature.type || '').toLowerCase();
        if (attackerType === 'fiend' || attackerType === 'undead') {
          for (const character of (characters || [])) {
            const charName = character.name;
            const holyNimbusActive = getRuntimeValue(charName, 'holyNimbusActive', campaignName);
            if (!holyNimbusActive) continue;
            const allyList = getAllyList(charName);
            if (allyList.includes(targetName)) {
              hasAdvantage = true;
              break;
            }
            if (allyList.length === 1) {
              hasAdvantage = true;
              break;
            }
          }
          // Also check NPCs with Holy Nimbus
          if (!hasAdvantage) {
            for (const creature of (combatSummary?.creatures || [])) {
              const creatureName = utils.getName(creature.name);
              if (creature.type === 'player') continue;
              const holyNimbusActive = getRuntimeValue(creatureName, 'holyNimbusActive', campaignName);
              if (!holyNimbusActive) continue;
              const allyList = getAllyList(creatureName);
              if (allyList.includes(targetName)) {
                hasAdvantage = true;
                break;
              }
              if (allyList.length === 1) {
                hasAdvantage = true;
                break;
              }
            }
          }
        }
      }
    }

    const roll1 = forceRollTo20Ref.current ? 20 : rollD20();
    const roll2 = current.disadvantage ? rollD20() : roll1;
    const finalRoll = current.disadvantage ? Math.min(roll1, roll2) : hasAdvantage ? Math.max(roll1, roll2) : roll1;
    let cosmicOmenAppliedBonus = 0;
    let cosmicOmenDetail = '';
    const cosmicOmenPendingRaw = getRuntimeValue('cosmicOmen', 'cosmicOmenPendingBonus');
    if (cosmicOmenPendingRaw) {
      try {
        const pending = JSON.parse(cosmicOmenPendingRaw);
        if (pending && typeof pending.value === 'number' && pending.value > 0) {
          const isWeal = pending.type === 'Weal';
          cosmicOmenAppliedBonus = isWeal ? pending.value : -pending.value;
          cosmicOmenDetail = `(${cosmicOmenAppliedBonus} from ${pending.type})`;
          setRuntimeValue('cosmicOmen', 'cosmicOmenPendingBonus', null, campaignName, true);
        }
      } catch (_e) { /* ignore */ }
    }

    // Bane: apply -1d4 penalty to saving throws for cursed targets
    let baneSavePenalty = 0;
    let baneSaveRoll = null;
    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const baneEffects = allTargetEffects.filter(te => te.target === current.targetName && te.effect === 'bane_penalty');
    if (baneEffects.length > 0) {
      const r = rollExpression('1d4');
      if (r) {
        baneSavePenalty = -r.total;
        baneSaveRoll = r.total;
      }
    }

    // Bane on attacker: grant +1d4 to the target's save when the attacker is cursed by Bane
    let baneAttackerBonus = 0;
    let baneAttackerRoll = null;
    if (current.attackerName) {
      const baneOnAttacker = allTargetEffects.filter(te => te.target === current.attackerName && te.effect === 'bane_penalty');
      if (baneOnAttacker.length > 0) {
        const r = rollExpression('1d4');
        if (r) {
          baneAttackerBonus = r.total;
          baneAttackerRoll = r.total;
        }
      }
    }

    // Bless: add 1d4 to saving throws
    let blessSaveBonus = 0;
    let blessSaveRoll = null;
    const blessEffects = allTargetEffects.filter(te => te.target === current.targetName && te.effect === 'bless_bonus');
    if (blessEffects.length > 0) {
      const r = rollExpression('1d4');
      if (r) {
        blessSaveBonus += r.total;
        blessSaveRoll = r.total;
      }
    }

    const total = finalRoll + saveBonus + auraBonus + cosmicOmenAppliedBonus + baneSavePenalty + blessSaveBonus + baneAttackerBonus;
    const success = total >= current.saveDc;
    const auraBonusStr = auraBonus > 0 ? `(+${auraBonus} aura${aura.sourceName ? ' from ' + aura.sourceName : ''})` : undefined;
    const bonusDetailParts = [auraBonusStr, cosmicOmenDetail];
    if (baneSaveRoll) {
      bonusDetailParts.push(`-${baneSaveRoll} [Bane]`);
    }
    if (baneAttackerRoll) {
      bonusDetailParts.push(`+${baneAttackerRoll} [Bane]`);
    }
    if (blessSaveRoll) {
      bonusDetailParts.push(`+${blessSaveRoll} [Bless]`);
    }
    const bonusDetail = bonusDetailParts.filter(Boolean).join(' ') || undefined;

    const rollMode = current.disadvantage ? 'disadvantage' : hasAdvantage ? 'advantage' : 'normal';

    const cs = getCombatSummary(campaignName);
    if (cs) {
      const lastAttackData = {
        attackerName: current.attackerName || current.targetName,
        targetName: current.targetName,
        d20: finalRoll,
        d20Rolls: [roll1, roll2],
        bonus: saveBonus + auraBonus + cosmicOmenAppliedBonus,
        total,
        rollType: 'save',
        saveType: current.saveType || null,
        saveDc: current.saveDc,
        saveResult: success ? 'success' : 'failure',
        saveConditions: current.condition ? [current.condition] : [],
        damageFormula: current.damageFormula || null,
        attackName: current.sourceName || current.name || null,
        damageType: current.damageType || null,
        rawDamage: current.rawDamage || 0,
        primaryDamage: current.rawDamage || 0,
        primaryDamageType: current.damageType || null,
        actualDamage: current.rawDamage || 0,
        damageApplied: (current.rawDamage || 0) > 0,
        ...(current.secondaryFormula ? {
          secondaryFormula: current.secondaryFormula,
          secondaryDamageType: current.secondaryDamageType || null,
          secondaryRawDamage: current.secondaryRawDamage || 0,
          secondaryTotal: current.secondaryRawDamage || 0,
        } : {}),
        timestamp: Date.now(),
      };
      storage.set('lastAttack', lastAttackData, campaignName);
    }

    setPrompts(prev => prev.map((p, i) =>
      i === 0
        ? { ...p, result: { success, roll: finalRoll, total, saveBonus: saveBonus + auraBonus + cosmicOmenAppliedBonus + baneSavePenalty + blessSaveBonus + baneAttackerBonus, bonusDetail, rawRolls: [roll1, roll2], mode: rollMode, baneRoll: baneSaveRoll, blessRoll: blessSaveRoll, baneAttackerRoll: baneAttackerRoll } }
        : p
    ));

    forceRollTo20Ref.current = false;
  }, [campaignName, current, characters, activeMapName, selectedAlliesRef]);

  const handleDone = useCallback(() => {
    if (!current) return;
    const result = current.result;
    if (!result) {
      advance();
      return;
    }

    const saveBonus = result.saveBonus;
    const rollMode = result.mode || 'normal';
    const rawRolls = result.rawRolls || [result.roll];

    sendSaveResult(campaignName, current.targetName, {
      promptId: current.promptId,
      success: result.success,
      roll: result.roll,
      total: result.total,
      saveBonus,
      rawRolls,
      mode: rollMode,
      bonusDetail: result.bonusDetail,
      baneRoll: result.baneRoll,
    });

    window.dispatchEvent(new CustomEvent('save-result', {
      detail: {
        promptId: current.promptId,
        targetName: current.targetName,
        saveType: current.saveType,
        saveDc: current.saveDc,
        success: result.success,
        roll: result.roll,
        total: result.total,
        saveBonus,
        bonusDetail: result.bonusDetail,
        baneRoll: result.baneRoll,
        rawDamage: current.rawDamage,
        dcSuccess: current.dcSuccess,
        rawRolls,
        mode: rollMode,
        evasionActive: lastEvasionState,
      },
    }));

    clearSavePrompt(campaignName, current.targetName);
    advance();
  }, [campaignName, current, lastEvasionState, advance]);

  const handleEvasionConfirm = useCallback((selectedNames) => {
    selectedAlliesRef.current = new Set(selectedNames);
    setEvasionSelection(null);
  }, []);

  const handleEvasionSkip = useCallback(() => {
    selectedAlliesRef.current = new Set();
    setEvasionSelection(null);
  }, []);

  const abilityLabel = current ? (current.saveType || '').toUpperCase() : '';
  const queueCount = prompts.length;
  const hasResult = current?.result != null;

  useEffect(() => {
    setRerollUsedForSave(false);
  }, [current?.promptId]);

  const targetCharacter = current && (characters || []).find(c => {
    const name = typeof c === 'string' ? c : c.name;
    return name && utils.getName(name) === utils.getName(current.targetName);
  });

  const rageDamageBonus = targetCharacter?.class?.class_levels?.[(targetCharacter.level || 1) - 1]?.rage_damage ?? 2;
  const fanaticalFocusUsed = current ? getRuntimeValue(current.targetName, 'fanaticalFocusUsed', campaignName) : false;
  const activeBuffsForSave = getRuntimeValue(current?.targetName, 'activeBuffs', campaignName) || [];
  const isRagingForSave = Array.isArray(activeBuffsForSave) && activeBuffsForSave.some(b => b.damageBonusExpression);
  const fanaticalFocusAvailable = isRagingForSave && !fanaticalFocusUsed;

  const livingLegendActive = current ? getRuntimeValue(current.targetName, 'livingLegendActive', campaignName) === true : false;
  const indomitableUses = current ? Number(getRuntimeValue(current?.targetName, 'indomitableUses', campaignName) ?? 0) : 0;
  const indomitableMax = 1;
  const targetClassLevel = targetCharacter?.class?.class_levels?.[(targetCharacter.level || 1) - 1] || {};
  const maxFocusPoints = targetClassLevel.focus_points || 0;
  const currentFocusPoints = current ? Number(getRuntimeValue(current.targetName, 'focusPoints', campaignName) ?? maxFocusPoints) : 0;
  const disciplinedSurvivorAvailable = !fanaticalFocusUsed && currentFocusPoints > 0;
  const livingLegendAvailable = livingLegendActive && !fanaticalFocusUsed && indomitableUses < indomitableMax;

  const guardedMindUsed = current ? getRuntimeValue(current.targetName, '_guardedMind_usedRest', campaignName) : false;
  const guardedMindSpecialAction = (targetCharacter?.computedStats?.automation?.specialActions || []).find(
    a => a.type === 'auto_reroll' && a.effect === 'override_fail_to_success' && a.oncePer === 'short_or_long_rest'
  );
  const validSaveTypes = ['Intelligence', 'Wisdom', 'Charisma', 'INT', 'WIS', 'CHA'];
  const isValidSaveType = current && validSaveTypes.includes(current.saveType);
  const guardedMindAvailable = !guardedMindUsed && guardedMindSpecialAction && isValidSaveType;

  const submitSaveResult = useCallback((saveData) => {
    const {
      promptId, targetName, success, roll, total, saveBonus, rawRolls, mode, bonusDetail,
      saveType, saveDc, condition, sourceName, damageFormula, damageType, rawDamage, dcSuccess,
      secondaryFormula, secondaryDamageType, secondaryRawDamage,
    } = saveData;

    sendSaveResult(campaignName, targetName, {
      promptId, success, roll, total, saveBonus, rawRolls, mode, bonusDetail,
    });
    setPrompts(prev => prev.map((p, i) =>
      i === 0
        ? { ...p, result: { success, roll, total, saveBonus, bonusDetail, rawRolls, mode } }
        : p
    ));

    addEntry(campaignName, {
      type: 'roll',
      rollType: 'save-damage',
      name: sourceName || 'Unknown',
      formula: damageFormula || '',
      rolls: [roll],
      total,
      modifier: saveBonus,
      damageType: damageType || null,
      targetName,
      saveType: saveType || null,
      saveDc: saveDc,
      saveResult: success ? 'success' : 'failure',
      saveRoll: roll,
      saveBonus,
      saveRawRolls: rawRolls,
      finalDamage: null,
      note: saveData.note || 'save_reroll',
      timestamp: Date.now(),
    }).catch((e) => { console.error('[SavePromptModal] Error logging reroll:', e); });

    const cs = getCombatSummary(campaignName);
    if (cs) {
      cs.lastAttack = {
        ...cs.lastAttack,
        d20: roll,
        d20Rolls: rawRolls,
        bonus: saveBonus,
        total,
        saveType: saveType || null,
        saveDc: saveDc,
        saveResult: success ? 'success' : 'failure',
        saveConditions: condition ? [condition] : [],
        timestamp: Date.now(),
        ...(secondaryFormula ? {
          secondaryFormula,
          secondaryDamageType: secondaryDamageType || null,
          secondaryRawDamage: secondaryRawDamage || 0,
          secondaryTotal: secondaryRawDamage || 0,
        } : {}),
      };
      storage.set('combatSummary', cs, campaignName);
    }

    if (success && rawDamage > 0) {
      const lastAttack = getRuntimeValue('campaign', 'lastAttack', campaignName);
      const actualDamageApplied = lastAttack?.finalDamage ?? lastAttack?.primaryDamage ?? rawDamage;
      let damageToRestore;
      if (dcSuccess === 'half') {
        damageToRestore = Math.ceil(actualDamageApplied / 2);
      } else {
        damageToRestore = actualDamageApplied;
      }
      const currentHp = getRuntimeValue(targetName, 'hitPoints', campaignName);
      const maxHp = getRuntimeValue(targetName, 'maxHitPoints', campaignName) ?? (currentHp + actualDamageApplied);
      const restoredHp = Math.min(maxHp, (currentHp ?? 0) + damageToRestore);
      setRuntimeValue(targetName, 'hitPoints', restoredHp, campaignName);

      addEntry(campaignName, {
        type: 'roll',
        characterName: targetName,
        rollType: 'healing',
        name: saveData.healingName || 'Save Reroll',
        rolls: [],
        total: damageToRestore,
        modifier: 0,
        damageType: null,
        targetName,
        finalDamage: null,
        note: saveData.healingNote || 'save_reroll_hp_restore',
        timestamp: Date.now(),
      }).catch((e) => { console.error('[SavePromptModal] Error logging HP restore:', e); });
    }

    clearSavePrompt(campaignName, targetName);
  }, [campaignName]);

  const handleFanaticalFocus = useCallback(async () => {
    if (!fanaticalFocusAvailable || !current) return;
    setRerollUsedForSave(true);
    setRuntimeValue(current.targetName, 'fanaticalFocusUsed', true, campaignName);
    const rerollBonus = rageDamageBonus;
    let saveBonus = 0;
    let character = null;
    try {
      character = (characters || []).find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name && utils.getName(name) === utils.getName(current.targetName);
      });
      if (character && typeof character !== 'string') {
        saveBonus = getAbilitySaveBonus(character.computedStats || character, current.saveType);
      }
    } catch { /* ignore */ }
    const aura = await computeAuraBonus({ targetName: current.targetName, characters, campaignName, activeMapName, allCreatures: getCombatSummary(campaignName)?.creatures });
    const roll1 = rollD20();
    const roll2 = current.disadvantage ? rollD20() : roll1;
    const finalRoll = current.disadvantage ? Math.min(roll1, roll2) : roll1;
    const total = finalRoll + saveBonus + aura.bonus + rerollBonus;
    const success = total >= current.saveDc;
    submitSaveResult({
      promptId: current.promptId,
      targetName: current.targetName,
      success,
      roll: finalRoll,
      total,
      saveBonus: saveBonus + aura.bonus + rerollBonus,
      rawRolls: [roll1, roll2],
      mode: current.disadvantage ? 'disadvantage' : 'normal',
      bonusDetail: `(+${rerollBonus} Fanatical Focus)`,
      saveType: current.saveType,
      saveDc: current.saveDc,
      condition: current.condition,
      sourceName: current.sourceName,
      damageFormula: current.damageFormula,
      damageType: current.damageType,
      rawDamage: current.rawDamage,
      dcSuccess: current.dcSuccess,
      secondaryFormula: current.secondaryFormula,
      secondaryDamageType: current.secondaryDamageType,
      secondaryRawDamage: current.secondaryRawDamage,
      note: 'fanatical_focus_reroll',
      healingName: 'Fanatical Focus',
      healingNote: 'fanatical_focus_hp_restore',
    });
  }, [fanaticalFocusAvailable, rageDamageBonus, current, campaignName, characters, activeMapName, submitSaveResult]);

  const handleDisciplinedSurvivor = useCallback(async () => {
    if (!disciplinedSurvivorAvailable || !current) return;
    setRerollUsedForSave(true);
    const newFocus = currentFocusPoints - 1;
    setRuntimeValue(current.targetName, 'focusPoints', newFocus, campaignName);
    let saveBonus = 0;
    let character = null;
    try {
      character = (characters || []).find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name && utils.getName(name) === utils.getName(current.targetName);
      });
      if (character && typeof character !== 'string') {
        saveBonus = getAbilitySaveBonus(character.computedStats || character, current.saveType);
      }
    } catch { /* ignore */ }
    const aura = await computeAuraBonus({ targetName: current.targetName, characters, campaignName, activeMapName, allCreatures: getCombatSummary(campaignName)?.creatures });
    const roll1 = rollD20();
    const roll2 = current.disadvantage ? rollD20() : roll1;
    const finalRoll = current.disadvantage ? Math.min(roll1, roll2) : roll1;
    const total = finalRoll + saveBonus + aura.bonus;
    const success = total >= current.saveDc;
    submitSaveResult({
      promptId: current.promptId,
      targetName: current.targetName,
      success,
      roll: finalRoll,
      total,
      saveBonus: saveBonus + aura.bonus,
      rawRolls: [roll1, roll2],
      mode: current.disadvantage ? 'disadvantage' : 'normal',
      bonusDetail: '(-1 Focus Point)',
      saveType: current.saveType,
      saveDc: current.saveDc,
      condition: current.condition,
      sourceName: current.sourceName,
      damageFormula: current.damageFormula,
      damageType: current.damageType,
      rawDamage: current.rawDamage,
      dcSuccess: current.dcSuccess,
      secondaryFormula: current.secondaryFormula,
      secondaryDamageType: current.secondaryDamageType,
      secondaryRawDamage: current.secondaryRawDamage,
      note: 'disciplined_survivor_reroll',
      healingName: 'Disciplined Survivor',
      healingNote: 'disciplined_survivor_hp_restore',
    });
  }, [disciplinedSurvivorAvailable, currentFocusPoints, current, campaignName, characters, activeMapName, submitSaveResult]);

  const handleGuardedMind = useCallback(async () => {
    if (!guardedMindAvailable || !current) return;
    setRerollUsedForSave(true);
    setRuntimeValue(current.targetName, '_guardedMind_usedRest', 'rest', campaignName);

    const saveLabel = (current.saveType || 'Save').toUpperCase();
    const success = true;
    submitSaveResult({
      promptId: current.promptId,
      targetName: current.targetName,
      success,
      roll: 20,
      total: current.saveDc,
      saveBonus: 0,
      rawRolls: [20],
      mode: 'normal',
      bonusDetail: '(Guarded Mind)',
      saveType: current.saveType,
      saveDc: current.saveDc,
      condition: current.condition,
      sourceName: current.sourceName,
      damageFormula: current.damageFormula,
      damageType: current.damageType,
      rawDamage: current.rawDamage,
      dcSuccess: current.dcSuccess,
      secondaryFormula: current.secondaryFormula,
      secondaryDamageType: current.secondaryDamageType,
      secondaryRawDamage: current.secondaryRawDamage,
      note: 'guarded_mind_reroll',
      healingName: 'Guarded Mind',
      healingNote: 'guarded_mind_hp_restore',
    });

    addEntry(campaignName, {
      type: 'ability_use',
      characterName: current.targetName,
      abilityName: 'Guarded Mind',
      description: `${current.targetName} used Guarded Mind to override a failed ${saveLabel} save.`,
      timestamp: Date.now(),
    }).catch((e) => { console.error('[SavePromptModal] Error:', e); });
  }, [guardedMindAvailable, current, campaignName, submitSaveResult]);

  return (
    <>
      {typeof EventSource !== 'undefined' && (
        <Subscriber
          campaignName={campaignName}
          handleEvent={(event) => {
            handleEvent(event);
            handleClearedEvent(event);
          }}
        />
      )}
      {current && (
        <div className={`sp-overlay${evasionSelection !== null ? ' sp-overlay--dimmed' : ''}`} onClick={handleDismiss}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <i className="fa-solid fa-shield-halved"></i> Saving Throw Required
              {queueCount > 1 && (
                <span className="sp-queue-info"> ({prompts.findIndex(p => p.promptId === current.promptId) + 1} of {queueCount})</span>
              )}
            </div>
            <div className="sp-body">
              <p><strong>{current.targetName}</strong> must make a <strong>{abilityLabel}</strong> saving throw.{current.advantage ? <span className="sp-advantage-badge"> (Advantage)</span> : ''}{current.disadvantage ? <span className="sp-disadvantage-badge"> (Disadvantage)</span> : ''}</p>
              <p className="sp-dc">DC {current.saveDc}</p>
              {current.dcSuccess === 'half' && (() => {
                const normalizedSaveType = normalizeSaveType(current.saveType);
                const targetChar = (characters || []).find(c => utils.getName(c.name) === utils.getName(current.targetName));
                const targetConditions = getRuntimeValue(current.targetName, 'activeConditions', campaignName) || [];
                const isIncapacitated = targetConditions.some(c => String(c).toLowerCase() === 'incapacitated');
                const ownEvasion = targetChar?.computedStats?.evasionEffects;
                const hasOwnEvasion = !isIncapacitated && ownEvasion?.some(ef => ef.saveType === normalizedSaveType);
                const hasSharedEvasion = !hasOwnEvasion && !isIncapacitated &&
                  (characters || []).some(c => {
                    if (utils.getName(c.name) === utils.getName(current.targetName)) return false;
                    const ev = c?.computedStats?.evasionEffects;
                    return ev?.some(ef => ef.saveType === normalizedSaveType && ef.shareable && ef.shareRange >= 5);
                  });
                const hasEvasion = hasOwnEvasion || hasSharedEvasion;
                return hasEvasion
                  ? <p className="sp-note sp-evasion">Evasion: No damage on success, half damage on failure</p>
                  : <p className="sp-note">Half damage on successful save</p>;
              })()}
              {current.dcSuccess === 'none' && <p className="sp-note">No damage on successful save</p>}
              {current.sourceName && <p className="sp-source">Source: {current.sourceName}</p>}
              {hasResult && (
                <div className={`sp-result ${current.result.success ? 'sp-result-success' : 'sp-result-fail'}`}>
                  <p className="sp-result-label">{current.result.success ? 'SAVE SUCCESS' : 'SAVE FAILURE'}</p>
                  <p className="sp-result-total">Total: <strong>{current.result.total}</strong> vs DC {current.saveDc}</p>
                  <p className="sp-result-breakdown">d20 ({current.result.roll}) + {current.result.saveBonus}{current.result.bonusDetail ? ' ' + current.result.bonusDetail : ''}{current.result.mode === 'advantage' ? ' (Advantage)' : current.result.mode === 'disadvantage' ? ' (Disadvantage)' : ''}</p>
                  {!current.result.success && !rerollUsedForSave && fanaticalFocusAvailable && (
                    <button className="sp-stroke-btn" onClick={handleFanaticalFocus} type="button">
                      <i className="fa-solid fa-rotate"></i> Reroll Save (+{rageDamageBonus})
                    </button>
                  )}
                  {!current.result.success && !rerollUsedForSave && disciplinedSurvivorAvailable && (
                    <button className="sp-stroke-btn" onClick={handleDisciplinedSurvivor} type="button">
                      <i className="fa-solid fa-rotate"></i> Reroll Save (1 Focus Point)
                    </button>
                  )}
                  {!current.result.success && !rerollUsedForSave && livingLegendAvailable && (
                    <button className="sp-stroke-btn" onClick={async () => {
                      if (!current) return;
                      setRerollUsedForSave(true);
                      let localSaveBonus = 0;
                      const localChar = (characters || []).find(c => {
                        const name = typeof c === 'string' ? c : c.name;
                        return name && utils.getName(name) === utils.getName(current.targetName);
                      });
                      if (localChar && typeof localChar !== 'string') {
                        localSaveBonus = getAbilitySaveBonus(localChar.computedStats || localChar, current.saveType);
                      }
                      const aura = await computeAuraBonus({ targetName: current.targetName, characters, campaignName, activeMapName, allCreatures: getCombatSummary(campaignName)?.creatures });
                      const roll1 = rollD20();
                      const roll2 = current.disadvantage ? rollD20() : roll1;
                      const finalRoll = current.disadvantage ? Math.min(roll1, roll2) : roll1;
                      const total = finalRoll + localSaveBonus + aura.bonus;
                      const success = total >= current.saveDc;
                      submitSaveResult({
                        promptId: current.promptId,
                        targetName: current.targetName,
                        success,
                        roll: finalRoll,
                        total,
                        saveBonus: localSaveBonus + aura.bonus,
                        rawRolls: [roll1, roll2],
                        mode: current.disadvantage ? 'disadvantage' : 'normal',
                        saveType: current.saveType,
                        saveDc: current.saveDc,
                        condition: current.condition,
                        sourceName: current.sourceName,
                        damageFormula: current.damageFormula,
                        damageType: current.damageType,
                        rawDamage: current.rawDamage,
                        dcSuccess: current.dcSuccess,
                        secondaryFormula: current.secondaryFormula,
                        secondaryDamageType: current.secondaryDamageType,
                        secondaryRawDamage: current.secondaryRawDamage,
                        note: 'living_legend_reroll',
                        healingName: 'Living Legend',
                        healingNote: 'living_legend_hp_restore',
                      });
                    }} type="button">
                      <i className="fa-solid fa-rotate"></i> Reroll Save
                    </button>
                  )}
                  {!current.result.success && !rerollUsedForSave && guardedMindAvailable && (
                    <button className="sp-stroke-btn" onClick={handleGuardedMind} type="button">
                      <i className="fa-solid fa-shield-halved"></i> Guarded Mind
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="sp-actions">
              {!hasResult ? (
                <>
                  <button className="sp-roll-btn" onClick={handleRollSave} type="button">
                    <i className="fa-solid fa-dice-d20"></i> Roll Save
                  </button>
                  <button className="sp-dismiss-btn" onClick={handleDismiss} type="button">
                    Dismiss
                  </button>
                </>
              )               : (
                <button className="sp-roll-btn" onClick={handleDone} type="button">
                  {queueCount > 1 ? 'Next Save' : 'Done'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {evasionSelection !== null && (
        <div className="sp-overlay sp-overlay--evasion" onClick={() => handleEvasionSkip()}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <i className="fa-solid fa-shield-halved"></i> Leading Evasion — Choose Allies
            </div>
            <div className="sp-body">
              <p>Which of the following creatures making this save should benefit from <strong>Leading Evasion</strong>?</p>
              <p className="sp-note">Select all allies within 5 feet of the Bard. On a successful save, selected allies take no damage. On a failure, they take half damage.</p>
              <div className="secondary-target-list">
                {prompts.map((prompt, i) => (
                  <label
                    key={i}
                    className={`secondary-target-row ${evasionSelection?.selectedAllies?.includes(prompt.targetName) ? 'secondary-target-selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentSelection = evasionSelection?.selectedAllies || [];
                      const isSelected = currentSelection.includes(prompt.targetName);
                      setEvasionSelection({
                        selectedAllies: isSelected
                          ? currentSelection.filter(n => n !== prompt.targetName)
                          : [...currentSelection, prompt.targetName],
                      });
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(evasionSelection?.selectedAllies || []).includes(prompt.targetName)}
                      onChange={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="secondary-target-name">
                      <strong>{prompt.targetName}</strong>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sp-actions">
              <button
                className="sp-roll-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEvasionConfirm(evasionSelection?.selectedAllies || []);
                }}
                disabled={(evasionSelection?.selectedAllies || []).length === 0}
                type="button"
              >
                <i className="fa-solid fa-shield-halved"></i> Apply Evasion ({(evasionSelection?.selectedAllies || []).length})
              </button>
              <button className="sp-dismiss-btn" onClick={(e) => {
                e.stopPropagation();
                handleEvasionSkip();
              }} type="button">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SavePromptModal;
