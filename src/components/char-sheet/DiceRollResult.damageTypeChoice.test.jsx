// @improved-by-ai
import { render, screen } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('damage type choice', () => {
        it('renders base and bonus damage breakdown with null/undefined roll data', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[]}
                    bonus={0}
                    baseFormula="1d8"
                    baseRolls={null}
                    baseTotal={0}
                    bonusFormula="1d8"
                    bonusRolls={null}
                    bonusTotal={0}
                    types={['Fire']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            const weaponLine = container.querySelector('.dice-roll-breakdown');
            expect(weaponLine.textContent).toContain('Weapon Damage:');
            expect(weaponLine.textContent).toContain('1d8:');
            expect(weaponLine.textContent).toContain('0');
        });

        it('renders no type buttons when types is null', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[10]}
                    bonus={0}
                    types={null}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            expect(screen.queryByText(/Skip/)).toBeInTheDocument();
        });

        it('renders no type buttons when types is undefined', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[10]}
                    bonus={0}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            expect(screen.queryByText(/Skip/)).toBeInTheDocument();
        });

        it('renders no type buttons when types is empty array', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[10]}
                    bonus={0}
                    types={[]}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            expect(screen.queryByText(/Skip/)).toBeInTheDocument();
        });

        it('renders the damage type choice container when type is NOT damage_type_choice', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    types={['Fire']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).not.toBeInTheDocument();
        });

        it('renders the damage type choice container when type is d20', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[15]}
                    bonus={3}
                    types={['Fire']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).not.toBeInTheDocument();
        });
    });
});
