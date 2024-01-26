/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import utils from '../../../services/utils'
import HiddenInput from './hidden-input'

function CharHitPoints({ characterClass, playerStats }) {
    const [currentHitPoints, setCurrentHitPoints] = React.useState(0);
    const [showInputCurrentHitPoints, setShowInputCurrentHitPoints] = React.useState(false);

    const constitution = utils.getAbility(playerStats, 'Constitution');
    const hitDice = characterClass.hit_die;
    const hitPoints = hitDice + ((hitDice / 2 + 1) * (playerStats.level - 1)) + (constitution.bonus * playerStats.level);
    
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
