import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createDiceRollHandlers } from './DiceRollResult.handlers';

describe('createDiceRollHandlers - handleSavageAttacker', () => {
    let state;
    let props;

    beforeEach(() => {
        state = {
            setSavageAttackerResult: vi.fn(),
            setSavageAttackerUsed: vi.fn(),
            savageAttackerResult: null,
        };
        props = {
            rolls: [2, 3],
            formula: '2d6',
            total: 5,
            modifier: 0,
            targetName: 'Orc',
            damageType: 'Slashing',
            onSavageAttacker: vi.fn().mockResolvedValue(undefined),
            onSavageAttackerChoice: vi.fn().mockResolvedValue(undefined),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('forwards the original rolls only — the reroll click alone never changes damage', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttacker();

        expect(state.setSavageAttackerUsed).toHaveBeenCalledWith(true);
        const data = props.onSavageAttacker.mock.calls[0][0];
        expect(data.rolls).toEqual([2, 3]);
        expect(data.originalRolls).toEqual([2, 3]);
        expect(data.newRolls).toEqual([6, 6]);
        expect(data.rawDamage).toBe(5);
    });

    it('marks awaitingChoice when the reroll total is higher (player must choose)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttacker();

        const result = state.setSavageAttackerResult.mock.calls[0][0];
        expect(result.awaitingChoice).toBe(true);
        expect(result.originalTotal).toBe(5);
        expect(result.newTotal).toBe(12);
        expect(result.better).toBe(true);
    });

    it('auto-keeps original and requests no choice when the reroll is lower (no heal possible)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.001);

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttacker();

        const result = state.setSavageAttackerResult.mock.calls[0][0];
        expect(result.awaitingChoice).toBe(false);
        expect(result.better).toBe(false);
        const data = props.onSavageAttacker.mock.calls[0][0];
        expect(data.rolls).toEqual([2, 3]);
    });

    it('keep choice forwards the explicit decision and clears awaitingChoice', () => {
        state.savageAttackerResult = {
            original: '2, 3',
            rerolled: '6, 6',
            originalRolls: [2, 3],
            newRolls: [6, 6],
            originalTotal: 5,
            newTotal: 12,
            better: true,
            awaitingChoice: true,
        };

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttackerKeep('reroll');

        expect(state.setSavageAttackerResult).toHaveBeenCalledWith(
            expect.objectContaining({ awaitingChoice: false, kept: 'reroll' })
        );
        const choice = props.onSavageAttackerChoice.mock.calls[0][0];
        expect(choice.keep).toBe('reroll');
        expect(choice.originalTotal).toBe(5);
        expect(choice.newTotal).toBe(12);
        expect(choice.targetName).toBe('Orc');
    });

    it('keep-original choice forwards decision without touching damage', () => {
        state.savageAttackerResult = {
            original: '2, 3',
            rerolled: '6, 6',
            originalRolls: [2, 3],
            newRolls: [6, 6],
            originalTotal: 5,
            newTotal: 12,
            better: true,
            awaitingChoice: true,
        };

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttackerKeep('original');

        const choice = props.onSavageAttackerChoice.mock.calls[0][0];
        expect(choice.keep).toBe('original');
    });

    it('keep choice is inert once the decision is made', () => {
        state.savageAttackerResult = {
            originalRolls: [2, 3],
            newRolls: [6, 6],
            originalTotal: 5,
            newTotal: 12,
            awaitingChoice: false,
            kept: 'reroll',
        };

        const handlers = createDiceRollHandlers(props, state);
        handlers.handleSavageAttackerKeep('reroll');

        expect(props.onSavageAttackerChoice).not.toHaveBeenCalled();
    });
});
