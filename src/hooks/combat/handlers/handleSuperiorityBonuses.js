import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';

export function applySuperiorityDamageBonuses(characterName, campaignName, formula, total, rolls, context) {
    let newFormula = formula;
    let newTotal = total;
    let newRolls = rolls;

    // Apply Feinting Attack superiority die damage bonus
    const feintDieValue = getRuntimeValue(characterName, 'feintingAttackDieValue');
    if (feintDieValue && Number(feintDieValue) > 0) {
        const feintVal = Number(feintDieValue);
        const dmgType = context?.damageType || 'same_as_weapon';
        newFormula += ` + ${feintVal} [${dmgType}]`;
        newTotal += feintVal;
        newRolls = [...newRolls, feintVal];
        setRuntimeValue(characterName, 'feintingAttackDieValue', null, campaignName);
    }

    // Apply Commander's Strike superiority die damage bonus (from ally)
    const csBonus = getRuntimeValue(characterName, 'commanderStrikeBonus');
    if (csBonus && Number(csBonus) > 0) {
        const csVal = Number(csBonus);
        const dmgType = context?.damageType || 'same_as_weapon';
        newFormula += ` + ${csVal} [${dmgType}]`;
        newTotal += csVal;
        newRolls = [...newRolls, csVal];
        setRuntimeValue(characterName, 'commanderStrikeBonus', null, campaignName);
        setRuntimeValue(characterName, 'commanderStrikeActive', null, campaignName);
        setRuntimeValue(characterName, 'commanderStrikeSource', null, campaignName);
    }

    // Apply Lunging Attack superiority die damage bonus (melee hit only)
    const lungingDieValue = getRuntimeValue(characterName, 'lungingAttackDieValue');
    if (lungingDieValue && Number(lungingDieValue) > 0) {
        const lungingVal = Number(lungingDieValue);
        const dmgType = context?.damageType || 'same_as_weapon';
        newFormula += ` + ${lungingVal} [${dmgType}]`;
        newTotal += lungingVal;
        newRolls = [...newRolls, lungingVal];
        setRuntimeValue(characterName, 'lungingAttackDieValue', null, campaignName);
    }

    // Apply attack-rider maneuver superiority die damage bonus (Goading et al.)
    const riderDieValue = getRuntimeValue(characterName, 'attackRiderDieValue');
    if (riderDieValue && Number(riderDieValue) > 0) {
        const riderVal = Number(riderDieValue);
        const dmgType = context?.damageType || 'same_as_weapon';
        newFormula += ` + ${riderVal} [${dmgType}]`;
        newTotal += riderVal;
        newRolls = [...newRolls, riderVal];
        setRuntimeValue(characterName, 'attackRiderDieValue', null, campaignName);
    }

    return { formula: newFormula, total: newTotal, rolls: newRolls };
}
