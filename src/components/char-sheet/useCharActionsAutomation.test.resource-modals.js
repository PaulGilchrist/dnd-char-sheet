import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach } from './useCharActionsAutomation.test.setup.js';

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - resource/healing modals', () => {
        it('should handle healingPool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingPool',
                payload: { amount: 5 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingPoolModal: { amount: 5 } });
        });

        it('should handle handOfHealing modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'handOfHealing',
                payload: { amount: 3 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ handOfHealingModal: { amount: 3 } });
        });

        it('should handle fontOfMagic modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fontOfMagic',
                payload: {},
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ fontOfMagicModal: true });
        });

        it('should handle resourcePool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'resourcePool',
                payload: { type: 'spell_slots' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ resourcePoolModal: { type: 'spell_slots' } });
        });

        it('should handle arcaneWardRestore modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneWardRestore',
                payload: { amount: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ arcaneWardRestoreModal: { amount: 10 } });
        });

        it('should handle healingIllusion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingIllusion',
                payload: { amount: 8 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingIllusionModal: { amount: 8 } });
        });

        it('should handle divineSpark modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'divineSpark',
                payload: { damage: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineSparkModal: { damage: 10 } });
        });

        it('should handle elementalBurst modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalBurst',
                payload: { type: 'lightning' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elementalBurstModal: { type: 'lightning' } });
        });
    });
});
