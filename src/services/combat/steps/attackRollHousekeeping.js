import { isForcecageBlocked } from '../../automation/handlers/spells/forcecageHandler.js';
import { isMazeBlocked } from '../../automation/handlers/spells/mazeHandler.js';
import { isBanishmentBlocked } from '../../automation/handlers/spells/banishmentHandler.js';
import { isImprisonmentBlocked } from '../../automation/handlers/spells/imprisonmentHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';
import { getCurrentCombatRound } from '../../../encounters/combatData.js';

export function buildHousekeepingStep() {
  return {
    name: 'housekeeping',
    subscribe: 'housekeeping:do',
    emit: 'maneuvers:check',
    condition: () => true,
    handler: async (ctx) => {
      if (ctx.targetName && isForcecageBlocked(ctx.playerStats.name, ctx.targetName, ctx.campaignName)) {
        const description = `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Forcecage — they are on opposite sides of the prison.`;
        addEntry(ctx.campaignName, {
          type: 'automation',
          creatureName: ctx.playerStats.name,
          name: 'Forcecage',
          description,
          timestamp: Date.now(),
        }).catch((e) => { console.error("[attackRollHousekeeping:log-error]", e); });
        ctx.setPopupHtml?.({
          type: 'automation_info',
          name: 'Forcecage',
          description: `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Forcecage. No attack, spell, or effect can pass between inside and outside the prison.`,
        });
        return null;
      }

      if (ctx.targetName && isMazeBlocked(ctx.playerStats.name, ctx.targetName, ctx.campaignName)) {
        const description = `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Maze — they are on opposite sides of the demiplane barrier.`;
        addEntry(ctx.campaignName, {
          type: 'automation',
          creatureName: ctx.playerStats.name,
          name: 'Maze',
          description,
          timestamp: Date.now(),
        }).catch((e) => { console.error("[attackRollHousekeeping:log-error]", e); });
        ctx.setPopupHtml?.({
          type: 'automation_info',
          name: 'Maze',
          description: `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Maze. No attack, spell, or effect can pass between inside and outside the demiplane.`,
        });
        return null;
      }

      if (ctx.targetName && isBanishmentBlocked(ctx.playerStats.name, ctx.targetName, ctx.campaignName)) {
        const description = `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Banishment — they are on opposite sides of the demiplane barrier.`;
        addEntry(ctx.campaignName, {
          type: 'automation',
          creatureName: ctx.playerStats.name,
          name: 'Banishment',
          description,
          timestamp: Date.now(),
        }).catch((e) => { console.error("[attackRollHousekeeping:log-error]", e); });
        ctx.setPopupHtml?.({
          type: 'automation_info',
          name: 'Banishment',
          description: `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Banishment. No attack, spell, or effect can pass between inside and outside the demiplane.`,
        });
        return null;
      }

      if (ctx.targetName && isImprisonmentBlocked(ctx.playerStats.name, ctx.targetName, ctx.campaignName)) {
        const description = `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Imprisonment — they are on opposite sides of the barrier.`;
        addEntry(ctx.campaignName, {
          type: 'automation',
          creatureName: ctx.playerStats.name,
          name: 'Imprisonment',
          description,
          timestamp: Date.now(),
        }).catch((e) => { console.error("[attackRollHousekeeping:log-error]", e); });
        ctx.setPopupHtml?.({
          type: 'automation_info',
          name: 'Imprisonment',
          description: `${ctx.playerStats.name}'s attack on ${ctx.targetName} is blocked by Imprisonment. No attack, spell, or effect can pass between inside and outside the prison.`,
        });
        return null;
      }

      const sfOptKey = `_${"Stalker's Flurry".replace(/\s+/g, '_')}_option`;
      setRuntimeValue(ctx.playerStats.name, sfOptKey, null, ctx.campaignName);
      setRuntimeValue(ctx.playerStats.name, 'stalkersFlurryChosenTarget', null, ctx.campaignName);
      setRuntimeValue(ctx.playerStats.name, 'pendingSuddenStrike', null, ctx.campaignName);
      setRuntimeValue(ctx.playerStats.name, 'pendingSuddenStrikeTarget', null, ctx.campaignName);

      const isBonus = ctx.attack?.type === 'Bonus Action';
      if (ctx.attack?.name === 'Horde Breaker' && isBonus) {
        const choice = getRuntimeValue(ctx.playerStats.name, "_Hunter's_Prey_choice", ctx.campaignName);
        if (choice === 'Horde Breaker') {
          setRuntimeValue(ctx.playerStats.name, '_Hunters_Prey_HordeBreaker_UsedRound', getCurrentCombatRound(), ctx.campaignName);
        }
      }

      if (!isBonus && ctx.attack?.weaponType === 'melee' && !ctx.attack?.saveDc && ctx.attack?.name !== 'Horde Breaker' && ctx.targetName) {
        const hbChoice = getRuntimeValue(ctx.playerStats.name, "_Hunter's_Prey_choice", ctx.campaignName);
        const lastAttack = getRuntimeValue('campaign', 'lastAttack', ctx.campaignName);
        if (hbChoice === 'Horde Breaker' && lastAttack?.hit && lastAttack.attackerName === ctx.playerStats.name && lastAttack.weaponType === 'melee') {
          setRuntimeValue(ctx.playerStats.name, '_Hunters_Prey_HordeBreaker_Ready', {
            round: getCurrentCombatRound(),
            targetName: lastAttack.targetName,
            attackName: lastAttack.attackName,
          }, ctx.campaignName);
        }
      }
      return { data: { isBonusActionAttack: isBonus } };
    },
  };
}
