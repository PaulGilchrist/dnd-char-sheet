import { describe, it, expect } from 'vitest';

import { handle } from './circleOfTheLandSpellsHandler.js';

const campaignName = 'test-campaign';

function makeAction(overrides = {}) {
    return {
        name: 'Circle of the Land Spells',
        description: 'Prepare spells from your circle\'s spell list.',
        ...overrides,
    };
}

describe('circleOfTheLandSpellsHandler', () => {
    describe('handle', () => {
        it('returns a modal action with the correct modal name', async () => {
            const result = await handle(makeAction(), {}, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('circleOfTheLandSpells');
        });

        it('passes the action name to the modal payload', async () => {
            const result = await handle(makeAction(), {}, campaignName);

            expect(result.payload.name).toBe('Circle of the Land Spells');
        });

        it('passes the action description to the modal payload', async () => {
            const result = await handle(makeAction(), {}, campaignName);

            expect(result.payload.description).toBe(
                'Prepare spells from your circle\'s spell list.',
            );
        });

        it('uses empty string when description is missing', async () => {
            const action = makeAction({ description: undefined });
            const result = await handle(action, {}, campaignName);

            expect(result.payload.description).toBe('');
        });

        it('uses empty string when description is null', async () => {
            const action = makeAction({ description: null });
            const result = await handle(action, {}, campaignName);

            expect(result.payload.description).toBe('');
        });

        it('passes an empty string when description key is absent', async () => {
            const action = { name: 'Circle of the Land Spells' };
            const result = await handle(action, {}, campaignName);

            expect(result.payload.description).toBe('');
        });

        it('passes all action data through the payload for the modal', async () => {
            const action = makeAction({
                name: 'My Custom Spell Selection',
                description: 'Select your prepared spells.',
            });
            const result = await handle(action, {}, campaignName);

            expect(result.payload).toEqual({
                name: 'My Custom Spell Selection',
                description: 'Select your prepared spells.',
            });
        });

        it('works with an empty playerStats object', async () => {
            const result = await handle(makeAction(), {}, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('circleOfTheLandSpells');
        });

        it('works with null playerStats', async () => {
            const result = await handle(makeAction(), null, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('circleOfTheLandSpells');
        });

        it('works with undefined campaignName', async () => {
            const result = await handle(makeAction(), {}, undefined);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('circleOfTheLandSpells');
        });

        it('returns the same structure regardless of action.automation content', async () => {
            const action = makeAction({
                automation: {
                    type: 'circle_of_the_land_spells',
                    casting_time: '1 hour',
                },
            });
            const result = await handle(action, {}, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('circleOfTheLandSpells');
        });
    });
});
