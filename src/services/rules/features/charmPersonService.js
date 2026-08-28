import { executeHandler } from '../../automation/index.js';
import { getCombatContext, getTargetFromAttacker } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';
import { addEntry } from '../../ui/logService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

/**
 * Check whether a creature (by name) is a Humanoid.
 * Players are always Humanoid. NPCs are checked against monster data.
 */
async function isTargetHumanoid(targetName, campaignName) {
    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures) return true;

    const creature = cs.creatures.find(c => c.name === targetName);
    if (!creature) return true;

    if (creature.type === 'player') return true;

    try {
        const monsterData = await getMonsterData(targetName, null);
        if (monsterData?.type) {
            return monsterData.type.toLowerCase() === 'humanoid';
        }
    } catch (error) {
        // If we can't load monster data, default to Humanoid
        console.warn('[charmPersonService] Monster data unavailable, defaulting to Humanoid:', error);
    }

    return true;
}

/**
 * Determine if a target is not at full health (for save advantage).
 */
async function getTargetHealthAdvantage(targetName, campaignName) {
    const cs = await getCombatContext(campaignName);
    const targetCreature = cs?.creatures?.find(c => c.name === targetName);
    const targetIsPlayer = targetCreature?.type === 'player';
    let currentHp = 0;
    let maxHp = 0;
    if (targetIsPlayer) {
        currentHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName) ?? 0;
        maxHp = getRuntimeValue(targetName, 'hitPoints', campaignName) ?? 0;
    } else {
        currentHp = targetCreature?.currentHp ?? targetCreature?.hit_points?.current ?? 0;
        maxHp = targetCreature?.maxHp ?? 0;
    }
    return currentHp > 0 && currentHp < maxHp;
}

export async function triggerCharmPerson(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCharmPerson = (spell.name || '').toLowerCase() === 'charm person';
    if (!isCharmPerson) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 1;

    // Multi-target path: charmPersonTargets array from CreatureSelectionModal
    const targetNames = metaCtx?.charmPersonTargets;
    if (targetNames && Array.isArray(targetNames) && targetNames.length > 0) {
        // Filter to only humanoids
        const humanoidTargets = [];
        const nonHumanoidTargets = [];
        for (const targetName of targetNames) {
            const humanoid = await isTargetHumanoid(targetName, campaignName);
            if (humanoid) {
                humanoidTargets.push(targetName);
            } else {
                nonHumanoidTargets.push(targetName);
            }
        }

        // Log non-humanoid rejections
        for (const targetName of nonHumanoidTargets) {
            addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Charm Person',
                description: `${playerStats.name} casts Charm Person on ${targetName} but it has no effect — ${targetName} is not a Humanoid.`,
            }).catch((e) => { console.error("[charmPersonService:log-error]", e); });
        }

        if (humanoidTargets.length === 0) {
            return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: 'No valid Humanoid targets for Charm Person.' } };
        }

        // Build a single action with all target names and per-target advantage in metaCtx
        const targetAdvantages = {};
        for (const targetName of humanoidTargets) {
            targetAdvantages[targetName] = await getTargetHealthAdvantage(targetName, campaignName);
        }

        const action = {
            name: 'Charm Person',
            automation: {
                type: 'charm_person',
                saveDc: spellSaveDc,
                advantage: false,
            },
            metaCtx: {
                charmPersonTargets: humanoidTargets,
                charmPersonAdvantages: targetAdvantages,
            },
            spell,
            spellSlotLevel: slotLevel,
        };

        try {
            const result = await executeHandler(action, playerStats, campaignName, mapName);
            return result;
        } catch (e) {
            console.error('[charmPersonService] Failed to execute Charm Person handler:', e);
            return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: `Failed to execute Charm Person.` } };
        }
    }

    // Single-target path
    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const attackerTarget = getTargetFromAttacker(cs, playerStats.name);
            if (attackerTarget) targetName = attackerTarget.name;
        }
        if (!targetName) {
            console.error(`[charmPersonService] No target selected for Charm Person by ${playerStats.name}. Caster has no target in initiative view.`);
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: 'No target selected for Charm Person.' } };
    }

    // Check: Target is not a Humanoid
    const humanoid = await isTargetHumanoid(targetName, campaignName);
    if (!humanoid) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Charm Person',
            description: `${playerStats.name} casts Charm Person on ${targetName} but it has no effect — ${targetName} is not a Humanoid.`,
        }).catch((e) => { console.error("[charmPersonService:log-error]", e); });
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: `No effect. ${targetName} is not a Humanoid.` } };
    }

    const advantage = await getTargetHealthAdvantage(targetName, campaignName);

    const action = {
        name: 'Charm Person',
        automation: {
            type: 'charm_person',
            saveDc: spellSaveDc,
            targetName: targetName,
            advantage: advantage,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[charmPersonService] Failed to execute Charm Person handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: `Failed to execute Charm Person.` } };
    }
}
