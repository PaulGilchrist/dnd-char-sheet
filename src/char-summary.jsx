/* eslint-disable react/prop-types */
import './char-summary.css'

function CharSummary({ allEquipment, characterClass, playerStats }) {
    const dexterityBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Dexterity').value - 10) / 2);
    const constitutionBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Constitution').value - 10) / 2);
    const wisdomBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Wisdom').value - 10) / 2);

    // Calculations - Character Summary 
    const initiative = dexterityBonus;
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    // Full hit dice at level 1, half hit dice +1 at each level after level 1, constitution bonus add for each level
    const hitDice = characterClass.hit_die;
    const hitPoints = hitDice + ((hitDice / 2 + 1) * (playerStats.level - 1)) + (constitutionBonus * playerStats.level);
    // Find armor in the character's equipment and calculate Armor Class
    let armorName = playerStats.inventory.equipped.find(itemName => {
        let item = allEquipment.find((item) => item.name === itemName);
        if(item) {
            return item.equipment_category === 'Armor';
        }
        return false;
    });
    let addedBonus = 0;
    if(playerStats.class === 'Monk') {
        addedBonus += wisdomBonus;
    } 
    if(playerStats.fightingStyle === 'Defense') {
        addedBonus += 1;
    }
    let armorClass;
    if(armorName) {
        let armor = allEquipment.find((item) => item.name === armorName);
        armorClass = armor.armor_class.base + addedBonus;
        if(armor.armor_class.dex_bonus) {
            let armorBonus = dexterityBonus;
            if(armor.armor_class.max_bonus) {
                armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
            }
            armorClass = armor.armor_class.base + armorBonus + addedBonus;
        }
    } else {
        armorClass = 10 + dexterityBonus + addedBonus // Unarmored
    }
    // Check for an equipped shield, and if found increase AC
    if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
        armorClass += 2;
    }
    
    return (
        <div>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race} {playerStats.class} ({playerStats.subClass ? `${playerStats.subClass.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <b>Armor Class: </b>{armorClass}<br />
            <b>Hit Points: </b>{hitPoints}<br />
            <b>Proficiency: </b>+{proficiency}<br />
            <b>Initiative: </b>+{initiative}<br />
            <b>Speed: </b>{playerStats.speed} ft.<br />
        </div>           
    )
}

export default CharSummary
