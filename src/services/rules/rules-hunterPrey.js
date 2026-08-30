/**
 * Add Hunter's Prey bonus action attack marker if the player has the Hunter class.
 * This is an inert marker — CharBonusActions renders it conditionally after a
 * melee weapon attack hit, overriding its values with the weapon actually used.
 */
export function addHunterPreyAttack(playerStats) {
    const passivesForHunter = playerStats.automation?.passives;
    if (!Array.isArray(passivesForHunter)) {
        console.error('rules: expected passives to be an array for', playerStats.name);
        throw new Error('Missing array: passives for ' + playerStats.name);
    }
    const hasHunterPrey = passivesForHunter.some(
       p => p.type === 'hunter_prey' && p.name === "Hunter's Prey"
   );
    if (hasHunterPrey) {
        const dex = playerStats.abilities.find(a => a.name === 'Dexterity');
        const str = playerStats.abilities.find(a => a.name === 'Strength');
        const abilityBonus = Math.max(str?.bonus || 0, dex?.bonus || 0);
        const abilityName = str?.bonus >= dex?.bonus ? 'Strength' : 'Dexterity';
        const prof = playerStats.proficiency || 0;
        playerStats.attacks.push({
            name: "Horde Breaker",
            damage: `1d4`,
            damageType: 'Slashing',
            hitBonus: abilityBonus + prof,
            hitBonusFormula: `To Hit Bonus = ${abilityName} Bonus (${abilityBonus}) + Proficiency (${prof})`,
            range: 5,
            type: 'Bonus Action',
            weaponType: 'melee',
            isHordeBreaker: true,
        });
    }
}
