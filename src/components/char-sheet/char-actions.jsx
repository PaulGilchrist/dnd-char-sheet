/* eslint-disable react/prop-types */
import React from 'react'
import storage from '../../services/local-storage'
import { actions } from '../../data/actions';
import './char-actions.css'

function CharActions({ allEquipment, allSpells, playerStats }) {
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    const strength = playerStats.abilities.find((ability) => ability.name === 'Strength');
    const dexterity = playerStats.abilities.find((ability) => ability.name === 'Dexterity');
    const attacks = [];
    // Find ranged weapon in the character's equipment and add it to attacks
    let rangedWeaponName = playerStats.inventory.equipped.find(itemName => {
        // Does this item have a magic bonus?
        if(itemName.charAt(0) === "+") {
            itemName = itemName.substring(3);
        }
        let item = allEquipment.find((item) => item.name === itemName);
        if (item) {
            return item.equipment_category === 'Weapon' && item.weapon_range === 'Ranged';
        }
        return false;
    });
    if(rangedWeaponName) {
        // Does this item have a magic bonus?
        let magicBonus = 0;
        if(rangedWeaponName.charAt(0) === '+') {
            magicBonus = Number(rangedWeaponName.charAt(1));
            rangedWeaponName = rangedWeaponName.substring(3);
        }
        let rangedWeapon = allEquipment.find((item) => item.name === rangedWeaponName);
        let toHitBonus = dexterity.bonus + playerStats.proficiency + magicBonus;
        if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Archery')) {
            toHitBonus += 2;
        }
        attacks.push({
            "name": `${magicBonus > 0 ? `+${magicBonus} ` : ''}${rangedWeapon.name}`,
            "damage": `${rangedWeapon.damage.damage_dice}+${dexterity.bonus + magicBonus}`,
            "damageType": rangedWeapon.damage.damage_type,
            "hitBonus": toHitBonus,
            "range": rangedWeapon.range.normal,
            "type": "Action"
        });
    }
    // Find main hand weapon in the character's equipment and add it to attacks
    let meleeWeaponNames = playerStats.inventory.equipped.filter(itemName => {
        // Does this item have a magic bonus?
        if(itemName.charAt(0) === '+') {
            itemName = itemName.substring(3);
        }
        let item = allEquipment.find((item) => item.name === itemName);
        if (item) {
            return item.equipment_category === 'Weapon' && item.weapon_range === 'Melee';
        }
        return false;
    });
    if (meleeWeaponNames) {
        // Does this item have a magic bonus?
        let magicBonus = 0;
        if(meleeWeaponNames[0].charAt(0) === '+') {
            magicBonus = Number(meleeWeaponNames[0].charAt(1));
            meleeWeaponNames[0] = meleeWeaponNames[0].substring(3);
        }
        let mainHandWeapon = allEquipment.find((item) => item.name === meleeWeaponNames[0]);
        let bonus = Math.max(strength.bonus, dexterity.bonus) + magicBonus; // Assumes using finesse if dex build
        let damage = mainHandWeapon.damage.damage_dice;
        if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Dueling') && meleeWeaponNames.length == 1) { // No dual wielding
            damage = mainHandWeapon.damage.damage_dice + 2;
        }
        attacks.push({
            "name": `${magicBonus > 0 ? `+${magicBonus} ` : ''}${mainHandWeapon.name}`,
            "damage": `${damage}+${bonus}`,
            "damageType": mainHandWeapon.damage.damage_type,
            "hitBonus": bonus + playerStats.proficiency,
            "range": mainHandWeapon.range.normal,
            "type": "Action"
        });
        if (meleeWeaponNames.length > 1) {
            // There is also an offhand weapon
            magicBonus = 0;
            if(meleeWeaponNames[1].charAt(0) === "+") {
                magicBonus = Number(meleeWeaponNames[1].charAt(1));
                meleeWeaponNames[1] = meleeWeaponNames[1].substring(3);
            }
            let offHandWeapon = allEquipment.find((item) => item.name === meleeWeaponNames[1]);
            let damage = offHandWeapon.damage.damage_dice;
            if (playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Two-Weapon Fighting')) {
                damage = `${offHandWeapon.damage.damage_dice}+${bonus + magicBonus}`;
            } else if(magicBonus > 0) {
                damage = `${offHandWeapon.damage.damage_dice}+${magicBonus}`;
            }
            attacks.push({
                "name": `${magicBonus > 0 ? `+${magicBonus} ` : ''}${offHandWeapon.name}`,
                "damage": damage,
                "damageType": offHandWeapon.damage.damage_type,
                "hitBonus": bonus + playerStats.proficiency + magicBonus,
                "range": offHandWeapon.range.normal,
                "type": "Bonus Action"
            });
        }
    }
    // If we have a Monk, then their hands are a weapon
    if (playerStats.class.name === 'Monk') {
        const martialArts = playerStats.class.class_levels[playerStats.level-1].class_specific.martial_arts;
        attacks.push({
            "name": 'Unarmed Strike',
            "damage": `${martialArts.dice_count}d${martialArts.dice_value}+${dexterity.bonus}`,
            "damageType": 'Bludgeoning',
            "hitBonus": dexterity.bonus + playerStats.proficiency,
            "range": 5,
            "type": "Action"
        });
        attacks.push({
            "name": 'Unarmed Strike',
            "damage": `${martialArts.dice_count}d${martialArts.dice_value}+${dexterity.bonus}`,
            "damageType": 'Bludgeoning',
            "hitBonus": dexterity.bonus + playerStats.proficiency,
            "range": 5,
            "type": "Bonus Action"
        });
    }
    // Add spell details
    if(playerStats.spellAbilities) {   
        let spells = playerStats.spellAbilities.spells.map(spell => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spell.prepared};
            }
            return {...spell};
        });
        // Find spells that are actions, damage based and prepared and add them to attacks
        spells = spells.filter(spell => spell.damage && (spell.prepared === 'Always' || spell.prepared === 'Prepared'));
        spells.forEach(spell => {
            if(!attacks.find((attack) => attack.name === spell.name)) {
                let damage = ''
                if(spell.damage.damage_at_slot_level) {
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

    return (
        <div>
            <div>
                <span className='sectionHeader'>Actions</span>
                <div className='attacks'>
                    <div className='left'><b>Name</b></div>
                    <div><b>Range</b></div>
                    <div><b>Hit</b></div>
                    <div><b>Damage</b></div>
                    <div className='left'><b>Type</b></div>
                    {attacks.map((attack) => {
                        if (attack.type != 'Action') return '';
                        return <React.Fragment key={attack.name}>
                            <div className='left'>{attack.name}</div>
                            <div>{attack.range} ft.</div>
                            <div>{signFormatter.format(attack.hitBonus)}</div>
                            <div>{attack.damage}</div>
                            <div className='left'>{attack.damageType}</div>
                        </React.Fragment>;
                    })}
                </div>
                <br />
                {playerStats.actions.map((action) => {
                    const html = `<b>${action.name}:</b> ${action.description}`;
                    return <div key={action.name} dangerouslySetInnerHTML={{ __html: html }}></div>;
                })}
                <div><b>Base Actions:</b> {actions.join(', ')}</div>
            </div>
            <div>
                {attacks.find((attack) => attack.type === 'Bonus Action') && <div>
                    <hr />
                    <div className='sectionHeader'>Bonus Actions</div>
                    <div className='attacks'>
                        <div className='left'><b>Name</b></div>
                        <div><b>Range</b></div>
                        <div><b>Hit</b></div>
                        <div><b>Damage</b></div>
                        <div className='left'><b>Type</b></div>
                        {attacks.map((attack) => {
                            if (attack.type != 'Bonus Action') return '';
                            return <React.Fragment key={attack.name}>
                                <div className='left'>{attack.name}</div>
                                <div>{attack.range} ft.</div>
                                <div>{signFormatter.format(attack.hitBonus)}</div>
                                <div>{attack.damage}</div>
                                <div className='left'>{attack.damageType}</div>
                            </React.Fragment>;
                        })}
                    </div>
                </div>}
                {/* No Bonus Action Attacks and only Bonus Actions so the Bonus Actions are the section's header */}
                {!attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <div className='sectionHeader'>Bonus Actions</div>
                </div>}
                {/* Bonus Action Attacks and Bonus Actions so there has already been a section header and the Bonus Actions are a sub section */}
                {attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <br />
                    {(playerStats.bonusActions.length > 0) && <div>
                        {playerStats.bonusActions.map((bonusAction) => {
                            const html = `<b>${bonusAction.name}:</b> ${bonusAction.description}`;
                            return <div key={bonusAction.name} dangerouslySetInnerHTML={{ __html: html }}></div>;
                        })}
                    </div>}
                </div>}
            </div>
        </div>
    )
}

export default CharActions