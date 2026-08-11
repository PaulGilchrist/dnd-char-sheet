import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
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
    abilityCheckDisadvantageAbilities: null,
    abilityCheckAdvantageAbilities: null,
    abilityCheckAdvantage: false,
    abilityCheckAdvantageReasons: [],
    saveDisadvantage: [],
    blessBonus: false,
    beaconOfHope: false,
    hasteActive: false,
    barkskinActive: false,
    banePenalty: false,
};

function makeEffects(overrides = {}) {
    return { ...defaultEffects, ...overrides };
}

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn((_conditions, _saveModifiers, targetEffects) => {
        return makeEffects(targetEffects && targetEffects.length ? { targetAdvantageCount: 1 } : {});
    }),
}));

describe('ConditionEffectBadges - Save & Ability Check Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Adv badge', () => {
        it('should render Adv badge when attackAdvantageCount > 0 with reasons', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ attackAdvantageCount: 1, attackAdvantageReasons: ['Invisible'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'invisible' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on attack rolls.*Invisible/)).toBeInTheDocument();
        });

        it('should render Adv badge with Vow of Enmity reason', () => {
            const allCreatures = [{ name: 'Paladin' }];
            runtimeState.getRuntimeValue.mockImplementation((creatureName, key) => {
                if (key === 'activeBuffs') return [];
                if (key === 'vowOfEnmityTarget') {
                    if (creatureName === 'Paladin') return 'Alice';
                    return null;
                }
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ attackAdvantageCount: 1, attackAdvantageReasons: ['Vow of Enmity'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    allCreatures={allCreatures}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv')).toBeInTheDocument();
        });
    });

    describe('Adv vs badge', () => {
        it('should render Adv vs badge when targetAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ targetAdvantageCount: 1, targetAdvantageReasons: ['Reckless Attack'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv vs')).toBeInTheDocument();
        });
    });

    describe('Adv Save badge', () => {
        it('should render Adv Save badge when saveAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ saveAdvantageCount: 1, saveAdvantageReasons: ['Foresight'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv Save')).toBeInTheDocument();
        });
    });

    describe('Adv DEX Save badge', () => {
        it('should render Adv DEX Save badge when dexSaveAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Dodge', effect: 'dodge' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ dexSaveAdvantageCount: 1 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv DEX Save')).toBeInTheDocument();
        });
    });

    describe('Save Disadv badge', () => {
        it('should render Save Disadv badge when riderSaveDisadvantage is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ riderSaveDisadvantage: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Save Disadv')).toBeInTheDocument();
        });

        it('should render Save Disadv badge with hex save disadvantage', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ saveDisadvantageCount: 1, saveDisadvantage: ['dex'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Save Disadv (dex)')).toBeInTheDocument();
        });
    });

    describe('Ability Check Disadv badge', () => {
        it('should render Check Disadv badge when abilityCheckDisadvantageAbilities is set', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckDisadvantageAbilities: ['STR', 'DEX'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText(/Check Disadv \(str, dex\)/)).toBeInTheDocument();
        });
    });

    describe('Adv Check badge', () => {
        it('should render Adv Check badge when abilityCheckAdvantageAbilities is set', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckAdvantageAbilities: ['STR'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText(/Adv Check \(str\)/)).toBeInTheDocument();
        });

        it('should render Adv Check badge when abilityCheckAdvantage is true without abilities', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckAdvantage: true, abilityCheckAdvantageReasons: ['Foresight'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv Check')).toBeInTheDocument();
        });
    });
});
