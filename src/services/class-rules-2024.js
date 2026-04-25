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

        // Handle major (subclass in 2024)
        if (playerSummary.class.major) {
           const major = characterClass.majors?.find((major) => major.name === playerSummary.class.major.name);
           if (major) {
               characterClass.major = cloneDeep(major);
            } else {
               characterClass.major = null;
            }
        } else {
           characterClass.major = null;
        }

        delete characterClass.majors;

        // Convert ability names (2024: saving_throw_proficiencies is now an array)
        // 2024 data may already have long names, so only convert if short names are found
        if (characterClass.saving_throw_proficiencies) {
            characterClass.saving_throw_proficiencies = characterClass.saving_throw_proficiencies.map((savingThrow) => {
                const longName = getAbilityLongName(savingThrow);
                return longName || savingThrow; // Keep original if not a short name
            });
        }

        return characterClass;
    },
    getDruidMaxWildShapeChallengeRating: (playerStats) => {
        // 2024 Rules: Wild shape may have different mechanics
        let maxWildShapeChallengeRating = playerStats.class.class_levels[playerStats.level - 1].class_specific.wild_shape_max_cr;

        if (playerStats.class.major && playerStats.class.major.name === 'Moon' && playerStats.level > 1) {
            maxWildShapeChallengeRating = 1;
            if (playerStats.level > 5) {
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
        for (let i = levels.length - 1; i >= 0; i--) {
            levels[i].features.forEach(feature => {
                const featureSummary = {
                    name: feature.name,
                    description: feature.desc,
                    details: feature.details
                };

                if (!featuresToIgnore.includes(feature.name)) {
                    if (actions.includes(feature.name) && !categorizedFeatures.actions.some(action => action.name === feature.name)) {
                        categorizedFeatures.actions.push(featureSummary);
                    } else if (bonusActions.includes(feature.name) && !categorizedFeatures.bonusActions.some(bonusAction => bonusAction.name === feature.name)) {
                        categorizedFeatures.bonusActions.push(featureSummary);
                    } else if (reactions.includes(feature.name) && !categorizedFeatures.reactions.some(reaction => reaction.name === feature.name)) {
                        categorizedFeatures.reactions.push(featureSummary);
                    } else if (!categorizedFeatures.specialActions.some(specialAction => specialAction.name === feature.name)) {
                        categorizedFeatures.specialActions.push(featureSummary);
                    }
                }
            });
        }

        return categorizedFeatures;
    },
    getFeatures: (playerStats) => {
        // 2024 Rules: Process class and major features
        const classLevels = playerStats.class.class_levels.filter(classLevel => classLevel.level <= playerStats.level);
        let features = classRules.addFeatures(classLevels);

                if (playerStats.class.major) {
                    // 2024 majors have features directly with level property, not class_levels
                    const majorFeaturesList = playerStats.class.major.features?.filter(feature => feature.level <= playerStats.level) || [];
                    // Create a dummy level structure for addFeatures
                    const majorLevels = [{ features: majorFeaturesList }];
                    const majorFeatures = classRules.addFeatures(majorLevels);

                    features = {
                        actions: uniqBy([...features.actions, ...majorFeatures.actions], 'name'),
                        bonusActions: uniqBy([...features.bonusActions, ...majorFeatures.bonusActions], 'name'),
                        reactions: uniqBy([...features.reactions, ...majorFeatures.reactions], 'name'),
                        specialActions: uniqBy([...features.specialActions, ...majorFeatures.specialActions], 'name')
                      };
                  }

        return features;
    },
        getHighestMajorLevel: (playerStats) => {
            let highestLevel = 0;

            if (playerStats.class.major) {
                 // 2024 majors have features directly with level property, not class_levels
                const majorFeatures = playerStats.class.major.features || [];
                for (const feature of majorFeatures) {
                    if (feature.level <= playerStats.level && feature.level > highestLevel) {
                        highestLevel = feature.level;
                      }
                  }
              }

            return highestLevel;
          }
};

export default classRules;