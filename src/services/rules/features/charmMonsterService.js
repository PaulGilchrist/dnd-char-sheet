import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

export async function triggerCharmMonster(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCharmMonster = (spell.name || '').toLowerCase() === 'charm monster';
    if (!isCharmMonster) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 4;

    // Multi-target path: charmMonsterTargets array from CreatureSelectionModal
    const targetNames = metaCtx?.charmMonsterTargets;
    if (targetNames && Array.isArray(targetNames) && targetNames.length > 0) {
        const targetAdvantages = {};
        for (const targetName of targetNames) {
            targetAdvantages[targetName] = await getTargetHealthAdvantage(targetName, campaignName);
        }

        const action = {
            name: 'Charm Monster',
            automation: {
                type: 'charm_monster',
                saveDc: spellSaveDc,
                advantage: false,
            },
            metaCtx: {
                charmMonsterTargets: targetNames,
                charmMonsterAdvantages: targetAdvantages,
            },
            spell,
            spellSlotLevel: slotLevel,
        };

        try {
            const result = await executeHandler(action, playerStats, campaignName, mapName);
            return result;
        } catch (e) {
            console.error('[charmMonsterService] Failed to execute Charm Monster handler:', e);
            return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: `Failed to execute Charm Monster.` } };
        }
    }

    // Single-target path
    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: 'No target selected for Charm Monster.' } };
    }

    // Check if target is not at full health to determine if target gets advantage on save
    const targetNotFullHealth = await getTargetHealthAdvantage(targetName, campaignName);

    const action = {
        name: 'Charm Monster',
        automation: {
            type: 'charm_monster',
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
        console.error('[charmMonsterService] Failed to execute Charm Monster handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: `Failed to execute Charm Monster.` } };
    }
}
