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
 * Determines if a spell auto-hits (no attack roll needed).
 * Healing spells and Magic Missile always hit.
 * @param {Object} spell - The spell object
 * @returns {boolean} True if the spell auto-hits
 */
export function isAutoHitSpell(spell) {
    if (!spell) return false;
    if (spell.heal_at_slot_level) return true;
    if (spell.name && spell.name.toLowerCase() === 'magic missile') return true;
    return false;
}

/**
 * Resolves spell damage from monster-style fields (damage_dice_primary, damage_dice_secondary)
 * with per-level scaling for secondary damage.
 * Returns { formula, primaryDice, primaryType, secondaryDice, secondaryType }
 * @param {Object} spell - The spell object with damage property
 * @param {number} spellLevel - The spell slot level being cast
 * @returns {Object|null} Resolved damage info or null if no damage
 */
export function resolveSpellDamageWithTypes(spell, spellLevel) {
    if (!spell || !spell.damage) return null;
    const { damage } = spell;
    
    // Use monster-style fields if present
    if (damage.damage_dice_primary) {
        const slotDmg = damage.damage_at_slot_level;
        const charDmg = damage.damage_at_character_level;
        const dmgObj = slotDmg && Object.keys(slotDmg).length ? slotDmg : charDmg;
        
        let effectiveLevel = spellLevel;
        if (dmgObj) {
            const levels = Object.keys(dmgObj).map(Number).filter(l => l <= spellLevel);
            if (levels.length > 0) {
                effectiveLevel = Math.max(...levels);
            }
        }
        
        const levelKey = String(effectiveLevel);
        const slotFormula = dmgObj ? (dmgObj[levelKey] || dmgObj[Object.keys(dmgObj)[0]]) : null;
        
        // Extract secondary dice from the per-level formula
        let secondaryDice = damage.damage_dice_secondary;
        let primaryDice = damage.damage_dice_primary;
        if (slotFormula) {
            const m = slotFormula.match(/([0-9]d[0-9]+)\s*plus\s*([0-9]d[0-9]+)/i);
            if (m) {
                primaryDice = m[1];
                secondaryDice = m[2];
            } else {
                // Single dice (cantrip scaling) — use the formula directly
                primaryDice = slotFormula;
            }
        }
        
        const formula = [primaryDice, secondaryDice].filter(Boolean).join(' plus ');
        
        return {
            formula,
            primaryDice,
            primaryType: damage.damage_type_primary,
            secondaryDice,
            secondaryType: damage.damage_type_secondary,
        };
    }
    
    // Fallback to legacy string format
    if (!spell.damage) return null;
    const slotDmg = spell.damage.damage_at_slot_level;
    const charDmg = spell.damage.damage_at_character_level;
    const dmgObj = slotDmg && Object.keys(slotDmg).length ? slotDmg : charDmg;
    let formula = '';
    if (dmgObj) {
        if (spell.level === 0) {
            // Cantrip: scale by character level
            const lvls = Object.keys(dmgObj).map(Number).filter(l => l <= spellLevel);
            const bestLevel = lvls.length > 0 ? Math.max(...lvls) : Object.keys(dmgObj)[0];
            formula = dmgObj[bestLevel];
        } else {
            // Leveled spell: use the given slot level
            const levels = Object.keys(dmgObj).map(Number).sort((a, b) => a - b);
            const applicable = levels.filter(l => l <= spellLevel);
            const key = applicable.length > 0 ? String(Math.max(...applicable)) : String(levels[0]);
            formula = dmgObj[key] || dmgObj[Object.keys(dmgObj)[0]];
        }
    }
    if (!formula) return null;
    return {
        formula,
        primaryDice: formula,
        primaryType: spell.damage.damage_type || '',
        secondaryDice: null,
        secondaryType: null,
    };
}
