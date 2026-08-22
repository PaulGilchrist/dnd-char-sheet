import { rollD20, rollExpression } from '../../services/dice/diceRoller.js';
import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js';
import { hasStarryDragonActive, starryDragonAppliesToRoll } from './starryDragon.js';

export function computeD20Roll(characterName, campaignName, name, rollType, context, bonus, isResilientSphereActive) {
    const r1 = rollD20();
    const r2 = rollD20();

    const starryDragonFloor = (rollType === 'save' || rollType === 'check' || rollType === 'skill')
        && hasStarryDragonActive(characterName, campaignName)
        && starryDragonAppliesToRoll(name, rollType);

    const effectiveD20 = ((context?.d20Floor10 || starryDragonFloor) && r1 <= 9) ? 10 : r1;

    let effectiveD20Roll;
    let forcedMode = context?.forcedMode || 'normal';

    // Halfling Lucky: automatic reroll on natural 1
    let luckyRerolled = false;
    let luckyRerollValue = null;
    const isLuckyReroll = context?.autoReroll && context?.autoRerollCondition === 'roll_equals_1' && effectiveD20Roll === 1;
    if (isLuckyReroll) {
        luckyRerollValue = rollD20();
        effectiveD20Roll = luckyRerollValue;
        luckyRerolled = true;
    }

    // Cosmic Omen: apply global pending bonus to next d20 roll by anyone (not save rolls)
    let cosmicOmenAppliedBonus = 0;
    let cosmicOmenDetail = null;
    if (rollType !== 'save') {
        const cosmicOmenPendingRaw = getRuntimeValue('cosmicOmen', 'cosmicOmenPendingBonus');
        if (cosmicOmenPendingRaw) {
            try {
                const pending = JSON.parse(cosmicOmenPendingRaw);
                if (pending && typeof pending.value === 'number' && pending.value > 0) {
                    const isWeal = pending.type === 'Weal';
                    effectiveD20Roll += isWeal ? pending.value : -pending.value;
                    cosmicOmenAppliedBonus = isWeal ? pending.value : -pending.value;
                    cosmicOmenDetail = `(${cosmicOmenAppliedBonus} from ${pending.type})`;
                    setRuntimeValue('cosmicOmen', 'cosmicOmenPendingBonus', null, campaignName, true);
                }
            } catch (_e) { /* ignore */ }
        }
    }

    // Pending Skill Check Bonus (Ambush maneuver): apply stored bonus to check/skill/initiative rolls
    let pendingSkillCheckAppliedBonus = 0;
    let pendingSkillCheckDetail = null;
    if ((rollType === 'check' || rollType === 'skill' || rollType === 'initiative') && characterName) {
        const pendingRaw = getRuntimeValue(characterName, 'pendingSkillCheckBonus');
        if (pendingRaw && typeof pendingRaw === 'number' && pendingRaw > 0) {
            effectiveD20Roll += pendingRaw;
            pendingSkillCheckAppliedBonus = pendingRaw;
            pendingSkillCheckDetail = `(+${pendingSkillCheckAppliedBonus} [Pending Skill Check])`;
            setRuntimeValue(characterName, 'pendingSkillCheckBonus', null, campaignName, true);
        }
    }

    // Ray of Enfeeblement: STR-based d20 tests have disadvantage
    let rayStrDisadvantage = false;
    if (rollType === 'check' || rollType === 'skill') {
        const abilityAbbr = (name || '').substring(0, 3).toUpperCase();
        if (abilityAbbr === 'STR' || name === 'Strength' || name === 'Athletics') {
            const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const rayDebuffOnAttacker = allTargetEffects.some(te => te.target === characterName && te.effect === 'ray_of_enfeeble_debuff' && te.strCheckDisadvantage);
            if (rayDebuffOnAttacker) {
                rayStrDisadvantage = true;
            }
        }
    }

    if (rayStrDisadvantage) {
        forcedMode = 'disadvantage';
    }

    const sacredWeaponBonus = context?.sacredWeaponBonus || 0;

    // Bane/Blade Ward: apply -1d4 penalty to attack rolls
    let baneAttackPenalty = 0;
    let baneAttackRoll = null;
    let baneDisplayLabel = 'Bane';
    if (rollType === 'attack') {
        const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const attackerEffects = allTargetEffects.filter(te => te.target === characterName && te.effect === 'bane_penalty');
        const targetEffects = allTargetEffects.filter(te => te.target === context?.targetName && te.effect === 'bane_penalty' && te.source === context?.targetName);
        for (const te of [...attackerEffects, ...targetEffects]) {
            const r = rollExpression('1d4');
            if (r) {
                baneAttackPenalty -= r.total;
                baneAttackRoll = r.total;
                baneDisplayLabel = te.displayLabel || 'Bane';
            }
        }
    }

    // Bless: add 1d4 to attack rolls for blessed attackers
    let blessAttackBonus = 0;
    let blessAttackRoll = null;
    if (rollType === 'attack') {
        const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const blessEffects = allTargetEffects.filter(te => te.target === characterName && te.effect === 'bless_bonus');
        if (blessEffects.length > 0) {
            const r = rollExpression('1d4');
            if (r) {
                blessAttackBonus += r.total;
                blessAttackRoll = r.total;
            }
        }
    }

    // Sundering Blow: add +5 to hit bonus for next attack against the target
    let sunderingBlowBonus = 0;
    if (rollType === 'attack' && context?.targetName) {
        const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const targetEffectsForTarget = allTargetEffects.filter(te => te.target === context.targetName);
        for (const te of targetEffectsForTarget) {
            if (te.effect === 'next_attack_bonus') {
                sunderingBlowBonus += parseInt(te.value, 10) || 5;
            }
        }
    }

    if (forcedMode === 'advantage') {
        effectiveD20Roll = Math.max(r1, r2);
    } else if (forcedMode === 'disadvantage') {
        effectiveD20Roll = Math.min(r1, r2);
    } else {
        effectiveD20Roll = effectiveD20;
    }

    // Lucky feat disadvantage/advantage on attack targets
    if (rollType === 'attack' && (!forcedMode || forcedMode === 'normal')) {
        const targetNameForLucky = context?.targetName;
        if (targetNameForLucky) {
            const targetLuckyDis = getRuntimeValue(targetNameForLucky, 'luckyDisadvantageActive', campaignName);
            if (targetLuckyDis) {
                forcedMode = 'disadvantage';
                context.forcedMode = 'disadvantage';
                setRuntimeValue(targetNameForLucky, 'luckyDisadvantageActive', null, campaignName);
                effectiveD20Roll = Math.min(r1, r2);
            } else {
                const targetLuckyAdv = getRuntimeValue(targetNameForLucky, 'luckyAdvantageActive', campaignName);
                if (targetLuckyAdv) {
                    forcedMode = 'advantage';
                    context.forcedMode = 'advantage';
                    setRuntimeValue(targetNameForLucky, 'luckyAdvantageActive', null, campaignName);
                    effectiveD20Roll = Math.max(r1, r2);
                }
            }
        }
    }

    const effectiveBonus = bonus + cosmicOmenAppliedBonus + pendingSkillCheckAppliedBonus + sunderingBlowBonus + baneAttackPenalty + blessAttackBonus;

    const bonusDetailParts = [];
    if (sacredWeaponBonus > 0) {
        const baseBonus = bonus - sacredWeaponBonus;
        if (baseBonus !== 0) {
            bonusDetailParts.push((baseBonus > 0 ? '+' : '') + baseBonus + ' to hit');
        }
        bonusDetailParts.push('+' + sacredWeaponBonus + ' Sacred Weapon');
    } else {
        if (bonus > 0) bonusDetailParts.push('+' + bonus + ' to hit');
    }
    if (sunderingBlowBonus > 0) bonusDetailParts.push('+' + sunderingBlowBonus + ' [Sundering Blow]');
    if (cosmicOmenAppliedBonus !== 0 && cosmicOmenDetail) bonusDetailParts.push(cosmicOmenDetail);
    if (pendingSkillCheckAppliedBonus > 0 && pendingSkillCheckDetail) bonusDetailParts.push(pendingSkillCheckDetail);
    if (baneAttackPenalty < 0) bonusDetailParts.push(`${baneAttackPenalty} [${baneDisplayLabel}]`);
    if (blessAttackBonus > 0) bonusDetailParts.push('+' + blessAttackBonus + ' [Bless]');
    const finalBonusDetail = bonusDetailParts.length > 0 ? '(' + bonusDetailParts.join(', ') + ')' : undefined;

    // Resilient Sphere — block all attacks when attacker or target is enclosed
    let isAutoMiss = context?.isAutoMiss === true;
    if (!isAutoMiss && context?.targetName && context?.attackerName) {
        const rsAttackerSphere = isResilientSphereActive(context.attackerName, campaignName);
        const rsTargetSphere = isResilientSphereActive(context.targetName, campaignName);
        if (rsAttackerSphere || rsTargetSphere) {
            isAutoMiss = true;
            if (!context?.notice) {
                context.notice = 'Attack blocked by Resilient Sphere — nothing can pass through the barrier.';
            }
        }
    }

    const coverAcBonus = context?.coverAcBonus || 0;

    return {
        r1, r2,
        effectiveD20Roll,
        effectiveBonus,
        forcedMode,
        luckyRerolled,
        luckyRerollValue,
        cosmicOmenAppliedBonus,
        cosmicOmenDetail,
        pendingSkillCheckAppliedBonus,
        pendingSkillCheckDetail,
        rayStrDisadvantage,
        sacredWeaponBonus,
        baneAttackPenalty,
        baneAttackRoll,
        baneDisplayLabel,
        blessAttackBonus,
        blessAttackRoll,
        sunderingBlowBonus,
        finalBonusDetail,
        isAutoMiss,
        coverAcBonus,
        starryDragonFloor,
        effectiveD20,
    };
}
