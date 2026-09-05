import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

/**
 * Rename Magic Initiate "Level 1 Spell" features with instance indices
 * to avoid runtime key collisions for repeatable instances.
 */
export function renameMagicInitiateFeatures(playerStats, playerSummary) {
    const campaignName = playerSummary?.campaignName;
    const instances = getRuntimeValue(playerStats.name, '_magicInitiateInstances', campaignName) || playerStats.magicInitiateInstances;
    if (!instances || !Array.isArray(instances) || instances.length === 0) return;

    const automation = playerStats.automation;
    if (!automation) return;

    // Collect all "Level 1 Spell" features across all automation arrays
    const level1Features = [];
    ['actions', 'bonusActions', 'reactions', 'passives', 'specialActions'].forEach(arrayName => {
        const arr = automation[arrayName];
        if (!Array.isArray(arr)) return;
        arr.forEach(feature => {
            if (!feature || !feature.name || feature.name !== 'Level 1 Spell') return;
            const auto = feature.automation;
            if (!auto || auto.type !== 'free_spell') return;
            level1Features.push({ feature, auto, arrayName });
        });
    });

    // Rename them in order to match instances
    level1Features.forEach((item, i) => {
        if (i >= instances.length) return;
        const newName = `Level 1 Spell [Instance ${i + 1}]`;
        item.feature.name = newName;
        if (item.auto.name) item.auto.name = newName;
    });
}

/**
 * Add Magic Initiate level 1 spell free_spell features
 */
export function addMagicInitiateSpells(playerStats) {
    const miInstances = playerStats.magicInitiateInstances || [];
    miInstances.forEach((inst, idx) => {
        if (inst.level1Spell) {
            const featureName = `Level 1 Spell [Instance ${idx + 1}]`;
            // Check if this specific spell is already in automation.specialActions
            const miAutomation = playerStats.automation?.specialActions || [];
            const alreadyAdded = miAutomation.some(a =>
                a.type === 'free_spell' &&
                (a.spell === inst.level1Spell || (Array.isArray(a.spell) && a.spell.includes(inst.level1Spell)))
            );
            if (alreadyAdded) return;
            const newFeature = {
                name: featureName,
                description: `Magic Initiate (${inst.class}): Cast ${inst.level1Spell} once for free. Recharges on long rest.`,
                type: 'free_spell',
                automation: {
                    type: 'free_spell',
                    spell: inst.level1Spell,
                    name: featureName,
                    uses: 1,
                    recharge: 'long_rest',
                },
            };
            playerStats.specialActions.push(newFeature);
            playerStats.automation.specialActions.push({
                type: 'free_spell',
                spell: inst.level1Spell,
                name: featureName,
                uses: 1,
                recharge: 'long_rest',
            });
        }
    });
}

/**
 * Add Fey Touched level 1 spell free_spell feature
 */
export function addFeyTouchedSpell(playerStats) {
    const ftSpell = playerStats.feyTouchedSpell;
    if (ftSpell) {
        const ftAutomation = playerStats.automation?.specialActions || [];
        const ftAlreadyAdded = ftAutomation.some(a =>
            a.type === 'free_spell' &&
            (a.spell === ftSpell || (Array.isArray(a.spell) && a.spell.includes(ftSpell)))
        );
        if (!ftAlreadyAdded) {
            const ftFeatureName = 'Fey Magic';
            const newFtFeature = {
                name: ftFeatureName,
                description: `Fey Touched: Cast ${ftSpell} once for free. Recharges on long rest.`,
                type: 'free_spell',
                automation: {
                    type: 'free_spell',
                    spell: ftSpell,
                    name: ftFeatureName,
                    uses: 1,
                    recharge: 'long_rest',
                },
            };
            playerStats.specialActions.push(newFtFeature);
            playerStats.automation.specialActions.push({
                type: 'free_spell',
                spell: ftSpell,
                name: ftFeatureName,
                uses: 1,
                recharge: 'long_rest',
            });
        }
    }
}

/**
 * Add Shadow Touched level 1 spell free_spell feature.
 * FT-070: covers BOTH the chosen spell and Invisibility with perSpellTracking so each
 * keeps its own free-cast counter per Long Rest (mirrors the live builder in rules.js).
 */
export function addShadowTouchedSpell(playerStats) {
    const stSpell = playerStats.shadowTouchedSpell;
    if (stSpell) {
        const stSpells = [...new Set([stSpell, 'Invisibility'])];
        const stAutomation = playerStats.automation?.specialActions || [];
        const stAlreadyAdded = stAutomation.some(a =>
            a.type === 'free_spell' && a.name === 'Shadow Magic'
        );
        if (!stAlreadyAdded) {
            const stFeatureName = 'Shadow Magic';
            const stAutomationEntry = {
                type: 'free_spell',
                spell: stSpells,
                name: stFeatureName,
                uses: 1,
                recharge: 'long_rest',
                perSpellTracking: true,
            };
            const newStFeature = {
                name: stFeatureName,
                description: `Shadow Touched: Cast ${stSpells.join(' or ')} once each for free. Recharges on long rest.`,
                type: 'free_spell',
                automation: stAutomationEntry,
            };
            playerStats.specialActions.push(newStFeature);
            playerStats.automation.specialActions.push(stAutomationEntry);
        }
    }
}
