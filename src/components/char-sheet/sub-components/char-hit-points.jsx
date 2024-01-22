/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import HiddenInput from './hidden-input'

function CharHitPoints({ characterClass, playerStats }) {
    const [currentHitPoints, setCurrentHitPoints] = React.useState(0);
    const [showInputCurrentHitPoints, setShowInputCurrentHitPoints] = React.useState(false);

    const constitutionBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Constitution').value - 10) / 2);
    const hitDice = characterClass.hit_die;
    const hitPoints = hitDice + ((hitDice / 2 + 1) * (playerStats.level - 1)) + (constitutionBonus * playerStats.level);
    
    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'currentHitPoints');
        setCurrentHitPoints(value ? value : hitPoints);
    }, [characterClass, playerStats]);

    const handleInputToggleCurrentHitPoints = () => {
        setShowInputCurrentHitPoints((showInputCurrentHitPoints) => !showInputCurrentHitPoints);
    };

    const handleValueChangeCurrentHitPoints = (value) => {
        storage.set(playerStats.name, 'currentHitPoints', value);
        setCurrentHitPoints(value);
    };

    return (
        <div className="clickable" onClick={handleInputToggleCurrentHitPoints} onKeyDown={handleInputToggleCurrentHitPoints} tabIndex={0}>
            <b>Hit Points: </b>{hitPoints}/<HiddenInput handleInputToggle={handleInputToggleCurrentHitPoints} handleValueChange={(value) => handleValueChangeCurrentHitPoints(value)} showInput={showInputCurrentHitPoints} value={currentHitPoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
        </div>
    )
}

export default CharHitPoints
