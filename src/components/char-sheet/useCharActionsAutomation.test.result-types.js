import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach } from './useCharActionsAutomation.test.setup.js';

vi.mock('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js', () => ({
    handle: vi.fn(),
    onSpellSelected: vi.fn(),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
    executeSpellCast: vi.fn(),
}));

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - result types', () => {
        it('should handle popup result type', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: '<b>Test</b>' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith('<b>Test</b>');
        });

        it('should handle notify_buffs_changed result type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'notify_buffs_changed' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should call onBuffsChange when popup with temp_buff type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'temp_buff' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should call onBuffsChange when popup with combat_stance type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'combat_stance' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).toHaveBeenCalled();
        });

        it('should NOT call onBuffsChange when popup without temp_buff or combat_stance type', async () => {
            const onBuffsChange = vi.fn();
            const hooks = createHooks({ onBuffsChange });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { type: 'other' } };
            await handleAutomationAction(action);

            expect(onBuffsChange).not.toHaveBeenCalled();
        });

        it('should handle roll result type with damage', async () => {
            const rollDamage = vi.fn();
            const hooks = createHooks({ rollDamage });
            hooks.executeHandler.mockResolvedValue({
                type: 'roll',
                payload: {
                    rollType: 'damage',
                    name: 'Test Damage',
                    formula: '2d6+3',
                    total: 10,
                    rolls: [3, 7],
                    modifier: 3,
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollDamage).toHaveBeenCalledWith(
                'Test Damage',
                '2d6+3',
                10,
                [3, 7],
                3,
                {}
            );
        });

        it('should handle attack_roll result type', async () => {
            const rollAttack = vi.fn();
            const hooks = createHooks({ rollAttack });
            hooks.executeHandler.mockResolvedValue({
                type: 'attack_roll',
                payload: {
                    attack: {
                        name: 'Test Attack',
                        hitBonus: 6,
                        autoDamageFormula: '1d4',
                        autoDamageName: 'Test Attack Damage',
                        damageType: 'Slashing',
                    },
                    targetName: 'Enemy',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollAttack).toHaveBeenCalledWith(
                'Test Attack',
                6,
                expect.objectContaining({
                    targetName: 'Enemy',
                    autoDamageFormula: '1d4',
                    autoDamageName: 'Test Attack Damage',
                    damageType: 'Slashing',
                })
            );
        });

        it('should handle attack_roll with missing autoDamage fields using defaults', async () => {
            const rollAttack = vi.fn();
            const hooks = createHooks({ rollAttack });
            hooks.executeHandler.mockResolvedValue({
                type: 'attack_roll',
                payload: {
                    attack: { name: 'Test Attack', hitBonus: 6 },
                    targetName: 'Enemy',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(rollAttack).toHaveBeenCalledWith(
                'Test Attack',
                6,
                expect.objectContaining({
                    targetName: 'Enemy',
                    autoDamageFormula: null,
                    autoDamageName: 'Test Attack',
                    damageType: 'Slashing',
                })
            );
        });

        it('should log entries when result has logEntries', async () => {
            const addEntry = vi.fn().mockResolvedValue(undefined);
            const hooks = createHooks({ addEntry });
            hooks.executeHandler.mockResolvedValue({
                type: 'popup',
                payload: 'done',
                logEntries: [
                    { type: 'ability_use', abilityName: 'Test' },
                ],
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(addEntry).toHaveBeenCalledWith('test-campaign', { type: 'ability_use', abilityName: 'Test' });
        });

        it('should handle executeHandler returning null', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue(null);
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).not.toHaveBeenCalled();
            expect(hooks.setModalState).not.toHaveBeenCalled();
        });
    });
});
