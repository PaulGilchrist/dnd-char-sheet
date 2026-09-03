import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createDiceRollHandlers } from './DiceRollResult.handlers';

describe('createDiceRollHandlers - handlePuncture', () => {
    let state;
    let props;

    beforeEach(() => {
        state = {
            setPunctureResult: vi.fn(),
            setPunctureUsed: vi.fn(),
        };
        props = {
            rolls: [4, 6],
            formula: '1d8-1 [piercing] + 1d6 [force]',
            total: 9,
            modifier: -1,
            targetName: 'Zombie 1',
            damageType: 'Piercing',
            onPuncture: vi.fn().mockResolvedValue(undefined),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rerolls the lowest die using its own die size from the formula, not rolls[0] value', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        const handlers = createDiceRollHandlers(props, state);
        await handlers.handlePuncture();

        expect(state.setPunctureUsed).toHaveBeenCalledWith(true);
        const data = props.onPuncture.mock.calls[0][0];
        expect(data.rerolledIndex).toBe(0);
        expect(data.originalValue).toBe(4);
        expect(data.newValue).toBe(8);
        expect(data.newRolls).toEqual([8, 6]);
    });

    it('maps the reroll index to the matching die term in a multi-die formula', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        props.rolls = [5, 5, 1];
        props.formula = '1d8 + 1d6 + 1d6';

        const handlers = createDiceRollHandlers(props, state);
        await handlers.handlePuncture();

        const data = props.onPuncture.mock.calls[0][0];
        expect(data.rerolledIndex).toBe(2);
        expect(data.newValue).toBe(6);
        expect(data.newRolls).toEqual([5, 5, 6]);
    });

    it('falls back to a d6 when the formula has no dice term', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        props.rolls = [3];
        props.formula = '';

        const handlers = createDiceRollHandlers(props, state);
        await handlers.handlePuncture();

        const data = props.onPuncture.mock.calls[0][0];
        expect(data.newValue).toBe(6);
    });
});
