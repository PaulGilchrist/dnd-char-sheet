import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';
import { getDistanceFeet } from '../../rules/combat/rangeValidation.js';
import { isDistanceInRange } from '../../rules/combat/rangeCheck.js';

export function applyWardingBond(creature, combatSummary, campaignName, wardDamage) {
    const targetBondSource = getRuntimeValue(creature.name, 'activeBuffs', campaignName);
    const targetActiveBuffs = Array.isArray(targetBondSource) ? targetBondSource : [];
    const wardingBondBuff = targetActiveBuffs.find(b => b.effect === 'warding_bond');
    if (wardingBondBuff && wardingBondBuff.sourceCharacter && wardingBondBuff.sourceCharacter !== creature.name) {
        const casterName = wardingBondBuff.sourceCharacter;
        const casterCreature = combatSummary.creatures.find(c => c.name === casterName);
        const targetCreature = combatSummary.creatures.find(c => c.name === creature.name);
        const distance = casterCreature && targetCreature ? getDistanceFeet(casterCreature.position, targetCreature.position) : null;
        if (isDistanceInRange(distance, 60)) {
            const casterIsPlayer = !casterCreature || casterCreature.type === 'player' || typeof casterCreature.currentHp === 'undefined';
            const casterHp = casterIsPlayer
                ? getRuntimeValue(casterName, 'currentHitPoints', campaignName)
                : casterCreature.currentHp;
            if (casterHp > 0) {
                const sharedDamage = wardDamage;
                const oldHp = casterHp;
                const newHp = Math.max(0, casterHp - sharedDamage);
                if (casterIsPlayer) {
                    setRuntimeValue(casterName, 'currentHitPoints', newHp, campaignName);
                } else {
                    casterCreature.currentHp = newHp;
                }
                const casterMaxHp = casterIsPlayer
                    ? getRuntimeValue(casterName, 'maxHitPoints', campaignName)
                    : (casterCreature.maxHp || 10);
                const concentration = casterIsPlayer
                    ? getRuntimeValue(casterName, 'concentration', campaignName)
                    : casterCreature.concentration;
                addEntry(campaignName, {
                    type: 'hp_change',
                    targetName: casterName,
                    delta: -(oldHp - newHp),
                    currentHp: newHp,
                    maxHp: casterMaxHp,
                    isHealing: false,
                    isUnconscious: newHp <= 0,
                    abilityName: 'Warding Bond',
                }).catch((e) => { console.error("[wardingBond] Error:", e); });
                if (concentration && sharedDamage > 0) {
                    concentration.dc = Math.max(10, Math.floor(sharedDamage / 2));
                }
            }
        }
    }
}
