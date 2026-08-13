// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('damage type choice interaction', () => {
        it('renders damage type choice UI with buttons and skip', () => {
            const { container } = render(
                <DiceRollResult
                    name="Flame Blade"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[5]}
                    baseTotal={5}
                    bonusFormula="1d8"
                    bonusRolls={[3]}
                    bonusTotal={3}
                    types={['Fire', 'Cold']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
            expect(screen.getByText(/Choose the damage type for this hit/)).toBeInTheDocument();
            expect(screen.getByText('Fire')).toBeInTheDocument();
            expect(screen.getByText('Cold')).toBeInTheDocument();
            expect(screen.getByText('Skip')).toBeInTheDocument();
        });

        it('dispatches damage-type-choice event with chosen type on button click', () => {
            const handler = vi.fn();
            window.addEventListener('damage-type-choice', handler);
            render(
                <DiceRollResult
                    name="Flame Blade"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[5]}
                    baseTotal={5}
                    bonusFormula="1d8"
                    bonusRolls={[3]}
                    bonusTotal={3}
                    types={['Fire', 'Cold']}
                />
            );
            fireEvent.click(screen.getByText('Fire'));
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail.chosenType).toBe('Fire');
            window.removeEventListener('damage-type-choice', handler);
        });

        it('dispatches damage-type-skip event when skip is clicked', () => {
            const handler = vi.fn();
            window.addEventListener('damage-type-skip', handler);
            render(
                <DiceRollResult
                    name="Flame Blade"
                    type="damage_type_choice"
                    rolls={[18]}
                    bonus={5}
                    baseFormula="1d8"
                    baseRolls={[5]}
                    baseTotal={5}
                    bonusFormula="1d8"
                    bonusRolls={[3]}
                    bonusTotal={3}
                    types={['Fire', 'Cold']}
                />
            );
            fireEvent.click(screen.getByText('Skip'));
            expect(handler).toHaveBeenCalledTimes(1);
            window.removeEventListener('damage-type-skip', handler);
        });

        it('renders gracefully with empty types array', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[]}
                    bonus={0}
                    types={[]}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).toBeInTheDocument();
        });
    });

    describe('bardic inspiration defense interaction', () => {
        it('renders button only when hit is true', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[18]}
                    bonus={5}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    rollType="attack"
                    bardicInspirationDefense={true}
                    bardicInspirationDefenseDieSize={6}
                />
            );
            expect(screen.getByText(/Bardic Inspiration - Defense/)).toBeInTheDocument();
        });

        it('does not render button when hit is false', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[8]}
                    bonus={3}
                    targetName="Goblin"
                    targetAc={14}
                    hit={false}
                    rollType="attack"
                    bardicInspirationDefense={true}
                    bardicInspirationDefenseDieSize={6}
                />
            );
            expect(screen.queryByText(/Bardic Inspiration - Defense/)).not.toBeInTheDocument();
        });

        it('calls onBardicInspirationDefense and shows result div after clicking', () => {
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
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('bardic inspiration offense interaction', () => {
        it('renders button only for damage types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    bardicInspirationOffense={true}
                    bardicInspirationOffenseDieSize={6}
                />
            );
            expect(screen.getByText(/Bardic Inspiration - Offense/)).toBeInTheDocument();
        });

        it('does not render button for non-damage types', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    bardicInspirationOffense={true}
                    bardicInspirationOffenseDieSize={6}
                />
            );
            expect(screen.queryByText(/Bardic Inspiration - Offense/)).not.toBeInTheDocument();
        });

        it('calls onBardicInspirationOffense and shows result div after clicking', () => {
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
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('done button', () => {
        it('renders and calls onDone with computedHit when clicked', () => {
            const onDone = vi.fn();
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[18]}
                    bonus={5}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    rollType="attack"
                    autoDamage={true}
                    onDone={onDone}
                />
            );
            fireEvent.click(screen.getByText('Done'));
            expect(onDone).toHaveBeenCalledWith(true);
        });

        it('does not render when autoDamage is false', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[18]}
                    bonus={5}
                    hit={true}
                    autoDamage={false}
                    onDone={vi.fn()}
                />
            );
            expect(screen.queryByText('Done')).not.toBeInTheDocument();
        });

        it('does not render when hit is false even with autoDamage', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="attack"
                    rolls={[8]}
                    bonus={3}
                    hit={false}
                    autoDamage={true}
                    onDone={vi.fn()}
                />
            );
            expect(screen.queryByText('Done')).not.toBeInTheDocument();
        });
    });

    describe('dice-roll-hint', () => {
        it('always renders the hint text regardless of props', () => {
            render(
                <DiceRollResult
                    name="Test"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                />
            );
            expect(screen.getByText('click to dismiss')).toBeInTheDocument();
        });
    });

    describe('save result advantage/disadvantage indicators', () => {
        it('shows [Disadvantage] badge when forcedMode is disadvantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={{ success: true, total: 18, roll: 14, bonus: 4 }}
                    saveDc={15}
                    forcedMode="disadvantage"
                />
            );
            const saveResult = container.querySelector('.dice-roll-save-result');
            expect(saveResult.textContent).toContain('[Disadvantage]');
        });

        it('shows [Advantage] badge when forcedMode is advantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={{ success: true, total: 18, roll: 14, bonus: 4 }}
                    saveDc={15}
                    forcedMode="advantage"
                />
            );
            const saveResult = container.querySelector('.dice-roll-save-result');
            expect(saveResult.textContent).toContain('[Advantage]');
        });

        it('does not show advantage/disadvantage indicators when forcedMode is normal', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={{ success: true, total: 18, roll: 14, bonus: 4 }}
                    saveDc={15}
                    forcedMode="normal"
                />
            );
            const saveResult = container.querySelector('.dice-roll-save-result');
            expect(saveResult.textContent).not.toContain('[Advantage]');
            expect(saveResult.textContent).not.toContain('[Disadvantage]');
        });

        it('does not show indicators when forcedMode is not provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={{ success: true, total: 18, roll: 14, bonus: 4 }}
                    saveDc={15}
                />
            );
            const saveResult = container.querySelector('.dice-roll-save-result');
            expect(saveResult.textContent).not.toContain('[Advantage]');
            expect(saveResult.textContent).not.toContain('[Disadvantage]');
        });
    });

    describe('stroke of luck interaction', () => {
        it('renders button only for d20 types', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    strokeOfLuck={true}
                />
            );
            expect(screen.getByText(/Stroke of Luck/)).toBeInTheDocument();
        });

        it('does not render for non-d20 types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={3}
                    strokeOfLuck={true}
                />
            );
            expect(screen.queryByText(/Stroke of Luck/)).not.toBeInTheDocument();
        });

        it('calls onStrokeOfLuck and shows result after clicking', () => {
            const onStrokeOfLuck = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    strokeOfLuck={true}
                    onStrokeOfLuck={onStrokeOfLuck}
                />
            );
            fireEvent.click(screen.getByText(/Stroke of Luck/));
            expect(onStrokeOfLuck).toHaveBeenCalled();
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('tactical mind interaction', () => {
        it('renders button for check rollType', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    tacticalMind={true}
                />
            );
            expect(screen.getByText(/Tactical Mind/)).toBeInTheDocument();
        });

        it('renders button for skill rollType', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    tacticalMind={true}
                />
            );
            expect(screen.getByText(/Tactical Mind/)).toBeInTheDocument();
        });

        it('does not render for attack rollType', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    tacticalMind={true}
                />
            );
            expect(screen.queryByText(/Tactical Mind/)).not.toBeInTheDocument();
        });

        it('does not render for save rollType', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="save"
                    tacticalMind={true}
                />
            );
            expect(screen.queryByText(/Tactical Mind/)).not.toBeInTheDocument();
        });

        it('calls onTacticalMind and shows result after clicking', () => {
            const onTacticalMind = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    tacticalMind={true}
                    onTacticalMind={onTacticalMind}
                />
            );
            fireEvent.click(screen.getByText(/Tactical Mind/));
            expect(onTacticalMind).toHaveBeenCalled();
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('dark ones own luck interaction', () => {
        it('renders button for check rollType', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    darkOnesLuck={true}
                />
            );
            expect(screen.getByText(/Dark One's Own Luck/)).toBeInTheDocument();
        });

        it('renders button for skill rollType', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    darkOnesLuck={true}
                />
            );
            expect(screen.getByText(/Dark One's Own Luck/)).toBeInTheDocument();
        });

        it('renders button for save rollType', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="save"
                    darkOnesLuck={true}
                />
            );
            expect(screen.getByText(/Dark One's Own Luck/)).toBeInTheDocument();
        });

        it('does not render for attack rollType', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    darkOnesLuck={true}
                />
            );
            expect(screen.queryByText(/Dark One's Own Luck/)).not.toBeInTheDocument();
        });

        it('calls onDarkOnesLuck and shows result after clicking', () => {
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
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('superiority maneuver interaction', () => {
        it('renders buttons for each maneuver in the array', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    rollType="attack"
                    availableSuperiorityManeuvers={[{ name: 'Precision Attack' }, { name: 'Trip Attack' }]}
                />
            );
            expect(screen.getByText(/Precision Attack/)).toBeInTheDocument();
            expect(screen.getByText(/Trip Attack/)).toBeInTheDocument();
        });

        it('does not render when maneuvers array is null', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    rollType="attack"
                    availableSuperiorityManeuvers={null}
                />
            );
            expect(screen.queryByText(/Precision Attack/)).not.toBeInTheDocument();
        });

        it('does not render when maneuvers array is empty', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    rollType="attack"
                    availableSuperiorityManeuvers={[]}
                />
            );
            expect(screen.queryByText(/Precision Attack/)).not.toBeInTheDocument();
        });

        it('calls onSuperiorityManeuver with maneuver name and die result after clicking', () => {
            const onSuperiorityManeuver = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    rollType="attack"
                    availableSuperiorityManeuvers={[{ name: 'Precision Attack' }]}
                    onSuperiorityManeuver={onSuperiorityManeuver}
                />
            );
            fireEvent.click(screen.getByText(/Precision Attack/));
            expect(onSuperiorityManeuver).toHaveBeenCalledWith('Precision Attack', expect.any(Number));
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('psi-bolstered knack interaction', () => {
        it('renders button for check rollType', () => {
            render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                />
            );
            expect(screen.getByText(/Psi-Bolstered Knack/)).toBeInTheDocument();
        });

        it('renders button for skill rollType', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                />
            );
            expect(screen.getByText(/Psi-Bolstered Knack/)).toBeInTheDocument();
        });

        it('does not render for attack rollType', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    psiBolsteredKnack={true}
                />
            );
            expect(screen.queryByText(/Psi-Bolstered Knack/)).not.toBeInTheDocument();
        });

        it('shows succeed/failed buttons after clicking psi-bolstered knack', () => {
            const { container } = render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                />
            );
            fireEvent.click(screen.getByText(/Psi-Bolstered Knack/));
            expect(screen.getByText(/Succeeded/)).toBeInTheDocument();
            expect(screen.getByText(/Still Failed/)).toBeInTheDocument();
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });

        it('calls onPsiBolsteredKnack with success: true when succeeded is clicked', () => {
            const onPsiBolsteredKnack = vi.fn();
            render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                    onPsiBolsteredKnack={onPsiBolsteredKnack}
                />
            );
            fireEvent.click(screen.getByText(/Psi-Bolstered Knack/));
            fireEvent.click(screen.getByText(/Succeeded/));
            expect(onPsiBolsteredKnack).toHaveBeenCalledWith({
                dieValue: expect.any(Number),
                dieSize: 6,
                success: true,
            });
        });

        it('calls onPsiBolsteredKnack with success: false when still failed is clicked', () => {
            const onPsiBolsteredKnack = vi.fn();
            render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    psiBolsteredKnack={true}
                    psiBolsteredKnackDieSize={6}
                    onPsiBolsteredKnack={onPsiBolsteredKnack}
                />
            );
            fireEvent.click(screen.getByText(/Psi-Bolstered Knack/));
            fireEvent.click(screen.getByText(/Still Failed/));
            expect(onPsiBolsteredKnack).toHaveBeenCalledWith({
                dieValue: expect.any(Number),
                dieSize: 6,
                success: false,
            });
        });
    });

    describe('bardic inspiration (non-defense/offense) interaction', () => {
        it('renders button for check rollType', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    bardicInspiration={true}
                    bardicInspirationDie="d8"
                />
            );
            expect(screen.getByText(/Bardic Inspiration/)).toBeInTheDocument();
        });

        it('renders button for save rollType', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="save"
                    bardicInspiration={true}
                    bardicInspirationDie="d6"
                />
            );
            expect(screen.getByText(/Bardic Inspiration/)).toBeInTheDocument();
        });

        it('does not render for attack rollType', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="attack"
                    bardicInspiration={true}
                    bardicInspirationDie="d6"
                />
            );
            expect(screen.queryByText(/Bardic Inspiration/)).not.toBeInTheDocument();
        });

        it('calls onBardicInspiration and shows result after clicking', () => {
            const onBardicInspiration = vi.fn();
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    bardicInspiration={true}
                    bardicInspirationDie="d8"
                    onBardicInspiration={onBardicInspiration}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration/));
            expect(onBardicInspiration).toHaveBeenCalled();
            expect(container.querySelector('.dice-roll-reroll-result')).toBeInTheDocument();
        });
    });

    describe('lucky advantage/disadvantage interaction', () => {
        it.each`
            prop                | onProp                | buttonText
            ${'luckyAdvantage'} | ${'onLuckyAdvantage'} | ${'Lucky: Advantage'}
            ${'luckyDisadvantage'} | ${'onLuckyDisadvantage'} | ${'Lucky: Disadvantage'}
        `('renders and calls $buttonText when $prop is true', ({ prop, onProp, buttonText }) => {
            const onCallback = vi.fn();
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[8, 15]}
                    bonus={3}
                    {...{ [prop]: true, [onProp]: onCallback }}
                />
            );
            expect(screen.getByText(new RegExp(`Lucky:.*${buttonText.split(' ').slice(1).join(' ')}`))).toBeInTheDocument();
            fireEvent.click(screen.getByText(new RegExp(`Lucky:.*${buttonText.split(' ').slice(1).join(' ')}`)));
            expect(onCallback).toHaveBeenCalled();
        });

        it('does not render for non-d20 types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    luckyAdvantage={true}
                    luckyDisadvantage={true}
                />
            );
            expect(screen.queryByText(/Lucky: Advantage/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Lucky: Disadvantage/)).not.toBeInTheDocument();
        });
    });

    describe('auto reroll interaction', () => {
        it('renders reroll button when autoReroll is true for d20', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    autoReroll={true}
                />
            );
            expect(screen.getByText(/Reroll/)).toBeInTheDocument();
        });

        it('renders reroll button with bonus text when autoRerollBonus is set', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    autoReroll={true}
                    autoRerollBonus={2}
                />
            );
            expect(screen.getByText(/Reroll \(\+2\)/)).toBeInTheDocument();
        });

        it('does not render for non-d20 types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    autoReroll={true}
                />
            );
            expect(screen.queryByText(/Reroll/)).not.toBeInTheDocument();
        });

        it('does not render when autoRerollCondition is roll_equals_1 regardless of roll value', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[1]}
                    bonus={3}
                    autoReroll={true}
                    autoRerollCondition="roll_equals_1"
                />
            );
            expect(screen.queryByText(/Reroll/)).not.toBeInTheDocument();
        });

        it('calls onReroll callback and shows result div after clicking', () => {
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

    describe('save-damage total hiding', () => {
        it('hides total when type is save-damage and finalDamage is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="save-damage"
                    rolls={[6]}
                    bonus={0}
                    finalDamage={0}
                    damageApplied={true}
                />
            );
            expect(container.querySelector('.dice-roll-total')).not.toBeInTheDocument();
        });

        it('hides total when rollType is save-damage and finalDamage is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    rollType="save-damage"
                    finalDamage={0}
                    damageApplied={true}
                />
            );
            expect(container.querySelector('.dice-roll-total')).not.toBeInTheDocument();
        });

        it('shows total when save-damage has finalDamage > 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="save-damage"
                    rolls={[6]}
                    bonus={0}
                    finalDamage={5}
                    damageApplied={true}
                />
            );
            expect(container.querySelector('.dice-roll-total')).toBeInTheDocument();
        });
    });

    describe('auto crit display', () => {
        it('shows critical hit message for auto crit damage', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    total={15}
                    isAutoCrit={true}
                />
            );
            expect(screen.getByText(/Critical Hit!/)).toBeInTheDocument();
            expect(screen.getByText(/damage dice doubled/)).toBeInTheDocument();
        });
    });

    describe('non-d20 breakdown with crit damage', () => {
        it('shows doubled dice notation for crit damage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    total={15}
                    isCrit={true}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('6*2');
        });

        it('shows crit labels in breakdown when provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Greatsword"
                    type="damage"
                    rolls={[6, 5]}
                    bonus={0}
                    formula="2d6"
                    isCrit={true}
                    rollType="attack"
                    critLabels={['Weapon', 'Divine Smite']}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('6*2 [Weapon]');
            expect(breakdown.textContent).toContain('5*2 [Divine Smite]');
        });
    });
});
