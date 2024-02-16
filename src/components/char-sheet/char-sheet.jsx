/* eslint-disable react/prop-types */
import React from 'react'
import { cloneDeep } from 'lodash';
import storage from '../../services/local-storage'
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
import './char-sheet.css'

function CharSheet({ allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary }) {
    const [loading, setLoading] = React.useState(true);
    const [playerStats, setPlayerStats] = React.useState(null);
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = sessionStorage.getItem('apiUrl');
                if(apiUrl) {
                    const fullUrl = `${apiUrl}/${playerSummary.name}`;
                    console.log(fullUrl)
                    const response = await fetch(fullUrl);
                    if (response.ok) {
                        const data = await response.json();
                        localStorage.setItem(playerSummary.name, JSON.stringify(data));                        
                    }
                }
            } catch (err) {
                // console.log(err.message);
            }
            setLoading(false);
        };
        fetchData();
    }, [allAbilityScores, allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary]);
    React.useEffect(() => {
        if(!loading) {
            const stats = rules.getPlayerStats(allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary);
            let preparedSpells = storage.get(stats.name, 'preparedSpells');
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
        }
    }, [loading]);

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
            storage.set(playerStats.name, 'preparedSpells', preparedSpells);
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
        </div>}
    </React.Fragment>)
}

export default CharSheet
