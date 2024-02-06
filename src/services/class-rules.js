import { cloneDeep, merge, uniq, uniqBy } from 'lodash';
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
    addFeatures: (levels) => {
        // Ignore the following features because they are already accounted for
        const featuresToIgnore = [
            "Ability Score Improvement",
            "Additional Magical Secrets",
            "Aura improvements",
            "Bard College",
            "Bardic Inspiration",
            "Brutal Critical",
            "Divine Domain",
            "Domain Spells",
            "Druid Circle",
            "Expertise",
            "Extra Attack",
            "Fast Movement",
            "Favored Enemy",
            "Ki",
            "Monastic Tradition",
            "Natural Explorer",
            "Oath Spells",
            "Primal Path",
            "Rage",
            "Sacred Oath",
            "Spellcasting",
            "Unarmored Defense",
            "Unarmored Movement"
        ];
        const actions = [
            "Avenging Angel",
            "Channel Divinity: Charm Animals and Plants",
            "Channel Divinity: Cloak of Shadows",
            "Channel Divinity: Invoke Duplicity",
            "Channel Divinity: Knowledge of the Ages",
            "Channel Divinity: Radiance of the Dawn",
            "Channel Divinity: Read Thoughts",
            "Channel Divinity: Turn Undead",
            "Cleansing Touch",
            "Cloak of Shadows",
            "Corona of Light",
            "Countercharm",
            "Empty Body",
            "Holy Nimbus",
            "Intimidating Presence",
            "Lay on Hands",
            "War Priest",
            "Wholeness of Body"
        ]
        const bonusActions = [
            "Combat Wild Shape",
            "Flurry of Blows",
            "Frenzy",
            "Patient Defense",
            "Second Wind",
            "Step of the Wind"
        ];
        const reactions = [
            "Channel Divinity: War God's Blessing",
            "Cutting Words",
            "Dampen Elements",
            "Deflect Missiles",
            "Retaliation",
            "Slow Fall",
            "Warding Flare",
            "Wrath of the Storm"
        ];
        const categorizedFeatures = {
            actions: [],
            bonusActions: [],
            reactions: [],
            specialActions: []
        }
        levels.forEach(level => {
            level.features.forEach(feature => {
                const featureSummary = {
                    name: feature.name,
                    description: feature.desc
                };
                if(!featuresToIgnore.includes(feature.name)) {
                    if(actions.includes(feature.name) && !categorizedFeatures.actions.some(action => action.name == feature.name)) {
                        categorizedFeatures.actions.push(featureSummary);
                    } else if(bonusActions.includes(feature.name) && !categorizedFeatures.bonusActions.some(bonusAction => bonusAction.name == feature.name)) {
                        categorizedFeatures.bonusActions.push(featureSummary);
                    } else if(reactions.includes(feature.name) && !categorizedFeatures.reactions.some(reaction => reaction.name == feature.name)) {
                        categorizedFeatures.reactions.push(featureSummary);
                    } else if(!categorizedFeatures.specialActions.some(specialAction => specialAction.name == feature.name)) {
                        categorizedFeatures.specialActions.push(featureSummary);
                    }
                }
            });
        });
        return categorizedFeatures;
    },
    getFeatures: (playerStats) => {
        const classLevels = playerStats.class.class_levels.filter(classLevel => classLevel.level <= playerStats.level);
        let features = classRules.addFeatures(classLevels);
        if(playerStats.class.subclass) {
            const subClassLevels = playerStats.class.subclass.class_levels.filter(classLevel => classLevel.level <= playerStats.level);
            const subclassFeatures = classRules.addFeatures(subClassLevels);
            features = {
                actions: uniqBy([...features.actions, ...subclassFeatures.actions], 'name'),
                bonusActions: uniqBy([...features.bonusActions, ...subclassFeatures.bonusActions], 'name'),
                reactions: uniqBy([...features.reactions, ...subclassFeatures.reactions], 'name'),
                specialActions: uniqBy([...features.specialActions, ...subclassFeatures.specialActions], 'name')
            }
        }
        return features;
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