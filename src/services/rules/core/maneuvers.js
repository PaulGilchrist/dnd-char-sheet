import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { loadManeuvers } from '../../ui/dataLoader.js';
import { renameMagicInitiateFeatures } from './magicSpells.js';

/**
 * Process Battle Master maneuvers for a player character.
 * Adds bonus action, reaction, grant attack, movement, and skill check maneuvers.
 * Re-processes automation after each maneuver type to keep state consistent.
 */
export async function processManeuvers(playerStats, playerSummary, allFeatures, collectAutomationFromFeatures, mergeAutomationSpecialActions) {
    try {
        const maneuverSelection = getRuntimeValue(playerStats.name, 'BattleMasterManeuvers_selection', playerSummary.campaignName);
        const knownNames = Array.isArray(maneuverSelection) ? maneuverSelection : [];
        if (knownNames.length === 0) return;

        const maneuvers = await loadManeuvers(playerStats.rules || '2024');

        // Bonus action maneuvers
        const bonusActionManeuvers = maneuvers.filter(m => knownNames.includes(m.name) && m.actionType === 'bonus_action');
        if (bonusActionManeuvers.length > 0) {
            bonusActionManeuvers.forEach(m => {
                const feature = {
                    name: m.name,
                    description: m.description || '',
                    automation: {
                        type: 'combat_superiority_bonus_action',
                        maneuverName: m.name,
                        actionType: 'bonus_action',
                        effect: m.effect,
                        saveType: m.saveType || null,
                        saveAbility: m.saveAbility || null,
                        conditionInflicted: m.conditionInflicted || null,
                        value: m.value || null,
                        range: m.range || null,
                        damageBonus: m.damageBonus || false,
                        dieExpression: m.dieExpression || 'superiority_die',
                        hasAutomation: true,
                    },
                    hasAutomation: true,
                };
                allFeatures.push(feature);
                playerStats.bonusActions.push(feature);
            });
            playerStats.automation = collectAutomationFromFeatures(allFeatures, playerStats);
            mergeAutomationSpecialActions(playerStats);
        }

        // Reaction maneuvers
        const reactionManeuvers = maneuvers.filter(m => knownNames.includes(m.name) && m.actionType === 'reaction');
        if (reactionManeuvers.length > 0) {
            reactionManeuvers.forEach(m => {
                const feature = {
                    name: m.name,
                    description: m.description || '',
                    automation: {
                        type: 'combat_superiority_reaction',
                        maneuverName: m.name,
                        actionType: 'reaction',
                        trigger: m.trigger || null,
                        effect: m.effect,
                        modifierAbility: m.modifierAbility || null,
                        damageBonus: m.damageBonus || false,
                        dieExpression: m.dieExpression || 'superiority_die',
                        hasAutomation: true,
                    },
                    hasAutomation: true,
                };
                allFeatures.push(feature);
                playerStats.reactions.push(feature);
            });
            playerStats.automation = collectAutomationFromFeatures(allFeatures, playerStats);
            renameMagicInitiateFeatures(playerStats, playerSummary);
            mergeAutomationSpecialActions(playerStats);
        }

        // Grant attack maneuvers
        const grantAttackManeuvers = maneuvers.filter(m => knownNames.includes(m.name) && m.actionType === 'grant_attack');
        if (grantAttackManeuvers.length > 0) {
            grantAttackManeuvers.forEach(m => {
                allFeatures.push({
                    name: m.name,
                    description: m.description || '',
                    automation: {
                        type: 'combat_superiority_grant_attack',
                        maneuverName: m.name,
                        actionType: 'grant_attack',
                        trigger: m.trigger || null,
                        effect: m.effect,
                        damageBonus: m.damageBonus || false,
                        dieExpression: m.dieExpression || 'superiority_die',
                        range: m.range || '30_ft',
                        oncePerTurn: true,
                        hasAutomation: true,
                    },
                    hasAutomation: true,
                });
            });
            playerStats.automation = collectAutomationFromFeatures(allFeatures, playerStats);
            renameMagicInitiateFeatures(playerStats, playerSummary);
            mergeAutomationSpecialActions(playerStats);
        }

        // Movement maneuvers
        const movementManeuvers = maneuvers.filter(m => knownNames.includes(m.name) && m.actionType === 'movement');
        if (movementManeuvers.length > 0) {
            movementManeuvers.forEach(m => {
                allFeatures.push({
                    name: m.name,
                    description: m.description || '',
                    automation: {
                        type: 'combat_superiority_movement',
                        maneuverName: m.name,
                        actionType: 'movement',
                        trigger: m.trigger || null,
                        effect: m.effect,
                        damageBonus: m.damageBonus || false,
                        dieExpression: m.dieExpression || 'superiority_die',
                        range: m.range || '5_ft',
                        hasAutomation: true,
                    },
                    hasAutomation: true,
                });
            });
            playerStats.automation = collectAutomationFromFeatures(allFeatures, playerStats);
            renameMagicInitiateFeatures(playerStats, playerSummary);
            mergeAutomationSpecialActions(playerStats);
        }

        // Skill check maneuvers
        const skillCheckManeuvers = maneuvers.filter(m => knownNames.includes(m.name) && m.actionType === 'skill_check');
        if (skillCheckManeuvers.length > 0) {
            skillCheckManeuvers.forEach(m => {
                allFeatures.push({
                    name: m.name,
                    description: m.description || '',
                    automation: {
                        type: 'combat_superiority_skill_check',
                        maneuverName: m.name,
                        actionType: 'skill_check',
                        skills: m.skills || [],
                        ability: m.ability || null,
                        initiativeBonus: m.initiativeBonus || false,
                        damageBonus: m.damageBonus || false,
                        dieExpression: m.dieExpression || 'superiority_die',
                        hasAutomation: true,
                    },
                    hasAutomation: true,
                });
                if (m.reactionSaveType) {
                    allFeatures.push({
                        name: m.name + ' (Reaction)',
                        description: m.description || '',
                        automation: {
                            type: 'combat_superiority_commanding_presence_reaction',
                            maneuverName: m.name,
                            reactionSaveType: m.reactionSaveType,
                            reactionEffect: m.reactionEffect || 'disadvantage_next_attack',
                            reactionDuration: m.reactionDuration || 'until_end_of_next_turn',
                            reactionRange: m.reactionRange || '30_ft',
                            saveDc: 'ability',
                            saveAbility: 'CHA',
                            hasAutomation: true,
                        },
                        hasAutomation: true,
                    });
                }
            });
            playerStats.automation = collectAutomationFromFeatures(allFeatures, playerStats);
            renameMagicInitiateFeatures(playerStats, playerSummary);
            mergeAutomationSpecialActions(playerStats);
        }
    } catch (_e) {
        // Maneuver data not available, skip
    }
}
