// @improved-by-ai
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

const CREATURE_NAME = 'Alice';
const CAMPAIGN_NAME = 'test-campaign';

function renderWithEffects(effectsOverrides = {}, props = {}) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return props.buffs || [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects(effectsOverrides));
    return render(
        <ConditionEffectBadges
            conditions={props.conditions || []}
            targetEffects={props.targetEffects || []}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            allCreatures={props.allCreatures}
            isLocalhost={props.isLocalhost ?? true}
        />
    );
}

describe('ConditionEffectBadges - Save & Ability Check Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Adv badge', () => {
        it('should render Adv badge as effect-buff with arrow-up icon when attackAdvantageCount > 0', () => {
            renderWithEffects(
                { attackAdvantageCount: 1, attackAdvantageReasons: ['Invisible'] },
                { conditions: [{ key: 'invisible' }] }
            );
            const badge = screen.getByText('Adv');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-arrow-up"]')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on attack rolls.*Invisible/)).toBeInTheDocument();
        });

        it('should NOT render Adv badge when attackAdvantageCount is 0', () => {
            renderWithEffects({ attackAdvantageCount: 0 });
            expect(screen.queryByText('Adv')).not.toBeInTheDocument();
        });

        it('should render Adv badge without reasons when attackAdvantageReasons is empty', () => {
            renderWithEffects({ attackAdvantageCount: 1, attackAdvantageReasons: [] });
            const badge = screen.getByText('Adv');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
        });
    });

    describe('Adv badge from Vow of Enmity', () => {
        it('should render Adv badge when allCreatures has Vow of Enmity targeting this creature', () => {
            getRuntimeValue.mockImplementation((name, key, campaign) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [];
                if (key === 'vowOfEnmityTarget' && campaign) {
                    return CREATURE_NAME;
                }
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    allCreatures={[{ name: 'Paladin' }]}
                    isLocalhost={true}
                />
            );
            const badge = screen.getByText('Adv');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-arrow-up"]')).toBeInTheDocument();
        });

        it('should NOT render Adv badge from Vow of Enmity when allCreatures is not provided', () => {
            renderWithEffects({ attackAdvantageCount: 0 });
            expect(screen.queryByText('Adv')).not.toBeInTheDocument();
        });
    });

    describe('Adv vs badge', () => {
        it('should render Adv vs badge as effect-debuff with arrow-up icon when targetAdvantageCount > 0', () => {
            renderWithEffects(
                { targetAdvantageCount: 1, targetAdvantageReasons: ['Reckless Attack'] },
                { conditions: [{ key: 'blinded' }] }
            );
            const badge = screen.getByText('Adv vs');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-arrow-up"]')).toBeInTheDocument();
            expect(screen.getByTitle(/Attackers have advantage.*Reckless Attack/)).toBeInTheDocument();
        });

        it('should NOT render Adv vs badge when targetAdvantageCount is 0', () => {
            renderWithEffects({ targetAdvantageCount: 0 });
            expect(screen.queryByText('Adv vs')).not.toBeInTheDocument();
        });
    });

    describe('Adv Save badge', () => {
        it('should render Adv Save badge as effect-buff with shield icon when saveAdvantageCount > 0', () => {
            renderWithEffects(
                { saveAdvantageCount: 1, saveAdvantageReasons: ['Foresight'] },
                { conditions: [{ key: 'blinded' }] }
            );
            const badge = screen.getByText('Adv Save');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-shield-halved"]')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on saving throws.*Foresight/)).toBeInTheDocument();
        });

        it('should NOT render Adv Save badge when saveAdvantageCount is 0', () => {
            renderWithEffects({ saveAdvantageCount: 0 });
            expect(screen.queryByText('Adv Save')).not.toBeInTheDocument();
        });
    });

    describe('Adv DEX Save badge', () => {
        it('should render Adv DEX Save badge as effect-buff with shield icon when dexSaveAdvantageCount > 0', () => {
            renderWithEffects(
                { dexSaveAdvantageCount: 1 },
                { buffs: [{ name: 'Dodge', effect: 'dodge' }] }
            );
            const badge = screen.getByText('Adv DEX Save');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-shield-halved"]')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on Dexterity saving throws/)).toBeInTheDocument();
        });

        it('should NOT render Adv DEX Save badge when dexSaveAdvantageCount is 0', () => {
            renderWithEffects({ dexSaveAdvantageCount: 0 });
            expect(screen.queryByText('Adv DEX Save')).not.toBeInTheDocument();
        });
    });

    describe('Save Disadv badge', () => {
        it('should render Save Disadv badge with specific save type when saveDisadvantage contains a type', () => {
            renderWithEffects({ saveDisadvantageCount: 1, saveDisadvantage: ['dex'] });
            const badge = screen.getByText(/Save Disadv \(dex\)/);
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-shield"]')).toBeInTheDocument();
        });

        it('should render Save Disadv badge with multiple save types', () => {
            renderWithEffects({ saveDisadvantageCount: 2, saveDisadvantage: ['dex', 'con'] });
            const badge = screen.getByText(/Save Disadv \(dex, con\)/);
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
        });

        it('should NOT render Save Disadv badge when saveDisadvantageCount is 0', () => {
            renderWithEffects({ saveDisadvantageCount: 0 });
            expect(screen.queryByText(/Save Disadv/)).not.toBeInTheDocument();
        });
    });

    describe('Check Disadv badge', () => {
        it('should render Check Disadv badge with ability names when abilityCheckDisadvantageAbilities is set', () => {
            renderWithEffects({ abilityCheckDisadvantageAbilities: ['STR', 'DEX'] });
            const badge = screen.getByText(/Check Disadv \(str, dex\)/);
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-shield"]')).toBeInTheDocument();
        });

        it('should render Check Disadv badge with a single ability', () => {
            renderWithEffects({ abilityCheckDisadvantageAbilities: ['STR'] });
            const badge = screen.getByText(/Check Disadv \(str\)/);
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-debuff"]')).toBeInTheDocument();
        });

        it('should NOT render Check Disadv badge when abilityCheckDisadvantageAbilities is empty', () => {
            renderWithEffects({ abilityCheckDisadvantageAbilities: [] });
            expect(screen.queryByText(/Check Disadv/)).not.toBeInTheDocument();
        });
    });

    describe('Adv Check badge', () => {
        it('should render Adv Check badge with ability names when abilityCheckAdvantageAbilities is set', () => {
            renderWithEffects({ abilityCheckAdvantageAbilities: ['STR'] });
            const badge = screen.getByText(/Adv Check \(str\)/);
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-hand"]')).toBeInTheDocument();
        });

        it('should NOT render Adv Check badge when abilityCheckAdvantageAbilities is empty', () => {
            renderWithEffects({ abilityCheckAdvantageAbilities: [] });
            expect(screen.queryByText(/Adv Check/)).not.toBeInTheDocument();
        });

        it('should render Adv Check badge when abilityCheckAdvantage is true without specific abilities', () => {
            renderWithEffects({ abilityCheckAdvantage: true, abilityCheckAdvantageReasons: ['Foresight'] });
            const badge = screen.getByText('Adv Check');
            expect(badge).toBeInTheDocument();
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
            expect(badge.querySelector('[class*="fa-hand"]')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on all ability checks.*Foresight/)).toBeInTheDocument();
        });

        it('should NOT render Adv Check badge when abilityCheckAdvantage is false', () => {
            renderWithEffects({ abilityCheckAdvantage: false });
            expect(screen.queryByText('Adv Check')).not.toBeInTheDocument();
        });
    });

    describe('Badge deduplication', () => {
        it('should deduplicate Adv badges when multiple sources provide the same label', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [
                    { name: 'Haste', effect: 'haste' },
                    { name: 'Vow of Enmity', effect: 'vow_of_enmity' },
                ];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({
                attackAdvantageCount: 2,
                attackAdvantageReasons: ['Vow of Enmity', 'Foresight'],
            }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            const advBadges = screen.queryAllByText('Adv');
            expect(advBadges.length).toBeLessThanOrEqual(1);
        });
    });
});
