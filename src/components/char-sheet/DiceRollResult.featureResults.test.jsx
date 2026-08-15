// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('bardic inspiration defense result content', () => {
        it('shows AC value in result after clicking defense button', () => {
            const onBardicInspirationDefense = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[18]}
                    bonus={5}
                    targetName="Goblin"
                    targetAc={16}
                    hit={true}
                    bardicInspirationDefense={true}
                    bardicInspirationDefenseDieSize={6}
                    onBardicInspirationDefense={onBardicInspirationDefense}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration - Defense/));
            expect(onBardicInspirationDefense).toHaveBeenCalled();
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl).toBeInTheDocument();
            expect(resultEl.textContent).toContain('AC');
        });
    });

    describe('bardic inspiration offense result content', () => {
        it('shows bonus total in result after clicking offense button', () => {
            const onBardicInspirationOffense = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    total={15}
                    bardicInspirationOffense={true}
                    bardicInspirationOffenseDieSize={6}
                    onBardicInspirationOffense={onBardicInspirationOffense}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration - Offense/));
            expect(onBardicInspirationOffense).toHaveBeenCalled();
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl).toBeInTheDocument();
            expect(resultEl.textContent).toContain('+');
        });
    });

    describe('dark ones own luck result content', () => {
        it('shows d10 die info in result after clicking', () => {
            const onDarkOnesLuck = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    darkOnesLuck={true}
                    onDarkOnesLuck={onDarkOnesLuck}
                />
            );
            fireEvent.click(screen.getByText(/Dark One's Own Luck/));
            expect(onDarkOnesLuck).toHaveBeenCalled();
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl).toBeInTheDocument();
            expect(resultEl.textContent).toContain('d10');
        });
    });

    describe('elemental adept with no 1s in rolls', () => {
        it('shows 0× count when bonus > 0 but no 1s in rolls', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fire Bolt"
                    type="damage"
                    rolls={[3, 6, 4]}
                    bonus={0}
                    elementalAdeptBonus={1}
                />
            );
            const el = container.querySelector('.dice-roll-elemental-adept');
            expect(el.textContent).toContain('0× 1 → 2');
            expect(el.textContent).toContain('+1');
        });
    });
});
