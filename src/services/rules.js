import { cloneDeep, uniqBy } from 'lodash';
import { passiveSkills } from '../data/passive-skills.js';
import { skills } from '../data/skills.js';
import auditRules from './audit-rules'
import classRules from './class-rules'
import raceRules from './race-rules'

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
        // Dependencies: Class, Race, Skill Proficiencies 
        // Sets Abilities, Initiative, and Hit Points
        return playerStats.abilities.map((ability) => {
            const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
            ability.totalScore = ability.baseScore + ability.abilityImprovements + ability.miscBonus + raceRules.getRacialBonus(playerStats, ability.name);
            if((ability.name === 'Strength' || ability.name === 'Constitution') && playerStats.class.name === 'Barbarian' && playerStats.level > 19) {
                ability.totalScore += 4; // Primal Champion
            }
            ability.bonus = Math.floor((ability.totalScore - 10) / 2);
            ability.proficient = playerStats.class.saving_throws.includes(ability.name);
            ability.save = ability.proficient ? ability.bonus + proficiency : ability.bonus;
            ability.skills = skills.filter(skill => skill.ability === ability.name);
            ability.skills = ability.skills.map((skill) => {
                const proficient = playerStats.skillProficiencies.includes(skill.name);
                skill.bonus = proficient ? ability.bonus + proficiency : ability.bonus;
                if (playerStats.expertise && playerStats.expertise.includes(skill.name)) {
                    skill.bonus += proficiency; // Rogues can double their proficiency for two selected areas of expertise
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
            return ability;
        });
    },
    getActions: (playerStats) => {
        // Dependencies: Class, Race
        const features = classRules.getFeatures(playerStats);
        const traits = raceRules.getTraits(playerStats);
        const actions = uniqBy([...playerStats.actions ? playerStats.actions : [], ...features.actions, ...traits.actions], 'name').sort((a, b) => a.name.localeCompare(b.name));
        const bonusActions = uniqBy([...playerStats.bonusActions ? playerStats.bonusActions : [], ...features.bonusActions, ...traits.bonusActions], 'name').sort((a, b) => a.name.localeCompare(b.name));
        const reactions = uniqBy([...playerStats.reactions ? playerStats.reactions : [], ...features.reactions, ...traits.reactions], 'name').sort((a, b) => a.name.localeCompare(b.name));
        const specialActions = uniqBy([...playerStats.specialActions ? playerStats.specialActions : [], ...features.specialActions, ...traits.specialActions], 'name').sort((a, b) => a.name.localeCompare(b.name));
        return [actions, bonusActions, reactions, specialActions];
    },
    getArmorClass: (allEquipment, playerStats) => {
        // Dependencies: Abilities
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
        let contributions = [];
        if(playerStats.class.name === 'Monk') {
            addedBonus += wisdom.bonus;
            contributions.push(`Monk Wisdom Bonus (${wisdom.bonus})`);
        } 
        if(playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Defense')) {
            addedBonus += 1;
            contributions.push(`Fighting Style Defense (1)`);
        }
        let armorClass;
        if(armorName) {
            // Does this item have a magic bonus?
            let magicBonus = 0;
            if(armorName.charAt(0) === '+') {
                magicBonus = Number(armorName.charAt(1));
                contributions.push(`Armor Magic Bonus (${magicBonus})`);
                armorName = armorName.substring(3);
            }
            let armor = allEquipment.find((item) => item.name === armorName);
            armorClass = armor.armor_class.base + addedBonus + magicBonus;
            contributions.push(`Armor (${armor.armor_class.base})`);
            if(armor.armor_class.dex_bonus) {
                let armorBonus = dexterity.bonus;
                contributions.push(`Dexterity Bonus (${dexterity.bonus})`);
                if(armor.armor_class.max_bonus) {
                    armorBonus = Math.min(armor.armor_class.max_bonus, armorBonus);
                }
                armorClass = armor.armor_class.base + armorBonus + addedBonus + magicBonus;
            }
        } else {
            armorClass = 10 + dexterity.bonus + addedBonus// Unarmored
            contributions.push(`Unarmored AC (10) + Dexterity Bonus (${dexterity.bonus})`);
        }
        // Check for an equipped magical shield, and if found increase AC
        let shield = playerStats.inventory.equipped.find(item => item.substring(3) === 'Shield');
        if(shield) {
            const magicBonus = Number(shield.charAt(1))
            armorClass += 2 + magicBonus;
            contributions.push(`Shield (2) + Shield Magic Bonus (${magicBonus})`);
        } else if(playerStats.inventory.equipped.find(item => item === 'Shield')) {
            // Non-magical shield
            armorClass += 2;
            contributions.push(`Shield (2)`);
        }
        // Check for cloak or ring of protection
        if(playerStats.inventory.magicItems && playerStats.inventory.magicItems.some(item => item.name === 'Cloak of Protection')) {
            armorClass += 1;
            contributions.push(`Cloak of Protection (1)`);
        }
        if(playerStats.inventory.magicItems && playerStats.inventory.magicItems.some(item => item.name === 'Ring of Protection')) {
            armorClass += 1;
            contributions.push(`Ring of Protection (1)`);
        }        
        if(playerStats.class.name === 'Barbarian') { // Unarmored Defense
            const barbarianAc = 10 + dexterity.bonus + constitution.bonus;
            if(barbarianAc > armorClass) {
                armorClass = barbarianAc;
                contributions = [`Unarmored AC (10) + Dexterity Bonus (${dexterity.bonus}) + Constitution Bonus (${constitution.bonus})`];
            }
        } else if(playerStats.class.subclass && playerStats.class.subclass.name === 'Draconic') { // Dragon Resilience
            const sorcererAc = 13 + dexterity.bonus;
            if(sorcererAc > armorClass) {
                armorClass = sorcererAc;
                contributions = [`Unarmored AC (13) + Dexterity Bonus (${dexterity.bonus})`];
            }
        }
        return [armorClass, contributions.join(' + ')];
    },
    getAttacks: (allEquipment, allSpells, playerStats) => {
        // Dependencies: Abilities, Spells
        const strength = playerStats.abilities.find((ability) => ability.name === 'Strength');
        const dexterity = playerStats.abilities.find((ability) => ability.name === 'Dexterity');
        const proficiency = Math.floor((playerStats.level - 1) / 4 + 2)
        const attacks = [];
        // Find ranged weapon in the character's equipment and add it to attacks
        let rangedWeaponName = playerStats.inventory.equipped.find(itemName => {
            // Does this item have a magic bonus?
            if (itemName.charAt(0) === "+") {
                itemName = itemName.substring(3);
            }
            let item = allEquipment.find((item) => item.name === itemName);
            if (item) {
                return item.equipment_category === 'Weapon' && item.weapon_range === 'Ranged';
            }
            return false;
        });
        if (rangedWeaponName) {
            let nonMagicalName = rangedWeaponName;
            if (rangedWeaponName.charAt(0) === '+') {
                nonMagicalName = rangedWeaponName.substring(3);
            }
            let rangedWeapon = allEquipment.find((item) => item.name === nonMagicalName);
            let damage = rangedWeapon.damage.damage_dice;
            let damageFormula = `Damage Formula = Weapon (${rangedWeapon.damage.damage_dice})`;
            let toHitBonus = dexterity.bonus + proficiency;
            let hitBonusFormula = `To Hit Bonus Formula = Dexterity Bonus (${dexterity.bonus}) + Proficiency (${proficiency})`;
            // Does this item have a magic bonus?
            if (rangedWeaponName.charAt(0) === '+') {
                let magicBonus = Number(rangedWeaponName.charAt(1));
                damage += `+${dexterity.bonus + magicBonus}`;
                damageFormula += ` + Dexterity Bonus (${dexterity.bonus}) + Weapon Magic Bonus (${magicBonus})`;
                toHitBonus += magicBonus;
                hitBonusFormula += ` + Weapon Magic Bonus (${magicBonus})`;
            } else {
                damage += `+${dexterity.bonus}`;
                damageFormula += ` + Dexterity Bonus (${dexterity.bonus})`;
            }
            if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Archery')) {
                toHitBonus += 2;
                hitBonusFormula += ` + Archery Fighting Style (2)`;
            }
            attacks.push({
                "name": rangedWeaponName,
                "damage": damage,
                "damageType": rangedWeapon.damage.damage_type,
                "damageFormula": damageFormula,
                "hitBonus": toHitBonus,
                "hitBonusFormula": hitBonusFormula,
                "range": rangedWeapon.range.normal,
                "type": "Action"
            });
        }
        // Find main hand weapon in the character's equipment and add it to attacks
        let meleeWeaponNames = playerStats.inventory.equipped.filter(itemName => {
            // Does this item have a magic bonus?
            if (itemName.charAt(0) === '+') {
                itemName = itemName.substring(3);
            }
            let item = allEquipment.find((item) => item.name === itemName);
            if (item) {
                return item.equipment_category === 'Weapon' && item.weapon_range === 'Melee';
            }
            return false;
        });
        if (meleeWeaponNames) {
            let bonus = Math.max(strength.bonus, dexterity.bonus); // Assumes using finesse if dex build
            let nonMagicalName = meleeWeaponNames[0];
            if (meleeWeaponNames[0].charAt(0) === '+') {
                nonMagicalName = meleeWeaponNames[0].substring(3);
            }
            let mainHandWeapon = allEquipment.find((item) => item.name === nonMagicalName);
            let damage = mainHandWeapon.damage.damage_dice;
            let damageFormula = `Damage Formula = Weapon (${mainHandWeapon.damage.damage_dice})`;
            let toHitBonus = bonus + proficiency;
            let hitBonusFormula = `To Hit Bonus Formula = ${strength.bonus > dexterity.bonus ? 'Strength' : 'Dexterity'} Bonus (${bonus}) + Proficiency (${proficiency})`;
            // Does this item have a magic bonus?
            let magicBonus = 0;
            if (meleeWeaponNames[0].charAt(0) === '+') {
                magicBonus = Number(meleeWeaponNames[0].charAt(1));
                damage += `+${bonus + magicBonus}`;
                damageFormula += ` + ${strength.bonus > dexterity.bonus ? 'Strength' : 'Dexterity'} Bonus (${bonus}) + Weapon Magic Bonus (${magicBonus})`;
                toHitBonus += magicBonus;
                hitBonusFormula += ` + Weapon Magic Bonus (${magicBonus})`;
            } else {
                damage += `+${bonus}`;
                damageFormula += ` + ${strength.bonus > dexterity.bonus ? 'Strength' : 'Dexterity'} Bonus (${bonus})`;
            }
            if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Dueling') && meleeWeaponNames.length == 1) { // No dual wielding
                damage += 2;
                damageFormula += ` + Dueling Fighting Style (2)`;
            }
            attacks.push({
                "name": meleeWeaponNames[0],
                "damage": damage,
                "damageType": mainHandWeapon.damage.damage_type,
                "damageFormula": damageFormula,
                "hitBonus": toHitBonus,
                "hitBonusFormula": hitBonusFormula,
                "range": mainHandWeapon.range.normal,
                "type": "Action"
            });
            if (meleeWeaponNames.length > 1) {
                let bonus = Math.max(strength.bonus, dexterity.bonus); // Assumes using finesse if dex build
                let nonMagicalName = meleeWeaponNames[1];
                if (meleeWeaponNames[1].charAt(0) === '+') {
                    nonMagicalName = meleeWeaponNames[1].substring(3);
                }
                let offHandWeapon = allEquipment.find((item) => item.name === nonMagicalName);
                let damage = offHandWeapon.damage.damage_dice;
                let damageFormula = `Damage Formula = Weapon (${offHandWeapon.damage.damage_dice})`;
                let hitBonus = bonus + proficiency;
                let hitBonusFormula = `To Hit Bonus Formula = ${strength.bonus > dexterity.bonus ? 'Strength' : 'Dexterity'} Bonus (${bonus}) + Proficiency (${proficiency})`;
                // There is also an offhand weapon
                magicBonus = 0;
                if (meleeWeaponNames[1].charAt(0) === "+") {
                    magicBonus = Number(meleeWeaponNames[1].charAt(1));
                    damage += `+${magicBonus}`;
                    damageFormula += ` + Weapon Magic Bonus (${magicBonus})`;
                    hitBonus += magicBonus;
                    hitBonusFormula += ` + Weapon Magic Bonus (${magicBonus})`;
                }
                if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Two-Weapon Fighting')) {
                    damage += `+${bonus}`;
                    damageFormula += ` + Two-Weapon Fighting Style (${bonus})`;
                } 
                attacks.push({
                    "name": meleeWeaponNames[1],
                    "damage": damage,
                    "damageType": offHandWeapon.damage.damage_type,
                    "damageFormula": damageFormula,
                    "hitBonus": hitBonus,
                    "hitBonusFormula": hitBonusFormula,
                    "range": offHandWeapon.range.normal,
                    "type": "Bonus Action"
                });
            }
        }
        // If we have a Monk, then their hands are a weapon
        if (playerStats.class.name === 'Monk') {
            const martialArts = playerStats.class.class_levels[playerStats.level - 1].class_specific.martial_arts;
            attacks.push({
                "name": 'Unarmed Strike',
                "damage": `${martialArts.dice_count}d${martialArts.dice_value}+${dexterity.bonus}`,
                "damageType": 'Bludgeoning',
                "damageFormula": `Damage Formula = Monk Open Hand (${martialArts.dice_count}d${martialArts.dice_value}) + Dexterity Bonus (${dexterity.bonus})`,
                "hitBonus": dexterity.bonus + proficiency,
                "hitBonusFormula": `To Hit Bonus Formula = Dexterity Bonus (${dexterity.bonus}) + Proficiency (${proficiency})`,
                "range": 5,
                "type": "Action"
            });
            attacks.push({
                "name": 'Unarmed Strike',
                "damage": `${martialArts.dice_count}d${martialArts.dice_value}+${dexterity.bonus}`,
                "damageType": 'Bludgeoning',
                "damageFormula": `Damage Formula = Monk Open Hand (${martialArts.dice_count}d${martialArts.dice_value}) + Dexterity Bonus (${dexterity.bonus})`,
                "hitBonus": dexterity.bonus + proficiency,
                "hitBonusFormula": `To Hit Bonus Formula = Dexterity Bonus (${dexterity.bonus}) + Proficiency (${proficiency})`,
                "range": 5,
                "type": "Bonus Action"
            });
        }
        // Add spell details
        if (playerStats.spellAbilities) {
            let spells = playerStats.spellAbilities.spells.map(spell => {
                let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
                if (spellDetail) {
                    return { ...spellDetail, prepared: spell.prepared };
                }
                return { ...spell };
            });
            // Find spells that are actions, damage based and prepared and add them to attacks
            spells = spells.filter(spell => spell.damage && (spell.prepared === 'Always' || spell.prepared === 'Prepared'));
            spells.forEach(spell => {
                if (!attacks.find((attack) => attack.name === spell.name)) {
                    let damage = ''
                    if (spell.damage.damage_at_slot_level) {
                        damage = spell.damage.damage_at_slot_level[Object.keys(spell.damage.damage_at_slot_level)[0]];
                    } else if (spell.damage.damage_at_character_level) {
                        damage = spell.damage.damage_at_character_level[Object.keys(spell.damage.damage_at_character_level)[0]];
                    }
                    attacks.push({
                        "name": spell.name,
                        "damage": damage,
                        "damageType": spell.damage.damage_type,
                        "hitBonus": playerStats.spellAbilities.modifier,
                        "range": spell.range,
                        "type": spell.casting_time === "1 action" ? "Action" : "Bonus Action"
                    });
                }
            });
        }
        return attacks;
    },
    getHitPoints: (playerStats) => {
        // Dependencies: Abilities, Class
        const constitution = playerStats.abilities.find((ability) => ability.name === 'Constitution');
        let hitPoints = playerStats.class.hit_die + ((playerStats.class.hit_die / 2 + 1) * (playerStats.level - 1)) + (constitution.bonus * playerStats.level);
        if(playerStats.race.subrace && playerStats.race.subrace.name === "Hill Dwarf") {
            hitPoints += playerStats.level; // Dwarven Toughness
        }
        if(playerStats.class.subclass && playerStats.class.subclass.name === "Draconic") {
            hitPoints += playerStats.level; // Draconic Resilience
        }
        return hitPoints
    },
    getLanguages: (playerStats) => {
        // Dependencies: Class, Race
        let languages = [...playerStats.race.languages];
        let languagesAllowed = languages.length;
        // dndbeyond allows up to 2 languages from the character's backstory (See Acolyte or Sage)
        languagesAllowed += 2;
         switch(playerStats.race.name) {
            case 'Half-Elf':
            case 'Human':
                languagesAllowed += 1;
                break;
        }
        if(playerStats.race.subrace) {
            languages = [...new Set([...languages, ...playerStats.race.subrace.languages])];
            switch(playerStats.race.subrace.name) {
                case 'High Elf':
                    languagesAllowed += 1;
                    break;
            }
        }
        switch(playerStats.class.name) {
            case 'Druid':
                languages.push("Druidic");
                languagesAllowed += 1;
                break;
            case 'Ranger': // Favored Enemies
                languagesAllowed += 1;
                if(playerStats.level > 5) languagesAllowed += 1;
                if(playerStats.level > 13) languagesAllowed += 1;
                break;
            case 'Rogue':
                languages.push("Thieves' Cant");
                languagesAllowed += 1;
                break;
        }
        if(playerStats.class.subclass) {
            switch(playerStats.class.subclass.name) {
                case 'Knowledge': // Blessings of Knowledge
                    languagesAllowed += 1;
                    break;
            }
        }
        if(playerStats.languages) {
            languages = [...new Set([...languages, ...playerStats.languages])];
        }
        return [languagesAllowed, languages.sort()];
    },
    getMagicItems: (allMagicItems, playerSummary) => {
        if(playerSummary.inventory.magicItems) {
            const playerMagicItems = playerSummary.inventory.magicItems.map(playerMagicItem => {
                const magicItem = allMagicItems.find(magicItem => magicItem.name === playerMagicItem.name);
                if(magicItem) {
                    if(magicItem.name === 'Spell Ring' || magicItem.name === 'Spell Scroll') {
                        return {...magicItem, details: magicItem.description, description: playerMagicItem.spell}
                    }
                    return {...magicItem, quantity: playerMagicItem.quantity};
                }
                console.log(playerMagicItem);
                return{...playerMagicItem};
            });
            return playerMagicItems;
        }
        return null;
    },
    getProficiencyChoiceCount: (playerStats, skills = true) => {
        // Dependencies: Class, Race
        let proficiencyChoiceCount = 0;
        playerStats.class.proficiency_choices.forEach((proficiency) => {
            if((skills && proficiency.from[0].startsWith('Skill: ') || (!skills && !proficiency.from[0].startsWith('Skill: ')))) {
                proficiencyChoiceCount += proficiency.choose;
            }
        })
        if(playerStats.race.starting_proficiency_options && ((skills && playerStats.race.starting_proficiency_options.from[0].startsWith('Skill: ')) || (!skills && !playerStats.race.starting_proficiency_options.from[0].startsWith('Skill: ')))) {
            proficiencyChoiceCount += playerStats.race.starting_proficiency_options.choose;
        }
        if(playerStats.race.subrace) {
            playerStats.race.subrace.racial_traits.forEach(racial_trait => {
                if (racial_trait.proficiency_choices && ((skills && racial_trait.proficiency_choices.from[0].startsWith('Skill: ')) || (!skills && !racial_trait.proficiency_choices.from[0].startsWith('Skill: ')))) {
                    proficiencyChoiceCount += racial_trait.proficiency_choices.choose;
                }
            });
        }
        return proficiencyChoiceCount
    },
    getProficiencies: (playerStats, skill = true) => {
        // Dependencies: Class, Race
        let proficienciesAllowed = 0;
        let proficiencies = [...new Set([...playerStats.class.proficiencies, ...playerStats.race.starting_proficiencies])];
        // Race Specific
        playerStats.race.traits.forEach(trait => {
            if (trait.proficiencies.length > 0) {
                proficiencies = [...new Set([...proficiencies, ...trait.proficiencies])];
            }
        });
        if(playerStats.race.subrace) {
            proficiencies = [...new Set([...proficiencies, ...playerStats.race.subrace.starting_proficiencies])];
            playerStats.race.subrace.racial_traits.forEach(racial_trait => {
                if (racial_trait.proficiencies.length > 0) {
                    proficiencies = [...new Set([...proficiencies, ...racial_trait.proficiencies])];
                }
            });
        }
        if(skill) {
            proficiencies = proficiencies.filter((proficiency) => proficiency.startsWith('Skill'));
            proficiencies = proficiencies.map((proficiency) => {
                return proficiency.substring(7);
            });
            // Allowed Count
            proficienciesAllowed = proficiencies.length + 2; // dndbeyond allows one given based on background and another choosen based on background
            // Manually enforced rules
            if(playerStats.class.name === "Bard" && playerStats.level.subclass && playerStats.class.subclass.name === 'Lore') { // Bonus Proficiencies
                proficienciesAllowed += 3;
            } else if(playerStats.class.name === "Cleric") {
                if(playerStats.class.subclass && playerStats.class.subclass.name === 'Knowledge') { // Blessings of Knowledge
                    proficienciesAllowed += 2;
                } else if(playerStats.class.subclass && playerStats.class.subclass.name === 'Nature') { // Acolyte of Nature
                    proficienciesAllowed += 1;
                }
            }
            // Allowed - Both class and race
            proficienciesAllowed += rules.getProficiencyChoiceCount(playerStats, true);
            if(playerStats.skillProficiencies) {
                proficiencies = [...new Set([...proficiencies, ...playerStats.skillProficiencies])];
            }
        } else {
            proficiencies = proficiencies.filter((proficiency) => !proficiency.startsWith('Skill'));
            // Manually enforced rules
            if(playerStats.class.name === "Bard" && playerStats.class.subclass && playerStats.class.subclass.name === 'Valor') {
                proficiencies = [...new Set([...proficiencies, ...['Medium Armor','Shields','Martial Weapons']])];
            } else if(playerStats.class.name === "Cleric" && playerStats.class.subclass) {
                if(playerStats.class.subclass.name === 'Life' || playerStats.class.subclass.name === 'Nature') {
                    proficiencies = [...new Set([...proficiencies, ...['Heavy Armor']])];
                } else if(playerStats.class.subclass.name === 'Tempest' || playerStats.class.subclass.name === 'War') {
                    proficiencies = [...new Set([...proficiencies, ...['Heavy Armor','Martial Weapons']])];
                }
            } else if(playerStats.class.name === "Thief" && playerStats.class.subclass && playerStats.class.subclass.name === 'Assassin') {
                proficiencies = [...new Set([...proficiencies, ...['Disguise Kit',"Poisoner's Kit"]])];
            }
            // Allowed Count
            proficienciesAllowed = proficiencies.length + rules.getProficiencyChoiceCount(playerStats, false);
            if(playerStats.proficiencies) {
                proficiencies = [...new Set([...proficiencies, ...playerStats.proficiencies])];
            }
        }
        return [proficienciesAllowed, proficiencies.sort()];
    },
    getSpellAbilities: (allSpells, playerStats) => {
        // Dependencies: Abilities, Class 
        let spellAbilities = null;
        let spellcasting = playerStats.class.class_levels[playerStats.level - 1].spellcasting;
        if(!spellcasting) {
            spellcasting = classRules.getHighestSubclassLevel(playerStats).spellcasting;
        }
        if(spellcasting) {
            spellAbilities = {...spellcasting};
        }
        if (spellAbilities) {
            if (playerStats.spells) {
                spellAbilities.spells = playerStats.spells.map(spell => {return { name: spell, prepared: ''};})               
                delete playerStats.spells;
                if(playerStats.class.subclass && playerStats.class.subclass.name === 'Arcane Trickster') { // Mage Hand Legerdemain
                    spellAbilities.spells = [...new Set([...spellAbilities.spells, ...['Mage Hand']])];
                    spellAbilities.cantrips_known += 3;                    
                } else if(playerStats.class.subclass && playerStats.class.subclass.name === 'Light') { // Bonus Cantrip
                    spellAbilities.spells = [...new Set([...spellAbilities.spells, ...['Light']])];
                    spellAbilities.cantrips_known += 1;
                } else if(playerStats.class.subclass && playerStats.class.subclass.name === 'Nature') { // Acolyte of Nature
                    spellAbilities.cantrips_known += 1;
                }
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
                        spellAbilities.cantrips_known += 1; // Bonus Cantrip
                        break;
                }
            }
            if(playerStats.class.name === 'Druid' || playerStats.class.name === 'Paladin') {
                spellAbilities.spells_known = null; // All spells known
                let spellMaxLevel = rules.getSpellMaxLevel(spellAbilities);
                allSpells.forEach(spell => {
                    if(spell.level != 0 && spell.level <= spellMaxLevel && spell.classes.includes(playerStats.class.name) && !spellAbilities.spells.find((s) => s.name === spell.name)) {
                        spellAbilities.spells.push({
                            name: spell.name,
                            prepared: ''
                        });
                    }
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
                            if(spellAbilities.spells_known) spellAbilities.spells_known += 1;
                            spellAbilities.spells.push({
                                name: subclassSpell.spell.name,
                                prepared: 'Always'
                            });
                        }
                    }
                });
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
        }
        return spellAbilities;
    },
    getSpellMaxLevel: (spellAbilities) => {
        // playerStats must include full class and race objects from getClass() and getRace() 
        let spellMaxLevel = null;
        if(spellAbilities) {
            if(spellAbilities.spell_slots_level_1 != null && spellAbilities.spell_slots_level_1 > 0) spellMaxLevel = 1;
            if(spellAbilities.spell_slots_level_2 != null && spellAbilities.spell_slots_level_2 > 0) spellMaxLevel = 2;
            if(spellAbilities.spell_slots_level_3 != null && spellAbilities.spell_slots_level_3 > 0) spellMaxLevel = 3;
            if(spellAbilities.spell_slots_level_4 != null && spellAbilities.spell_slots_level_4 > 0) spellMaxLevel = 4;
            if(spellAbilities.spell_slots_level_5 != null && spellAbilities.spell_slots_level_5 > 0) spellMaxLevel = 5;
            if(spellAbilities.spell_slots_level_6 != null && spellAbilities.spell_slots_level_6 > 0) spellMaxLevel = 6;
            if(spellAbilities.spell_slots_level_7 != null && spellAbilities.spell_slots_level_7 > 0) spellMaxLevel = 7;
            if(spellAbilities.spell_slots_level_8 != null && spellAbilities.spell_slots_level_8 > 0) spellMaxLevel = 8;
            if(spellAbilities.spell_slots_level_9 != null && spellAbilities.spell_slots_level_9 > 0) spellMaxLevel = 9;
        }
        return spellMaxLevel;
    },
    getPlayerStats: (allClasses, allEquipment, allMagicItems, allRaces, allSpells, playerSummary) => {
        const playerStats = cloneDeep(playerSummary);
        playerStats.proficiency = Math.floor((playerSummary.level - 1) / 4 + 2);
        playerStats.class = classRules.getClass(allClasses, playerSummary);
        playerStats.immunities = raceRules.getImmunities(playerSummary);
        playerStats.inventory.magicItems = rules.getMagicItems(allMagicItems, playerSummary);
        playerStats.race = raceRules.getRace(allRaces, playerSummary);
        playerStats.resistances = raceRules.getResistances(playerSummary);
        // Dependency on class and race begin here        
        [playerStats.actions, playerStats.bonusActions, playerStats.reactions, playerStats.specialActions] = rules.getActions(playerStats); // Dependencies: Class, Race
        [playerStats.languagesAllowed, playerStats.languages] = rules.getLanguages(playerStats); // Dependencies: Class, Race
        [playerStats.proficienciesAllowed, playerStats.proficiencies] = rules.getProficiencies(playerStats, false); // Dependencies: Class, Race
        [playerStats.skillProficienciesAllowed, playerStats.skillProficiencies] = rules.getProficiencies(playerStats, true); // Dependencies: Class, Race
        playerStats.senses = raceRules.getSenses(playerStats); // Dependencies: Race
        // Dependency on abilities begin here
        playerStats.abilities = rules.getAbilities(playerStats); // Dependencies: Class, Race, Skill Proficiencies        
        playerStats.hitPoints = rules.getHitPoints(playerStats) // Dependencies: Abilities, Class
        playerStats.initiative = playerStats.abilities.find((ability) => ability.name === 'Dexterity').bonus; // Dependencies: Abilities
        [playerStats.armorClass, playerStats.armorClassFormula] = rules.getArmorClass(allEquipment, playerStats); // Dependencies: Abilities
        playerStats.spellAbilities = rules.getSpellAbilities(allSpells, playerStats); // Dependencies: Abilities, Class
        playerStats.attacks = rules.getAttacks(allEquipment, allSpells, playerStats); // Dependencies: Abilities, Spells 
        // Dependency on full player statistics
        playerStats.audits = auditRules.auditPlayerStats(playerStats);
        return playerStats;
    }
}

export default rules