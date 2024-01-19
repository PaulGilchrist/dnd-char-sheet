/* eslint-disable react/prop-types */
import React from 'react'
import './char-inventory.css'

import storage from '../../services/local-storage'
import HiddenInput from './hidden-input'

function CharInventory({ playerStats }) {
    // const [gold, setGold] = React.useState(0);
    // const [showInputGold, setShowInputGold] = React.useState(false);

    // React.useEffect(() => {
    //     let value = storage.get(playerStats.name, 'gold');
    //     setGold(value ? value : playerStats.inventory.gold);
    // }, [playerStats]);

    // const handleValueChangeGold = (value) => {
    //     storage.set(playerStats.name, 'gold', value);
    //     setGold(value);
    // };
    // const handleInputToggleGold = () => {
    //     setShowInputGold((showInputGold) => !showInputGold);
    // };

    return (
        <div>
            <div className='sectionHeader'>Inventory</div>
            <div><b>Backpack:</b> {playerStats.inventory.backpack.join(', ')}</div>
            <div><b>Equipped:</b> {playerStats.inventory.equipped.join(', ')}</div>
            {/* <div className="clickable" onClick={handleInputToggleGold} onKeyDown={handleInputToggleGold} tabIndex={0}><b>Gold:</b> <HiddenInput handleInputToggle={handleInputToggleGold} handleValueChange={(value) => handleValueChangeGold(value)} showInput={showInputGold} value={gold}></HiddenInput></div> */}
        </div>
    )
}

export default CharInventory
