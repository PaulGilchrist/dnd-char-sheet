/* eslint-disable react/prop-types */
import React from 'react'
import Utils from '../../services/utils'

import './initiative.css'

function Initiative({ characters }) {
    const [initiativeRolls, setInitiativeRolls] = React.useState([]);
    React.useEffect(() => {
        const numOrMobs = 5

        const json = localStorage.getItem('initiativeRolls');
        let rolls = []
        if (json) {
            rolls = JSON.parse(json);
        } else {
            rolls = characters.map((character) => { return { name: Utils.getFirstName(character.name), roll: '' } });
            for (let i = 0; i < numOrMobs; i++) {
                rolls.push({ name: `Mob ${i + 1}`, roll: '' });
            }
        }
        setInitiativeRolls(rolls);
    }, []);

    const handleChange = (name, event) => {
        handleValueChange(name, event.target.value);
    };
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            handleChange(name, event);
        }
    };
    const handleReset = () => {
        if (window.confirm('Are you sure you want to clear all initiative rolls?')) {
            initiativeRolls.forEach((initiativeRoll) => initiativeRoll.roll = '');
            initiativeRolls.sort((a, b) => a.name.localeCompare(b.name)); // asc
            localStorage.setItem('initiativeRolls', JSON.stringify(initiativeRolls));
            setInitiativeRolls([...initiativeRolls]);
        }
    };
    const handleValueChange = (name, value) => {
        const index = initiativeRolls.findIndex(initiativeRoll => initiativeRoll.name === name);
        initiativeRolls[index].roll = value;
        initiativeRolls.sort((a, b) => b.roll - a.roll); // desc
        localStorage.setItem('initiativeRolls', JSON.stringify(initiativeRolls));
        setInitiativeRolls([...initiativeRolls]);
    };

    return (
        <div className='initiative'>
            <h3> Initiative Rolls</h3>
            <p>Initiative determines the order of turns during combat. It is determined by rolling a d20 and adding the character&apos;s Dexterity bonus. The higher the result, the sooner a character takes their turn. Some characters might have additional bonuses to their initiative due to class features, feats, or spells.</p>
            {initiativeRolls.map((initiativeRoll) => <div key={initiativeRoll.name} className='initiative-row'>
                <div>{initiativeRoll.name}</div>
                <input
                    min="0"
                    onChange={(event) => handleChange(initiativeRoll.name, event)}
                    onKeyDown={(event) => handleKeyDown(initiativeRoll.name, event)}
                    tabIndex={0}
                    type="number"
                    value={initiativeRoll.roll}
                />
            </div>)}
            <br />
            <button className='reset' onClick={handleReset}>Reset</button>
        </div>
    )
}

export default Initiative

