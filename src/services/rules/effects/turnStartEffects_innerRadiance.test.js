// BUG CLA-198 — Inner Radiance recurring radiant tick.
// Regression coverage:
//  1. The `inner_radiance_turn_start` consumer ticks EXACTLY ONCE per
//     applyTurnStartEffects invocation, even when the creature carries
//     multiple turnStartEffects entries (previously applyAuraDamage sat
//     unconditionally inside the loop and ticked once per entry).
//  2. No tick at all when the creature has no `inner_radiance_turn_start` entry.
//  3. Tick amount = proficiency bonus, Radiant, 10 ft, gated by innerRadianceActive.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../automation/handlers/buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(),
}));

vi.mock('../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(() => 5),
}));

vi.mock('../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
    loadCombatSummary: vi.fn(async () => null),
    setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../automation/handlers/spells/confusionTurnStartHandler.js', () => ({
    handleConfusionTurnStart: vi.fn(async () => null),
}));

vi.mock('./auraDamageService.js', () => ({
    applyAuraDamage: vi.fn(async () => {}),
    applyHolyNimbusDamage: vi.fn(async () => {}),
}));

vi.mock('./toppleCleanup.js', () => ({
    cleanUpToppleConditions: vi.fn(),
}));

vi.mock('../../ui/utils.js', () => ({
    default: { getName: (n) => String(n) },
}));

vi.mock('../../ui/storage.js', () => ({
    default: { set: vi.fn(() => Promise.resolve()) },
}));

import { applyTurnStartEffects } from './turnStartEffects.js';
import { applyAuraDamage } from './auraDamageService.js';

const campaignName = 'test-campaign';

function stats(turnStartEffects, proficiency = 5) {
    return { name: 'AasimarTest', proficiency, turnStartEffects };
}

describe('BUG CLA-198 — Inner Radiance tick in applyTurnStartEffects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ticks exactly ONCE when inner_radiance_turn_start is present, even with extra effect entries', async () => {
        await applyTurnStartEffects(
            'AasimarTest',
            stats([
                { type: 'inner_radiance_turn_start', name: 'Inner Radiance', damageExpression: 'proficiency_bonus', damageType: 'Radiant', range: '10_ft' },
                { type: 'steady_aim_clear', name: 'Steady Aim Clear' },
                { type: 'steady_aim_clear', name: 'Roving Aim Clear' },
            ]),
            campaignName,
            []
        );

        expect(applyAuraDamage).toHaveBeenCalledTimes(1);
        expect(applyAuraDamage).toHaveBeenCalledWith(
            'AasimarTest',
            expect.any(Object),
            campaignName,
            [],
            expect.objectContaining({
                activeKey: 'innerRadianceActive',
                damageValue: 5,
                range: 10,
                damageType: 'Radiant',
            })
        );
    });

    it('does NOT tick when the creature has no inner_radiance_turn_start entry', async () => {
        await applyTurnStartEffects(
            'AasimarTest',
            stats([{ type: 'steady_aim_clear', name: 'Steady Aim Clear' }]),
            campaignName,
            []
        );

        expect(applyAuraDamage).not.toHaveBeenCalled();
    });

    it('does NOT tick on an empty turnStartEffects list', async () => {
        await applyTurnStartEffects('AasimarTest', stats([]), campaignName, []);
        expect(applyAuraDamage).not.toHaveBeenCalled();
    });

    it('ticks once per invocation for every invocation (recurrence across rounds)', async () => {
        const s = stats([{ type: 'inner_radiance_turn_start', name: 'Inner Radiance' }]);
        await applyTurnStartEffects('AasimarTest', s, campaignName, []);
        expect(applyAuraDamage).toHaveBeenCalledTimes(1);
        // Simulates the next round's owner turn-start invocation
        await applyTurnStartEffects('AasimarTest', s, campaignName, []);
        expect(applyAuraDamage).toHaveBeenCalledTimes(2);
    });
});
