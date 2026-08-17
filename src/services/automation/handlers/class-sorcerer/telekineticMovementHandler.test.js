// @improved-by-ai
import { handle } from './telekineticMovementHandler.js';
import * as logService from '../../../ui/logService.js';

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

const makeAction = (auto = {}) => ({
    name: 'Telekinetic Movement',
    automation: { type: 'telekinetic_movement', range: '30', ...auto },
});

const makePlayerStats = (overrides = {}) => ({
    ...overrides,
    name: 'TestHero',
});

describe('telekineticMovementHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        it('should return a popup with automation_info type and all payload fields', async () => {
            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Telekinetic Movement');
            expect(result.payload.automationType).toBe('telekinetic_movement');
            expect(result.payload.automation).toEqual({
                type: 'telekinetic_movement',
                range: '30',
            });
            expect(result.payload.description).toBe(
                'Telekinetic Movement: Move an object or willing creature up to <strong>30</strong> feet.'
            );
        });

        it('should use custom range in popup description when provided', async () => {
            const result = await handle(makeAction({ range: '60' }), makePlayerStats(), 'campaign', 'map');

            expect(result.payload.description).toBe(
                'Telekinetic Movement: Move an object or willing creature up to <strong>60</strong> feet.'
            );
        });

        it('should use default range of 30 when automation.range is missing', async () => {
            const result = await handle(makeAction({ range: undefined }), makePlayerStats(), 'campaign', 'map');

            expect(result.payload.description).toBe(
                'Telekinetic Movement: Move an object or willing creature up to <strong>30</strong> feet.'
            );
        });

        it('should use default range of 30 when automation.range is an empty string', async () => {
            const result = await handle(makeAction({ range: '' }), makePlayerStats(), 'campaign', 'map');

            expect(result.payload.description).toBe(
                'Telekinetic Movement: Move an object or willing creature up to <strong>30</strong> feet.'
            );
        });

        it('should use custom range in log description', async () => {
            await handle(makeAction({ range: '45' }), makePlayerStats(), 'campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                description: 'TestHero used Telekinetic Movement to move an object or willing creature up to 45 feet.',
            }));
        });

        it('should use default range in log description when range is missing', async () => {
            await handle(makeAction({ range: undefined }), makePlayerStats(), 'campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                description: 'TestHero used Telekinetic Movement to move an object or willing creature up to 30 feet.',
            }));
        });

        it('should use default range in log description when range is an empty string', async () => {
            await handle(makeAction({ range: '' }), makePlayerStats(), 'campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                description: 'TestHero used Telekinetic Movement to move an object or willing creature up to 30 feet.',
            }));
        });

        it('should log an ability_use entry to the campaign', async () => {
            await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestHero',
                abilityName: 'Telekinetic Movement',
            }));
        });

        it('should tolerate addEntry rejection without throwing', async () => {
            logService.addEntry.mockRejectedValue(new Error('network error'));

            await expect(
                handle(makeAction(), makePlayerStats(), 'campaign', 'map')
            ).resolves.toMatchObject({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                }),
            });
        });

        it('should pass through the action name from the action object', async () => {
            const action = { name: 'Custom Telekinetic', automation: { type: 'telekinetic_movement', range: '20' } };
            const result = await handle(action, makePlayerStats(), 'campaign', 'map');

            expect(result.payload.name).toBe('Custom Telekinetic');
            expect(result.payload.description).toBe(
                'Custom Telekinetic: Move an object or willing creature up to <strong>20</strong> feet.'
            );
        });
    });
});
