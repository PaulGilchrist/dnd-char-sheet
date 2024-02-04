/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../../services/local-storage'
import HiddenInput from './hidden-input'

function CharClassSorcerer({ playerStats }) {
    const [sorceryPoints, setSorceryPoints] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let sorceryPoints = storage.get(playerStats.name, 'sorceryPoints');
        setSorceryPoints(sorceryPoints ? sorceryPoints : classSpecific.sorcery_points);
    }, [playerStats]);
    const handleSorceryPointsToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleSorceryPointsChange = (sorceryPoints) => {
        storage.set(playerStats.name, 'sorceryPoints', sorceryPoints);
        setSorceryPoints(sorceryPoints);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    const creatingSpellSlotCosts = [];
    classSpecific.creating_spell_slots.forEach((creatingSpellSlot) => {
        creatingSpellSlotCosts.push(creatingSpellSlot.sorcery_point_cost) 
    });

    // creating_spell_slots
    return (<React.Fragment>
        {playerStats.class.name === 'Sorcerer' && <div>
            <div className="clickable" onClick={handleSorceryPointsToggle} onKeyDown={handleSorceryPointsToggle} tabIndex={0}>
                <b>Sorcery Points:</b> {classSpecific.sorcery_points}/<HiddenInput handleInputToggle={handleSorceryPointsToggle} handleValueChange={(value) => handleSorceryPointsChange(value)} showInput={showInput} value={sorceryPoints}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div><b>Metamagic Known: </b>{classSpecific.metamagic_known}</div>
            <div><b>Spell Slot (level 1-5) Costs: </b>{creatingSpellSlotCosts.join(', ')}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassSorcerer
