/* eslint-disable react/prop-types */
import React from 'react'

function CharClassWarlock({ playerStats }) {
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Warlock' && <div>
            <div><b>Invocations Known: </b>{classSpecific.invocations_known}</div>
            <div><b>Mystic Arcanum (levels 6-9): </b>{classSpecific.mystic_arcanum_level_6}, {classSpecific.mystic_arcanum_level_7}, {classSpecific.mystic_arcanum_level_8}, {classSpecific.mystic_arcanum_level_9}</div>
            {playerStats.class.pactBoon && <div><b>Pact Boon: </b>{playerStats.class.pactBoon}</div>}
            {playerStats.class.eldritchInvocations && playerStats.class.eldritchInvocations.length > 0 && <div><b>Eldritch Invocations: </b>{playerStats.class.eldritchInvocations.join(', ')}</div>}
        </div>}
    </React.Fragment>)
}

export default CharClassWarlock
