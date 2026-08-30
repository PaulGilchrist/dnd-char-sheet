const BRUTAL_STRIKE_TRIGGER = 'strength_attack_hit_after_reckless';

function diceCount(expr) {
    return parseInt(String(expr || '').match(/^(\d+)/)?.[1] || '0', 10);
}

export function selectBrutalStrikeRiders(candidates) {
    return (candidates || [])
        .filter(x => x?.type === 'attack_rider' && x?.damageExpression && x?.trigger === BRUTAL_STRIKE_TRIGGER)
        .sort((a, b) => diceCount(b.damageExpression) - diceCount(a.damageExpression)
            || (b.featureLevel || 0) - (a.featureLevel || 0));
}
