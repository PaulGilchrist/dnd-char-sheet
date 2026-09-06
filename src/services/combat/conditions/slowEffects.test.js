// SP-109: Slow te cleanup seam — save-end and concentration-break consumers
// strip the caster's Slow target effects for a target.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { removeSlowEffectsForTarget, SLOW_TE_EFFECTS } from './slowEffects.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

const campaignName = 'test-campaign';

beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(null);
});

describe('removeSlowEffectsForTarget', () => {
    it('strips all slow te for the target and keeps unrelated te', () => {
        getRuntimeValue.mockReturnValue([
            { target: 'Goblin', effect: 'no_reactions', source: 'Wizard' },
            { target: 'Goblin', effect: 'dex_save_disadvantage', source: 'Wizard' },
            { target: 'Goblin', effect: 'ac_penalty', source: 'Wizard', value: 2 },
            { target: 'Goblin', effect: 'action_limit', source: 'Wizard' },
            { target: 'Goblin', effect: 'single_attack_limit', source: 'Wizard' },
            { target: 'Goblin', effect: 'somatic_failure_chance', source: 'Wizard', chance: 25 },
            { target: 'Goblin', effect: 'holy_aura', source: 'Paladin' },
            { target: 'Orc', effect: 'no_reactions', source: 'Wizard' },
        ]);
        expect(removeSlowEffectsForTarget('Goblin', campaignName)).toBe(true);
        const remaining = setRuntimeValue.mock.calls.find(c => c[1] === 'targetEffects')[2];
        expect(remaining).toEqual([
            { target: 'Goblin', effect: 'holy_aura', source: 'Paladin' },
            { target: 'Orc', effect: 'no_reactions', source: 'Wizard' },
        ]);
        for (const eff of SLOW_TE_EFFECTS) {
            expect(remaining.some(te => te.target === 'Goblin' && te.effect === eff)).toBe(false);
        }
    });

    it('returns false and does not POST when the target has no slow te', () => {
        getRuntimeValue.mockReturnValue([
            { target: 'Goblin', effect: 'holy_aura', source: 'Paladin' },
        ]);
        expect(removeSlowEffectsForTarget('Goblin', campaignName)).toBe(false);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('handles null targetEffects gracefully', () => {
        getRuntimeValue.mockReturnValue(null);
        expect(removeSlowEffectsForTarget('Goblin', campaignName)).toBe(false);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });
});
