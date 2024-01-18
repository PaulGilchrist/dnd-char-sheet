/* eslint-disable react/prop-types */
import React from 'react'
import './char-summary.css'

import storage from '../../services/local-storage'

import HiddenInput from './hidden-input'

function CharSummary({ allEquipment, characterClass, playerStats }) {
    const [currentHitPoints, setCurrentHitPoints] = React.useState(0);
    const [showInputCurrentHitPoints, setShowInputCurrentHitPoints] = React.useState(false);

    const dexterityBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Dexterity').value - 10) / 2);
    const constitutionBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Constitution').value - 10) / 2);
    const wisdomBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Wisdom').value - 10) / 2);

    // Calculations - Character Summary 
    const initiative = dexterityBonus;
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    // Full hit dice at level 1, half hit dice +1 at each level after level 1, constitution bonus add for each level
    const hitDice = characterClass.hit_die;
    const hitPoints = hitDice + ((hitDice / 2 + 1) * (playerStats.level - 1)) + (constitutionBonus * playerStats.level);

    React.useEffect(() => {
        const hitPoints = hitDice + ((hitDice / 2 + 1) * (playerStats.level - 1)) + (constitutionBonus * playerStats.level);
        let value = storage.get(playerStats.name, 'currentHitPoints');
        setCurrentHitPoints(value ? value : hitPoints);
    }, [characterClass, playerStats]);

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

    const handleValueChangeCurrentHitPoints = (value) => {
        storage.set(playerStats.name, 'currentHitPoints', value);
        setCurrentHitPoints(value);
    };
    const handleInputToggleCurrentHitPoints = () => {
        setShowInputCurrentHitPoints((showInputCurrentHitPoints) => !showInputCurrentHitPoints);
    };

    return (
        <div>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race} {playerStats.class} ({playerStats.subClass ? `${playerStats.subClass.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <b>Armor Class: </b>{armorClass}<br />
            <div className="clickable" onClick={handleInputToggleCurrentHitPoints} onKeyDown={handleInputToggleCurrentHitPoints} tabIndex={0}><b>Hit Points: </b>{hitPoints}/<HiddenInput handleInputToggle={handleInputToggleCurrentHitPoints} handleValueChange={(value) => handleValueChangeCurrentHitPoints(value)} showInput={showInputCurrentHitPoints} value={currentHitPoints}></HiddenInput> <span className="text-muted">(max/current)</span></div>
            <b>Proficiency: </b>+{proficiency}<br />
            <b>Initiative: </b>+{initiative}<br />
            <b>Speed: </b>{playerStats.speed} ft.<br />
        </div>           
    )
}

export default CharSummary
