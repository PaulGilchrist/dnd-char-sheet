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

describe('ConditionEffectBadges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('empty state', () => {
        it('should render nothing when conditions is null and no effects apply', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={null}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                />
            );
            expect(screen.queryByText('Otto\'s Irresistible Dance')).not.toBeInTheDocument();
        });

        it('should render nothing when conditions is empty and no effects apply', () => {
            getRuntimeValue.mockImplementation((name, key) => {
                if (name === CREATURE_NAME && key === 'activeBuffs') return [];
                return null;
            });
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                />
            );
            // With no badges, there should be no clickable elements or badge text
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    describe('badges from conditions and target effects', () => {
        it.each([
            ['Speed -15', { speedReduction: 15 }, 'Speed -15'],
            ['Speed 0', { speedReduction: 1000 }, 'Speed 0'],
            ['Disadv vs', { targetDisadvantageCount: 2 }, 'Disadv vs'],
            ['No Adv vs', { noAdvantageAgainst: true }, 'No Adv vs'],
            ['Save Disadv', { riderSaveDisadvantage: true }, 'Save Disadv'],
            ['+5 to hit', { riderAttackBonus: 5 }, '+5 to hit'],
            ['No OA', { riderCannotOpportunityAttack: true }, 'No OA'],
        ])('should render %s badge when condition is active', (_, effects, expectedLabel) => {
            computeConditionEffects.mockReturnValue(makeEffects(effects));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                />
            );
            expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        });

        it.each([
            ['+3 to hit', { riderAttackBonus: 3 }],
            ['+7 to hit', { riderAttackBonus: 7 }],
        ])('should render rider attack bonus badge with value %s when riderAttackBonus is set', (_, effects) => {
            computeConditionEffects.mockReturnValue(makeEffects(effects));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                />
            );
            expect(screen.getByText(`+${effects.riderAttackBonus} to hit`)).toBeInTheDocument();
        });

        it('should prefer No Adv vs over Disadv vs when both are set', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ noAdvantageAgainst: true, targetDisadvantageCount: 3 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                />
            );
            expect(screen.getByText('No Adv vs')).toBeInTheDocument();
            expect(screen.queryByText('Disadv vs')).not.toBeInTheDocument();
        });
    });

    describe('badges from props', () => {
        it.each([
            ['Insp. Move', { getRuntimeValue: true, hasTacticalShift: false }],
            ['Insp. Move', { getRuntimeValue: null, hasTacticalShift: true }],
        ])('should render %s badge when inspiringMovementNoOA is %s or hasTacticalShift is true', (_, { getRuntimeValue: rv, hasTacticalShift: ts }) => {
            getRuntimeValue.mockReturnValue(rv);
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    hasTacticalShift={ts}
                />
            );
            expect(screen.getByText('Insp. Move')).toBeInTheDocument();
        });

        it('should render OA Disadv badge when hasSpeedyOpportunityDisadvantage is true', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    hasSpeedyOpportunityDisadvantage={true}
                />
            );
            expect(screen.getByText('OA Disadv')).toBeInTheDocument();
        });
    });

    describe('spell effect badges with save callbacks', () => {
        it('should render Otto\'s Irresistible Dance badge when the dance targetEffect is present', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'charmed' }]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15, duration: 'concentration', conditions: ['charmed', 'speed_zero'] }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText("Otto's Irresistible Dance")).toBeInTheDocument();
            expect(screen.getByTitle(/Click to reroll the WIS save \(DC 15\)/)).toBeInTheDocument();
        });

        it('should not render Otto\'s Irresistible Dance badge for another target', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Bob', effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15 }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.queryByText("Otto's Irresistible Dance")).not.toBeInTheDocument();
        });

        it('should roll the WIS reroll save when the dance badge is clicked', () => {
            const onRollConditionSave = vi.fn();
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'charmed' }]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15, duration: 'concentration', conditions: ['charmed', 'speed_zero'] }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText("Otto's Irresistible Dance"));
            expect(onRollConditionSave).toHaveBeenCalledWith(CREATURE_NAME, { key: 'charmed', label: 'Charmed', dc: 15, ability: 'wis' });
        });

        it('should render the Forcecaged badge when the forcecage targetEffect is present', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'forcecage', source: 'Goblin', dc: 17, duration: 'concentration' }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Forcecaged')).toBeInTheDocument();
            expect(screen.getByTitle(/CHA save \(DC 17\)/)).toBeInTheDocument();
        });

        it('should not render the Forcecaged badge for another target', () => {
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Bob', effect: 'forcecage', source: 'Goblin', dc: 17 }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.queryByText('Forcecaged')).not.toBeInTheDocument();
        });

        it('should roll the CHA escape save when the Forcecaged badge is clicked', () => {
            const onRollConditionSave = vi.fn();
            computeConditionEffects.mockReturnValue(makeEffects({}));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: CREATURE_NAME, effect: 'forcecage', source: 'Goblin', dc: 17, duration: 'concentration' }]}
                    creatureName={CREATURE_NAME}
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                    onRollConditionSave={onRollConditionSave}
                />
            );
            fireEvent.click(screen.getByText('Forcecaged'));
            expect(onRollConditionSave).toHaveBeenCalledWith(CREATURE_NAME, { key: 'forcecaged', label: 'Forcecaged', dc: 17, ability: 'cha' });
        });
    });

    describe('GM effect removal', () => {
        it('should render removable badges with break buttons when isLocalhost is true', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderAttackBonus: 3, riderCannotOpportunityAttack: true }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Goblin', effect: 'damage_bonus', value: 3 }]}
                    creatureName="Goblin"
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('+3 to hit')).toBeInTheDocument();
            expect(screen.getByText('No OA')).toBeInTheDocument();
            expect(screen.getAllByTitle('Remove effect').length).toBeGreaterThan(0);
        });

        it('should not render break buttons when isLocalhost is false', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ riderAttackBonus: 3 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={[{ target: 'Goblin', effect: 'damage_bonus', value: 3 }]}
                    creatureName="Goblin"
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={false}
                />
            );
            expect(screen.getByText('+3 to hit')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should remove the first matching targetEffect entry when break button is clicked', () => {
            const existingEffects = [
                { target: 'Goblin', effect: 'damage_bonus', value: 3, source: 'Test' },
                { target: 'Goblin', effect: 'damage_bonus', value: 5, source: 'Other' },
            ];
            runtimeState.getRuntimeValue.mockReturnValue(existingEffects);
            computeConditionEffects.mockReturnValue(makeEffects({ riderAttackBonus: 3 }));
            render(
                <ConditionEffectBadges
                    conditions={[]}
                    targetEffects={existingEffects}
                    creatureName="Goblin"
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            fireEvent.click(screen.getAllByTitle('Remove effect')[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledTimes(1);
        });

        it('should render break buttons for speed reduction badges', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ speedReduction: 15 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'grappled' }]}
                    targetEffects={[]}
                    creatureName="Goblin"
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Speed -15')).toBeInTheDocument();
            const buttons = screen.getAllByTitle('Remove effect');
            expect(buttons.length).toBeGreaterThanOrEqual(1);
        });

        it('should render break buttons for advantage/disadvantage badges', () => {
            computeConditionEffects.mockReturnValue(makeEffects({ targetDisadvantageCount: 1, attackAdvantageCount: 1, attackAdvantageReasons: ['Invisible'], saveAdvantageCount: 1, saveAdvantageReasons: ['Vow of Enmity'], dexSaveAdvantageCount: 1 }));
            render(
                <ConditionEffectBadges
                    conditions={[{ key: 'blinded' }]}
                    targetEffects={[]}
                    creatureName="Goblin"
                    campaignName={CAMPAIGN_NAME}
                    isLocalhost={true}
                />
            );
            expect(screen.getByText('Disadv vs')).toBeInTheDocument();
            expect(screen.getByText('Adv')).toBeInTheDocument();
            expect(screen.getByText('Adv Save')).toBeInTheDocument();
            expect(screen.getByText('Adv DEX Save')).toBeInTheDocument();
            const buttons = screen.getAllByTitle('Remove effect');
            expect(buttons.length).toBeGreaterThanOrEqual(4);
        });
    });
});
