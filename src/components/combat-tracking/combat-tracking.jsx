/* eslint-disable react/prop-types */
import React from 'react'
import { isEqual } from 'lodash';

import utils from '../../services/utils'
import storage from '../../services/storage'
import Subscriber from '../common/subscriber';

import './combat-tracking.css'

function CombatTracking({ characters }) {
    const [combatRound, setCombatRound] = React.useState(1);
    const [creatures, setCreatures] = React.useState([]);
    const [numOfNpc, setNumOfNpc] = React.useState(5);
    const [forceRefresh, setForceRefresh] = React.useState(0);

    React.useEffect(() => {
        let round = storage.get('combatRound');
        if (round) {
            setCombatRound(round);
        }
        let creatureList = storage.get('combatTrackedCreatures');
        if (!creatureList) {
            creatureList = setupCreatures();
        }
        setCreatures(creatureList);
    }, [characters, forceRefresh]);
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all combat status?')) {
            const resetCreatures = setupCreatures();
            storage.set('combatTrackedCreatures', resetCreatures);
            setCreatures([...resetCreatures]);
            setCombatRound(1);
        }
    };
    const handleEvent = (event) => {
        if (!isEqual(storage.get(event.key), event.data)) { // We may have made this change ourselves
            localStorage.setItem(event.key, JSON.stringify(event.data));
            if (event.key === 'combatTrackedCreatures' || event.key === 'combatRound') {
                setForceRefresh(utils.guid()); // Force Refresh after debounce
            }
        }
    }
    const handleInitiativeChange = (id, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.id === id);
        creatureList[index].initiative = value;
        creatureList.sort((a, b) => b.initiative - a.initiative); // desc
        storage.set('combatTrackedCreatures', creatureList);
        setCreatures(creatureList);
    };
    const handleNameChange = (id, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.id === id);
        creatureList[index].name = value;
        storage.set('combatTrackedCreatures', creatureList);
        setCreatures(creatureList);
    };
    const handleNotesChange = (id, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.id === id);
        creatureList[index].notes = value;
        storage.set('combatTrackedCreatures', creatureList);
        setCreatures(creatureList);
    };
    const handleAddNpc = () => {
        const creatureList = [...creatures];
        creatureList.push({ id: utils.guid(), name: `NPC ${numOfNpc + 1}`, type: 'npc', initiative: '', notes: '' });
        setNumOfNpc(numOfNpc + 1);
        setCreatures(creatureList);
    };
    const handleRemoveNpc = () => {
        const creatureList = [...creatures];
        for (let i = creatureList.length - 1; i >= 0; i--) {
            if (creatureList[i].type === 'npc') {
                if (creatureList[i].initiative == '' || window.confirm(`${creatureList[i].name} has initiative assigned.  Remove anyway?`)) {
                    creatureList.splice(i, 1);
                    setNumOfNpc(numOfNpc - 1);
                    setCreatures(creatureList);
                }
                break;
            }
        }
    };
    const handleAddCombatRound = () => {
        const round = combatRound + 1;
        storage.set('combatRound', round);
        setCombatRound(round);
    };
    const handleRemoveCombatRound = () => {
        const round = combatRound - 1;
        storage.set('combatRound', round);
        setCombatRound(round)
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
            <h4>Combat Tracking (round {combatRound})</h4>
            <div className='creatures'>
                <header>Name</header>
                <header className="initiative">Initiative</header>
                <header>Notes</header>
                {creatures.map((creature) => <React.Fragment key={creature.id}>
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

