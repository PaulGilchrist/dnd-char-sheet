import { passiveSkills } from '../data/passive-skills.js';
import { skills } from '../data/skills.js';

const utils = {
    deepCopy: (obj) => JSON.parse(JSON.stringify(obj)),
    getPlayerStats: (allClasses, playerSummary) => {
        const playerStats = utils.deepCopy(playerSummary);
        playerStats.proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
        playerStats.class = utils.deepCopy(allClasses.find((characterClass) => characterClass.name === playerSummary.class));
        playerStats.class.saving_throws = playerStats.class.saving_throws.map((savingThrow) => {
            switch (savingThrow) {
                case 'STR': return 'Strength';
                case 'DEX': return 'Dexterity';
                case 'CON': return 'Constitution';
                case 'INT': return 'Intelligence';
                case 'WIS': return 'Wisdom';
                case 'CHA': return 'Charisma';
            }
        });
        playerStats.abilities = playerStats.abilities.map((ability) => {
            ability.totalScore = ability.baseScore + ability.abilityImprovements + ability.miscBonus + ability.racialBonus;
            ability.bonus = Math.floor((ability.totalScore - 10) / 2);            
            ability.proficient = playerStats.class.saving_throws.includes(ability.name);
            ability.save = ability.proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
            ability.skills = skills.filter(skill => skill.ability === ability.name);
            ability.skills = ability.skills.map((skill) => {
                const proficient = playerStats.skillProficiencies.includes(skill.name);
                skill.bonus = proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
                if(playerStats.expertise && playerStats.expertise.includes(skill.name)) {
                    skill.bonus += playerStats.proficiency; // Rogues can double their proficiency for two selected areas of expertise
                }
                if (passiveSkills.includes(skill.name)) {
                    // Add skill based senses
                    const newSense = {
                        name: `passive ${skill.name}`,
                        value: 10 + skill.bonus
                    }
                    if (!playerStats.senses.find((sense) => sense.name === newSense.name)) {
                        playerStats.senses.push(newSense);
                    }
                }
                return skill;
            });
            if(ability.name === 'Dexterity') {
                playerStats.initiative = ability.bonus;
            } else if(ability.name === 'Constitution') {
                playerStats.hitPoints = playerStats.class.hit_die + ((playerStats.class.hit_die / 2 + 1) * (playerStats.level - 1)) + (ability.bonus * playerStats.level);
            }
            return ability;
        });
        return playerStats;
    },
    getFirstName: (fullName) => {
        return fullName.split(' ')[0];
    },
    guid: () => {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            // eslint-disable-next-line
			const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	},
}

export default utils