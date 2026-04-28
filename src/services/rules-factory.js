import rules5e from './rules.js';
import rules2024 from './rules-2024.js';
import raceRules5e from './race-rules.js';
import raceRules2024 from './race-rules-2024.js';
import classRules5e from './class-rules.js';
import classRules2024 from './class-rules-2024.js';

const rulesFactory = {
    getRules: (playerSummary, characterName = 'Unknown') => {
        const rulesType = playerSummary.rules || '5e';
        
        console.log(`[RulesFactory] Processing character: ${characterName}`);
        console.log(`[RulesFactory] Detected ruleset: ${rulesType}`);
        
        let selectedRules;
        switch (rulesType) {
            case '2024':
                selectedRules = {
                    rules: rules2024,
                    raceRules: raceRules2024,
                    classRules: classRules2024
                };
                console.log(`[RulesFactory] Using 2024 rules:`, {
                    hasRules: !!selectedRules.rules,
                    hasRaceRules: !!selectedRules.raceRules,
                    hasClassRules: !!selectedRules.classRules
                });
                break;
            case '5e':
            default:
                selectedRules = {
                    rules: rules5e,
                    raceRules: raceRules5e,
                    classRules: classRules5e
                };
                console.log(`[RulesFactory] Using 5e rules:`, {
                    hasRules: !!selectedRules.rules,
                    hasRaceRules: !!selectedRules.raceRules,
                    hasClassRules: !!selectedRules.classRules
                });
                break;
        }
        
        console.log(`[RulesFactory] Returning rules for: ${characterName}`);
        return selectedRules;
    },
    
    getAbilityLongName: (shortName, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getAbilityLongName called for: ${characterName}, shortName: ${shortName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getAbilityLongName(shortName);
        console.log(`[RulesFactory] getAbilityLongName result: ${result}`);
        return result;
    },
    
        getAbilities: async (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getAbilities called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = await selectedRules.rules.getAbilities(playerStats);
        console.log(`[RulesFactory] getAbilities completed: ${result.length} abilities processed`);
        return result;
    },
    
    getActions: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getActions called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getActions(playerStats);
        console.log(`[RulesFactory] getActions completed:`, {
                    actions: result[0]?.length || 0,
                    bonusActions: result[1]?.length || 0,
                    reactions: result[2]?.length || 0,
                    specialActions: result[3]?.length || 0,
                    characterAdvancement: result[4]?.length || 0
                 });
        return result;
    },
    
    getArmorClass: (allEquipment, playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getArmorClass called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getArmorClass(allEquipment, playerStats);
        console.log(`[RulesFactory] getArmorClass result: ${result[0]} (${result[1]})`);
        return result;
    },
    
    getAttacks: (allEquipment, allSpells, playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getAttacks called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getAttacks(allEquipment, allSpells, playerStats);
        console.log(`[RulesFactory] getAttacks completed: ${result.length} attacks generated`);
        return result;
    },
    
    getHitPoints: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getHitPoints called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getHitPoints(playerStats);
        console.log(`[RulesFactory] getHitPoints result: ${result} HP`);
        return result;
    },
    
    getLanguages: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getLanguages called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getLanguages(playerStats);
        console.log(`[RulesFactory] getLanguages result:`, {
            allowed: result[0],
            languages: result[1]
        });
        return result;
    },
    
    getMagicItems: (allMagicItems, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getMagicItems called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getMagicItems(allMagicItems, playerSummary);
        console.log(`[RulesFactory] getMagicItems result:`, result ? `${result.length} items` : 'no items');
        return result;
    },
    
    getProficiencyChoiceCount: (playerStats, skills, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getProficiencyChoiceCount called for: ${characterName}, skills: ${skills}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getProficiencyChoiceCount(playerStats, skills);
        console.log(`[RulesFactory] getProficiencyChoiceCount result: ${result}`);
        return result;
    },
    
    getProficiencies: (playerStats, skill, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getProficiencies called for: ${characterName}, skill type: ${skill}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getProficiencies(playerStats, skill);
        console.log(`[RulesFactory] getProficiencies result:`, {
            allowed: result[0],
            proficiencies: result[1].length
        });
        return result;
    },
    
    getSpellAbilities: (allSpells, playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getSpellAbilities called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getSpellAbilities(allSpells, playerStats);
        console.log(`[RulesFactory] getSpellAbilities result:`, result ? `${result.spells?.length || 0} spells` : 'no spellcasting');
        return result;
    },
    
    getSpellMaxLevel: (spellAbilities, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getSpellMaxLevel called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.rules.getSpellMaxLevel(spellAbilities);
        console.log(`[RulesFactory] getSpellMaxLevel result: level ${result}`);
        return result;
    },
    
        getDruidMaxWildShapeChallengeRating: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getDruidMaxWildShapeChallengeRating called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.classRules.getDruidMaxWildShapeChallengeRating(playerStats);
        console.log(`[RulesFactory] getDruidMaxWildShapeChallengeRating result: ${result}`);
        return result;
     },
    
    getDruidWildShapeUses: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getDruidWildShapeUses called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.classRules.getDruidWildShapeUses(playerStats);
        console.log(`[RulesFactory] getDruidWildShapeUses result: ${result}`);
        return result;
     },
    
    getDruidBeastKnownForms: (playerStats, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getDruidBeastKnownForms called for: ${characterName}`);
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const result = selectedRules.classRules.getDruidBeastKnownForms(playerStats);
        console.log(`[RulesFactory] getDruidBeastKnownForms result: ${result}`);
        return result;
     },
    
    getDruidBeastFlySpeed: (playerStats, playerSummary) => {
            const characterName = playerSummary.name || 'Unknown';
            console.log(`[RulesFactory] getDruidBeastFlySpeed called for: ${characterName}`);
            const selectedRules = rulesFactory.getRules(playerSummary, characterName);
            const result = selectedRules.classRules.getDruidBeastFlySpeed(playerStats);
            console.log(`[RulesFactory] getDruidBeastFlySpeed result: ${result}`);
            return result;
          },
    
        getRogueSneakAttack: (playerStats, playerSummary) => {
            const characterName = playerSummary.name || 'Unknown';
            console.log(`[RulesFactory] getRogueSneakAttack called for: ${characterName}`);
            const selectedRules = rulesFactory.getRules(playerSummary, characterName);
            const result = selectedRules.classRules.getRogueSneakAttack(playerStats);
            console.log(`[RulesFactory] getRogueSneakAttack result:`, result);
            return result;
          },
    
    
        getPlayerStats: async (allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary) => {
        const characterName = playerSummary.name || 'Unknown';
        console.log(`[RulesFactory] getPlayerStats STARTED for: ${characterName}`);
        console.log(`[RulesFactory] Character data:`, {
            rules: playerSummary.rules || '5e (default)',
            level: playerSummary.level,
            class: playerSummary.class?.name,
            race: playerSummary.race?.name
        });
        
        const selectedRules = rulesFactory.getRules(playerSummary, characterName);
        const { rules, raceRules, classRules } = selectedRules;
        
        console.log(`[RulesFactory] Calling rules.getPlayerStats...`);
        const playerStats = await rules.getPlayerStats(allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary);
        
        console.log(`[RulesFactory] Calling raceRules...`);
        playerStats.immunities = raceRules.getImmunities(playerSummary);
        playerStats.race = raceRules.getRace(allRaces, playerStats);
        playerStats.resistances = raceRules.getResistances(playerSummary);
        playerStats.senses = raceRules.getSenses(playerStats);
        
        console.log(`[RulesFactory] Calling classRules...`);
        playerStats.class = classRules.getClass(allClasses, playerStats);
        
        console.log(`[RulesFactory] getPlayerStats COMPLETED for: ${characterName}`);
        console.log(`[RulesFactory] Final stats:`, {
            abilities: playerStats.abilities?.length || 0,
            hp: playerStats.hitPoints,
            ac: playerStats.armorClass,
            proficiencies: playerStats.proficiencies?.length || 0,
            skills: playerStats.skillProficiencies?.length || 0,
            spells: playerStats.spellAbilities?.spells?.length || 0,
            attacks: playerStats.attacks?.length || 0
        });
        
        return playerStats;
    }
};

export default rulesFactory;