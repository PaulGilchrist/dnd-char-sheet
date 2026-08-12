import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsBaseActions from './useCharActionsBaseActions.js';
import { createHooks, mockToggleBuff, mockAddExpiration, mockSetPopupHtml, mockAddEntry, campaignName, basePlayerStats } from './useCharActionsBaseActions.test.helpers.js';

describe('useCharActionsBaseActions - handleDodgeAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleDodgeAction', () => {
        it('should return early when cannotAct is true', async () => {
            const hooks = createHooks({ cannotAct: true });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).not.toHaveBeenCalled();
        });

        it('should activate dodge when buff is not already active', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: false });
            const hooks = createHooks();
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalledWith(
                'TestFighter', 'Dodge',
                { effect: 'dodge', duration: 'until_start_of_next_turn' },
                campaignName, 'TestFighter'
            );
            expect(mockAddExpiration).toHaveBeenCalledWith(
                'TestFighter', 'TestFighter',
                [{ type: 'remove_active_buff', buffName: 'Dodge' }],
                campaignName, undefined, 'TestFighter'
            );
            expect(mockAddEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Dodge',
            }));
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Dodge',
                description: expect.stringContaining('Dodge activated'),
            });
        });

        it('should deactivate dodge when buff is already active', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: true });
            const hooks = createHooks();
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalled();
            expect(mockAddExpiration).not.toHaveBeenCalled();
            expect(mockAddEntry).not.toHaveBeenCalled();
            expect(mockSetPopupHtml).toHaveBeenCalledWith({
                type: 'automation_info',
                name: 'Dodge',
                description: 'Dodge deactivated.',
            });
        });

        it('should pass the correct character name for buff toggle', async () => {
            mockToggleBuff.mockReturnValue({ wasActive: false });
            const playerStats = { ...basePlayerStats, name: 'RogueOne' };
            const hooks = createHooks({ playerStats });
            const actions = useCharActionsBaseActions(hooks);
            await actions.handleDodgeAction();

            expect(mockToggleBuff).toHaveBeenCalledWith(
                'RogueOne', 'Dodge',
                { effect: 'dodge', duration: 'until_start_of_next_turn' },
                campaignName, 'RogueOne'
            );
        });
    });
});
