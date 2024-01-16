/* eslint-disable react/prop-types */
import CharAbilities from './sub-components/char-abilities'
import CharActions from './sub-components/char-actions'
import CharInventory from './sub-components/char-inventory'
import CharReactions from './sub-components/char-reactions'
import CharSpecialActions from './sub-components/char-special-actions'
import CharSpells from './sub-components/char-spells'
import CharSummary from './sub-components/char-summary'
import CharSummary2 from './sub-components/char-summary2'
import './char-sheet.css'

function CharSheet({ allClasses, allEquipment, allSpells, playerStats }) {
    const characterClass = allClasses.find((characterClass) => characterClass.name === playerStats.class);
    
    return (
        <div className='char-sheet'>
            <CharSummary allEquipment={allEquipment} characterClass={characterClass} playerStats={playerStats}></CharSummary><hr />
            <CharAbilities characterClass={characterClass} playerStats={playerStats}></CharAbilities><hr />
            <CharSummary2 playerStats={playerStats}></CharSummary2><hr />
            <CharActions allEquipment={allEquipment} allSpells={allSpells} characterClass={characterClass} playerStats={playerStats}></CharActions><hr />
            <CharReactions allSpells={allSpells} playerStats={playerStats}></CharReactions><hr />
            <CharSpecialActions playerStats={playerStats}></CharSpecialActions>
            <CharSpells allSpells={allSpells} characterClass={characterClass} playerStats={playerStats}></CharSpells><hr />
            <CharInventory playerStats={playerStats}></CharInventory>
        </div>
    )
}

export default CharSheet
