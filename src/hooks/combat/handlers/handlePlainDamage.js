import { rollExpression, rollExpressionDoubled, formatDamageFormula } from '../../../services/dice/diceRoller.js';
import { addEntry } from '../../../services/ui/logService.js';
import utils from '../../../services/ui/utils.js';
import { applyDamageToTarget, clearReTriggeredSequence } from '../../../services/rules/combat/applyDamage.js';
import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { hasIgnoreResistance, hasGreatWeaponFighting, applyGreatWeaponFightingToDamage } from '../../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { applyMinDamageAdjustment } from '../loggedDiceRollUtils.js';
import { hasBardicInspirationOffense, getBardicInspirationDieSize, getBardicInspirationDieSizeFromClass } from '../../../services/combat/auras/bardicInspirationState.js';
import { hasEmpoweredSpell } from '../../../services/rules/spells/empoweredSpellService.js';
import { getChaModifier } from '../../../services/rules/spells/metamagicRules.js';
import { sendSavePrompt } from '../../../services/combat/conditions/savePromptService.js';
import { handleOverchannelSelfDamage } from './handleOverchannelSelfDamage.js';

export function createPlainDamageHandler(deps) {
    const { characterName, campaignName, characters, setPopupHtml, logEntry } = deps;

    return async function handlePlainDamage(name, formula, total, rolls, modifier, context, adjustedTotal, combatSummary, displayRolls, gwfBaseRolls, gwfDisplayRolls) {
        const { damageType, attackerName } = context || {};
        const target = combatSummary?.creatures?.find(c => c.name === context?.targetName) || null;
        const targetMaxHp = target?.type === 'player'
            ? (getRuntimeValue(target.name, 'hitPoints') ?? 0)
            : target?.maxHp ?? 0;

        let applyResult = null;
        let secondaryResult = null;
        let secondaryFinalDamage = 0;
        let secondaryApplyResultData = null;
        let reducedTotal = 0;
        let rayReduction = 0;
        let rayOfEnfeebleRoll = null;
        let resistanceReduction = 0;
        let resistanceRoll = null;

        if (target) {
            const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName) || null;
            const attackHit = context?.isOpportunityAttack && lastAttack?.hit === true && lastAttack?.attackerName === characterName;
            if (attackHit) {
                const playerCharacter = (characters || []).find(c => c.name === characterName || c.name.startsWith(characterName + ' '));
                const computed = playerCharacter?.computedStats || playerCharacter;
                const allFeatures = computed?.characterAdvancement || [];
                const hasSentinel = allFeatures.some(f => f.name === 'Sentinel');
                if (hasSentinel) {
                    const sentinelStoredEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                    const newEffect = {
                        target: target.name,
                        source: 'Sentinel',
                        option: 'Halt',
                        effect: 'speed_zero',
                        value: null,
                        duration: 'end_of_turn',
                    };
                    const updatedEffects = [...sentinelStoredEffects, newEffect];
                    setRuntimeValue('campaign', 'targetEffects', updatedEffects, campaignName);
                }
            }
            const attacker = attackerName || characterName;
            const rayTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const rayDebuffOnAttacker = rayTargetEffects.some(te => te.target === attacker && te.effect === 'ray_of_enfeeble_debuff');
            if (rayDebuffOnAttacker) {
                const rayRoll = rollExpression('1d8');
                rayReduction = rayRoll?.total || 0;
                rayOfEnfeebleRoll = rayRoll?.total ?? null;
            }
            const resTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const resEffectOnTarget = resTargetEffects.find(te => te.target === target?.name && te.effect === 'resistance_damage_reduction');
            if (resEffectOnTarget && damageType && resEffectOnTarget.chosenType?.toLowerCase() === damageType.toLowerCase()) {
                const alreadyUsed = getRuntimeValue(target?.name, 'resistanceUsedThisTurn', campaignName) === true;
                if (!alreadyUsed) {
                    const resRoll = rollExpression('1d4');
                    resistanceReduction = resRoll?.total || 0;
                    resistanceRoll = resRoll?.total ?? null;
                    setRuntimeValue(target?.name, 'resistanceUsedThisTurn', true, campaignName);
                    addEntry(campaignName, {
                        type: 'ability_use',
                        characterName: target?.name,
                        abilityName: 'Resistance',
                        description: `${target?.name} reduced damage by ${resistanceReduction} (1d4) via Resistance.`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error("[resistance] Error:", e); });
                }
            }
            reducedTotal = Math.max(0, adjustedTotal - rayReduction - resistanceReduction);
            const ignoreResistance = (context?.playerStats && hasIgnoreResistance(context.playerStats, damageType)) || false;

            if (context?.autoDamageSecondaryFormula) {
                const secondaryFormula = context.autoDamageSecondaryFormula;
                const secondaryName = context.autoDamageSecondaryName || name;
                const secondaryDamageType = context.autoDamageSecondaryDamageType;
                const secondaryRollResult = context?.isAutoCrit ? rollExpressionDoubled(secondaryFormula) : rollExpression(secondaryFormula);
                if (secondaryRollResult) {
                    let secondaryTotal = applyMinDamageAdjustment(secondaryRollResult.total, secondaryRollResult.rolls, context?.playerStats, secondaryDamageType);
                    if (hasGreatWeaponFighting(context?.playerStats)) {
                        const gwfSecondaryRolls = applyGreatWeaponFightingToDamage(secondaryRollResult.rolls, context?.playerStats);
                        const hasSecondaryChanges = gwfSecondaryRolls.some((r, i) => r !== secondaryRollResult.rolls[i]);
                        if (hasSecondaryChanges) {
                            const gwfSecondaryTotal = gwfSecondaryRolls.reduce((sum, r) => sum + r, 0) + secondaryRollResult.modifier;
                            secondaryTotal = applyMinDamageAdjustment(gwfSecondaryTotal, gwfSecondaryRolls, context?.playerStats, secondaryDamageType);
                        }
                    }
                    let secondaryRawDamage = secondaryTotal;
                    const secondaryIgnoreResistance = (context?.playerStats && hasIgnoreResistance(context.playerStats, secondaryDamageType)) || false;
                    const damageSequenceId = `seq_${Date.now()}_${Math.random()}`;
                    const multiAttackOptions = { damageSequenceId };
                    secondaryApplyResultData = await applyDamageToTarget(combatSummary, target.name, secondaryRawDamage, [secondaryDamageType], campaignName, characters, secondaryIgnoreResistance, characterName, true, { ...multiAttackOptions, skipConcentration: true });
                    secondaryFinalDamage = secondaryApplyResultData?.finalDamage ?? secondaryRawDamage;
                    if (secondaryApplyResultData && secondaryApplyResultData.finalDamage > 0) {
                        endInvisibilityOnHostileAction(characterName, campaignName);
                    }
                    secondaryResult = {
                        name: secondaryName,
                        formula: secondaryFormula,
                        rolls: secondaryRollResult.rolls,
                        total: secondaryTotal,
                        modifier: secondaryRollResult.modifier,
                        damageType: secondaryDamageType,
                        finalDamage: secondaryFinalDamage,
                        resistanceDetails: secondaryApplyResultData?.resistanceDetails || [],
                    };

                    const totalConcentrationDamage = reducedTotal + secondaryRawDamage;
                    const primaryApplyResult = await applyDamageToTarget(combatSummary, target.name, reducedTotal, [damageType], campaignName, characters, ignoreResistance, characterName, true, { ...multiAttackOptions, concentrationTotalDamage: totalConcentrationDamage });
                    applyResult = rayReduction > 0 ? { ...primaryApplyResult, rayOfEnfeebleReduction: rayReduction } : primaryApplyResult;
                    clearReTriggeredSequence(damageSequenceId);
                }
            } else {
                const primaryApplyResult = await applyDamageToTarget(combatSummary, target.name, reducedTotal, [damageType], campaignName, characters, ignoreResistance, characterName, true);
                applyResult = rayReduction > 0 ? { ...primaryApplyResult, rayOfEnfeebleReduction: rayReduction } : primaryApplyResult;
            }
        }

        const isIntercepted = applyResult?.intercepted;
        const appliedDamage = isIntercepted ? (applyResult.damageDealt ?? 0) : (applyResult?.finalDamage ?? 0);

        if (appliedDamage > 0) {
            endInvisibilityOnHostileAction(characterName, campaignName);
        }

        const totalDamageDealt = appliedDamage + secondaryFinalDamage;
        const newHp = applyResult?.newHp ?? (target ? (target.type === 'player' ? getRuntimeValue(target.name, 'currentHitPoints') ?? target.currentHp : target.currentHp) : 0);
        const hpAfterDamage = isIntercepted ? 0 : newHp;
        const oldHp = isIntercepted ? applyResult.oldHp : (newHp + totalDamageDealt);
        const isUnconscious = hpAfterDamage <= 0;
        const maxHp = target?.type === 'player'
            ? (getRuntimeValue(target.name, 'hitPoints') ?? newHp)
            : target?.maxHp;
        const wasAlive = oldHp > 0;
        const wasBloodied = oldHp > 0 && oldHp <= Math.floor(maxHp / 2);
        const isBloodied = newHp > 0 && newHp <= Math.floor(maxHp / 2);
        let threshold;
        if (!wasAlive && isUnconscious) threshold = 'dead';
        else if (!wasBloodied && isBloodied) threshold = 'bloodied';
        else if (wasBloodied && !isBloodied && newHp > 0) threshold = 'recovering';

        const isCrit = context?.isAutoCrit || false;
        const displayFormula = isCrit ? formatDamageFormula(formula, rolls, true) : formula;

        const logEntryData = {
            type: 'roll',
            characterName,
            rollType: 'damage',
            name,
            formula: displayFormula,
            rolls: displayRolls,
            total: adjustedTotal,
            modifier,
            damageType,
            targetName: target?.name,
            finalDamage: appliedDamage || reducedTotal,
            note: 'combined_damage_roll',
            isCrit,
            gwfApplied: gwfDisplayRolls !== gwfBaseRolls,
            gwfOriginalRolls: gwfDisplayRolls !== gwfBaseRolls ? gwfBaseRolls : null,
            gwfDisplayRolls: gwfDisplayRolls,
            rayOfEnfeebleReduction: rayReduction,
            rayOfEnfeebleRoll: rayOfEnfeebleRoll,
            resistanceReduction,
            resistanceRoll,
        };
        if (secondaryResult) {
            logEntryData.secondaryName = secondaryResult.name;
            logEntryData.secondaryFormula = secondaryResult.formula;
            logEntryData.secondaryRolls = secondaryResult.rolls;
            logEntryData.secondaryTotal = secondaryResult.total;
            logEntryData.secondaryModifier = secondaryResult.modifier;
            logEntryData.secondaryDamageType = secondaryResult.damageType;
            logEntryData.secondaryFinalDamage = secondaryResult.finalDamage;
        }
        logEntry(logEntryData);

        const damageBreakdown = [{
            damageType,
            amount: appliedDamage || reducedTotal,
            resisted: applyResult?.resistanceDetails?.some(rd => rd.status === 'resistant') ?? false,
            status: applyResult?.resistanceDetails?.[0]?.status || null,
        }];
        if (secondaryResult) {
            damageBreakdown.push({
                damageType: secondaryResult.damageType,
                amount: secondaryResult.finalDamage,
                resisted: secondaryResult.resistanceDetails?.some(rd => rd.status === 'resistant') ?? false,
                status: secondaryResult.resistanceDetails?.[0]?.status || null,
            });
        }

        const hpEntry = {
            type: 'hp_change',
            targetName: target?.name,
            delta: -(totalDamageDealt),
            currentHp: hpAfterDamage,
            maxHp,
            isHealing: false,
            isUnconscious: isUnconscious,
            damageBreakdown,
        };
        if (threshold) hpEntry.threshold = threshold;
        addEntry(campaignName, hpEntry).catch((e) => { console.error("[useLoggedDiceRollDamage] Error:", e); });

        if (target?.type === 'player') {
            setRuntimeValue(target.name, 'currentHitPoints', newHp, campaignName);
            if (oldHp > 0 && isUnconscious) {
                setRuntimeValue(target.name, 'deathSaves', [false, false, false], campaignName);
                setRuntimeValue(target.name, 'deathFailures', [false, false, false], campaignName);
            }
        }

        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const deathStrikeEffect = storedEffects.find(te => te.effect === 'death_strike' && te.target === target?.name);
        if (deathStrikeEffect && target) {
            const dsSaveDc = deathStrikeEffect.saveDc;
            const dsSaveType = deathStrikeEffect.saveType;
            if (dsSaveDc && dsSaveType) {
                const promptId = utils.guid();
                sendSavePrompt(campaignName, {
                    promptId,
                    targetName: target.name,
                    saveType: dsSaveType,
                    saveDc: dsSaveDc,
                    dcSuccess: false,
                    advantage: false,
                    disadvantage: false,
                });
                const saveResultPromise = new Promise(resolve => {
                    const handler = (event) => {
                        if (event.detail.promptId !== promptId) return;
                        window.removeEventListener('save-result', handler);
                        resolve(event.detail);
                    };
                    window.addEventListener('save-result', handler);
                });
                const dsSaveResult = await saveResultPromise;
                if (!dsSaveResult.success) {
                    const doubledTotal = adjustedTotal * 2;
                    const ignoreResistance = (context?.playerStats && hasIgnoreResistance(context.playerStats, damageType)) || false;

                    logEntry({
                        type: 'roll',
                        characterName,
                        rollType: 'save-damage',
                        name: 'Death Strike',
                        formula: `2× ${formula}`,
                        rolls,
                        total: doubledTotal,
                        modifier,
                        damageType,
                        targetName: target.name,
                        saveType: dsSaveType,
                        saveDc: dsSaveDc,
                        saveResult: dsSaveResult.success ? 'success' : 'failure',
                        saveRoll: dsSaveResult.roll,
                        saveBonus: dsSaveResult.bonus,
                        saveRawRolls: dsSaveResult.rawRolls,
                        finalDamage: null,
                        note: 'death_strike_damage_roll_before_apply',
                    });

                    const dsApplyResult = await applyDamageToTarget(combatSummary, target.name, doubledTotal, [damageType], campaignName, characters, ignoreResistance || false, characterName);

                    if (!applyResult) {
                        applyResult = dsApplyResult;
                    }
                    setPopupHtml(prev => ({
                        ...prev,
                        deathStrikeDoubled: true,
                        deathStrikeSaveRoll: dsSaveResult.roll,
                        deathStrikeSaveBonus: dsSaveResult.bonus,
                        deathStrikeSaveDc: dsSaveDc,
                        deathStrikeFinalDamage: dsApplyResult?.finalDamage,
                    }));
                }
            }
            const cleanedEffects = storedEffects.filter(te => te.effect !== 'death_strike' || te.target !== target.name);
            setRuntimeValue('campaign', 'targetEffects', cleanedEffects, campaignName);
        }

        if (context?.ramActive && context?.isMelee && target && applyResult) {
            const isLargeOrSmaller = !target.size || ['Tiny', 'Small', 'Medium', 'Large'].includes(target.size);
            if (isLargeOrSmaller) {
                if (target.type === 'player') {
                    const conditions = getRuntimeValue(target.name, 'activeConditions', campaignName) || [];
                    if (Array.isArray(conditions) && !conditions.some(c => String(c).toLowerCase() === 'prone')) {
                        setRuntimeValue(target.name, 'activeConditions', [...conditions, 'Prone'], campaignName);
                    }
                } else {
                    const conditions = getRuntimeValue(target.name, 'activeConditions') || [];
                    if (!conditions.some(c => String(c).toLowerCase() === 'prone')) {
                        setRuntimeValue(target.name, 'activeConditions', [...conditions, 'Prone'], campaignName);
                    }
                }
                logEntry({
                    type: 'condition',
                    action: 'applied',
                    characterName: target.name,
                    condition: 'Prone',
                    reason: 'Power of the Wilds (Ram)',
                    timestamp: Date.now(),
                });
                window.dispatchEvent(new CustomEvent('combat-summary-updated'));
            }
        }

        handleOverchannelSelfDamage(characterName, campaignName, context, logEntry, characters);

        const popupData = {
            type: 'damage',
            name,
            formula,
            rolls,
            bonus: 0,
            modifier,
            dc: context?.dc,
            dcType: context?.dcType,
            dcSuccess: context?.dcSuccess,
            damageType,
            targetName: target?.name,
            total: adjustedTotal,
            adjustedTotal: adjustedTotal,
            elementalAdeptBonus: adjustedTotal > total ? adjustedTotal - total : 0,
            isCrit,
            gwfApplied: gwfDisplayRolls !== gwfBaseRolls,
            gwfOriginalRolls: gwfDisplayRolls !== gwfBaseRolls ? gwfBaseRolls : null,
            gwfDisplayRolls: gwfDisplayRolls,
            tavernBrawlerRerolls: context?.tavernBrawlerRerolls || null,
            rayOfEnfeebleReduction: rayReduction,
            rayOfEnfeebleRoll: rayOfEnfeebleRoll,
            resistanceReduction,
            resistanceRoll,
        };

        if (secondaryResult) {
            popupData.secondaryName = secondaryResult.name;
            popupData.secondaryFormula = secondaryResult.formula;
            popupData.secondaryRolls = secondaryResult.rolls;
            popupData.secondaryTotal = secondaryResult.total;
            popupData.secondaryModifier = secondaryResult.modifier;
            popupData.secondaryDamageType = secondaryResult.damageType;
            popupData.secondaryFinalDamage = secondaryResult.finalDamage;
        }

        popupData.targetCurrentHp = popupData.targetCurrentHp || (target?.type === 'player' ? (getRuntimeValue(target.name, 'hitPoints') ?? 0) : (target?.currentHp ?? target?.maxHp));
        popupData.targetMaxHp = popupData.targetMaxHp || targetMaxHp;

        if (applyResult) {
            popupData.targetCurrentHp = applyResult.newHp;
            popupData.targetMaxHp = targetMaxHp;
            popupData.damageApplied = true;
            popupData.finalDamage = appliedDamage || applyResult.finalDamage;
            popupData.damageReduced = applyResult.damageReduced;
            if (isIntercepted) {
                popupData.interceptedFeature = applyResult.interceptedFeature;
            }
            if (applyResult.holyAuraSaveResult) {
                popupData.holyAuraSaveResult = applyResult.holyAuraSaveResult;
            }
        }

        popupData.bardicInspirationOffense = context?.bardicInspirationOffense || (context?.playerStats ? hasBardicInspirationOffense(context.playerStats, campaignName) : false);
        popupData.bardicInspirationOffenseDieSize = context?.bardicInspirationOffenseDieSize || getBardicInspirationDieSize(characterName, campaignName) || (context?.playerStats ? getBardicInspirationDieSizeFromClass(context.playerStats) : null);
        popupData.empoweredSpell = context?.empoweredSpell || (context?.playerStats ? hasEmpoweredSpell(context.playerStats) : false);
        popupData.empoweredSpellChaMod = context?.empoweredSpellChaMod || getChaModifier(context?.playerStats);
        popupData.spellName = context?.spellName || '';

        // Check for Piercer - Puncture availability
        const isPiercing = (damageType || '').toLowerCase() === 'piercing';
        const hasPiercerFeat = context?.playerStats?.reactions?.some(r =>
            r.automation?.type === 'piercer_puncture'
        ) || false;
        const punctureUsed = hasPiercerFeat ? getRuntimeValue(characterName, 'piercerPunctureUsedThisTurn', campaignName) : false;
        popupData.piercerPuncture = isPiercing && hasPiercerFeat && !punctureUsed;

        // Determine weapon type for popup
        const isUnarmedStrike = context?.isUnarmedStrike || false;
        const isMelee = context?.isMelee != null ? context.isMelee : (context?.damageType === 'ranged' ? false : true);
        popupData.weaponType = isUnarmedStrike ? 'unarmed' : (isMelee ? 'melee' : 'ranged');

        // Check for Savage Attacker availability
        const hasSavageAttacker = context?.playerStats?.automation?.passives?.some(p => p.type === 'passive_rule' && p.effect === 'reroll_damage_once_per_turn') || false;
        const isMeleeOrUnarmed = (isMelee || isUnarmedStrike);
        const saUsed = hasSavageAttacker ? getRuntimeValue(characterName, '_Savage_Attacker_usedRound', campaignName) : false;
        popupData.savageAttacker = hasSavageAttacker && isMeleeOrUnarmed && !saUsed;

        setPopupHtml(popupData);

        // Store damage rolls for later access (e.g., Piercer feat) — merge into existing lastAttack
        if (popupData.rolls && popupData.damageType) {
            const existingLastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName) || {};

            const lastAttackData = {
                ...existingLastAttack,
                // Always populate from context to ensure attack-based spells have these fields
                // even if the attack roll SSE hasn't arrived yet
                attackerName: context?.attackerName || existingLastAttack.attackerName,
                targetName: context?.targetName || existingLastAttack.targetName,
                attackName: context?.attackName || context?.spellName || existingLastAttack.attackName,
                rolls: displayRolls,
                rawDamage: adjustedTotal,
                primaryDamage: adjustedTotal,
                primaryDamageType: damageType,
                damageTypes: [damageType],
                actualDamage: applyResult?.finalDamage ?? adjustedTotal,
                damageApplied: true,
                statusEffects: context?.statusEffects || null,
                affectedTargets: context?.affectedTargets || [target?.name].filter(Boolean),
            };

        setRuntimeValue('campaign', 'lastAttack', lastAttackData, campaignName);
        }

        if (context?.metamagicTwinTarget && target) {
            const twinTarget = combatSummary?.creatures?.find(c => c.name === context.metamagicTwinTarget);
            if (twinTarget && twinTarget.name !== target.name) {
                logEntry({
                    type: 'roll',
                    characterName,
                    rollType: 'damage',
                    name: `${name} (Twinned)`,
                    formula,
                    rolls: displayRolls,
                    total: adjustedTotal,
                    modifier,
                    damageType,
                    targetName: twinTarget.name,
                    finalDamage: null,
                    note: 'twin_damage_roll_before_apply',
                    gwfApplied: gwfDisplayRolls !== gwfBaseRolls,
                    gwfOriginalRolls: gwfDisplayRolls !== gwfBaseRolls ? gwfBaseRolls : null,
                    gwfDisplayRolls: gwfDisplayRolls,
                });

                const twinApplyResult = await applyDamageToTarget(combatSummary, twinTarget.name, adjustedTotal, [damageType], campaignName, characters, false, characterName);

                if (twinApplyResult && twinApplyResult.finalDamage > 0) {
                    endInvisibilityOnHostileAction(characterName, campaignName);
                }
                setPopupHtml(prev => ({
                    ...prev,
                    twinTargetName: twinTarget.name,
                    twinFinalDamage: twinApplyResult?.finalDamage,
                    twinTargetCurrentHp: twinApplyResult?.newHp,
                    twinTargetMaxHp: twinTarget.type === 'player'
                        ? (getRuntimeValue(twinTarget.name, 'hitPoints') ?? 0)
                        : twinTarget.maxHp,
                }));
            }
        }

        if (context?.multiTarget && target) {
            const multiTarget = combatSummary?.creatures?.find(c => c.name === context.multiTarget);
            if (multiTarget && multiTarget.name !== target.name) {
                logEntry({
                    type: 'roll',
                    characterName,
                    rollType: 'damage',
                    name: `${name} (Words of Creation)`,
                    formula,
                    rolls: displayRolls,
                    total: adjustedTotal,
                    modifier,
                    damageType,
                    targetName: multiTarget.name,
                    finalDamage: null,
                    note: 'multi_damage_roll_before_apply',
                    gwfApplied: gwfDisplayRolls !== gwfBaseRolls,
                    gwfOriginalRolls: gwfDisplayRolls !== gwfBaseRolls ? gwfBaseRolls : null,
                    gwfDisplayRolls: gwfDisplayRolls,
                });

                const multiApplyResult = await applyDamageToTarget(combatSummary, multiTarget.name, adjustedTotal, [damageType], campaignName, null, false, characterName);

                setPopupHtml(prev => ({
                    ...prev,
                    twinTargetName: multiTarget.name,
                    twinFinalDamage: multiApplyResult?.finalDamage,
                    twinTargetCurrentHp: multiApplyResult?.newHp,
                    twinTargetMaxHp: multiTarget.type === 'player'
                        ? (getRuntimeValue(multiTarget.name, 'hitPoints') ?? 0)
                        : multiTarget.maxHp,
                }));
            }
        }
    };
}
