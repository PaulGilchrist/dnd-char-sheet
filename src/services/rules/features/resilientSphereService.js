import { executeHandler } from '../../automation/index.js';

export async function triggerResilientSphere(spell, metaCtx, playerStats, campaignName, mapName) {
    const name = (spell.name || '').toLowerCase();
    const isResilientSphere = name === "otiluke's resilient sphere" || name === 'resilient sphere';
    if (!isResilientSphere) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 4;

    // For 2024 rules, the target is pre-selected via SecondaryTargetModal
    const targetName = metaCtx?.resilientSphereTargetName;

    const action = {
        name: spell.name,
        automation: {
            type: 'resilient_sphere',
            saveDc: spellSaveDc,
            saveType: 'DEX',
        },
        spell,
        spellSlotLevel: slotLevel,
        metaCtx: {
            ...metaCtx,
            // Pass targetName to handler for 2024 rules
            ...(targetName && { resilientSphereTargetName: targetName }),
        },
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[resilientSphereService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}
