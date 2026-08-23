import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';
import * as automationExpressions from '../../services/combat/automation/automationExpressions.js';

describe('DiceRollResult superiority die roll', () => {
    describe('handleSuperiorityManeuver die size', () => {
        let evaluateAutoExpressionSpy;

        beforeEach(() => {
            evaluateAutoExpressionSpy = vi.spyOn(automationExpressions, 'evaluateAutoExpression');
        });

        afterEach(() => {
            evaluateAutoExpressionSpy.mockRestore();
        });

        it('rolls d8 for level 3 Battle Master (d8 superiority die)', async () => {
            evaluateAutoExpressionSpy.mockReturnValue(8);
            const onSuperiorityManeuver = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Intimidation"
                    type="d20"
                    rolls={[14]}
                    bonus={3}
                    rollType="skill"
                    availableSuperiorityManeuvers={[{ name: 'Commanding Presence', dieExpression: 'superiority_die' }]}
                    playerStats={{ level: 3 }}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Commanding Presence/));
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
            expect(evaluateAutoExpressionSpy).toHaveBeenCalledWith('superiority_die', expect.objectContaining({ level: 3 }));
            expect(onSuperiorityManeuver).toHaveBeenCalled();
            const calledWith = onSuperiorityManeuver.mock.calls[0];
            expect(calledWith[0]).toBe('Commanding Presence');
            expect(calledWith[1]).toBeGreaterThanOrEqual(1);
            expect(calledWith[1]).toBeLessThanOrEqual(8);
        });

        it('rolls d10 for level 10 Battle Master (d10 superiority die)', async () => {
            evaluateAutoExpressionSpy.mockReturnValue(10);
            const onSuperiorityManeuver = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Intimidation"
                    type="d20"
                    rolls={[14]}
                    bonus={3}
                    rollType="skill"
                    availableSuperiorityManeuvers={[{ name: 'Commanding Presence', dieExpression: 'superiority_die' }]}
                    playerStats={{ level: 10 }}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Commanding Presence/));
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
            expect(evaluateAutoExpressionSpy).toHaveBeenCalledWith('superiority_die', expect.objectContaining({ level: 10 }));
            expect(onSuperiorityManeuver).toHaveBeenCalled();
            const calledWith = onSuperiorityManeuver.mock.calls[0];
            expect(calledWith[1]).toBeGreaterThanOrEqual(1);
            expect(calledWith[1]).toBeLessThanOrEqual(10);
        });

        it('rolls d12 for level 18 Battle Master (d12 superiority die)', async () => {
            evaluateAutoExpressionSpy.mockReturnValue(12);
            const onSuperiorityManeuver = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Intimidation"
                    type="d20"
                    rolls={[14]}
                    bonus={3}
                    rollType="skill"
                    availableSuperiorityManeuvers={[{ name: 'Commanding Presence', dieExpression: 'superiority_die' }]}
                    playerStats={{ level: 18 }}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Commanding Presence/));
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
            expect(evaluateAutoExpressionSpy).toHaveBeenCalledWith('superiority_die', expect.objectContaining({ level: 18 }));
            expect(onSuperiorityManeuver).toHaveBeenCalled();
            const calledWith = onSuperiorityManeuver.mock.calls[0];
            expect(calledWith[1]).toBeGreaterThanOrEqual(1);
            expect(calledWith[1]).toBeLessThanOrEqual(12);
        });

        it('uses explicit dieExpression when provided', async () => {
            evaluateAutoExpressionSpy.mockReturnValue(6);
            const onSuperiorityManeuver = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Intimidation"
                    type="d20"
                    rolls={[14]}
                    bonus={3}
                    rollType="skill"
                    availableSuperiorityManeuvers={[{ name: 'Test Maneuver', dieExpression: '1d6' }]}
                    playerStats={{ level: 3 }}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Test Maneuver/));
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
            expect(evaluateAutoExpressionSpy).toHaveBeenCalledWith('1d6', expect.any(Object));
            expect(onSuperiorityManeuver).toHaveBeenCalled();
        });
    });
});
