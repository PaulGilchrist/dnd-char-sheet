/* eslint-disable react/prop-types */
import React from 'react'
import './char-spells.css'
import CharPopup from './char-popup'
import CharSpellSlots from './char-spell-slots'

function CharSpells({ allSpells, playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    // Add spell details
    let spells = [];
    let spellAbility = null;
    if(playerStats.spells && playerStats.spells.length > 0) {
        spellAbility = playerStats.abilities.find((ability) => ability.name === playerStats.class.spell_casting_ability);
        spells = playerStats.spells.map(spell => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spell.prepared};
            }
            return {...spell};
        });
    }

    const showPopup = (spell) => {
        if(spell.desc) {
            let html = `<b>${spell.name}</b><br/><br/>${spell.desc}<br/>`;
            if(spell.higher_level) {
                html += `<br/>${spell.higher_level}`;
            }
            setPopupHtml(html);
        }
    }
    
    return (
        <div>
            {(playerStats.spells && playerStats.spells.length > 0) && <div className="spell-popup-parent">
                {popupHtml && (<CharPopup html={popupHtml} onClick={() => setPopupHtml(null)}></CharPopup>)}
                <hr />
                <div className='spell-abilities'>
                    <div className="sectionHeader">Spells</div>
                    <div><b>Attack (to hit):</b> +{spellAbility.bonus + playerStats.proficiency}</div>
                    <div><b>Modifier:</b> +{spellAbility.bonus}</div>
                    <div><b>Save DC:</b> {8 + spellAbility.bonus + playerStats.proficiency}</div>
                    <CharSpellSlots playerStats={playerStats}></CharSpellSlots>
                </div>
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
                            <div className='left spell-name' onClick={() => showPopup(spell)}>{spell.name}</div>
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
        </div>
    )
}

export default CharSpells