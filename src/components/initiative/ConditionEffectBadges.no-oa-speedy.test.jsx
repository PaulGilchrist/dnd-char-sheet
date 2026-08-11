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

describe('ConditionEffectBadges - No OA & Speedy Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('No OA badges', () => {
        it('should render No OA badge when riderCannotOpportunityAttack is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ riderCannotOpportunityAttack: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('No OA')).toBeInTheDocument();
        });

        it('should render Insp. Move badge when inspiringMovementNoOA is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'inspiringMovementNoOA') return true;
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
            expect(screen.getByText('Insp. Move')).toBeInTheDocument();
        });

        it('should render Insp. Move badge when hasTacticalShift is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'inspiringMovementNoOA') return null;
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
                    hasTacticalShift={true}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Insp. Move')).toBeInTheDocument();
        });

        it('should render No OA (Crit) badge when remarkableAthleteNoOA is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'remarkableAthleteNoOA') return true;
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
            expect(screen.getByText('No OA (Crit)')).toBeInTheDocument();
        });
    });

    describe('Speedy badges', () => {
        it('should render OA Disadv badge when hasSpeedyOpportunityDisadvantage is true', () => {
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
                    hasSpeedyOpportunityDisadvantage={true}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('OA Disadv')).toBeInTheDocument();
        });

        it('should render No Difficult Terrain on Dash badge when hasSpeedyDifficultTerrainIgnore is true', () => {
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
                    hasSpeedyDifficultTerrainIgnore={true}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('No Difficult Terrain on Dash')).toBeInTheDocument();
        });

        it('should render Disadv Fire/Radiant badge when coronaDisadvantage is true', () => {
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
                    coronaDisadvantage={true}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Disadv Fire/Radiant')).toBeInTheDocument();
        });
    });
});
