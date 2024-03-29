/* eslint-disable react/prop-types */
import React from 'react'
import { cloneDeep, isEqual } from 'lodash';
import storage from '../../services/storage'
import utils from '../../services/utils'
import rules from '../../services/rules'
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

function CharSheet({ allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary }) {
    const [playerStats, setPlayerStats] = React.useState(null);
    const [forceRefresh, setForceRefresh] = React.useState(0);
    React.useEffect(() => {
        const fetchData = async () => {
            const fullUrl = `http://${window.location.hostname}:3000/api/${utils.getFirstName(playerSummary.name)}/`;
            // console.log(fullUrl)
            try {
                const response = await fetch(fullUrl, {
                    method: 'GET',
                    mode: 'cors'
                });
                if(response.ok) {
                    const data = await response.json();
                    localStorage.setItem(playerSummary.name, JSON.stringify(data));
                }
            } catch(e) {
                // console.log(e.message); 
            }
            const stats = rules.getPlayerStats(allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary);
            let preparedSpells = storage.getProperty(stats.name, 'preparedSpells');
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
    }, [allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary, forceRefresh]);

    const handleEvent = (event) => {
        if(!isEqual(storage.get(event.key), event.data)) { // We may have made this change ourtselves
            localStorage.setItem(event.key, JSON.stringify(event.data));
            if(event.key === utils.getFirstName(playerStats.name)) {
                setForceRefresh(utils.guid()); // Force Character Refresh
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
            // Update local storage
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
