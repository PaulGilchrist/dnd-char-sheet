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
    getFightingStylesWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number fighting styles
        let fightingStylesAllowed = 0;
        if(playerStats.class.name === 'Fighter' || (playerStats.class.name === 'Paladin' && playerStats.level > 1) || (playerStats.class.name === 'Ranger' && playerStats.level > 1)) {
            fightingStylesAllowed = 1;
            if(playerStats.class.name === 'Fighter' && playerStats.class.subclass.name === 'Champion' && playerStats.level > 9) {
                fightingStylesAllowed = 2;
            }
            let available = fightingStylesAllowed - playerStats.class.fightingStyles.length;
            if(available < 0) {
                return {
                    desc: `${-available} more fighting style${available == -1 ? '' : 's'} then allowed`,
                    type: 'error'
                };
            } else if(available > 0) {
                return {
                    desc: `${available} more fighting style${available == 1 ? '' : 's'} available`,
                    type: 'warning'
                };
            }
        }
        return null;
    },
    getKnownCantripsWarnings: (playerStats) => {
        // Warn if the player has not choosen the correct number of cantrips
        if(playerStats.spellAbilities && playerStats.spellAbilities.cantrips_known) {
            const cantrips = playerStats.spellAbilities.spells.filter(spell => spell.level == 0);
            const cantripsFound = cantrips ? cantrips.length : 0;
            let available = playerStats.spellAbilities.cantrips_known - cantripsFound;
            if(available < 0) {
                return {
                    desc: `${-available} more cantrip${available == -1 ? '' : 's'} then allowed`,
                    type: 'error'
                };
            } else if(available > 0) {
                return {
                    desc: `${available} more cantrip${available == 1 ? '' : 's'} available`,
                    type: 'warning'
                };
            }
        }
        return null;
    },
    getKnownLanguagesWarnings: (playerStats) => {
        // Warn if the player has not choosen the correct number of languages
        let available = playerStats.languagesAllowed - playerStats.languages.length;
        if(available < 0) {
            return {
                desc: `${-available} more language${available == -1 ? '' : 's'} then allowed`,
                type: 'error'
            };
        } else if(available > 0) {
            return {
                desc: `${available} more language${available == 1 ? '' : 's'} available`,
                type: 'warning'
            };
        }
        return null;
    },
    getKnownSpellsWarnings: (playerStats) => {
        // Warn if the player has not choosen the correct number of known spells
        if (playerStats.spellAbilities && playerStats.class.name != 'Druid' && playerStats.class.name != 'Paladin') { // Druids and Paladins know all spells
            let available = playerStats.spellAbilities.spells_known - playerStats.spellAbilities.spells.filter(spell => spell.level != 0).length;
            if(available < 0) {
                return {
                    desc: `${-available} more known spell${available == -1 ? '' : 's'} then allowed`,
                    type: 'error'
                };
            } else if(available > 0) {
                return {
                    desc: `${available} more known spell${available == 1 ? '' : 's'} available`,
                    type: 'warning'
                };
            }
        }
        return null;
    },
    getSkillProficienciesWarning: (playerStats) => {
        // Warn if the player has not choosen the correct number of skill proficiencies
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
        warnings.push(auditRules.getAbilityBonusOptionWarning(playerStats));
        warnings.push(auditRules.getAbilityImprovementsWarning(playerStats));
        warnings.push(auditRules.getBaseAbilitiesWarning(playerStats));
        warnings.push(auditRules.getExpertiseWarning(playerStats));
        warnings.push(auditRules.getFightingStylesWarning(playerStats));
        warnings.push(auditRules.getKnownCantripsWarnings(playerStats));
        warnings.push(auditRules.getKnownLanguagesWarnings(playerStats));
        warnings.push(auditRules.getKnownSpellsWarnings(playerStats));
        warnings.push(auditRules.getSkillProficienciesWarning(playerStats));
        warnings = warnings.filter(item => item !== null);
        warnings.forEach(warning => warning.type === 'error'? console.error(warning.desc) : console.warn(warning.desc));
        return warnings;
    }
}

export default auditRules