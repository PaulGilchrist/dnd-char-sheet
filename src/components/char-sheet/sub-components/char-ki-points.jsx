/* eslint-disable react/prop-types */
import React from 'react'

import storage from '../../../services/local-storage'
import HiddenInput from './hidden-input'

function CharKiPoints({ playerStats }) {
    // Value is a Monk's current Ki points
    const [value, setValue] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);

    React.useEffect(() => {
        let value = storage.get(playerStats.name, 'kiPoints');
        if(playerStats.level > 1) {
            setValue(value ? value : playerStats.level);
        }
    }, [playerStats]);
    
    const handleInputToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    
    const handleValueChange = (value) => {
        storage.set(playerStats.name, 'kiPoints', value);
        setValue(value);
    };

    return (
        <div className="clickable" onClick={handleInputToggle} onKeyDown={handleInputToggle} tabIndex={0}>
            <b>Ki Points:</b> {playerStats.level}/<HiddenInput handleInputToggle={handleInputToggle} handleValueChange={(value) => handleValueChange(value)} showInput={showInput} value={value}></HiddenInput> <span className="text-muted">(maximum/current)</span>
        </div>
    )
}

export default CharKiPoints
