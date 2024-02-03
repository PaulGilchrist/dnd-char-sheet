import { passiveSkills } from '../data/passive-skills.js';
import { skills } from '../data/skills.js';
import utils from './utils'

const rules = {
    getAbilityLongName: (shortName) => {
        switch (shortName) {
            case 'STR': return 'Strength';
            case 'DEX': return 'Dexterity';
            case 'CON': return 'Constitution';
            case 'INT': return 'Intelligence';
            case 'WIS': return 'Wisdom';
            case 'CHA': return 'Charisma';
        }
    },
    getAbilities: (playerStats) => {
        // playerStats must include full class and race objects from getClass() and getRace() 
        // playerStats must also already have proficiency determined
        return playerStats.abilities.map((ability) => {
            ability.totalScore = ability.baseScore + ability.abilityImprovements + ability.miscBonus + rules.getRacialBonus(playerStats, ability.name);
            ability.bonus = Math.floor((ability.totalScore - 10) / 2);
            ability.proficient = playerStats.class.saving_throws.includes(ability.name);
            ability.save = ability.proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
            ability.skills = skills.filter(skill => skill.ability === ability.name);
            ability.skills = ability.skills.map((skill) => {
                const proficient = playerStats.skillProficiencies.includes(skill.name);
                skill.bonus = proficient ? ability.bonus + playerStats.proficiency : ability.bonus;
                if (playerStats.expertise && playerStats.expertise.includes(skill.name)) {
                    skill.bonus += playerStats.proficiency; // Rogues can double their proficiency for two selected areas of expertise
                }
                if (passiveSkills.includes(skill.name)) {
                    // Add skill based senses
                    const newSense = {
                        name: `Passive ${skill.name}`,
                        value: 10 + skill.bonus
                    }
                    if (!playerStats.senses.some((sense) => sense.name === newSense.name)) {
                        playerStats.senses.push(newSense);
                    }
                }
                return skill;
            });
            if (ability.name === 'Dexterity') {
                playerStats.initiative = ability.bonus;
            } else if (ability.name === 'Constitution') {
                playerStats.hitPoints = playerStats.class.hit_die + ((playerStats.class.hit_die / 2 + 1) * (playerStats.level - 1)) + (ability.bonus * playerStats.level);
            }
            return ability;
        });
    },
    getClass: (allClasses, playerSummary) => {
        const characterClass = utils.deepCopy(allClasses.find((characterClass) => characterClass.name === playerSummary.class));
        const subclass = characterClass.subclasses.find((subclass) => subclass.name === playerSummary.subclass);
        if (subclass) {
            characterClass.subclass = utils.deepCopy(subclass);
        } else {
            characterClass.subclass = null;
        }
        delete characterClass.subclasses; // We don't need these anymore
        characterClass.saving_throws = characterClass.saving_throws.map((savingThrow) => rules.getAbilityLongName(savingThrow));
        return characterClass;
    },
    getLanguages: (playerStats) => {
        // playerStats must include full class and race objects from getClass() and getRace()
        let languages = [...new Set([...playerStats.languages, ...playerStats.race.languages])];
        if (playerStats.race.subrace) {
            languages = [...new Set([...languages, ...playerStats.race.subrace.languages])];
        }
        if (playerStats.class.name == 'Rogue') {
            languages.push("Thieves' Cant");
        }
        return languages.sort();
    },
    getProficiencies: (playerStats) => {
        // playerStats must include full class and race objects from getClass() and getRace() 
        let proficiencies = [...new Set([...playerStats.class.proficiencies, ...playerStats.race.starting_proficiencies])];
        playerStats.race.traits.forEach(trait => {
            if (trait.proficiencies.length > 0) {
                proficiencies = [...new Set([...proficiencies, ...trait.proficiencies])];
            }
        });
        if (playerStats.race.subrace) {
            proficiencies = [...new Set([...proficiencies, ...playerStats.race.subrace.starting_proficiencies])];
            playerStats.race.subrace.racial_traits.forEach(racial_trait => {
                if (racial_trait.proficiencies.length > 0) {
                    proficiencies = [...new Set([...proficiencies, ...racial_trait.proficiencies])];
                }
            });
        }
        proficiencies = proficiencies.filter((proficiency) => !proficiency.startsWith('Skill'));
        return proficiencies.sort();
    },
    getRace: (allRaces, playerSummary) => {
        const race = utils.deepCopy(allRaces.find((race) => race.name === playerSummary.race));
        race.ability_bonuses = race.ability_bonuses.map((ability_bonus) => {
            ability_bonus.ability_score = rules.getAbilityLongName(ability_bonus.ability_score);
            return ability_bonus;
        });
        const subrace = race.subraces.find((subrace) => subrace.name === playerSummary.subrace);
        if (subrace) {
            race.subrace = utils.deepCopy(subrace);
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
    getSenses: (playerStats) => {
        // playerStats must include full race object from getPlayerRace()
        const senses = [...playerStats.senses];
        const darkvisionInSenses = senses.some((sense) => sense.name === 'Darkvision');
        const darkvisionRace = playerStats.race.traits.some((trait) => trait.name === 'Darkvision');
        if (darkvisionRace && !darkvisionInSenses) {
            senses.push({ name: 'Darkvision', value: '60 ft.' });
        }
        return senses.sort((a, b) => a.name.localeCompare(b.name));
    },
    getSpellAbilities: (allSpells, playerStats) => {
        let spellAbilities = playerStats.class.class_levels[playerStats.level - 1].spellcasting;
        if (!spellAbilities && playerStats.class.subclass) {
            spellAbilities = playerStats.class.subclass.class_levels[playerStats.level - 1].spellcasting;
        }
        if (spellAbilities) {
            if (playerStats.spells) {
                spellAbilities.spells = [...playerStats.spells];
            } else {
                spellAbilities.spells = [];
            }
        }
        if (playerStats.race === 'Tiefling') {
            if (!spellAbilities) {
                spellAbilities = {
                    spellCastingAbility: 'Charisma',
                    spells: []
                }
            }
            // Tieflings get the "Thaumaturgy" cantrip
            const thaumaturgy = spellAbilities.spells.find(spell => spell.name === 'Thaumaturgy');
            if (thaumaturgy) {
                thaumaturgy.prepared = 'Always';
            } else {
                spellAbilities.spells.push({
                    name: 'Thaumaturgy',
                    prepared: 'Always'
                });
            }
            // Tieflings get the hellish rebuke spell at level 3
            if (playerStats.level > 2) {
                const hellishRebuke = spellAbilities.spells.find(spell => spell.name === 'Hellish Rebuke');
                if (hellishRebuke) {
                    hellishRebuke.prepared = 'Always';
                } else {
                    spellAbilities.spells.push({
                        name: 'Hellish Rebuke',
                        prepared: 'Always'
                    });
                }
            }
        } else if (playerStats.subrace === 'High Elf') {
            // High Elf gets one cantrip from the wizard spell list
            if (!spellAbilities) {
                spellAbilities = {
                    spellCastingAbility: 'Intelligence',
                    spells: []
                }
            }
        } else if (playerStats.subrace === 'Forest Gnome') {
            if (!spellAbilities) {
                spellAbilities = {
                    spellCastingAbility: 'Intelligence',
                    spells: []
                }
            }
            // Forest Gnome get the "Minor Illusion" cantrip
            const minorIllusion = spellAbilities.spells.find(spell => spell.name === 'Minor Illusion');
            if (minorIllusion) {
                minorIllusion.prepared = 'Always';
            } else {
                spellAbilities.spells.push({
                    name: 'Minor Illusion',
                    prepared: 'Always'
                });
            }
        }
        if (spellAbilities) {
            // A null for classSpellcasting.cantrips_known means NONE are known
            if (playerStats.race === 'Tiefling' || playerStats.subrace === 'Forest Gnome' || playerStats.subrace === 'High Elf') {
                if (spellAbilities.cantrips_known) {
                    spellAbilities.cantrips_known += 1;
                } else {
                    spellAbilities.cantrips_known = 1;
                }
            }
            if (playerStats.class.spell_casting_ability) {
                spellAbilities.spellCastingAbility = playerStats.class.spell_casting_ability;
            }
            const spellAbility = playerStats.abilities.find(ability => ability.name === spellAbilities.spellCastingAbility);
            spellAbilities.modifier = spellAbility.bonus;
            spellAbilities.toHit = spellAbility.bonus + playerStats.proficiency;
            spellAbilities.saveDc = 8 + spellAbility.bonus + playerStats.proficiency;
            switch (playerStats.class.subclass) {
                case 'Arcane Trickster':
                    spellAbilities.schoolLimits = ['enchantment', 'illusion'];
                    break;
                case 'Eldritch Knight':
                    spellAbilities.schoolLimits = ['abjuration', 'evocation'];
                    break;
            }
            switch (playerStats.class.name) {
                case 'Cleric':
                case 'Druid':
                case 'Wizard':
                    spellAbilities.maxPreparedSpells = spellAbility.bonus + playerStats.level;
                    break;
                case 'Paladin':
                    spellAbilities.maxPreparedSpells = spellAbility.bonus + Math.floor(playerStats.level / 2);
                    break;
                default:
                    // Classes with all spells prepared = Bard, Eldritch Knight Fighter, Ranger, Arcane Trickster Rogue, Sorcerer, Warlock
                    spellAbilities.spells.forEach((spell) => {
                        spell.prepared = 'Always';
                    });
            }
            // Add any subclass spells to known spells and set them to always prepared
            if (playerStats.class.subclass && playerStats.class.subclass.spells) {
                playerStats.class.subclass.spells.forEach((subclassSpell) => {
                    const knownSpell = spellAbilities.spells.find((knownSpell) => knownSpell.name === subclassSpell.spell.name);
                    if (knownSpell) {
                        knownSpell.prepared = 'Always';
                    } else {
                        const levelPrerequisite = subclassSpell.prerequisites[0].name.split(' ')[1];
                        if (playerStats.level >= levelPrerequisite) {
                            spellAbilities.spells.push({
                                name: subclassSpell.spell.name,
                                prepared: 'Always'
                            });
                        }
                    }
                });
            }
            if (spellAbilities.spells.length > 0) {
                spellAbilities.spells = spellAbilities.spells.map(spell => {
                    let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
                    if (spellDetail) {
                        return { ...spellDetail, prepared: spell.prepared };
                    }
                    return { ...spell };
                });
                // Sort by level (ascending) and then by name
                spellAbilities.spells.sort((a, b) => {
                    if (a.level !== b.level) {
                        return a.level - b.level;
                    } else {
                        return a.name.localeCompare(b.name);
                    }
                });
            }
            // A null for classSpellcasting.spells_known means ALL are known
            // spell_slots_level_1 through 9
        }
        return spellAbilities;
    },
    getPlayerStats: (allClasses, allRaces, playerSummary) => {
        const playerStats = utils.deepCopy(playerSummary);
        playerStats.class = rules.getClass(allClasses, playerSummary);
        delete playerStats.subclass; // We don't need this anymore
        playerStats.race = rules.getRace(allRaces, playerSummary);
        delete playerStats.subrace; // We don't need this anymore
        playerStats.proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
        playerStats.abilities = rules.getAbilities(playerStats);
        const constitution = playerStats.abilities.find((ability) => ability.name === 'Constitution');
        playerStats.hitPoints = playerStats.class.hit_die + ((playerStats.class.hit_die / 2 + 1) * (playerStats.level - 1)) + (constitution.bonus * playerStats.level);
        return playerStats;
    }
}

export default rules