import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import { computeConditionEffects } from '../../services/combat/conditions/conditionEffects.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getStore: vi.fn(() => new Map()),
    useSyncedState: vi.fn(() => [null, vi.fn()]),
    listeners: new Map(),
    getRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        set: vi.fn(),
    },
}));

const defaultEffects = {
    cannotAct: false,
    speedZero: false,
    speedReduction: 0,
    pushEffect: false,
    pushDistance: null,
    proneEffect: false,
    autoCritWithin5ft: false,
    concentrationBroken: false,
    autoFailSaves: [],
    resistantToAll: false,
    attackDisadvantageCount: 0,
    attackDisadvantageReasons: [],
    abilityCheckDisadvantage: false,
    strCheckDisadvantage: false,
    rayOfEnfeebleDamageReduction: false,
    resistanceDamageReduction: false,
    targetAdvantageCount: 0,
    targetDisadvantageCount: 0,
    riderSaveDisadvantage: false,
    riderAttackBonus: 0,
    riderCannotOpportunityAttack: false,
    riderNoReactions: false,
    noAdvantageAgainst: false,
    attackAdvantageCount: 0,
    attackAdvantageReasons: [],
    saveAdvantageCount: 0,
    saveAdvantageReasons: [],
    saveAdvantageAbilities: null,
    saveDisadvantageCount: 0,
    dexSaveAdvantageCount: 0,
};

function makeEffects(overrides = {}) {
    return { ...defaultEffects, ...overrides };
}

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn(() => makeEffects({})),
}));

describe('ConditionEffectBadges - target_effect removal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function renderWithEffects(conditions, targetEffects, creatureName = 'Alice', computeOverrides = {}) {
        runtimeState.getRuntimeValue.mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') return targetEffects;
            if (name === creatureName && key === 'activeBuffs') return [];
            return null;
        });
        computeConditionEffects.mockReturnValue(makeEffects(computeOverrides));
        render(
            <ConditionEffectBadges
                conditions={conditions}
                targetEffects={targetEffects}
                creatureName={creatureName}
                campaignName="test-campaign"
                isLocalhost={true}
            />
        );
    }

    function clickFirstRemove() {
        const removeBtns = screen.getAllByTitle('Remove effect');
        if (removeBtns.length > 0) {
            fireEvent.click(removeBtns[0]);
        }
    }

    describe('removeAction: target_effect', () => {
        it('should remove target effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'slasher_enhanced_critical', source: 'Goblin' },
                { target: 'Bob', effect: 'sanctuary', source: 'Cleric' },
            ];
            renderWithEffects([{ key: 'blinded' }], existingEffects, 'Alice', { targetAttackDisadvantageCount: 1 });
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [existingEffects[1]],
                'test-campaign'
            );
        });

        it('should remove sanctuary effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'sanctuary', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove regenerate effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'regenerate', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove aura_of_life effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'aura_of_life', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove aura_of_purity effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'aura_of_purity', source: 'Paladin' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove circle_of_power effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'circle_of_power', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove heroism effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'heroism', source: 'Paladin' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove holy_aura effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'holy_aura', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove protection_from_poison effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'protection_from_poison', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove banishment effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'banishment', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove maze effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'maze', source: 'Wizard', dc: 20 },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove imprisonment effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'imprisonment', source: 'Wizard', prisonType: 'Slumber' },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove confusion effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'confusion', source: 'Wizard', dc: 15 },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should remove forcecage effect when badge has target_effect removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'forcecage', source: 'Wizard', dc: 17 },
            ];
            renderWithEffects([], existingEffects);
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });
    });
});
