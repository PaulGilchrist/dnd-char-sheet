/* eslint-disable react/prop-types */
import React from 'react'

function CharClassRanger({ playerStats }) {
    const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
    let extraAttacks = 0;
    if(playerStats.level > 4) { // "Extra Attack" class feature at level 5
        extraAttacks = 1;
    }
    return (<React.Fragment>
        {playerStats.class.name === 'Ranger' && <div>
            <div><b>Fighting Styles: </b>{playerStats.fightingStyles.join(', ')}</div>
            <div><b>Extra Attacks: </b>{extraAttacks}</div>
            <div><b>Favored Enemies: </b>{classSpecific.favored_enemies} - {playerStats.favoredEnemies.join(',')}</div>
            <div><b>Favored Terrain: </b>{classSpecific.favored_terrain} - {playerStats.favoredTerrain.join(',')}</div>            
        </div>}
    </React.Fragment>)
}

export default CharClassRanger
