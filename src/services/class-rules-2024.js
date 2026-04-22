import { cloneDeep, uniqBy } from 'lodash';

const getAbilityLongName = (shortName) => {
    switch (shortName) {
        case 'STR': return 'Strength';
        case 'DEX': return 'Dexterity';
        case 'CON': return 'Constitution';
        case 'INT': return 'Intelligence';
        case 'WIS': return 'Wisdom';
        case 'CHA': return 'Charisma';
    }
};

const classRules = {
    getClass: (allClasses, playerSummary) => {
        let characterClass = cloneDeep(allClasses.find((characterClass) => characterClass.name === playerSummary.class.name));
        
        // Merge with player summary data
        if (playerSummary.class) {
            Object.assign(characterClass, playerSummary.class);
        }
        
        // Handle subclass
        if (playerSummary.class.subclass) {
            const subclass = characterClass.subclasses.find((subclass) => subclass.name === playerSummary.class.subclass.name);
            if (subclass) {
                characterClass.subclass = cloneDeep(subclass);
            } else {
                characterClass.subclass = null;
            }
        } else {
            characterClass.subclass = null;
        }
        
        delete characterClass.subclasses;
        
        // Convert ability names
        if (characterClass.saving_throws) {
            characterClass.saving_throws = characterClass.saving_throws.map((savingThrow) => getAbilityLongName(savingThrow));
        }
        
        return characterClass;
    },
    getDruidMaxWildShapeChallengeRating: (playerStats) => {
        // 2024 Rules: Wild shape may have different mechanics
        let maxWildShapeChallengeRating = playerStats.class.class_levels[playerStats.level-1].class_specific.wild_shape_max_cr;
        
        if(playerStats.class.subclass && playerStats.class.subclass.name === 'Moon' && playerStats.level > 1) {    
            maxWildShapeChallengeRating = 1;
            if(playerStats.level > 5) {
                maxWildShapeChallengeRating = Math.floor(playerStats.level / 3);
            }
        }
        
        return maxWildShapeChallengeRating;
    },
    addFeatures: (levels) => {
        // 2024 Rules: Different feature naming and categorization
        const featuresToIgnore = [
            "Ability Score Improvement",
            "Feat",
            "Spellcasting",
            "Expertise",
            "Fighting Style",
            "Martial Arts",
            "Unarmored Defense",
            "Unarmored Movement",
            "Extra Attack",
            "Action Surge",
            "Second Wind",
            "Bardic Inspiration",
            "Rage",
            "Extra Attack",
            "Spellcasting",
            "Monastic Traditions",
            "Oath Spells",
            "Channel Divinity",
            "Eldritch Invocations",
            "Pact Boon",
            "Warlock Features",
            "Ranger Features",
            "Rogue Features",
            "Paladin Features",
            "Sorcerer Features",
            "Wizard Features",
            "Cleric Features",
            "Druid Features",
            "Barbarian Features",
            "Bard Features",
            "Fighter Features"
        ];
        
        const actions = [
            "Action Surge",
            "Breath Weapon",
            "Channel Divinity",
            "Eldritch Blast",
            "Hex",
            "Witch Bolt"
        ];
        
        const bonusActions = [
            "Cunning Action",
            "Flurry of Blows",
            "Patient Defense",
            "Step of the Wind",
            "Frenzy",
            "Berserker Charge",
            "Second Wind",
            "Fighting Style Bonus"
        ];
        
        const reactions = [
            "Parry",
            " Riposte",
            "Uncanny Dodge",
            "Opportunity Attack",
            "Shield Block",
            "Deflect Missiles",
            "Feather Fall"
        ];
        
        const categorizedFeatures = {
            actions: [],
            bonusActions: [],
            reactions: [],
            specialActions: []
        };
        
        // Go through levels highest to lowest
        for(let i = levels.length-1; i >= 0; i--) {
            levels[i].features.forEach(feature => {
                const featureSummary = {
                    name: feature.name,
                    description: feature.desc,
                    details: feature.details
                };
                
                if(!featuresToIgnore.includes(feature.name)) {
                    if(actions.includes(feature.name) && !categorizedFeatures.actions.some(action => action.name === feature.name)) {
                        categorizedFeatures.actions.push(featureSummary);
                    } else if(bonusActions.includes(feature.name) && !categorizedFeatures.bonusActions.some(bonusAction => bonusAction.name === feature.name)) {
                        categorizedFeatures.bonusActions.push(featureSummary);
                    } else if(reactions.includes(feature.name) && !categorizedFeatures.reactions.some(reaction => reaction.name === feature.name)) {
                        categorizedFeatures.reactions.push(featureSummary);
                    } else if(!categorizedFeatures.specialActions.some(specialAction => specialAction.name === feature.name)) {
                        categorizedFeatures.specialActions.push(featureSummary);
                    }
                }
            });
        }
        
        return categorizedFeatures;
    },
    getFeatures: (playerStats) => {
        // 2024 Rules: Process class and subclass features
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
            };
        }
        
        return features;
    },
    getHighestSubclassLevel: (playerStats) => {
        let subClassLevel = 0;
        
        if(playerStats.class.subclass) {
            for(let i=0; i < playerStats.class.subclass.class_levels.length; i++) {
                if(playerStats.class.subclass.class_levels[i].level > playerStats.level) {
                    break;
                } else {
                    subClassLevel = playerStats.class.subclass.class_levels[i];
                }
            }
        }
        
        return subClassLevel;
    }
};

export default classRules;