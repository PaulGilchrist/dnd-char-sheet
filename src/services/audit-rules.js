const auditRules = {
    auditAbilityScoreImprovements: (playerStats) => {
        // Warn if the player has not choosen the correct number ability score bonuses and/or feats
        let abilityScoreBonusesUsed = 0;
        playerStats.abilities.forEach(ability => {
            abilityScoreBonusesUsed += ability.abilityImprovements;
        })
        abilityScoreBonusesUsed += (playerStats.feats.length * 2); // One feat can be traded for 2 ability points
        return {
            name: 'Ability Score Improvements',
            allowed: playerStats.class.class_levels[playerStats.level-1].ability_score_bonuses * 2, // two points per bonus
            used: abilityScoreBonusesUsed
        }
    },
    auditAbilityMiscBonuses: (playerStats) => {
        // Warn if the player has not used their ability scores bonuses (like you get with Half-Elf)
        let miscBonusUsed = 0;
        playerStats.abilities.forEach(ability => {
            miscBonusUsed += ability.miscBonus;
        })
        return {
            name: 'Ability Score Misc Bonuses',
            allowed: playerStats.race.ability_bonus_options ? playerStats.race.ability_bonus_options.choose : 0,
            used: miscBonusUsed
        } 
    },
    auditAbilityScoreBase: (playerStats) => {
        // Warn if the player has not choosen the correct number base ability scores 
        let baseAbilityPointsUsed = 0;
        playerStats.abilities.forEach(ability => {
            baseAbilityPointsUsed += ability.baseScore;
        })
        // dndbeyond is inconsistent and has sometimes allowed a total of 72 and other times a total of 71 base score
        // Only alert if off by 2 or more
        return {
            name: 'Ability Score Base Scores',
            allowed: 72, 
            used: baseAbilityPointsUsed

        }
    },
    auditExpertise: (playerStats) => {
        // Warn if the player has not choosen the correct number expertise skills
        if(playerStats.class.name === "Rogue" || (playerStats.class.name === "Bard" && playerStats.level > 2)) {
            let expertiseAllowed = 2;            
            if((playerStats.class.name === "Rogue" && playerStats.level > 5) || (playerStats.class.name === "Bard" && playerStats.level > 9)) {
                expertiseAllowed += 2;            
            }
            return {
                name: 'Expertise',
                allowed: expertiseAllowed, 
                used: playerStats.class.expertise ? playerStats.class.expertise.length : 0
    
            }
        }
        return null;
    },
    auditFightingStyles: (playerStats) => {
        // Warn if the player has not choosen the correct number fighting styles
        let fightingStylesAllowed = 0;
        if(playerStats.class.name === 'Fighter' || (playerStats.class.name === 'Paladin' && playerStats.level > 1) || (playerStats.class.name === 'Ranger' && playerStats.level > 1)) {
            fightingStylesAllowed = 1;
            if(playerStats.class.name === 'Fighter' && playerStats.class.subclass.name === 'Champion' && playerStats.level > 9) {
                fightingStylesAllowed = 2;
            }
            return {
                name: 'Fighting Styles',
                allowed: fightingStylesAllowed, 
                used: playerStats.class.fightingStyles.length    
            }
        }
        return null;
    },
    auditKnownCantrips: (playerStats) => {
        // Warn if the player has not choosen the correct number of cantrips
        if(playerStats.spellAbilities && playerStats.spellAbilities.cantrips_known) {
            const cantrips = playerStats.spellAbilities.spells.filter(spell => spell.level == 0);
            const cantripsFound = cantrips ? cantrips.length : 0;
            return {
                name: 'Known Cantrips',
                allowed: playerStats.spellAbilities.cantrips_known, 
                used: cantripsFound   
            }
        }
        return null;
    },
    auditKnownLanguages: (playerStats) => {
        // Warn if the player has not choosen the correct number of languages
        return {
            name: 'Languages',
            allowed: playerStats.languagesAllowed, 
            used: playerStats.languages.length   
        }
    },
    auditKnownSpells: (playerStats) => {
        // Warn if the player has not choosen the correct number of known spells
        if (playerStats.spellAbilities && playerStats.class.name != 'Druid' && playerStats.class.name != 'Paladin') { // Druids and Paladins know all spells
            return {
                name: 'Known Spells',
                allowed: playerStats.spellAbilities.spells_known, 
                used: playerStats.spellAbilities.spells.filter(spell => spell.level != 0).length   
            }
        }
        return null;
    },
    auditProficiencies: (playerStats) => {
        // Warn if the player has not choosen the correct number of proficiencies
        return {
            name: 'Proficiencies',
            allowed: playerStats.proficienciesAllowed, 
            used: playerStats.proficiencies.length   
        }
    },
    auditSkillProficiencies: (playerStats) => {
        // Warn if the player has not choosen the correct number of skill proficiencies
        return {
            name: 'Skill Proficiencies',
            allowed: playerStats.skillProficienciesAllowed, 
            used: playerStats.skillProficiencies.length   
        }
    },
    auditPlayerStats: (playerStats) => {
        let audits = []
        audits.push(auditRules.auditAbilityScoreImprovements(playerStats));
        audits.push(auditRules.auditAbilityMiscBonuses(playerStats));
        audits.push(auditRules.auditAbilityScoreBase(playerStats));
        audits.push(auditRules.auditExpertise(playerStats));
        audits.push(auditRules.auditFightingStyles(playerStats));
        audits.push(auditRules.auditKnownCantrips(playerStats));
        audits.push(auditRules.auditKnownLanguages(playerStats));
        audits.push(auditRules.auditKnownSpells(playerStats));
        audits.push(auditRules.auditProficiencies(playerStats));
        audits.push(auditRules.auditSkillProficiencies(playerStats));
        audits = audits.filter(item => item !== null);
        audits.forEach(audit => {
            if(audit.allowed !=  audit.used) {
                console.warn(`${audit.name}: Used=${audit.used}, Allowed=${audit.allowed}`)
            }
        });
        return audits;
    }
}

export default auditRules