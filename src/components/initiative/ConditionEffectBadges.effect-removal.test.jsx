import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

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
};

function makeEffects(overrides = {}) {
    return { ...defaultEffects, ...overrides };
}

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn(() => makeEffects({})),
}));

import { computeConditionEffects } from '../../services/combat/conditions/conditionEffects.js';

describe('ConditionEffectBadges - Effect Removal Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('removeAction: condition', () => {
        it('should call removeConditionByKey when badge has condition removeAction', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'charmed' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.queryAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
        });
    });

    describe('removeAction: remove_pfeag', () => {
        it('should remove pfeag target effect, filter pfeag buffs, and clear protectionFromEvilAndGoodWardedTypes', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'protection_from_evil_and_good', source: 'Cleric' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Protection from Evil and Good', effect: 'protection_from_evil_and_good' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'charmed' }]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledTimes(3);
        });
    });

    describe('removeAction: remove_buff', () => {
        it('should filter out specific buff effects when Warding Bond badge is removed', () => {
            const existingBuffs = [
                { name: 'Zealous Presence', effect: 'advantage_attacks_and_saves' },
                { name: 'Vow of Enmity', effect: 'vow_of_enmity' },
                { name: 'Dodge', effect: 'dodge' },
                { name: 'Haste', effect: 'haste' },
                { name: 'Warding Bond', effect: 'warding_bond' },
                { name: 'Other Buff', effect: 'other' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (name === 'Alice' && key === 'activeBuffs') return existingBuffs;
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
            const badges = screen.getAllByTestId('creature-badge');
            const wardingBadge = badges.find(b => b.textContent?.includes('Warding Bond'));
            if (wardingBadge) {
                const parentDiv = wardingBadge.parentElement;
                const removeBtn = parentDiv?.querySelector('.creature-badge-remove');
                if (removeBtn) {
                    fireEvent.click(removeBtn);
                }
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'activeBuffs',
                expect.arrayContaining([expect.objectContaining({ effect: 'other' })]),
                'test-campaign'
            );
        });
    });

    describe('removeAction: remove_derived', () => {
        it('should remove target effects by types when badge has remove_derived removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'blur', source: 'Mage' },
                { target: 'Alice', effect: 'foresight', source: 'Mage' },
                { target: 'Bob', effect: 'sanctuary', source: 'Cleric' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ noAdvantageAgainst: true }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'invisible' }]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([existingEffects[2]]),
                'test-campaign'
            );
        });
    });

    describe('removeAction: remove_haste', () => {
        it('should remove haste target effects and buffs when badge has remove_haste removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'haste', source: 'Wizard' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Haste', effect: 'haste' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ hasteActive: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledTimes(2);
        });
    });

    describe('removeAction: remove_barkskin', () => {
        it('should remove barkskin target effects and buffs when badge has remove_barkskin removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'barkskin', source: 'Druid' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Barkskin', effect: 'barkskin' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ barkskinActive: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledTimes(2);
        });
    });

    describe('removeAction: inspiring_move', () => {
        it('should set inspiringMovementNoOA to false when badge has inspiring_move removeAction', () => {
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'inspiringMovementNoOA',
                false,
                'test-campaign'
            );
        });
    });

    describe('removeAction: remarkable_no_oa', () => {
        it('should set remarkableAthleteNoOA to false when badge has remarkable_no_oa removeAction', () => {
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'remarkableAthleteNoOA',
                false,
                'test-campaign'
            );
        });
    });

    describe('removeAction: oa_disadv', () => {
        it('should set hasSpeedyOpportunityDisadvantage to false when badge has oa_disadv removeAction', () => {
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'hasSpeedyOpportunityDisadvantage',
                false,
                'test-campaign'
            );
        });
    });

    describe('removeAction: difficult_terrain_ignore', () => {
        it('should set hasSpeedyDifficultTerrainIgnore to false when badge has difficult_terrain_ignore removeAction', () => {
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'hasSpeedyDifficultTerrainIgnore',
                false,
                'test-campaign'
            );
        });
    });

    describe('removeAction: corona_disadvantage', () => {
        it('should set coronaDisadvantage to false when badge has corona_disadvantage removeAction', () => {
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'coronaDisadvantage',
                false,
                'test-campaign'
            );
        });
    });

    describe('removeAction: taunting_step', () => {
        it('should remove taunting_step target effect when badge has taunting_step removeAction', () => {
            const existingEffects = [
                { target: 'Alice', effect: 'taunting_step', source: 'Rogue' },
            ];
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'campaign' && key === 'targetEffects') return existingEffects;
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={existingEffects}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                'test-campaign'
            );
        });
    });

    describe('removeAction: stealth_attack', () => {
        it('should set stealthAttackCost to 0 when badge has stealth_attack removeAction', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'stealthAttackCost') return 5;
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
            const removeBtns = screen.getAllByTitle('Remove effect');
            if (removeBtns.length > 0) {
                fireEvent.click(removeBtns[0]);
            }
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'Alice',
                'stealthAttackCost',
                0,
                'test-campaign'
            );
        });
    });


});
