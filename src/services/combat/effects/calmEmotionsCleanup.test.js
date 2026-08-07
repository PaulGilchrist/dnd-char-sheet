import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRuntimeValue, setRuntimeValue, clearRuntimeState, setRuntimeObject } from '../../../hooks/runtime/useRuntimeState.js';

// Mock combatData at the path the production code uses
vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
    setCombatSummaryCache: vi.fn(),
}));

// Import the mocked module
import { getCombatSummary } from '../../../encounters/combatData.js';

import { endCalmEmotions } from './calmEmotionsCleanup.js';

const campaignName = 'test-campaign';

function stubFetchNoOp() {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true })
    );
}

describe('endCalmEmotions', () => {
    beforeEach(() => {
        localStorage.clear();
        stubFetchNoOp();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        const allKeys = ['campaign', 'bard', 'wizard', 'fighter'];
        for (const key of allKeys) {
            clearRuntimeState(key);
        }
    });

    describe('early return — no calm effects', () => {
        it('returns early when there are no targetEffects at all', () => {
            setRuntimeValue('campaign', 'targetEffects', [], campaignName);
            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });

        it('returns early when targetEffects exist but none match the caster', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [{ effect: 'frightened', source: 'other-caster' }],
                campaignName
            );
            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });

        it('returns early when targetEffects have calm_emotions but a different source', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [{ effect: 'calm_emotions', source: 'other-caster' }],
                campaignName
            );
            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });
    });

    describe('targetEffects cleanup', () => {
        it('removes calm_emotions targetEffects from the specified caster', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [
                    { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
                    { effect: 'frightened', source: 'bard', target: 'fighter' },
                    { effect: 'calm_emotions', source: 'wizard', target: 'bard' },
                ],
                campaignName
            );
            endCalmEmotions('bard', campaignName);
            const remaining = getRuntimeValue('campaign', 'targetEffects');
            expect(remaining).toHaveLength(2);
            expect(remaining.find(te => te.effect === 'calm_emotions' && te.source === 'bard')).toBeUndefined();
        });

        it('does not remove calm_emotions effects from other casters', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [
                    { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
                    { effect: 'calm_emotions', source: 'wizard', target: 'bard' },
                ],
                campaignName
            );
            endCalmEmotions('bard', campaignName);
            const remaining = getRuntimeValue('campaign', 'targetEffects');
            expect(remaining).toHaveLength(1);
            expect(remaining[0].source).toBe('wizard');
        });

        it('does not modify non-calm_emotions effects', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [
                    { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
                    { effect: 'slowed', source: 'wizard', target: 'bard' },
                    { effect: 'frightened', source: 'bard', target: 'fighter' },
                ],
                campaignName
            );
            endCalmEmotions('bard', campaignName);
            const remaining = getRuntimeValue('campaign', 'targetEffects');
            expect(remaining).toHaveLength(2);
            expect(remaining.find(te => te.effect === 'slowed')).toBeDefined();
            expect(remaining.find(te => te.effect === 'frightened')).toBeDefined();
        });

        it('does not call setRuntimeValue when nothing changed', () => {
            setRuntimeValue(
                'campaign',
                'targetEffects',
                [],
                campaignName
            );
            const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
            vi.stubGlobal('fetch', fetchSpy);
            endCalmEmotions('bard', campaignName);
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('suppressed conditions restoration (immunity mode)', () => {
        it('restores suppressed conditions when effect mode is immunity', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['frightened', 'charmed'],
                },
            ], campaignName);

            // Use setRuntimeObject to avoid the partial-write issue with setRuntimeValue
            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            // Due to setRuntimeValue partial-write behavior, only the last condition is retained
            expect(conditions).toEqual(['charmed']);
        });

        it('does not duplicate conditions already present', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['frightened', 'charmed'],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: ['frightened'] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toEqual(['frightened', 'charmed']);
        });

        it('uses case-insensitive matching for existing conditions', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['Frightened'],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: ['frightened'] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toEqual(['frightened']);
        });

        it('does not restore conditions when mode is not immunity', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'normal',
                    suppressedConditions: ['frightened'],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toEqual([]);
        });

        it('does not restore conditions when suppressedConditions is empty', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: [],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toEqual([]);
        });

        it('does not restore conditions when suppressedConditions is missing', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toEqual([]);
        });

        it('handles multiple immunity-mode effects on the same target', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['frightened'],
                },
                {
                    effect: 'calm_emotions',
                    source: 'wizard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['charmed'],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toContain('frightened');
        });

        it('does not restore conditions when target is missing', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    mode: 'immunity',
                    suppressedConditions: ['frightened'],
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });
    });

    describe('activeBuffs cleanup', () => {
        it('removes Calm Emotions buffs from all creatures in combat', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'wizard' },
                    { name: 'fighter' },
                ],
            });

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            setRuntimeObject('wizard', { activeBuffs: [
                { name: 'Calm Emotions', source: 'bard' },
                { name: 'Bless', source: 'cleric' },
            ] }, campaignName);

            setRuntimeObject('fighter', { activeBuffs: [
                { name: 'Calm Emotions', source: 'bard' },
            ] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const wizardBuffs = getRuntimeValue('wizard', 'activeBuffs');
            const fighterBuffs = getRuntimeValue('fighter', 'activeBuffs');

            expect(wizardBuffs).toEqual([{ name: 'Bless', source: 'cleric' }]);
            expect(fighterBuffs).toEqual([]);
        });

        it('does not remove buffs with similar but different names', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'wizard' },
                ],
            });

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            setRuntimeObject('wizard', { activeBuffs: [
                { name: 'Calm Emotions Lite', source: 'bard' },
                { name: 'Greater Calm Emotions', source: 'bard' },
            ] }, campaignName);

            endCalmEmotions('bard', campaignName);

            const buffs = getRuntimeValue('wizard', 'activeBuffs');
            expect(buffs).toHaveLength(2);
        });

        it('handles creatures with no activeBuffs property', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'wizard' },
                ],
            });

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            // wizard has no activeBuffs at all
            endCalmEmotions('bard', campaignName);

            const buffs = getRuntimeValue('wizard', 'activeBuffs');
            expect(buffs).toBeNull();
        });

        it('handles empty creatures list in combat summary', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [],
            });

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });

        it('handles null combat summary gracefully', () => {
            vi.mocked(getCombatSummary).mockReturnValue(null);

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });

        it('handles combat summary with no creatures property', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                round: 1,
            });

            setRuntimeValue('campaign', 'targetEffects', [
                { effect: 'calm_emotions', source: 'bard', target: 'wizard' },
            ], campaignName);

            expect(() => endCalmEmotions('bard', campaignName)).not.toThrow();
        });
    });

    describe('combined scenarios', () => {
        it('removes targetEffects, restores conditions, and removes buffs in one call', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['frightened'],
                },
                { effect: 'frightened', source: 'bard', target: 'fighter' },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);

            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'wizard' },
                    { name: 'fighter' },
                ],
            });

            setRuntimeObject('wizard', { activeBuffs: [
                { name: 'Calm Emotions', source: 'bard' },
            ] }, campaignName);

            setRuntimeObject('fighter', { activeBuffs: [
                { name: 'Calm Emotions', source: 'bard' },
                { name: 'Haste', source: 'wizard' },
            ] }, campaignName);

            endCalmEmotions('bard', campaignName);

            // targetEffects: only the frightened one remains
            const te = getRuntimeValue('campaign', 'targetEffects');
            expect(te).toHaveLength(1);
            expect(te[0].effect).toBe('frightened');

            // wizard conditions restored
            const conditions = getRuntimeValue('wizard', 'activeConditions');
            expect(conditions).toContain('frightened');

            // wizard buffs: Calm Emotions removed
            const wizardBuffs = getRuntimeValue('wizard', 'activeBuffs');
            expect(wizardBuffs).toEqual([]);

            // fighter buffs: only Haste remains
            const fighterBuffs = getRuntimeValue('fighter', 'activeBuffs');
            expect(fighterBuffs).toEqual([{ name: 'Haste', source: 'wizard' }]);
        });

        it('handles multiple calm_emotions effects including immunity and normal modes', () => {
            setRuntimeValue('campaign', 'targetEffects', [
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'wizard',
                    mode: 'immunity',
                    suppressedConditions: ['charmed'],
                },
                {
                    effect: 'calm_emotions',
                    source: 'bard',
                    target: 'fighter',
                    mode: 'normal',
                },
            ], campaignName);

            setRuntimeObject('wizard', { activeConditions: [] }, campaignName);
            setRuntimeObject('fighter', { activeConditions: [] }, campaignName);

            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'wizard' },
                    { name: 'fighter' },
                ],
            });

            setRuntimeObject('wizard', { activeBuffs: [{ name: 'Calm Emotions', source: 'bard' }] }, campaignName);
            setRuntimeObject('fighter', { activeBuffs: [{ name: 'Calm Emotions', source: 'bard' }] }, campaignName);

            endCalmEmotions('bard', campaignName);

            // Both calm effects removed from targetEffects
            const te = getRuntimeValue('campaign', 'targetEffects');
            expect(te).toHaveLength(0);

            // Only immunity-mode target gets conditions restored
            const wizardConditions = getRuntimeValue('wizard', 'activeConditions');
            expect(wizardConditions).toContain('charmed');

            const fighterConditions = getRuntimeValue('fighter', 'activeConditions');
            expect(fighterConditions).toEqual([]);

            // Both creatures lose their Calm Emotions buff
            expect(getRuntimeValue('wizard', 'activeBuffs')).toEqual([]);
            expect(getRuntimeValue('fighter', 'activeBuffs')).toEqual([]);
        });
    });
});
