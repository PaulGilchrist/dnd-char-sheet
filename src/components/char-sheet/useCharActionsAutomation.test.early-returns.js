import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach, campaignName, basePlayerStats } from './useCharActionsAutomation.test.setup.js';

vi.mock('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js', () => ({
    handle: vi.fn(),
    onSpellSelected: vi.fn(),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
    executeSpellCast: vi.fn(),
}));

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - early returns', () => {
        it('should return early when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction' };
            await handleAutomationAction(action);

            expect(hooks.getRuntimeValue).not.toHaveBeenCalled();
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should return early when focus points are 0 for monk ki feature', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'focusPoints') return 0;
                return undefined;
            });
            const hooks = createHooks({
                playerStats: { ...basePlayerStats, class: { class_levels: [{ level: 5, focus_points: 2 }] } },
                getRuntimeValue: grv,
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows' };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>Flurry of Blows</b><br/>No ki points remaining.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should return early when focus points are 0 for 2024 rules', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'focusPoints') return 0;
                return undefined;
            });
            const monkStats = {
                ...basePlayerStats,
                rules: '2024',
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats: monkStats,
                getRuntimeValue: grv,
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows' };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>Flurry of Blows</b><br/>No Focus Points remaining.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should skip FP cost when Flurry of Healing and Harm is active for Hand of Healing', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Hand of Healing', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should skip FP cost when Flurry of Healing and Harm is active for Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should skip FP cost when Cloak of Shadows is active for Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                activeBuffs: [{ effect: 'cloak_of_shadows' }],
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Flurry of Blows', automation: {} };
            await handleAutomationAction(action);

            expect(srw).not.toHaveBeenCalledWith(
                'TestFighter',
                'focusPoints',
                expect.any(Number)
            );
        });

        it('should NOT skip FP cost when Flurry of Healing and Harm is active but action is not Hand of Healing or Flurry of Blows', async () => {
            const srw = vi.fn();
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const playerStats = {
                ...basePlayerStats,
                specialActions: [{ name: 'Flurry of Healing and Harm' }],
                class: { class_levels: [{ level: 5, focus_points: 2 }] },
            };
            const hooks = createHooks({
                playerStats,
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Patient Defense', automation: {} };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'focusPoints', 2, campaignName);
        });

        it('should decrement focus points for monk ki features', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Stunning Strike', automation: {} };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'focusPoints', 2, campaignName);
        });

        it('should dispatch focus-points-updated event when spending focus points', async () => {
            const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'focusPoints') return 3;
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'Stunning Strike', automation: {} };
            await handleAutomationAction(action);

            expect(dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
            dispatchEvent.mockRestore();
        });
    });

    describe('handleAutomationAction - trigger conditions', () => {
        it('should show popup when trigger is after_casting_action_spell and no last action spell cast', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'lastActionSpellCast') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { trigger: 'after_casting_action_spell' } };
            await handleAutomationAction(action);

            expect(hooks.setPopupHtml).toHaveBeenCalledWith(
                '<b>TestAction</b><br/>You must cast a spell with a casting time of an action first.'
            );
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should clear lastActionSpellCast and proceed when trigger is after_casting_action_spell and spell was cast', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === 'lastActionSpellCast') return 'Cure Wounds';
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: { trigger: 'after_casting_action_spell' } };
            await handleAutomationAction(action);

            expect(srw).toHaveBeenCalledWith('TestFighter', 'lastActionSpellCast', 0, campaignName);
            expect(hooks.executeHandler).toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - damage_bonus with options', () => {
        it('should show modal when damage_bonus has options and no choice made yet', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Test_Action_option') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = {
                name: 'Test Action',
                automation: { type: 'damage_bonus', options: ['Option A', 'Option B'] },
            };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                featureChoice: {
                    action,
                    options: ['Option A', 'Option B'],
                    optionKey: '_Test_Action_option',
                },
            });
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });

        it('should proceed when damage_bonus has options and a choice was already made', async () => {
            const srw = vi.fn().mockResolvedValue(undefined);
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Test_Action_option') return 'Option A';
                return undefined;
            });
            const hooks = createHooks({
                getRuntimeValue: grv,
                setRuntimeValue: srw,
            });
            hooks.executeHandler.mockResolvedValue({ type: 'popup', payload: 'done' });
            const action = {
                name: 'Test Action',
                automation: { type: 'damage_bonus', options: ['Option A', 'Option B'] },
            };
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            await handleAutomationAction(action);

            expect(hooks.executeHandler).toHaveBeenCalled();
        });
    });

    describe('handleAutomationAction - defensive_tactics', () => {
        it('should show modal when defensive_tactics type and no choice made yet', async () => {
            const grv = vi.fn((charKey, key, _cn) => {
                if (key === 'activeBuffs') return [];
                if (key === '_Defensive_Tactics_choice') return null;
                return undefined;
            });
            const hooks = createHooks({ getRuntimeValue: grv });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = {
                name: 'Defensive Tactics',
                automation: { type: 'defensive_tactics' },
            };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                featureChoice: {
                    action,
                    options: ['Escape the Horde', 'Multiattack Defense'],
                    optionKey: '_Defensive_Tactics_choice',
                },
            });
            expect(hooks.executeHandler).not.toHaveBeenCalled();
        });
    });
});
