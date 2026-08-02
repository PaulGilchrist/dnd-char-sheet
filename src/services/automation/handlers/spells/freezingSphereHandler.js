import { buildSaveDc } from '../../common/savePrompt.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const saveDc = buildSaveDc(auto, playerStats);
    const slotLevel = action.spell?.level ?? action.spell?.baseLevel ?? 6;

    const damageAtSlotLevel = {
        6: '10d6',
        7: '11d6',
        8: '12d6',
        9: '13d6',
    };
    let damageExpression = damageAtSlotLevel[slotLevel];
    if (!damageExpression) {
        const levels = Object.keys(damageAtSlotLevel).map(Number).sort((a, b) => a - b);
        const highestBelow = levels.filter(l => l <= slotLevel).pop();
        damageExpression = highestBelow != null ? damageAtSlotLevel[highestBelow] : '10d6';
    }

    const range = auto.range ? 300 : 300;

    return {
        type: 'modal',
        modalName: 'saveAttackAoe',
        payload: {
            action: { name: action.name, automation: auto, spell: action.spell },
            playerStats,
            campaignName,
            shape: 'sphere',
            range,
            damage: damageExpression,
            damageType: 'Cold',
            saveType: 'CON',
            saveDc,
            dcSuccess: 'half',
            activeOverlay: null,
        },
    };
}
