/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'
import './char-abilities.css'

function CharAbilities({ allAbilityScores, playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

    const showPopup = (name) => {
        const abilityScore = allAbilityScores.find((abilityScore) => abilityScore.full_name === name);
        if(abilityScore) {
            setPopupHtml(`<h3>${name}</h3>${abilityScore.desc}<br/>`);
        }
    }

    return (
        <div className='abilities-popup-parent'>
            {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
            <div className='abilities'>
                <div className='left'><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
            </div>
            {playerStats.abilities.map((ability) => {
                return <div key={ability.name} className='abilities'>
                    <div className='clickable left' onClick={() => showPopup(ability.name)}>{ability.name}</div>
                    <div>{ability.totalScore}</div>
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
