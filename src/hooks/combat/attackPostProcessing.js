import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js';
import { rollExpression } from '../../services/dice/diceRoller.js';
import { loadCombatSummary } from '../../services/encounters/combatData.js';
import { hasIgnoreResistance } from '../../services/combat/automation/automationService.js';
import { applyDamageToTarget } from '../../services/rules/combat/applyDamage.js';
import { hasPotentCantrip, applyMinDamageAdjustment } from './loggedDiceRollUtils.js';
import { getEmpoweredEvocationFeatures, getEmpoweredEvocationIntModifier } from '../../services/rules/spells/postCastRiderService.js';
import { addEntry } from '../../services/ui/logService.js';

export async function processAttackAfterResult(hit, isAutoMiss, targetName, characterName, campaignName, context, combatSummary, characters, logEntry, setPopupHtml, state) {
    const { effectiveD20, r1, r2, bonus, effectiveD20Roll, isCrit, targetAc, effectiveAc, homingStrikesUsed, homingStrikesBonus, hit: finalHit, isAutoMiss: finalAutoMiss } = state;

    if (context?.rollType === 'attack') {
        const hsUsed = homingStrikesUsed;
        const hsBonus = homingStrikesBonus;
        setRuntimeValue(characterName, 'lastAttackRoll', {
            attackName: context?.attackName || context?.autoDamageName || context.name,
            attackerName: context?.attackerName || characterName,
            d20: effectiveD20,
            bonus: hsUsed ? (bonus + hsBonus) : bonus,
            targetName,
            targetAc,
            hit: finalHit,
            isCrit,
            effectiveAc,
            coverAcBonus: context?.coverAcBonus || 0,
            homingStrikesBonus: hsUsed ? hsBonus : undefined,
            timestamp: Date.now(),
        }, campaignName);

        if (combatSummary && targetName) {
            const lastAttackData = {
                attackerName: characterName,
                targetName,
                d20: effectiveD20,
                d20Rolls: [r1, r2],
                bonus: context.effectiveBonus,
                total: effectiveD20 + context.effectiveBonus,
                targetAc,
                effectiveAc,
                hit: finalHit,
                isCrit,
                weaponType: context?.isMelee != null
                    ? (context.isMelee ? 'melee' : 'ranged')
                    : (context?.damageType === 'ranged' ? 'ranged' : 'melee'),
                isUnarmedStrike: context?.isUnarmedStrike || false,
                isAutoMiss: finalAutoMiss,
                isNatural20: effectiveD20Roll === 20,
                isNatural1: effectiveD20Roll === 1,
                attackName: context.name,
                rollType: context?.rollType,
                damageType: context?.damageType || null,
                damageFormula: context?.autoDamageFormula || null,
                damageName: context?.autoDamageName || null,
                damageSchool: context?.autoDamageSchool || null,
                saveDc: context?.saveDc || null,
                saveType: context?.saveType || null,
                dcSuccess: context?.dcSuccess || null,
                metamagicTwinTarget: context?.metamagicTwinTarget || null,
                metamagicHeighten: context?.metamagicHeighten || null,
                isCantrip: context?.isCantrip || null,
                overchannelActive: context?.overchannelActive || null,
                overchannelUseCount: context?.overchannelUseCount || null,
                overchannelSpellLevel: context?.overchannelSpellLevel || null,
                secondaryFormula: context?.autoDamageSecondaryFormula || null,
                secondaryDamageType: context?.autoDamageSecondaryDamageType || null,
                rangeReason: context?.rangeReason || null,
                coverLevel: context?.coverLevel || null,
                coverAcBonus: context?.coverAcBonus || 0,
                coverReason: context?.coverReason || null,
                resistanceNotice: context?.resistanceNotice || null,
                forcedMode: context?.forcedMode || null,
                isAutoCrit: context?.isAutoCrit || false,
                autoReroll: context?.autoReroll || null,
                autoRerollBonus: context?.autoRerollBonus || null,
                defensiveDuelistBonus: context?.defensiveDuelistBonus || 0,
                baitAndSwitchBonus: context?.baitAndSwitchBonus || 0,
                statusEffects: context?.statusEffects || null,
                affectedTargets: context?.affectedTargets || [targetName],
            };
            setRuntimeValue('campaign', 'lastAttack', lastAttackData, campaignName);
        }

        setRuntimeValue(characterName, '_lastRollContext', {
            type: 'attack',
            attackName: context.name,
            damageFormula: context?.autoDamageFormula || null,
            damageType: context?.damageType || null,
            targetName,
            oldTotal: effectiveD20 + bonus,
            oldHit: hit,
            timestamp: Date.now(),
        }, campaignName);

        setRuntimeValue(characterName, 'pendingCombatSuperiorityPrompt', {
            rollType: 'attack',
            attackContext: {
                hit: finalHit,
                isCrit: isCrit,
                weaponType: context?.damageType === 'ranged' ? 'ranged' : 'melee',
                isUnarmedStrike: context?.isUnarmedStrike || false,
                targetName: targetName,
                saveDc: context?.saveDc || null,
                saveType: context?.saveType || null,
                timestamp: Date.now(),
            },
            timestamp: Date.now(),
        }, campaignName);

        // Miss effects (vex, etc.)
        if (!finalHit && !finalAutoMiss && targetName && context?.playerStats?.automation?.passives) {
            const missEffects = context.playerStats.automation.passives.filter(
                p => p.type === 'auto_effect' && p.trigger === 'miss' && p.effect === 'next_attack_advantage'
            );
            if (missEffects.length > 0) {
                const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                for (const effect of missEffects) {
                    const newEffect = {
                        target: characterName,
                        source: effect.name,
                        effect: 'next_attack_advantage',
                        vexTarget: targetName,
                        duration: effect.duration || 'until_start_of_next_turn',
                    };
                    storedEffects.push(newEffect);
                }
                setRuntimeValue('campaign', 'targetEffects', storedEffects, campaignName);
                for (const effect of missEffects) {
                    addEntry(campaignName, {
                        type: 'ability_use',
                        characterName: characterName,
                        abilityName: effect.name,
                        description: `${characterName}'s ${effect.name} grants advantage on the next attack roll against ${targetName}`,
                        targetName: targetName,
                    }).catch((e) => { console.error("[attackPostProcessing:log-error]", e); });
                }
            }
        }

        // Graze damage
        if (context?.grazeDamage && targetName && !finalHit && !finalAutoMiss) {
            await processGrazeDamage(context, targetName, characterName, campaignName, characters, logEntry, setPopupHtml);
        }

        // Vex/distracting strike/sap clearing on hit — each reads original effects and writes independently (matches original behavior)
        if (targetName && finalHit) {
            const allEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            // Vex clearing
            const vexEffects = allEffects.filter(te => te.effect === 'next_attack_advantage' && te.target === characterName && te.vexTarget === targetName);
            if (vexEffects.length > 0) {
                const clearedEffects = allEffects.filter(te => !(te.effect === 'next_attack_advantage' && te.target === characterName && te.vexTarget === targetName));
                setRuntimeValue('campaign', 'targetEffects', clearedEffects, campaignName);
            }
            // Distracting strike clearing
            const distractingEffects = allEffects.filter(te => te.effect === 'distracting_strike_advantage' && te.target === targetName && te.source !== characterName);
            if (distractingEffects.length > 0) {
                const clearedEffects = allEffects.filter(te => !(te.effect === 'distracting_strike_advantage' && te.target === targetName && te.source !== characterName));
                setRuntimeValue('campaign', 'targetEffects', clearedEffects, campaignName);
            }
            // Sap clearing
            const sapEffects = allEffects.filter(te => te.effect === 'disadvantage_next_attack' && te.target === characterName);
            if (sapEffects.length > 0) {
                const clearedEffects = allEffects.filter(te => !(te.effect === 'disadvantage_next_attack' && te.target === characterName));
                setRuntimeValue('campaign', 'targetEffects', clearedEffects, campaignName);
            }
        }
    }
}

async function processGrazeDamage(context, targetName, characterName, campaignName, characters, logEntry, setPopupHtml) {
    const grazeAbilityMod = context?.grazeAbilityMod || 0;
    const grazeDamageAmount = Math.max(0, grazeAbilityMod);
    if (grazeDamageAmount > 0) {
        const grazeDamageType = context?.damageType || 'Slashing';
        const grazeFormula = `${grazeDamageAmount} [Graze]`;
        const combatSummary2 = await loadCombatSummary(campaignName);
        const ignoreResistance = (context?.playerStats && hasIgnoreResistance(context.playerStats, grazeDamageType)) || false;
        const applyResult = await applyDamageToTarget(combatSummary2, targetName, grazeDamageAmount, [grazeDamageType], campaignName, characters, ignoreResistance, characterName);
        const grazeTargetMaxHp = context._target?.type === 'player'
            ? (getRuntimeValue(targetName, 'hitPoints') ?? 0)
            : context._target?.maxHp ?? 0;
        logEntry({
            type: 'roll',
            characterName,
            rollType: 'graze-damage',
            name: context.name,
            formula: grazeFormula,
            rolls: [grazeDamageAmount],
            total: grazeDamageAmount,
            modifier: 0,
            damageType: grazeDamageType,
            targetName: targetName,
            finalDamage: applyResult?.finalDamage,
            note: 'Graze: ability modifier damage on miss',
        });
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: characterName,
            abilityName: 'Graze',
            description: `${characterName} used Graze on ${context.name} against ${targetName}`,
            targetName: targetName,
        }).catch((e) => { console.error("[attackPostProcessing:log-error]", e); });
        setPopupHtml({
            type: 'graze-damage',
            name: `${context.name} (Graze)`,
            formula: grazeFormula,
            rolls: [grazeDamageAmount],
            bonus: 0,
            modifier: 0,
            damageType: grazeDamageType,
            targetName: targetName,
            total: grazeDamageAmount,
            targetCurrentHp: applyResult?.newHp,
            targetMaxHp: grazeTargetMaxHp,
            damageApplied: true,
            finalDamage: applyResult?.finalDamage,
            damageReduced: applyResult?.damageReduced,
        });
    }
}

export async function processPotentCantrip(hit, isAutoMiss, targetName, characterName, campaignName, context, combatSummary, characters, logEntry, setPopupHtml) {
    const potentPlayerStats = context?.playerStats;
    const hasPotentCantripFlag = hasPotentCantrip(potentPlayerStats);
    if (!hasPotentCantripFlag) return;
    if (!context?.autoDamageFormula) return;
    if (hit) return;

    const potentFormula = context.autoDamageFormula;
    const storedDamageResult = context?.autoDamageRollResult;

    if (!isAutoMiss) {
        await processPotentCantripMissDamage(potentFormula, storedDamageResult, hit, isAutoMiss, targetName, characterName, campaignName, context, combatSummary, characters, logEntry, setPopupHtml, 'miss');
    } else if (context?.saveDc) {
        await processPotentCantripMissDamage(potentFormula, storedDamageResult, hit, isAutoMiss, targetName, characterName, campaignName, context, combatSummary, characters, logEntry, setPopupHtml, 'autoMiss');
    }
}

async function processPotentCantripMissDamage(potentFormula, storedDamageResult, hit, isAutoMiss, targetName, characterName, campaignName, context, combatSummary, characters, logEntry, setPopupHtml, missType) {
    const potentPlayerStats = context?.playerStats;
    const hasEmpoweredEvoc = getEmpoweredEvocationFeatures(potentPlayerStats).length > 0;
    const empEvocIntMod = hasEmpoweredEvoc ? getEmpoweredEvocationIntModifier(potentPlayerStats) : 0;
    const spellSchool = (context?.autoDamageSchool || '').toLowerCase();
    const isEvocation = spellSchool === 'evocation';
    const shouldApplyEmpoweredEvoc = hasEmpoweredEvoc && isEvocation && empEvocIntMod > 0;
    let finalFormula = potentFormula;
    if (shouldApplyEmpoweredEvoc) {
        finalFormula = `${potentFormula} + ${empEvocIntMod} [Empowered Evocation]`;
    }

    let damageResult;
    let adjustedTotal;

    if (storedDamageResult && missType === 'miss') {
        const adjustedStoredTotal = applyMinDamageAdjustment(storedDamageResult.total, storedDamageResult.rolls, context?.playerStats, context?.damageType);
        adjustedTotal = adjustedStoredTotal;
    } else {
        damageResult = rollExpression(finalFormula);
        if (!damageResult) return;
        adjustedTotal = applyMinDamageAdjustment(damageResult.total, damageResult.rolls, context?.playerStats, context?.damageType);
    }

    const halfDamage = Math.floor(adjustedTotal / 2);
    const combatSummary2 = await loadCombatSummary(campaignName);
    const ignoreResistance = (context?.playerStats && hasIgnoreResistance(context.playerStats, context?.damageType)) || false;
    const applyResult = await applyDamageToTarget(combatSummary2, targetName, halfDamage, [context?.damageType], campaignName, characters, ignoreResistance, context.attackerName || characterName);
    const missTargetMaxHp = context._target?.type === 'player'
        ? (getRuntimeValue(targetName, 'hitPoints') ?? 0)
        : context._target?.maxHp ?? 0;

    logEntry({
        type: 'roll',
        characterName,
        rollType: 'cantrip-miss-half-damage',
        name: context.name,
        formula: finalFormula,
        rolls: damageResult?.rolls || storedDamageResult?.rolls || [],
        total: halfDamage,
        modifier: damageResult?.modifier ?? storedDamageResult?.modifier ?? 0,
        damageType: context?.damageType,
        targetName: targetName,
        isPotentCantrip: true,
    });

    setPopupHtml({
        type: 'save-damage',
        name: context.name,
        formula: finalFormula,
        rolls: damageResult?.rolls || storedDamageResult?.rolls || [],
        total: applyResult?.finalDamage,
        bonus: damageResult?.modifier ?? storedDamageResult?.modifier ?? 0,
        modifier: damageResult?.modifier ?? storedDamageResult?.modifier ?? 0,
        damageType: context?.damageType,
        targetName: targetName,
        targetCurrentHp: applyResult?.newHp,
        targetMaxHp: missTargetMaxHp,
        saveDc: context?.saveDc,
        saveType: context?.saveType,
        dcSuccess: 'half',
        finalDamage: applyResult?.finalDamage,
        damageApplied: true,
        damageReduced: applyResult?.damageReduced,
        isPotentCantrip: true,
    });
}
