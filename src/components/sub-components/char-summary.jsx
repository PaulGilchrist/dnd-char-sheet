/* eslint-disable react/prop-types */
import './char-summary.css'

import CharGold from './char-gold'
import CharHitPoints from './char-hit-points'

function CharSummary({ allEquipment, characterClass, playerStats }) {
    const dexterityBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Dexterity').value - 10) / 2);
    const wisdomBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Wisdom').value - 10) / 2);

    // Calculations - Character Summary 
    const initiative = dexterityBonus;
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    // Find armor in the character's equipment and calculate Armor Class
    let armorName = playerStats.inventory.equipped.find(itemName => {
        // Does this item have a magic bonus?
        if(itemName.charAt(0) === "+") {
            itemName = itemName.substring(3);
        }        
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
        // Does this item have a magic bonus?
        let magicBonus = 0;
        if(armorName.charAt(0) === '+') {
            magicBonus = Number(armorName.charAt(1));
            armorName = armorName.substring(3);
        }
        let armor = allEquipment.find((item) => item.name === armorName);
        armorClass = armor.armor_class.base + addedBonus + magicBonus;
        if(armor.armor_class.dex_bonus) {
            let armorBonus = dexterityBonus;
            if(armor.armor_class.max_bonus) {
                armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
            }
            armorClass = armor.armor_class.base + armorBonus + addedBonus + magicBonus;
        }
    } else {
        armorClass = 10 + dexterityBonus + addedBonus// Unarmored
    }
    // Check for an equipped magical shield, and if found increase AC
    let shield = playerStats.inventory.equipped.find(item => item.substring(3) === 'Shield');
    if(shield) {
        armorClass += 2 + Number(shield.charAt(1));
    } else if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
        // Non-magical shield
        armorClass += 2;
    }

    return (
        <div>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race} {playerStats.class} ({playerStats.subClass ? `${playerStats.subClass.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <div className='summaryGrid'>
                <div><b>Armor Class: </b>{armorClass}</div>
                <div><b>Proficiency: </b>+{proficiency}</div>
                <CharHitPoints characterClass={characterClass} playerStats={playerStats}></CharHitPoints>
                <div><b>Initiative: </b>+{initiative}</div>
                <div><b>Speed: </b>{playerStats.speed} ft.</div>
                <CharGold playerStats={playerStats}></CharGold>
            </div>
        </div>           
    )
}

export default CharSummary
