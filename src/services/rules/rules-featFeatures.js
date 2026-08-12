import { uniqBy } from 'lodash';
import { getCategories } from '../character/featureCategories.js';

/**
 * Categorize and add feat features to proper action arrays.
 */
export function addFeatFeaturesToActions(playerStats, featFeatures, collectAutomationFromFeatures, mergeAutomationSpecialActions) {
    if (!Array.isArray(featFeatures)) {
        console.error('rules: expected features to be an array for', playerStats.name);
        throw new Error('Missing array: features for ' + playerStats.name);
    }

    // Add feat features to allFeatures for automation processing
    if (featFeatures.length > 0) {
        featFeatures.forEach(featFeature => {
            if (!featFeature.name) return;
            playerStats._allFeaturesPush({
                name: featFeature.name,
                description: featFeature.description || '',
                type: featFeature.type || 'passive',
                source: 'feat',
                automation: featFeature.automation,
                featName: featFeature.featName,
            });
        });
        // Re-process automation with feat features included
        playerStats.automation = collectAutomationFromFeatures(playerStats._allFeatures, playerStats);
        renameMagicInitiateFeatures(playerStats, playerStats._playerSummary);
        mergeAutomationSpecialActions(playerStats);

        // Now create feat entries with processed automation (options instead of effects)
        for (const featFeature of featFeatures) {
            if (!featFeature.name) continue;

            // Look up the processed automation info from playerStats.automation
            // This ensures feat actions have 'options' (processed) instead of 'effects' (raw)
            const processedAutomation = (playerStats.automation?.passives || []).find(
                p => p.name === featFeature.name && p.type === 'attack_rider'
            ) || (playerStats.automation?.actions || []).find(
                p => p.name === featFeature.name && p.type === 'attack_rider'
            ) || (playerStats.automation?.bonusActions || []).find(
                p => p.name === featFeature.name && p.type === 'attack_rider'
            ) || (playerStats.automation?.reactions || []).find(
                p => p.name === featFeature.name && p.type === 'attack_rider'
            );

            const featEntry = {
                name: featFeature.name,
                description: featFeature.description || '',
                type: featFeature.type || 'passive',
                source: 'feat',
                automation: processedAutomation || featFeature.automation,
            };

            const featureCategories = getCategories(playerStats.rules || '5e');

            // Categorize by automation.casting_time
            let castingTime = featFeature.automation?.casting_time;
            if (castingTime) {
                const ct = castingTime;
                if ((ct === '1 action' || ct === 'action') && !playerStats.actions.some(f => f.name === featFeature.name)) {
                    playerStats.actions = [...playerStats.actions, featEntry];
                } else if ((ct === '1 bonus action' || ct === 'bonus action') && !playerStats.bonusActions.some(f => f.name === featFeature.name)) {
                    playerStats.bonusActions = [...playerStats.bonusActions, featEntry];
                } else if ((ct === '1 reaction' || ct === 'reaction') && !playerStats.reactions.some(f => f.name === featFeature.name)) {
                    playerStats.reactions = [...playerStats.reactions, featEntry];
                } else if (ct === 'passive' && featureCategories.characterAdvancement.includes(featFeature.name) && !playerStats.characterAdvancement.some(f => f.name === featFeature.name)) {
                    playerStats.characterAdvancement = [...playerStats.characterAdvancement, featEntry];
                } else {
                    playerStats.specialActions = [...playerStats.specialActions, featEntry];
                }
            } else {
                // No automation.casting_time — go to specialActions unless name matches a category
                if (featureCategories.characterAdvancement.includes(featFeature.name) && !playerStats.characterAdvancement.some(f => f.name === featFeature.name)) {
                    playerStats.characterAdvancement = [...playerStats.characterAdvancement, featEntry];
                } else if (featureCategories.actions.includes(featFeature.name) && !playerStats.actions.some(f => f.name === featFeature.name)) {
                    playerStats.actions = [...playerStats.actions, featEntry];
                } else if (featureCategories.bonusActions.includes(featFeature.name) && !playerStats.bonusActions.some(f => f.name === featFeature.name)) {
                    playerStats.bonusActions = [...playerStats.bonusActions, featEntry];
                } else if (featureCategories.reactions.includes(featFeature.name) && !playerStats.reactions.some(f => f.name === featFeature.name)) {
                    playerStats.reactions = [...playerStats.reactions, featEntry];
                 } else {
                     const existingIndex = playerStats.specialActions.findIndex(f => f.name === featFeature.name);
                     if (existingIndex !== -1 && !playerStats.specialActions[existingIndex].description && featEntry.description) {
                         playerStats.specialActions = [...playerStats.specialActions.slice(0, existingIndex), featEntry, ...playerStats.specialActions.slice(existingIndex + 1)];
                     }
                 }
            }
        }

        // Recompute save proficiencies now that feat features are included in allFeatures
        playerStats.saveProficiencies = getAllSaveProficiencies(playerStats._allFeatures, playerStats);
    }
}

/**
 * Sort all action arrays after feat features are merged.
 */
export function sortActionArraysAfterFeats(playerStats) {
    playerStats.actions = uniqBy(playerStats.actions, 'name').sort((a, b) => a.name.localeCompare(b.name));
    playerStats.bonusActions = uniqBy(playerStats.bonusActions, 'name').sort((a, b) => a.name.localeCompare(b.name));
    playerStats.reactions = uniqBy(playerStats.reactions, 'name').sort((a, b) => a.name.localeCompare(b.name));
    playerStats.specialActions = uniqBy(playerStats.specialActions, 'name').sort((a, b) => a.name.localeCompare(b.name));
    playerStats.characterAdvancement = uniqBy(playerStats.characterAdvancement, 'name').sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Add free_spell features for Magic Initiate, Fey Touched, and Shadow Touched.
 */
export function addFreeSpellFeatures(playerStats) {
    // Add Magic Initiate level 1 spell free_spell features
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

    // Add Fey Touched level 1 spell free_spell feature
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

    // Add Shadow Touched level 1 spell free_spell feature
    const stSpell = playerStats.shadowTouchedSpell;
    if (stSpell) {
      const stAutomation = playerStats.automation?.specialActions || [];
      const stAlreadyAdded = stAutomation.some(a =>
        a.type === 'free_spell' &&
        (a.spell === stSpell || (Array.isArray(a.spell) && a.spell.includes(stSpell)))
      );
      if (!stAlreadyAdded) {
        const stFeatureName = 'Shadow Magic';
        const newStFeature = {
          name: stFeatureName,
          description: `Shadow Touched: Cast ${stSpell} once for free. Recharges on long rest.`,
          type: 'free_spell',
          automation: {
            type: 'free_spell',
            spell: stSpell,
            name: stFeatureName,
            uses: 1,
            recharge: 'long_rest',
          },
        };
        playerStats.specialActions.push(newStFeature);
        playerStats.automation.specialActions.push({
          type: 'free_spell',
          spell: stSpell,
          name: stFeatureName,
          uses: 1,
          recharge: 'long_rest',
        });
      }
    }
}

// Re-export needed functions
import { renameMagicInitiateFeatures } from './core/magicSpells.js';
import { getAllSaveProficiencies } from '../combat/automation/automationService.js';
