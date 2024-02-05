import { cloneDeep, merge } from 'lodash';
import { passiveSkills } from '../data/passive-skills.js';
import { skills } from '../data/skills.js';
import auditRules from './audit-rules'
import classRules from './class-rules'

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
    // getAbilityShortName: (longName) => {
    //     switch (longName) {
    //         case 'Strength': return 'STR';
    //         case 'Dexterity': return 'DEX';
    //         case 'Constitution': return 'CON';
    //         case 'Intelligence': return 'INT';
    //         case 'Wisdom': return 'WIS';
    //         case 'Charisma': return 'CHA';
    //     }
    // },
    getAbilities: (playerStats) => {
        // playerStats must include full class and race objects from getClass() and getRace() 
        // playerStats must also already have skill proficiencies determined
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
    getArmorClass: (allEquipment, playerStats) => {
        // playerStats must include full class from getClass()
        const constitution = playerStats.abilities.find((ability) => ability.name === 'Constitution');
        const dexterity = playerStats.abilities.find((ability) => ability.name === 'Dexterity');
        const wisdom = playerStats.abilities.find((ability) => ability.name === 'Wisdom');
        // Find armor in the character's equipment and calculate Armor Class
        let armorName = playerStats.inventory.equipped.find(itemName => {
            // Does this item have a magic bonus?
            if(itemName.charAt(0) === "+") {
                itemName = itemName.substring(3);
            }        
            let item = allEquipment.find((item) => item.name === itemName);
            if(item) {
                return item.equipment_category === 'Armor';
            }
            return false;
        });
        let addedBonus = 0;
        if(playerStats.class.name === 'Monk') {
            addedBonus += wisdom.bonus;
        } 
        if(playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Defense')) {
            addedBonus += 1;
        }
        let armorClass;
        if(armorName) {
            // Does this item have a magic bonus?
            let magicBonus = 0;
            if(armorName.charAt(0) === '+') {
                magicBonus = Number(armorName.charAt(1));
                armorName = armorName.substring(3);
            }
            let armor = allEquipment.find((item) => item.name === armorName);
            armorClass = armor.armor_class.base + addedBonus + magicBonus;
            if(armor.armor_class.dex_bonus) {
                let armorBonus = dexterity.bonus;
                if(armor.armor_class.max_bonus) {
                    armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
                }
                armorClass = armor.armor_class.base + armorBonus + addedBonus + magicBonus;
            }
        } else {
            armorClass = 10 + dexterity.bonus + addedBonus// Unarmored
        }
        // Check for an equipped magical shield, and if found increase AC
        let shield = playerStats.inventory.equipped.find(item => item.substring(3) === 'Shield');
        if(shield) {
            armorClass += 2 + Number(shield.charAt(1));
        } else if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
            // Non-magical shield
            armorClass += 2;
        }
        // Barbarian may have native AC better than armor based AC due to "Unarmored Defense"
        if(playerStats.class.name === 'Barbarian') {
            const barbarianAc = 10 + dexterity.bonus + constitution.bonus;
            if(barbarianAc > armorClass) {
                armorClass = barbarianAc;
            }
        }         
        return armorClass;
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
    getSkillProficiencies: (playerStats) => {
        // playerStats must include full class and race objects from getClass() and getRace() 
        let skillProficiencies = [
            ...playerStats.class.proficiencies.filter((proficiency) => proficiency.startsWith('Skill: ')),
            ...playerStats.race.starting_proficiencies.filter((proficiency) => proficiency.startsWith('Skill: '))
        ];
        skillProficiencies = skillProficiencies.map((skillProficiency) => {
            return skillProficiency.substring(7);
        });
        let skillProficienciesAllowed = skillProficiencies.length + 2; // dndbeyond allows one given based on background and another choosen based on background
        if(playerStats.race.starting_proficiency_options && playerStats.race.starting_proficiency_options.from[0].startsWith('Skill: ')) {
            skillProficienciesAllowed += playerStats.race.starting_proficiency_options.choose;
        }
        playerStats.class.proficiency_choices.forEach((proficiency) => {
            if(proficiency.from[0].startsWith('Skill: ')) {
                skillProficienciesAllowed += proficiency.choose;
            }
        })
        skillProficiencies = [...new Set([...skillProficiencies, ...playerStats.skillProficiencies])];
        return [skillProficienciesAllowed, skillProficiencies.sort()];
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
        if (playerStats.race.name === 'Tiefling') {
            if (!spellAbilities) {
                spellAbilities = {
                    cantrips_known: 0,
                    spellCastingAbility: 'Charisma',
                    spells: [],
                    spells_known: 0
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
            spellAbilities.cantrips_known += 1;
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
                spellAbilities.spells_known += 1;
            }
        } else if (playerStats.race.subrace && playerStats.race.subrace.name === 'High Elf') {
            // High Elf gets one cantrip from the wizard spell list
            if (!spellAbilities) {
                spellAbilities = {
                    cantrips_known: 0,
                    spellCastingAbility: 'Intelligence',
                    spells: [],
                    spells_known: 0
                }
            }
            spellAbilities.cantrips_known += 1;
        } else if (playerStats.race.subrace && playerStats.race.subrace.name === 'Forest Gnome') {
            if (!spellAbilities) {
                spellAbilities = {
                    cantrips_known: 0,
                    spellCastingAbility: 'Intelligence',
                    spells: [],
                    spells_known: 0
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
            spellAbilities.cantrips_known += 1;
        }
        if (spellAbilities) {
            if (playerStats.class.spell_casting_ability) {
                spellAbilities.spellCastingAbility = playerStats.class.spell_casting_ability;
            }
            const spellAbility = playerStats.abilities.find(ability => ability.name === spellAbilities.spellCastingAbility);
            spellAbilities.modifier = spellAbility.bonus;
            spellAbilities.toHit = spellAbility.bonus + playerStats.proficiency;
            spellAbilities.saveDc = 8 + spellAbility.bonus + playerStats.proficiency;
            // subclass specific adjustments
            if(playerStats.class.subclass) {
                switch (playerStats.class.subclass.name) {
                    case 'Arcane Trickster':
                        spellAbilities.schoolLimits = ['enchantment', 'illusion'];
                        break;
                    case 'Eldritch Knight':
                        spellAbilities.schoolLimits = ['abjuration', 'evocation'];
                        break;
                    case 'Land':
                        spellAbilities.cantrips_known += 1;
                        break;
                }
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
            if (playerStats.level > 2 && playerStats.class.subclass && playerStats.class.subclass.spells) {
                playerStats.class.subclass.spells.forEach((subclassSpell) => {                    
                    const knownSpell = spellAbilities.spells.find((knownSpell) => knownSpell.name === subclassSpell.spell.name);
                    if (knownSpell) {
                        knownSpell.prepared = 'Always';
                    } else {
                        const meetsLevel = (playerStats.level >= subclassSpell.prerequisites[0].index.split('-')[1]);
                        const meetsCircle = (playerStats.class.subclass.name != 'Land' || subclassSpell.prerequisites[1].name.endsWith(playerStats.class.subclass.circle));
                        if (meetsLevel && meetsCircle) {
                            spellAbilities.spells_known += 1;
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
                        return { ...spellDetail, prepared: spellDetail.level === 0 ? 'Always' : spell.prepared };
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
            // A null for spellAbilities.spells_known means ALL are known
            if(playerStats.class.name === "Cleric" || playerStats.class.name === "Druid" || playerStats.class.name === "Paladin") {
                spellAbilities.spells_known = null;
            }
        }
        return spellAbilities;
    },
    getPlayerStats: (allClasses, allEquipment, allRaces, playerSummary) => {
        const playerStats = cloneDeep(playerSummary);
        playerStats.class = classRules.getClass(allClasses, playerSummary);
        playerStats.race = rules.getRace(allRaces, playerSummary);
        playerStats.proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
        [playerStats.skillProficienciesAllowed, playerStats.skillProficiencies] = rules.getSkillProficiencies(playerStats);
        playerStats.abilities = rules.getAbilities(playerStats);
        const constitution = playerStats.abilities.find((ability) => ability.name === 'Constitution');
        playerStats.hitPoints = playerStats.class.hit_die + ((playerStats.class.hit_die / 2 + 1) * (playerStats.level - 1)) + (constitution.bonus * playerStats.level);
        playerStats.armorClass = rules.getArmorClass(allEquipment, playerStats);
        playerStats.warnings = auditRules.auditPlayerStats(playerStats);
        return playerStats;
    }
}

export default rules