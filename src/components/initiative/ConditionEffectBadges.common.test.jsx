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

describe('ConditionEffectBadges - Common Helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Badge deduplication', () => {
        it('should deduplicate badges by label keeping the first occurrence', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [
                    { name: 'Haste', effect: 'haste' },
                    { name: 'Vow of Enmity', effect: 'vow_of_enmity' },
                ];
                return null;
            });
            runtimeState.getRuntimeValue.mockImplementation((creatureName, key) => {
                if (key === 'activeBuffs') return [
                    { name: 'Haste', effect: 'haste' },
                    { name: 'Vow of Enmity', effect: 'vow_of_enmity' },
                ];
                if (key === 'vowOfEnmityTarget') return 'Alice';
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({
                hasteActive: true,
                attackAdvantageCount: 2,
                attackAdvantageReasons: ['Vow of Enmity', 'Foresight'],
            }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const badges = screen.getAllByTestId('creature-badge');
            // There should be at most one "Adv" badge after deduplication
            const advLabels = badges.filter(b => b.textContent?.trim() === 'Adv');
            expect(advLabels.length).toBeLessThanOrEqual(1);
        });
    });

    describe('resolveCls indirect tests', () => {
        it('should render with resolved CSS class for effect-stealth-attack', () => {
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
            const badge = screen.getByText('Stealth Attack');
            expect(badge).toBeInTheDocument();
        });
    });

    describe('CreatureBadge rendering', () => {
        it('should render CreatureBadge as span when no onClick', () => {
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
                    isLocalhost={false}
                />
            );
            const badge = screen.getByText('Sanctuary');
            expect(badge.tagName).toBe('SPAN');
        });

        it('should render CreatureBadge as button when onClick is provided', () => {
            const onRollConditionSave = vi.fn();
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Alice', effect: 'ottos_irresistible_dance', source: 'Wizard', dc: 15 }]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            const badge = screen.getByText("Otto's Irresistible Dance");
            expect(badge.tagName).toBe('BUTTON');
        });
    });

    describe('Vow of Enmity from allCreatures', () => {
        it('should add attackAdvantageCount when another creature has Vow of Enmity targeting this creature', () => {
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
                />
            );
            expect(screen.getByText('Adv')).toBeInTheDocument();
        });

        it('should NOT add attackAdvantageCount when no creature has Vow of Enmity targeting this creature', () => {
            const allCreatures = [{ name: 'Paladin' }];
            runtimeState.getRuntimeValue.mockImplementation((creatureName, key) => {
                if (key === 'activeBuffs') return [];
                if (key === 'vowOfEnmityTarget') {
                    if (creatureName === 'Paladin') return 'Bob';
                    return null;
                }
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ attackAdvantageCount: 0, attackAdvantageReasons: [] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    allCreatures={allCreatures}
                />
            );
            expect(screen.queryByText('Adv')).not.toBeInTheDocument();
        });
    });

    describe('Buff processing', () => {
        it('should process advantage_attacks_and_saves buff', () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Zealous Presence', effect: 'advantage_attacks_and_saves' }];
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
            expect(screen.getByText('Adv')).toBeInTheDocument();
            expect(screen.getByText('Adv Save')).toBeInTheDocument();
        });

        it('should process vow_of_enmity buff', () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Vow of Enmity', effect: 'vow_of_enmity' }];
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
            expect(screen.getByText('Adv')).toBeInTheDocument();
        });

        it('should process dodge buff', () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Dodge', effect: 'dodge' }];
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
            expect(screen.getByText('Disadv vs')).toBeInTheDocument();
            expect(screen.getByText('Adv DEX Save')).toBeInTheDocument();
        });

        it('should process clairvoyant_combatant buff', () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Clairvoyant Combatant', effect: 'clairvoyant_combatant' }];
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
            expect(screen.getByText('Adv')).toBeInTheDocument();
        });
    });
});
