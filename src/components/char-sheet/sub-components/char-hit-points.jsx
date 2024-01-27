/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import HiddenInput from './hidden-input'

function CharHitPoints({ playerStats }) {
    const [currentHitPoints, setCurrentHitPoints] = React.useState(0);
    const [showInputCurrentHitPoints, setShowInputCurrentHitPoints] = React.useState(false);
    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'currentHitPoints');
        setCurrentHitPoints(value ? value : playerStats.hitPoints);
    }, [playerStats]);
    const handleInputToggleCurrentHitPoints = () => {
        setShowInputCurrentHitPoints((showInputCurrentHitPoints) => !showInputCurrentHitPoints);
    };
    const handleValueChangeCurrentHitPoints = (value) => {
        storage.set(playerStats.name, 'currentHitPoints', value);
        setCurrentHitPoints(value);
    };
    return (
        <div className="clickable" onClick={handleInputToggleCurrentHitPoints} onKeyDown={handleInputToggleCurrentHitPoints} tabIndex={0}>
            <b>Hit Points: </b>{playerStats.hitPoints}/<HiddenInput handleInputToggle={handleInputToggleCurrentHitPoints} handleValueChange={(value) => handleValueChangeCurrentHitPoints(value)} showInput={showInputCurrentHitPoints} value={currentHitPoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
        </div>
    )
}

export default CharHitPoints
