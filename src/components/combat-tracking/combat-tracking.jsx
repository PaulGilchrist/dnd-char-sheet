/* eslint-disable react/prop-types */
import React from 'react'
import Utils from '../../services/utils'

import './combat-tracking.css'

function CombatTracking({ characters }) {
    const [creatures, setCreatures] = React.useState([]);
    React.useEffect(() => {
        const numOrMobs = 5
        const json = localStorage.getItem('combatTrackedCreatures');
        let creatures = []
        if (json) {
            creatures = JSON.parse(json);
        } else {
            creatures = characters.map((character) => { return { name: Utils.getFirstName(character.name), initiative: '', notes: '' } });
            for (let i = 0; i < numOrMobs; i++) {
                creatures.push({ name: `Mob ${i + 1}`, initiative: '', notes: '' });
            }
        }
        setCreatures(creatures);
    }, []);

    const handleNotesChange = (name, note) => {
        updateNotes(name, event.target.value);
    };
    const handleNotesKeyDown = (event) => {
        if (event.key === "Enter") {
            updateNotes(name, event);
        }
    };
    const handleInitiativeChange = (name, event) => {
        updateInitiative(name, event.target.value);
    };
    const handleInitiativeKeyDown = (event) => {
        if (event.key === "Enter") {
            updateInitiative(name, event);
        }
    };
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all combat status?')) {
            creatures.forEach((creature) => {
                creature.initiative = '';
                creature.notes = '';
            });
            creatures.sort((a, b) => a.name.localeCompare(b.name)); // asc
            localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatures));
            setCreatures([...creatures]);
        }
    };
    const updateInitiative = (name, value) => {
        const index = creatures.findIndex(creature => creature.name === name);
        creatures[index].initiative = value;
        creatures.sort((a, b) => b.initiative - a.initiative); // desc
        localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatures));
        setCreatures([...creatures]);
    };
    const updateNotes = (name, value) => {
        const index = creatures.findIndex(creature => creature.name === name);
        creatures[index].notes = value;
        localStorage.setItem('combatTrackedCreatures', JSON.stringify(creatures));
        setCreatures([...creatures]);
    };
    return (
        <div className='combat'>
            <h4>Combat Tracking</h4>
            <div className='creatures'>
                <header>Name</header>
                <header>Initiative</header>
                <header>Notes</header>
                {creatures.map((creature) => <React.Fragment key={creature.name}>
                    <div>{creature.name}</div>
                    <input
                        min="0"
                        onChange={(event) => handleInitiativeChange(creature.name, event)}
                        onKeyDown={(event) => handleInitiativeKeyDown(creature.name, event)}
                        tabIndex={0}
                        type="number"
                        value={creature.initiative}
                    />
                    <input
                        placeholder="hit points, conditions, etc."
                        onChange={(event) => handleNotesChange(creature.name, event)}
                        onKeyDown={(event) => handleNotesKeyDown(creature.name, event)}
                        tabIndex={0}
                        type="text"
                        value={creature.notes}
                    />
                </React.Fragment>)}
            </div>
            <br />
            <button className='clear' onClick={handleClear}>Clear</button>
        </div>
    )
}

export default CombatTracking

