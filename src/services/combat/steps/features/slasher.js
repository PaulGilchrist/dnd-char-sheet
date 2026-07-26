import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatContext, getTargetFromAttacker } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../../services/ui/logService.js';

export const slasher = {
  name: 'slasher',
  condition: (ctx) => {
    const isSlashing = (ctx.attack?.damageType || '').toLowerCase() === 'slashing';
    return isSlashing && !!ctx.playerStats.automation?.passives;
  },
  handler: async (ctx, prevData) => {
    const isSlashing = (ctx.attack?.damageType || '').toLowerCase() === 'slashing';
    const ps = ctx.playerStats;

    // Slasher crit effect: disadvantage on next attack
    if (isSlashing && ctx.isCrit && ps.automation?.passives) {
      const sc = ps.automation.passives.find(a => a.type === 'conditional_advantage' && a.trigger === 'critical_hit_slashing');
      if (sc) {
        const cs = await getCombatContext(ctx.campaignName);
        const t = cs ? getTargetFromAttacker(cs, ps.name) : null;
        if (t?.name) {
          const effs = getRuntimeValue(ctx.campaignName, 'targetEffects') || [];
          setRuntimeValue(ctx.campaignName, 'targetEffects', [...effs, { target: t.name, source: sc.name, effect: 'disadvantage_next_attack', duration: 'until_start_of_next_turn' }], ctx.campaignName);

          await addEntry(ctx.campaignName, {
            type: 'ability_use',
            characterName: ps.name,
            abilityName: sc.name,
            description: `${ps.name} scored a critical hit with slashing damage on ${t.name}. Attack rolls against ${t.name} have Disadvantage until the start of ${ps.name}'s next turn.`,
          }).catch((e) => { console.error('[slasher] Error logging:', e); });
        }
      }
    }

    return { data: prevData };
  },
};
