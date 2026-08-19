/**
 * Validate a Cunning Strike option before applying it.
 * Checks prerequisites (e.g., Poisoner's Kit) and size limits.
 */
export function validateCunningStrikeOption(option, targetName, playerStats, getCombatContextSync) {
    // Check tool/item requirements (e.g., Poisoner's Kit for Poison option)
    if (option.requires) {
        const toolProficiencies = playerStats?.toolProficiencies || [];
        const hasProficiency = toolProficiencies.some(p =>
            p.toLowerCase().includes(option.requires.toLowerCase())
        );
        const inventory = playerStats?.inventory || {};
        const allItems = [
            ...(inventory.equipped || []),
            ...(inventory.backpack || []),
        ];
        const hasItem = allItems.some(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            return itemName && itemName.toLowerCase().includes(option.requires.toLowerCase());
        });
        if (!hasProficiency && !hasItem) {
            return {
                valid: false,
                reason: `Requires ${option.requires} which the character does not have.`,
            };
        }
    }

    // Check size limit for Trip (Large or smaller)
    if (option.sizeLimit === 'large_or_smaller' && targetName) {
        const combatContext = getCombatContextSync(targetName);
        if (combatContext) {
            const sizeOrder = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
            const targetSizeIndex = sizeOrder.indexOf(combatContext.size);
            if (targetSizeIndex !== -1 && targetSizeIndex > sizeOrder.indexOf('Large')) {
                return {
                    valid: false,
                    reason: `Target is ${combatContext.size} (too large for Trip — only Large or smaller affected).`,
                };
            }
        }
        // If we can't determine size from combat context, allow it (default assumption: target is valid size)
    }

    // Check size limit for Charger push (one size larger than player)
    if (option.sizeLimit === 'one_size_larger' && targetName) {
        const playerSize = playerStats.size || 'Medium';
        const combatContext = getCombatContextSync(targetName);
        if (combatContext) {
            const sizeOrder = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
            const playerSizeIndex = sizeOrder.indexOf(playerSize);
            const targetSizeIndex = sizeOrder.indexOf(combatContext.size);
            if (playerSizeIndex !== -1 && targetSizeIndex !== -1) {
                const maxAllowedIndex = playerSizeIndex + 1;
                if (targetSizeIndex > maxAllowedIndex) {
                    return {
                        valid: false,
                        reason: `Target is ${combatContext.size} (too large for Charger push — only up to ${sizeOrder[maxAllowedIndex]} allowed when player is ${playerSize}).`,
                    };
                }
            }
        }
    }

    return { valid: true };
}

/**
 * Synchronous helper to get target info from combat context.
 * Removed localStorage dependency — now returns null so size validations
 * pass through (default assumption: target is valid size).
 * Accepts an optional `overrideContext` parameter for testing purposes.
 */
let _getCombatContextSyncOverride = null;

export function getCombatContextSync(targetName, overrideContext) {
    if (overrideContext !== undefined) return overrideContext;
    if (_getCombatContextSyncOverride !== null) return _getCombatContextSyncOverride;
    // Combat context is now managed via server/SSE only.
    // Size validations that need this data should use the combatSummary
    // from the initiative component state.
    return null;
}

export function setGetCombatContextSyncOverride(val) {
    _getCombatContextSyncOverride = val;
}

export function clearGetCombatContextSyncOverride() {
    _getCombatContextSyncOverride = null;
}

/**
 * Apply Cunning Strike cost by deducting Sneak Attack dice.
 * The cost is specified as "Nd6" meaning N d6 dice to forgo.
 * We track this in runtime state so the damage computation can account for it.
 */
export async function applyCunningStrikeCost(playerStats, campaignName, costD6, getRuntimeValue, setRuntimeValue, addEntry) {
    // Track the Cunning Strike cost for this turn
    const key = '_cunningStrikeCostUsed';
    const currentCost = Number(getRuntimeValue(playerStats.name, key, campaignName) ?? 0);
    await setRuntimeValue(playerStats.name, key, currentCost + costD6, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: 'Cunning Strike',
        description: `Forgoing ${costD6}d6 Sneak Attack damage dice for Cunning Strike cost.`,
    }).catch((e) => { console.error("[cunningStrikeUtils:log-error]", e); });
}
