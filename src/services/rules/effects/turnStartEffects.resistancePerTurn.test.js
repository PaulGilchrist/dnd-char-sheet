import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
    getAllStoreKeys: vi.fn(() => []),
}));

vi.mock('../../ui/utils.js', () => ({
    default: {
        getName: vi.fn((val) => String(val)),
    },
}));

vi.mock('../../ui/storage.js', () => ({
    default: {
        set: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
    getActiveCreatureName: vi.fn(),
    getCombatSummary: vi.fn(),
    loadCombatSummary: vi.fn(),
    setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(() => 1),
}));

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../automation/handlers/spells/confusionTurnStartHandler.js', () => ({
    handleConfusionTurnStart: vi.fn(),
}));

vi.mock('./auraDamageService.js', () => ({
    applyAuraDamage: vi.fn(),
    applyHolyNimbusDamage: vi.fn(async () => {}),
}));

vi.mock('./toppleCleanup.js', () => ({
    cleanUpToppleConditions: vi.fn(),
}));

vi.mock('../../automation/handlers/buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(),
}));

import { applyTurnStartEffects } from './turnStartEffects.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const CAMPAIGN = 'test-campaign';

function resistanceTe(target) {
    return { target, effect: 'resistance_damage_reduction', source: 'Divine_Cleric', chosenType: 'Bludgeoning' };
}

function makeState({ te = [], flags = {} } = {}) {
    getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return te;
        if (prop === 'resistanceUsedThisTurn') return flags[key] ?? null;
        return null;
    });
    setRuntimeValue.mockImplementation(async () => {});
}

function clearCalls() {
    return setRuntimeValue.mock.calls.filter(c => c[1] === 'resistanceUsedThisTurn');
}

describe('SP-099 — Resistance once-per-turn flag re-arms at EVERY turn start', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.dispatchEvent = vi.fn();
    });

    it('clears the protected target flag at the start of ANOTHER creature turn (EB monster, no playerStats)', async () => {
        makeState({ te: [resistanceTe('Divine_Cleric')], flags: { Divine_Cleric: true } });

        await applyTurnStartEffects('Thug 2', undefined, CAMPAIGN);

        expect(setRuntimeValue).toHaveBeenCalledWith('Divine_Cleric', 'resistanceUsedThisTurn', false, CAMPAIGN);
    });

    it('clears the flag at the protected target own turn start', async () => {
        makeState({ te: [resistanceTe('Divine_Cleric')], flags: { Divine_Cleric: true } });

        await applyTurnStartEffects('Divine_Cleric', { turnStartEffects: [] }, CAMPAIGN);

        expect(setRuntimeValue).toHaveBeenCalledWith('Divine_Cleric', 'resistanceUsedThisTurn', false, CAMPAIGN);
    });

    it('does not write when no holder flag is set', async () => {
        makeState({ te: [resistanceTe('Divine_Cleric')], flags: { Divine_Cleric: false } });

        await applyTurnStartEffects('Thug 1', undefined, CAMPAIGN);

        expect(clearCalls()).toHaveLength(0);
    });

    it('does not clear flags of creatures without the resistance te', async () => {
        makeState({
            te: [resistanceTe('Divine_Cleric')],
            flags: { Divine_Cleric: true, 'Thug 1': true },
        });

        await applyTurnStartEffects('Thug 2', undefined, CAMPAIGN);

        const cleared = clearCalls().map(c => c[0]);
        expect(cleared).toEqual(['Divine_Cleric']);
    });

    it('ignores non-resistance targetEffects', async () => {
        makeState({
            te: [{ target: 'Divine_Cleric', effect: 'ray_of_enfeeble_debuff', source: 'TestFighter' }],
            flags: { Divine_Cleric: true },
        });

        await applyTurnStartEffects('Thug 1', undefined, CAMPAIGN);

        expect(clearCalls()).toHaveLength(0);
    });

    it('clears multiple holders sequentially (pitfall 21)', async () => {
        const order = [];
        makeState({
            te: [resistanceTe('Divine_Cleric'), resistanceTe('War_Cleric')],
            flags: { Divine_Cleric: true, War_Cleric: true },
        });
        setRuntimeValue.mockImplementation(async (key) => {
            order.push(`start:${key}`);
            await new Promise((resolve) => setTimeout(resolve, 5));
            order.push(`end:${key}`);
            return undefined;
        });

        await applyTurnStartEffects('Thug 2', undefined, CAMPAIGN);

        expect(order).toEqual([
            'start:Divine_Cleric',
            'end:Divine_Cleric',
            'start:War_Cleric',
            'end:War_Cleric',
        ]);
    });
});
