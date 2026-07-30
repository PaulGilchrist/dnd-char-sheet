import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

/**
 * Centralized temp HP setter. Enforces the rule: new temp HP replaces existing only if larger,
 * otherwise keeps the existing value. Never adds to existing temp HP.
 *
 * @param {string} creatureName - Name of the creature
 * @param {number} newAmount - The new temp HP amount (will be clamped to >= 0)
 * @param {string} campaignName - Campaign name
 * @returns {number} The actual temp HP value that was set (max of existing and new)
 */
export function setTempHp(creatureName, newAmount, campaignName) {
    const existingTempHp = Number(getRuntimeValue(creatureName, 'tempHp') || 0);
    const finalAmount = Math.max(0, Math.max(existingTempHp, newAmount));
    setRuntimeValue(creatureName, 'tempHp', finalAmount, campaignName);
    return finalAmount;
}

/**
 * Set temp HP on a creature using a non-standard runtime key (e.g. companions).
 * @param {string} creatureName - Name of the creature
 * @param {string} key - The runtime store key (not 'tempHp')
 * @param {number} newAmount - The new temp HP amount
 * @param {string} campaignName - Campaign name
 * @returns {number} The actual temp HP value that was set
 */
export function setTempHpOnKey(creatureName, key, newAmount, campaignName) {
    const existingTempHp = Number(getRuntimeValue(creatureName, key) || 0);
    const finalAmount = Math.max(0, Math.max(existingTempHp, newAmount));
    setRuntimeValue(creatureName, key, finalAmount, campaignName);
    return finalAmount;
}
