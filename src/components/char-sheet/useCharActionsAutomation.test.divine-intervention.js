import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { campaignName, basePlayerStats } from './useCharActionsAutomation.test.setup.js';

vi.mock('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js', () => ({
    handle: vi.fn(),
    onSpellSelected: vi.fn(),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
    executeSpellCast: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
    getClassFeatures: vi.fn(),
}));

import { onSpellSelected } from '../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js';
import { executeSpellCast } from '../../services/rules/spells/spellCastService.js';

function createDivineHooks(overrides = {}) {
    const {
        grv: customGRV,
        modalState: ms = {},
    } = overrides;

    const baseGRV = vi.fn((charKey, key, _cn) => {
        if (key === 'activeBuffs') return [];
        if (key === 'focusPoints') return 3;
        if (key === 'lastActionSpellCast') return null;
        return undefined;
    });

    const grv = customGRV || baseGRV;

    return {
        cannotAct: false,
        getRuntimeValue: grv,
        setRuntimeValue: vi.fn().mockResolvedValue(undefined),
        playerStats: basePlayerStats,
        campaignName,
        mapName: 'test-map',
        characters: [],
        setPopupHtml: vi.fn(),
        setModalState: vi.fn(),
        modalState: ms,
        rollDamage: vi.fn(),
        rollAttack: vi.fn(),
        executeHandler: vi.fn(),
        addEntry: vi.fn().mockResolvedValue(undefined),
        onBuffsChange: vi.fn(),
    };
}

describe('useCharActionsAutomation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleDivineInterventionCast', () => {
        it('should clear divine intervention modal state on start', async () => {
            const hooks = createDivineHooks({
                modalState: {
                    divineInterventionAction: { name: 'Divine Intervention' },
                    divineInterventionModal: { options: ['smite'] },
                },
                grv: vi.fn((charKey, key, _cn) => {
                    if (key === 'divineInterventionAction') return null;
                    return undefined;
                }),
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineInterventionModal: null, divineInterventionAction: null });
        });

        it('should return early when no divine intervention action found', async () => {
            const hooks = createDivineHooks({
                modalState: {},
                grv: vi.fn((charKey, key, _cn) => {
                    if (key === 'divineInterventionAction') return null;
                    return undefined;
                }),
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineInterventionModal: null, divineInterventionAction: null });
            expect(onSpellSelected).not.toHaveBeenCalled();
        });

        it('should get action from runtime value when not in modalState', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return { name: 'Divine Intervention' };
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: {},
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(grv).toHaveBeenCalledWith('charActions', 'divineInterventionAction', campaignName);
        });

        it('should call onSpellSelected and executeSpellCast when action exists', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'until you finish a Long Rest',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(onSpellSelected).toHaveBeenCalledWith(action, basePlayerStats, campaignName, { name: 'Guidance' });
            expect(executeSpellCast).toHaveBeenCalled();
        });

        it('should return early when onSpellSelected returns null', async () => {
            onSpellSelected.mockResolvedValue(null);

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            expect(hooks.setPopupHtml).not.toHaveBeenCalled();
            expect(executeSpellCast).not.toHaveBeenCalled();
        });

        it('should handle spell_selected result with triggerResult modal', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: { type: 'modal', modalName: 'wildMagicSurge', payload: { surge: 'teleport' } },
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });
            await vi.waitFor(() => {
                expect(hooks.setModalState).toHaveBeenCalledWith({ wildMagicSurgeModal: { surge: 'teleport' } });
            });
        });

        it('should handle spell_selected result with triggerResult popup', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: {
                    type: 'popup',
                    payload: { name: 'Test', description: 'Test desc' },
                },
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });
            await vi.waitFor(() => {
                expect(hooks.setPopupHtml).toHaveBeenCalledWith({
                    type: 'automation_info',
                    name: 'Test',
                    description: 'Test desc',
                });
            });
        });

        it('should handle spell_selected result with healing', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Cure Wounds' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 8,
                rawTotal: 10,
                formula: '1d8+3',
                rolls: [5, 5],
                targetName: 'TestFighter',
                bonusHeal: 2,
                bonusDetails: [{ amount: 2, name: 'Inspiration' }],
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Cure Wounds' });
            await vi.waitFor(() => {
                expect(hooks.setPopupHtml).toHaveBeenCalledWith({
                    type: 'heal',
                    name: 'Cure Wounds',
                    formula: '1d8+3',
                    rolls: [5, 5],
                    total: 10,
                    targetName: 'TestFighter',
                    finalHeal: 8,
                    bonusHeal: 2,
                    bonusHealDetail: '2 Inspiration',
                    healingRerollOriginalRolls: null,
                    healingRerollDisplayRolls: null,
                });
            });
        });

        it('should handle healing with no bonus details', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Cure Wounds' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 5,
                rawTotal: 5,
                formula: '1d8',
                rolls: [5],
                targetName: 'Ally1',
                bonusHeal: 0,
                bonusDetails: [],
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Cure Wounds' });
            await vi.waitFor(() => {
                expect(hooks.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                    type: 'heal',
                    finalHeal: 5,
                    bonusHeal: 0,
                    bonusHealDetail: '',
                }));
            });
        });

        it('should handle executeSpellCast error gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'recharged',
            });
            executeSpellCast.mockRejectedValue(new Error('Cast failed'));

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });

            await vi.waitFor(() => {
                expect(consoleError).toHaveBeenCalledWith('[CharActions] executeSpellCast error:', expect.any(Error));
            });
            consoleError.mockRestore();
        });

        it('should show automation_info popup after spell cast', async () => {
            onSpellSelected.mockResolvedValue({
                type: 'spell_selected',
                spell: { name: 'Guidance' },
                name: 'Divine Intervention',
                rechargeMessage: 'until you finish a Long Rest',
            });
            executeSpellCast.mockResolvedValue({
                healAmount: 0,
                triggerResult: null,
            });

            const action = { name: 'Divine Intervention' };
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'divineInterventionAction') return action;
                return undefined;
            });
            const hooks = createDivineHooks({
                modalState: { divineInterventionAction: action },
                grv,
            });
            const { handleDivineInterventionCast } = useCharActionsAutomation(hooks);
            await handleDivineInterventionCast({ name: 'Guidance' });
            await vi.waitFor(() => {
                expect(hooks.setPopupHtml).toHaveBeenCalledWith({
                    type: 'automation_info',
                    name: 'Divine Intervention',
                    description: 'Divine Intervention cast Guidance. Divine Intervention recharges until you finish a Long Rest',
                });
            });
        });
    });
});
