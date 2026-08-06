export function buildStarryFormLuminousArrow(playerStats, activeBuffs) {
    const buffs = Array.isArray(activeBuffs) ? activeBuffs : (playerStats.activeBuffs ?? []);
    const starryFormBuff = buffs.find(b => b.name === 'Starry Form' && b.constellation === 'Archer');
    if (!starryFormBuff) return null;

    const wis = playerStats.abilities.find(a => a.name === 'Wisdom');
    const wisMod = wis?.bonus || 0;
    const level = playerStats.level || 1;
    const isTwinkled = level >= 10;
    const damageDice = isTwinkled ? '2d8' : '1d8';
    const spellAttackMod = playerStats.spellAbilities?.toHit || 0;
    const damageFormula = `${damageDice}+${wisMod}`;
    return {
        name: 'Starry Form: Luminous Arrow',
        attackType: 'spell',
        isRanged: true,
        range: '120_ft',
        toHit: spellAttackMod,
        hitBonus: spellAttackMod,
        hitBonusFormula: `To Hit Bonus = Wisdom Modifier (${wisMod}) + Proficiency (${playerStats.proficiency || 0})`,
        damage: damageFormula,
        damageType: 'Radiant',
        damageFormula: `Damage Formula = ${damageDice} + Wisdom Modifier (${wisMod})`,
        damage_dice: damageDice,
        damage_at_character_level: { [level]: `${damageDice} + ${wisMod}` },
        autoDamageFormula: damageFormula,
        autoDamageName: 'Starry Form: Luminous Arrow',
        abilityName: 'Wisdom',
        actionType: 'Bonus Action',
    };
}
