import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';
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
    } catch {
        // If we can't load monster data, default to Humanoid
    }

    return true;
}

export async function triggerCharmPerson(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCharmPerson = (spell.name || '').toLowerCase() === 'charm person';
    if (!isCharmPerson) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
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
        }).catch(() => {});
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Person', description: `No effect. ${targetName} is not a Humanoid.` } };
    }

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
    const targetNotFullHealth = currentHp > 0 && currentHp < maxHp;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 1;

    const action = {
        name: 'Charm Person',
        automation: {
            type: 'charm_person',
            saveDc: spellSaveDc,
            targetName: targetName,
            advantage: targetNotFullHealth,
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
