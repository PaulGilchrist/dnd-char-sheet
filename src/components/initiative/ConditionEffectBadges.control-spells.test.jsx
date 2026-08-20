// @improved-by-ai
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
    computeConditionEffects: vi.fn(() => makeEffects({})),
}));

const CREATURE_NAME = 'Alice';
const CAMPAIGN_NAME = 'test-campaign';

function renderWithTargetEffect(targetEffect, overrides = {}) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects(overrides));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={targetEffect ? [targetEffect] : []}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
            {...overrides}
        />
    );
}

function renderWithTargetEffectWrongTarget(targetEffect) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects({}));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={targetEffect ? [targetEffect] : []}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
        />
    );
}

function renderWithTargetEffectNoCallback(targetEffect) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects({}));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={targetEffect ? [targetEffect] : []}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
        />
    );
}

describe('ConditionEffectBadges - Control Spell Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Tasha's Hideous Laughter badge", () => {
        it('should render when tashas_hideous_laughter targetEffect is present for this creature', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 });
            expect(screen.getByText("Tasha's Hideous Laughter")).toBeInTheDocument();
        });

        it('should not render when tashas_hideous_laughter targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget({ target: 'Bob', effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 });
            expect(screen.queryByText("Tasha's Hideous Laughter")).not.toBeInTheDocument();
        });

        it('should roll the WIS reroll save when the badge is clicked with onRollConditionSave callback', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText("Tasha's Hideous Laughter"));
            expect(onRollConditionSave).toHaveBeenCalledWith(CREATURE_NAME, { key: 'prone', label: 'Prone', dc: 15, ability: 'wis' });
        });

        it('should render as a non-clickable span when onRollConditionSave is not provided', () => {
            renderWithTargetEffectNoCallback({ target: CREATURE_NAME, effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 15 });
            const badge = screen.getByText("Tasha's Hideous Laughter");
            expect(badge.tagName).toBe('SPAN');
        });

        it('should render with tooltip containing caster name and DC', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'tashas_hideous_laughter', source: 'Wizard', dc: 12 });
            expect(screen.getByTitle(/Tasha's Hideous Laughter from Wizard/)).toBeInTheDocument();
            expect(screen.getByTitle(/DC 12/)).toBeInTheDocument();
        });
    });

    describe('Banishment badge', () => {
        it('should render when banishment targetEffect is present for this creature', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'banishment', source: 'Cleric' });
            expect(screen.getByText('Banished')).toBeInTheDocument();
        });

        it('should not render when banishment targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget({ target: 'Bob', effect: 'banishment', source: 'Cleric' });
            expect(screen.queryByText('Banished')).not.toBeInTheDocument();
        });

        it('should indicate permanent banishment in tooltip', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'banishment', source: 'Cleric', permanent: true });
            expect(screen.getByTitle(/Permanent banishment/)).toBeInTheDocument();
        });

        it('should indicate concentration-based banishment when not permanent', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'banishment', source: 'Cleric', permanent: false });
            expect(screen.getByTitle(/Concentration/)).toBeInTheDocument();
            expect(screen.queryByTitle(/Permanent banishment/)).not.toBeInTheDocument();
        });

        it('should render with tooltip containing caster name', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'banishment', source: 'Paladin' });
            expect(screen.getByTitle(/Banished by Paladin/)).toBeInTheDocument();
        });
    });

    describe('Maze badge', () => {
        it('should render Mazed badge when maze targetEffect is present for this creature', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'maze', source: 'Wizard', dc: 20 });
            expect(screen.getByText('Mazed')).toBeInTheDocument();
        });

        it('should not render when maze targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget({ target: 'Bob', effect: 'maze', source: 'Wizard', dc: 20 });
            expect(screen.queryByText('Mazed')).not.toBeInTheDocument();
        });

        it('should roll the INT escape check when the badge is clicked with onRollConditionSave callback', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'maze', source: 'Wizard', dc: 20 }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText('Mazed'));
            expect(onRollConditionSave).toHaveBeenCalledWith(CREATURE_NAME, { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });
        });

        it('should render as a non-clickable span when onRollConditionSave is not provided', () => {
            renderWithTargetEffectNoCallback({ target: CREATURE_NAME, effect: 'maze', source: 'Wizard', dc: 20 });
            const badge = screen.getByText('Mazed');
            expect(badge.tagName).toBe('SPAN');
        });

        it('should render with tooltip containing caster name and DC', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'maze', source: 'Wizard', dc: 18 });
            expect(screen.getByTitle(/Mazed by Wizard/)).toBeInTheDocument();
            expect(screen.getByTitle(/DC 18/)).toBeInTheDocument();
        });
    });

    describe('Imprisonment badge', () => {
        it('should render Imprisoned badge when imprisonment targetEffect is present for this creature', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'imprisonment', source: 'Wizard', prisonType: 'Buried' });
            expect(screen.getByText('Imprisoned')).toBeInTheDocument();
        });

        it('should not render when imprisonment targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget({ target: 'Bob', effect: 'imprisonment', source: 'Wizard', prisonType: 'Buried' });
            expect(screen.queryByText('Imprisoned')).not.toBeInTheDocument();
        });

        it('should include prisonType in tooltip', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'imprisonment', source: 'Wizard', prisonType: 'Slumber' });
            expect(screen.getByTitle(/Slumber/)).toBeInTheDocument();
        });

        it('should include duration in tooltip when present', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'imprisonment', source: 'Wizard', prisonType: 'Buried', duration: 'Until dispelled' });
            expect(screen.getByTitle(/Until dispelled/)).toBeInTheDocument();
        });
    });

    describe('Confusion badge', () => {
        it('should render Confused badge when confusion targetEffect is present for this creature', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'confusion', source: 'Wizard', dc: 15 });
            expect(screen.getByText('Confused')).toBeInTheDocument();
        });

        it('should not render when confusion targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget({ target: 'Bob', effect: 'confusion', source: 'Wizard', dc: 15 });
            expect(screen.queryByText('Confused')).not.toBeInTheDocument();
        });

        it('should roll the WIS save when the badge is clicked with onRollConditionSave callback', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'confusion', source: 'Wizard', dc: 15 }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText('Confused'));
            expect(onRollConditionSave).toHaveBeenCalledWith(CREATURE_NAME, { key: 'confused', label: 'Confused', dc: 15, ability: 'wis' });
        });

        it('should render as a non-clickable span when onRollConditionSave is not provided', () => {
            renderWithTargetEffectNoCallback({ target: CREATURE_NAME, effect: 'confusion', source: 'Wizard', dc: 15 });
            const badge = screen.getByText('Confused');
            expect(badge.tagName).toBe('SPAN');
        });

        it('should render with tooltip containing caster name and DC', () => {
            renderWithTargetEffect({ target: CREATURE_NAME, effect: 'confusion', source: 'Bard', dc: 16 });
            expect(screen.getByTitle(/Confused by Bard/)).toBeInTheDocument();
            expect(screen.getByTitle(/DC 16/)).toBeInTheDocument();
        });
    });
});
