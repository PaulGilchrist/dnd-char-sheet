/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/storage'
import HiddenInput from '../../common/hidden-input'

function CharClassFighter({ playerStats }) {
    const [actionSurges, setActionSurges] = React.useState(0);
    const [showActionSurgesInput, setShowActionSurgesInput] = React.useState(false);
    const [indomitableUses, setIndomitableUses] = React.useState(0);
    const [showIndomitableUsesInput, setShowIndomitableUsesInput] = React.useState(false);
    React.useEffect(() => {
        let actionSurges = storage.getProperty(playerStats.name, 'actionSurges');
        setActionSurges(actionSurges ? actionSurges : classSpecific.action_surges);
        let indomitableUses = storage.getProperty(playerStats.name, 'indomitableUses');
        setIndomitableUses(indomitableUses ? indomitableUses : classSpecific.indomitable_uses);
    }, [playerStats]);
    const handleActionSurgesToggle = () => {
        setShowActionSurgesInput((showInput) => !showInput);
    };
    const handleActionSurgesChange = (actionSurges) => {
        storage.setProperty(playerStats.name, 'actionSurges', actionSurges);
        setActionSurges(actionSurges);
    };
    const handleIndomitableUsesToggle = () => {
        setShowIndomitableUsesInput((showInput) => !showInput);
    };
    const handleIndomitableUsesChange = (indomitableUses) => {
        storage.setProperty(playerStats.name, 'indomitableUses', indomitableUses);
        setIndomitableUses(indomitableUses);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Fighter' && <div>
            <div><b>Fighting Styles: </b>{playerStats.class.fightingStyles.join(', ')}</div>
            {playerStats.class.subclass.maneuvers && <div>
                <b>Maneuvers: </b>{playerStats.class.subclass.maneuvers.sort().join(', ')}
            </div>}
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
