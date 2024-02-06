const auditRules = {
    getAbilityImprovementsWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number ability score bonuses and/or feats
        let abilityScoreBonusesUsed = 0;
        playerStats.abilities.forEach(ability => {
            abilityScoreBonusesUsed += ability.abilityImprovements;
        })
        abilityScoreBonusesUsed += (playerStats.feats.length * 2); // One feat can be traded for 2 ability points
        let abilityScoreBonusesAllowed = playerStats.class.class_levels[playerStats.level-1].ability_score_bonuses * 2; // two points per bonus    
        let available = abilityScoreBonusesAllowed - abilityScoreBonusesUsed;
        if(available < 0) {
            return {
                desc: `${-available} more base ability point improvement${available == -1 ? '' : 's'} or feats then allowed`,
                type: 'error'
            };
        } else if(available > 0) {
            return {
                desc: `${available} more base ability point improvement${available == 1 ? '' : 's'} or feats available`,
                type: 'warning'
            };
        }
        return null;
    },
    getAbilityBonusOptionWarning: (playerStats) => {
        // Warn if the player has not used their abilityBonusOptions 
        let miscBonusUsed = 0;
        playerStats.abilities.forEach(ability => {
            miscBonusUsed += ability.miscBonus;
        })
        const abilityBonusOptionsAvailable = playerStats.race.ability_bonus_options ? playerStats.race.ability_bonus_options.choose : 0;
        let available = abilityBonusOptionsAvailable - miscBonusUsed;
        if(available > 0) {
            return {
                desc: `${available} more racial ability bonus point${available == 1 ? '' : 's'} available`,
                type: 'warning'
            };
        }
        return null;
    },
    getBaseAbilitiesWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number base ability scores 
        let baseAbilityPointsUsed = 0;
        playerStats.abilities.forEach(ability => {
            baseAbilityPointsUsed += ability.baseScore;
        })
        // dndbeyond is inconsistent and has sometimes allowed a total of 72 and other times a total of 71 base score
        // Only alert if off by 2 or more
        let available = 72 - baseAbilityPointsUsed; // Point buy system
        if(available < 0) {
            return {
                desc: `${-available} more base ability point${available == -1 ? '' : 's'} then allowed `,
                notes: 'Point buy system. No single ability base score can be below 8 or above 15',
                type: 'error'
            };
        } else if(available > 1) {
            return {
                desc: `${available} more base ability point${available == 1 ? '' : 's'} available`,
                notes: 'Point buy system. No single ability base score can be below 8 or above 15',
                type: 'warning'
            };
        }
        return null;
    },
    getExpertiseWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number expertise skills
        if(playerStats.class.name === "Rogue" || (playerStats.class.name === "Bard" && playerStats.level > 2)) {
            let expertiseAllowed = 2;            
            if((playerStats.class.name === "Rogue" && playerStats.level > 5) || (playerStats.class.name === "Bard" && playerStats.level > 9)) {
                expertiseAllowed += 2;            
            }
            let available = expertiseAllowed - (playerStats.class.expertise ? playerStats.class.expertise.length : 0);
            if(available < 0) {
                return {
                    desc: `${-available} more expertise skill${available == -1 ? '' : 's'} then allowed`,
                    type: 'error'
                };
            } else if(available > 0) {
                return {
                    desc: `${available} more expertise skill${available == 1 ? '' : 's'} available`,
                    type: 'warning'
                };
            }
        }
        return null;
    },
    getSkillProficienciesWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number skill proficiencies
        let available = playerStats.skillProficienciesAllowed - playerStats.skillProficiencies.length;
        if(available < 0) {
            return {
                desc: `${-available} more skill proficienc${available == -1 ? 'y' : 'ies'} then allowed`,
                type: 'error'
            };
        } else if(available > 0) {
            return {
                desc: `${available} more skill proficienc${available == 1 ? 'y' : 'ies'} available`,
                type: 'warning'
            };
        }
        return null;
    },
    auditPlayerStats: (playerStats) => {
        let warnings = []
        warnings.push(auditRules.getSkillProficienciesWarning(playerStats));
        warnings.push(auditRules.getExpertiseWarning(playerStats));
        warnings.push(auditRules.getAbilityBonusOptionWarning(playerStats));
        warnings.push(auditRules.getBaseAbilitiesWarning(playerStats));
        warnings.push(auditRules.getAbilityImprovementsWarning(playerStats));
        // Cantrips known
        // Spells known
        warnings = warnings.filter(item => item !== null);
        warnings.forEach(warning => warning.type === 'error'? console.error(warning.desc) : console.warn(warning.desc));
        return warnings;
    }
}

export default auditRules