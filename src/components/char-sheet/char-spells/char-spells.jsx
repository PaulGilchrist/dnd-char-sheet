/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../../common/popup'
import CharSpellSlots from './char-spell-slots'
import './char-spells.css'

function CharSpells({ playerStats, handleTogglePreparedSpells }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const spellAbilities = playerStats.spellAbilities;
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
                {popupHtml && (<Popup html={popupHtml} onClick={() => setPopupHtml(null)}></Popup>)}
                <hr />
                <div className='spell-abilities'>
                    <div className="sectionHeader"><h4>&nbsp;Spells</h4></div>
                    <div>
                        <b>Attack (to hit):</b> +{spellAbilities.toHit}<br/>
                        <b>Modifier:</b> +{spellAbilities.modifier}<br/>
                        <b>Save DC:</b> {spellAbilities.saveDc}
                    </div>
                    <div>
                        <b>Cantrips Known:</b> {spellAbilities.cantrips_known ? spellAbilities.cantrips_known : 0}<br/>
                        <b>Spells Known:</b> {spellAbilities.spells_known ? spellAbilities.spells_known : 'All'}<br/>                    
                        <b>Max Prepared:</b> {spellAbilities.maxPreparedSpells ? spellAbilities.maxPreparedSpells : 'All'}
                    </div>
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
                        if(spell.ritual) notes.push('Ritual');
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
                            <div className='left spell-name clickable' onClick={() => showPopup(spell)}>{spell.name}</div>
                            <div>{spell.level === 0 ? 'Cantrip' : spell.level}</div>
                            {(spell.prepared !== 'Prepared' && spell.prepared !== '') && <div>{spell.prepared}</div>}
                            {(spell.prepared === 'Prepared' || spell.prepared === '') && <div><input tabIndex={0} type="checkbox" checked={spell.prepared === 'Prepared'} onChange={() => handleTogglePreparedSpells(spell.name)}/></div>}
                            <div>{spell.casting_time ? spell.casting_time.replace('reaction','R').replace('bonus action','BA').replace('action',' A').replace('minute','min').replace('minutes','min') : ''}</div>
                            <div>{spell.range}</div>
                            <div>{effect}</div>
                            <div>{spell.duration ? spell.duration.replace('Instantaneous','Instant').replace('minute','min').replace('minutes','min') : ''}</div>
                            <div className='left'>{notes.join(', ').replace('Concentration','Con')}</div>
                        </React.Fragment>;
                    })}
                </div>
            </div>}
        </div>
    )
}

export default CharSpells