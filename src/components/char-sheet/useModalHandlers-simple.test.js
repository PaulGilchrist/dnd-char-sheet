import { describe, it, expect, vi, beforeEach } from 'vitest';
import useModalHandlers from './useModalHandlers.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/starryFormHandler.js', () => ({
    handle: vi.fn(),
    applyConstellationOption: vi.fn(),
}));

vi.mock('../../services/automation/handlers/class-sorcerer/twinklingConstellationHandler.js', () => ({
    handle: vi.fn(),
    applyConstellationOption: vi.fn(),
}));

vi.mock('../../services/automation/handlers/combat/bonusAttacksHandler.js', () => ({
    handle: vi.fn(),
    applyFlurryOfBlows: vi.fn(),
}));

import { getCurrentCombatRound } from '../../services/encounters/combatData.js';
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

function createDeps(overrides = {}) {
    const playerStats = {
        name: 'TestFighter',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Strength', bonus: 3 }],
        ...overrides.playerStats,
    };
    const modalState = {};
    return {
        playerStats,
        campaignName: 'test-campaign',
        rollDamage: vi.fn(),
        proceedWithDamage: vi.fn(),
        pendingDamage: null,
        setPendingDamage: vi.fn(),
        modalState,
        setModalState: vi.fn((updates) => {
            if (typeof updates === 'function') {
                return updates(modalState);
            }
            Object.assign(modalState, updates);
        }),
        setPopupHtml: vi.fn(),
        ...overrides,
    };
}

describe('useModalHandlers - simple modal handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setRuntimeValue.mockReturnValue(undefined);
        getCurrentCombatRound.mockReturnValue(1);
    });

    describe('handleWeaponMasteryChoice', () => {
        it('clears the weapon mastery choice modal', () => {
            const deps = createDeps();
            const { handleWeaponMasteryChoice } = useModalHandlers(deps);
            handleWeaponMasteryChoice('Crushing');
            expect(deps.setModalState).toHaveBeenCalledWith({ weaponMasteryChoiceModal: null });
        });

        it('ignores the mastery name argument (no side effects)', () => {
            const deps = createDeps();
            const { handleWeaponMasteryChoice } = useModalHandlers(deps);
            handleWeaponMasteryChoice('Sweeping');
            expect(deps.setModalState).toHaveBeenCalledTimes(1);
            expect(deps.setModalState).toHaveBeenCalledWith({ weaponMasteryChoiceModal: null });
        });
    });

    describe('handleDivineFurySkip', () => {
        it('proceeds with original damage when skipping divine fury', () => {
            const deps = createDeps({
                pendingDamage: {
                    attack: { name: 'Fury of the Gods' },
                    formula: '1d8+3',
                    total: 10,
                    rolls: [5, 5],
                    modifier: 3,
                },
            });
            const { handleDivineFurySkip } = useModalHandlers(deps);
            handleDivineFurySkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ divineFuryChoice: null });
            expect(deps.setPendingDamage).toHaveBeenCalledWith(null);
            expect(deps.proceedWithDamage).toHaveBeenCalledWith(
                { name: 'Fury of the Gods' },
                '1d8+3',
                10,
                [5, 5],
                3
            );
        });

        it('returns early when no pending damage', () => {
            const deps = createDeps();
            const { handleDivineFurySkip } = useModalHandlers(deps);
            handleDivineFurySkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ divineFuryChoice: null });
            expect(deps.proceedWithDamage).not.toHaveBeenCalled();
            expect(deps.setPendingDamage).not.toHaveBeenCalled();
        });
    });

    describe('handleDamageTypeModifierSkip', () => {
        it('proceeds with original damage when skipping damage type modifier', () => {
            const deps = createDeps({
                pendingDamage: {
                    attack: { name: 'Empowered Strikes', damageType: 'slashing' },
                    formula: '1d8',
                    total: 5,
                    rolls: [5],
                    modifier: 0,
                    _damageTypeModifier: { name: 'Empowered Strikes' },
                },
            });
            const { handleDamageTypeModifierSkip } = useModalHandlers(deps);
            handleDamageTypeModifierSkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ damageTypeChoice: null });
            expect(deps.setPendingDamage).toHaveBeenCalledWith(null);
            expect(deps.proceedWithDamage).toHaveBeenCalled();
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                '_Empowered_Strikes_usedRound',
                1,
                'test-campaign'
            );
        });

        it('records used round even when _damageTypeModifier is absent', () => {
            const deps = createDeps({
                pendingDamage: {
                    attack: { name: 'Some Attack' },
                    formula: '1d8',
                    total: 5,
                    rolls: [5],
                    modifier: 0,
                },
            });
            const { handleDamageTypeModifierSkip } = useModalHandlers(deps);
            handleDamageTypeModifierSkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ damageTypeChoice: null });
            expect(deps.setPendingDamage).toHaveBeenCalledWith(null);
            expect(deps.proceedWithDamage).toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns early when no pending damage', () => {
            const deps = createDeps();
            const { handleDamageTypeModifierSkip } = useModalHandlers(deps);
            handleDamageTypeModifierSkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ damageTypeChoice: null });
            expect(deps.proceedWithDamage).not.toHaveBeenCalled();
        });
    });

    describe('handleWeaponKindMasteryClose', () => {
        it('clears the weapon kind mastery modal', () => {
            const deps = createDeps();
            const { handleWeaponKindMasteryClose } = useModalHandlers(deps);
            handleWeaponKindMasteryClose();
            expect(deps.setModalState).toHaveBeenCalledWith({ weaponKindMasteryModal: null });
        });

        it('has no side effects beyond clearing modal', () => {
            const deps = createDeps({
                pendingDamage: { attack: { name: 'Test' } },
                proceedWithDamage: vi.fn(),
                setPendingDamage: vi.fn(),
            });
            const { handleWeaponKindMasteryClose } = useModalHandlers(deps);
            handleWeaponKindMasteryClose();
            expect(deps.proceedWithDamage).not.toHaveBeenCalled();
            expect(deps.setPendingDamage).not.toHaveBeenCalled();
        });
    });
});
