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

import { getRuntimeValue, setRuntimeValue, setRuntimeObject } from '../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../services/automation/common/buffToggle.js';
import { hasTwoWeaponFighting } from '../../services/combat/automation/automationService.js';

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
        pendingDamage: null,
        setPendingDamage: vi.fn(),
        resumeRef: { current: null },
        ...overrides,
    };
    return useAttackDamageResolution(deps);
}


describe('useAttackDamageResolution - handleAttackRiderOptionSelect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        setRuntimeObject.mockReturnValue(undefined);
        getActiveBuffs.mockReturnValue([]);
        hasTwoWeaponFighting.mockReturnValue(false);
        modalState._reset && modalState._reset();
        Object.keys(modalState).forEach(k => delete modalState[k]);
        mockSetModalState.mockClear();
    });

    describe('brutal strike flags', () => {
        it('sets _brutalStrikeActive and _brutalStrikeEffects before processing', async () => {
            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Extra Damage', effect: 'extra_damage' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Extra Damage', { maneuver, targetName: 'Goblin', description: 'Test' });

            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeActive', true, 'test-campaign');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeEffects', ['Extra Damage'], 'test-campaign');
        });

        it('clears attackRiderOptionsModal after selection', async () => {
            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Extra Damage', effect: 'extra_damage' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Extra Damage', { maneuver, targetName: 'Goblin', description: 'Test' });

            expect(mockSetModalState).toHaveBeenCalledWith({ attackRiderOptionsModal: null });
        });
    });

    describe('push effect', () => {
        it('applies push_15ft target effect when option has push effect and targetName', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });

            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Knock Back', effect: 'push_15ft' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Knock Back', { maneuver, targetName: 'Goblin', description: 'Brutal Strike' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Goblin',
                        source: 'TestFighter',
                        option: 'Knock Back',
                        effect: 'push',
                        value: 15,
                        duration: 'instant',
                    }),
                ]),
                'test-campaign',
            );
        });

        it('includes push description in popupHtml', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });

            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Knock Back', effect: 'push_15ft' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Knock Back', { maneuver, targetName: 'Goblin', description: 'Brutal Strike pushed 15 feet. Selected: Knock Back.' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Goblin',
                        effect: 'push',
                        value: 15,
                    }),
                ]),
                'test-campaign',
            );
        });
    });

    describe('speed_reduction effect', () => {
        it('applies speed_reduction target effect when option has speed_reduction', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });

            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Slow', effect: 'speed_reduction', value: '15_ft_until_start_of_next_turn' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Slow', { maneuver, targetName: 'Goblin', description: 'Brutal Strike' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Goblin',
                        source: 'TestFighter',
                        option: 'Slow',
                        effect: 'speed_reduction',
                        value: '15_ft_until_start_of_next_turn',
                        duration: 'until_start_of_next_turn',
                    }),
                ]),
                'test-campaign',
            );
        });
    });

    describe('no effect option', () => {
        it('sets popupHtml with automation_info when option has no special effect', async () => {
            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Extra Damage', effect: 'extra_damage' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Extra Damage', { maneuver, targetName: 'Goblin', description: 'Brutal Strike' });

            expect(mockSetModalState).toHaveBeenCalledWith({ attackRiderOptionsModal: null });
        });

        it('includes optionName in popupHtml description', async () => {
            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [
                        { name: 'Extra Damage', effect: 'extra_damage' },
                    ],
                },
            };

            await handleAttackRiderOptionSelect('Extra Damage', { maneuver, targetName: 'Goblin', description: 'Brutal Strike', popupHtml: { type: 'automation_info' } });

            expect(mockSetModalState).toHaveBeenCalledWith({ attackRiderOptionsModal: null });
        });
    });

    describe('missing option', () => {
        it('still sets flags and popupHtml when option is not found in automation.options', async () => {
            const { handleAttackRiderOptionSelect } = UseAttackDamageResolution();
            const maneuver = {
                name: 'Brutal Strike',
                automation: {
                    options: [],
                },
            };

            await handleAttackRiderOptionSelect('Nonexistent Option', { maneuver, targetName: 'Goblin', description: 'Brutal Strike' });

            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeActive', true, 'test-campaign');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', '_brutalStrikeEffects', ['Nonexistent Option'], 'test-campaign');
            expect(mockSetModalState).toHaveBeenCalledWith({ attackRiderOptionsModal: null });
        });
    });
});
