export function filterMeleeAttacks(attacks) {
    return (attacks || []).filter(a => {
        if (a.weaponType === 'melee' || a.attackType === 'melee') return true;
        if (a.range === 5 || a.range === '5' || a.range === '5 ft' || a.range === '5_ft') return a.type === 'Action' || a.actionType === 'Action';
        if (a.isRanged === false) return true;
        if (Array.isArray(a.properties) && a.properties.some(p => String(p).toLowerCase() === 'melee'))
            return true;
        return false;
    });
}
