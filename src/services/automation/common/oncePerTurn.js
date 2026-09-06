import { getCombatContext } from '../../rules/combat/damageUtils.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

/**
 * Centralized once-per-turn check for combat features.
 *
 * D&D 5e "once per turn" / "once per round" mean the same thing:
 * usable again after this character's next turn starts.
 *
 * We store the round number + holder name when the feature is used.
 * The feature becomes available again when round > storedRound — i.e., a
 * new round has started (the earliest point the holder's next turn can
 * begin, matching the round-wrap latch convention in navigationHandlers).
 *
 * FT-082: the cs.activeCreatureName mirror goes stale mid-combat (pitfall
 * 30 / FT-074 family), so re-arm must NEVER depend on it. The used-flag is
 * stored under the holder's own store (playerStats.name), which already
 * scopes the latch to the holder — the mirror comparison only ever caused
 * false refusals on the holder's own next turn.
 *
 * IMPORTANT: Always pass characterName (not null) as the 3rd argument so
 * checkOncePerTurn reads from the same store that markOncePerTurn writes to.
 *
 * @param {string} featureName — for display in popup messages
 * @param {string} usedKey — runtime key (e.g. '_CunningStrike_usedRound')
 * @param {string} characterName — the character whose store to read from
 * @param {string} campaignName
 * @returns {Promise<object|null>} null if usable, popup response if already used
 */
export async function checkOncePerTurn(featureName, usedKey, characterName, campaignName) {
    const cs = await getCombatContext(campaignName);
    const currentRound = cs?.round || 1;
    const stored = getRuntimeValue(characterName, usedKey);

    if (!stored) return null;

    // Legacy format: stored is just a number (old round-only tracking)
    if (typeof stored === 'number') {
        if (stored === currentRound) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: featureName,
                    description: `${featureName} can only be used once per turn.`,
                },
            };
        }
        return null;
    }

    // New format: stored is { round, activeCreature }. FT-082: availability
    // is round-scoped off the holder's own store — never off the (stale)
    // cs.activeCreatureName mirror.
    const storedRound = stored?.round;

    if (currentRound > storedRound) {
        return null;
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: featureName,
            description: `${featureName} can only be used once per turn.`,
        },
    };
}

/**
 * Check once-per-turn AND skip flag for features that support user cancellation.
 *
 * @param {string} featureName
 * @param {string} usedKey
 * @param {string} skipKey
 * @param {object} playerStats
 * @param {string} campaignName
 * @returns {Promise<object|null>}
 */
export async function checkOncePerTurnWithSkip(featureName, usedKey, skipKey, playerStats, campaignName) {
    const cs = await getCombatContext(campaignName);
    const currentRound = cs?.round || 1;
    const stored = getRuntimeValue(playerStats.name, usedKey, campaignName);
    const skipped = getRuntimeValue(playerStats.name, skipKey, campaignName);

    if (stored) {
        // Legacy format: stored is just a number
        if (typeof stored === 'number') {
            if (stored === currentRound) {
                return {
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: featureName,
                        description: `${featureName} can only be used once per turn.`,
                    },
                };
            }
        } else {
            // New format: stored is { round, activeCreature }. FT-082:
            // round-scoped re-arm off the holder's store only — the
            // cs.activeCreatureName mirror is stale mid-combat (pitfall 30).
            const storedRound = stored?.round;
            if (!(currentRound > storedRound)) {
                return {
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: featureName,
                        description: `${featureName} can only be used once per turn.`,
                    },
                };
            }
        }
    }

    if (skipped) {
        // Legacy format: skipped is just a number
        if (typeof skipped === 'number') {
            if (skipped === currentRound) {
                return {
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: featureName,
                        description: `${featureName} was not used this turn.`,
                    },
                };
            }
        } else {
            // New format: skipped is { round, activeCreature } — round-scoped.
            const skippedRound = skipped?.round;
            if (!(currentRound > skippedRound)) {
                return {
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: featureName,
                        description: `${featureName} was not used this turn.`,
                    },
                };
            }
        }
    }

    return null;
}

/**
 * Mark a feature as used. Stores the current round + the HOLDER's name.
 *
 * FT-082 / FT-074 (pitfall 30): never stamp cs.activeCreatureName from the
 * combatSummary mirror — it goes stale mid-combat and corrupts re-arm.
 *
 * @param {string} featureName
 * @param {string} usedKey
 * @param {object} playerStats
 * @param {string} campaignName
 * @returns {Promise<object>} the stored { round, activeCreature }
 */
export async function markOncePerTurn(featureName, usedKey, playerStats, campaignName) {
    const cs = await getCombatContext(campaignName);
    const currentRound = cs?.round || 1;
    const stored = { round: currentRound, activeCreature: playerStats.name };
    await setRuntimeValue(playerStats.name, usedKey, stored, campaignName);
    return stored;
}

/**
 * Set the skip flag for features that support user cancellation.
 * Stamps the holder's name (FT-074 recipe), never the cs mirror.
 */
export async function setSkipFlag(skipKey, playerStats, campaignName) {
    const cs = await getCombatContext(campaignName);
    const currentRound = cs?.round || 1;
    const stored = { round: currentRound, activeCreature: playerStats.name };
    await setRuntimeValue(playerStats.name, skipKey, stored, campaignName);
    return stored;
}

/**
 * Clear the skip flag after a feature is applied.
 */
export async function clearSkipFlag(skipKey, playerStats, campaignName) {
    await setRuntimeValue(playerStats.name, skipKey, null, campaignName);
}
