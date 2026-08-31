import { addEntry } from '../../../ui/logService.js';
import { setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const playerName = playerStats.name;
    // Data stores range as '30_ft' — render the numeric feet.
    const rangeFeet = String(auto.range || '30_ft').replace(/[^\d]/g, '') || '30';

    // CLA-218: controlling the spectral hand arms the legerdemain condition —
    // while controlled, Dexterity (Sleight of Hand) checks made through the
    // hand roll with Advantage (consumer: CharSheet.conditionEffects.js reads
    // this flag alongside the conditional_advantage saveModifier entry).
    // Cleared at the start of the controller's next turn by the
    // mage_hand_legerdemain turn-start consumer.
    setRuntimeValue(playerName, 'mageHandControlled', true, campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerName,
        abilityName: action.name,
        description: `${playerName} used ${action.name} to move the spectral hand up to ${rangeFeet} feet. Dexterity (Sleight of Hand) checks through the hand have advantage until the start of ${playerName}'s next turn.`,
    }).catch((e) => { console.error("[mageHandControlHandler:log-error]", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: auto.type,
            description: `${action.name}: Move the spectral hand up to <strong>${rangeFeet}</strong> feet. While you control it, Dexterity (Sleight of Hand) checks through it have <strong>Advantage</strong>.`,
            automation: auto,
        },
    };
}
