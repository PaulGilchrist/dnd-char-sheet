/* eslint-disable react/prop-types */
import React from 'react'
import './char-sheet.css'

import { actions } from './data/actions.js';
import { passiveSkills } from './data/passive-skills.js';
import { skills } from './data/skills.js';

function CharSheet({ classes, equipment, spells, stats }) {
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    // Get abilityProficiencies and hitDice from class
    const characterClass = classes.find((characterClass) => characterClass.name === stats.class);
    stats.abilityProficiencies = characterClass.saving_throws.map((savingThrow) => {
        switch (savingThrow) {
            case 'STR': return 'Strength';
            case 'DEX': return 'Dexterity';
            case 'CON': return 'Constitution';
            case 'INT': return 'Intelligence';
            case 'WIS': return 'Wisdom';
            case 'CHA': return 'Charisma';
        }
    });
    stats.hitDice = characterClass.hit_die;
    // Calculated additional stats
    stats.proficiency = Math.floor((stats.level - 1) / 4 + 2);
    stats.abilities = stats.abilities.map((ability) => {
        ability.proficient = stats.abilityProficiencies.includes(ability.name);
        ability.bonus = Math.floor((ability.value - 10) / 2);
        ability.save = ability.proficient ? ability.bonus + stats.proficiency : ability.bonus;
        ability.skills = skills.filter(skill => skill.ability === ability.name);
        ability.skills = ability.skills.map((skill) => {
            skill.proficient = stats.skillProficiencies.includes(skill.name);
            skill.bonus = skill.proficient ? ability.bonus + stats.proficiency : ability.bonus;
            if (passiveSkills.includes(skill.name)) {
                // Add skill based senses
                const newSense = {
                    name: `passive ${skill.name}`,
                    value: 10 + skill.bonus
                }
                if (!stats.senses.find((sense) => sense.name === newSense.name)) {
                    stats.senses.push(newSense);
                }
            }
            return skill
        });
        return ability
    });
    const strengthBonus = stats.abilities.find((ability) => ability.name === 'Strength').bonus;
    const dexterityBonus = stats.abilities.find((ability) => ability.name === 'Dexterity').bonus;
    stats.initiative = dexterityBonus;
    stats.hitPoints = 31;
    const constitutionBonus = stats.abilities.find((ability) => ability.name === 'Constitution').bonus;
    // Full hit dice at level 1, half hit dice +1 at each level after level 1, constitution bonus add for each level
    stats.hitPoints = stats.hitDice + ((stats.hitDice / 2 + 1) * (stats.level - 1)) + (constitutionBonus * stats.level);
    // Find armor in the character's equipment and calculate Armor Class
    let armorName = stats.inventory.equiped.find(itemName => {
        let item = equipment.find((item) => item.name === itemName);
        return item.equipment_category === 'Armor';
    });
    if (armorName) {
        let armor = equipment.find((item) => item.name === armorName);
        stats.armorClass = armor.armor_class.base;
    } else {
        stats.armorClass = 10 + dexterityBonus // Unarmored
    }
    stats.attacks = [];
    // Find ranged weapon in the character's equipment and add it to attacks
    let rangedWeaponName = stats.inventory.equiped.find(itemName => {
        let item = equipment.find((item) => item.name === itemName);
        return item.equipment_category === 'Weapon' && item.weapon_range === 'Ranged';
    });
    if (rangedWeaponName) {
        let rangedWeapon = equipment.find((item) => item.name === rangedWeaponName);
        stats.attacks.push({
            "name": rangedWeapon.name,
            "damage": `${rangedWeapon.damage.damage_dice}+${dexterityBonus}`,
            "damageType": rangedWeapon.damage.damage_type,
            "hitBonus": dexterityBonus + stats.proficiency,
            "range": rangedWeapon.range.normal,
            "type": "Action"
        });
    }
    // Find main hand weapon in the character's equipment and add it to attacks
    let meleeWeaponNames = stats.inventory.equiped.filter(itemName => {
        let item = equipment.find((item) => item.name === itemName);
        return item.equipment_category === 'Weapon' && item.weapon_range === 'Melee';
    });
    if (meleeWeaponNames) {
        let mainHandWeapon = equipment.find((item) => item.name === meleeWeaponNames[0]);
        stats.attacks.push({
            "name": mainHandWeapon.name,
            "damage": `${mainHandWeapon.damage.damage_dice}+${dexterityBonus}`,
            "damageType": mainHandWeapon.damage.damage_type,
            "hitBonus": Math.max(strengthBonus, dexterityBonus) + stats.proficiency, // Assumes using finesse if dex build
            "range": mainHandWeapon.range.normal,
            "type": "Action"
        });
        if (meleeWeaponNames.length > 1) {
            // There is also an offhand weapon
            let offHandWeapon = equipment.find((item) => item.name === meleeWeaponNames[1]);
            stats.attacks.push({
                "name": offHandWeapon.name,
                "damage": `${offHandWeapon.damage.damage_dice}+${dexterityBonus}`,
                "damageType": offHandWeapon.damage.damage_type,
                "hitBonus": Math.max(strengthBonus, dexterityBonus) + stats.proficiency, // Assumes using finesse if dex build
                "range": offHandWeapon.range.normal,
                "type": "Bonus Action"
            });
        }
    }
    // Add base reactions to reaction list
    if (!stats.reactions.find((reaction) => reaction.name === 'Opportunity Attack')) {
        stats.reactions.push({ "name": "Opportunity Attack", "description": "Can attack creature that moves out of your reach" });
    }
    // Add spell details
    console.log(stats.spells);
    if(stats.spells && stats.spells.length > 0) {
        stats.spells = stats.spells.map(spellSummary => {
            let spellDetail = spells.find((spellDetail) => spellDetail.name === spellSummary.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spellSummary.prepared};
            }
            return spellSummary;
        });
    }

    return (
        <div className='root'>
            <div className='name'>{stats.name}</div>
            <div className='summary'>{stats.race} {stats.class} (level {stats.level}), {stats.alignment}</div>
            <b>Armor Class: </b>{stats.armorClass}<br />
            <b>Hit Points: </b>{stats.hitPoints}<br />
            <b>Proficiency: </b>+{stats.proficiency}<br />
            <b>Initiative: </b>+{stats.initiative}<br />
            <b>Speed: </b>{stats.speed} ft.<br />
            <hr />
            <div className='abilities'>
                <div><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
                {stats.abilities.map((ability) => {
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
            {(stats.resistances.length > 0) && <b>Resistances: </b>}{(stats.resistances.length > 0) && stats.resistances.join(', ')}
            {(stats.immunities.length > 0) && <b>Immunities: </b>}{(stats.immunities.length > 0) && stats.immunities.join(', ')}
            {(stats.vulnerabilities.length > 0) && <b>Vulnerabilities: </b>}{(stats.vulnerabilities.length > 0) && stats.vulnerabilities.join(', ')}
            <div><b>Senses: </b>{stats.senses.map((sense) => {
                return `${sense.name.toLowerCase()} ${sense.value}`;
            }).join(', ')}
            </div>
            <b>Languages: </b>{stats.languages.join(', ')}<br />
            <hr />
            <div>
                <b>Action Attacks: </b>{stats.attacksPerAction} per action
                <div className='attacks'>
                    <div className='left'><b>Name</b></div>
                    <div><b>Range</b></div>
                    <div><b>Hit</b></div>
                    <div><b>Damage</b></div>
                    <div className='left'><b>Type</b></div>
                    {stats.attacks.map((attack) => {
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
                <b>Bonus Action Attacks: </b>
                <div className='attacks'>
                    <div className='left'><b>Name</b></div>
                    <div><b>Range</b></div>
                    <div><b>Hit</b></div>
                    <div><b>Damage</b></div>
                    <div className='left'><b>Type</b></div>
                    {stats.attacks.map((attack) => {
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
                {(stats.bonusActions > 0) && <div>
                    <b>Bonus Actions:</b>
                    {stats.bonusActions.map((bonusAction) => {
                        return <div key={bonusAction.name}><b>{bonusAction.name}:</b> {bonusAction.description}</div>;
                    })}
                </div>}
            </div>
            <hr />
            <b>Reactions: </b>
            {stats.reactions.map((reaction) => {
                return <div key={reaction.name}><b>{reaction.name}:</b> {reaction.description}</div>;
            })}
            <hr />
            <b>Special Actions: </b>
            {stats.specialActions.map((specialAction) => {
                return <div key={specialAction.name}><b>{specialAction.name}:</b> {specialAction.description}</div>;
            })}
            <hr />
            {(stats.spells && stats.spells.length > 0) && <div className='spells'>
                <div className='left'><b>Spell</b></div>
                <div><b>Level</b></div>
                <div><b>Prepared</b></div>
                <div><b>Time</b></div>
                <div><b>Range</b></div>
                <div><b>Effect</b></div>
                <div><b>Duration</b></div>
                <div className='left'><b>Notes</b></div>
                {stats.spells.map((spell) => {
                    let notes = [];
                    if(spell.ritual) notes.push('Ritual');
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
                        <div>{spell.prepared ? 'prepared' : ''}</div>
                        <div>{spell.casting_time}</div>
                        <div>{spell.range}</div>
                        <div>{effect}</div>
                        <div>{spell.duration}</div>
                        <div className='left'>{notes.join(', ')}</div>
                    </React.Fragment>;
                })}
            </div>}
        </div>
    )
}

export default CharSheet
