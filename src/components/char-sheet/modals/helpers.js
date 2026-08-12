import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { logHealingToSSE } from '../../../services/automation/common/healingRoll.js';
import { addEntry } from '../../../services/ui/logService.js';

export function buildHealingIllusionTargets(playerStats, characters, combatSummary) {
    const allCreatures = [...(characters || []), ...(combatSummary?.creatures || [])];
    const names = new Set(allCreatures.map(c => c.name));
    const result = Array.from(names)
        .map(name => {
            const creature = allCreatures.find(c => c.name === name);
            return { name: creature.name, type: creature.type, size: creature.size, currentHp: creature.currentHp, maxHp: creature.maxHp };
        });
    return result;
}

export async function handleHealingIllusionConfirm(targetName, payload, characters, campaignName, combatSummary, onClose) {
    const { action, playerStats } = payload;
    const casterName = playerStats.name;
    const stored = getRuntimeValue(casterName, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(stored) ? stored : [];
    const newBuffs = activeBuffs.filter(b => b.name !== action.name);
    setRuntimeValue(casterName, 'activeBuffs', newBuffs, campaignName);
    const healAmount = playerStats.level || 1;
    const maxHp = targetName === playerStats.name
        ? playerStats.hitPoints
        : (Number(getRuntimeValue(targetName, 'hitPoints', campaignName)) || findCreatureMaxHp(targetName, combatSummary, characters) || 0);
    const currentHp = Number(getRuntimeValue(targetName, 'currentHitPoints', campaignName)) || findCreatureCurrentHp(targetName, combatSummary) || 0;
    const newHp = Math.min(maxHp, currentHp + healAmount);
    await setRuntimeValue(targetName, 'currentHitPoints', newHp, campaignName);
    logHealingToSSE(campaignName, {
        targetName,
        sourceName: action.name,
        actualHeal: newHp - currentHp,
        newHp,
        maxHp,
        healingName: 'Healing Illusion',
    });
    onClose();
}

export function findCreatureMaxHp(targetName, combatSummary, characters) {
    const creature = combatSummary?.creatures?.find(c => c.name === targetName);
    if (creature?.maxHp) return creature.maxHp;
    const char = characters?.find(c => c.name === targetName);
    return char?.maxHp;
}

export function findCreatureCurrentHp(targetName, combatSummary) {
    const creature = combatSummary?.creatures?.find(c => c.name === targetName);
    return creature?.currentHp;
}

export function buildInvokeDuplicityTargets(playerStats, characters, combatSummary) {
    const allCreatures = [...(characters || []), ...(combatSummary?.creatures || [])];
    const names = new Set(allCreatures.map(c => c.name));
    const result = Array.from(names)
        .map(name => {
            const creature = allCreatures.find(c => c.name === name);
            return { name: creature.name, type: creature.type, currentHp: creature.currentHp, maxHp: creature.maxHp };
        });
    return result;
}

export async function handleInvokeDuplicityConfirm(selectedAllyNames, payload, campaignName, onClose) {
    const { playerStats } = payload;
    if (selectedAllyNames.length === 0) {
        onClose();
        return;
    }
    await setRuntimeValue(playerStats.name, 'invokeDuplicityAdvantageTargets', selectedAllyNames, campaignName);
    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: 'Improved Duplicity',
        description: `${playerStats.name} used Improved Duplicity, granting Advantage to ${selectedAllyNames.join(', ')}.`,
    }).catch(() => {});
    window.dispatchEvent(new CustomEvent('buffs-updated'));
    onClose();
}
