/* eslint-disable react/prop-types */
import React from 'react'

import './char-abilities.css'

import CharPopup from './char-popup'
import { passiveSkills } from '../../../data/passive-skills.js';
import { skills } from '../../../data/skills.js';

function CharAbilities({ allAbilityScores, characterClass, playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);

    // Calculations - Abilities 
    const abilityProficiencies = characterClass.saving_throws.map((savingThrow) => {
        switch (savingThrow) {
            case 'STR': return 'Strength';
            case 'DEX': return 'Dexterity';
            case 'CON': return 'Constitution';
            case 'INT': return 'Intelligence';
            case 'WIS': return 'Wisdom';
            case 'CHA': return 'Charisma';
        }
    });
    const abilities = playerStats.abilities.map((ability) => {
        const mappedAbility = {...ability};
        const proficient = abilityProficiencies.includes(ability.name);
        mappedAbility.bonus = Math.floor((ability.value - 10) / 2);
        mappedAbility.save = proficient ? mappedAbility.bonus + proficiency : mappedAbility.bonus;
        mappedAbility.skills = skills.filter(skill => skill.ability === ability.name);
        mappedAbility.skills = mappedAbility.skills.map((skill) => {
            const proficient = playerStats.skillProficiencies.includes(skill.name);
            skill.bonus = proficient ? mappedAbility.bonus + proficiency : mappedAbility.bonus;
            if(playerStats.expertise && playerStats.expertise.includes(skill.name)) {
                skill.bonus += proficiency; // Rogues can double their proficiency for two selected areas of expertise
            }
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
        return mappedAbility
    });

    const showPopup = (name) => {
        const abilityScore = allAbilityScores.find((abilityScore) => abilityScore.full_name === name);
        if(abilityScore) {
            setPopupHtml(`<h3>${name}</h3>${abilityScore.desc}<br/>`);
        }
    }

    return (
        <div className='abilities-popup-parent'>
            {popupHtml && (<CharPopup html={popupHtml} onClick={() => setPopupHtml(null)}></CharPopup>)}
            <div className='abilities'>
                <div className='left'><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
            </div>
            {abilities.map((ability) => {
                return <div key={ability.name} className='abilities'>
                    <div className='clickable left' onClick={() => showPopup(ability.name)}>{ability.name}</div>
                    <div>{ability.value}</div>
                    <div>{signFormatter.format(ability.bonus)}</div>
                    <div>{signFormatter.format(ability.save)}</div>
                    <div className='left'>{ability.skills.map((skill) => {
                        return `${skill.name}  ${signFormatter.format(skill.bonus)}`;
                    }).join(', ')}</div>
                </div>;
            })}
        </div>
    )
}

export default CharAbilities
