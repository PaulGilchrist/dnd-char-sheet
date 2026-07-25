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

    // Piercer crit bonus die
    if (isPiercing && ctx.isCrit && ctx.attack?.damage && ctx.playerStats.automation?.passives) {
      const pc = ctx.playerStats.automation.passives.find(a => a.type === 'damage_bonus' && a.trigger === 'critical_hit_piercing');
      if (pc) {
        const m = ctx.attack.damage.match(/(\d+)d(\d+)/);
        if (m) {
          const ds = parseInt(m[2], 10);
          const ev = Math.floor(Math.random() * ds) + 1;
          formula += ` + 1 [${ctx.attack.damageType}]`;
          total += ev;
          rolls = [...rolls, ev];
          return { data: { formula, total, rolls } };
        }
      }
    }

    return { data: prevData };
  },
};
