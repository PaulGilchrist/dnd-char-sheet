import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'

function hasStarryDragonConstellation(creature, characters) {
    if (!creature || !creature.name) return false;
    const target = characters?.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name === creature.name;
    });
    if (target && typeof target !== 'string') {
        const activeBuffs = target.activeBuffs || target.computedStats?.activeBuffs || [];
        if (activeBuffs.some(b => b.name === 'Starry Form' && b.constellation === 'Dragon')) return true;
    }
    const runtimeBuffs = getRuntimeValue(creature.name, 'activeBuffs');
    return Array.isArray(runtimeBuffs) && runtimeBuffs.some(b => b.name === 'Starry Form' && b.constellation === 'Dragon');
}

export { hasStarryDragonConstellation }
