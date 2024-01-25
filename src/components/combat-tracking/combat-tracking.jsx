/* eslint-disable react/prop-types */
import React from 'react'
import Utils from '../../services/utils'

import './combat-tracking.css'

function CombatTracking({ characters }) {
    const [combatRound, setCombatRound] = React.useState(1);
    const [creatures, setCreatures] = React.useState([]);
    const [numOfNpc, setNumOfNpc] = React.useState(5);

    React.useEffect(() => {
        const round = localStorage.getItem('combatRound');
        if(round) {
            setCombatRound(round);
        }
        const json = localStorage.getItem('combatTrackedCreatures');
        let creatureList = []
        if (json) {
            creatureList = JSON.parse(json);
            if (!creatureList[0].id) { // For people using the old JSON
                localStorage.removeItem('combatTrackedCreatures');
                creatureList = setupCreatures();
            }
        } else {
            creatureList = setupCreatures();
        }
        setCreatures(creatureList);
    }, []);
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all combat status?')) {
            const resetCreatures = setupCreatures();
            localStorage.setItem('combatTrackedCreatures', JSON.stringify(resetCreatures));
            setCreatures([...resetCreatures]);
            setCombatRound(1);
        }
    };
    const handleInitiativeChange = (name, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.name === name);
        creatureList[index].initiative = value;
        creatureList.sort((a, b) => b.initiative - a.initiative); // desc
        localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatureList));
        setCreatures(creatureList);
    };
    const handleNameChange = (name, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.name === name);
        creatureList[index].name = value;
        localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatureList));
        setCreatures(creatureList);
    };
    const handleNotesChange = (name, value) => {
        const creatureList = [...creatures];
        const index = creatureList.findIndex((creature) => creature.name === name);
        creatureList[index].notes = value;
        localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatureList));
        setCreatures(creatureList);
    };
    const handleAddNpc = () => {
        const creatureList = [...creatures];
        creatureList.push({ id: Utils.guid(), name: `NPC ${numOfNpc + 1}`, type: 'npc', initiative: '', notes: '' });
        setNumOfNpc(numOfNpc+1);
        setCreatures(creatureList);
    };
    const handleRemoveNpc = () => {
        const creatureList = [...creatures];
        for (let i = creatureList.length-1; i >= 0; i--) {
            if (creatureList[i].type === 'npc') {
                if (creatureList[i].initiative == '' || window.confirm(`${creatureList[i].name} has initiative assigned.  Remove anyway?`)) {
                    creatureList.splice(i, 1);
                    setNumOfNpc(numOfNpc-1);
                    setCreatures(creatureList);
                }
                break;
            }
        }
    };
    const handleAddCombatRound = () => {
        const round = combatRound + 1;
        localStorage.setItem('combatRound', round);
        setCombatRound(round);
    };
    const handleRemoveCombatRound = () => {
        const round = combatRound - 1;
        localStorage.setItem('combatRound', round);
        setCombatRound(round)
    };
    const setupCreatures = () => {
        const creatureList = characters.map((character) => { return { id: Utils.guid(), name: Utils.getFirstName(character.name), type: 'player', initiative: '', notes: '' } });
        creatureList.sort((a, b) => a.name.localeCompare(b.name)); // asc
        for (let i = 0; i < numOfNpc; i++) {
            creatureList.push({ id: Utils.guid(), name: `NPC ${i + 1}`, type: 'npc', initiative: '', notes: '' });
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
                            onChange={(event) => handleNameChange(creature.name, event.target.value)}
                            tabIndex={0}
                            type="text"
                            value={creature.name}
                            size='10'
                        />
                    </div>}
                    <input
                        min="0"
                        onChange={(event) => handleInitiativeChange(creature.name, event.target.value)}
                        tabIndex={0}
                        type="number"
                        value={creature.initiative}
                    />
                    <input
                        placeholder="hit points, conditions, etc."
                        onChange={(event) => handleNotesChange(creature.name, event.target.value)}
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
        </div>
    )
}

export default CombatTracking

