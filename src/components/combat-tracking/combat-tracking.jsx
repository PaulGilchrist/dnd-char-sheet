/* eslint-disable react/prop-types */
import React from 'react'
import { cloneDeep, isEqual } from 'lodash';
import utils from '../../services/utils'
import storage from '../../services/storage'
import Subscriber from '../common/subscriber';

import './combat-tracking.css'

function CombatTracking({ characters }) {
    const [combatSummary, setCombatSummary] = React.useState(1);
    const [numOfNpc, setNumOfNpc] = React.useState(5);
    const [forceRefresh, setForceRefresh] = React.useState(0);

    React.useEffect(() => {
        let combatSummary = storage.get('combatSummary');
        if (!combatSummary) {
            combatSummary = {
                round: 1,
                creatures: setupCreatures()
            }
            storage.set('combatSummary', combatSummary);
        }
        setCombatSummary(combatSummary);
    }, [characters, forceRefresh]);
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all combat status?')) {
            const combatSummary = {
                round: 1,
                creatures: setupCreatures()
            }
            storage.set('combatSummary', combatSummary);
            setCombatSummary(combatSummary);
        }
    };
    const handleEvent = (event) => {
        if (!isEqual(storage.get(event.key), event.data)) { // We may have made this change ourselves
            localStorage.setItem(event.key, JSON.stringify(event.data));
            if (event.key === 'combatTrackedCreatures' || event.key === 'combatSummary') {
                setForceRefresh(utils.guid()); // Force Refresh after debounce
            }
        }
    }
    const handleInitiativeChange = (id, value) => {
        const index = combatSummary.creatures.findIndex((creature) => creature.id === id);
        combatSummary.creatures[index].initiative = value;
        combatSummary.creatures.sort((a, b) => b.initiative - a.initiative); // desc
        storage.set('combatSummary', combatSummary);
        setCombatSummary(cloneDeep(combatSummary));
    };
    const handleNameChange = (id, value) => {
        const index = combatSummary.creatures.findIndex((creature) => creature.id === id);
        combatSummary.creatures[index].name = value;
        storage.set('combatSummary', combatSummary);
        setCombatSummary(cloneDeep(combatSummary));
    };
    const handleNotesChange = (id, value) => {
        const index = combatSummary.creatures.findIndex((creature) => creature.id === id);
        combatSummary.creatures[index].notes = value;
        storage.set('combatSummary', combatSummary);
        setCombatSummary(cloneDeep(combatSummary));
    };
    const handleAddNpc = () => {
        combatSummary.creatures.push({ id: utils.guid(), name: `NPC ${numOfNpc + 1}`, type: 'npc', initiative: '', notes: '' });
        setNumOfNpc(numOfNpc + 1);
        storage.set('combatSummary', combatSummary);
        setCombatSummary(cloneDeep(combatSummary));
    };
    const handleRemoveNpc = () => {
        for (let i = combatSummary.creatures.length - 1; i >= 0; i--) {
            if (combatSummary.creatures[i].type === 'npc') {
                if (combatSummary.creatures[i].initiative == '' || window.confirm(`${combatSummary.creatures[i].name} has initiative assigned.  Remove anyway?`)) {
                    combatSummary.creatures.splice(i, 1);
                    setNumOfNpc(numOfNpc - 1);
                    storage.set('combatSummary', combatSummary);
                    setCombatSummary(cloneDeep(combatSummary));
                }
                break;
            }
        }
    };
    const handleAddCombatRound = () => {
        combatSummary.round++;
        storage.set('combatSummary', combatSummary);
        setCombatSummary({...combatSummary});
    };
    const handleRemoveCombatRound = () => {
        combatSummary.round--;
        storage.set('combatSummary', combatSummary);
        setCombatSummary({...combatSummary});
    };
    const setupCreatures = () => {
        const creatureList = characters.map((character) => { return { id: utils.guid(), name: utils.getFirstName(character.name), type: 'player', initiative: '', notes: '' } });
        creatureList.sort((a, b) => a.name.localeCompare(b.name)); // asc
        for (let i = 0; i < numOfNpc; i++) {
            creatureList.push({ id: utils.guid(), name: `NPC ${i + 1}`, type: 'npc', initiative: '', notes: '' });
        }
        return creatureList;
    };
    return (
        <div className='combat-tracking'>
            <h4>Combat Tracking (round {combatSummary.round})</h4>
            <div className='creatures'>
                <header>Name</header>
                <header className="initiative">Initiative</header>
                <header>Notes</header>
                {combatSummary.creatures && combatSummary.creatures.map((creature) => <React.Fragment key={creature.id}>
                    {creature.type === 'player' && <div>{creature.name}</div>}
                    {creature.type === 'npc' && <div>
                        <input
                            onChange={(event) => handleNameChange(creature.id, event.target.value)}
                            tabIndex={0}
                            type="text"
                            value={creature.name}
                            size='10'
                        />
                    </div>}
                    <input
                        min="0"
                        onChange={(event) => handleInitiativeChange(creature.id, event.target.value)}
                        tabIndex={0}
                        type="number"
                        value={creature.initiative}
                    />
                    <input
                        placeholder="hit points, conditions, death saves, exhaustion, etc."
                        onChange={(event) => handleNotesChange(creature.id, event.target.value)}
                        tabIndex={0}
                        type="text"
                        value={creature.notes}
                    />
                </React.Fragment>)}
            </div>
            <br />
            <div className='combat-tracking-buttons'>
                <button onClick={handleClear}>Clear</button>
                <span className='up-down'>NPC <button onClick={handleAddNpc}>&#8593;</button><button onClick={handleRemoveNpc}>&#8595;</button></span>
                <span className='up-down'>Combat Round <button onClick={handleAddCombatRound}>&#8593;</button><button onClick={handleRemoveCombatRound}>&#8595;</button></span>
            </div>
            <Subscriber handleEvent={handleEvent}></Subscriber>
        </div>
    )
}

export default CombatTracking

