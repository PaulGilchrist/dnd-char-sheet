/* eslint-disable react/prop-types */
import React from 'react'
import rules from '../../services/rules'
import CharAbilities from './char-abilities'
import CharActions from './char-actions'
import CharInventory from './char-inventory'
import CharReactions from './char-reactions'
import CharSpecialActions from './char-special-actions'
import CharSpells from './char-spells/char-spells'
import CharSummary from './char-summary/char-summary'
import CharSummary2 from './char-summary2'
import './char-sheet.css'

function CharSheet({ allAbilityScores, allClasses, allEquipment, allRaces, allSpells, playerSummary }) {  
    const [playerStats, setPlayerStats] = React.useState(null);
    React.useEffect(() => {
        const stats = rules.getPlayerStats(allClasses, allEquipment, allRaces, playerSummary);
        setPlayerStats(stats);
    }, [allAbilityScores, allClasses, allEquipment, allRaces, allSpells, playerSummary]);
    return (
        <div>{playerStats && <div className='char-sheet'>
            <CharSummary allEquipment={allEquipment} playerStats={playerStats}></CharSummary><hr />
            <CharAbilities allAbilityScores={allAbilityScores} playerStats={playerStats}></CharAbilities><hr />
            <CharSummary2 playerStats={playerStats}></CharSummary2><hr />
            <CharActions allEquipment={allEquipment} allSpells={allSpells} playerStats={playerStats}></CharActions><hr />
            <CharReactions allSpells={allSpells} playerStats={playerStats}></CharReactions><hr />
            <CharSpecialActions playerStats={playerStats}></CharSpecialActions>
            <CharSpells allSpells={allSpells} playerStats={playerStats}></CharSpells><hr />
            <CharInventory playerStats={playerStats}></CharInventory>
        </div>}
    </div>)
}

export default CharSheet
