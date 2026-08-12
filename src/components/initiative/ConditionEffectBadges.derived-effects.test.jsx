import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
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

describe('ConditionEffectBadges - Derived Effect Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getEffectDescription indirect tests', () => {
        it('should use EFFECT_DESCRIPTIONS for known labels', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                />
            );
        });

        it('should return "Speed is reduced by the amount shown." for Speed - labels', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ speedReduction: 15 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'grappled' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                />
            );
            expect(screen.getByText('Speed -15')).toBeInTheDocument();
        });

        it('should return "Attackers gain the shown bonus to hit this creature." for +N to hit labels', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ riderAttackBonus: 5 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                />
            );
            expect(screen.getByText('+5 to hit')).toBeInTheDocument();
        });
    });

    describe('Stealth Attack badge', () => {
        it('should render Stealth Attack badge when stealthAttackCost > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'stealthAttackCost') return 1;
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Stealth Attack')).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Stealth Attack badge when stealthAttackCost is 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'stealthAttackCost') return 0;
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                />
            );
            expect(screen.queryByText('Stealth Attack')).not.toBeInTheDocument();
        });
    });

    describe('Speed badges', () => {
        it('should render "Speed -15" badge when speedReduction is 15', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ speedReduction: 15 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'grappled' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Speed -15')).toBeInTheDocument();
        });

        it('should render "Speed 0" badge when speedReduction >= 1000', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ speedReduction: 1000 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'grappled' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Speed 0')).toBeInTheDocument();
        });
    });

    describe('No Adv vs badge', () => {
        it('should render No Adv vs badge when noAdvantageAgainst is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ noAdvantageAgainst: true }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'invisible' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('No Adv vs')).toBeInTheDocument();
        });
    });

    describe('Disadv vs badge', () => {
        it('should render Disadv vs badge when targetDisadvantageCount > 0 and no noAdvantageAgainst', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ targetDisadvantageCount: 2 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Disadv vs')).toBeInTheDocument();
        });

        it('should NOT render Disadv vs when noAdvantageAgainst is true even if targetDisadvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ noAdvantageAgainst: true, targetDisadvantageCount: 3 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'invisible' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('No Adv vs')).toBeInTheDocument();
            expect(screen.queryByText('Disadv vs')).not.toBeInTheDocument();
        });
    });

    describe('Attack Disadv badge', () => {
        it('should render Attack Disadv badge when targetAttackDisadvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ targetAttackDisadvantageCount: 1 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Attack Disadv')).toBeInTheDocument();
        });
    });
});
