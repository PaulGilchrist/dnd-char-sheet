import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult savage attacker chooser', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('offers Keep First / Keep Reroll chooser when the reroll is higher', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        render(
            <DiceRollResult
                name="Greatsword"
                type="damage"
                rolls={[2, 3]}
                bonus={0}
                total={5}
                formula="2d6"
                savageAttacker={true}
                onSavageAttacker={vi.fn().mockResolvedValue(undefined)}
                onSavageAttackerChoice={vi.fn().mockResolvedValue(undefined)}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Savage Attacker/ }));
        expect(screen.getByRole('button', { name: /Keep First \(5\)/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Keep Reroll \(12\)/ })).toBeInTheDocument();
    });

    it('keep-reroll click forwards the keep-reroll decision and hides the chooser', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const onSavageAttackerChoice = vi.fn().mockResolvedValue(undefined);
        render(
            <DiceRollResult
                name="Greatsword"
                type="damage"
                rolls={[2, 3]}
                bonus={0}
                total={5}
                formula="2d6"
                savageAttacker={true}
                onSavageAttacker={vi.fn().mockResolvedValue(undefined)}
                onSavageAttackerChoice={onSavageAttackerChoice}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Savage Attacker/ }));
        fireEvent.click(screen.getByRole('button', { name: /Keep Reroll \(12\)/ }));

        expect(onSavageAttackerChoice).toHaveBeenCalledTimes(1);
        expect(onSavageAttackerChoice.mock.calls[0][0]).toEqual(expect.objectContaining({
            keep: 'reroll',
            originalTotal: 5,
            newTotal: 12,
            rawDamage: 5,
        }));
        expect(screen.queryByRole('button', { name: /Keep First/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Reroll kept/)).toBeInTheDocument();
    });

    it('keep-first click records the decision with no damage movement', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const onSavageAttackerChoice = vi.fn().mockResolvedValue(undefined);
        const { container } = render(
            <DiceRollResult
                name="Greatsword"
                type="damage"
                rolls={[2, 3]}
                bonus={0}
                total={5}
                formula="2d6"
                savageAttacker={true}
                onSavageAttacker={vi.fn().mockResolvedValue(undefined)}
                onSavageAttackerChoice={onSavageAttackerChoice}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Savage Attacker/ }));
        fireEvent.click(screen.getByRole('button', { name: /Keep First \(5\)/ }));

        expect(onSavageAttackerChoice).toHaveBeenCalledTimes(1);
        expect(onSavageAttackerChoice.mock.calls[0][0].keep).toBe('original');
        expect(screen.queryByRole('button', { name: /Keep Reroll/ })).not.toBeInTheDocument();
        expect(container.querySelector('.dice-roll-reroll-result').textContent).toContain('Original kept');
    });

    it('offers no chooser and keeps original when the reroll is lower', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        const onSavageAttackerChoice = vi.fn().mockResolvedValue(undefined);
        const { container } = render(
            <DiceRollResult
                name="Shortsword"
                type="damage"
                rolls={[6]}
                bonus={0}
                total={6}
                formula="1d6"
                savageAttacker={true}
                onSavageAttacker={vi.fn().mockResolvedValue(undefined)}
                onSavageAttackerChoice={onSavageAttackerChoice}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Savage Attacker/ }));

        expect(screen.queryByRole('button', { name: /Keep Reroll/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Keep First/ })).not.toBeInTheDocument();
        expect(container.querySelector('.dice-roll-reroll-result').textContent).toContain('Original kept');
    });
});
