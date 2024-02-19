/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/storage'
import HiddenInput from '../../common/hidden-input'

function CharClassBarbarian({ playerStats }) {
    const [ragePoints, setRagePoints] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let ragePoints = storage.getProperty(playerStats.name, 'ragePoints');
        setRagePoints(ragePoints ? ragePoints : classSpecific.rage_count);
    }, [playerStats]);
    const handleRagePointsToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleRagePointsChange = (ragePoints) => {
        storage.setProperty(playerStats.name, 'ragePoints', ragePoints);
        setRagePoints(ragePoints);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Barbarian' && <div>
            <div className="clickable" onClick={handleRagePointsToggle} onKeyDown={handleRagePointsToggle} tabIndex={0}>
                <b>Rage Points:</b> {classSpecific.rage_count}/<HiddenInput handleInputToggle={handleRagePointsToggle} handleValueChange={(value) => handleRagePointsChange(value)} showInput={showInput} value={ragePoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div><b>Rage Damage Bonus: </b>{classSpecific.rage_damage_bonus}</div>
            <div><b>Brutal Crit Dice: </b>{classSpecific.brutal_critical_dice}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassBarbarian
