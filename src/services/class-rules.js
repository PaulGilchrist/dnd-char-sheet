import { cloneDeep, merge } from 'lodash';
import rules from './rules'

const classRules = {
    getClass: (allClasses, playerSummary) => {
        let characterClass = allClasses.find((characterClass) => characterClass.name === playerSummary.class.name)
        characterClass = merge(cloneDeep(characterClass), cloneDeep(playerSummary.class));
        let subclass = characterClass.subclasses.find((subclass) => subclass.name === playerSummary.class.subclass.name);
        if (subclass) {
            characterClass.subclass = merge(cloneDeep(subclass), cloneDeep(playerSummary.class.subclass));
        } else {
            characterClass.subclass = null;
        }
        delete characterClass.subclasses; // We don't need these anymore
        characterClass.saving_throws = characterClass.saving_throws.map((savingThrow) => rules.getAbilityLongName(savingThrow));
        return characterClass;
    },
    getDruidMaxWildShapeChallengeRating: (playerStats) => {
        let maxWildShapeChallengeRating = playerStats.class.class_levels[playerStats.level-1].class_specific.wild_shape_max_cr;
        if(playerStats.class.subclass && playerStats.class.subclass.name === 'Moon' && playerStats.level > 1) {    
            maxWildShapeChallengeRating = 1;
            if(playerStats.level > 5) {
                maxWildShapeChallengeRating = Math.floor(playerStats.level / 3);
            }
        }
        return maxWildShapeChallengeRating
    },
    getHighestSubclassLevel: (playerStats) => {
        let subClassLevel = null
        for(let i=0; i < playerStats.class.subclass.class_levels.length; i++) {
            if(playerStats.class.subclass.class_levels[i].level > playerStats.level) {
                break;
            } else {
                subClassLevel = playerStats.class.subclass.class_levels[i];
            }
        }
        return subClassLevel
    }
}

export default classRules