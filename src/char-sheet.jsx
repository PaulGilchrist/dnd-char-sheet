/* eslint-disable react/prop-types */
import React from 'react'
import './char-sheet.css'

import { actions } from './data/actions.js';
import { passiveSkills } from './data/passive-skills.js';
import { skills } from './data/skills.js';

function CharSheet({ allClasses, allEquipment, allSpells, playerStats }) {
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    // Get abilityProficiencies and hitDice from class
    const characterClass = allClasses.find((characterClass) => characterClass.name === playerStats.class);
    playerStats.abilityProficiencies = characterClass.saving_throws.map((savingThrow) => {
        switch (savingThrow) {
            case 'STR': return 'Strength';
            case 'DEX': return 'Dexterity';
            case 'CON': return 'Constitution';
            case 'INT': return 'Intelligence';
            case 'WIS': return 'Wisdom';
            case 'CHA': return 'Charisma';
        }
    });
    playerStats.hitDice = characterClass.hit_die;
    // Calculated additional stats
    playerStats.proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    playerStats.abilities = playerStats.abilities.map((ability) => {
        ability.proficient = playerStats.abilityProficiencies.includes(ability.name);
        ability.bonus = Math.floor((ability.value - 10) / 2);
        ability.save = ability.proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
        ability.skills = skills.filter(skill => skill.ability === ability.name);
        ability.skills = ability.skills.map((skill) => {
            skill.proficient = playerStats.skillProficiencies.includes(skill.name);
            skill.bonus = skill.proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
            if (passiveSkills.includes(skill.name)) {
                // Add skill based senses
                const newSense = {
                    name: `passive ${skill.name}`,
                    value: 10 + skill.bonus
                }
                if (!playerStats.senses.find((sense) => sense.name === newSense.name)) {
                    playerStats.senses.push(newSense);
                }
            }
            return skill
        });
        return ability
    });
    const strengthBonus = playerStats.abilities.find((ability) => ability.name === 'Strength').bonus;
    const dexterityBonus = playerStats.abilities.find((ability) => ability.name === 'Dexterity').bonus;
    const wisdomBonus = playerStats.abilities.find((ability) => ability.name === 'Wisdom').bonus;
 
    playerStats.initiative = dexterityBonus;
    playerStats.hitPoints = 31;
    const constitutionBonus = playerStats.abilities.find((ability) => ability.name === 'Constitution').bonus;
    // Full hit dice at level 1, half hit dice +1 at each level after level 1, constitution bonus add for each level
    playerStats.hitPoints = playerStats.hitDice + ((playerStats.hitDice / 2 + 1) * (playerStats.level - 1)) + (constitutionBonus * playerStats.level);
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
    if (armorName) {
        let armor = allEquipment.find((item) => item.name === armorName);
        playerStats.armorClass = armor.armor_class.base + addedBonus;
        if(armor.armor_class.dex_bonus) {
            let armorBonus = dexterityBonus;
            if(armor.armor_class.max_bonus) {
                armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
            }
            playerStats.armorClass = armor.armor_class.base + armorBonus + addedBonus;
        }
    } else {
        playerStats.armorClass = 10 + dexterityBonus + addedBonus // Unarmored
    }
    // Check for an equipped shield, and if found increase AC
    if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
        playerStats.armorClass = playerStats.armorClass + 2;
    }
    playerStats.attacks = [];
    // Find ranged weapon in the character's equipment and add it to attacks
    let rangedWeaponName = playerStats.inventory.equipped.find(itemName => {
        let item = allEquipment.find((item) => item.name === itemName);
        if(item) {
            return item.equipment_category === 'Weapon' && item.weapon_range === 'Ranged';
        }
        return false;
    });
    if (rangedWeaponName) {
        let rangedWeapon = allEquipment.find((item) => item.name === rangedWeaponName);
        let toHitBonus = dexterityBonus + playerStats.proficiency;
        if(playerStats.fightingStyle === 'Archery') {
            toHitBonus = dexterityBonus + playerStats.proficiency + 2;
        }
        playerStats.attacks.push({
            "name": rangedWeapon.name,
            "damage": `${rangedWeapon.damage.damage_dice}+${dexterityBonus}`,
            "damageType": rangedWeapon.damage.damage_type,
            "hitBonus": toHitBonus,
            "range": rangedWeapon.range.normal,
            "type": "Action"
        });
    }
    // Find main hand weapon in the character's equipment and add it to attacks
    let meleeWeaponNames = playerStats.inventory.equipped.filter(itemName => {
        let item = allEquipment.find((item) => item.name === itemName);
        if(item) {
            return item.equipment_category === 'Weapon' && item.weapon_range === 'Melee';
        }
        return false;
    });
    if (meleeWeaponNames) {
        let mainHandWeapon = allEquipment.find((item) => item.name === meleeWeaponNames[0]);
        let bonus = Math.max(strengthBonus, dexterityBonus); // Assumes using finesse if dex build
        let damage = mainHandWeapon.damage.damage_dice;
        if(playerStats.fightingStyle === 'Dueling' && meleeWeaponNames.length == 1) { // No dual wielding
            damage = mainHandWeapon.damage.damage_dice + 2;
        }
        playerStats.attacks.push({
            "name": mainHandWeapon.name,
            "damage": `${damage}+${bonus}`,
            "damageType": mainHandWeapon.damage.damage_type,
            "hitBonus": bonus + playerStats.proficiency, 
            "range": mainHandWeapon.range.normal,
            "type": "Action"
        });
        if (meleeWeaponNames.length > 1) {
            // There is also an offhand weapon
            let offHandWeapon = allEquipment.find((item) => item.name === meleeWeaponNames[1]);
            let damage = offHandWeapon.damage.damage_dice;
            if(playerStats.fightingStyle === 'Two-Weapon Fighting') {
                damage = `${offHandWeapon.damage.damage_dice}+${bonus}`;
            }
            playerStats.attacks.push({
                "name": offHandWeapon.name,
                "damage": damage,
                "damageType": offHandWeapon.damage.damage_type,
                "hitBonus": bonus + playerStats.proficiency,
                "range": offHandWeapon.range.normal,
                "type": "Bonus Action"
            });
        }
    }
    // If we have a Monk, then their hands are a weapon
    if(playerStats.class === 'Monk') {
        playerStats.attacks.push({
            "name": 'Unarmed Strike',
            "damage": `1d4+${dexterityBonus}`,
            "damageType": 'Bludgeoning',
            "hitBonus": dexterityBonus + playerStats.proficiency, 
            "range": 5,
            "type": "Action"
        });
        playerStats.attacks.push({
            "name": 'Unarmed Strike',
            "damage": `1d4+${dexterityBonus}`,
            "damageType": 'Bludgeoning',
            "hitBonus": dexterityBonus + playerStats.proficiency, 
            "range": 5,
            "type": "Bonus Action"
        });
    }
    // Add spell details
    if(playerStats.spells && playerStats.spells.length > 0) {
        playerStats.spells = playerStats.spells.map(spellSummary => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spellSummary.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spellSummary.prepared};
            }
            return spellSummary;
        });
        // Find spells that are actions, damage based and prepared and add them to attacks
        let spells = playerStats.spells.filter(spell => spell.damage && spell.prepared);
        spells.forEach(spell => {
            if(!playerStats.attacks.find((attack) => attack.name === spell.name)) {
                let damage = ''
                if(spell.damage.damage_at_slot_level) {
                    damage = spell.damage.damage_at_slot_level[Object.keys(spell.damage.damage_at_slot_level)[0]];
                } else if (spell.damage.damage_at_character_level) {
                    damage = spell.damage.damage_at_character_level[Object.keys(spell.damage.damage_at_character_level)[0]];
                }
                playerStats.attacks.push({
                    "name": spell.name,
                    "damage": damage,
                    "damageType": spell.damage.damage_type,
                    "hitBonus": playerStats.abilities.find((ability) => ability.name === characterClass.spell_casting_ability).bonus,
                    "range": spell.range,
                    "type": spell.casting_time === "1 action" ? "Action" : "Bonus Action"
                });
            }
        });
        // Find spells that are reactions and prepared and add them to attacks
        spells = playerStats.spells.filter(spell => spell.casting_time === '1 reaction' && spell.prepared);
        spells.forEach(spell => {
            if(!playerStats.reactions.find((reaction) => reaction.name === spell.name)) {
                playerStats.reactions.push({
                    "name": spell.name,
                    "description": spell.desc
                });
            }
        });
    }
    // Add fighting stype special actions
    if(playerStats.fightingStyle === 'Great Weapon Fighting' && !playerStats.specialActions.find((specialAction) => specialAction.name === 'Great Weapon Fighting')) {
        playerStats.specialActions.push({ "name": "Great Weapon Fighting", "description": "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit." });
    } else if(playerStats.fightingStyle === 'Protection' && !playerStats.specialActions.find((specialAction) => specialAction.name === 'Protection')) {
        playerStats.specialActions.push({ "name": "Protection", "description": "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield." });
    }
    // Add base reactions to reaction list
    if (!playerStats.reactions.find((reaction) => reaction.name === 'Opportunity Attack')) {
        playerStats.reactions.push({ "name": "Opportunity Attack", "description": "Can attack creature that moves out of your reach" });
    }
    
    return (
        <div className='root'>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race} {playerStats.class} ({playerStats.subClass ? `${playerStats.subClass.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <b>Armor Class: </b>{playerStats.armorClass}<br />
            <b>Hit Points: </b>{playerStats.hitPoints}<br />
            <b>Proficiency: </b>+{playerStats.proficiency}<br />
            <b>Initiative: </b>+{playerStats.initiative}<br />
            <b>Speed: </b>{playerStats.speed} ft.<br />
            <hr />
            <div className='abilities'>
                <div><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
                {playerStats.abilities.map((ability) => {
                    return <React.Fragment key={ability.name}>
                        <div>{ability.name}</div>
                        <div>{ability.value}</div>
                        <div>{signFormatter.format(ability.bonus)}</div>
                        <div>{signFormatter.format(ability.save)}</div>
                        <div className='left'>{ability.skills.map((skill) => {
                            return `${skill.name}  ${signFormatter.format(skill.bonus)}`;
                        }).join(', ')}</div>
                    </React.Fragment>;
                })}
            </div>
            <hr />
            {(playerStats.resistances.length > 0) && <div>
                <b>Resistances: </b>
                {playerStats.resistances.join(', ')}
            </div>}
            {(playerStats.immunities.length > 0) && <div>
                <b>Immunities: </b>
                {playerStats.immunities.join(', ')}
            </div>}
            {(playerStats.vulnerabilities.length > 0) && <b>Vulnerabilities: </b>}{(playerStats.vulnerabilities.length > 0) && playerStats.vulnerabilities.join(', ')}
            <div><b>Senses: </b>{playerStats.senses.map((sense) => {
                return `${sense.name.toLowerCase()} ${sense.value}`;
            }).join(', ')}
            </div>
            <b>Languages: </b>{playerStats.languages.join(', ')}<br />
            <hr />
            <div>
                <span className='sectionHeader'>Action Attacks </span>({playerStats.attacksPerAction} per action)
                <div className='attacks'>
                    <div className='left'><b>Name</b></div>
                    <div><b>Range</b></div>
                    <div><b>Hit</b></div>
                    <div><b>Damage</b></div>
                    <div className='left'><b>Type</b></div>
                    {playerStats.attacks.map((attack) => {
                        if (attack.type != 'Action') return '';
                        return <React.Fragment key={attack.name}>
                            <div className='left'>{attack.name}</div>
                            <div>{attack.range} ft.</div>
                            <div>{signFormatter.format(attack.hitBonus)}</div>
                            <div>{attack.damage}</div>
                            <div className='left'>{attack.damageType}</div>
                        </React.Fragment>;
                    })}
                </div>
                <br />
                <b>Base Actions: </b><br />
                {actions.join(', ')}
            </div>
            <hr />
            <div>
                {playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && <div>
                    <div className='sectionHeader'>Bonus Action Attacks</div>
                    <div className='attacks'>
                        <div className='left'><b>Name</b></div>
                        <div><b>Range</b></div>
                        <div><b>Hit</b></div>
                        <div><b>Damage</b></div>
                        <div className='left'><b>Type</b></div>
                        {playerStats.attacks.map((attack) => {
                            if (attack.type != 'Bonus Action') return '';
                            return <React.Fragment key={attack.name}>
                                <div className='left'>{attack.name}</div>
                                <div>{attack.range} ft.</div>
                                <div>{signFormatter.format(attack.hitBonus)}</div>
                                <div>{attack.damage}</div>
                                <div className='left'>{attack.damageType}</div>
                            </React.Fragment>;
                        })}
                    </div>
                </div>}
                {/* No Bonus Action Attacks and only Bonus Actions so the Bonus Actions are the section's header */}
                {!playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <div className='sectionHeader'>Bonus Actions</div>
                </div>}
                {/* Bonus Action Attacks and Bonus Actions so there has already been a section header and the Bonus Actions are a sub section */}
                {playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <br />
                    <b>Bonus Actions: </b><br />
                </div>}
                {(playerStats.bonusActions.length > 0) && <div>
                    {playerStats.bonusActions.map((bonusAction) => {
                        return <div key={bonusAction.name}><b>{bonusAction.name}:</b> {bonusAction.description}</div>;
                    })}
                </div>}
            </div>
            <hr />
            <div  className='sectionHeader'>Reactions</div>
            {playerStats.reactions.map((reaction) => {
                return <div key={reaction.name}><b>{reaction.name}:</b> {reaction.description}</div>;
            })}
            <hr />
            <div className='sectionHeader'>Special Actions</div>
            {playerStats.specialActions.map((specialAction) => {
                return <div key={specialAction.name}><b>{specialAction.name}:</b> {specialAction.description}</div>;
            })}
            {(playerStats.spells && playerStats.spells.length > 0) && <div>
                <hr />
                <div className='spells'>
                    <div className='left'><b>Spell</b></div>
                    <div><b>Level</b></div>
                    <div><b>Prepared</b></div>
                    <div><b>Time</b></div>
                    <div><b>Range</b></div>
                    <div><b>Effect</b></div>
                    <div><b>Duration</b></div>
                    <div className='left'><b>Notes</b></div>
                    {playerStats.spells.map((spell) => {
                        let notes = [];
                        if(spell.concentration) notes.push('Concentration');
                        if(spell.components) notes.push(spell.components.join('/'));
                        let effect = 'Utility';
                        if(spell.damage) {
                            if(spell.damage.damage_at_slot_level) {
                                effect = `${spell.damage.damage_at_slot_level[Object.keys(spell.damage.damage_at_slot_level)[0]]} ${spell.damage.damage_type}`
                            } else if (spell.damage.damage_at_character_level) {
                                effect = `${spell.damage.damage_at_character_level[Object.keys(spell.damage.damage_at_character_level)[0]]} ${spell.damage.damage_type}`
                            }
                        }
                        return <React.Fragment key={spell.name}>
                            <div className='left'>{spell.name}</div>
                            <div>{spell.level === 0 ? 'Cantrip' : spell.level}</div>
                            <div>{spell.prepared ? 'prepared' : spell.ritual ? 'ritual' : ''}</div>
                            <div>{spell.casting_time}</div>
                            <div>{spell.range}</div>
                            <div>{effect}</div>
                            <div>{spell.duration}</div>
                            <div className='left'>{notes.join(', ')}</div>
                        </React.Fragment>;
                    })}
                </div>
            </div>}
            <hr />
            <div className='sectionHeader'>Inventory</div>
            <div><b>Backpack:</b> {playerStats.inventory.backpack.join(', ')}</div>
            <div><b>Equipped:</b> {playerStats.inventory.equipped.join(', ')}</div>
        </div>
    )
}

export default CharSheet
