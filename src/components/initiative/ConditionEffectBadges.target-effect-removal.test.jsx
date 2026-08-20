// @improved-by-ai
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
    targetAttackDisadvantageCount: 0,
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
    hasteActive: false,
    barkskinActive: false,
    banePenalty: false,
    blessBonus: false,
    beaconOfHope: false,
    abilityCheckDisadvantageAbilities: null,
    abilityCheckAdvantageAbilities: null,
    abilityCheckAdvantage: false,
    abilityCheckAdvantageReasons: [],
    saveDisadvantage: [],
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

    function renderWithEffects(conditions, targetEffects, creatureName = 'Alice', campaignName = 'test-campaign', computeOverrides = {}, props = {}) {
        runtimeState.getRuntimeValue.mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') return targetEffects;
            if (name === creatureName && key === 'activeBuffs') return props.buffs || [];
            return null;
        });
        computeConditionEffects.mockReturnValue(makeEffects(computeOverrides));
        render(
            <ConditionEffectBadges
                conditions={conditions}
                targetEffects={targetEffects}
                creatureName={creatureName}
                campaignName={campaignName}
                isLocalhost={true}
                {...props}
            />
        );
    }

    function clickFirstRemove() {
        const removeBtns = screen.getAllByTitle('Remove effect');
        expect(removeBtns.length).toBeGreaterThan(0);
        fireEvent.click(removeBtns[0]);
    }

    describe('removeAction: target_effect - single effect removal', () => {
        const removableTargetEffects = [
            'sanctuary',
            'regenerate',
            'aura_of_life',
            'aura_of_purity',
            'circle_of_power',
            'heroism',
            'holy_aura',
            'protection_from_poison',
            'banishment',
            'maze',
            'imprisonment',
            'confusion',
            'forcecage',
        ];

        it.each(removableTargetEffects)(
            'should remove %s target effect when badge has target_effect removeAction',
            (effectType) => {
                const existingEffects = [
                    { target: 'Alice', effect: effectType, source: 'Cleric' },
                    { target: 'Bob', effect: 'sanctuary', source: 'Wizard' },
                ];
                renderWithEffects([], existingEffects, 'Alice');
                clickFirstRemove();
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    'campaign',
                    'targetEffects',
                    [existingEffects[1]],
                    'test-campaign'
                );
            }
        );

        it('should remove slasher_enhanced_critical when Attack Disadv badge is clicked', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'slasher_enhanced_critical', source: 'Goblin' },
                { target: 'Bob', effect: 'sanctuary', source: 'Wizard' },
            ];
            renderWithEffects([{ key: 'blinded' }], existingEffects, 'Alice', 'test-campaign', { targetAttackDisadvantageCount: 1 });
            expect(screen.getByText('Attack Disadv')).toBeInTheDocument();
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [existingEffects[1]],
                'test-campaign'
            );
        });
    });

    describe('removeAction: target_effect - preserves other effects on same creature', () => {
        it('should remove only the clicked effect when multiple effects target the same creature', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'sanctuary', source: 'Cleric' },
                { target: 'Alice', effect: 'banishment', source: 'Wizard' },
                { target: 'Bob', effect: 'haste', source: 'Druid' },
            ];
            renderWithEffects([], existingEffects, 'Alice');
            clickFirstRemove();
            const filtered = runtimeState.setRuntimeValue.mock.calls[0][2];
            expect(filtered).toHaveLength(2);
            expect(filtered.map(te => te.effect)).toEqual(['banishment', 'haste']);
        });
    });

    describe('removeAction: target_effect - edge cases', () => {
        it('should remove the only effect when it is the last one remaining', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'sanctuary', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects, 'Alice');
            clickFirstRemove();
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });

        it('should preserve effects on other creatures when removing one effect', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'maze', source: 'Wizard', dc: 20 },
                { target: 'Alice', effect: 'imprisonment', source: 'Wizard', prisonType: 'Slumber' },
                { target: 'Bob', effect: 'sanctuary', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects, 'Alice');
            clickFirstRemove();
            const filtered = runtimeState.setRuntimeValue.mock.calls[0][2];
            expect(filtered).toHaveLength(2);
            expect(filtered[0].effect).toBe('imprisonment');
            expect(filtered[1].effect).toBe('sanctuary');
        });
    });

    describe('rendering before removal', () => {
        it('should render the badge with correct label before removal', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'sanctuary', source: 'Cleric' },
            ];
            renderWithEffects([], existingEffects, 'Alice');
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
        });

        it('should render the slasher_enhanced_critical badge with Attack Disadv label', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'slasher_enhanced_critical', source: 'Goblin' },
            ];
            renderWithEffects([{ key: 'blinded' }], existingEffects, 'Alice', 'test-campaign', { targetAttackDisadvantageCount: 1 });
            expect(screen.getByText('Attack Disadv')).toBeInTheDocument();
        });
    });

    describe('isLocalhost gating for non-removable badges', () => {
        it('should not render remove buttons when isLocalhost is false', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'sanctuary', source: 'Cleric' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={false}
                />
            );
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });
});
