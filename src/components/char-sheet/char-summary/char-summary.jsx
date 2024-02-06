/* eslint-disable react/prop-types */
import React from 'react'
import './char-summary.css'

import storage from '../../../services/local-storage'
import CharGold from './char-gold'
import CharHitPoints from './char-hit-points'
import CharClassBarbarian from './char-class-barbarian'
import CharClassBard from './char-class-bard'
import CharClassCleric from './char-class-cleric'
import CharClassDruid from './char-class-druid'
import CharClassFighter from './char-class-fighter'
import CharClassMonk from './char-class-monk'
import CharClassPaladin from './char-class-paladin'
import CharClassRanger from './char-class-ranger'
import CharClassRogue from './char-class-rogue'
import CharClassSorcerer from './char-class-sorcerer'
import CharClassWarlock from './char-class-warlock'
import CharClassWizard from './char-class-wizard'

function CharSummary({ playerStats }) {
    const [hasInspiration, setHasInspiration] = React.useState(false);
    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'hasInspiration');
        setHasInspiration(value ? value : false);
    }, [playerStats]);
    let speed = playerStats.race.subrace && playerStats.race.subrace.speed ? playerStats.race.subrace.speed : playerStats.race.speed;
    if((playerStats.class.name === 'Monk') || (playerStats.class.name === 'Barbarian')) {
        speed += playerStats.class.class_levels[playerStats.level-1].class_specific.unarmored_movement;
    }
    const handleToggleInspiraction = () => {
        const newValue = !hasInspiration;
        storage.set(playerStats.name, 'hasInspiration', newValue);
        setHasInspiration(newValue);
    }
    return (
        <div>
            <div className='name'>{playerStats.name}</div>
            <div className='summary'>{playerStats.race.subrace ? playerStats.race.subrace.name : playerStats.race.name} {playerStats.class.name} ({playerStats.class.subclass ? `${playerStats.class.subclass.name.toLowerCase()} ` : ''}{playerStats.class.subclass && playerStats.class.subclass.circle ? `${playerStats.class.subclass.circle.toLowerCase()} ` : ''}level {playerStats.level}), {playerStats.alignment}</div>
            <div className='summaryGrid'>
                <div>
                    <b>Armor Class: </b>{playerStats.armorClass}<br/>
                    <CharHitPoints playerStats={playerStats}></CharHitPoints>
                    <b>Speed: </b>{speed} ft.<br/>
                    <CharGold playerStats={playerStats}></CharGold>
                </div>
                <div>
                    <b>Proficiency: </b>+{playerStats.proficiency}<br/>
                    <b>Initiative: </b>+{playerStats.initiative}<br/>
                    <b>Inspiration: </b><input tabIndex={0} type="checkbox" checked={hasInspiration} onChange={handleToggleInspiraction}/><br/>
                </div>
                <div>
                    {playerStats.class.name == 'Barbarian' && <CharClassBarbarian playerStats={playerStats}></CharClassBarbarian>}
                    {playerStats.class.name == 'Bard' && <CharClassBard playerStats={playerStats}></CharClassBard>}
                    {playerStats.class.name == 'Cleric' && <CharClassCleric playerStats={playerStats}></CharClassCleric>}
                    {playerStats.class.name == 'Druid' && <CharClassDruid playerStats={playerStats}></CharClassDruid>}
                    {playerStats.class.name == 'Fighter' && <CharClassFighter playerStats={playerStats}></CharClassFighter>}
                    {playerStats.class.name == 'Monk' && <CharClassMonk playerStats={playerStats}></CharClassMonk>}
                    {playerStats.class.name == 'Paladin' && <CharClassPaladin playerStats={playerStats}></CharClassPaladin>}
                    {playerStats.class.name == 'Ranger' && <CharClassRanger playerStats={playerStats}></CharClassRanger>}
                    {playerStats.class.name == 'Rogue' && <CharClassRogue playerStats={playerStats}></CharClassRogue>}
                    {playerStats.class.name == 'Sorcerer' && <CharClassSorcerer playerStats={playerStats}></CharClassSorcerer>}
                    {playerStats.class.name == 'Warlock' && <CharClassWarlock playerStats={playerStats}></CharClassWarlock>}
                    {playerStats.class.name == 'Wizard' && <CharClassWizard playerStats={playerStats}></CharClassWizard>}
                </div>
            </div>
        </div>           
    )
}

export default CharSummary
