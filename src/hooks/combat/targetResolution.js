import { getTargetFromAttacker, findCreatureByName } from '../../services/rules/combat/damageUtils.js';
import { getRuntimeValue } from '../runtime/useRuntimeState.js';
import utils from '../../services/ui/utils.js';
import { checkCompelledDuelAttackExpiry } from '../../services/automation/handlers/spells/compelledDuelHandler.js';
import { getManeuversForRules } from '../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js';
import { loadManeuvers } from '../../services/ui/dataLoader.js';
import { getSuperiorityDice } from './battleMaster.js';

export async function resolveTarget(characterName, campaignName, context, combatSummary, characters, getKnownManeuvers) {
    const explicitTargetName = context?.targetName;

    // Pre-load maneuver cache for skill check / initiative superiority buttons
    if (context?.rollType === 'check' || context?.rollType === 'skill' || context?.rollType === 'initiative') {
        await getManeuversForRules('2024');
    }

    // Compute available superiority maneuvers for skill/initiative checks
    let availableSuperiorityManeuvers = null;
    if (context?.rollType === 'check' || context?.rollType === 'skill' || context?.rollType === 'initiative') {
        const knownNames = getKnownManeuvers(characterName, campaignName);
        const superiorityDice = getSuperiorityDice(characterName, campaignName);
        if (knownNames.length > 0 && superiorityDice > 0) {
            const allManeuvers = await loadManeuvers('2024');
            const isInitiative = context.rollType === 'initiative';
            const skillName = isInitiative ? 'Initiative' : context.name;
            availableSuperiorityManeuvers = allManeuvers.filter(m => {
                if (!knownNames.includes(m.name)) return false;
                if (m.actionType !== 'skill_check') return false;
                if (m.initiativeBonus && isInitiative) return true;
                if (m.skills && m.skills.length > 0) {
                    const skillLower = skillName?.toLowerCase() || '';
                    return m.skills.some(s => s.toLowerCase().includes(skillLower) || skillLower.includes(s.toLowerCase()));
                }
                return false;
            }).map(m => ({
                name: m.name,
                dieExpression: m.dieExpression || 'superiority_die',
                skills: m.skills || [],
                isInitiative: !!m.initiativeBonus,
            }));
        }
    }

    let target;
    if (explicitTargetName) {
        const explicitTarget = findCreatureByName(combatSummary, explicitTargetName);
        if (explicitTarget) {
            target = explicitTarget;
        } else {
            target = combatSummary ? getTargetFromAttacker(combatSummary, utils.getName(characterName)) : null;
        }
    } else {
        target = combatSummary ? getTargetFromAttacker(combatSummary, utils.getName(characterName)) : null;
    }

    // Compelled Duel: the caster attacking a creature other than the duel target ends the effect
    if (context?.rollType === 'attack' && target) {
        const duelPopup = checkCompelledDuelAttackExpiry(characterName, target.name, campaignName);
        if (duelPopup) {
            context._duelPopup = duelPopup;
        }
    }

    // Compelled Duel / Taunting Step: disadvantage on attacks against creatures other than source
    if (context?.rollType === 'attack' && target) {
        const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const sourceGatedEffects = allTargetEffects.filter(te =>
            (te.effect === 'compelled_duel' || te.effect === 'taunting_step') &&
            te.target === utils.getName(characterName) &&
            te.source && te.source !== target.name
        );
        if (sourceGatedEffects.length > 0) {
            if (context.forcedMode === 'advantage') {
                context.forcedMode = 'normal';
            } else if (context.forcedMode === 'normal' || context.forcedMode == null) {
                context.forcedMode = 'disadvantage';
            }
        }
    }

    return { target, availableSuperiorityManeuvers };
}
