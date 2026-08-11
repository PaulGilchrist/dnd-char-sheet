import { getElfisLineageSelection } from '../../automation/handlers/class-other/elfishLineageHandler.js';

/**
 * Apply Elfish Lineage Wood Elf speed bonus.
 * Adds 5 ft. to base speed when Wood Elf lineage is selected.
 */
export function applyElfisLineageSpeed(playerStats, playerSummary) {
    const lineage = getElfisLineageSelection(playerStats, playerSummary?.campaignName);
    if (lineage === 'Wood Elf' && playerStats.speed != null) {
        return playerStats.speed + 5;
    }
    return playerStats.speed;
}

/**
 * Apply speed increase bonuses from passive_buff features (e.g., Boon of Speed, Speedy feat).
 */
export function applySpeedIncreasePassives(playerStats) {
    const passives = playerStats.automation?.passives;
    if (!Array.isArray(passives)) {
        console.error('rules: expected passives to be an array for', playerStats.name);
        throw new Error('Missing array: passives for ' + playerStats.name);
    }
    let bonus = 0;
    const equippedItems = playerStats.inventory?.equipped || [];
    const allEquipment = playerStats.equipment || [];
    let isWearingHeavyArmor = false;
    for (const itemName of equippedItems) {
        const parsedName = itemName.includes('(') ? itemName.substring(0, itemName.indexOf('(')).trim() : itemName;
        const item = allEquipment.find(eq => eq.name === parsedName || eq.name === itemName);
        if (item && item.armor_category === 'Heavy') {
            isWearingHeavyArmor = true;
            break;
        }
    }
    const isWearingArmor = allEquipment.some(eq => equippedItems.includes(eq.name) && eq.equipment_category === 'Armor');
    const isWieldingShield = equippedItems.some(name => {
        const parsedName = name.includes('(') ? name.substring(0, name.indexOf('(')).trim() : name;
        return parsedName === 'Shield';
    });
    for (const passive of passives) {
        if (passive.type === 'passive_buff' && passive.effect === 'speed_increase' && passive.bonusExpression) {
            const parsed = parseInt(passive.bonusExpression, 10);
            if (!isNaN(parsed)) bonus += parsed;
        }
        if (passive.type === 'passive_buff' && passive.effect === 'speed_bonus' && passive.bonusExpression) {
            const parsed = parseInt(passive.bonusExpression, 10);
            if (isNaN(parsed)) continue;
            if (passive.condition === 'no_heavy_armor') {
                if (!isWearingHeavyArmor) {
                    bonus += parsed;
                }
            } else if (passive.condition === 'no_armor_no_shield') {
                if (!isWearingArmor && !isWieldingShield) {
                    bonus += parsed;
                }
            } else {
                bonus += parsed;
            }
        }
    }
    if (bonus > 0 && playerStats.speed != null) {
        return playerStats.speed + bonus;
    }
    return playerStats.speed;
}
