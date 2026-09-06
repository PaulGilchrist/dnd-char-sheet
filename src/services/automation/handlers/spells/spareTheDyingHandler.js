import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { isSpareTheDyingTarget } from '../../../../hooks/combat/spellGateHelpers.js';

// SP-110: Spare the Dying stabilizes — the target STAYS at 0 Hit Points and
// gains 3 successful death saves (the app's canonical Stable model,
// deathSaveRules.isStable). It never heals to 1 HP. Canonical HP truth:
// PCs via the runtime store, monsters via combatSummary currentHp (pitfall 29);
// undead and constructs are immune. Shared predicate with gateSpareTheDying.

export async function handle(action, playerStats, campaignName, _mapName) {
    const spell = action.spell || {};

    const rangeFt = rangeToFeet(spell.range || '15 feet');

    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `No combat context found. Cannot apply ${action.name}.`,
            },
        };
    }

    const casterName = playerStats?.name;
    const creatureTargets = combatSummary.creatures
        .filter(c => c.name !== casterName)
        .filter(c => isSpareTheDyingTarget(combatSummary, c.name))
        .map(c => {
            const isPlayer = c.type === 'player';
            const hp = isPlayer
                ? (getRuntimeValue(c.name, 'currentHitPoints', campaignName) ?? 0)
                : (c.currentHp ?? 0);
            return {
                name: c.name,
                isValidTarget: true,
                hp,
                isDead: false,
                type: c.monsterType,
            };
        });

    if (creatureTargets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No valid targets found. Target must have 0 HP, not be dead, and not be undead or a construct.',
            },
        };
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: 'Select a creature with 0 HP to make stable.',
            automation: spell.automation || {},
            targets: creatureTargets,
            range: spell.range || '15 feet',
            rangeFt,
        },
    };
}

export async function applySpareTheDying(action, playerStats, campaignName, _mapName, result) {
    if (!result || !result.targetName) {
        return null;
    }

    const targetName = result.targetName;
    const casterName = playerStats.name;

    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `No combat context found. Cannot apply ${action.name}.`,
            },
        };
    }

    // SP-110: re-validate on the canonical 0-HP-not-dead gate before writing.
    if (!isSpareTheDyingTarget(combatSummary, targetName)) {
        console.error(`[spareTheDying] Invalid target refused: ${targetName}`);
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} is no longer a valid target for Spare the Dying. Target must be a living creature at 0 Hit Points.`,
            },
        };
    }

    // Stabilize WITHOUT healing: 3 successful death saves, currentHitPoints untouched.
    setRuntimeValue(targetName, 'deathSaves', [true, true, true], campaignName);
    setRuntimeValue(targetName, 'deathFailures', getRuntimeValue(targetName, 'deathFailures', campaignName) || [false, false, false], campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: action.name,
        description: `${casterName} cast ${action.name} on ${targetName}: ${targetName} is stabilized and becomes Stable at 0 Hit Points.`,
        targetName,
        timestamp: Date.now(),
    });

    await addEntry(campaignName, {
        type: 'spell_effect',
        characterName: casterName,
        spellName: action.name,
        targetName,
        effects: ['Target becomes Stable'],
        timestamp: Date.now(),
    }).catch((e) => { console.error('[spareTheDying] Error:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: 'spare_the_dying',
            description: `${targetName} becomes Stable and remains at 0 Hit Points.`,
        },
    };
}
