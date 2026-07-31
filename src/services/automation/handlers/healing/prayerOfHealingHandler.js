import { rollExpression, rollExpressionMaximized } from '../../../dice/diceRoller.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyHealingToTarget } from '../../../rules/combat/applyHealing.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { resolveHealingBonusesWithDetails, hasHealingMaximization, hasHealingMaximizationForTarget, markFortifiedHealthUsed } from '../../../combat/automation/automationService.js';

const PRAYER_OF_HEALING_NAME = 'Prayer of Healing';

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

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const maxTargets = auto?.maxTargets || 5;
    const slotLevel = auto?.slotLevel || action.spell?.level || 2;

    const spellCastingMod = getSpellCastingMod(playerStats, action.spell);
    const healExpression = resolveHealExpression(action.spell, slotLevel, spellCastingMod);
    if (!healExpression) {
        return {
            type: 'popup',
            payload: { type: 'automation_info', name: PRAYER_OF_HEALING_NAME, description: `${PRAYER_OF_HEALING_NAME}: Could not resolve heal expression.` },
        };
    }

    const maximize = hasHealingMaximization(playerStats);
    const { totalBonus: bonusHeal, details: bonusDetails } = resolveHealingBonusesWithDetails(playerStats, playerStats.proficiency || 0, playerStats.level || 1, slotLevel, campaignName);

    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) return null;

    const currentRound = combatSummary?.round || 1;

    const allCreatures = combatSummary.creatures || [];
    const eligible = allCreatures.filter(c => c.name);

    if (eligible.length === 0) {
        return {
            type: 'popup',
            payload: { type: 'automation_info', name: PRAYER_OF_HEALING_NAME, description: `${PRAYER_OF_HEALING_NAME}: No allies within range.` },
        };
    }

    if (eligible.length <= maxTargets) {
        return confirmPrayerOfHealing(action, playerStats, campaignName, eligible.map(c => c.name), healExpression, maximize, bonusHeal, bonusDetails, slotLevel, currentRound);
    }

    const creatureTargets = eligible.map(c => c.name);

    return {
        type: 'modal',
        modalName: 'prayerOfHealingTarget',
        payload: {
            action,
            playerStats,
            campaignName,
            creatureTargets,
            maxTargets,
            healExpression,
            maximize,
            bonusHeal,
            bonusDetails,
            slotLevel,
            currentRound,
        },
    };
}

export async function confirmPrayerOfHealing(action, playerStats, campaignName, selectedTargetNames, healExpression, maximize, bonusHeal, bonusDetails, _slotLevel, currentRound) {
    const playerName = playerStats.name;
    const maxTargets = action.automation?.maxTargets || 5;
    const finalTargets = selectedTargetNames.slice(0, maxTargets);
    const combatSummary = await getCombatContext(campaignName);
    const results = [];
    const allRolls = [];
    let totalHealed = 0;

    for (const targetName of finalTargets) {
        if (isAffectedByPrayerOfHealing(targetName, campaignName, currentRound)) {
            continue;
        }

        const maxHp = combatSummary?.creatures?.find(c => c.name === targetName)?.maxHp || playerStats.hitPoints || 0;
        const storedHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName);
        const currentHp = storedHp != null && storedHp !== '' ? Number(storedHp) : maxHp;
        const rollResult = (maximize || hasHealingMaximizationForTarget(playerStats, targetName, campaignName)) ? rollExpressionMaximized(healExpression) : rollExpression(healExpression);
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

        await addEntry(campaignName, {
            type: 'hp_change',
            targetName,
            delta: actualHeal,
            currentHp: newHp,
            maxHp,
            isHealing: true,
            sourceName: playerName,
            note: PRAYER_OF_HEALING_NAME,
            formula: formulaParts.join(' + '),
            bonusDetails: bonusDetails && bonusDetails.length > 0 ? bonusDetails : undefined,
            timestamp: Date.now(),
        }).catch((e) => { console.error('[prayerOfHealing] Error:', e); });

        results.push({ targetName, healAmount: actualHeal, rolls: rollResult.rolls, rawTotal: rollResult.total + bonusHeal });
        allRolls.push(...rollResult.rolls);
        totalHealed += actualHeal;
    }

    if (results.some(r => r.healAmount > 0) && bonusDetails?.some(d => d.name === 'Fortified Health')) {
        await markFortifiedHealthUsed(playerStats, campaignName);
    }

    window.dispatchEvent(new CustomEvent('combat-summary-updated'));

    return {
        type: 'popup',
        payload: {
            type: 'heal_multi',
            name: PRAYER_OF_HEALING_NAME,
            formula: healExpression,
            rolls: allRolls,
            results: results.map(r => ({ targetName: r.targetName, healAmount: r.healAmount, rolls: r.rolls })),
            totalHealed: totalHealed,
            bonusHeal: bonusHeal || 0,
            bonusHealDetail: bonusDetails && bonusDetails.length > 0 ? bonusDetails.map(d => `${d.amount} ${d.name}`).join(', ') : '',
        },
    };
}
