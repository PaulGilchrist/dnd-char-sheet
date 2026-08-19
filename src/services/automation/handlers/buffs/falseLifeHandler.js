import { setTempHp } from './tempHpService.js';
import { rollExpression } from '../../../dice/diceRoller.js';
import { addEntry } from '../../../ui/logService.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const playerName = playerStats.name;

    let tempHpExpression = auto.tempHpExpression || '2d4+4';

    const spell = action.spell || {};
    const slotLevel = action.spellSlotLevel || spell.level || 1;

    if (spell.heal_at_slot_level && spell.heal_at_slot_level[slotLevel]) {
        tempHpExpression = spell.heal_at_slot_level[slotLevel];
    }

    const result = rollExpression(tempHpExpression);
    if (!result) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                automationType: auto.type,
                description: `${action.name}: Could not roll temp HP (${tempHpExpression}).`,
                automation: auto,
            },
        };
    }

    const amount = result.total;

    setTempHp(playerName, amount, campaignName);

    await addEntry(campaignName, {
        type: 'hp_change',
        targetName: playerName,
        delta: amount,
        isTempHp: true,
        sourceName: playerName,
        note: `False Life (${tempHpExpression})`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[falseLifeHandler:log-error]", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: auto.type,
            description: `${action.name}: Gained ${amount} temporary hit points (rolled ${tempHpExpression}).`,
            automation: auto,
        },
    };
}
