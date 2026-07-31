import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { addEntry } from '../../../ui/logService.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

const AURA_OF_PURITY_BUFF_NAME = 'Aura of Purity';
const SAVE_ADVANTAGE_CONDITIONS_KEY = 'auraOfPuritySaveAdvantageConditions';

export async function handle(action, playerStats, campaignName, _mapName) {
    const combatSummary = await getCombatSummary(campaignName);
    if (!combatSummary) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `No combat context found. Cannot apply ${action.name}.`,
            },
        };
    }

    const creatureTargets = combatSummary.creatures.map(c => c.name);

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            creatureTargets,
            maxTargets: 5,
            automation: action.automation || {},
        },
    };
}

export async function applyAuraOfPurity(action, playerStats, campaignName, mapName, targetNames) {
    if (!targetNames || !Array.isArray(targetNames) || targetNames.length === 0) {
        return null;
    }

    const auto = action.automation || {};
    const casterName = playerStats.name;
    const resistanceTypes = auto.resistanceTypes || ['Poison'];
    const saveAdvantageConditions = auto.saveAdvantageConditions || [];
    const appliedTargets = [];

    for (const targetName of targetNames) {
        const buffs = getRuntimeValue(targetName, 'activeBuffs', campaignName) || [];
        const existingAura = buffs.some(b => b.name === AURA_OF_PURITY_BUFF_NAME);
        if (!existingAura) {
            buffs.push({
                name: AURA_OF_PURITY_BUFF_NAME,
                effect: 'aura_of_purity',
                duration: 'Concentration, up to 10 minutes',
                sourceCharacter: casterName,
                resistanceTypes,
            });
            setRuntimeValue(targetName, 'activeBuffs', buffs, campaignName);
        }

        const storedEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
        const existingTeIndex = storedEffects.findIndex(te => te.target === targetName && te.effect === 'aura_of_purity' && te.source === casterName);
        const newEffect = {
            target: targetName,
            effect: 'aura_of_purity',
            source: casterName,
            duration: 'concentration',
        };
        let updatedEffects;
        if (existingTeIndex >= 0) {
            updatedEffects = [...storedEffects];
            updatedEffects[existingTeIndex] = newEffect;
        } else {
            updatedEffects = [...storedEffects, newEffect];
        }
        setRuntimeValue('campaign', 'targetEffects', updatedEffects, campaignName, true);

        setRuntimeValue(
            targetName,
            SAVE_ADVANTAGE_CONDITIONS_KEY,
            saveAdvantageConditions,
            campaignName
        );

        addExpiration(casterName, targetName, [
            { type: 'remove_active_buff', buffName: AURA_OF_PURITY_BUFF_NAME },
        ], campaignName, undefined, casterName);

        const combatSummary = getCombatSummary(campaignName);
        addConcentration(combatSummary, casterName, 'Aura of Purity', 10 + Math.floor(playerStats.concentrationBonus || 0));

        appliedTargets.push(targetName);

        const resistanceDesc = resistanceTypes.length > 0 ? `Resistance to ${resistanceTypes.join(' and ')} damage` : 'Resistance to Poison damage';
        const saveAdvDesc = saveAdvantageConditions.length > 0
            ? ` Advantage on saves vs ${saveAdvantageConditions.join(', ')} conditions`
            : '';

        await addEntry(campaignName, {
            type: 'spell_effect',
            characterName: casterName,
            spellName: action.name,
            targetName,
            effects: [`${resistanceDesc}${saveAdvDesc}`],
            timestamp: Date.now(),
        }).catch((e) => { console.error('[auraOfPurity] Error:', e); });
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: auto.type,
            description: `${appliedTargets.length} target(s) gained resistance to Poison damage and Advantage on saving throws against Blinded, Charmed, Deafened, Frightened, Paralyzed, Poisoned, and Stunned conditions from ${action.name}.`,
            automation: auto,
        },
    };
}

export function getAuraOfPuritySaveAdvantageConditions(playerName, campaignName) {
    const stored = getRuntimeValue(playerName, SAVE_ADVANTAGE_CONDITIONS_KEY, campaignName);
    return Array.isArray(stored) ? stored : [];
}

export function isAuraOfPurityActive(targetName, campaignName) {
    const buffs = getRuntimeValue(targetName, 'activeBuffs', campaignName) || [];
    return buffs.some(b => b.name === AURA_OF_PURITY_BUFF_NAME && b.effect === 'aura_of_purity');
}
