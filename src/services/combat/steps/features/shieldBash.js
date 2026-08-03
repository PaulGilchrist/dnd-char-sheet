import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { parseMagicItemName } from '../../../rules/core/attackCalc.js';
import { addEntry } from '../../../ui/logService.js';
import { buildSaveDc, createSaveListener } from '../../../automation/common/savePrompt.js';
import { checkOncePerTurnWithSkip } from '../../../automation/common/oncePerTurn.js';
import { addCondition } from '../../../../services/combat/conditions/conditionSaveService.js';

export const shieldBash = {
  name: 'shieldBash',
  condition: (ctx) => !!ctx.playerStats.automation?.passives,
  handler: async (ctx, prevData) => {
    const passives = ctx.playerStats.automation?.passives || [];

    // Check for old-style (5e) or new-style (2024) Shield Bash
    const hasOldStyle = passives.some(
      p => p.type === 'attack_rider' && p.trigger === 'melee_hit_with_shield_equipped' && p.options?.length > 0
    );
    const hasNewStyle = passives.some(
      p => p.type === 'attack_rider' && p.effect === 'push_or_prone' && p.oncePerTurn
    );

    if (!hasOldStyle && !hasNewStyle) return null;

    // Validate lastAttack: must be player's melee weapon attack that hit
    const lastAttack = await getRuntimeValue('campaign', 'lastAttack', ctx.campaignName);

    if (!lastAttack?.hit) return { data: prevData };
    if (lastAttack.attackerName !== ctx.playerStats.name) return { data: prevData };
    if (lastAttack.weaponType !== 'melee') return { data: prevData };

    const targetName = lastAttack.targetName;
    if (!targetName) return { data: prevData };

    // Check shield equipped
    const hasShield = ctx.playerStats.inventory?.equipped?.some(itemName => {
      const { baseName } = parseMagicItemName(itemName);
      const eq = ctx.playerStats.equipment?.find(e => e.name === baseName);
      return eq && (eq.armor_category === 'Shield' || eq.equipment_category === 'Shield');
    });
    if (!hasShield) return { data: prevData };

    // Check oncePerTurn with skip support
    const usedKey = '_Shield_Bash_usedRound';
    const skipKey = '_Shield_Bash_skippedRound';
    const skipResult = await checkOncePerTurnWithSkip('Shield Bash', usedKey, skipKey, ctx.playerStats, ctx.campaignName);
    if (skipResult) return { data: prevData };

    // Build save DC: 8 + STR modifier + proficiency bonus
    const shieldBashPassive = hasNewStyle
      ? passives.find(p => p.type === 'attack_rider' && p.effect === 'push_or_prone')
      : passives.find(p => p.type === 'attack_rider' && p.trigger === 'melee_hit_with_shield_equipped');

    const saveDc = shieldBashPassive?.automation
      ? buildSaveDc(shieldBashPassive.automation, ctx.playerStats)
      : 8 + (ctx.playerStats.abilities?.find(a => a.name === 'Strength')?.bonus || 0) + (ctx.playerStats.proficiency || 0);

    // Create STR save prompt
    const { promise } = createSaveListener(ctx.campaignName, {
      targetName,
      saveType: 'STR',
      saveDc,
      dcSuccess: false,
      sourceName: 'Shield Bash',
    });

    addEntry(ctx.campaignName, {
      type: 'roll',
      name: 'Shield Bash',
      characterName: ctx.playerStats.name,
      rollType: 'save-damage',
      targetName,
      saveDc,
      saveType: 'STR',
      description: `Shield Bash: ${targetName} must make a STR saving throw (DC ${saveDc}).`,
      timestamp: Date.now(),
    }).catch(() => {});

    const saveResult = await promise;
    const success = saveResult.success;

    addEntry(ctx.campaignName, {
      type: 'roll',
      name: 'Shield Bash',
      characterName: ctx.playerStats.name,
      rollType: 'save-damage',
      targetName,
      saveDc,
      saveType: 'STR',
      saveResult: success ? 'success' : 'failure',
      total: saveResult.total ?? 0,
      rolls: [saveResult.roll ?? 0],
      bonus: saveResult.saveBonus ?? 0,
      formula: `1d20${saveResult.saveBonus !== 0 ? '+' + saveResult.saveBonus : ''}`,
      description: `${targetName} ${success ? 'succeeded' : 'failed'} the STR save (DC ${saveDc}).${!success ? ' Shield Bash effect applied.' : ''}`,
      timestamp: Date.now(),
    }).catch(() => {});

    if (success) {
      return { data: prevData };
    }

    // On failed save — show modal for push/prone/skip choice
    return {
      modal: {
        type: 'shieldBash',
        props: {
          action: {
            name: 'Shield Bash',
            options: [
              { name: 'Push', effect: 'push', value: 5 },
              { name: 'Prone', effect: 'prone' },
            ],
          },
          playerStats: ctx.playerStats,
          campaignName: ctx.campaignName,
          targetName,
          saveDc,
        },
      },
      data: prevData,
    };
  },
};

export async function applyShieldBashEffect(action, playerStats, campaignName, targetName, chosenOption, saveDc) {
  const auto = action.automation || {};
  const effs = getRuntimeValue('campaign', 'targetEffects') || [];
  const storedEffects = [...effs];

  if (chosenOption === 'skip') {
    addEntry(campaignName, {
      type: 'ability_use',
      characterName: playerStats.name,
      abilityName: 'Shield Bash',
      description: `Shield Bash: skipped (no effect, use not consumed).`,
    }).catch(() => {});
    return null;
  }

  if (chosenOption === 'Push') {
    const newEffect = {
      target: targetName,
      source: 'Shield Bash',
      option: 'Push',
      effect: 'push',
      value: 5,
      duration: 'instant',
    };
    setRuntimeValue('campaign', 'targetEffects', [...storedEffects, newEffect], campaignName);

    addEntry(campaignName, {
      type: 'ability_use',
      characterName: playerStats.name,
      abilityName: 'Shield Bash',
      description: `Shield Bash used against ${targetName}: pushed 5 ft.`,
    }).catch(() => {});
  } else if (chosenOption === 'Prone') {
    const newEffect = {
      target: targetName,
      source: 'Shield Bash',
      option: 'Prone',
      effect: 'prone_and_push',
      value: 5,
      duration: 'until_start_of_next_turn',
      saveType: 'STR',
      saveDc,
      saveAbility: 'STR',
    };
    setRuntimeValue('campaign', 'targetEffects', [...storedEffects, newEffect], campaignName);

    const cs = await getCombatContext(campaignName);
    const conditionDef = { key: 'prone', label: 'Prone' };
    addCondition(cs, targetName, conditionDef, saveDc, 'STR', getRuntimeValue, setRuntimeValue, campaignName, playerStats);

    addEntry(campaignName, {
      type: 'ability_use',
      characterName: playerStats.name,
      abilityName: 'Shield Bash',
      description: `Shield Bash used against ${targetName}: target has Prone condition.`,
    }).catch(() => {});
  }

  // Mark oncePerTurn as used
  const cs = await getCombatContext(campaignName);
  const currentRound = cs?.round || 1;
  const currentCreature = cs?.activeCreatureName || playerStats.name;
  await setRuntimeValue(playerStats.name, '_Shield_Bash_usedRound', { round: currentRound, activeCreature: currentCreature }, campaignName);

  return {
    type: 'popup',
    payload: {
      type: 'automation_info',
      name: 'Shield Bash',
      description: chosenOption === 'skip'
        ? `Shield Bash: ${targetName} was not affected (skipped).`
        : `Shield Bash: ${targetName} ${chosenOption === 'Push' ? 'pushed 5 ft' : 'has Prone condition'}.`,
      automation: auto,
    },
  };
}
