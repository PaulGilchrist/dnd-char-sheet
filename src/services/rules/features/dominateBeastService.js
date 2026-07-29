import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';
import { addEntry } from '../../ui/logService.js';
import { setRuntimeValue, getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

/**
 * Check whether a creature (by name) is a Beast.
 * NPCs are checked against monster data.
 */
async function isTargetBeast(targetName, campaignName) {
    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures) return true;

    const creature = cs.creatures.find(c => c.name === targetName);
    if (!creature) return true;

    if (creature.type === 'player') return false;

    try {
        const monsterData = await getMonsterData(targetName, null);
        if (monsterData?.type) {
            return monsterData.type.toLowerCase() === 'beast';
        }
    } catch {
        // If we can't load monster data, default to Beast
    }

    return true;
}

export async function triggerDominateBeast(spell, metaCtx, playerStats, campaignName, mapName) {
    const isDominateBeast = (spell.name || '').toLowerCase() === 'dominate beast';
    if (!isDominateBeast) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Beast', description: 'No target selected for Dominate Beast.' } };
    }

    // Check: Target is not a Beast
    const isBeast = await isTargetBeast(targetName, campaignName);
    if (!isBeast) {
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Dominate Beast',
            description: `${playerStats.name} casts Dominate Beast on ${targetName} but it has no effect — ${targetName} is not a Beast.`,
        }).catch(() => {});
        const refundLevel = metaCtx?.slotLevel || spell.level || 4;
        const slotKey = `spell_slots_level_${refundLevel}`;
        const currentSlots = getRuntimeValue(playerStats.name, slotKey);
        if (currentSlots != null && currentSlots >= 0) {
            setRuntimeValue(playerStats.name, slotKey, currentSlots + 1, campaignName);
        }
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Beast', description: `No effect. ${targetName} is not a Beast. Spell slot refunded.` } };
    }

    // Check if target is at full health to determine if target gets advantage on save
    const cs = await getCombatContext(campaignName);
    const targetCreature = cs?.creatures?.find(c => c.name === targetName);
    const targetNotFullHealth = targetCreature && targetCreature.currentHp != null && targetCreature.maxHp != null && targetCreature.currentHp >= targetCreature.maxHp ? false : true;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 4;

    const action = {
        name: 'Dominate Beast',
        automation: {
            type: 'dominate_beast',
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
        console.error('[dominateBeastService] Failed to execute Dominate Beast handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Beast', description: `Failed to execute Dominate Beast.` } };
    }
}
