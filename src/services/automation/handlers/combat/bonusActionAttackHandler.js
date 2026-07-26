import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { automationInfoPopup } from '../../../shared/popupResponse.js';
import { isPolearmWeapon } from '../../common/polearmUtils.js';
import { findLastAttack } from '../../common/damageRollback.js';
import { MELEE_REACH_FEET } from '../../../combat/baseCombatActions.js';

export async function handle(action, playerStats, campaignName, _mapName, _allEquipment) {
    const auto = action.automation;

    if (auto?.trigger === 'after_attack_action_with_polearm' || auto?.weaponRequirement === 'quarterstaff_spear_heavy_reach') {
        const lastAttackResult = await findLastAttack(campaignName);
        const lastAttack = lastAttackResult.attackEvent;
        const weaponName = lastAttack?.damageName || lastAttack?.attackName;
        const isPolearm = await isPolearmWeapon(weaponName);
        if (!isPolearm) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: action.name,
                    description: `${action.name} requires you to be holding a Quarterstaff, Spear, or a weapon with the Heavy and Reach properties.`,
                    automation: auto,
                },
            };
        }
    }

    const usesMax = auto.usesMax ?? 0;

    if (usesMax > 0) {
        const usesKey = auto.resourceKey || 'warPriestUses';
        const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);
        if (currentUses <= 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: action.name,
                    description: `${action.name} has no uses remaining. Recharges on a ${auto.recharge || 'Long Rest'}.`,
                    automation: auto,
                },
            };
        }
        await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);
    }

    if (auto?.effect === 'disengage_end_grappled') {
        const storedConditions = getRuntimeValue(playerStats.name, 'activeConditions') || [];
        const conditions = Array.isArray(storedConditions) ? storedConditions : [];
        const filtered = conditions.filter(c => String(c).toLowerCase() !== 'grappled');
        if (filtered.length !== conditions.length) {
            await setRuntimeValue(playerStats.name, 'activeConditions', filtered, campaignName);
        }
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `You take the Disengage action and the Grappled condition ends on you.`,
                automation: auto,
            },
        };
    }

    if (auto?.trigger === 'after_attack_action_with_polearm') {
        const lastAttackResult = await findLastAttack(campaignName);
        const targetName = lastAttackResult.targetName || null;
        const hitBonus = lastAttackResult.attackEvent?.bonus ?? (playerStats.proficiency || 0);

        const damageExpression = auto.damage || auto.extraDamageExpression || '1d4';
        const damageType = auto.damageType || 'Bludgeoning';

        const poleStrikeAttack = {
            name: action.name || 'Pole Strike',
            type: 'Bonus Action',
            range: MELEE_REACH_FEET,
            hitBonus,
            damage: damageExpression,
            damageType,
            autoDamageFormula: damageExpression,
            autoDamageName: action.name || 'Pole Strike',
        };

        return {
            type: 'attack_roll',
            payload: {
                attack: poleStrikeAttack,
                targetName,
                sourceName: action.name,
            },
        };
    }

    return automationInfoPopup(action);
}
