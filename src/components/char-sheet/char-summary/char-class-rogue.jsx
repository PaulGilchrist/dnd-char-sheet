/* eslint-disable react/prop-types */
import React from 'react'

function CharClassRogue({ playerStats }) {
    const sneakAttack = playerStats.class.class_levels[playerStats.level-1].class_specific.sneak_attack;
    return (<React.Fragment>
        {playerStats.class.name === 'Rogue' && <div>
            <div><b>Sneak Attack Damage: </b>+{sneakAttack.dice_count}d{sneakAttack.dice_value}</div>
            <div><b>Expertise: </b>{playerStats.class.expertise.join(', ')}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassRogue
