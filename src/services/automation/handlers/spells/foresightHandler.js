import { resolveTarget } from '../../common/targetResolver.js';
import { triggerForesight } from '../../../rules/features/foresightService.js';

export async function handle(action, playerStats, campaignName, _mapName, _characters) {
    const spell = action.spell || {};

    // Resolve target from UI combat target selection
    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || playerStats.name;

    const spellData = {
        name: action.name || spell.name || 'Foresight',
    };

    const metaCtx = {
        targetName,
    };

    return await triggerForesight(spellData, metaCtx, playerStats, campaignName, _mapName);
}
