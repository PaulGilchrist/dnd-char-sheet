/* eslint-disable react/prop-types */
import React from 'react'

import CharAbilities from './char-abilities'
import CharActions from './char-actions'
import CharSummary from './char-summary'
import './char-sheet.css'

function CharSheet({ allClasses, allEquipment, allSpells, playerStats }) {
    const characterClass = allClasses.find((characterClass) => characterClass.name === playerStats.class);

    // Add spell details
    let spells = [];
    if(playerStats.spells && playerStats.spells.length > 0) {
        spells = playerStats.spells.map(spell => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spell.prepared};
            }
            return {...spell};
        });
        // Find spells that are reactions and prepared and add them to attacks
        let reactionSpells = spells.filter(spell => spell.casting_time === '1 reaction' && spell.prepared);
        reactionSpells.forEach(spell => {
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
            <CharSummary allEquipment={allEquipment} characterClass={characterClass} playerStats={playerStats}></CharSummary>
            <hr />
            <CharAbilities characterClass={characterClass} playerStats={playerStats}></CharAbilities>
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
            <CharActions allEquipment={allEquipment} allSpells={allSpells} characterClass={characterClass} playerStats={playerStats}></CharActions>
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
                    {spells.map((spell) => {
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
