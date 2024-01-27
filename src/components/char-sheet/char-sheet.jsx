/* eslint-disable react/prop-types */
import React from 'react'
import rules from '../../services/rules'
import CharAbilities from './sub-components/char-abilities'
import CharActions from './sub-components/char-actions'
import CharInventory from './sub-components/char-inventory'
import CharReactions from './sub-components/char-reactions'
import CharSpecialActions from './sub-components/char-special-actions'
import CharSpells from './sub-components/char-spells'
import CharSummary from './sub-components/char-summary'
import CharSummary2 from './sub-components/char-summary2'
import './char-sheet.css'

function CharSheet({ allAbilityScores, allClasses, allEquipment, allRaces, allSpells, playerSummary }) {
    const [playerStats, setPlayerStats] = React.useState(null);
    React.useEffect(() => {
        const playerStats = rules.getPlayerStats(allClasses, allRaces, playerSummary);
        setPlayerStats(playerStats);
    }, [allClasses, allRaces, playerSummary]);    
    
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
