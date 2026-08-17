// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle, clearCosmicOmenEffect } from './cosmicOmenHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { rollExpression } = await import('../../../dice/diceRoller.js');
const { addEntry } = await import('../../../ui/logService.js');
const { evaluateAutoExpression } = await import('../../../combat/automation/automationService.js');

beforeEach(() => {
    vi.clearAllMocks();
});

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestSorcerer',
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Cosmic Omen',
        automation: {
            type: 'cosmic_omen',
            ...overrides.automation,
        },
        ...overrides,
    };
}

function setupRuntimeValues(overrides) {
    getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
        return overrides[key] ?? null;
    });
}

describe('cosmicOmenHandler', () => {
    describe('uses check', () => {
        it('returns popup with "no uses remaining" when usesMax > 0 and current uses is 0', async () => {
            setupRuntimeValues({ cosmicomenUses: 0 });

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
            expect(result.payload.description).toContain('Recharges on a Long Rest');
            expect(result.payload.name).toBe('Cosmic Omen');
            expect(result.payload.type).toBe('automation_info');
        });

        it('returns popup with "no uses remaining" when current uses is a string "0"', async () => {
            setupRuntimeValues({ cosmicomenUses: '0' });

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
        });

        it('returns popup with "no uses remaining" when current uses is negative', async () => {
            setupRuntimeValues({ cosmicomenUses: -1 });

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
        });

        it('proceeds when usesMax > 0 and current uses is positive', async () => {
            setupRuntimeValues({
                cosmicomenUses: 2,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 4 });

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('1d6');
        });

        it('proceeds when usesMax > 0 and current uses is exactly 1 (final use)', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('1d6');
        });

        it('proceeds when usesMax is 0 and uses_expression evaluates to positive value', async () => {
            evaluateAutoExpression.mockReturnValue(2);
            setupRuntimeValues({
                cosmicomenUses: 2,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const action = makeAction({ automation: { uses_expression: 'proficiency_bonus' } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).not.toContain('no uses remaining');
            expect(result.payload.description).toContain('1d6');
        });

        it('proceeds without checking uses when usesMax is 0 and uses_expression evaluates to 0', async () => {
            evaluateAutoExpression.mockReturnValue(0);
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const action = makeAction({ automation: { uses_expression: 'proficiency_bonus' } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('1d6');
        });

        it('proceeds without checking uses when usesMax is 0 and uses_expression evaluates to falsy', async () => {
            evaluateAutoExpression.mockReturnValue(undefined);
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const action = makeAction({ automation: { uses_expression: 'proficiency_bonus' } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('1d6');
        });

        it('proceeds when usesMax is 0 and no uses_expression (unlimited)', async () => {
            setupRuntimeValues({ cosmicOmenEffect: JSON.stringify({ type: 'Woe', isEven: false, starMapRoll: 7 }) });
            rollExpression.mockReturnValue({ total: 2 });

            const action = makeAction({ automation: { usesMax: 0 } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('1d6');
        });
    });

    describe('omen effect check', () => {
        it('returns popup with "no omen active" when cosmicOmenEffect is null', async () => {
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no omen active');
            expect(result.payload.description).toContain('Star Map');
        });

        it('returns popup with "corrupted" when cosmicOmenEffect is invalid JSON', async () => {
            getRuntimeValue.mockImplementation((_playerName, key) => {
                if (key === 'cosmicOmenEffect') return 'not-valid-json';
                return null;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('corrupted');
        });
    });

    describe('d6 roll failure', () => {
        it('returns popup with "roll failed" when rollExpression returns falsy', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('roll failed');
        });
    });

    describe('Weal (Even)', () => {
        it('generates correct popup for Weal with positive modifier', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 4 });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Weal');
            expect(result.payload.description).toContain('Even');
            expect(result.payload.description).toContain('+4');
            expect(result.payload.description).toContain('1d6');
        });

        it('generates correct popup for Weal with zero d6 roll', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 0 });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Weal');
            expect(result.payload.description).toContain('+0');
        });

        it('stores cosmicOmenPendingBonus with correct value and type', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 4 });

            await handle(makeAction(), makePlayerStats(), 'test-campaign');

            const pendingCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicOmenPendingBonus'
            );
            expect(pendingCall).toBeDefined();
            const pendingData = JSON.parse(pendingCall[2]);
            expect(pendingData.value).toBe(4);
            expect(pendingData.type).toBe('Weal');
        });
    });

    describe('Woe (Odd)', () => {
        it('generates correct popup for Woe with negative modifier', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Woe', isEven: false, starMapRoll: 7 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Woe');
            expect(result.payload.description).toContain('Odd');
            expect(result.payload.description).toContain('-3');
        });

        it('stores cosmicOmenPendingBonus with Woe type', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Woe', isEven: false, starMapRoll: 7 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            await handle(makeAction(), makePlayerStats(), 'test-campaign');

            const pendingCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicOmenPendingBonus'
            );
            expect(pendingCall).toBeDefined();
            const pendingData = JSON.parse(pendingCall[2]);
            expect(pendingData.type).toBe('Woe');
        });
    });

    describe('state updates', () => {
        it('decrements runtime uses when usesMax > 0', async () => {
            setupRuntimeValues({
                cosmicomenUses: 3,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 5 });

            await handle(makeAction({ automation: { usesMax: 3 } }), makePlayerStats(), 'test-campaign');

            const usesCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicomenUses'
            );
            expect(usesCall).toBeDefined();
            expect(usesCall[2]).toBe(2);
        });

        it('decrements from 1 to 0 when current uses is 1', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 5 });

            await handle(makeAction({ automation: { usesMax: 3 } }), makePlayerStats(), 'test-campaign');

            const usesCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicomenUses'
            );
            expect(usesCall).toBeDefined();
            expect(usesCall[2]).toBe(0);
        });

        it('does not decrement uses when usesMax is 0', async () => {
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 5 });

            await handle(makeAction({ automation: { usesMax: 0 } }), makePlayerStats(), 'test-campaign');

            const usesCalls = setRuntimeValue.mock.calls.filter(
                (call) => call[1] === 'cosmicomenUses'
            );
            expect(usesCalls).toHaveLength(0);
        });

        it('does not decrement uses when uses_expression evaluates to 0', async () => {
            evaluateAutoExpression.mockReturnValue(0);
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 5 });

            const action = makeAction({ automation: { uses_expression: 'proficiency_bonus' } });
            await handle(action, makePlayerStats(), 'test-campaign');

            const usesCalls = setRuntimeValue.mock.calls.filter(
                (call) => call[1] === 'cosmicomenUses'
            );
            expect(usesCalls).toHaveLength(0);
        });

        it('logs to campaign log with correct details', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Woe', isEven: false, starMapRoll: 7 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'TestSorcerer',
                    abilityName: 'Cosmic Omen',
                    description: expect.stringContaining('Woe'),
                })
            );
        });

        it('logs with correct modifier in description for Weal', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 12 }),
            });
            rollExpression.mockReturnValue({ total: 5 });

            await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    description: expect.stringContaining('+5'),
                })
            );
        });

        it('logs with correct modifier in description for Woe', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Woe', isEven: false, starMapRoll: 8 }),
            });
            rollExpression.mockReturnValue({ total: 2 });

            await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    description: expect.stringContaining('-2'),
                })
            );
        });
    });

    describe('result format', () => {
        it('returns popup with correct fields', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 12 }),
            });
            rollExpression.mockReturnValue({ total: 2 });

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Cosmic Omen');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('uses default feature name when action name is missing', async () => {
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 1 });

            const result = await handle(
                { automation: { type: 'cosmic_omen' } },
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.name).toBe('Cosmic Omen');
        });

        it('uses custom feature name when action name is provided', async () => {
            setupRuntimeValues({
                cosmicomenUses: 1,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 1 });

            const result = await handle(
                { name: 'My Custom Omen', automation: { type: 'cosmic_omen' } },
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.name).toBe('My Custom Omen');
        });
    });

    describe('campaignName propagation', () => {
        it('passes campaignName to getRuntimeValue for uses check', async () => {
            setupRuntimeValues({ cosmicomenUses: 0 });

            const action = makeAction({ automation: { usesMax: 3 } });
            await handle(action, makePlayerStats(), 'test-campaign');

            expect(getRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'cosmicomenUses',
                'test-campaign'
            );
        });

        it('passes campaignName to getRuntimeValue for uses check with omen effect present', async () => {
            setupRuntimeValues({
                cosmicomenUses: 2,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            const action = makeAction({ automation: { usesMax: 3 } });
            await handle(action, makePlayerStats(), 'test-campaign');

            expect(getRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'cosmicomenUses',
                'test-campaign'
            );
        });

        it('passes campaignName to getRuntimeValue for omen effect check', async () => {
            setupRuntimeValues({ cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }) });
            rollExpression.mockReturnValue({ total: 3 });

            await handle(makeAction(), makePlayerStats(), 'my-campaign');

            expect(getRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'cosmicOmenEffect',
                'my-campaign'
            );
        });

        it('passes campaignName to setRuntimeValue for uses decrement', async () => {
            setupRuntimeValues({
                cosmicomenUses: 2,
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            await handle(makeAction({ automation: { usesMax: 3 } }), makePlayerStats(), 'campaign-alpha');

            const usesCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicomenUses'
            );
            expect(usesCall[3]).toBe('campaign-alpha');
        });

        it('passes campaignName to setRuntimeValue for pending bonus storage', async () => {
            setupRuntimeValues({
                cosmicOmenEffect: JSON.stringify({ type: 'Weal', isEven: true, starMapRoll: 10 }),
            });
            rollExpression.mockReturnValue({ total: 3 });

            await handle(makeAction(), makePlayerStats(), 'campaign-beta');

            const pendingCall = setRuntimeValue.mock.calls.find(
                (call) => call[1] === 'cosmicOmenPendingBonus'
            );
            expect(pendingCall[3]).toBe('campaign-beta');
        });
    });

    describe('clearCosmicOmenEffect', () => {
        it('clears cosmicOmenEffect for given player and campaign', async () => {
            await clearCosmicOmenEffect('TestSorcerer', 'test-campaign');

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'cosmicOmenEffect',
                null,
                'test-campaign'
            );
        });

        it('handles setRuntimeValue rejection gracefully', async () => {
            setRuntimeValue.mockRejectedValue(new Error('DB error'));

            await expect(
                clearCosmicOmenEffect('TestSorcerer', 'test-campaign')
            ).rejects.toThrow('DB error');
        });
    });
});
