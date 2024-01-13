/* eslint-disable react/prop-types */
import React from 'react'
import './char-sheet.css'

function CharSheet({stats}) {
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    // Rule based objects
    const actions = ['Attack', 'Cast a Spell', 'Dash', 'Disengage', 'Dodge', 'Grapple', 'Help', 'Hide', 'Improvise', 'Ready', 'Search', 'Shove', 'Use an Object'];
    const passiveSkills = ['Insight', 'Investigation', 'Perception'];
    const skills = [
        { name: 'Acrobatics', ability: 'Dexterity' },
        { name: 'Animal Handling', ability: 'Wisdom' },
        { name: 'Arcana', ability: 'Intelligence' },
        { name: 'Athletics', ability: 'Strength' },
        { name: 'Deception', ability: 'Charisma' },
        { name: 'History', ability: 'Intelligence' },
        { name: 'Insight', ability: 'Wisdom' },
        { name: 'Intimidation', ability: 'Charisma' },
        { name: 'Investigation', ability: 'Intelligence' },
        { name: 'Medicine', ability: 'Wisdom' },
        { name: 'Nature', ability: 'Intelligence' },
        { name: 'Perception', ability: 'Wisdom' },
        { name: 'Performance', ability: 'Charisma' },
        { name: 'Persuasion', ability: 'Charisma' },
        { name: 'Religion', ability: 'Intelligence' },
        { name: 'Sleight of Hand', ability: 'Dexterity' },
        { name: 'Stealth', ability: 'Dexterity' },
        { name: 'Survival', ability: 'Wisdom' }
    ];
    // Add all character calculated stats
    stats.senses = [];
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
                const sense = {
                    name: `passive ${skill.name}`,
                    value: 10 + skill.bonus
                }
                stats.senses.push(sense);
            }
            return skill
        });
        return ability
    });
    stats.initiative = stats.abilities.find((ability) => ability.name === 'Dexterity').bonus;
    stats.hitPoints = 31;
    const constitutionBonus = stats.abilities.find((ability) => ability.name === 'Constitution').bonus;
    // Full hit dice at level 1, half hit dice +1 at each level after level 1, constitution bonus add for each level
    stats.hitPoints = stats.hitDice + ((stats.hitDice / 2 + 1) * (stats.level - 1)) + (constitutionBonus * stats.level);

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
                <div className='left'><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
                {stats.abilities.map((ability) => {
                    return <React.Fragment key={ability.name}>
                        <div className='left'>{ability.name}</div>
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
                <b>Action Attacks: </b>
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
                            <div>{attack.damageType}</div>
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
                            <div>{attack.damageType}</div>
                        </React.Fragment>;
                    })}
                </div>
                <br />
                <b>Bonus Actions:</b>
                {stats.bonusActions.map((bonusAction) => {
                    return <div key={bonusAction.name}><b>{bonusAction.name}:</b> {bonusAction.description}</div>;
                })}
            </div>
            <hr />
            <b>Reactions: </b>
            {stats.reactions.map((reaction) => {
                return <div key={reaction.name}><b>{reaction.name}:</b> {reaction.description}</div>;
            })}
        </div>
    )
}

export default CharSheet
