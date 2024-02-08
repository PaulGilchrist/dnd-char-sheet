import { cloneDeep, merge, uniqBy } from 'lodash';
import rules from './rules'

const raceRules = {
    getImmunities: (playerStats) => {
        // playerStats must include full race object from getPlayerRace()
        let immunities = [];
        if(playerStats.race.name === "Elf") {
            immunities.push("Magical Sleep"); // Fey Ancestry
        }
        if(playerStats.class.name === "Monk" && playerStats.level > 9) {
            immunities.push("Disease"); // Purity of Body
            immunities.push("Poison"); // Purity of Body
        }
        if(playerStats.class.name === "Paladin" && playerStats.level > 2) {
            immunities.push("Disease"); // Divine Health
        }
        if(playerStats.immunities) {
            immunities = [...new Set([...immunities, ...playerStats.immunities])];
        }
        return immunities.sort((a, b) => a.name.localeCompare(b.name));
    },
    getRace: (allRaces, playerSummary) => {
        const race = merge(cloneDeep(allRaces.find((race) => race.name === playerSummary.race.name)), cloneDeep(playerSummary.race));
        race.ability_bonuses = race.ability_bonuses.map((ability_bonus) => {
            ability_bonus.ability_score = rules.getAbilityLongName(ability_bonus.ability_score);
            return ability_bonus;
        });
        const subrace = race.subraces.find((subrace) => subrace.name === playerSummary.race.subrace.name);
        if (subrace) {
            race.subrace = merge(cloneDeep(subrace), cloneDeep(playerSummary.subrace));
        } else {
            race.subrace = null;
        }
        delete race.subraces; // We don't need these anymore
        if (race.subrace) {
            race.subrace.ability_bonuses = race.subrace.ability_bonuses.map((ability_bonus) => {
                ability_bonus.ability_score = rules.getAbilityLongName(ability_bonus.ability_score);
                return ability_bonus;
            });
        }
        return race;
    },
    getRacialBonus: (playerStats, abilityName) => {
        // playerStats must include full race object from getPlayerRace() 
        let racialBonus = 0;
        let ability_bonus = playerStats.race.ability_bonuses.find((ability_bonus) => ability_bonus.ability_score == abilityName);
        if (ability_bonus) {
            racialBonus += ability_bonus.bonus;
        }
        if (playerStats.race.subrace) {
            ability_bonus = playerStats.race.subrace.ability_bonuses.find((ability_bonus) => ability_bonus.ability_score == abilityName);
            if (ability_bonus) {
                racialBonus += ability_bonus.bonus;
            }
        }
        return racialBonus;
    },
    getResistances: (playerStats) => {
        // playerStats must include full race object from getPlayerRace()
        let resistances = [];
        if(playerStats.race.name === "Dragonborn") {
            switch(playerStats.race.type) {
                case 'Black': resistances.push("Acid"); break;
                case 'Blue': resistances.push("Lightning"); break;
                case 'Brass': resistances.push("Fire"); break;
                case 'Bronze': resistances.push("Ligntning"); break;
                case 'Copper': resistances.push("Acid"); break;
                case 'Gold': resistances.push("Fire"); break;
                case 'Green': resistances.push("Poison"); break;
                case 'Red': resistances.push("Fire"); break;
                case 'Silver': resistances.push("Cold"); break;
                case 'White': resistances.push("Cold"); break;
            }
        } else if(playerStats.race.name === "Elf") {
            resistances.push("Charm"); // Fey Ancestry
        } else if(playerStats.race.name === "Halfling") {
            resistances.push("Frightened"); // Brave
            if(playerStats.race.subrace && playerStats.race.subrace.name === "Scout Halfling") {
                resistances.push("Poison"); // Scout Resilience
            }
        } else if(playerStats.race.name === "Tiefling") {
            resistances.push("Fire"); // Hellish Resistance
        }
        if(playerStats.resistances) {
            resistances = [...new Set([...resistances, ...playerStats.resistances])];
        }
        return resistances.sort((a, b) => a.name.localeCompare(b.name));
    },
    getSenses: (playerStats) => {
        // playerStats must include full race object from getPlayerRace()
        const senses = playerStats.senses ? [...playerStats.senses] : [];
        const darkvisionInSenses = senses.some((sense) => sense.name === 'Darkvision');
        const darkvisionRace = playerStats.race.traits.some((trait) => trait.name === 'Darkvision');
        if (darkvisionRace && !darkvisionInSenses) {
            senses.push({ name: 'Darkvision', value: '60 ft.' });
        }
        return senses.sort((a, b) => a.name.localeCompare(b.name));
    },
    addTraits: (traits) => {
        // Ignore the following traits because they are already accounted for
        const traitsToIgnore = [
            "Brave",
            "Darkvision",
            "Elf Weapon Training",
            "Fey Ancestry",
            "Fleet of Foot",
            "Scout Resilience"
        ];
        const actions = [
            "Breath Weapon"
        ];
        const bonusActions = [];
        const reactions = [];
        const categorizedTraits = {
            actions: [],
            bonusActions: [],
            reactions: [],
            specialActions: []
        }
        if(traits) {
            traits.forEach(trait => {
                const traitSummary = {
                    name: trait.name,
                    description: trait.desc,
                    details: trait.details
                };
                if(!traitsToIgnore.includes(trait.name)) {
                    if(actions.includes(trait.name) && !categorizedTraits.actions.some(action => action.name == trait.name)) {
                        categorizedTraits.actions.push(traitSummary);
                    } else if(bonusActions.includes(trait.name) && !categorizedTraits.bonusActions.some(bonusAction => bonusAction.name == trait.name)) {
                        categorizedTraits.bonusActions.push(traitSummary);
                    } else if(reactions.includes(trait.name) && !categorizedTraits.reactions.some(reaction => reaction.name == trait.name)) {
                        categorizedTraits.reactions.push(traitSummary);
                    } else if(!categorizedTraits.specialActions.some(specialAction => specialAction.name == trait.name)) {
                        categorizedTraits.specialActions.push(traitSummary);
                    }
                }
            });
        }
        return categorizedTraits;
    },
    getTraits: (playerStats) => {
        let traits = raceRules.addTraits(playerStats.race.traits);
        if(playerStats.race.subrace) {
            const subraceTraits = raceRules.addTraits(playerStats.race.subrace.racial_traits);
            traits = {
                actions: uniqBy([...traits.actions, ...subraceTraits.actions], 'name'),
                bonusActions: uniqBy([...traits.bonusActions, ...subraceTraits.bonusActions], 'name'),
                reactions: uniqBy([...traits.reactions, ...subraceTraits.reactions], 'name'),
                specialActions: uniqBy([...traits.specialActions, ...subraceTraits.specialActions], 'name')
            }
        }
        return traits;
    }
}

export default raceRules