import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach } from './useCharActionsAutomation.test.setup.js';

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - summoning/creature modals', () => {
        it('should handle animateDead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'animateDead',
                payload: { undead: 'zombie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ animateDeadModal: { undead: 'zombie' } });
        });

        it('should handle createUndead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'createUndead',
                payload: { undead: 'skeleton' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ createUndeadModal: { undead: 'skeleton' } });
        });

        it('should handle summonSpirit modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'summonSpirit',
                payload: { spirit: 'wolf' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ summonSpiritModal: { spirit: 'wolf' } });
        });

        it('should handle dragonCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'dragonCompanion',
                payload: { dragon: 'red' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ dragonCompanionModal: { dragon: 'red' } });
        });

        it('should handle primalCompanionBonusActionCommand modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionBonusActionCommand',
                payload: { command: 'attack' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionBonusActionModal: { command: 'attack' } });
        });

        it('should handle primalCompanionSummon modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionSummon',
                payload: { companion: 'bear' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionSummonModal: { companion: 'bear' } });
        });

        it('should handle wildCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'wildCompanion',
                payload: { action: 'bite' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildCompanionModal: { action: 'bite' } });
        });

        it('should handle feyReinforcements modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'feyReinforcements',
                payload: { feyType: 'seelie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ feyReinforcementsModal: { feyType: 'seelie' } });
        });
    });
});
