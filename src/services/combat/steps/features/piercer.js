export const piercer = {
  name: 'piercer',
  condition: (ctx) => {
    const isPiercing = (ctx.attack?.damageType || '').toLowerCase() === 'piercing';
    return isPiercing && ctx.isCrit && ctx.attack?.damage && !!ctx.playerStats.automation?.passives;
  },
  handler: async (ctx, prevData) => {
    const isPiercing = (ctx.attack?.damageType || '').toLowerCase() === 'piercing';
    let rolls = [...prevData.rolls];
    let total = prevData.total;
    let formula = prevData.formula;

    // Piercer crit bonus die: roll 1 extra weapon die and add as "plus 1dX [Enhanced Critical]"
    if (isPiercing && ctx.isCrit && ctx.attack?.damage && ctx.playerStats.automation?.passives) {
      const pc = ctx.playerStats.automation.passives.find(a => a.type === 'damage_bonus' && a.trigger === 'critical_hit_piercing');
      if (pc) {
        const m = ctx.attack.damage.match(/(\d+)d(\d+)/);
        if (m) {
          const ds = parseInt(m[2], 10);
          const ev = Math.floor(Math.random() * ds) + 1;
          formula += ` plus 1d${ds} [Enhanced Critical]`;
          total += ev;
          rolls = [...rolls, ev];
          const critLabels = [...(prevData.critLabels || []), 'Enhanced Critical'];
          return { data: { formula, total, rolls, critLabels } };
        }
      }
    }

    return { data: prevData };
  },
};
