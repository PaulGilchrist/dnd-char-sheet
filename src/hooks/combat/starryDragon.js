import { getRuntimeValue } from '../runtime/useRuntimeState.js';

const STAR_DRAGON_INT_SKILLS = ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'];
const STAR_DRAGON_WIS_SKILLS = ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'];

export { STAR_DRAGON_INT_SKILLS, STAR_DRAGON_WIS_SKILLS };

export function hasStarryDragonActive(characterName, campaignName) {
    const buffs = getRuntimeValue(characterName, 'activeBuffs', campaignName);
    return Array.isArray(buffs) && buffs.some(b => b.name === 'Starry Form' && b.constellation === 'Dragon');
}

export function starryDragonAppliesToRoll(name, rollType) {
    const normalized = (name || '').trim();
    if (rollType === 'save') {
        return normalized === 'Constitution' || normalized === 'CONSTITUTION' || normalized === 'CON';
    }
    if (rollType === 'check' || rollType === 'skill') {
        return normalized === 'Intelligence' || normalized === 'Intellect' || normalized === 'INT'
            || normalized === 'Wisdom' || normalized === 'WIS'
            || STAR_DRAGON_INT_SKILLS.includes(normalized)
            || STAR_DRAGON_WIS_SKILLS.includes(normalized);
    }
    return false;
}
