import { render, screen } from '@testing-library/react';
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

        it('does not floor when not check or skill rollType', () => {
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

        it('prioritizes starryDragonFloor over d20Floor10 when both are true', () => {
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

        it('prioritizes reliableTalent over d20Floor10 when both are true', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    modifier={0}
                    rollType="skill"
                    d20Floor10={true}
                    reliableTalent={true}
                />
            );
            expect(screen.getByText('13')).toBeInTheDocument();
            expect(screen.getByText(/Reliable Talent: d20 5 → 10/)).toBeInTheDocument();
            expect(screen.getByText(/Trance of Order: d20 5 → 10/)).toBeInTheDocument();
        });
    });
});
