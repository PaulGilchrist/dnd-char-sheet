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

describe('ConditionEffectBadges - Aura & Protection Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Globe of Invulnerability badge', () => {
        it('should render Globe of Invulnerability badge when globe_barrier targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'globe_barrier', source: 'Wizard' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Globe of Invulnerability')).toBeInTheDocument();
        });
    });

    describe('Antimagic Field badge', () => {
        it('should render Antimagic Field badge when antimagic_field targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'antimagic_field', source: 'Wizard' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Antimagic Field')).toBeInTheDocument();
        });
    });

    describe('Regenerate badge', () => {
        it('should render Regenerate badge when regenerate targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'regenerate', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Regenerate')).toBeInTheDocument();
        });
    });

    describe('Aura of Life badge', () => {
        it('should render Aura of Life badge when aura_of_life targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'aura_of_life', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Aura of Life')).toBeInTheDocument();
        });
    });

    describe('Aura of Purity badge', () => {
        it('should render Aura of Purity badge when aura_of_purity targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'aura_of_purity', source: 'Paladin' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Aura of Purity')).toBeInTheDocument();
        });
    });

    describe('Circle of Power badge', () => {
        it('should render Circle of Power badge when circle_of_power targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'circle_of_power', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Circle of Power')).toBeInTheDocument();
        });
    });

    describe('Heroism badge', () => {
        it('should render Heroism badge when heroism targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'heroism', source: 'Paladin' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Heroism')).toBeInTheDocument();
        });
    });

    describe('Holy Aura badge', () => {
        it('should render Holy Aura badge when holy_aura targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'holy_aura', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Holy Aura')).toBeInTheDocument();
        });
    });

    describe('Warding Bond badge', () => {
        it('should render Warding Bond badge when warding_bond buff is active', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Warding Bond', effect: 'warding_bond', sourceCharacter: 'Cleric' }];
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
            expect(screen.getByText('Warding Bond')).toBeInTheDocument();
        });
    });

    describe('Protection from Evil and Good badge', () => {
        it('should render Protection from Evil and Good badge when pfeag targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'protection_from_evil_and_good', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Protection from Evil and Good')).toBeInTheDocument();
        });
    });

    describe('Protection from Poison badge', () => {
        it('should render Protection from Poison badge when pfp targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'protection_from_poison', source: 'Cleric', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Protection from Poison')).toBeInTheDocument();
        });

        it('should have onClick handler for Protection from Poison when onRollConditionSave is provided', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'protection_from_poison', source: 'Cleric', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            const badge = screen.getByText('Protection from Poison');
            expect(badge.tagName).toBe('BUTTON');
        });
    });
});
