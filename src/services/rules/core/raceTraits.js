/**
 * Detect Powerful Build trait and set sizeMultiplier on playerStats.
 * Powerful Build: "count as one size larger when determining your carrying capacity."
 * One size larger = 2x carrying capacity.
 * Also grants advantage on ability checks to end the grappled condition.
 */
export function applyPowerfulBuild(playerStats) {
    const traits = playerStats.race?.traits;
    if (!Array.isArray(traits)) {
        console.error('rules: expected race.traits to be an array for', playerStats.name);
        throw new Error('Missing array: race.traits for ' + playerStats.name);
    }
    const hasPowerfulBuild = traits.some(t => t.name === 'Powerful Build');
    if (hasPowerfulBuild) {
        playerStats.sizeMultiplier = 2;
        playerStats.hasPowerfulBuild = true;
    }
    return playerStats;
}

/**
 * Detect Halfling Nimbleness trait and set canMoveThroughCreatureSpace on playerStats.
 * Halfling Nimbleness: "You can move through the space of any creature that is a size larger than you,
 * but you can't stop in the same space."
 */
export function applyHalflingNimbleness(playerStats) {
    const traits = playerStats.race?.traits;
    if (!Array.isArray(traits)) {
        console.error('rules: expected race.traits to be an array for', playerStats.name);
        throw new Error('Missing array: race.traits for ' + playerStats.name);
    }
    const hasHalflingNimbleness = traits.some(t => t.name === 'Halfling Nimbleness');
    if (hasHalflingNimbleness) {
        playerStats.canMoveThroughCreatureSpace = true;
    }
    return playerStats;
}
