/* eslint-disable react/prop-types */
import React from 'react'
import rules from '../../../services/rules'
import './char-spells.css'
import CharPopup from './char-popup'
import CharSpellSlots from './char-spell-slots'

function CharSpells({ allSpells, playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const spellAbilities = rules.getSpellAbilities(allSpells, playerStats);

    const showPopup = (spell) => {
        if(spell.desc) {
            let html = `<b>${spell.name}</b><br/><br/>${spell.desc}<br/>`;
            if(spell.higher_level) {
                html += `<br/><b>At higher levels.</b>&nbsp;${spell.higher_level}`;
            }
            setPopupHtml(html);
        }
    }
    
    return (
        <div>
            {(spellAbilities && spellAbilities.spells.length > 0) && <div className="spell-popup-parent">
                {popupHtml && (<CharPopup html={popupHtml} onClick={() => setPopupHtml(null)}></CharPopup>)}
                <hr />
                <div className='spell-abilities'>
                    <div className="sectionHeader">Spells</div>
                    <div><b>Attack (to hit):</b> +{spellAbilities.toHit}</div>
                    <div><b>Modifier:</b> +{spellAbilities.modifier}</div>
                    <div><b>Save DC:</b> {spellAbilities.saveDc}</div>
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
                    {spellAbilities.spells.map((spell) => {
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
                        if(spell.ritual) {
                            spell.prepared = 'Ritual';
                        }
                        return <React.Fragment key={spell.name}>
                            <div className='left spell-name' onClick={() => showPopup(spell)}>{spell.name}</div>
                            <div>{spell.level === 0 ? 'Cantrip' : spell.level}</div>
                            <div>{spell.prepared}</div>
                            <div>{spell.casting_time.replace('bonus action','BA').replace('action','A').replace('minute','min').replace('minutes','min')}</div>
                            <div>{spell.range}</div>
                            <div>{effect}</div>
                            <div>{spell.duration.replace('Instantaneous','Instant').replace('minute','min').replace('minutes','min')}</div>
                            <div className='left'>{notes.join(', ').replace('Concentration','Con')}</div>
                        </React.Fragment>;
                    })}
                </div>
            </div>}
        </div>
    )
}

export default CharSpells
