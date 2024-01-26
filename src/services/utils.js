const utils = {
    getAbility: (playerStats, abilityName) => {
        const ability = {...playerStats.abilities.find((ability) => ability.name === abilityName)}
        ability.totalScore = ability.baseScore + ability.abilityImprovements + ability.miscBonus + ability.racialBonus;
        ability.bonus = Math.floor((ability.totalScore - 10) / 2);
        return ability;
    },
    getClassProficiencies: (characterClass) => {
        return characterClass.saving_throws.map((savingThrow) => {
            switch (savingThrow) {
                case 'STR': return 'Strength';
                case 'DEX': return 'Dexterity';
                case 'CON': return 'Constitution';
                case 'INT': return 'Intelligence';
                case 'WIS': return 'Wisdom';
                case 'CHA': return 'Charisma';
            }
        });
    },
    getFirstName: (fullName) => {
        return fullName.split(' ')[0];
    },
    getProficiency: (playerStats) => {
        return Math.floor((playerStats.level - 1) / 4 + 2);
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