/* eslint-disable react/prop-types */
import React from 'react'
import './char-summary.css'

import storage from '../../../services/local-storage'
import utils from '../../../services/utils'
import CharGold from './char-gold'
import CharHitPoints from './char-hit-points'
import CharMonkKi from './char-monk-ki'

function CharSummary({ allEquipment, characterClass, playerStats }) {
    const [hasInspiration, setHasInspiration] = React.useState(false);
    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'hasInspiration');
        setHasInspiration(value ? value : false);
    }, [playerStats]);
    const dexterity = utils.getAbility(playerStats, 'Dexterity');
    const wisdom = utils.getAbility(playerStats, 'Wisdom');
    // Calculations - Character Summary 
    const initiative = dexterity.bonus;
    const proficiency = utils.getProficiency(playerStats);
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
        addedBonus += wisdom.bonus;
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
            let armorBonus = dexterity.bonus;
            if(armor.armor_class.max_bonus) {
                armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
            }
            armorClass = armor.armor_class.base + armorBonus + addedBonus + magicBonus;
        }
    } else {
        armorClass = 10 + dexterity.bonus + addedBonus// Unarmored
    }
    // Check for an equipped magical shield, and if found increase AC
    let shield = playerStats.inventory.equipped.find(item => item.substring(3) === 'Shield');
    if(shield) {
        armorClass += 2 + Number(shield.charAt(1));
    } else if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
        // Non-magical shield
        armorClass += 2;
    }

    const handleToggleInspiraction = () => {
        const newValue = !hasInspiration;
        storage.set(playerStats.name, 'hasInspiration', newValue);
        setHasInspiration(newValue);
    }

    return (
        <div>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race} {playerStats.class} ({playerStats.subClass ? `${playerStats.subClass.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <div className='summaryGrid'>
                <div>
                    <b>Armor Class: </b>{armorClass}<br/>
                    <CharHitPoints characterClass={characterClass} playerStats={playerStats}></CharHitPoints>
                    <b>Speed: </b>{playerStats.speed} ft.<br/>
                </div>
                <div>
                    <b>Proficiency: </b>+{proficiency}<br/>
                    <b>Initiative: </b>+{initiative}<br/>
                    <CharGold playerStats={playerStats}></CharGold>
                </div>
                <div>
                    <b>Inspiration: </b><input type="checkbox" checked={hasInspiration} onChange={handleToggleInspiraction}/><br/>
                    {playerStats.class == 'Monk' && playerStats.level > 2 && <CharMonkKi playerStats={playerStats}></CharMonkKi>}
                </div>
            </div>
        </div>           
    )
}

export default CharSummary
