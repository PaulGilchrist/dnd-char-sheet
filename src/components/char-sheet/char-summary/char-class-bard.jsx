/* eslint-disable react/prop-types */
import React from 'react'
import classRules from '../../../services/class-rules'
import storage from '../../../services/local-storage'
import HiddenInput from '../../common/hidden-input'

function CharClassBard({ playerStats }) {
    const [bardicInspirationUses, setBardicInspirationUses] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let bardicInspirationUses = storage.get(playerStats.name, 'bardicInspirationUses');
        setBardicInspirationUses(bardicInspirationUses ? bardicInspirationUses : charisma.bonus);
    }, [playerStats]);
    let extraAttacks = 0;
    if(playerStats.level > 5) { // "Extra Attack" class feature at level 6
        extraAttacks = 1;
    }
    const handleBardicInspirationUsesToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleBardicInspirationUsesChange = (bardicInspirationUses) => {
        storage.set(playerStats.name, 'bardicInspirationUses', bardicInspirationUses);
        setBardicInspirationUses(bardicInspirationUses);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    let subclassMagicalSecrets = 0;
    if(playerStats.class.subclass && playerStats.class.subclass.name === 'Lore' && playerStats.level > 2) {    
        subclassMagicalSecrets = classRules.getHighestSubclassLevel(playerStats).subclass_specific.additional_magical_secrets_max_lvl;
    }
    const charisma = playerStats.abilities.find((ability) => ability.name === 'Charisma');
    return (<React.Fragment>
        {playerStats.class.name === 'Bard' && <div>
            {extraAttacks > 0 && <div><b>Extra Attacks: </b>{extraAttacks}</div>}
            <div>
                <b>Bardic Inspiration Die: </b>d{classSpecific.bardic_inspiration_die}
                <span className="clickable" onClick={handleBardicInspirationUsesToggle} onKeyDown={handleBardicInspirationUsesToggle} tabIndex={0}>
                    &nbsp;&nbsp;<b>Uses:</b> {charisma.bonus}/<HiddenInput handleInputToggle={handleBardicInspirationUsesToggle} handleValueChange={(value) => handleBardicInspirationUsesChange(value)} showInput={showInput} value={bardicInspirationUses}></HiddenInput> <span className="text-muted">(max/cur)</span>
                </span>
            </div>
            <div><b>Song of Rest Die: </b>d{classSpecific.song_of_rest_die}</div>
            <div><b>Magical Secrets: </b>{classSpecific.magical_secrets_max_5 + subclassMagicalSecrets}</div>
            {playerStats.level > 2 && playerStats.class.expertise && <div><b>Expertise: </b>{playerStats.class.expertise.join(', ')}</div>}
        </div>}
    </React.Fragment>)
}

export default CharClassBard
