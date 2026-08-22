import { getCurrentCombatRound } from '../../encounters/combatData.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { collectWeaponMastery } from '../../combat/automation/automationPassives.js';
import { buildStarryFormLuminousArrow } from './starryFormDamage.js';

/**
 * Strip magic item prefix (+1, +2, +3) from an item name.
 * @param {string} itemName
 * @returns {{ baseName: string, magicBonus: number }}
 */
export function parseMagicItemName(itemName) {
    if (itemName && typeof itemName === 'string' && itemName.charAt(0) === '+') {
        const magicBonus = Number(itemName.charAt(1));
        return {
            baseName: itemName.substring(3),
            magicBonus: isNaN(magicBonus) ? 0 : magicBonus,
        };
    }
    return { baseName: itemName, magicBonus: 0 };
}

/**
 * Parse damage dice string to average value (e.g., "1d8" → 4.5, "2d6" → 7).
 * @param {string} diceStr
 * @returns {number}
 */
export function parseDamageDice(diceStr) {
    const match = String(diceStr).match(/(\d+)d(\d+)/);
    if (!match) return 0;
    const [, count, sides] = match;
    return parseInt(count, 10) * (parseInt(sides, 10) + 1) / 2;
}

/**
 * Find equipped weapon names filtered by range (Melee or Ranged).
 * @param {Array} allEquipment
 * @param {Array} equipped
 * @param {string} weaponRange - 'Melee' or 'Ranged'
 * @returns {string[]}
 */
export function findEquippedWeapons(allEquipment, equipped, weaponRange) {
    if (equipped == null) { console.error('[attackCalc] Missing array:', equipped); throw new Error('Expected array, got ' + equipped); }
    return equipped.filter(itemName => {
        if (!itemName || typeof itemName !== 'string') return false;
        const { baseName } = parseMagicItemName(itemName);
        const item = allEquipment.find(item => item.name === baseName);
        return item && item.equipment_category === 'Weapon' && item.weapon_range === weaponRange;
    });
}

/**
 * Build a weapon attack object from the given parameters.
 * @param {Object} opts
 * @returns {Object} attack
 */
export function buildWeaponAttack(opts) {
    const {
        weapon,
        weaponName,
        abilityBonus,
        abilityName,
        proficiency,
        actionType,
        // Extra damage components (e.g., Dueling +2, Two-Weapon Fighting +bonus)
        extraDamage = '',
        extraDamageLabel = '',
        // Extra hit bonus components (e.g., Archery +2)
        extraHitBonus = 0,
        extraHitBonusLabel = '',
        // When false, skip adding ability bonus to damage string (used for off-hand)
        includeAbilityBonusInDamage = true,
        // Weapon category for automation matching ('melee', 'ranged', 'unarmed', or '')
        weaponType = '',
    } = opts;

    const { magicBonus } = parseMagicItemName(weaponName);

    let damage = weapon.damage.damage_dice;
    let damageFormula = `Damage Formula = Weapon (${weapon.damage.damage_dice})`;

    let toHitBonus = abilityBonus + proficiency;
    let hitBonusFormula = `To Hit Bonus Formula = ${abilityName} Bonus (${abilityBonus}) + Proficiency (${proficiency})`;

    // Calculate the total numeric modifier for display (combines ability, magic, and extra damage)
    let totalDamageModifier = 0;
    if (includeAbilityBonusInDamage) {
        totalDamageModifier += abilityBonus;
    }
    if (magicBonus) {
        totalDamageModifier += magicBonus;
        toHitBonus += magicBonus;
        hitBonusFormula += ` + Weapon Magic Bonus (${magicBonus})`;
    }
    if (extraDamage) {
        const extraMatch = extraDamage.match(/([+-]?\d+)$/);
        if (extraMatch) {
            totalDamageModifier += parseInt(extraMatch[1], 10);
        }
    }

    if (magicBonus || includeAbilityBonusInDamage || extraDamage) {
        damage += `+${totalDamageModifier}`;
    }

    if (magicBonus) {
        if (includeAbilityBonusInDamage) {
            damageFormula += ` + ${abilityName} Bonus (${abilityBonus})`;
        }
        damageFormula += ` + Weapon Magic Bonus (${magicBonus})`;
    } else if (includeAbilityBonusInDamage) {
        damageFormula += ` + ${abilityName} Bonus (${abilityBonus})`;
    }

    if (extraDamage) {
        damageFormula += ` + ${extraDamageLabel}`;
    }

    if (extraHitBonus) {
        toHitBonus += extraHitBonus;
        hitBonusFormula += ` + ${extraHitBonusLabel}`;
    }

    return {
        name: weaponName,
        damage,
        damageType: weapon.damage.damage_type,
        damageFormula,
        hitBonus: toHitBonus,
        hitBonusFormula,
        range: weapon.range.normal,
        type: actionType,
        weaponType,
        mastery: weapon.mastery || null,
        properties: weapon.properties || [],
    };
}

/**
 * Build monk unarmed strike attacks.
 * @param {Object} opts
 * @returns {Object[]} two attack objects (Action and Bonus Action)
 */
export function buildMonkAttacks(opts) {
    const { diceStr, dexterityBonus, proficiency } = opts;

    return [
        {
            name: 'Unarmed Strike',
            damage: `${diceStr}+${dexterityBonus}`,
            damageType: 'Bludgeoning',
            damageFormula: `Damage Formula = Monk Open Hand (${diceStr}) + Dexterity Bonus (${dexterityBonus})`,
            hitBonus: dexterityBonus + proficiency,
            hitBonusFormula: `To Hit Bonus Formula = Dexterity Bonus (${dexterityBonus}) + Proficiency (${proficiency})`,
            range: 5,
            type: 'Action',
            weaponType: 'unarmed',
        },
        {
            name: 'Unarmed Strike',
            damage: `${diceStr}+${dexterityBonus}`,
            damageType: 'Bludgeoning',
            damageFormula: `Damage Formula = Monk Open Hand (${diceStr}) + Dexterity Bonus (${dexterityBonus})`,
            hitBonus: dexterityBonus + proficiency,
            hitBonusFormula: `To Hit Bonus Formula = Dexterity Bonus (${dexterityBonus}) + Proficiency (${proficiency})`,
            range: 5,
            type: 'Bonus Action',
            weaponType: 'unarmed',
        },
    ];
}

/**
 * Build spell attack entries from prepared/always spells.
 * @param {Array} playerSpells - player's spell list with .name and .prepared
 * @param {Array} allSpells - full spell catalog
 * @param {Object} spellAbilities - { modifier }
 * @returns {Object[]}
 */
/**
 * Resolves a spell's damage string at the given character level.
 * Handles both damage_at_slot_level and damage_at_character_level formats.
 * For cantrips (level 0), selects the highest applicable tier.
 * For leveled spells, selects the base tier.
 * @param {Object} spell - The spell object with damage property
 * @param {number} playerLevel - The character's level
 * @returns {string} The resolved damage string (e.g. "1d10" or "8d6")
 */
export function resolveSpellDamageAtLevel(spell, playerLevel) {
    if (!spell || !spell.damage) return '';
    const slotDmg = spell.damage.damage_at_slot_level;
    const charDmg = spell.damage.damage_at_character_level;
    const dmgObj = slotDmg && Object.keys(slotDmg).length ? slotDmg : charDmg;
    if (!dmgObj) return '';
    if (spell.level === 0) {
        const lvls = Object.keys(dmgObj).map(Number).filter(l => l <= playerLevel);
        const bestLevel = lvls.length > 0 ? Math.max(...lvls) : Object.keys(dmgObj)[0];
        return dmgObj[bestLevel];
    }
    return dmgObj[Object.keys(dmgObj)[0]];
}

/**
 * Determines if a spell uses a spell attack or a saving throw.
 * @param {Object} spell - The spell object with dc property
 * @returns {boolean} true if the spell uses a spell attack (no DC)
 */
export function isSpellAttack(spell) {
    return !spell.dc;
}

/**
 * Determines the combat action type from a spell's casting_time.
 * @param {string} castingTime - The spell's casting_time
 * @returns {string} "Action" or "Bonus Action" or null
 */
export function getSpellActionType(castingTime) {
    const actionCastingTimes = ['1 action', '1 Action', 'action', 'Action'];
    const bonusActionCastingTimes = ['1 bonus action', '1 Bonus Action', 'bonus action', 'Bonus Action'];
    if (actionCastingTimes.includes(castingTime)) return 'Action';
    if (bonusActionCastingTimes.includes(castingTime)) return 'Bonus Action';
    return null;
}

/**
 * Build all attack entries for a character (5e rules).
 * @param {Array} allEquipment
 * @param {Array} allSpells
 * @param {Object} playerStats
 * @returns {Object[]}
 */
export function getAttacks(allEquipment, allSpells, playerStats) {
    const strength = playerStats.abilities.find(a => a.name === 'Strength');
    const dexterity = playerStats.abilities.find(a => a.name === 'Dexterity');
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    const attacks = [];
    const fightingStyles = playerStats.class?.fightingStyles != null ? playerStats.class.fightingStyles : [];
    const hasBlessedWarrior = fightingStyles.includes('Blessed Warrior');
    const hasDruidicWarrior = fightingStyles.includes('Druidic Warrior');

    // Ranged weapons
    const rangedWeapons = findEquippedWeapons(allEquipment, playerStats.inventory.equipped, 'Ranged');
    const hasThrownWeaponFighting = fightingStyles.includes('Thrown Weapon Fighting');
    if (rangedWeapons.length > 0) {
        // Separate non-light and light ranged weapons
        const nonLightRanged = rangedWeapons.filter(name => {
            const { baseName } = parseMagicItemName(name);
            const weapon = allEquipment.find(item => item.name === baseName);
            return weapon && !(weapon.properties && weapon.properties.some(p => p.toLowerCase() === 'light'));
        });
        const lightRanged = rangedWeapons.filter(name => {
            const { baseName } = parseMagicItemName(name);
            const weapon = allEquipment.find(item => item.name === baseName);
            return weapon && weapon.properties && weapon.properties.some(p => p.toLowerCase() === 'light');
        });

        // All non-light ranged weapons → Action
        for (const rangedWeaponName of nonLightRanged) {
            const { baseName } = parseMagicItemName(rangedWeaponName);
            const rangedWeapon = allEquipment.find(item => item.name === baseName);
            if (rangedWeapon) {
                const archeryBonus = fightingStyles.includes('Archery') ? 2 : 0;
                const thrownProfBonus = hasThrownWeaponFighting && rangedWeapon.properties && rangedWeapon.properties.some(p => p.toLowerCase() === 'thrown') ? proficiency : 0;
                attacks.push(buildWeaponAttack({
                    weapon: rangedWeapon,
                    weaponName: rangedWeaponName,
                    abilityBonus: dexterity.bonus,
                    abilityName: 'Dexterity',
                    proficiency,
                    actionType: 'Action',
                    extraHitBonus: archeryBonus + thrownProfBonus,
                    extraHitBonusLabel: [
                        archeryBonus ? 'Archery Fighting Style (2)' : '',
                        thrownProfBonus ? 'Thrown Weapon Fighting (Proficiency)' : ''
                    ].filter(Boolean).join(' + ') || '',
                }));
            }
        }

        // Light ranged weapons: < 2 → all Action, >= 2 → highest damage Action, rest Bonus Action
        if (lightRanged.length > 0) {
            const hasCrossbowExpert = (playerStats.feats || []).some(f => f && f.toLowerCase && f.toLowerCase().includes('crossbow expert'));
            if (lightRanged.length < 2) {
                for (const rangedWeaponName of lightRanged) {
                    const { baseName } = parseMagicItemName(rangedWeaponName);
                    const rangedWeapon = allEquipment.find(item => item.name === baseName);
                    if (rangedWeapon) {
                        const archeryBonus = fightingStyles.includes('Archery') ? 2 : 0;
                        const thrownProfBonus = hasThrownWeaponFighting && rangedWeapon.properties && rangedWeapon.properties.some(p => p.toLowerCase() === 'thrown') ? proficiency : 0;
                        attacks.push(buildWeaponAttack({
                            weapon: rangedWeapon,
                            weaponName: rangedWeaponName,
                            abilityBonus: dexterity.bonus,
                            abilityName: 'Dexterity',
                            proficiency,
                            actionType: 'Action',
                            extraHitBonus: archeryBonus + thrownProfBonus,
                            extraHitBonusLabel: [
                                archeryBonus ? 'Archery Fighting Style (2)' : '',
                                thrownProfBonus ? 'Thrown Weapon Fighting (Proficiency)' : ''
                            ].filter(Boolean).join(' + ') || '',
                        }));
                    }
                }
            } else {
                // Find highest damage light ranged weapon
                let bestWeapon = null;
                let bestAvgDamage = -1;
                for (const rangedWeaponName of lightRanged) {
                    const { baseName } = parseMagicItemName(rangedWeaponName);
                    const rangedWeapon = allEquipment.find(item => item.name === baseName);
                    if (rangedWeapon) {
                        const avg = parseDamageDice(rangedWeapon.damage.damage_dice);
                        if (avg > bestAvgDamage) {
                            bestAvgDamage = avg;
                            bestWeapon = { name: rangedWeaponName, weapon: rangedWeapon };
                        }
                    }
                }
                // Highest damage → Action
                if (bestWeapon) {
                    const { name: bestName, weapon: bestWpn } = bestWeapon;
                    const archeryBonus = fightingStyles.includes('Archery') ? 2 : 0;
                    const thrownProfBonus = hasThrownWeaponFighting && bestWpn.properties && bestWpn.properties.some(p => p.toLowerCase() === 'thrown') ? proficiency : 0;
                    attacks.push(buildWeaponAttack({
                        weapon: bestWpn,
                        weaponName: bestName,
                        abilityBonus: dexterity.bonus,
                        abilityName: 'Dexterity',
                        proficiency,
                        actionType: 'Action',
                        extraHitBonus: archeryBonus + thrownProfBonus,
                        extraHitBonusLabel: [
                            archeryBonus ? 'Archery Fighting Style (2)' : '',
                            thrownProfBonus ? 'Thrown Weapon Fighting (Proficiency)' : ''
                        ].filter(Boolean).join(' + ') || '',
                    }));
                }
                // Rest → Bonus Action
                let bestSkipped = false;
                for (const rangedWeaponName of lightRanged) {
                    if (rangedWeaponName === bestWeapon.name && !bestSkipped) {
                        bestSkipped = true;
                        continue;
                    }
                    const { baseName } = parseMagicItemName(rangedWeaponName);
                    const rangedWeapon = allEquipment.find(item => item.name === baseName);
                    if (rangedWeapon) {
                        const isHandCrossbow = baseName === 'Hand Crossbow';
                        const includeAbilityBonus = hasCrossbowExpert && isHandCrossbow;
                        attacks.push(buildWeaponAttack({
                            weapon: rangedWeapon,
                            weaponName: rangedWeaponName,
                            abilityBonus: dexterity.bonus,
                            abilityName: 'Dexterity',
                            proficiency,
                            actionType: 'Bonus Action',
                            weaponType: 'ranged',
                            includeAbilityBonusInDamage: includeAbilityBonus,
                        }));
                    }
                }
            }
        }
    }

    // Thrown Weapon Fighting: treat short swords as thrown weapons for ranged attacks
    if (hasThrownWeaponFighting) {
        const thrownShortSwords = [];
        for (const equippedName of playerStats.inventory.equipped) {
            if (!equippedName || typeof equippedName !== 'string') continue;
            const { baseName } = parseMagicItemName(equippedName);
            const weapon = allEquipment.find(item => item.name === baseName);
            if (weapon && weapon.name === 'Short Sword' && weapon.weapon_range === 'Melee') {
                thrownShortSwords.push({ equippedName, baseName, weapon });
            }
        }
        if (thrownShortSwords.length > 0) {
            const shortSwordData = thrownShortSwords[0];
            const { weapon, equippedName } = shortSwordData;
            const thrownProfBonus = proficiency;
            attacks.push(buildWeaponAttack({
                weapon,
                weaponName: equippedName,
                abilityBonus: dexterity.bonus,
                abilityName: 'Dexterity',
                proficiency,
                actionType: 'Action',
                extraHitBonus: thrownProfBonus,
                extraHitBonusLabel: 'Thrown Weapon Fighting (Proficiency)',
            }));
        }
    }

      // Melee weapons
      const meleeWeaponNames = findEquippedWeapons(allEquipment, playerStats.inventory.equipped, 'Melee');
      if (meleeWeaponNames.length > 0) {
           const bonus = Math.max(strength.bonus, dexterity.bonus);
           const abilityName = strength.bonus > dexterity.bonus ? 'Strength' : 'Dexterity';

           // Separate non-light and light melee weapons
          const nonLightMelee = meleeWeaponNames.filter(name => {
              const { baseName } = parseMagicItemName(name);
              const weapon = allEquipment.find(item => item.name === baseName);
              return weapon && !(weapon.properties && weapon.properties.some(p => p.toLowerCase() === 'light'));
          });
          const lightMelee = meleeWeaponNames.filter(name => {
              const { baseName } = parseMagicItemName(name);
              const weapon = allEquipment.find(item => item.name === baseName);
              return weapon && weapon.properties && weapon.properties.some(p => p.toLowerCase() === 'light');
          });

          // All non-light melee weapons → Action
          for (const meleeWeaponName of nonLightMelee) {
              const { baseName: mainBaseName } = parseMagicItemName(meleeWeaponName);
              const mainHandWeapon = allEquipment.find(item => item.name === mainBaseName);
              if (mainHandWeapon) {
                  const isDueling = fightingStyles.includes('Dueling') && meleeWeaponNames.length === 1 && rangedWeapons.length === 0;
                  const blessedWarriorHitBonus = hasBlessedWarrior ? 2 : 0;
                  const druidicWarriorDamage = hasDruidicWarrior ? '+2' : '';
                  const druidicWarriorLabel = hasDruidicWarrior ? 'Druidic Warrior (2)' : '';
                  const combinedExtraDamage = [isDueling ? '+2' : '', druidicWarriorDamage].filter(Boolean).join(' + ');
                  const combinedExtraDamageLabel = [isDueling ? 'Dueling Fighting Style (2)' : '', druidicWarriorLabel].filter(Boolean).join(' + ') || '';
                  attacks.push(buildWeaponAttack({
                      weapon: mainHandWeapon,
                      weaponName: meleeWeaponName,
                      abilityBonus: bonus,
                      abilityName,
                      proficiency,
                      actionType: 'Action',
                      weaponType: 'melee',
                      extraDamage: combinedExtraDamage,
                      extraDamageLabel: combinedExtraDamageLabel,
                      extraHitBonus: blessedWarriorHitBonus,
                      extraHitBonusLabel: blessedWarriorHitBonus ? 'Blessed Warrior (2)' : '',
                  }));
              }
          }

          // Light melee weapons: < 2 → all Action, >= 2 → highest damage Action, rest Bonus Action
          if (lightMelee.length > 0) {
              const isTwoWeapon = fightingStyles.includes('Two-Weapon Fighting');
              const equippedItems = playerStats.inventory?.equipped || [];
              const hasShield = equippedItems.some(name => {
                  const parsedName = name.includes('(') ? name.substring(0, name.indexOf('(')).trim() : name;
                  return parsedName === 'Shield';
              });

              if (lightMelee.length < 2) {
                  // All light melee weapons → Action
                  for (const meleeWeaponName of lightMelee) {
                      const { baseName: mainBaseName } = parseMagicItemName(meleeWeaponName);
                      const mainHandWeapon = allEquipment.find(item => item.name === mainBaseName);
                      if (mainHandWeapon) {
                          const isDueling = fightingStyles.includes('Dueling') && meleeWeaponNames.length === 1 && rangedWeapons.length === 0;
                          const blessedWarriorHitBonus = hasBlessedWarrior ? 2 : 0;
                          const druidicWarriorDamage = hasDruidicWarrior ? '+2' : '';
                          const druidicWarriorLabel = hasDruidicWarrior ? 'Druidic Warrior (2)' : '';
                          const combinedExtraDamage = [isDueling ? '+2' : '', druidicWarriorDamage].filter(Boolean).join(' + ');
                          const combinedExtraDamageLabel = [isDueling ? 'Dueling Fighting Style (2)' : '', druidicWarriorLabel].filter(Boolean).join(' + ') || '';
                          attacks.push(buildWeaponAttack({
                              weapon: mainHandWeapon,
                              weaponName: meleeWeaponName,
                              abilityBonus: bonus,
                              abilityName,
                              proficiency,
                              actionType: 'Action',
                              weaponType: 'melee',
                              extraDamage: combinedExtraDamage,
                              extraDamageLabel: combinedExtraDamageLabel,
                              extraHitBonus: blessedWarriorHitBonus,
                              extraHitBonusLabel: blessedWarriorHitBonus ? 'Blessed Warrior (2)' : '',
                          }));
                      }
                  }
              } else {
                  // Find highest damage light melee weapon
                  let bestWeapon = null;
                  let bestAvgDamage = -1;
                  for (const meleeWeaponName of lightMelee) {
                      const { baseName } = parseMagicItemName(meleeWeaponName);
                      const weapon = allEquipment.find(item => item.name === baseName);
                      if (weapon) {
                          const avg = parseDamageDice(weapon.damage.damage_dice);
                          if (avg > bestAvgDamage) {
                              bestAvgDamage = avg;
                              bestWeapon = { name: meleeWeaponName, weapon, baseName };
                          }
                      }
                  }

                  // Highest damage → Action
                  if (bestWeapon) {
                      const isDueling = fightingStyles.includes('Dueling') && meleeWeaponNames.length === 1 && rangedWeapons.length === 0;
                      const blessedWarriorHitBonus = hasBlessedWarrior ? 2 : 0;
                      const druidicWarriorDamage = hasDruidicWarrior ? '+2' : '';
                      const druidicWarriorLabel = hasDruidicWarrior ? 'Druidic Warrior (2)' : '';
                      const combinedExtraDamage = [isDueling ? '+2' : '', druidicWarriorDamage].filter(Boolean).join(' + ');
                      const combinedExtraDamageLabel = [isDueling ? 'Dueling Fighting Style (2)' : '', druidicWarriorLabel].filter(Boolean).join(' + ') || '';
                      attacks.push(buildWeaponAttack({
                          weapon: bestWeapon.weapon,
                          weaponName: bestWeapon.name,
                          abilityBonus: bonus,
                          abilityName,
                          proficiency,
                          actionType: 'Action',
                          weaponType: 'melee',
                          extraDamage: combinedExtraDamage,
                          extraDamageLabel: combinedExtraDamageLabel,
                          extraHitBonus: blessedWarriorHitBonus,
                          extraHitBonusLabel: blessedWarriorHitBonus ? 'Blessed Warrior (2)' : '',
                      }));
                  }

                  // Rest → Bonus Action with Nick mastery + Two-Weapon Fighting logic
                  let bestSkipped = false;
                  for (const meleeWeaponName of lightMelee) {
                      if (meleeWeaponName === bestWeapon.name && !bestSkipped) {
                          bestSkipped = true;
                          continue;
                      }
                      const { baseName: offBaseName } = parseMagicItemName(meleeWeaponName);
                      const offHandWeapon = allEquipment.find(item => item.name === offBaseName);
                      if (offHandWeapon) {
                          let actionType = 'Bonus Action';
                          if (playerStats.campaignName) {
                              const nickAvailable = collectWeaponMastery(offBaseName, playerStats);
                              const hasNick = nickAvailable.baseMastery === 'Nick' || (nickAvailable.extraMasteries || []).includes('Nick');
                              if (hasNick) {
                                  const currentRound = getCurrentCombatRound();
                                  const nickUsedRound = getRuntimeValue(playerStats.name, '_Nick_UsedRound', playerStats.campaignName);
                                  if (nickUsedRound === currentRound) {
                                      actionType = 'Action';
                                  }
                              }
                          }

                          // Two-Weapon Fighting: check both weapons are light and no shield equipped
                          // Use the highest damage light weapon as "main hand" for TWF check
                          const mainHandIsLight = bestWeapon?.weapon?.properties && bestWeapon.weapon.properties.some(p => p.toLowerCase() === 'light');
                          const isLightWeapon = true; // All in lightMelee have Light property
                          const appliesTwoWeapon = isTwoWeapon && mainHandIsLight && isLightWeapon && !hasShield;
                          const blessedWarriorOffHandHitBonus = hasBlessedWarrior ? 2 : 0;
                          const druidicWarriorOffHandDamage = hasDruidicWarrior ? '+2' : '';
                          const druidicWarriorOffHandLabel = hasDruidicWarrior ? 'Druidic Warrior (2)' : '';
                          const combinedOffHandExtraDamage = [appliesTwoWeapon ? `+${bonus}` : '', druidicWarriorOffHandDamage].filter(Boolean).join(' + ');
                          const combinedOffHandExtraDamageLabel = [appliesTwoWeapon ? `Two-Weapon Fighting Style (${bonus})` : '', druidicWarriorOffHandLabel].filter(Boolean).join(' + ') || '';
                          attacks.push(buildWeaponAttack({
                              weapon: offHandWeapon,
                              weaponName: meleeWeaponName,
                              abilityBonus: bonus,
                              abilityName,
                              proficiency,
                              actionType,
                              weaponType: 'melee',
                              includeAbilityBonusInDamage: false,
                              extraDamage: combinedOffHandExtraDamage,
                              extraDamageLabel: combinedOffHandExtraDamageLabel,
                              extraHitBonus: blessedWarriorOffHandHitBonus,
                              extraHitBonusLabel: blessedWarriorOffHandHitBonus ? 'Blessed Warrior (2)' : '',
                          }));
                      }
                  }
              }
          }
      }

      // Monk unarmed strikes
     if (playerStats.class?.name === 'Monk') {
         const classLevel = playerStats.class?.class_levels?.[playerStats.level - 1];
         const martialArts = classLevel?.class_specific?.martial_arts;
         if (martialArts) {
             const diceStr = `${martialArts.dice_count}d${martialArts.dice_value}`;
             attacks.push(...buildMonkAttacks({ diceStr, dexterityBonus: dexterity.bonus, proficiency }));
          }
      }

      // Fallback unarmed strike when no weapons are equipped
      if (attacks.length === 0) {
          const strMod = strength?.bonus || 0;
          const blessedWarriorHit = hasBlessedWarrior ? 2 : 0;
          attacks.push({
              name: 'Unarmed Strike',
              damage: `1d4+${strMod}`,
              damageType: 'Bludgeoning',
              damageFormula: `Damage Formula = Unarmed Strike (1d4) + Strength Bonus (${strMod})`,
              hitBonus: strMod + proficiency + blessedWarriorHit,
              hitBonusFormula: `To Hit Bonus Formula = Strength Bonus (${strMod}) + Proficiency (${proficiency})${blessedWarriorHit ? ' + Blessed Warrior (2)' : ''}`,
              range: 5,
              type: 'Action',
              weaponType: 'unarmed',
          });
          // Two-Weapon Fighting: add bonus action unarmed strike when wielding two light weapons
          const hasTwoWeapon = fightingStyles.includes('Two-Weapon Fighting');
          if (hasTwoWeapon) {
              attacks.push({
                  name: 'Unarmed Strike',
                  damage: `1d4+${strMod}`,
                  damageType: 'Bludgeoning',
                  damageFormula: `Damage Formula = Unarmed Strike (1d4) + Strength Bonus (${strMod})`,
                  hitBonus: strMod + proficiency + blessedWarriorHit,
                  hitBonusFormula: `To Hit Bonus Formula = Strength Bonus (${strMod}) + Proficiency (${proficiency})${blessedWarriorHit ? ' + Blessed Warrior (2)' : ''}`,
                  range: 5,
                  type: 'Bonus Action',
                  weaponType: 'unarmed',
              });
          }
       }

      // Starry Form: Archer constellation - ranged spell attack
     const starryArrow = buildStarryFormLuminousArrow(playerStats);
     if (starryArrow) attacks.push(starryArrow);

     return attacks;
}
