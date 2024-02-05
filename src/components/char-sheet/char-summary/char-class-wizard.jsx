/* eslint-disable react/prop-types */
import React from 'react'
import stoarcaneRecovery from '../../../services/local-storage'
import HiddenInput from '../../common/hidden-input'

function CharClassWizard({ playerStats }) {
    const [arcaneRecoveryLevels, setArcaneRecoveryLevels] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let arcaneRecoveryLevels = stoarcaneRecovery.get(playerStats.name, 'arcaneRecoveryLevels');
        setArcaneRecoveryLevels(arcaneRecoveryLevels ? arcaneRecoveryLevels : classSpecific.arcane_recovery_levels);
    }, [playerStats]);
    const handleArcaneRecoveryLevelsToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleArcaneRecoveryLevelsChange = (arcaneRecoveryLevels) => {
        stoarcaneRecovery.set(playerStats.name, 'arcaneRecoveryLevels', arcaneRecoveryLevels);
        setArcaneRecoveryLevels(arcaneRecoveryLevels);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Wizard' && <div>
            <div className="clickable" onClick={handleArcaneRecoveryLevelsToggle} onKeyDown={handleArcaneRecoveryLevelsToggle} tabIndex={0}>
                <b>Arcane Recovery Levels:</b> {classSpecific.arcane_recovery_levels}/<HiddenInput handleInputToggle={handleArcaneRecoveryLevelsToggle} handleValueChange={(value) => handleArcaneRecoveryLevelsChange(value)} showInput={showInput} value={arcaneRecoveryLevels}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
        </div>}
    </React.Fragment>)
}

export default CharClassWizard
