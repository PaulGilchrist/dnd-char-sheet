/* eslint-disable react/prop-types */
import React from 'react'

import storage from '../../../services/local-storage'
import HiddenInput from '../../common/hidden-input'

function CharGold({ playerStats }) {

    const [gold, setGold] = React.useState(0);
    const [showInputGold, setShowInputGold] = React.useState(false);

    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'gold');
        setGold(value ? value : playerStats.inventory.gold);
    }, [playerStats]);
    
    const handleInputToggleGold = () => {
        setShowInputGold((showInputGold) => !showInputGold);
    };
    
    const handleValueChangeGold = (value) => {
        storage.set(playerStats.name, 'gold', value);
        setGold(value);
    };

    return (
        <div className="clickable" onClick={handleInputToggleGold} onKeyDown={handleInputToggleGold} tabIndex={0}>
            <b>Gold:</b> <HiddenInput handleInputToggle={handleInputToggleGold} handleValueChange={(value) => handleValueChangeGold(value)} showInput={showInputGold} value={gold}></HiddenInput>
        </div>
    )
}

export default CharGold
