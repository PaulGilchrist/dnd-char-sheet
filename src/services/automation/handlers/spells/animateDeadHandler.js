import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import cloneDeep from 'lodash/cloneDeep.js';

const MAX_TARGETS_KEY = 'animateDeadMaxTargets';

async function getTargetEffects(campaignName) {
    const stored = getRuntimeValue('campaign', 'targetEffects');
    if (stored) return stored;
    try {
        const ctx = await fetch(`/api/campaigns/${encodeURIComponent(campaignName)}/change-data`).then(r => r.json());
        return ctx?.targetEffects || [];
    } catch { return []; }
}

function getSlotLevel(action) {
    const auto = action.automation;
    if (auto?.slotLevel) return auto.slotLevel;
    if (action.metaCtx?.slotLevel) return action.metaCtx.slotLevel;
    if (action.spell?.level) return action.spell.level;
    return 3;
}

function getMaxTargets(slotLevel) {
    const upcast = { 3: 1, 4: 3, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13 };
    return upcast[slotLevel] || 1;
}

export async function handle(action, playerStats, campaignName) {
    const slotLevel = getSlotLevel(action);
    const maxTargets = getMaxTargets(slotLevel);

    const stored = action.metadata?.[MAX_TARGETS_KEY];
    if (stored === maxTargets) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${action.name}: ${maxTargets} undead creature(s) created.`,
                automation: action.automation,
            },
        };
    }

    return {
        type: 'modal',
        modalName: 'animateDead',
        payload: {
            action,
            playerStats,
            campaignName,
            maxTargets,
        },
    };
}

export async function confirmAnimateDead(action, playerStats, campaignName, { zombieCount, skeletonCount }) {
    const slotLevel = getSlotLevel(action);
    const maxTargets = getMaxTargets(slotLevel);
    const total = (zombieCount || 0) + (skeletonCount || 0);

    if (total <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No undead created.',
                automation: action.automation,
            },
        };
    }

    const casterName = playerStats.name;
    const combatSummary = getCombatSummary(campaignName);
    if (!combatSummary) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'Failed to load combat summary.',
                automation: action.automation,
            },
        };
    }

    const casterCreature = combatSummary.creatures.find(c => c.name === casterName);
    let initiativeValue = 0;
    if (casterCreature?.initiative !== '' && casterCreature?.initiative !== undefined) {
        initiativeValue = parseInt(casterCreature.initiative, 10) || 0;
    }

    const casterInitBonus = casterCreature?.initiativeBonus || 0;
    initiativeValue = initiativeValue || (Math.floor(Math.random() * 20) + 1 + casterInitBonus);

    let targetEffects = await getTargetEffects(campaignName);

    const creatureNames = [];

    for (let i = 0; i < (skeletonCount || 0); i++) {
        const name = `Skeleton ${i + 1}`;
        combatSummary.creatures.push({
            name,
            type: 'Undead',
            initiative: String(initiativeValue),
            targetName: null,
            ac: 14,
            resistances: [],
            immunities: ['Poison', 'Exhaustion', 'Poisoned'],
            concentration: null,
            maxHp: 13,
            currentHp: 13,
            saveBonuses: { str: 0, dex: 3, con: 2, int: -2, wis: -1, cha: -3 },
            monsterIndex: 'skeleton',
            vulnerabilities: ['Bludgeoning'],
        });
        targetEffects.push({ target: name, source: casterName, effect: 'summoned' });
        creatureNames.push(name);
    }

    for (let i = 0; i < (zombieCount || 0); i++) {
        const name = `Zombie ${i + 1}`;
        combatSummary.creatures.push({
            name,
            type: 'Undead',
            initiative: String(initiativeValue),
            targetName: null,
            ac: 8,
            resistances: [],
            immunities: ['Poison', 'Exhaustion', 'Poisoned'],
            concentration: null,
            maxHp: 15,
            currentHp: 15,
            saveBonuses: { str: 1, dex: -2, con: 3, int: -4, wis: -2, cha: -3 },
            monsterIndex: 'zombie',
        });
        targetEffects.push({ target: name, source: casterName, effect: 'summoned' });
        creatureNames.push(name);
    }

    combatSummary.creatures.sort((a, b) => {
        const aInit = a.initiative === '' || a.initiative === undefined ? 0 : parseInt(a.initiative, 10);
        const bInit = b.initiative === '' || b.initiative === undefined ? 0 : parseInt(b.initiative, 10);
        return bInit - aInit;
    });

    storage.set('combatSummary', cloneDeep(combatSummary), campaignName);
    setRuntimeValue('campaign', 'targetEffects', targetEffects, campaignName);
    window.dispatchEvent(new CustomEvent('initiative-rolled'));

    const zombieLabel = zombieCount > 0 ? `${zombieCount} Zombie${zombieCount > 1 ? 's' : ''}` : '';
    const skeletonLabel = skeletonCount > 0 ? `${skeletonCount} Skeleton${skeletonCount > 1 ? 's' : ''}` : '';
    const creatureList = [zombieLabel, skeletonLabel].filter(Boolean).join(' and ');

    await addEntry(campaignName, {
        type: 'summons',
        characterName: casterName,
        summonName: 'Animate Dead',
        description: `${casterName} casts Animate Dead (slot level ${slotLevel}), creating ${total} undead creature(s).`,
        summonedCreatures: creatureNames,
        timestamp: Date.now(),
    }).catch(() => {});

    action.metadata = { ...action.metadata, [MAX_TARGETS_KEY]: maxTargets };

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `${casterName} casts Animate Dead, creating ${creatureList}. They act on your turn, right after you.`,
            automation: action.automation,
        },
        logEntries: [{
            type: 'summons',
            characterName: casterName,
            summonName: 'Animate Dead',
            description: `${casterName} casts Animate Dead (slot level ${slotLevel}), creating ${total} undead creature(s).`,
            summonedCreatures: creatureNames,
            timestamp: Date.now(),
        }],
    };
}

const HANDLER_MODAL = 'animateDead';
const HANDLER_CONFIRM = 'animate_dead_confirm';

export { HANDLER_MODAL as modalName, HANDLER_CONFIRM as confirmType };
