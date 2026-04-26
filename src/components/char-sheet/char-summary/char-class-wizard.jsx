/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/storage'
import HiddenInput from '../../common/hidden-input'

function CharClassWizard({ playerStats }) {
    const is2024 = playerStats.rules === '2024';
    const classSpecific = playerStats?.class?.class_levels?.[playerStats.level - 1]?.class_specific || {};
    const [arcaneRecoveryLevels, setArcaneRecoveryLevels] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);

    // Arcane Recovery is a 5e-only feature; hide it entirely for 2024 wizards
    if (is2024) {
        return null;
    }

    React.useEffect(() => {
        let storedArcaneRecoveryLevels = storage.getProperty(playerStats.name, 'arcaneRecoveryLevels');
        setArcaneRecoveryLevels(storedArcaneRecoveryLevels ? storedArcaneRecoveryLevels : classSpecific.arcane_recovery_levels);
      }, [playerStats, classSpecific]);
    const handleArcaneRecoveryLevelsToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleArcaneRecoveryLevelsChange = (arcaneRecoveryLevels) => {
        storage.setProperty(playerStats.name, 'arcaneRecoveryLevels', arcaneRecoveryLevels);
        setArcaneRecoveryLevels(arcaneRecoveryLevels);
     };
    return (<React.Fragment>
          {playerStats.class.name === 'Wizard' && <div>
              <div className="clickable" onClick={handleArcaneRecoveryLevelsToggle} onKeyDown={handleArcaneRecoveryLevelsToggle} tabIndex={0}>
                  <b>Arcane Recovery Levels:</b> {classSpecific.arcane_recovery_levels || 0}/
                  <HiddenInput handleInputToggle={handleArcaneRecoveryLevelsToggle} handleValueChange={(value) => handleArcaneRecoveryLevelsChange(value)} showInput={showInput} value={arcaneRecoveryLevels}></HiddenInput>&nbsp;
                  <span className="text-muted">(max/cur)</span>
              </div>
          </div>}
      </React.Fragment>)
}

export default CharClassWizard
