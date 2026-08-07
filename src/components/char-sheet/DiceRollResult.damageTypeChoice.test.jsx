import { render, screen } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('damage type choice', () => {
        it('renders damage type choice UI when type is damage_type_choice', () => {
            const { container } = render(
                <DiceRollResult
                    name="Divine Smite"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[6]}
                    baseTotal={6}
                    bonusFormula="1d8"
                    bonusRolls={[4]}
                    bonusTotal={4}
                    types={['Radiant', 'Necrotic']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            expect(screen.getByText('Choose the damage type for this hit:')).toBeInTheDocument();
            expect(screen.getByText('Weapon Damage:')).toBeInTheDocument();
            expect(screen.getByText('Divine Strike:')).toBeInTheDocument();
            expect(screen.getByText('Radiant')).toBeInTheDocument();
            expect(screen.getByText('Necrotic')).toBeInTheDocument();
            expect(screen.getByText('Skip')).toBeInTheDocument();
        });

        it('dispatches damage-type-choice event with chosen type on button click', () => {
            const handler = (e) => {
                expect(e.detail.chosenType).toBe('Radiant');
            };
            window.addEventListener('damage-type-choice', handler, { once: true });
            render(
                <DiceRollResult
                    name="Divine Smite"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[6]}
                    baseTotal={6}
                    bonusFormula="1d8"
                    bonusRolls={[4]}
                    bonusTotal={4}
                    types={['Radiant', 'Necrotic']}
                />
            );
            screen.getByText('Radiant').click();
        });

        it('dispatches damage-type-skip event on skip button click', () => {
            const handler = (e) => {
                expect(e).toBeDefined();
            };
            window.addEventListener('damage-type-skip', handler, { once: true });
            render(
                <DiceRollResult
                    name="Divine Smite"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[6]}
                    baseTotal={6}
                    bonusFormula="1d8"
                    bonusRolls={[4]}
                    bonusTotal={4}
                    types={['Radiant', 'Necrotic']}
                />
            );
            screen.getByText('Skip').click();
        });

        it('renders with null/undefined base data gracefully', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[]}
                    bonus={0}
                    baseFormula=""
                    baseRolls={null}
                    baseTotal={0}
                    bonusFormula=""
                    bonusRolls={null}
                    bonusTotal={0}
                    types={['Fire']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
        });
    });
});
