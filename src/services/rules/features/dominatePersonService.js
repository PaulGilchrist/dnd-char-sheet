import { executeHandler } from '../../automation/index.js';
import { getCombatContext, getTargetFromAttacker } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';
import { addEntry } from '../../ui/logService.js';
import { setRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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
        console.warn('[dominatePersonService] Monster data unavailable, defaulting to Humanoid:', error);
    }

    return true;
}

export async function triggerDominatePerson(spell, metaCtx, playerStats, campaignName, mapName) {
    const isDominatePerson = (spell.name || '').toLowerCase() === 'dominate person';
    if (!isDominatePerson) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const attackerTarget = getTargetFromAttacker(cs, playerStats.name);
            if (attackerTarget) targetName = attackerTarget.name;
        }
        if (!targetName) {
            console.error(`[dominatePersonService] No target selected for Dominate Person by ${playerStats.name}. Caster has no target in initiative view.`);
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Person', description: 'No target selected for Dominate Person.' } };
    }

    // Check: Target is not a Humanoid
    const isHumanoid = await isTargetHumanoid(targetName, campaignName);
    if (!isHumanoid) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Dominate Person',
            description: `${playerStats.name} casts Dominate Person on ${targetName} but it has no effect — ${targetName} is not a Humanoid.`,
        }).catch((e) => { console.error("[dominatePersonService:log-error]", e); });
        const refundLevel = metaCtx?.slotLevel || spell.level || 5;
        const slotKey = `spell_slots_level_${refundLevel}`;
        const currentSlots = getRuntimeValue(playerStats.name, slotKey);
        if (currentSlots != null && currentSlots >= 0) {
            setRuntimeValue(playerStats.name, slotKey, currentSlots + 1, campaignName);
        }
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Person', description: `No effect. ${targetName} is not a Humanoid. Spell slot refunded.` } };
    }

    // Check if target is at full health to determine if target gets advantage on save
    const cs = await getCombatContext(campaignName);
    const targetCreature = cs?.creatures?.find(c => c.name === targetName);
    const targetNotFullHealth = targetCreature && targetCreature.currentHp != null && targetCreature.maxHp != null && targetCreature.currentHp < targetCreature.maxHp;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 5;

    const action = {
        name: 'Dominate Person',
        automation: {
            type: 'dominate_person',
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
        console.error('[dominatePersonService] Failed to execute Dominate Person handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Person', description: `Failed to execute Dominate Person.` } };
    }
}
