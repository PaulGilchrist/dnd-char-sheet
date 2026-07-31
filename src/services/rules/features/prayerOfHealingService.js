import { rollExpression, rollExpressionMaximized } from '../../dice/diceRoller.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { applyHealingToTarget } from '../combat/applyHealing.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';
import { getDistanceFeet, rangeToFeet } from '../combat/rangeValidation.js';
import { isDistanceInRange } from '../combat/rangeCheck.js';
import { resolveHealingBonusesWithDetails, hasHealingMaximization, hasHealingMaximizationForTarget, markFortifiedHealthUsed } from '../../combat/automation/automationService.js';

const PRAYER_OF_HEALING_NAME = 'Prayer of Healing';

function isPrayerOfHealing(spell) {
    return (spell.name || '') === PRAYER_OF_HEALING_NAME;
}

function getSpellCastingMod(playerStats, spell) {
    const cantripSpellAbility = spell.spellCastingAbility || playerStats.spellAbilities?.spellCastingAbility;
    if (cantripSpellAbility && playerStats.abilities) {
        const ability = playerStats.abilities.find(a => a.name === cantripSpellAbility);
        if (ability) {
            return ability.bonus;
        }
    }
    if (playerStats.spellAbilities) {
        return playerStats.spellAbilities.modifier || 0;
    }
    return 0;
}

function resolveHealExpression(spell, slotLevel, spellCastingMod) {
    const healAtSlotLevel = spell.heal_at_slot_level;
    if (!healAtSlotLevel) return null;

    let expression = healAtSlotLevel[slotLevel];
    if (!expression) {
        const levels = Object.keys(healAtSlotLevel).map(Number).sort((a, b) => a - b);
        const highestBelow = levels.filter(l => l <= slotLevel).pop();
        if (highestBelow) {
            expression = healAtSlotLevel[highestBelow];
        }
    }
    if (!expression) return null;

    if (spellCastingMod !== null && spellCastingMod !== undefined) {
        expression = expression.replace(/\bMOD\b/g, String(spellCastingMod));
    }
    return expression;
}

function getAffectedKey(targetName) {
    return `prayerOfHealing_lastUsedRound_${targetName}`;
}

function isAffectedByPrayerOfHealing(targetName, campaignName, currentRound) {
    const usedRound = getRuntimeValue(targetName, getAffectedKey(targetName), campaignName);
    if (!usedRound) return false;
    return usedRound === currentRound;
}

function markPrayerOfHealingUsed(targetName, campaignName, currentRound) {
    setRuntimeValue(targetName, getAffectedKey(targetName), currentRound, campaignName);
}

export async function triggerPrayerOfHealing(spell, metaCtx, playerStats, campaignName, _mapName) {
    if (!isPrayerOfHealing(spell)) {
        return null;
    }

    const slotLevel = metaCtx?.slotLevel || spell.level || 2;
    const spellCastingMod = getSpellCastingMod(playerStats, spell);
    const healExpression = resolveHealExpression(spell, slotLevel, spellCastingMod);

    if (!healExpression) {
        return null;
    }

    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) {
        return null;
    }

    const cs = await getCombatContext(campaignName);
    const currentRound = cs?.round || 1;
    const casterName = playerStats.name;
    const rangeFt = rangeToFeet(spell.range || '30 feet');
    const casterPos = combatSummary.players?.find(p => p.name === casterName);
    const casterGridPos = casterPos ? { gridX: casterPos.gridX, gridY: casterPos.gridY } : null;

    const maxTargets = 5;
    const targets = [];

    if (casterGridPos) {
        const sortedCreatures = [...(() => { const x = combatSummary.creatures; if (x == null) { console.error('[prayerOfHealingService] Missing array:', x); throw new Error('Expected array, got ' + x); } return x; })()]
            .filter(c => c.name !== casterName)
            .map(c => {
                const targetPlayer = combatSummary.players?.find(p => p.name === c.name);
                const targetNpc = combatSummary.placedItems?.find(i => i.name === c.name);
                const targetGridX = targetPlayer?.gridX ?? targetNpc?.gridX;
                const targetGridY = targetPlayer?.gridY ?? targetNpc?.gridY;
                const dist = (targetGridX != null && targetGridY != null)
                    ? getDistanceFeet(casterGridPos, { gridX: targetGridX, gridY: targetGridY })
                    : null;
                return { creature: c, dist, gridX: targetGridX, gridY: targetGridY };
            })
            .filter(item => isDistanceInRange(item.dist, rangeFt))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, maxTargets);

        for (const item of sortedCreatures) {
            targets.push(item.creature);
        }
    } else {
        const eligible = (() => { const x = combatSummary.creatures; if (x == null) { console.error('[prayerOfHealingService] Missing array:', x); throw new Error('Expected array, got ' + x); } return x; })()
            .filter(c => c.name !== casterName)
            .slice(0, maxTargets);
        targets.push(...eligible);
    }

    if (targets.length === 0) {
        return { noTargets: true };
    }

    const maximize = hasHealingMaximization(playerStats);
    const { totalBonus: bonusHeal, details: bonusDetails } = resolveHealingBonusesWithDetails(playerStats, playerStats.proficiency || 0, playerStats.level || 1, slotLevel, campaignName);
    const results = [];
    const allRolls = [];
    let totalHealed = 0;

    for (const target of targets) {
        const targetName = target.name;

        if (isAffectedByPrayerOfHealing(targetName, campaignName, currentRound)) {
            continue;
        }

        const maxHp = target.maxHp || playerStats.hitPoints || 0;
        const storedHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName);
        const currentHp = storedHp != null && storedHp !== '' ? Number(storedHp) : maxHp;
        const targetMaximize = hasHealingMaximizationForTarget(playerStats, targetName, campaignName);
        const rollResult = targetMaximize || maximize ? rollExpressionMaximized(healExpression) : rollExpression(healExpression);
        if (!rollResult) continue;

        const targetHealAmount = rollResult.total + bonusHeal;
        const actualHeal = Math.min(targetHealAmount, maxHp - currentHp);

        if (actualHeal > 0) {
            applyHealingToTarget(combatSummary, targetName, actualHeal, campaignName);
            markPrayerOfHealingUsed(targetName, campaignName, currentRound);
        }

        const newHp = Math.min(maxHp, currentHp + actualHeal);

        const formulaParts = [healExpression];
        if (bonusDetails.length > 0) {
            const bonusParts = bonusDetails.map(d => `${d.amount} ${d.name}`).join(' + ');
            formulaParts.push(`(${bonusParts})`);
        }

        addEntry(campaignName, {
            type: 'hp_change',
            targetName,
            delta: actualHeal,
            currentHp: newHp,
            maxHp,
            isHealing: true,
            sourceName: casterName,
            note: 'Prayer of Healing',
            formula: formulaParts.join(' + '),
            bonusDetails: bonusDetails && bonusDetails.length > 0 ? bonusDetails : undefined,
            timestamp: Date.now(),
        }).catch((e) => { console.error("[prayerOfHealing] Error:", e); });

        results.push({ targetName, healAmount: actualHeal, rolls: rollResult.rolls, rawTotal: rollResult.total + bonusHeal });
        allRolls.push(...rollResult.rolls);
        totalHealed += actualHeal;
    }

    if (results.some(r => r.healAmount > 0) && bonusDetails?.some(d => d.name === 'Fortified Health')) {
        await markFortifiedHealthUsed(playerStats, campaignName);
    }

    window.dispatchEvent(new CustomEvent('combat-summary-updated'));

    return { targets: results, formula: healExpression, totalHealed, rolls: allRolls, rawTotal: results.reduce((sum, r) => sum + r.rawTotal, 0) };
}
