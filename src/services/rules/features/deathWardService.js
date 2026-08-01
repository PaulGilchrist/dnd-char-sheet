import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

export function checkDeathWard(creature, _playerComputed, campaignName) {
    const stored = getRuntimeValue(creature.name, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(stored) ? stored : [];
    const deathWardBuff = activeBuffs.find(b => b.name === 'Death Ward' && b.effect === 'death_ward');

    if (!deathWardBuff) {
        return { intercepted: false };
    }

    const storedMaxHp = getRuntimeValue(creature.name, 'hitPoints', campaignName);
    if (storedMaxHp == null) {
        console.error(`[applyDamage] Death Ward: hitPoints not found for ${creature.name} in ${campaignName}`);
        throw new Error(`Death Ward: hitPoints not found for ${creature.name}`);
    }
    const maxHp = storedMaxHp;
    const newHp = 1;

    setRuntimeValue(creature.name, 'currentHitPoints', newHp, campaignName);

    const rawConditions = getRuntimeValue(creature.name, 'activeConditions', campaignName);
    const conditions = rawConditions || [];
    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'unconscious');
    setRuntimeValue(creature.name, 'activeConditions', filtered, campaignName);

    setRuntimeValue(creature.name, 'deathSaves', [false, false, false], campaignName);
    setRuntimeValue(creature.name, 'deathFailures', [false, false, false], campaignName);
    setRuntimeValue(creature.name, 'isDead', 0, campaignName);

    const sourceCharacter = deathWardBuff.sourceCharacter || 'unknown';

    addEntry(campaignName, {
        type: 'hp_change',
        targetName: creature.name,
        delta: newHp,
        currentHp: newHp,
        maxHp: maxHp,
        isUnconscious: false,
        sourceName: 'Death Ward',
    }).catch((e) => { console.error("[deathWard] Error:", e); });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: sourceCharacter,
        abilityName: 'Death Ward',
        description: `Death Ward protected ${creature.name} from death! They drop to ${newHp} HP instead of 0. The spell ends.`,
    }).catch((e) => { console.error("[deathWard] Error:", e); });

    const newBuffs = activeBuffs.filter(b => !(b.name === 'Death Ward' && b.effect === 'death_ward'));
    setRuntimeValue(creature.name, 'activeBuffs', newBuffs, campaignName);

    if (creature.type === 'player') {
        creature.currentHp = newHp;
    }

    window.dispatchEvent(new CustomEvent('combat-summary-updated'));

    return {
        intercepted: true,
        finalDamage: 0,
        newHp,
    };
}
