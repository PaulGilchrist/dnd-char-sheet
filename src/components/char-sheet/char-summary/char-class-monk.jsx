/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/storage'
import classRules from '../../../services/class-rules-2024.js'
import HiddenInput from '../../common/hidden-input'

function CharClassMonk({ playerStats }) {
    const [focusPoints, setFocusPoints] = React.useState(0);
    const [maxFocusPoints, setMaxFocusPoints] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let focusPoints = storage.getProperty(playerStats.name, 'focusPoints');
                if(playerStats.level > 1) {
                    const maxFocusPoints = classRules.getFocusPoints(playerStats);
                    setMaxFocusPoints(maxFocusPoints);
                    setFocusPoints(focusPoints ? focusPoints : maxFocusPoints);
                 }
    }, [playerStats]);
    const handleFocusPointsToggle = () => {
            setShowInput((showInput) => !showInput);
          };
    const handleFocusPointsChange = (focusPoints) => {
            storage.setProperty(playerStats.name, 'focusPoints', focusPoints);
            setFocusPoints(focusPoints);
           };
    const wisdom = playerStats.abilities.find((ability) => ability.name === 'Wisdom');
        const martialArtsDie = classRules.getMartialArtsDie(playerStats);
        const unarmoredMovementIncrease = classRules.getUnarmoredMovementIncrease(playerStats);
        let extraAttacks = 0;
        if(playerStats.level > 4) { // "Extra Attack" class feature at level 5
            extraAttacks = 1;
          }
    
        return (<React.Fragment>
                {playerStats.class.name === 'Monk' && playerStats.level > 1 && <div>
                    <div><b>Martial Arts Die:</b> d{martialArtsDie}</div>
                    <div><b>Extra Attacks: </b>{extraAttacks}</div>
                    <div className="clickable" onClick={handleFocusPointsToggle} onKeyDown={handleFocusPointsToggle} tabIndex={0}>
                        <b>Focus Points:</b> {maxFocusPoints}/<HiddenInput handleInputToggle={handleFocusPointsToggle} handleValueChange={(value) => handleFocusPointsChange(value)} showInput={showInput} value={focusPoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
                    </div>
                    <div><b>Focus Save DC: </b>{8 + wisdom.bonus + playerStats.proficiency}</div>
                    <div><b>Unarmored Movement:</b> +{unarmoredMovementIncrease} ft.</div>
                </div>}
            </React.Fragment>)
}

export default CharClassMonk
