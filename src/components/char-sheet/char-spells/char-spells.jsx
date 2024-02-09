/* eslint-disable react/prop-types */
import React from 'react'
import { cloneDeep } from 'lodash';
import Popup from '../../common/popup'
import CharSpellSlots from './char-spell-slots'
import './char-spells.css'

function CharSpells({ playerStats, handleTogglePreparedSpells }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const [filterPrepared, setFilterPrepared] = React.useState(false);
    const [spells, setSpells] = React.useState([]);
    React.useEffect(() => {
        if(playerStats.spellAbilities) {
            setFilterPrepared(false);
            setSpells(playerStats.spellAbilities.spells);
        }
    }, [playerStats]);
    const handleTogglePreparedFilter = () => {
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        if(!filterPrepared) {
            setSpells(spells.filter(spell => spell.prepared === 'Always' || spell.prepared === 'Prepared'));
        } else {
            setSpells(spells)
        }
        setFilterPrepared(!filterPrepared)
    }
    const handleSortLevel = () => {
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        // Sort by level (ascending) and then by name
        spells.sort((a, b) => {
            if (a.level !== b.level) {
                return a.level - b.level;
            } else {
                return a.name.localeCompare(b.name);
            }
        });
        setSpells(spells);
    }
    const handleSortSpell = () => {
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        spells.sort((a, b) => a.name.localeCompare(b.name));
        setSpells(spells);
    }
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
            {(playerStats.spellAbilities && playerStats.spellAbilities.spells.length > 0) && <div className="spell-popup-parent">
                {popupHtml && (<Popup html={popupHtml} onClick={() => setPopupHtml(null)}></Popup>)}
                <hr />
                <div className='spell-abilities'>
                    <div className="sectionHeader"><h4>&nbsp;Spells</h4></div>
                    <div>
                        <b>Attack (to hit):</b> +{playerStats.spellAbilities.toHit}<br/>
                        <b>Modifier:</b> +{playerStats.spellAbilities.modifier}<br/>
                        <b>Save DC:</b> {playerStats.spellAbilities.saveDc}
                    </div>
                    <div>
                        <b>Cantrips Known:</b> {playerStats.spellAbilities.cantrips_known ? playerStats.spellAbilities.cantrips_known : 0}<br/>
                        <b>Spells Known:</b> {playerStats.spellAbilities.spells_known ? playerStats.spellAbilities.spells_known : 'All'}<br/>                    
                        <b>Max Prepared:</b> {playerStats.spellAbilities.maxPreparedSpells ? playerStats.spellAbilities.maxPreparedSpells : 'All'}
                    </div>
                    <CharSpellSlots playerStats={playerStats}></CharSpellSlots>
                </div>
                <div className='spells'>
                    <div className='left'><b className="clickable" onClick={handleSortSpell}>Spell</b></div>
                    <div><b className="clickable" onClick={handleSortLevel}>Level</b></div>
                    <div><b className="clickable" onClick={handleTogglePreparedFilter}>Prepared</b></div>
                    <div><b>Time</b></div>
                    <div><b>Range</b></div>
                    <div><b>Effect</b></div>
                    <div><b>Duration</b></div>
                    <div className='left'><b>Notes</b></div>
                    {spells.map((spell) => {
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
