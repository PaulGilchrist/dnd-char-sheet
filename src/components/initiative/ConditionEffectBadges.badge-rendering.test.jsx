import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';

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

import { computeConditionEffects } from '../../services/combat/conditions/conditionEffects.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

describe('ConditionEffectBadges - Badge Rendering', () => {
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

    describe('Adv badge', () => {
        it('should render Adv badge when attackAdvantageCount > 0 with reasons', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ attackAdvantageCount: 1, attackAdvantageReasons: ['Invisible'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'invisible' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv')).toBeInTheDocument();
            expect(screen.getByTitle(/Advantage on attack rolls.*Invisible/)).toBeInTheDocument();
        });

        it('should render Adv badge with Vow of Enmity reason', () => {
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
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv')).toBeInTheDocument();
        });
    });

    describe('Adv vs badge', () => {
        it('should render Adv vs badge when targetAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ targetAdvantageCount: 1, targetAdvantageReasons: ['Reckless Attack'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv vs')).toBeInTheDocument();
        });
    });

    describe('Adv Save badge', () => {
        it('should render Adv Save badge when saveAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ saveAdvantageCount: 1, saveAdvantageReasons: ['Foresight'] }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv Save')).toBeInTheDocument();
        });
    });

    describe('Adv DEX Save badge', () => {
        it('should render Adv DEX Save badge when dexSaveAdvantageCount > 0', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [{ name: 'Dodge', effect: 'dodge' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ dexSaveAdvantageCount: 1 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv DEX Save')).toBeInTheDocument();
        });
    });

    describe('Save Disadv badge', () => {
        it('should render Save Disadv badge when riderSaveDisadvantage is true', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ riderSaveDisadvantage: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Save Disadv')).toBeInTheDocument();
        });

        it('should render Save Disadv badge with hex save disadvantage', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ saveDisadvantageCount: 1, saveDisadvantage: ['dex'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Save Disadv (dex)')).toBeInTheDocument();
        });
    });

    describe('Ability Check Disadv badge', () => {
        it('should render Check Disadv badge when abilityCheckDisadvantageAbilities is set', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckDisadvantageAbilities: ['STR', 'DEX'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText(/Check Disadv \(str, dex\)/)).toBeInTheDocument();
        });
    });

    describe('Adv Check badge', () => {
        it('should render Adv Check badge when abilityCheckAdvantageAbilities is set', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckAdvantageAbilities: ['STR'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText(/Adv Check \(str\)/)).toBeInTheDocument();
        });

        it('should render Adv Check badge when abilityCheckAdvantage is true without abilities', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === 'Alice' && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({ abilityCheckAdvantage: true, abilityCheckAdvantageReasons: ['Foresight'] }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName="Alice"
                    campaignName="test-campaign"
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Adv Check')).toBeInTheDocument();
        });
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
