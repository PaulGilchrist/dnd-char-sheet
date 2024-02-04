/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import HiddenInput from './hidden-input'

function CharClassFighter({ playerStats }) {
    const [actionSurges, setActionSurges] = React.useState(0);
    const [showActionSurgesInput, setShowActionSurgesInput] = React.useState(false);
    const [indomitableUses, setIndomitableUses] = React.useState(0);
    const [showIndomitableUsesInput, setShowIndomitableUsesInput] = React.useState(false);
    React.useEffect(() => {
        let actionSurges = storage.get(playerStats.name, 'actionSurges');
        setActionSurges(actionSurges ? actionSurges : classSpecific.action_surges);
        let indomitableUses = storage.get(playerStats.name, 'indomitableUses');
        setIndomitableUses(indomitableUses ? indomitableUses : classSpecific.indomitable_uses);
    }, [playerStats]);
    const handleActionSurgesToggle = () => {
        setShowActionSurgesInput((showInput) => !showInput);
    };
    const handleActionSurgesChange = (actionSurges) => {
        storage.set(playerStats.name, 'actionSurges', actionSurges);
        setActionSurges(actionSurges);
    };
    const handleIndomitableUsesToggle = () => {
        setShowIndomitableUsesInput((showInput) => !showInput);
    };
    const handleIndomitableUsesChange = (indomitableUses) => {
        storage.set(playerStats.name, 'indomitableUses', indomitableUses);
        setIndomitableUses(indomitableUses);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Fighter' && <div>
            <div><b>Fighting Styles: </b>{playerStats.fightingStyles.join(', ')}</div>
            <div><b>Extra Attacks: </b>{classSpecific.extra_attacks}</div>
            <div className="clickable" onClick={handleActionSurgesToggle} onKeyDown={handleActionSurgesToggle} tabIndex={0}>
                <b>Action Surges:</b> {classSpecific.action_surges}/<HiddenInput handleInputToggle={handleActionSurgesToggle} handleValueChange={(value) => handleActionSurgesChange(value)} showInput={showActionSurgesInput} value={actionSurges}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div className="clickable" onClick={handleIndomitableUsesToggle} onKeyDown={handleIndomitableUsesToggle} tabIndex={0}>
                <b>Indomitable Uses:</b> {classSpecific.indomitable_uses}/<HiddenInput handleInputToggle={handleIndomitableUsesToggle} handleValueChange={(value) => handleIndomitableUsesChange(value)} showInput={showIndomitableUsesInput} value={indomitableUses}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
        </div>}
    </React.Fragment>)
}

export default CharClassFighter