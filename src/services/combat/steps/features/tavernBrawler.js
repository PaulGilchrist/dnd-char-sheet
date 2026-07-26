
export const tavernBrawler = {
  name: 'tavernBrawler',
  condition: (ctx) => {
    return ctx.attack?.weaponType === 'unarmed' && !!ctx.attack?.damage && !!ctx.playerStats.automation?.passives;
  },
  handler: async (ctx, prevData) => {
    const ps = ctx.playerStats;
    const tb = (ps.automation?.passives || []).find(p => p.effect === 'tavern_brawler_reroll_ones');
    if (!tb) return null;

    const m = ctx.attack.damage.match(/(\d+)d(\d+)/);
    if (!m || prevData.rolls.length === 0) return { data: prevData };

    const ds = parseInt(m[2], 10);
    let total = prevData.total;
    let rolls = [...prevData.rolls];
    let formula = prevData.formula;
    let rerolled = false;
    const rerollPairs = [];

    for (let i = 0; i < rolls.length; i++) {
      if (rolls[i] === 1) {
        const rand = Math.random();
        const rv = Math.floor(rand * ds) + 1;
        total += rv - 1;
        rolls[i] = rv;
        rerolled = true;
        rerollPairs.push({ original: 1, rerolled: rv });
      }
    }
    if (rerolled) formula += ' [Tavern Brawler]';

    if (rerollPairs.length > 0) {
      ctx.tavernBrawlerRerolls = rerollPairs;
    }

    return { data: { formula, total, rolls } };
  },
};
