import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('advantage/disadvantage toggles', () => {
        it('toggles advantage mode on when clicking the advantage checkbox', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                />
            );
            const advCheckbox = screen.getByLabelText(/Advantage/);
            fireEvent.click(advCheckbox);
            // After clicking, mode should be 'advantage', so finalRoll = max(8, 15) = 15
            expect(container.querySelector('.dice-roll-total').textContent).toBe('18');
        });

        it('toggles advantage mode off when clicking again', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                />
            );
            const advCheckbox = screen.getByLabelText(/Advantage/);
            fireEvent.click(advCheckbox);
            fireEvent.click(advCheckbox);
            // Back to normal mode, finalRoll = 8
            expect(container.querySelector('.dice-roll-total').textContent).toBe('11');
        });

        it('toggles disadvantage mode on when clicking the disadvantage checkbox', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                />
            );
            const disCheckbox = screen.getByLabelText(/Disadvantage/);
            fireEvent.click(disCheckbox);
            // After clicking, mode should be 'disadvantage', so finalRoll = min(8, 15) = 8
            expect(container.querySelector('.dice-roll-total').textContent).toBe('11');
        });

        it('toggles disadvantage mode off when clicking again', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                />
            );
            const disCheckbox = screen.getByLabelText(/Disadvantage/);
            fireEvent.click(disCheckbox);
            fireEvent.click(disCheckbox);
            // Back to normal mode, finalRoll = 8
            expect(container.querySelector('.dice-roll-total').textContent).toBe('11');
        });

        it('does not show toggle checkboxes for non-d20 types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                />
            );
            expect(screen.queryByLabelText(/Advantage/)).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/Disadvantage/)).not.toBeInTheDocument();
        });

        it('shows advantage toggle as active when forcedMode is advantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                    forcedMode="advantage"
                />
            );
            const advLabel = container.querySelector('.badge-toggle.active');
            expect(advLabel).toBeInTheDocument();
        });

        it('shows disadvantage toggle as active when forcedMode is disadvantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                    forcedMode="disadvantage"
                />
            );
            const disLabel = container.querySelector('.badge-toggle.active');
            expect(disLabel).toBeInTheDocument();
        });
    });

    describe('psi-bolstered knack still failed path', () => {
        it('calls onPsiBolsteredKnack with success: false when still failed button is clicked', () => {
            const onPsiBolsteredKnack = vi.fn();
            render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                    onPsiBolsteredKnack={onPsiBolsteredKnack}
                />
            );
            // First click the Psi-Bolstered Knack button
            fireEvent.click(screen.getByText(/Psi-Bolstered Knack/));
            // Then click the Still Failed button
            fireEvent.click(screen.getByText(/Still Failed/));
            expect(onPsiBolsteredKnack).toHaveBeenCalledWith({
                dieValue: expect.any(Number),
                dieSize: 6,
                success: false,
            });
        });

        it('shows consumed state after clicking still failed', () => {
            const { container } = render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                />
            );
            fireEvent.click(screen.getByText(/Psi-Bolstered Knack/));
            fireEvent.click(screen.getByText(/Still Failed/));
            // After consuming, the result should still be visible
            const rerollResults = container.querySelectorAll('.dice-roll-reroll-result');
            expect(rerollResults.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('onReroll callback', () => {
        it('calls onReroll callback when provided and reroll button is clicked', () => {
            const onReroll = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    autoReroll={true}
                    onReroll={onReroll}
                />
            );
            fireEvent.click(screen.getByText(/Reroll/));
            expect(onReroll).toHaveBeenCalled();
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('error paths', () => {
        it('logs console.error when onBardicInspirationDefense is falsy', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[18]}
                    bonus={5}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    bardicInspirationDefense={true}
                    bardicInspirationDefenseDieSize={6}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration - Defense/));
            expect(consoleSpy).toHaveBeenCalledWith('[BI Defense] onBardicInspirationDefense is falsy!');
            consoleSpy.mockRestore();
        });

        it('logs console.error when superiority maneuver throws', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
            const onSuperiorityManeuver = vi.fn().mockRejectedValue(new Error('test error'));
            render(
                <DiceRollResult
                    name="Sword"
                    type="attack"
                    rolls={[15]}
                    bonus={3}
                    availableSuperiorityManeuvers={[{ name: 'Pushing Attack' }]}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Pushing Attack/));
            await new Promise(r => setTimeout(r, 0));
            expect(consoleSpy).toHaveBeenCalledWith('[DiceRollResult] Superiority maneuver failed:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
