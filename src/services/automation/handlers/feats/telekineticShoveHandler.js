import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { addEntry } from '../../../ui/logService.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const pushDistance = auto.pushDistance || 5;

    const saveDc = buildSaveDc(auto, playerStats);
    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || playerStats.name;

    const saveType = auto.saveType || 'STR';

    const { promptId, promise } = createSaveListener(campaignName, {
        targetName,
        saveType,
        saveDc,
    });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: action.name,
        description: `${action.name} triggered — target ${targetName} must make ${saveType} save (DC ${saveDc}) or be pushed ${pushDistance} feet`,
        promptId,
    }).catch((e) => { console.error("[telekineticShove] Error:", e); });

    const saveResult = await promise;
    const success = saveResult.success;

    if (!success) {
        addEntry(campaignName, {
            type: 'save_result',
            characterName: playerStats.name,
            rollType: `save-${auto.type}`,
            targetName,
            saveDc,
            saveType,
            success: false,
            description: `${targetName} failed ${saveType} save. Pushed ${pushDistance} feet.`,
        }).catch((e) => { console.error("[telekineticShove] Error:", e); });
    } else {
        addEntry(campaignName, {
            type: 'save_result',
            characterName: playerStats.name,
            rollType: `save-${auto.type}`,
            targetName,
            saveDc,
            saveType,
            success: true,
            description: `${targetName} succeeded on ${saveType} save. No effect.`,
        }).catch((e) => { console.error("[telekineticShove] Error:", e); });
    }

    const popupDescription = success
        ? `${targetName} succeeded on the ${saveType} saving throw (DC ${saveDc}). No effect.`
        : `${targetName} failed the ${saveType} saving throw (DC ${saveDc}). Pushed ${pushDistance} feet toward or away from you.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            targetName,
            description: popupDescription,
            automation: auto,
        },
    };
}
