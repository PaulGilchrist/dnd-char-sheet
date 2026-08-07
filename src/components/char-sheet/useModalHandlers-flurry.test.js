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

vi.mock('../../services/automation/handlers/class-fighter-rogue/openHandTechniqueHandler.js', () => ({
    handle: vi.fn(),
    applyOpenHandTechnique: vi.fn(),
}));

vi.mock('../../services/automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(),
}));

import { applyFlurryOfBlows } from '../../services/automation/handlers/combat/bonusAttacksHandler.js';
import { applyOpenHandTechnique } from '../../services/automation/handlers/class-fighter-rogue/openHandTechniqueHandler.js';
import { buildSaveDc } from '../../services/automation/common/savePrompt.js';

function createDeps(overrides = {}) {
    const playerStats = {
        name: 'TestMonk',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Dexterity', bonus: 3 }],
        ...overrides.playerStats,
    };
    const modalState = {
        ...(overrides.modalState || {}),
    };
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

describe('useModalHandlers - flurry of blows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buildSaveDc.mockReturnValue(15);
    });

    describe('handleFlurryOfBlowsConfirm', () => {
        it('calls applyFlurryOfBlows with correct arguments', async () => {
            applyFlurryOfBlows.mockResolvedValue({
                payload: 'Flurry hit!',
                type: 'popup',
            });
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                        playerStats: { name: 'TestMonk' },
                        campaignName: 'test-campaign',
                        mapName: 'test-map',
                        numAttacks: 2,
                    },
                },
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });
            expect(applyFlurryOfBlows).toHaveBeenCalledWith(
                { name: 'Flurry of Blows' },
                { name: 'TestMonk' },
                'test-campaign',
                'test-map',
                'target1',
                2
            );
        });

        it('clears flurry modal after calling handler', async () => {
            applyFlurryOfBlows.mockResolvedValue({
                payload: 'Flurry hit!',
                type: 'popup',
            });
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                        playerStats: { name: 'TestMonk' },
                        campaignName: 'test-campaign',
                        mapName: 'test-map',
                        numAttacks: 2,
                    },
                },
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });
            expect(deps.setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: null });
        });

        it('sets popup when apply result type is popup', async () => {
            applyFlurryOfBlows.mockResolvedValue({
                payload: 'Flurry hit 1d6!',
                type: 'popup',
            });
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                        playerStats: { name: 'TestMonk' },
                        campaignName: 'test-campaign',
                        mapName: 'test-map',
                        numAttacks: 1,
                    },
                },
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });
            expect(deps.setPopupHtml).toHaveBeenCalledWith('Flurry hit 1d6!');
        });

        it('opens open hand modal when flurry returns open hand targets', async () => {
            applyFlurryOfBlows.mockResolvedValue({
                payload: 'Flurry with knockdown!',
                openHandTargets: [
                    {
                        action: { name: 'Open Hand Technique' },
                        targetName: 'Goblin',
                    },
                ],
            });
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                        playerStats: { name: 'TestMonk' },
                        campaignName: 'test-campaign',
                        mapName: 'test-map',
                        numAttacks: 1,
                    },
                },
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });

            expect(deps.setModalState).toHaveBeenCalledWith({
                openHandFromFlurry: {
                    targets: [
                        {
                            action: { name: 'Open Hand Technique' },
                            targetName: 'Goblin',
                        },
                    ],
                    saveDc: 15,
                    currentIndex: 0,
                    popupHtml: 'Flurry with knockdown!',
                },
            });
            expect(deps.setPopupHtml).not.toHaveBeenCalled();
        });

        it('does nothing when applyFlurryOfBlows returns null', async () => {
            applyFlurryOfBlows.mockResolvedValue(null);
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                        playerStats: { name: 'TestMonk' },
                        campaignName: 'test-campaign',
                        mapName: 'test-map',
                        numAttacks: 1,
                    },
                },
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });
            expect(deps.setPopupHtml).not.toHaveBeenCalled();
        });

        it('does nothing when no flurry modal state exists', async () => {
            const deps = createDeps({
                modalState: {},
            });
            const { handleFlurryOfBlowsConfirm } = useModalHandlers(deps);
            await handleFlurryOfBlowsConfirm({ distribution: 'target1' });
            expect(applyFlurryOfBlows).not.toHaveBeenCalled();
            expect(deps.setModalState).not.toHaveBeenCalled();
        });
    });

    describe('handleFlurryOfBlowsSkip', () => {
        it('clears the flurry modal when skipping', () => {
            const deps = createDeps({
                modalState: {
                    flurryOfBlowsModal: {
                        action: { name: 'Flurry of Blows' },
                    },
                },
            });
            const { handleFlurryOfBlowsSkip } = useModalHandlers(deps);
            handleFlurryOfBlowsSkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: null });
        });

        it('clears flurry modal even when no flurry modal state exists', () => {
            const deps = createDeps({
                modalState: {},
            });
            const { handleFlurryOfBlowsSkip } = useModalHandlers(deps);
            handleFlurryOfBlowsSkip();
            expect(deps.setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: null });
        });
    });
});

describe('useModalHandlers - open hand from flurry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buildSaveDc.mockReturnValue(15);
        applyOpenHandTechnique.mockResolvedValue({
            type: 'popup',
            payload: 'Open Hand pushed!',
        });
    });

    describe('handleOpenHandFromFlurryConfirm', () => {
        it('calls applyOpenHandTechnique with correct arguments', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            {
                                action: { name: 'Open Hand Technique' },
                                targetName: 'Goblin',
                            },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Flurry result',
                    },
                },
            });
            const { handleOpenHandFromFlurryConfirm } = useModalHandlers(deps);
            await handleOpenHandFromFlurryConfirm({ optionName: 'Push' });

            expect(applyOpenHandTechnique).toHaveBeenCalledWith(
                { name: 'Open Hand Technique' },
                undefined,
                undefined,
                'Goblin',
                'Push',
                15
            );
        });

        it('advances to next target when more targets remain', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                            { action: { name: 'Open Hand' }, targetName: 'Orc' },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Flurry result',
                    },
                },
            });
            const { handleOpenHandFromFlurryConfirm } = useModalHandlers(deps);
            await handleOpenHandFromFlurryConfirm({ optionName: 'Push' });

            expect(deps.setModalState).toHaveBeenCalledWith({
                openHandFromFlurry: {
                    targets: [
                        { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                        { action: { name: 'Open Hand' }, targetName: 'Orc' },
                    ],
                    saveDc: 15,
                    currentIndex: 1,
                    popupHtml: 'Flurry result',
                },
            });
            expect(deps.setPopupHtml).not.toHaveBeenCalled();
        });

        it('clears open hand state and shows popup when all targets processed', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Flurry result',
                    },
                },
            });
            const { handleOpenHandFromFlurryConfirm } = useModalHandlers(deps);
            await handleOpenHandFromFlurryConfirm({ optionName: 'Push' });

            expect(deps.setModalState).toHaveBeenCalledWith({ openHandFromFlurry: null });
            expect(deps.setPopupHtml).toHaveBeenCalledWith('Open Hand pushed!');
        });

        it('does nothing when current target is missing', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Flurry result',
                    },
                },
            });
            const { handleOpenHandFromFlurryConfirm } = useModalHandlers(deps);
            await handleOpenHandFromFlurryConfirm({ optionName: 'Push' });
            expect(applyOpenHandTechnique).not.toHaveBeenCalled();
        });

        it('does nothing when no open hand state exists', async () => {
            const deps = createDeps();
            const { handleOpenHandFromFlurryConfirm } = useModalHandlers(deps);
            await handleOpenHandFromFlurryConfirm({ optionName: 'Push' });
            expect(applyOpenHandTechnique).not.toHaveBeenCalled();
        });
    });

    describe('handleOpenHandFromFlurrySkip', () => {
        it('advances to next target when more targets remain', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                            { action: { name: 'Open Hand' }, targetName: 'Orc' },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Flurry result',
                    },
                },
            });
            const { handleOpenHandFromFlurrySkip } = useModalHandlers(deps);
            await handleOpenHandFromFlurrySkip();

            expect(deps.setModalState).toHaveBeenCalledWith({
                openHandFromFlurry: {
                    targets: [
                        { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                        { action: { name: 'Open Hand' }, targetName: 'Orc' },
                    ],
                    saveDc: 15,
                    currentIndex: 1,
                    popupHtml: 'Flurry result',
                },
            });
        });

        it('clears open hand state and shows popup when all targets processed', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: 'Final popup',
                    },
                },
            });
            const { handleOpenHandFromFlurrySkip } = useModalHandlers(deps);
            await handleOpenHandFromFlurrySkip();

            expect(deps.setModalState).toHaveBeenCalledWith({ openHandFromFlurry: null });
            expect(deps.setPopupHtml).toHaveBeenCalledWith('Final popup');
        });

        it('does not set popup when popupHtml is falsy and all targets processed', async () => {
            const deps = createDeps({
                modalState: {
                    openHandFromFlurry: {
                        targets: [
                            { action: { name: 'Open Hand' }, targetName: 'Goblin' },
                        ],
                        saveDc: 15,
                        currentIndex: 0,
                        popupHtml: null,
                    },
                },
            });
            const { handleOpenHandFromFlurrySkip } = useModalHandlers(deps);
            await handleOpenHandFromFlurrySkip();

            expect(deps.setModalState).toHaveBeenCalledWith({ openHandFromFlurry: null });
            expect(deps.setPopupHtml).not.toHaveBeenCalled();
        });

        it('does nothing when no open hand state exists', async () => {
            const deps = createDeps();
            const { handleOpenHandFromFlurrySkip } = useModalHandlers(deps);
            await handleOpenHandFromFlurrySkip();
            expect(deps.setModalState).not.toHaveBeenCalled();
        });
    });
});
