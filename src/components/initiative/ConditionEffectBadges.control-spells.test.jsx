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

describe('ConditionEffectBadges - Control Spell Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Tasha's Hideous Laughter badge", () => {
        it('should render Tasha\'s Hideous Laughter badge when tashas_hideous_laughter targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText("Tasha's Hideous Laughter")).toBeInTheDocument();
        });

        it('should roll the WIS reroll save when the Tasha badge is clicked', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
            expect(onRollConditionSave).toHaveBeenCalledWith('Alice', { key: 'prone', label: 'Prone', dc: 15, ability: 'wis' });
        });
    });

    describe('Banishment badge', () => {
        it('should render Banished badge when banishment targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'banishment', source: 'Cleric' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Banished')).toBeInTheDocument();
        });

        it('should indicate permanent banishment in tooltip', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'banishment', source: 'Cleric', permanent: true }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByTitle(/Permanent banishment/)).toBeInTheDocument();
        });
    });

    describe('Maze badge', () => {
        it('should render Mazed badge when maze targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'maze', source: 'Wizard', dc: 20 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Mazed')).toBeInTheDocument();
        });

        it('should roll the INT escape check when the Maze badge is clicked', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'maze', source: 'Wizard', dc: 20 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText('Mazed'));
            expect(onRollConditionSave).toHaveBeenCalledWith('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });
        });
    });

    describe('Imprisonment badge', () => {
        it('should render Imprisoned badge when imprisonment targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'imprisonment', source: 'Wizard', prisonType: 'Buried' }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Imprisoned')).toBeInTheDocument();
        });
    });

    describe('Confusion badge', () => {
        it('should render Confused badge when confusion targetEffect is present', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'confusion', source: 'Wizard', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Confused')).toBeInTheDocument();
        });

        it('should roll the WIS save when the Confused badge is clicked', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'confusion', source: 'Wizard', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText('Confused'));
            expect(onRollConditionSave).toHaveBeenCalledWith('Alice', { key: 'confused', label: 'Confused', dc: 15, ability: 'wis' });
        });
    });
});
