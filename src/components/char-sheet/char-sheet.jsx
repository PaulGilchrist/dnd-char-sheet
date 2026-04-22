/* eslint-disable react/prop-types */
import React from 'react'
import { cloneDeep, isEqual } from 'lodash';
import storage from '../../services/storage'
import utils from '../../services/utils'
import rulesFactory from '../../services/rules-factory'
import CharAbilities from './char-abilities'
import CharActions from './char-actions'
import CharAudit from './char-audit'
import CharInventory from './char-inventory'
import CharReactions from './char-reactions'
import CharSpecialActions from './char-special-actions'
import CharSpells from './char-spells/char-spells'
import CharSummary from './char-summary/char-summary'
import CharSummary2 from './char-summary2'
import Subscriber from '../common/subscriber';
import './char-sheet.css'

function CharSheet({ allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, allSpells2024, playerSummary }) {
    const [playerStats, setPlayerStats] = React.useState(null);
    const [forceRefresh, setForceRefresh] = React.useState(0);
    React.useEffect(() => {
        const fetchData = async () => {
            // Load prepared spells from localStorage
            const storedData = localStorage.getItem(playerSummary.name);
            let preparedSpells = null;
            
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (parsedData && parsedData.preparedSpells) {
                    preparedSpells = parsedData.preparedSpells;
                }
            }
            
            // Use rules factory to get appropriate rules based on character's rules setting
            const spellData = playerSummary.rules === '2024' ? allSpells2024 : allSpells;
            const stats = rulesFactory.getPlayerStats(allClasses, allEquipment, allMagicItems, allRaces, spellData, playerSummary);
            
            if (preparedSpells) {
                stats.spellAbilities.spells.forEach(spell => {
                    if (preparedSpells.includes(spell.name)) {
                        if (spell.prepared === '') {
                            spell.prepared = 'Prepared';
                        }
                    } else {
                        if (spell.prepared === 'Prepared') {
                            spell.prepared = '';
                        }
                    }
                });
            }
            setPlayerStats(stats);
        };
        fetchData();
    }, [allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, allSpells2024, playerSummary, forceRefresh]);

    const handleEvent = (event) => {
        if(!isEqual(storage.get(event.key), event.data)) {
            localStorage.setItem(event.key, JSON.stringify(event.data));
            if(event.key === utils.getFirstName(playerStats.name)) {
                setForceRefresh(utils.guid());
            }
        }
    }
    
    const handleTogglePreparedSpells = (spellName) => {
        const spell = playerStats.spellAbilities.spells.find(spell => spell.name === spellName);
        if (spell) {
            if (spell.prepared === 'Prepared') {
                spell.prepared = '';
            } else if (spell.prepared === '') {
                const preparedSpellCount = playerStats.spellAbilities.spells.filter(spell => spell.prepared === 'Prepared').length;
                if (preparedSpellCount < playerStats.spellAbilities.maxPreparedSpells) {
                    spell.prepared = 'Prepared';
                }
            }
            const preparedSpells = [];
            playerStats.spellAbilities.spells.forEach(spell => {
                if (spell.prepared === 'Prepared') {
                    preparedSpells.push(spell.name);
                }
            });
            storage.setProperty(playerStats.name, 'preparedSpells', preparedSpells);
            setPlayerStats(cloneDeep(playerStats));
        }
    }

    return (<React.Fragment>
        {playerStats && <div className='char-sheet'>
            <CharSummary playerStats={playerStats}></CharSummary><hr />
            <CharAbilities allAbilityScores={allAbilityScores} playerStats={playerStats}></CharAbilities><hr />
            <CharSummary2 playerStats={playerStats}></CharSummary2><hr />
            <CharActions playerStats={playerStats}></CharActions><hr />
            <CharReactions playerStats={playerStats}></CharReactions>
            <CharSpells playerStats={playerStats} handleTogglePreparedSpells={(spellName) => handleTogglePreparedSpells(spellName)}></CharSpells><hr />
            <CharSpecialActions playerStats={playerStats}></CharSpecialActions><hr />
            <CharInventory playerStats={playerStats}></CharInventory>
            <CharAudit playerStats={playerStats}></CharAudit>
            <Subscriber handleEvent={handleEvent}></Subscriber>
        </div>}
    </React.Fragment>)
}

export default CharSheet
