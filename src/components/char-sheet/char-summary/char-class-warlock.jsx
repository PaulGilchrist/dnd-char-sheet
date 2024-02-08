/* eslint-disable react/prop-types */
import React from 'react'

function CharClassWarlock({ playerStats }) {
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    return (<React.Fragment>
        {playerStats.class.name === 'Warlock' && <div>
            {playerStats.level > 10 && <React.Fragment>
                <div><b>Arcanums Known (levels 6-9): </b>{classSpecific.mystic_arcanum_level_6}, {classSpecific.mystic_arcanum_level_7}, {classSpecific.mystic_arcanum_level_8}, {classSpecific.mystic_arcanum_level_9}</div>
                {playerStats.class.arcanums && <div>
                    <b>Arcanums: </b>{playerStats.class.arcanums.sort().join(', ')}
                </div>}
            </React.Fragment>}
            <div><b>Invocations Known: </b>{classSpecific.invocations_known}</div>
            {playerStats.class.invocations && <div>
                <b>Invocations: </b>{playerStats.class.invocations.sort().join(', ')}
            </div>}
            {playerStats.class.pactBoon && <div><b>Pact Boon: </b>{playerStats.class.pactBoon}</div>}
            {playerStats.class.eldritchInvocations && playerStats.class.eldritchInvocations.length > 0 && <div><b>Eldritch Invocations: </b>{playerStats.class.eldritchInvocations.join(', ')}</div>}
        </div>}
    </React.Fragment>)
}

export default CharClassWarlock
