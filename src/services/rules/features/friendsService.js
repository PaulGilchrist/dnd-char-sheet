import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';
import { addEntry } from '../../ui/logService.js';
import { addConcentration } from '../../combat/concentration/concentrationService.js';
import storage from '../../ui/storage.js';
import { getCombatSummary } from '../../encounters/combatData.js';

/**
 * Check whether a creature (by name) is a Humanoid.
 * Players are always Humanoid. NPCs are checked against monster data.
 */
async function isTargetHumanoid(targetName, campaignName) {
    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures) return true; // default to Humanoid if we can't check

    const creature = cs.creatures.find(c => c.name === targetName);
    if (!creature) return true;

    // Players are always Humanoid
    if (creature.type === 'player') return true;

    // Monsters: check their stat block for type
    try {
        const monsterData = await getMonsterData(targetName, null);
        if (monsterData?.type) {
            return monsterData.type.toLowerCase() === 'humanoid';
        }
    } catch {
        // If we can't load monster data, default to Humanoid
    }

    return true;
}

/**
 * Check whether the caster has cast Friends on this target within the past 24 hours.
 */
function hasRecentFriendsCast(casterName, targetName, campaignName) {
    const targets = getRuntimeValue(casterName, '_friendsCastTargets', campaignName) || [];
    return targets.includes(targetName);
}

/**
 * Record that Friends was cast on a target.
 */
function recordFriendsCast(casterName, targetName, campaignName) {
    const targets = getRuntimeValue(casterName, '_friendsCastTargets', campaignName) || [];
    if (!targets.includes(targetName)) {
        setRuntimeValue(casterName, '_friendsCastTargets', [...targets, targetName], campaignName);
    }
}

export async function triggerFriends(spell, metaCtx, playerStats, campaignName, mapName) {
    const isFriends = (spell.name || '').toLowerCase() === 'friends';
    if (!isFriends) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        // Try to get target from combat context as a fallback
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            // Find the first creature that isn't the caster
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Friends', description: 'No target selected for Friends.' } };
    }

    // --- Auto-save condition checks ---

    // Check 1: Target is not a Humanoid
    const humanoid = await isTargetHumanoid(targetName, campaignName);
    if (!humanoid) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Friends',
            description: `${playerStats.name} casts Friends on ${targetName} but it has no effect — ${targetName} is not a Humanoid.`,
        }).catch((e) => { console.error("[friendsService:log-error]", e); });
        return { type: 'popup', payload: { type: 'automation_info', name: 'Friends', description: `No effect. ${targetName} is not a Humanoid.` } };
    }

    // Check 2: Cast within 24 hours
    if (hasRecentFriendsCast(playerStats.name, targetName, campaignName)) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Friends',
            description: `${playerStats.name} casts Friends on ${targetName} but it has no effect — already cast within the past 24 hours.`,
        }).catch((e) => { console.error("[friendsService:log-error]", e); });
        return { type: 'popup', payload: { type: 'automation_info', name: 'Friends', description: `No effect. You have already cast Friends on ${targetName} within the past 24 hours.` } };
    }

    // Check 3: Target is not at full health (immunized — cannot be charmed)
    const cs = await getCombatContext(campaignName);
    const targetCreature = cs?.creatures?.find(c => c.name === targetName);
    const targetIsPlayer = targetCreature?.type === 'player';
    let currentHp = 0;
    let maxHp = 0;
    if (targetIsPlayer) {
        currentHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName) ?? playerStats.computedStats?.currentHp ?? 0;
        maxHp = getRuntimeValue(targetName, 'hitPoints', campaignName) ?? playerStats.computedStats?.maxHp ?? 0;
    } else {
        currentHp = targetCreature?.currentHp ?? targetCreature?.hit_points?.current ?? 0;
        maxHp = targetCreature?.maxHp ?? 0;
    }
    const isAtFullHealth = currentHp >= maxHp && maxHp > 0;
    if (!isAtFullHealth) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Friends',
            description: `${playerStats.name} casts Friends on ${targetName} but it has no effect — ${targetName} is not at full health and is immunized to the effect.`,
        }).catch((e) => { console.error("[friendsService:log-error]", e); });
        return { type: 'popup', payload: { type: 'automation_info', name: 'Friends', description: `No effect. ${targetName} is not at full health and is immunized to the effect.` } };
    }

    // Record the cast for cooldown tracking
    recordFriendsCast(playerStats.name, targetName, campaignName);

    // Set concentration on the caster so the badge shows in the initiative tracker
    const csForConc = getCombatSummary(campaignName);
    if (csForConc) {
        const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
        addConcentration(csForConc, playerStats.name, 'Friends', concentrationDc);
        storage.set('combatSummary', csForConc, campaignName);
        window.dispatchEvent(new CustomEvent('combat-summary-updated'));
    }

    // Build the spell save DC
    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 0;

    const action = {
        name: 'Friends',
        automation: {
            type: 'friends',
            saveDc: spellSaveDc,
            targetName: targetName,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[friendsService] Failed to execute Friends handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Friends', description: `Failed to execute Friends.` } };
    }
}

/**
 * End Friends early for the caster if they take a hostile action
 * (make an attack roll, deal damage, or force a saving throw).
 * Called from the relevant hooks/services when such actions occur.
 */
export function endFriendsOnHostileAction(casterName, campaignName) {
    const key = `_activeFriends_${casterName}`;
    const activeTarget = getRuntimeValue('campaign', key, campaignName);
    if (!activeTarget) return;

    const conditions = (() => {
        const x = getRuntimeValue(activeTarget, 'activeConditions', campaignName);
        if (x == null) return [];
        return x;
    })();
    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'charmed');
    if (filtered.length !== conditions.length) {
        setRuntimeValue(activeTarget, 'activeConditions', filtered, campaignName);
    }
    setRuntimeValue('campaign', key, null, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: 'Friends',
        description: `${activeTarget} knows it was Charmed by ${casterName} as the Friends spell ends early.`,
    }).catch((e) => { console.error("[friendsService:log-error]", e); });
}
