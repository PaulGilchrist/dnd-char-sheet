/* eslint-disable react/prop-types */
import React from 'react'
import HiddenInput from '../../common/hidden-input'
import classRules from '../../../services/class-rules'
import storage from '../../../services/local-storage'

function CharClassDruid({ playerStats }) {
    const [wildShapeUses, setWildShapeUses] = React.useState(0);
    const [showInput, setShowInput] = React.useState(false);
    React.useEffect(() => {
        let wildShapeUses = storage.get(playerStats.name, 'wildShapeUses');
        if(playerStats.level > 1) {
            setWildShapeUses(wildShapeUses ? wildShapeUses : 2);
        }
    }, [playerStats]);
    const handleWildShapeUsesToggle = () => {
        setShowInput((showInput) => !showInput);
    };
    const handleWildShapeUsesChange = (wildShapeUses) => {
        storage.set(playerStats.name, 'wildShapeUses', wildShapeUses);
        setWildShapeUses(wildShapeUses);
    };
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    const maxWildShapeChallengeRating = classRules.getDruidMaxWildShapeChallengeRating(playerStats)
    return (<React.Fragment>
        {playerStats.class.name === 'Druid' && <div>
            {playerStats.level < 20 && <div className="clickable" onClick={handleWildShapeUsesToggle} onKeyDown={handleWildShapeUsesToggle} tabIndex={0}>
                <b>Wild Shape Uses:</b> {2}/<HiddenInput handleInputToggle={handleWildShapeUsesToggle} handleValueChange={(value) => handleWildShapeUsesChange(value)} showInput={showInput} value={wildShapeUses}></HiddenInput> <span className="text-muted">(max/cur)</span>
            </div>}
            <div><b>Wild Shape Max Challenge Rating: </b>{maxWildShapeChallengeRating}</div>
            <div><b>Wild Shape Limitations: </b>{classSpecific.wild_shape_fly ? 'walk, swim, or fly' : classSpecific.wild_shape_swim ? 'walk or swim only (no fly)' : 'walk only (no swim or fly)'}</div>
        </div>}
    </React.Fragment>)
}

export default CharClassDruid
