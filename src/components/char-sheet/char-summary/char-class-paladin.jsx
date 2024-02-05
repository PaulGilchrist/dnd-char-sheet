/* eslint-disable react/prop-types */
import React from 'react'

function CharClassPaladin({ playerStats }) {
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    let extraAttacks = 0;
    if(playerStats.level > 4) { // "Extra Attack" class feature at level 5
        extraAttacks = 1;
    }
    return (<React.Fragment>
        {playerStats.class.name === 'Paladin' && <div>
            <div><b>Fighting Styles: </b>{playerStats.fightingStyles.join(', ')}</div>
            <div><b>Extra Attacks: </b>{extraAttacks}</div>
            <div><b>Aura Range: </b>{classSpecific.aura_range}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassPaladin
