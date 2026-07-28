import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../automation/common/buffToggle.js';
import { addEntry } from '../../ui/logService.js';

const INVISIBILITY_BUFF_NAME = 'Invisibility';

/**
 * Remove Invisibility buff and invisible condition from a target.
 * Used by invisibilityHandler, invisibilityService, and restRules.
 */
export function endInvisibility(targetName, campaignName, reason) {
    const key = `_activeInvisibility_${targetName}`;
    const casterName = getRuntimeValue('campaign', key, campaignName);
    if (!casterName) return;

    const activeBuffs = getActiveBuffs(targetName, campaignName);
    const filtered = activeBuffs.filter(b => b.name !== INVISIBILITY_BUFF_NAME);
    if (filtered.length !== activeBuffs.length) {
        setRuntimeValue(targetName, 'activeBuffs', filtered, campaignName);
    }

    const conditions = (() => {
        const x = getRuntimeValue(targetName, 'activeConditions', campaignName);
        if (x == null) { console.error('[invisibilityService] Missing array:', x); throw new Error('Expected array, got ' + x); }
        return x;
    })();
    const condFiltered = conditions.filter(c => String(c).toLowerCase() !== 'invisible');
    if (condFiltered.length !== conditions.length) {
        setRuntimeValue(targetName, 'activeConditions', condFiltered, campaignName);
    }

    setRuntimeValue('campaign', key, null, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: targetName,
        abilityName: 'Invisibility',
        description: `Invisibility ends for ${targetName}: ${reason}.`,
    }).catch(() => {});
}

/**
 * End Invisibility early for the invisible creature if they take a hostile action
 * (make an attack roll, deal damage, or cast a spell).
 * Called from the relevant hooks/services when such actions occur.
 */
export function endInvisibilityOnHostileAction(invisibleName, campaignName) {
    endInvisibility(invisibleName, campaignName, 'target made a hostile action (attack roll, dealt damage, or cast a spell)');
}
