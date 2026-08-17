// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, applyTypeChoice } from './fiendishResilienceHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../common/choiceStorage.js', () => ({
    getChosenRuntimeValue: vi.fn(),
    setChosenRuntimeValue: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Re-import mocks after mocking ──────────────────────────────

import { getChosenRuntimeValue, setChosenRuntimeValue } from '../../common/choiceStorage.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

// ── Helpers ────────────────────────────────────────────────────

const CAMPAIGN = 'test-campaign';

function makeFeature(overrides = {}) {
    return {
        name: 'Fiendish Resilience',
        automation: {
            damageTypes: ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'],
        },
        ...overrides,
    };
}

function makeStats(overrides = {}) {
    return { name: 'TestCharacter', ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────

describe('fiendishResilienceHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        it('returns modal with damageTypes when no type has been chosen', async () => {
            getChosenRuntimeValue.mockReturnValue(null);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature(), makeStats(), CAMPAIGN);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('fiendishResilience');
            expect(result.payload.damageTypes).toHaveLength(12);
            expect(result.payload.existingType).toBeUndefined();
            expect(result.payload.action).toEqual(expect.objectContaining({ name: 'Fiendish Resilience' }));
            expect(result.payload.playerStats).toBeInstanceOf(Object);
            expect(result.payload.campaignName).toBe(CAMPAIGN);
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('returns modal with existingType and logs ability_use when a type has already been chosen', async () => {
            getChosenRuntimeValue.mockReturnValue('Fire');
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature(), makeStats(), CAMPAIGN);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('fiendishResilience');
            expect(result.payload.existingType).toBe('Fire');
            expect(result.payload.damageTypes).toHaveLength(12);
            expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestCharacter',
                abilityName: 'Fiendish Resilience',
                description: 'Fiendish Resilience — damage type is Fire',
            }));
        });

        it('returns popup when feature has already been used this long rest', async () => {
            getChosenRuntimeValue.mockReturnValue('Fire');
            getRuntimeValue.mockReturnValue(true);

            const result = await handle(makeFeature(), makeStats(), CAMPAIGN);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fiendish Resilience');
            expect(result.payload.description).toContain('already been used this long rest');
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('falls back to default DAMAGE_TYPES when automation has no damageTypes', async () => {
            getChosenRuntimeValue.mockReturnValue(null);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature({ automation: {} }), makeStats(), CAMPAIGN);

            expect(result.payload.damageTypes).toEqual(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder']);
        });

        it('falls back to default DAMAGE_TYPES in existingType branch when automation has no damageTypes', async () => {
            getChosenRuntimeValue.mockReturnValue('Fire');
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature({ automation: {} }), makeStats(), CAMPAIGN);

            expect(result.payload.damageTypes).toEqual(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder']);
        });

        it('ignores the _mapName parameter', async () => {
            getChosenRuntimeValue.mockReturnValue(null);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature(), makeStats(), CAMPAIGN, 'some-map-name');

            expect(result.type).toBe('modal');
            expect(result.payload.campaignName).toBe(CAMPAIGN);
        });

        it('returns popup with automation data when already used, even with empty automation', async () => {
            getChosenRuntimeValue.mockReturnValue(null);
            getRuntimeValue.mockReturnValue(true);

            const result = await handle(makeFeature({ automation: {} }), makeStats(), CAMPAIGN);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.automation).toEqual({});
        });

        it('treats empty string chosenType as no type chosen', async () => {
            getChosenRuntimeValue.mockReturnValue('');
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeFeature(), makeStats(), CAMPAIGN);

            expect(result.type).toBe('modal');
            expect(result.payload.existingType).toBeUndefined();
            expect(addEntry).not.toHaveBeenCalled();
        });
    });

    describe('applyTypeChoice', () => {
        it('stores chosen type and returns popup when valid', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            const result = await applyTypeChoice(
                makeFeature({ automation: { damageTypes: ['Fire', 'Cold'] } }),
                makeStats(),
                CAMPAIGN,
                'Fire',
            );

            expect(setChosenRuntimeValue).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'TestCharacter' }),
                'Fiendish Resilience',
                'Fire',
                'chosenType',
                CAMPAIGN,
            );
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fiendish Resilience');
            expect(result.payload.description).toContain('Fire');
            expect(result.payload.description).toContain('resistance');
            expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
                description: 'Fiendish Resilience — damage type set to Fire',
            }));
        });

        it('marks feature as used when type is chosen', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            await applyTypeChoice(
                makeFeature({ automation: { damageTypes: ['Fire', 'Cold'] } }),
                makeStats(),
                CAMPAIGN,
                'Fire',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestCharacter',
                '_fiendishResilienceUsed',
                true,
                CAMPAIGN,
            );
        });

        it('rejects invalid damage type', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            const result = await applyTypeChoice(
                makeFeature({ automation: { damageTypes: ['Fire', 'Cold'] } }),
                makeStats(),
                CAMPAIGN,
                'Force',
            );

            expect(result).toBeNull();
            expect(setChosenRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('logs change when type is switched', async () => {
            getChosenRuntimeValue.mockReturnValue('Fire');

            await applyTypeChoice(
                makeFeature({ automation: { damageTypes: ['Fire', 'Cold'] } }),
                makeStats(),
                CAMPAIGN,
                'Cold',
            );

            expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
                description: 'Fiendish Resilience — damage type changed to Cold',
            }));
        });

        it('logs "set to" when reselecting the same type', async () => {
            getChosenRuntimeValue.mockReturnValue('Fire');

            await applyTypeChoice(
                makeFeature({ automation: { damageTypes: ['Fire', 'Cold'] } }),
                makeStats(),
                CAMPAIGN,
                'Fire',
            );

            expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
                description: 'Fiendish Resilience — damage type set to Fire',
            }));
        });

        it('rejects undefined chosenType', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            const result = await applyTypeChoice(
                makeFeature(),
                makeStats(),
                CAMPAIGN,
                undefined,
            );

            expect(result).toBeNull();
            expect(setChosenRuntimeValue).not.toHaveBeenCalled();
        });

        it('rejects null chosenType', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            const result = await applyTypeChoice(
                makeFeature(),
                makeStats(),
                CAMPAIGN,
                null,
            );

            expect(result).toBeNull();
            expect(setChosenRuntimeValue).not.toHaveBeenCalled();
        });

        it('uses default DAMAGE_TYPES when automation has no damageTypes', async () => {
            getChosenRuntimeValue.mockReturnValue(null);

            const result = await applyTypeChoice(
                makeFeature({ automation: {} }),
                makeStats(),
                CAMPAIGN,
                'Fire',
            );

            expect(result).not.toBeNull();
            expect(setChosenRuntimeValue).toHaveBeenCalled();
        });

    });
});
