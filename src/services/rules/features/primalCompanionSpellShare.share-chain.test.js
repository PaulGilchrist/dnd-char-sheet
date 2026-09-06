import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerPrimalCompanionSpellShare } from './primalCompanionSpellShareService.js';
import { handle } from '../../automation/handlers/class-ranger/primalCompanionSpellShareHandler.js';

const store = {};

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn((name, key) => store[`${name}.${key}`]),
    setRuntimeValue: vi.fn(async (name, key, value) => { store[`${name}.${key}`] = value; }),
}));

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

vi.mock('../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn(async () => true),
}));

// Real dispatch: automation/index resolves the registered share handler.
vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(async (action, playerStats, campaignName) => {
        if (action?.automation?.type === 'primal_companion_spell_share') {
            return handle(action, playerStats, campaignName);
        }
        return null;
    }),
}));

const { addEntry } = await import('../../ui/logService.js');
const { isWithinRange } = await import('../../rules/combat/rangeCheck.js');

const CAMPAIGN = 'test-campaign';
const CASTER = 'FeyRanger';

const pwtSpell = {
    name: 'Pass Without Trace',
    level: 2,
    range: 'Self',
    casting_time: 'Action',
    concentration: true,
    automation: { type: 'pass_without_trace', auraRange: 30 },
};

function makePlayerStats() {
    return {
        name: CASTER,
        automation: {
            passives: [
                { type: 'primal_companion_spell_share', name: 'Share Spells', range: '30_ft', casting_time: 'passive', hasAutomation: true },
            ],
        },
    };
}

describe('CLA-311 Share Spells dispatch chain (self-spell cast → companion effect)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k of Object.keys(store)) delete store[k];
        isWithinRange.mockResolvedValue(true);
        store[`${CASTER}.primalCompanionType`] = 'Beast of the Land';
        store[`${CASTER}.primalCompanionAlive`] = true;
        store['campaign.targetEffects'] = [
            { target: 'Primal Companion (Beast of the Land)', source: CASTER, effect: 'summoned' },
            { target: CASTER, effect: 'pass_without_trace_bonus', source: CASTER, slotLevel: 2, duration: 'concentration', bonusExpression: '+10' },
        ];
    });

    it('a confirmed self-spell cast mirrors the targetEffect onto the companion, stamps lastSpellShare, and logs Share Spells', async () => {
        const result = await triggerPrimalCompanionSpellShare(
            pwtSpell,
            { slotLevel: 2 },
            makePlayerStats(),
            CAMPAIGN,
            null
        );

        const shared = store['campaign.targetEffects'].find(
            te => te.target === 'Primal Companion (Beast of the Land)' && te.effect === 'pass_without_trace_bonus'
        );
        expect(shared).toBeDefined();
        expect(shared.sharedBy).toBe('Share Spells');
        expect(shared.source).toBe(CASTER);
        expect(shared.slotLevel).toBe(2);
        expect(shared.bonusExpression).toBe('+10');
        expect(store[`${CASTER}.lastSpellShare`]).toBe('Pass Without Trace');

        expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
            type: 'automation',
            automationType: 'primal_companion_spell_share',
            name: 'Share Spells',
            spellName: 'Pass Without Trace',
            description: expect.stringContaining('Share Spells'),
        }));

        expect(result).toMatchObject({
            type: 'popup',
            payload: { description: 'Pass Without Trace shared with Primal Companion (Beast of the Land).' },
        });
    });

    it('denies the share (no companion te written, no share log) when the range gate fails', async () => {
        isWithinRange.mockResolvedValue(false);

        const result = await triggerPrimalCompanionSpellShare(
            pwtSpell,
            { slotLevel: 2 },
            makePlayerStats(),
            CAMPAIGN,
            null
        );

        const shared = store['campaign.targetEffects'].filter(
            te => te.target === 'Primal Companion (Beast of the Land)' && te.effect === 'pass_without_trace_bonus'
        );
        expect(shared).toHaveLength(0);
        expect(store[`${CASTER}.lastSpellShare`]).toBeUndefined();
        expect(addEntry).not.toHaveBeenCalled();
        expect(result.type).toBe('popup');
    });
});
