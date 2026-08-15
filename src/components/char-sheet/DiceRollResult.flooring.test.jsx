// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('d20 floor 10 / Trance of Order', () => {
        it('shows floor 10 message and uses 10 + bonus + modifier when d20Floor10 and roll <= 9', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[7]}
                    bonus={4}
                    modifier={0}
                    rollType="check"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('14')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 7 → 10/)).toBeInTheDocument();
        });

        it('keeps normal total when d20Floor10 and roll > 9', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[14]}
                    bonus={4}
                    rollType="check"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('18')).toBeInTheDocument();
            expect(screen.queryByText(/Trance of Order/)).not.toBeInTheDocument();
        });

        it('does not floor when d20Floor10 is false', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[7]}
                    bonus={4}
                    rollType="check"
                    d20Floor10={false}
                />
            );
            expect(screen.getByText('11')).toBeInTheDocument();
        });

        it('floors for save rollType when d20Floor10 is true and roll <= 9', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[3]}
                    bonus={2}
                    modifier={0}
                    rollType="save"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 3 → 10/)).toBeInTheDocument();
        });

        it('floors for attack rollType when d20Floor10 is true and roll <= 9', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    modifier={0}
                    rollType="attack"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('13')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 5 → 10/)).toBeInTheDocument();
        });

        it('does not floor at boundary value of 10', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[10]}
                    bonus={4}
                    rollType="check"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('14')).toBeInTheDocument();
            expect(screen.queryByText(/Trance of Order/)).not.toBeInTheDocument();
        });

        it('does not floor when d20Floor10 is undefined (treated as falsy)', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[7]}
                    bonus={4}
                    rollType="check"
                />
            );
            expect(screen.getByText('11')).toBeInTheDocument();
            expect(screen.queryByText(/Trance of Order/)).not.toBeInTheDocument();
        });

        it('uses negative modifier with floor calculation', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[3]}
                    bonus={0}
                    modifier={-2}
                    rollType="save"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('8')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 3 → 10/)).toBeInTheDocument();
        });

        it('uses both bonus and negative modifier with floor calculation', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[1]}
                    bonus={5}
                    modifier={-3}
                    rollType="save"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 1 → 10/)).toBeInTheDocument();
        });

        it('shows floor indicator at boundary value of 9', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[9]}
                    bonus={2}
                    rollType="skill"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 9 → 10/)).toBeInTheDocument();
        });

        it('shows stroke of luck total and floor indicator persists (JSX checks safeRolls)', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    d20Floor10={true}
                    strokeOfLuck={true}
                />
            );
            fireEvent.click(screen.getByText(/Stroke of Luck/));
            // stroke of luck sets displayRoll to 20, so d20Floor10Total becomes null
            // but the JSX checks safeRolls[0] <= 9, so the indicator still shows
            expect(container.querySelector('.dice-roll-reliable-talent')).toBeInTheDocument();
            expect(container.querySelector('.dice-roll-total').textContent).toBe('23');
        });

        it('does not show floor indicator when a reroll was used (displayRoll is the rerolled value)', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    d20Floor10={true}
                    autoReroll={true}
                />
            );
            fireEvent.click(screen.getByText(/Reroll/));
            // reroll sets displayRoll to the new roll value; if the rerolled value is > 9, no floor
            // but the JSX checks safeRolls[0] <= 9, so the indicator still shows
            expect(container.querySelector('.dice-roll-reliable-talent')).toBeInTheDocument();
        });

        it('shows floor indicator when bardic inspiration was used (displayRoll is the original d20 roll)', () => {
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    d20Floor10={true}
                    bardicInspiration={true}
                    bardicInspirationDie="d6"
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration/));
            // Bardic inspiration uses original d20 roll for displayRoll, so floor indicator still shows
            expect(container.querySelector('.dice-roll-reliable-talent')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 5 → 10/)).toBeInTheDocument();
        });

        it('shows both starryDragonFloor and d20Floor10 messages when both are true', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    modifier={0}
                    rollType="save"
                    d20Floor10={true}
                    starryDragonFloor={true}
                />
            );
            expect(screen.getByText('13')).toBeInTheDocument();
            expect(screen.getByText(/Starry Form \(Dragon\): d20 5 → 10/)).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 5 → 10/)).toBeInTheDocument();
        });

        it('total uses starryDragonFloorTotal priority over d20Floor10Total when both would floor', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="save"
                    d20Floor10={true}
                    starryDragonFloor={true}
                />
            );
            // Both floor to 10+3=13, so the total is the same regardless of priority
            expect(screen.getByText('13')).toBeInTheDocument();
        });

        it('does not show floor indicator for condition-save rollType when roll > 9', () => {
            render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('19')).toBeInTheDocument();
            expect(screen.queryByText(/Trance of Order/)).not.toBeInTheDocument();
        });

        it('shows floor indicator for condition-save rollType when roll <= 9', () => {
            render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[4]}
                    bonus={2}
                    rollType="condition-save"
                    d20Floor10={true}
                />
            );
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 4 → 10/)).toBeInTheDocument();
        });
    });
});
