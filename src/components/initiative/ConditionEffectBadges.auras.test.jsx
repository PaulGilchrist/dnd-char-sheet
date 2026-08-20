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

const CREATURE_NAME = 'Alice';
const CAMPAIGN_NAME = 'test-campaign';

function renderWithTargetEffect(effectName, source, extra = {}, overrides = {}) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects(overrides));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[{ target: CREATURE_NAME, effect: effectName, source, ...extra }]}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
        />
    );
}

function renderWithBuffs(buffs) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return buffs;
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects({}));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[]}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
        />
    );
}

function renderWithTargetEffectWrongTarget(effectName, source) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects({}));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[{ target: 'Bob', effect: effectName, source }]}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={true}
        />
    );
}

function renderWithLocalhostFalse(effectName, source) {
    getRuntimeValue.mockImplementation((name, key) => {
        if (name === CREATURE_NAME && key === 'activeBuffs') return [];
        return null;
    });
    computeConditionEffects.mockReturnValue(makeEffects({}));
    return render(
        <ConditionEffectBadges
            conditions={[]}
            targetEffects={[{ target: CREATURE_NAME, effect: effectName, source }]}
            creatureName={CREATURE_NAME}
            campaignName={CAMPAIGN_NAME}
            isLocalhost={false}
        />
    );
}

describe('ConditionEffectBadges - Aura & Protection Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Globe of Invulnerability badge', () => {
        it('should render when globe_barrier targetEffect is present for this creature', () => {
            renderWithTargetEffect('globe_barrier', 'Wizard');
            expect(screen.getByText('Globe of Invulnerability')).toBeInTheDocument();
        });

        it('should not render when globe_barrier targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('globe_barrier', 'Wizard');
            expect(screen.queryByText('Globe of Invulnerability')).not.toBeInTheDocument();
        });

        it('should render with correct icon', () => {
            renderWithTargetEffect('globe_barrier', 'Wizard');
            const badge = screen.getByText('Globe of Invulnerability');
            expect(badge.closest('[class*="effect-buff"]')).toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('globe_barrier', 'Wizard');
            expect(screen.getByTitle(/Protected by Globe of Invulnerability/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('globe_barrier', 'Wizard');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('globe_barrier', 'Wizard');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Antimagic Field badge', () => {
        it('should render when antimagic_field targetEffect is present for this creature', () => {
            renderWithTargetEffect('antimagic_field', 'Wizard');
            expect(screen.getByText('Antimagic Field')).toBeInTheDocument();
        });

        it('should not render when antimagic_field targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('antimagic_field', 'Wizard');
            expect(screen.queryByText('Antimagic Field')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('antimagic_field', 'Wizard');
            expect(screen.getByTitle(/Affected by Antimagic Field/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('antimagic_field', 'Wizard');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('antimagic_field', 'Wizard');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Regenerate badge', () => {
        it('should render when regenerate targetEffect is present for this creature', () => {
            renderWithTargetEffect('regenerate', 'Cleric');
            expect(screen.getByText('Regenerate')).toBeInTheDocument();
        });

        it('should not render when regenerate targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('regenerate', 'Cleric');
            expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('regenerate', 'Cleric');
            expect(screen.getByTitle(/Regenerate from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('regenerate', 'Cleric');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('regenerate', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Aura of Life badge', () => {
        it('should render when aura_of_life targetEffect is present for this creature', () => {
            renderWithTargetEffect('aura_of_life', 'Cleric');
            expect(screen.getByText('Aura of Life')).toBeInTheDocument();
        });

        it('should not render when aura_of_life targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('aura_of_life', 'Cleric');
            expect(screen.queryByText('Aura of Life')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('aura_of_life', 'Cleric');
            expect(screen.getByTitle(/Aura of Life from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('aura_of_life', 'Cleric');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('aura_of_life', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Aura of Purity badge', () => {
        it('should render when aura_of_purity targetEffect is present for this creature', () => {
            renderWithTargetEffect('aura_of_purity', 'Paladin');
            expect(screen.getByText('Aura of Purity')).toBeInTheDocument();
        });

        it('should not render when aura_of_purity targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('aura_of_purity', 'Paladin');
            expect(screen.queryByText('Aura of Purity')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('aura_of_purity', 'Paladin');
            expect(screen.getByTitle(/Aura of Purity from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('aura_of_purity', 'Paladin');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('aura_of_purity', 'Paladin');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Circle of Power badge', () => {
        it('should render when circle_of_power targetEffect is present for this creature', () => {
            renderWithTargetEffect('circle_of_power', 'Cleric');
            expect(screen.getByText('Circle of Power')).toBeInTheDocument();
        });

        it('should not render when circle_of_power targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('circle_of_power', 'Cleric');
            expect(screen.queryByText('Circle of Power')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('circle_of_power', 'Cleric');
            expect(screen.getByTitle(/Circle of Power from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('circle_of_power', 'Cleric');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('circle_of_power', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Heroism badge', () => {
        it('should render when heroism targetEffect is present for this creature', () => {
            renderWithTargetEffect('heroism', 'Paladin');
            expect(screen.getByText('Heroism')).toBeInTheDocument();
        });

        it('should not render when heroism targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('heroism', 'Paladin');
            expect(screen.queryByText('Heroism')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('heroism', 'Paladin');
            expect(screen.getByTitle(/Heroism from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('heroism', 'Paladin');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('heroism', 'Paladin');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Holy Aura badge', () => {
        it('should render when holy_aura targetEffect is present for this creature', () => {
            renderWithTargetEffect('holy_aura', 'Cleric');
            expect(screen.getByText('Holy Aura')).toBeInTheDocument();
        });

        it('should not render when holy_aura targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('holy_aura', 'Cleric');
            expect(screen.queryByText('Holy Aura')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('holy_aura', 'Cleric');
            expect(screen.getByTitle(/Holy Aura from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('holy_aura', 'Cleric');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('holy_aura', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Warding Bond badge', () => {
        it('should render when warding_bond buff is active', () => {
            renderWithBuffs([{ name: 'Warding Bond', effect: 'warding_bond', sourceCharacter: 'Cleric' }]);
            expect(screen.getByText('Warding Bond')).toBeInTheDocument();
        });

        it('should not render when warding_bond buff is not active', () => {
            renderWithBuffs([]);
            expect(screen.queryByText('Warding Bond')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithBuffs([{ name: 'Warding Bond', effect: 'warding_bond', sourceCharacter: 'Cleric' }]);
            expect(screen.getByTitle(/Warding Bond from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithBuffs([{ name: 'Warding Bond', effect: 'warding_bond', sourceCharacter: 'Cleric' }]);
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [{ name: 'Warding Bond', effect: 'warding_bond', sourceCharacter: 'Cleric' }];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={false}
                />
            );
            expect(screen.getByText('Warding Bond')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Protection from Evil and Good badge', () => {
        it('should render when pfeag targetEffect is present for this creature', () => {
            renderWithTargetEffect('protection_from_evil_and_good', 'Cleric');
            expect(screen.getByText('Protection from Evil and Good')).toBeInTheDocument();
        });

        it('should not render when pfeag targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('protection_from_evil_and_good', 'Cleric');
            expect(screen.queryByText('Protection from Evil and Good')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('protection_from_evil_and_good', 'Cleric');
            expect(screen.getByTitle(/Protection from Evil and Good from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('protection_from_evil_and_good', 'Cleric');
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('protection_from_evil_and_good', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('Protection from Poison badge', () => {
        it('should render when pfp targetEffect is present for this creature', () => {
            renderWithTargetEffect('protection_from_poison', 'Cleric', { dc: 15 });
            expect(screen.getByText('Protection from Poison')).toBeInTheDocument();
        });

        it('should not render when pfp targetEffect is for a different creature', () => {
            renderWithTargetEffectWrongTarget('protection_from_poison', 'Cleric');
            expect(screen.queryByText('Protection from Poison')).not.toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            renderWithTargetEffect('protection_from_poison', 'Cleric', { dc: 15 });
            expect(screen.getByTitle(/Protection from Poison from/)).toBeInTheDocument();
        });

        it('should be removable when isLocalhost is true', () => {
            renderWithTargetEffect('protection_from_poison', 'Cleric', { dc: 15 });
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not be removable when isLocalhost is false', () => {
            renderWithLocalhostFalse('protection_from_poison', 'Cleric');
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });
});
