// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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
    computeConditionEffects: vi.fn(() => makeEffects({})),
}));

function renderNoOA(props = {}) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === 'Alice' && key === 'activeBuffs') return [];
        return null;
    });
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[]}
            creatureName="Alice"
            campaignName="test-campaign"
            isLocalhost={true}
            {...props}
        />
    );
}

function renderSpeedy(props = {}) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === 'Alice' && key === 'activeBuffs') return [];
        return null;
    });
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[]}
            creatureName="Alice"
            campaignName="test-campaign"
            isLocalhost={true}
            {...props}
        />
    );
}

describe('ConditionEffectBadges - No OA & Speedy Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('No OA badge', () => {
        it('should render No OA badge with correct styling and icon when riderCannotOpportunityAttack is true', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderCannotOpportunityAttack: true }));
            renderNoOA();
            const badge = screen.getByText('No OA');
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-ban"]')).toBeInTheDocument();
        });

        it('should render No OA badge with tooltip describing the effect', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderCannotOpportunityAttack: true }));
            renderNoOA();
            expect(screen.getByTitle('Cannot make opportunity attacks.')).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderCannotOpportunityAttack: true }));
            renderNoOA();
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not render No OA badge when riderCannotOpportunityAttack is false', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderCannotOpportunityAttack: false }));
            renderNoOA();
            expect(screen.queryByText('No OA')).not.toBeInTheDocument();
        });
    });

    describe('No OA (Crit) badge', () => {
        it('should render No OA (Crit) badge with correct styling and icon when remarkableAthleteNoOA is true', () => {
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
            const badge = screen.getByText('No OA (Crit)');
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-ban"]')).toBeInTheDocument();
        });

        it('should render No OA (Crit) badge with tooltip describing the critical hit exemption', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'remarkableAthleteNoOA') return true;
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByTitle(/Remarkable Athlete/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
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
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not render No OA (Crit) badge when remarkableAthleteNoOA is false', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'remarkableAthleteNoOA') return false;
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
            expect(screen.queryByText('No OA (Crit)')).not.toBeInTheDocument();
        });
    });

    describe('Speedy badges', () => {
        describe('OA Disadv badge', () => {
            it('should render OA Disadv badge with correct styling and icon when hasSpeedyOpportunityDisadvantage is true', () => {
                renderSpeedy({ hasSpeedyOpportunityDisadvantage: true });
                const badge = screen.getByText('OA Disadv');
                expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
                expect(badge.querySelector('[class*="fa-arrow-down"]')).toBeInTheDocument();
            });

            it('should render OA Disadv badge with tooltip explaining disadvantage on opportunity attacks', () => {
                renderSpeedy({ hasSpeedyOpportunityDisadvantage: true });
                expect(screen.getByTitle('Opportunity attacks against this creature have disadvantage.')).toBeInTheDocument();
            });

            it('should be removable when isLocalhost is true', () => {
                renderSpeedy({ hasSpeedyOpportunityDisadvantage: true });
                expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
            });

            it('should not render OA Disadv badge when hasSpeedyOpportunityDisadvantage is false', () => {
                renderSpeedy({ hasSpeedyOpportunityDisadvantage: false });
                expect(screen.queryByText('OA Disadv')).not.toBeInTheDocument();
            });
        });

        describe('No Difficult Terrain on Dash badge', () => {
            it('should render No Difficult Terrain on Dash badge with correct styling and icon when hasSpeedyDifficultTerrainIgnore is true', () => {
                renderSpeedy({ hasSpeedyDifficultTerrainIgnore: true });
                const badge = screen.getByText('No Difficult Terrain on Dash');
                expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
                expect(badge.querySelector('[class*="fa-person-walking"]')).toBeInTheDocument();
            });

            it('should render No Difficult Terrain on Dash badge with tooltip explaining terrain immunity on dash', () => {
                renderSpeedy({ hasSpeedyDifficultTerrainIgnore: true });
                expect(screen.getByTitle('Can ignore difficult terrain when taking the Dash action.')).toBeInTheDocument();
            });

            it('should be removable when isLocalhost is true', () => {
                renderSpeedy({ hasSpeedyDifficultTerrainIgnore: true });
                expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
            });

            it('should not render No Difficult Terrain on Dash badge when hasSpeedyDifficultTerrainIgnore is false', () => {
                renderSpeedy({ hasSpeedyDifficultTerrainIgnore: false });
                expect(screen.queryByText('No Difficult Terrain on Dash')).not.toBeInTheDocument();
            });
        });

        describe('Disadv Fire/Radiant badge', () => {
            it('should render Disadv Fire/Radiant badge with correct styling and icon when coronaDisadvantage is true', () => {
                renderSpeedy({ coronaDisadvantage: true });
                const badge = screen.getByText('Disadv Fire/Radiant');
                expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
                expect(badge.querySelector('[class*="fa-sun"]')).toBeInTheDocument();
            });

            it('should render Disadv Fire/Radiant badge with tooltip explaining fire and radiant vulnerability', () => {
                renderSpeedy({ coronaDisadvantage: true });
                expect(screen.getByTitle('Has disadvantage on saving throws against Fire and Radiant damage.')).toBeInTheDocument();
            });

            it('should be removable when isLocalhost is true', () => {
                renderSpeedy({ coronaDisadvantage: true });
                expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
            });

            it('should not render Disadv Fire/Radiant badge when coronaDisadvantage is false', () => {
                renderSpeedy({ coronaDisadvantage: false });
                expect(screen.queryByText('Disadv Fire/Radiant')).not.toBeInTheDocument();
            });
        });
    });

    describe('Speedy badge removal handlers', () => {
        it('should set hasSpeedyOpportunityDisadvantage to false when OA Disadv badge remove button is clicked', () => {
            renderSpeedy({ hasSpeedyOpportunityDisadvantage: true });
            const removeBtns = screen.getAllByTitle('Remove effect');
            expect(removeBtns.length).toBeGreaterThan(0);
            fireEvent.click(removeBtns[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'hasSpeedyOpportunityDisadvantage',
                false,
                'test-campaign'
            );
        });

        it('should set hasSpeedyDifficultTerrainIgnore to false when No Difficult Terrain on Dash badge remove button is clicked', () => {
            renderSpeedy({ hasSpeedyDifficultTerrainIgnore: true });
            const removeBtns = screen.getAllByTitle('Remove effect');
            expect(removeBtns.length).toBeGreaterThan(0);
            fireEvent.click(removeBtns[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'hasSpeedyDifficultTerrainIgnore',
                false,
                'test-campaign'
            );
        });

        it('should set coronaDisadvantage to false when Disadv Fire/Radiant badge remove button is clicked', () => {
            renderSpeedy({ coronaDisadvantage: true });
            const removeBtns = screen.getAllByTitle('Remove effect');
            expect(removeBtns.length).toBeGreaterThan(0);
            fireEvent.click(removeBtns[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'coronaDisadvantage',
                false,
                'test-campaign'
            );
        });
    });
});
