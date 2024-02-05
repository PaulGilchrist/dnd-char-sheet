/* eslint-disable react/prop-types */
import React from 'react'
import rules from '../../../services/rules'
import storage from '../../../services/local-storage'
import HiddenInput from '../../common/hidden-input'

function CharClassBard({ playerStats }) {
    const [bardicInspirationUses, setBardicInspirationUses] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let bardicInspirationUses = storage.get(playerStats.name, 'bardicInspirationUses');
        setBardicInspirationUses(bardicInspirationUses ? bardicInspirationUses : charisma.bonus);
    }, [playerStats]);
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
        subclassMagicalSecrets = rules.getHighestSubclassLevel(playerStats).subclass_specific.additional_magical_secrets_max_lvl;
    }
    const charisma = playerStats.abilities.find((ability) => ability.name === 'Charisma');
    return (<React.Fragment>
        {playerStats.class.name === 'Bard' && <div>
            <div><b>Bardic Inspiration Die: </b>d{classSpecific.bardic_inspiration_die}</div>
            <div className="clickable" onClick={handleBardicInspirationUsesToggle} onKeyDown={handleBardicInspirationUsesToggle} tabIndex={0}>
                <b>Bardic Inspiration Uses:</b> {charisma.bonus}/<HiddenInput handleInputToggle={handleBardicInspirationUsesToggle} handleValueChange={(value) => handleBardicInspirationUsesChange(value)} showInput={showInput} value={bardicInspirationUses}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>
            <div><b>Song of Rest Die: </b>d{classSpecific.song_of_rest_die}</div>
            <div><b>Magical Secrets: </b>{classSpecific.magical_secrets_max_5 + subclassMagicalSecrets}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassBard
