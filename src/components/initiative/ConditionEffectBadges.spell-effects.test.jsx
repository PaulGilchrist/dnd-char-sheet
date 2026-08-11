import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ConditionEffectBadges - Spell Effect Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Taunted badge', () => {
        it('should render Taunted badge when taunting_step targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'taunting_step', source: 'Rogue' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Taunted')).toBeInTheDocument();
            expect(screen.getByTitle(/Disadvantage on attack rolls vs creatures other than Rogue/)).toBeInTheDocument();
        });
    });

    describe('Compelled Duel badge', () => {
        it('should render Compelled Duel badge when compelled_duel targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'compelled_duel', source: 'Paladin' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Compelled Duel')).toBeInTheDocument();
        });
    });

    describe('Sanctuary badge', () => {
        it('should render Sanctuary badge when sanctuary targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'sanctuary', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
            expect(screen.getByTitle(/Sanctuary from Cleric/)).toBeInTheDocument();
        });
    });

    describe('Bane badge', () => {
        it('should render Bane badge when banePenalty effect is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ banePenalty: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'bane_penalty', source: 'Cleric', displayLabel: 'Bane' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('should render custom displayLabel for Bane badge', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ banePenalty: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'bane_penalty', source: 'Cleric', displayLabel: 'My Bane' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('My Bane')).toBeInTheDocument();
        });

        it('should render Bane as buff when caster is self', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ banePenalty: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'bane_penalty', source: 'Alice', displayLabel: 'Bane' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });
    });

    describe('Ray of Enfeeblement badge', () => {
        it('should render Enfeeblement badge when rayOfEnfeebleDamageReduction is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ rayOfEnfeebleDamageReduction: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'ray_of_enfeeble_debuff', source: 'Wizard' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Enfeeblement')).toBeInTheDocument();
        });
    });

    describe('Resistance badge', () => {
        it('should render Resistance badge when resistanceDamageReduction is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ resistanceDamageReduction: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'resistance_damage_reduction', source: 'Druid', chosenType: 'Fire' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Resistance')).toBeInTheDocument();
        });
    });

    describe('Bless badge', () => {
        it('should render Bless badge when blessBonus is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ blessBonus: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'bless_bonus', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Bless')).toBeInTheDocument();
        });
    });

    describe('Beacon of Hope badge', () => {
        it('should render Beacon of Hope badge when beaconOfHope is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ beaconOfHope: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'beacon_of_hope', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Beacon of Hope')).toBeInTheDocument();
        });
    });

    describe('Haste badge', () => {
        it('should render Hasted badge when hasteActive is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Haste', effect: 'haste' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ hasteActive: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Hasted')).toBeInTheDocument();
        });
    });

    describe('Barkskin badge', () => {
        it('should render Barkskin badge when barkskinActive is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Barkskin', effect: 'barkskin' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ barkskinActive: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Barkskin')).toBeInTheDocument();
        });
    });

    describe('Silenced badge', () => {
        it('should render Silenced badge when silenced targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'silenced', source: 'Wizard' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Silenced')).toBeInTheDocument();
        });
    });
});
