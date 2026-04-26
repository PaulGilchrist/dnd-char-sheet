/* eslint-disable react/prop-types */
import React from 'react'
import classRules from '../../../services/class-rules-2024'

function CharClassRanger({ playerStats }) {
    const is2024 = playerStats.rules === '2024';
    
    let extraAttacks = 0;
    if(playerStats.level > 4) { // "Extra Attack" class feature at level 5
        extraAttacks = 1;
    }
    
    let favoredEnemiesCount;
    let favoredEnemiesDisplay;
    
    if (is2024) {
        favoredEnemiesCount = classRules.getFavoredEnemy(playerStats);
        favoredEnemiesDisplay = favoredEnemiesCount;
     } else {
        const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
        favoredEnemiesCount = classSpecific.favored_enemies;
        favoredEnemiesDisplay = classSpecific.favored_enemies;
     }
    
    let favoredTerrainCount;
    let favoredTerrainDisplay;
    
    if (!is2024) {
        const classSpecific = playerStats.class.class_levels[playerStats.level-1].class_specific;
        favoredTerrainCount = classSpecific.favored_terrain;
        favoredTerrainDisplay = classSpecific.favored_terrain;
     }
    
    return (<React.Fragment>
          {playerStats.class.name === 'Ranger' && <div>
              <div><b>Fighting Styles: </b>{playerStats.level > 1 ? playerStats.class.fightingStyles.join(', ') : ''}</div>
              <div><b>Extra Attacks: </b>{extraAttacks}</div>
              <div><b>Favored Enemies: </b>{favoredEnemiesDisplay} - {playerStats.class.favoredEnemies.join(',')}</div>
              {!is2024 && <div><b>Favored Terrain: </b>{favoredTerrainDisplay} - {playerStats.class.favoredTerrain.join(',')}</div>}            
          </div>}
      </React.Fragment>)
}

export default CharClassRanger
