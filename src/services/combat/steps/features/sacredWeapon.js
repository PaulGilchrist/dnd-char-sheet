import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

export const sacredWeapon = {
  name: 'sacredWeapon',
  condition: (ctx) => {
    const weaponOk = ctx.attack?.weaponType === 'melee' || ctx.attack?.weaponType === 'unarmed';
    return weaponOk && !!ctx.playerStats.automation?.passives;
  },
  handler: async (ctx, prevData) => {
    const sw = (ctx.playerStats.automation?.passives || []).find(p => p.name === 'Sacred Weapon' && p.effect === 'sacred_weapon');
    console.log('[sw-debug] ctx.weaponType=', ctx.attack?.weaponType, 'sw=', JSON.stringify(sw), 'passives=', (ctx.playerStats.automation?.passives || []).map(p => p.effect).join(','));
    if (!sw) return null;

    const buffs = getRuntimeValue(ctx.playerStats.name, 'activeBuffs', ctx.campaignName) || [];
    const b = buffs.find(x => x.name === 'Sacred Weapon' && x.effect === 'sacred_weapon');
    console.log('[sw-debug] buff=', JSON.stringify(b), 'before.damageType=', ctx.attack?.damageType);
    if (b?.damageTypeChoice) ctx.attack.damageType = b.damageTypeChoice;
    console.log('[sw-debug] after.damageType=', ctx.attack?.damageType);
    return { data: prevData };
  },
};
