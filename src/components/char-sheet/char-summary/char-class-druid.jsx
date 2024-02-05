/* eslint-disable react/prop-types */
import React from 'react'
import classRules from '../../../services/class-rules'

function CharClassDruid({ playerStats }) {
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    const maxWildShapeChallengeRating = classRules.getDruidMaxWildShapeChallengeRating(playerStats)
    return (<React.Fragment>
        {playerStats.class.name === 'Druid' && <div>
            <div><b>Wild Shape Max Challenge Rating: </b>{maxWildShapeChallengeRating}</div>
            <div><b>Wild Shape Limitations: </b>{classSpecific.wild_shape_fly ? 'walk, swim, or fly' : classSpecific.wild_shape_swim ? 'walk or swim only (no fly)' : 'walk only (no swim or fly)'}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassDruid
