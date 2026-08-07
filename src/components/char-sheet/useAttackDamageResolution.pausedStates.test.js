// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAttackDamageResolution from './useAttackDamageResolution.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
    setRuntimeObject: vi.fn(),
}));

vi.mock('../../services/automation/common/buffToggle.js', () => ({
    getActiveBuffs: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    collectWeaponMastery: vi.fn(),
    evaluateAutoExpression: vi.fn(),
    hasTwoWeaponFighting: vi.fn(),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: vi.fn((name) => ({ baseName: name })),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
    executeAttackRiderManeuver: vi.fn(),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
    getEmpoweredEvocationFeatures: vi.fn(() => []),
    getEmpoweredEvocationIntModifier: vi.fn(() => 0),
}));

vi.mock('../../services/combat/steps/index.js', () => ({
    buildPipelineForAction: vi.fn(() => ({
        run: vi.fn().mockResolvedValue(undefined),
    })),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

import { getActiveBuffs } from '../../services/automation/common/buffToggle.js';
import { hasTwoWeaponFighting } from '../../services/combat/automation/automationService.js';
import { setRuntimeObject } from '../../hooks/runtime/useRuntimeState.js';

const mockPlayerStats = {
    name: 'TestFighter',
    level: 5,
    abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Dexterity', bonus: 2 }],
    proficiency: 3,
    class: { name: 'Barbarian', class_levels: [{ level: 5, rage_damage: 2 }] },
    automation: { actions: [], passives: [] },
};

const mockCampaignName = 'test-campaign';

const modalState = {};
const mockSetModalState = vi.fn((updates) => {
    if (typeof updates === 'function') {
        return updates(modalState);
    }
    Object.assign(modalState, updates);
});

const mockPendingDamageRef = { current: null };
const mockSetPendingDamage = vi.fn();

function UseAttackDamageResolution(overrides = {}) {
    const deps = {
        playerStats: mockPlayerStats,
        campaignName: mockCampaignName,
        mapName: null,
        popupHtml: null,
        setPopupHtml: vi.fn(),
        rollDamage: vi.fn(),
        buildCtx: vi.fn(() => Promise.resolve({ targetName: 'Goblin' })),
        buildCtxSync: vi.fn(() => Promise.resolve({ targetName: 'Goblin' })),
        modalState,
        setModalState: mockSetModalState,
        pendingDamage: mockPendingDamageRef.current,
        setPendingDamage: mockSetPendingDamage,
        resumeRef: mockPendingDamageRef,
        ...overrides,
    };
    return useAttackDamageResolution(deps);
}

function tick() {
    return new Promise((r) => setTimeout(r, 0));
}

describe('useAttackDamageResolution - pipeline paused states', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getActiveBuffs.mockReturnValue([]);
        hasTwoWeaponFighting.mockReturnValue(false);
        setRuntimeObject.mockReturnValue(undefined);
        Object.keys(modalState).forEach(k => delete modalState[k]);
        mockSetModalState.mockClear();
        mockPendingDamageRef.current = null;
    });

    describe('damageTypeChoice modal pause', () => {
        it('sets damageTypeChoice modal state and pendingDamage when pipeline pauses', async () => {
            const pausedCtx = {
                _pausedStep: 'damageTypeChoice',
                _modalType: 'damageTypeChoice',
                _modalProps: { options: ['fire', 'cold'], featureName: 'Divine Fury' },
                attack: { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' },
                formula: '1d8+3 + 2d6',
                total: 12,
                rolls: [5, 3, 4],
                modifier: 3,
                bonusExpr: '2d6',
                bonusTotal: 6,
                bonusRolls: [4, 2],
                _weaponHitOnceKey: '_DivineFury_usedRound',
            };
            mockPendingDamageRef.current = pausedCtx;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).toHaveBeenCalledWith({
                damageTypeChoice: pausedCtx._modalProps,
            });
            expect(mockSetPendingDamage).toHaveBeenCalledWith(expect.objectContaining({
                attack: pausedCtx.attack,
                formula: pausedCtx.formula,
                total: pausedCtx.total,
                rolls: pausedCtx.rolls,
                modifier: pausedCtx.modifier,
                bonusExpr: pausedCtx.bonusExpr,
                bonusTotal: pausedCtx.bonusTotal,
                bonusRolls: pausedCtx.bonusRolls,
                oncePerTurnKey: pausedCtx._weaponHitOnceKey,
            }));
        });
    });

    describe('divineFury modal pause', () => {
        it('sets divineFuryChoice modal state and pendingDamage when pipeline pauses', async () => {
            const pausedCtx = {
                _pausedStep: 'divineFury',
                _modalType: 'divineFury',
                _modalProps: { options: ['fire', 'cold'], featureName: 'Divine Fury' },
                attack: { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' },
                formula: '1d8+3 + 2d6',
                total: 12,
                rolls: [5, 3, 4],
                modifier: 3,
                bonusExpr: '2d6',
                bonusTotal: 6,
                bonusRolls: [4, 2],
            };
            mockPendingDamageRef.current = pausedCtx;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).toHaveBeenCalledWith({
                divineFuryChoice: pausedCtx._modalProps,
            });
            expect(mockSetPendingDamage).toHaveBeenCalledWith(expect.objectContaining({
                attack: pausedCtx.attack,
                formula: pausedCtx.formula,
                total: pausedCtx.total,
                rolls: pausedCtx.rolls,
                modifier: pausedCtx.modifier,
                bonusExpr: pausedCtx.bonusExpr,
                bonusTotal: pausedCtx.bonusTotal,
                bonusRolls: pausedCtx.bonusRolls,
            }));
        });
    });

    describe('secondaryTarget modal pause', () => {
        it('sets secondaryTargetModal when pipeline pauses', async () => {
            const pausedCtx = {
                _pausedStep: 'secondaryTarget',
                _modalType: 'secondaryTarget',
                _modalProps: { title: 'Choose Target', targets: ['Orc', 'Goblin'] },
            };
            mockPendingDamageRef.current = pausedCtx;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).toHaveBeenCalledWith({
                secondaryTargetModal: pausedCtx._modalProps,
            });
        });
    });

    describe('tacticalMaster modal pause', () => {
        it('sets tacticalMasterPending via setRuntimeObject when pipeline pauses', async () => {
            const pausedCtx = {
                _pausedStep: 'tacticalMaster',
                _modalType: 'tacticalMaster',
                _modalProps: { title: 'Tactical Choice', options: ['attack', 'defend'] },
            };
            mockPendingDamageRef.current = pausedCtx;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(setRuntimeObject).toHaveBeenCalledWith(
                'campaign',
                { tacticalMasterPending: pausedCtx._modalProps },
                'test-campaign',
                true,
            );
        });
    });

    describe('shieldBash modal pause', () => {
        it('sets shieldBashModal when pipeline pauses', async () => {
            const pausedCtx = {
                _pausedStep: 'shieldBash',
                _modalType: 'shieldBash',
                _modalProps: { title: 'Shield Bash', damageExpression: '1d6' },
            };
            mockPendingDamageRef.current = pausedCtx;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).toHaveBeenCalledWith({
                shieldBashModal: pausedCtx._modalProps,
            });
        });
    });

    describe('no pause', () => {
        it('does not set any modal state when pipeline completes without pause', async () => {
            mockPendingDamageRef.current = null;

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ damageTypeChoice: expect.anything() })
            );
            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ divineFuryChoice: expect.anything() })
            );
            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ secondaryTargetModal: expect.anything() })
            );
            expect(setRuntimeObject).not.toHaveBeenCalled();
            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ shieldBashModal: expect.anything() })
            );
        });

        it('does not set modal when _pausedStep is null', async () => {
            mockPendingDamageRef.current = { _pausedStep: null };

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ damageTypeChoice: expect.anything() })
            );
        });

        it('does not set modal when _pausedStep is unknown', async () => {
            mockPendingDamageRef.current = { _pausedStep: 'unknownStep' };

            const { resolveAttackDamage } = UseAttackDamageResolution();
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing' };

            await resolveAttackDamage(attack);
            await tick();

            expect(mockSetModalState).not.toHaveBeenCalledWith(
                expect.objectContaining({ damageTypeChoice: expect.anything() })
            );
        });
    });
});
