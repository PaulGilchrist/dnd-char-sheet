import { evaluateAutoExpression } from '../../combat/automation/automationService.js';
import { resolveDiceExpression } from '../../combat/automation/automationExpressions.js';
import { rollExpression } from '../../dice/diceRoller.js';
import { applyHealingDirectly, logHealingToSSE } from '../../automation/common/healingRoll.js';
import { applyHealingToTarget } from '../combat/applyHealing.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../encounters/combatData.js';

const HEALING_SPELL_NAMES = new Set([
    'aid',
    'aura of life',
    'cure wounds',
    'death ward',
    'greater restoration',
    'heal',
    'healing word',
    'lesser restoration',
    'mass cure wounds',
    'mass healing word',
    'mass heal',
    'prayer of healing',
    'power word heal',
    'regenerate',
    'revivify',
]);

function isHealingSpell(spell) {
    return HEALING_SPELL_NAMES.has((spell.name || '').toLowerCase());
}

function getPostCastSelfHeals(playerStats) {
    const passives = playerStats.automation?.passives ?? [];
    return passives.filter(p => p.type === 'post_cast_self_heal');
}

function getPostCastAllyHeals(playerStats, campaignName) {
    const passives = playerStats.automation?.passives ?? [];
    const storedBuffs = getRuntimeValue(playerStats.name, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(storedBuffs) ? storedBuffs : (playerStats.activeBuffs ?? []);
    const allyHealPassives = passives.filter(p => p.type === 'post_cast_ally_heal');
    const starryBuffs = activeBuffs.filter(b => b.name === 'Starry Form');
    const starryFormActive = starryBuffs.some(b => b.constellation === 'Chalice');
    console.log(`[postCastHealService] getPostCastAllyHeals for ${playerStats.name} (campaign=${campaignName}): totalPassives=${passives.length}, allyHealPassives=${allyHealPassives.length}`, allyHealPassives.map(p => ({ type: p.type, name: p.name, healExpression: p.healExpression })));
    console.log(`[postCastHealService] getPostCastAllyHeals buffs for ${playerStats.name}: storedBuffs=${Array.isArray(storedBuffs) ? storedBuffs.length : 'N/A'} (used ${Array.isArray(storedBuffs) ? 'runtime' : 'playerStats.activeBuffs'}), starryBuffs=${JSON.stringify(starryBuffs.map(b => ({ name: b.name, constellation: b.constellation })))}, starryFormActive=${starryFormActive}`);
    if (!starryFormActive) {
        return [];
    }
    return allyHealPassives;
}

 export async function triggerPostCastSelfHeals(spell, metaCtx, playerStats, campaignName, _mapName) {
    if (!isHealingSpell(spell)) {
        return null;
    }

    if (spell.level === 0) {
        return null;
    }

    const selfHeals = getPostCastSelfHeals(playerStats);
    if (selfHeals.length === 0) {
        return null;
    }

    const results = [];
    const prof = playerStats.proficiency || 0;
    if (playerStats.level == null) {
        console.error('[postCastHealService] triggerPostCastSelfHeals: playerStats.level is missing')
        throw new Error('playerStats.level is required for post-cast self heals')
      }
      const level = playerStats.level
      if (metaCtx?.slotLevel == null && spell.level == null) {
        console.error('[postCastHealService] triggerPostCastSelfHeals: slot level is missing (metaCtx.slotLevel and spell.level)')
        throw new Error('slot level is required for post-cast self heals')
      }
      const slotLevel = metaCtx?.slotLevel || spell.level;

    for (const heal of selfHeals) {
        if (heal.othersOnly && spell.range === 'Self') {
            continue;
        }

        let expression = heal.healExpression || '0';
        const isTwinkled = level >= 10;
        if (isTwinkled) {
            expression = expression.replace(/1d8/g, '2d8');
        }
        const resolvedExpression = resolveDiceExpression(expression, playerStats, slotLevel);
        const evaluated = evaluateAutoExpression(resolvedExpression, playerStats, prof, level, slotLevel);
        const rollResult = typeof evaluated === 'number'
            ? { total: evaluated, rolls: [evaluated], formula: resolvedExpression }
            : rollExpression(resolvedExpression);
        const amount = rollResult?.total ?? 0;
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            continue;
        }

        const { newHp, maxHp, actualHeal } = applyHealingDirectly(playerStats, playerStats.name, amount, campaignName);

        logHealingToSSE(campaignName, {
            targetName: playerStats.name,
            sourceName: heal.name,
            actualHeal,
            newHp,
            maxHp,
        });

        results.push({ name: heal.name, amount, actualHeal });
    }

    return results.length > 0 ? results : null;
}

export async function triggerPostCastAllyHeals(spell, metaCtx, playerStats, campaignName, _mapName) {
    console.log(`[postCastHealService] triggerPostCastAllyHeals entry: spell=${spell.name}, level=${spell.level}, isHealingSpell=${isHealingSpell(spell)}, caster=${playerStats.name}, campaign=${campaignName}`);
    if (!isHealingSpell(spell)) {
        return null;
    }

    if (spell.level === 0) {
        return null;
    }

    const allyHeals = getPostCastAllyHeals(playerStats, campaignName);
    console.log(`[postCastHealService] triggerPostCastAllyHeals allyHeals.length=${allyHeals.length}`);
    if (allyHeals.length === 0) {
        return null;
    }

    const prof = playerStats.proficiency || 0;
    if (playerStats.level == null) {
        console.error('[postCastHealService] triggerPostCastAllyHeals: playerStats.level is missing')
        throw new Error('playerStats.level is required for post-cast ally heals')
      }
      const level = playerStats.level
      if (metaCtx?.slotLevel == null && spell.level == null) {
        console.error('[postCastHealService] triggerPostCastAllyHeals: slot level is missing (metaCtx.slotLevel and spell.level)')
        throw new Error('slot level is required for post-cast ally heals')
      }
      const slotLevel = metaCtx?.slotLevel || spell.level;

    for (const heal of allyHeals) {
        if (heal.othersOnly && spell.range === 'Self') {
            continue;
        }

        let expression = heal.healExpression || '0';
        const isTwinkled = level >= 10;
        if (isTwinkled) {
            expression = expression.replace(/1d8/g, '2d8');
        }
        const resolvedExpression = resolveDiceExpression(expression, playerStats, slotLevel);
        const evaluated = evaluateAutoExpression(resolvedExpression, playerStats, prof, level, slotLevel);
        const rollResult = typeof evaluated === 'number'
            ? { total: evaluated, rolls: [evaluated], formula: resolvedExpression }
            : rollExpression(resolvedExpression);
        const amount = rollResult?.total ?? 0;
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            continue;
        }

        const cs = getCombatSummary(campaignName);
        const creatureNames = (cs?.creatures || []).map(c => c.name);
        const allTargets = [playerStats.name, ...creatureNames.filter(n => n !== playerStats.name)];

        setRuntimeValue('campaign', 'pendingStarryChaliceHeal', {
            amount,
            casterName: playerStats.name,
            campaignName,
            targetNames: allTargets,
            sourceName: heal.name,
        }, campaignName, true);

        return { needsModal: true, amount };
    }

    return null;
}

export async function applyStarryChaliceHeal(targetName, campaignName) {
    const pending = getRuntimeValue('campaign', 'pendingStarryChaliceHeal', campaignName);
    if (!pending) return null;

    const { amount, sourceName } = pending;
    const cs = getCombatSummary(campaignName);
    const result = applyHealingToTarget(cs, targetName, amount, campaignName);

    let newHp, maxHp, actualHeal;
    if (result) {
        newHp = result.newHp;
        actualHeal = result.actualHeal;
        const creature = cs?.creatures?.find(c => c.name === targetName);
        maxHp = creature?.type === 'player'
            ? (getRuntimeValue(targetName, 'hitPoints', campaignName) ?? creature?.maxHp)
            : (creature?.maxHp ?? getRuntimeValue(targetName, 'hitPoints', campaignName) ?? newHp);
    } else {
        const fallback = applyHealingDirectly({}, targetName, amount, campaignName, null);
        newHp = fallback.newHp;
        maxHp = fallback.maxHp;
        actualHeal = fallback.actualHeal;
    }

    logHealingToSSE(campaignName, {
        targetName,
        sourceName,
        actualHeal,
        newHp,
        maxHp,
    });

    setRuntimeValue('campaign', 'pendingStarryChaliceHeal', null, campaignName, true);

    return { targetName, actualHeal, newHp, maxHp };
}
