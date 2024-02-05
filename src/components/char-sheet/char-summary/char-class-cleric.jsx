/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import HiddenInput from '../../common/hidden-input'

function CharClassCleric({ playerStats }) {
    const [channelDivinityCharges, setChannelDivinityCharges] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let channelDivinityCharges = storage.get(playerStats.name, 'channelDivinityCharges');
        setChannelDivinityCharges(channelDivinityCharges ? channelDivinityCharges : classSpecific.channel_divinity_charges);
    }, [playerStats]);
    const handleChannelDivinityChargesToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleChannelDivinityChargesChange = (channelDivinityCharges) => {
        storage.set(playerStats.name, 'channelDivinityCharges', channelDivinityCharges);
        setChannelDivinityCharges(channelDivinityCharges);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Cleric' && <div>
            <div className="clickable" onClick={handleChannelDivinityChargesToggle} onKeyDown={handleChannelDivinityChargesToggle} tabIndex={0}>
                <b>Channel Divinity Charges:</b> {classSpecific.channel_divinity_charges}/<HiddenInput handleInputToggle={handleChannelDivinityChargesToggle} handleValueChange={(value) => handleChannelDivinityChargesChange(value)} showInput={showInput} value={channelDivinityCharges}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div><b>Destroy Undead Challenge Rating: </b>{classSpecific.destroy_undead_cr}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassCleric
