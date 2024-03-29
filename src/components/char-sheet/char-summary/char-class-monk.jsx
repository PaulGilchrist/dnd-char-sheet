/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/storage'
import HiddenInput from '../../common/hidden-input'

function CharClassMonk({ playerStats }) {
    const [kiPoints, setKiPoints] = React.useState(0);
    const [maxKiPoints, setMaxKiPoints] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let kiPoints = storage.getProperty(playerStats.name, 'kiPoints');
        if(playerStats.level > 1) {
            const maxKiPoints = playerStats.level;
            setMaxKiPoints(maxKiPoints);
            setKiPoints(kiPoints ? kiPoints : maxKiPoints);
        }
    }, [playerStats]);
    const handleKiPointsToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleKiPointsChange = (kiPoints) => {
        storage.setProperty(playerStats.name, 'kiPoints', kiPoints);
        setKiPoints(kiPoints);
    };
    const wisdom = playerStats.abilities.find((ability) => ability.name === 'Wisdom');
    let extraAttacks = 0;
    if(playerStats.level > 4) { // "Extra Attack" class feature at level 5
        extraAttacks = 1;
    }
    
    return (<React.Fragment>
        {playerStats.class.name === 'Monk' && playerStats.level > 1 && <div>
            <div><b>Extra Attacks: </b>{extraAttacks}</div>
            <div className="clickable" onClick={handleKiPointsToggle} onKeyDown={handleKiPointsToggle} tabIndex={0}>
                <b>Ki Points:</b> {maxKiPoints}/<HiddenInput handleInputToggle={handleKiPointsToggle} handleValueChange={(value) => handleKiPointsChange(value)} showInput={showInput} value={kiPoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div><b>Ki Save DC: </b>{8 + wisdom.bonus + playerStats.proficiency}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassMonk
