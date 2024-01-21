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
        if(json) {
            rolls = JSON.parse(json);
        } else {
            rolls = characters.map((character) => { return {name: Utils.getFirstName(character.name), roll: ''} });
            for(let i = 0; i < numOrMobs; i++) {
                rolls.push({name: `Mob ${i+1}`, roll: ''});
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
    const handleValueChange = (name, value) => {
        const index = initiativeRolls.findIndex(initiativeRoll => initiativeRoll.name === name);
        initiativeRolls[index].roll = value;
        initiativeRolls.sort((a, b) => b.roll - a.roll);
        localStorage.setItem('initiativeRolls', JSON.stringify(initiativeRolls));
        setInitiativeRolls([...initiativeRolls]);
    };
    
    return (
        <div className='initiative'>
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
        </div>
    )
}

export default Initiative

