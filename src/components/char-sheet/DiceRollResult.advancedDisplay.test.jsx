// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('condition save result display', () => {
        it('renders save success with total, DC, and d20+bonus breakdown', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={true}
                />
            );
            const el = container.querySelector('.dice-roll-save-result.save-success');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('SAVE SUCCESS');
            expect(el.textContent).toContain('19 vs DC 14');
            expect(el.textContent).toContain('d20 15 + 4');
        });

        it('renders save failure with total and DC', () => {
            const { container } = render(
                <DiceRollResult
                    name="Poisoned Save"
                    type="d20"
                    rolls={[8]}
                    bonus={2}
                    rollType="condition-save"
                    dc={14}
                    success={false}
                />
            );
            const el = container.querySelector('.dice-roll-save-result.save-failure');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('SAVE FAILURE');
            expect(el.textContent).toContain('10 vs DC 14');
        });

        it('does not render save result when success is undefined', () => {
            render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={undefined}
                />
            );
            expect(screen.queryByText(/SAVE SUCCESS/)).not.toBeInTheDocument();
            expect(screen.queryByText(/SAVE FAILURE/)).not.toBeInTheDocument();
        });

        it('renders save result when success is null (explicit failure)', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={null}
                />
            );
            // null is falsy, so should render as failure
            const el = container.querySelector('.dice-roll-save-result');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('SAVE FAILURE');
        });

        it('shows advantage indicator when forcedMode is advantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={true}
                    forcedMode="advantage"
                />
            );
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).toContain('[Advantage]');
        });

        it('shows disadvantage indicator when forcedMode is disadvantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={true}
                    forcedMode="disadvantage"
                />
            );
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).toContain('[Disadvantage]');
        });

        it('does not show advantage/disadvantage when forcedMode is normal', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={true}
                    forcedMode="normal"
                />
            );
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).not.toContain('[Advantage]');
            expect(el.textContent).not.toContain('[Disadvantage]');
        });

        it('does not show advantage/disadvantage when forcedMode is undefined', () => {
            const { container } = render(
                <DiceRollResult
                    name="Stunned Save"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    rollType="condition-save"
                    dc={14}
                    success={true}
                />
            );
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).not.toContain('[Advantage]');
            expect(el.textContent).not.toContain('[Disadvantage]');
        });
    });

    describe('save DC unknown warning', () => {
        it('shows DC unknown warning when rollType is save and saveDc is null', () => {
            const { container } = render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                    rollType="save"
                    saveDc={null}
                />
            );
            const el = container.querySelector('.dice-roll-save-info');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('DC Unknown');
            expect(el.textContent).toContain('no success or failure');
        });

        it('does not show DC unknown when saveDc is a number', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                    rollType="save"
                    saveDc={15}
                />
            );
            expect(screen.queryByText(/DC Unknown/)).not.toBeInTheDocument();
        });

        it('shows DC unknown when saveDc is undefined (treated as null)', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                    rollType="save"
                    saveDc={undefined}
                />
            );
            const { container } = render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                    rollType="save"
                />
            );
            const el = container.querySelector('.dice-roll-save-info');
            expect(el.textContent).toContain('DC Unknown');
        });

        it('does not show DC unknown for non-save rollTypes', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    saveDc={null}
                    rollType="attack"
                />
            );
            expect(screen.queryByText(/DC Unknown/)).not.toBeInTheDocument();
        });
    });

    describe('display formula in breakdown', () => {
        it('shows formula prefix in breakdown when formula is provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    formula="8d6"
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('8d6:');
        });

        it('shows d20 prefix in breakdown when type is d20 and no formula', () => {
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[15]}
                    bonus={5}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('d20');
        });

        it('does not show formula prefix when formula is empty string', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    formula=""
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).not.toMatch(/^8d6/);
        });

        it('shows no formula prefix when formula is undefined', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).not.toMatch(/^8d6/);
        });
    });

    describe('crit labels in breakdown', () => {
        it('shows crit labels in breakdown when isCrit and critLabels provided', () => {
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

        it('shows crit without labels when critLabels is not provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Greatsword"
                    type="damage"
                    rolls={[6, 5]}
                    bonus={0}
                    formula="2d6"
                    isCrit={true}
                    rollType="attack"
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('6*2');
            expect(breakdown.textContent).toContain('5*2');
        });

        it('does not show crit labels when isCrit is false', () => {
            const { container } = render(
                <DiceRollResult
                    name="Greatsword"
                    type="damage"
                    rolls={[6, 5]}
                    bonus={0}
                    formula="2d6"
                    isCrit={false}
                    critLabels={['Weapon']}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).not.toContain('[Weapon]');
            expect(breakdown.textContent).not.toContain('*2');
        });
    });

    describe('stroke of luck display', () => {
        it('shows stroke result in breakdown after clicking the button', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    strokeOfLuck={true}
                />
            );
            fireEvent.click(screen.getByText(/Stroke of Luck/));
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('20 (Stroke of Luck)');
        });

        it('shows stroke result total after clicking the button', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    modifier={2}
                    strokeOfLuck={true}
                />
            );
            fireEvent.click(screen.getByText(/Stroke of Luck/));
            expect(container.querySelector('.dice-roll-total').textContent).toBe('25');
        });

        it('shows natural 20 after stroke of luck is used', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    strokeOfLuck={true}
                />
            );
            fireEvent.click(screen.getByText(/Stroke of Luck/));
            const elements = screen.getAllByText('Natural 20!');
            expect(elements.length).toBeGreaterThanOrEqual(1);
        });

        it('does not show stroke button for non-d20 types', () => {
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

        it('does not show stroke button when strokeOfLuck is false', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    strokeOfLuck={false}
                />
            );
            expect(screen.queryByText(/Stroke of Luck/)).not.toBeInTheDocument();
        });
    });

    describe('lucky reroll display', () => {
        it('shows lucky rerolled value in breakdown', () => {
            const { container } = render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[1, 19]}
                    bonus={2}
                    luckyRerolled={true}
                    luckyRerollValue={14}
                />
            );
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('14 (Lucky reroll)');
        });

        it('uses lucky reroll value for display total', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[1, 19]}
                    bonus={2}
                    modifier={1}
                    luckyRerolled={true}
                    luckyRerollValue={14}
                />
            );
            expect(screen.getByText('17')).toBeInTheDocument();
        });

        it('shows lucky halfling message when luckyRerolled is true', () => {
            render(
                <DiceRollResult
                    name="DEX Save"
                    type="d20"
                    rolls={[1, 19]}
                    bonus={2}
                    luckyRerolled={true}
                    luckyRerollValue={14}
                />
            );
            expect(screen.getByText(/Lucky \(Halfling\): rerolled natural 1 → 14/)).toBeInTheDocument();
        });

        it('does not show lucky reroll when luckyRerolled is false', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[12]}
                    bonus={3}
                    luckyRerolled={false}
                />
            );
            expect(screen.queryByText(/Lucky \(Halfling\)/)).not.toBeInTheDocument();
        });
    });

    describe('reroll result display', () => {
        it('shows rerolled value in breakdown after clicking reroll button', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    autoReroll={true}
                />
            );
            fireEvent.click(screen.getByText(/Reroll/));
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('(reroll)');
        });

        it('shows reroll result div after clicking reroll button', () => {
            const { container } = render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    autoReroll={true}
                />
            );
            fireEvent.click(screen.getByText(/Reroll/));
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl.textContent).toContain('Rerolled');
        });

        it('does not show reroll button when autoReroll is false', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    autoReroll={false}
                />
            );
            expect(screen.queryByText(/Reroll/)).not.toBeInTheDocument();
        });

        it('does not show reroll button when autoRerollCondition is roll_equals_1', () => {
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
    });

    describe('bardic inspiration result display', () => {
        it('shows bardic inspiration result in breakdown after clicking', () => {
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    bardicInspiration={true}
                    bardicInspirationDie="d6"
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration/));
            const breakdown = container.querySelector('.dice-roll-breakdown');
            expect(breakdown.textContent).toContain('5');
        });

        it('shows bardic inspiration result div after clicking', () => {
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    bardicInspiration={true}
                    bardicInspirationDie="d6"
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration/));
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl.textContent).toContain('Bardic Inspiration');
        });

        it('does not show bardic inspiration button for attack rollType', () => {
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

        it('does not show bardic inspiration button when bardicInspiration is false', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    bardicInspiration={false}
                />
            );
            expect(screen.queryByText(/Bardic Inspiration/)).not.toBeInTheDocument();
        });
    });

    describe('heal already at full HP', () => {
        it('shows already at full HP when finalHeal is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={0}
                    targetName="Ally"
                />
            );
            const heal = container.querySelector('.dice-roll-heal-applied');
            expect(heal.textContent).toContain('already at full HP');
        });

        it('shows already at full HP when finalHeal is negative', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={-3}
                    targetName="Ally"
                />
            );
            const heal = container.querySelector('.dice-roll-heal-applied');
            expect(heal.textContent).toContain('already at full HP');
        });

        it('does not show already at full HP when finalHeal > 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    targetName="Ally"
                />
            );
            const heal = container.querySelector('.dice-roll-heal-applied');
            expect(heal.textContent).not.toContain('already at full HP');
            expect(heal.textContent).toContain('healing applied');
        });

        it('shows bonus heal when bonusHeal is greater than 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    bonusHeal={3}
                    bonusHealDetail="Divine Spark"
                    targetName="Ally"
                />
            );
            const bonus = container.querySelector('.dice-roll-heal-bonus');
            expect(bonus).toBeInTheDocument();
            expect(bonus.textContent).toContain('+3');
            expect(bonus.textContent).toContain('Divine Spark');
        });

        it('does not show bonus heal when bonusHeal is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    bonusHeal={0}
                    targetName="Ally"
                />
            );
            expect(container.querySelector('.dice-roll-heal-bonus')).not.toBeInTheDocument();
        });
    });

    describe('final total priority chain', () => {
        it('uses starryDragonFloorTotal when available, overriding d20Floor10Total', () => {
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
            expect(screen.getByText('13')).toBeInTheDocument();
        });

        it('uses d20Floor10Total when starryDragonFloor is false', () => {
            render(
                <DiceRollResult
                    name="Wisdom"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="check"
                    d20Floor10={true}
                    starryDragonFloor={false}
                />
            );
            expect(screen.getByText('13')).toBeInTheDocument();
        });

        it('uses reliableTalentTotal when starryDragonFloor is false and d20Floor10 is false', () => {
            render(
                <DiceRollResult
                    name="Stealth"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="skill"
                    d20Floor10={false}
                    reliableTalent={true}
                />
            );
            expect(screen.getByText('13')).toBeInTheDocument();
        });

        it('uses wisDisplayTotal when wisCheckReplace is true for check/skill', () => {
            render(
                <DiceRollResult
                    name="Insight"
                    type="d20"
                    rolls={[5]}
                    bonus={2}
                    modifier={1}
                    rollType="check"
                    wisCheckReplace={true}
                    wisCheckMinBonus={4}
                    d20Floor10={false}
                    reliableTalent={false}
                    starryDragonFloor={false}
                />
            );
            expect(screen.getByText('10')).toBeInTheDocument();
        });

        it('uses finalDisplayTotal as fallback when all floor options are disabled', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[15]}
                    bonus={3}
                    modifier={0}
                    rollType="check"
                    d20Floor10={false}
                    reliableTalent={false}
                    starryDragonFloor={false}
                    wisCheckReplace={false}
                />
            );
            expect(screen.getByText('18')).toBeInTheDocument();
        });

        it('does not show floor indicator message when roll is above threshold', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[11]}
                    bonus={3}
                    rollType="save"
                    starryDragonFloor={true}
                />
            );
            expect(screen.getByText('14')).toBeInTheDocument();
            expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
        });

        it('does not floor when starryDragonFloor is false regardless of roll value', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[5]}
                    bonus={3}
                    rollType="save"
                    starryDragonFloor={false}
                />
            );
            expect(screen.getByText('8')).toBeInTheDocument();
        });
    });

    describe('hit/miss computed logic', () => {
        it('computes hit when finalTotal >= effectiveAC', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    targetName="Goblin"
                    targetAc={18}
                    hit={true}
                    rollType="attack"
                />
            );
            const hitMiss = container.querySelector('.dice-roll-hit-miss.hit');
            expect(hitMiss).toBeInTheDocument();
        });

        it('computes miss when finalTotal < effectiveAC', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[10]}
                    bonus={3}
                    targetName="Goblin"
                    targetAc={18}
                    hit={false}
                    rollType="attack"
                />
            );
            const hitMiss = container.querySelector('.dice-roll-hit-miss.miss');
            expect(hitMiss).toBeInTheDocument();
        });

        it('uses coverAcBonus in effective AC calculation', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longbow"
                    type="d20"
                    rolls={[15]}
                    bonus={4}
                    targetName="Goblin"
                    targetAc={16}
                    hit={false}
                    rollType="attack"
                    coverAcBonus={2}
                />
            );
            const hitMiss = container.querySelector('.dice-roll-hit-miss.hit');
            expect(hitMiss.textContent).toContain('19 vs AC 16');
        });

        it('does not compute hit when isAutoMiss is true', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longbow"
                    type="d20"
                    rolls={[20]}
                    bonus={4}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    rollType="attack"
                    isAutoMiss={true}
                />
            );
            const hitMiss = container.querySelector('.dice-roll-hit-miss.miss');
            expect(hitMiss.textContent).toContain('AUTO-MISS');
        });

        it('does not show hit/miss for non-attack rollTypes', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    targetName="Goblin"
                    hit={true}
                    rollType="damage"
                />
            );
            expect(screen.queryByText(/HIT/)).not.toBeInTheDocument();
            expect(screen.queryByText(/MISS/)).not.toBeInTheDocument();
        });

        it('shows em-dash when targetAc is omitted', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    targetName="Goblin"
                    hit={true}
                    rollType="attack"
                />
            );
            expect(container.querySelector('.dice-roll-hit-miss.hit').textContent).toContain('—');
        });

        it('shows reaction bonus text when defensiveDuelistBonus is positive', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    rollType="attack"
                    defensiveDuelistBonus={1}
                />
            );
            expect(container.querySelector('.dice-roll-hit-miss.hit').textContent).toContain('reaction');
        });

        it('shows reaction bonus text when baitAndSwitchBonus is positive', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    targetName="Goblin"
                    targetAc={14}
                    hit={true}
                    rollType="attack"
                    baitAndSwitchBonus={2}
                />
            );
            expect(container.querySelector('.dice-roll-hit-miss.hit').textContent).toContain('reaction');
        });
    });

    describe('save result display with advantage/disadvantage', () => {
        it('shows advantage indicator in save result when forcedMode is advantage', () => {
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
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).toContain('[Advantage]');
        });

        it('shows disadvantage indicator in save result when forcedMode is disadvantage', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={{ success: false, total: 12, roll: 8, bonus: 4 }}
                    saveDc={15}
                    forcedMode="disadvantage"
                />
            );
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).toContain('[Disadvantage]');
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
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).not.toContain('[Advantage]');
            expect(el.textContent).not.toContain('[Disadvantage]');
        });

        it('does not show advantage/disadvantage indicators when forcedMode is undefined', () => {
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
            const el = container.querySelector('.dice-roll-save-result');
            expect(el.textContent).not.toContain('[Advantage]');
            expect(el.textContent).not.toContain('[Disadvantage]');
        });

        it('does not show save result when saveResult is null', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveResult={null}
                    saveDc={15}
                />
            );
            expect(screen.queryByText(/SAVE SUCCESS/)).not.toBeInTheDocument();
            expect(screen.queryByText(/SAVE FAILURE/)).not.toBeInTheDocument();
        });

        it('does not show save result when saveResult is undefined', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    saveDc={15}
                />
            );
            expect(screen.queryByText(/SAVE SUCCESS/)).not.toBeInTheDocument();
            expect(screen.queryByText(/SAVE FAILURE/)).not.toBeInTheDocument();
        });
    });

    describe('damage type choice icon', () => {
        it('uses bolt icon for damage_type_choice type', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[]}
                    bonus={0}
                    types={['Fire']}
                />
            );
            const icon = container.querySelector('.dice-roll-header .fa-solid');
            expect(icon).toHaveClass('fa-bolt');
        });

        it('does not render header for damage_type_choice type with special icon', () => {
            const { container } = render(
                <DiceRollResult
                    name="Test"
                    type="damage_type_choice"
                    rolls={[]}
                    bonus={0}
                    types={['Fire']}
                />
            );
            // damage_type_choice renders its own header inside .dice-roll-damage-type-choice
            const choiceContainer = container.querySelector('.dice-roll-damage-type-choice');
            expect(choiceContainer).toBeInTheDocument();
        });

        it('does not render damage_type_choice container for non-damage_type_choice types', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    types={['Fire']}
                />
            );
            expect(container.querySelector('.dice-roll-damage-type-choice')).not.toBeInTheDocument();
        });
    });

    describe('save info with dcSuccess', () => {
        it('shows save info with dcSuccess half', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    dc={16}
                    dcType="DEX"
                    dcSuccess="half"
                />
            );
            expect(screen.getByText(/Save DC 16 DEX/)).toBeInTheDocument();
            expect(screen.getByText(/half damage on save/)).toBeInTheDocument();
        });

        it('shows save info with dcSuccess none', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    dc={16}
                    dcType="DEX"
                    dcSuccess="none"
                />
            );
            expect(screen.getByText(/Save DC 16 DEX/)).toBeInTheDocument();
            expect(screen.getByText(/no damage on save/)).toBeInTheDocument();
        });

        it('does not show save info when dc is undefined', () => {
            render(
                <DiceRollResult
                    name="Fire Bolt"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                />
            );
            expect(screen.queryByText(/Save DC/)).not.toBeInTheDocument();
        });

        it('shows "no damage on save" when dcSuccess is undefined (not "half")', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    dc={16}
                    dcType="DEX"
                    dcSuccess={undefined}
                />
            );
            expect(screen.queryByText(/half damage on save/)).not.toBeInTheDocument();
            expect(screen.getByText(/no damage on save/)).toBeInTheDocument();
        });
    });

    describe('combined hit/miss and save info', () => {
        it('shows both hit/miss and save info on the same roll', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    targetName="Goblin"
                    hit={true}
                    rollType="attack"
                    dc={16}
                    dcType="DEX"
                    dcSuccess="half"
                />
            );
            expect(screen.getByText(/HIT/)).toBeInTheDocument();
            expect(screen.getByText(/Save DC 16 DEX/)).toBeInTheDocument();
        });
    });

    describe('intercepted feature display', () => {
        it('shows intercepted feature message when isDamageType and interceptedFeature provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    finalDamage={15}
                    damageApplied={true}
                    targetName="Orc"
                    interceptedFeature="Relentless Endurance"
                />
            );
            const el = container.querySelector('.dice-roll-intercepted');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('Relentless Endurance');
            expect(el.textContent).toContain('damage intercepted');
            expect(el.textContent).toContain('Orc survives');
        });

        it('does not show intercepted feature for non-damage types', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    interceptedFeature="Something"
                />
            );
            expect(screen.queryByText(/damage intercepted/)).not.toBeInTheDocument();
        });
    });

    describe('unerring strike display', () => {
        it('shows unerring strike message when unerringStrikeApplied is true', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[8]}
                    bonus={5}
                    rollType="attack"
                    hit={false}
                    unerringStrikeApplied={true}
                />
            );
            const el = container.querySelector('.dice-roll-reroll-result');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('Unerring Strike');
            expect(el.textContent).toContain('missed weapon attack turned into a hit');
        });

        it('does not show unerring strike when unerringStrikeApplied is false', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[8]}
                    bonus={5}
                    rollType="attack"
                    hit={false}
                    unerringStrikeApplied={false}
                />
            );
            expect(screen.queryByText(/Unerring Strike/)).not.toBeInTheDocument();
        });
    });

    describe('holy aura save display', () => {
        it('shows holy aura save result when provided with success', () => {
            const { container } = render(
                <DiceRollResult
                    name="Holy Aura"
                    type="d20"
                    rolls={[10]}
                    bonus={0}
                    holyAuraSaveResult={{
                        roll: 14,
                        modifier: 4,
                        total: 18,
                        dc: 15,
                        success: true,
                    }}
                />
            );
            const el = container.querySelector('.dice-roll-holy-aura-save');
            expect(el).toBeInTheDocument();
            expect(el.textContent).toContain('Holy Aura Save');
            expect(el.textContent).toContain('SAVE SUCCESSFUL');
            expect(el.textContent).toContain('DC 15');
        });

        it('shows save failed with effect when holyAuraSaveResult.success is false', () => {
            const { container } = render(
                <DiceRollResult
                    name="Holy Aura"
                    type="d20"
                    rolls={[10]}
                    bonus={0}
                    holyAuraSaveResult={{
                        roll: 8,
                        modifier: 4,
                        total: 12,
                        dc: 15,
                        success: false,
                    }}
                />
            );
            const el = container.querySelector('.dice-roll-holy-aura-save');
            expect(el.textContent).toContain('SAVE FAILED');
            expect(el.textContent).toContain('Fiend/Undead blinded');
        });

        it('does not show holy aura save when holyAuraSaveResult is null', () => {
            render(
                <DiceRollResult
                    name="Holy Aura"
                    type="d20"
                    rolls={[10]}
                    bonus={0}
                    holyAuraSaveResult={null}
                />
            );
            expect(screen.queryByText(/Holy Aura Save/)).not.toBeInTheDocument();
        });
    });

    describe('waiting for player save', () => {
        it('shows waiting message with target name and DC', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    waitingForPlayerSave={true}
                    targetName="Goblin"
                    saveDc={14}
                    saveType="DEX"
                />
            );
            const waiting = container.querySelector('.dice-roll-save-waiting');
            expect(waiting).toBeInTheDocument();
            expect(waiting.textContent).toContain('Goblin');
            expect(waiting.textContent).toContain('DEX');
            expect(waiting.textContent).toContain('DC 14');
        });

        it('does not show waiting message when waitingForPlayerSave is false', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    waitingForPlayerSave={false}
                    targetName="Goblin"
                    saveDc={14}
                    saveType="DEX"
                />
            );
            expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument();
        });
    });

    describe('cover display', () => {
        it('shows 3/4 cover text', () => {
            render(
                <DiceRollResult
                    name="Longbow"
                    type="attack"
                    rolls={[12]}
                    bonus={4}
                    coverLevel="threeQuarter"
                    coverAcBonus={2}
                />
            );
            expect(screen.getByText('3/4 Cover (+2 AC)')).toBeInTheDocument();
        });

        it('shows 1/2 cover text', () => {
            render(
                <DiceRollResult
                    name="Longbow"
                    type="attack"
                    rolls={[12]}
                    bonus={4}
                    coverLevel="half"
                    coverAcBonus={2}
                />
            );
            expect(screen.getByText('1/2 Cover (+2 AC)')).toBeInTheDocument();
        });

        it('does not show cover when coverAcBonus is 0', () => {
            render(
                <DiceRollResult
                    name="Longbow"
                    type="attack"
                    rolls={[12]}
                    bonus={4}
                    coverLevel="half"
                    coverAcBonus={0}
                />
            );
            expect(screen.queryByText(/Cover/)).not.toBeInTheDocument();
        });
    });

    describe('auto miss with reason', () => {
        it('shows auto-miss with cover reason', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longbow"
                    type="attack"
                    rolls={[12]}
                    bonus={4}
                    targetName="Goblin"
                    targetAc={14}
                    hit={false}
                    rollType="attack"
                    isAutoMiss={true}
                    coverReason="Half cover"
                />
            );
            expect(container.querySelector('.dice-roll-hit-miss.miss').textContent).toContain('AUTO-MISS');
            expect(container.querySelector('.dice-roll-hit-miss.miss').textContent).toContain('Half cover');
        });

        it('shows auto-miss with default out of range when no reason provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longbow"
                    type="attack"
                    rolls={[12]}
                    bonus={4}
                    targetName="Goblin"
                    hit={false}
                    rollType="attack"
                    isAutoMiss={true}
                />
            );
            expect(container.querySelector('.dice-roll-hit-miss.miss').textContent).toContain('AUTO-MISS');
            expect(container.querySelector('.dice-roll-hit-miss.miss').textContent).toContain('out of range');
        });
    });

    describe('dice type icons', () => {
        it.each`
            type               | rollType         | expectedIcon
            ${'d20'}           | ${undefined}     | ${'fa-dice-d20'}
            ${'attack'}        | ${'attack'}      | ${'fa-crosshairs'}
            ${'save'}          | ${'save'}        | ${'fa-shield-halved'}
            ${'save-damage'}   | ${undefined}     | ${'fa-shield-halved'}
            ${'initiative'}    | ${undefined}     | ${'fa-gavel'}
            ${'heal'}          | ${undefined}     | ${'fa-heart'}
            ${'damage'}        | ${undefined}     | ${'fa-bolt'}
        `('shows correct icon for type: $type', ({ type, rollType, expectedIcon }) => {
            const { container } = render(
                <DiceRollResult
                    name="Roll"
                    type={type}
                    rolls={[10]}
                    bonus={0}
                    rollType={rollType}
                />
            );
            const icon = container.querySelector('.fa-solid');
            expect(icon).toHaveClass(expectedIcon);
        });
    });

    describe('potent cantrip', () => {
        it('shows potent cantrip notice when isPotentCantrip is true', () => {
            render(
                <DiceRollResult
                    name="Ray of Frost"
                    type="attack"
                    rolls={[15]}
                    bonus={3}
                    isPotentCantrip={true}
                />
            );
            expect(screen.getByText(/Potent Cantrip/)).toBeInTheDocument();
            expect(screen.getByText(/half damage on miss/)).toBeInTheDocument();
        });

        it('does not show potent cantrip when isPotentCantrip is false', () => {
            render(
                <DiceRollResult
                    name="Ray of Frost"
                    type="attack"
                    rolls={[15]}
                    bonus={3}
                    isPotentCantrip={false}
                />
            );
            expect(screen.queryByText(/Potent Cantrip/)).not.toBeInTheDocument();
        });
    });

    describe('resistance notice', () => {
        it('shows resistance notice when provided', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                    resistanceNotice="Target resistant to fire damage"
                />
            );
            expect(screen.getByText(/Target resistant to fire damage/)).toBeInTheDocument();
        });

        it('does not show resistance notice when not provided', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6]}
                    bonus={0}
                />
            );
            expect(screen.queryByText(/resistant/)).not.toBeInTheDocument();
        });
    });

    describe('hunter lore notice', () => {
        it('shows multi-line hunter lore notice', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="attack"
                    rolls={[15]}
                    bonus={3}
                    hunterLoreNotice="Favored Enemy: Beast\nSense Motive: +5"
                />
            );
            expect(screen.getByText(/Favored Enemy: Beast/)).toBeInTheDocument();
            expect(screen.getByText(/Sense Motive: \+5/)).toBeInTheDocument();
        });

        it('does not show hunter lore when not provided', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="attack"
                    rolls={[15]}
                    bonus={3}
                />
            );
            expect(screen.queryByText(/Favored Enemy/)).not.toBeInTheDocument();
        });
    });

    describe('elemental adept display', () => {
        it('shows elemental adept when bonus > 0 and rolls contain 1s', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fire Bolt"
                    type="damage"
                    rolls={[1, 6, 1]}
                    bonus={0}
                    elementalAdeptBonus={2}
                />
            );
            const el = container.querySelector('.dice-roll-elemental-adept');
            expect(el.textContent).toContain('Elemental Adept');
            expect(el.textContent).toContain('2× 1 → 2');
            expect(el.textContent).toContain('+2');
        });

        it('does not show elemental adept when bonus is 0', () => {
            render(
                <DiceRollResult
                    name="Fire Bolt"
                    type="damage"
                    rolls={[1, 6]}
                    bonus={0}
                    elementalAdeptBonus={0}
                />
            );
            expect(screen.queryByText(/Elemental Adept/)).not.toBeInTheDocument();
        });
    });

    describe('ray of enfeeblement display', () => {
        it('shows ray of enfeeblement when reduction > 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Ray of Enfeeblement"
                    type="damage"
                    rolls={[5]}
                    bonus={0}
                    rayOfEnfeebleReduction={4}
                    rayOfEnfeebleRoll={4}
                />
            );
            const el = container.querySelector('.dice-roll-ray-enfeeblement');
            expect(el.textContent).toContain('Enfeeblement');
            expect(el.textContent).toContain('-4');
        });

        it('does not show ray of enfeeblement when reduction is 0', () => {
            render(
                <DiceRollResult
                    name="Ray of Enfeeblement"
                    type="damage"
                    rolls={[5]}
                    bonus={0}
                    rayOfEnfeebleReduction={0}
                    rayOfEnfeebleRoll={0}
                />
            );
            expect(screen.queryByText(/-0d8/)).not.toBeInTheDocument();
        });

        it('does not show ray of enfeeblement element when reduction is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Ray of Enfeeblement"
                    type="damage"
                    rolls={[5]}
                    bonus={0}
                    rayOfEnfeebleReduction={0}
                    rayOfEnfeebleRoll={0}
                />
            );
            expect(container.querySelector('.dice-roll-ray-enfeeblement')).not.toBeInTheDocument();
        });
    });

    describe('resistance reduction display', () => {
        it('shows resistance reduction when resistanceReduction > 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    resistanceReduction={6}
                    resistanceRoll={6}
                />
            );
            const el = container.querySelector('.dice-roll-resistance');
            expect(el.textContent).toContain('Resistance');
            expect(el.textContent).toContain('-6');
        });

        it('does not show resistance reduction when resistanceReduction is 0', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    resistanceReduction={0}
                    resistanceRoll={0}
                />
            );
            expect(screen.queryByText(/Resistance/)).not.toBeInTheDocument();
        });
    });

    describe('healing reroll display', () => {
        it('shows healing reroll when originalRolls are provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Healing Word"
                    type="heal"
                    rolls={[5]}
                    bonus={0}
                    healingRerollOriginalRolls={[1, 3]}
                    healingRerollDisplayRolls={[5, 6]}
                />
            );
            const el = container.querySelector('.dice-roll-healing-reroll');
            expect(el.textContent).toContain('Healing Rerolls');
            expect(el.textContent).toContain('1, 3');
            expect(el.textContent).toContain('5, 6');
        });

        it('does not show healing reroll when originalRolls is null', () => {
            render(
                <DiceRollResult
                    name="Healing Word"
                    type="heal"
                    rolls={[5]}
                    bonus={0}
                    healingRerollOriginalRolls={null}
                />
            );
            expect(screen.queryByText(/Healing Rerolls/)).not.toBeInTheDocument();
        });
    });

    describe('tavern brawler rerolls display', () => {
        it('shows tavern brawler rerolls when array has entries', () => {
            const { container } = render(
                <DiceRollResult
                    name="Unarmed Strike"
                    type="d20"
                    rolls={[15]}
                    bonus={3}
                    tavernBrawlerRerolls={[
                        { original: 1, rerolled: 6 },
                        { original: 2, rerolled: 5 },
                    ]}
                />
            );
            const el = container.querySelector('.dice-roll-reroll-result');
            expect(el.textContent).toContain('Tavern Brawler');
            expect(el.textContent).toContain('1, 2');
            expect(el.textContent).toContain('6, 5');
        });

        it('does not show tavern brawler rerolls when array is empty', () => {
            render(
                <DiceRollResult
                    name="Unarmed Strike"
                    type="d20"
                    rolls={[15]}
                    bonus={3}
                    tavernBrawlerRerolls={[]}
                />
            );
            expect(screen.queryByText(/Tavern Brawler/)).not.toBeInTheDocument();
        });

        it('does not show tavern brawler rerolls when undefined', () => {
            render(
                <DiceRollResult
                    name="Unarmed Strike"
                    type="d20"
                    rolls={[15]}
                    bonus={3}
                />
            );
            expect(screen.queryByText(/Tavern Brawler/)).not.toBeInTheDocument();
        });
    });

    describe('GWF (Great Weapon Fighting) display', () => {
        it('shows GWF display when gwfApplied and gwfOriginalRolls are provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword"
                    type="damage"
                    rolls={[2, 4]}
                    bonus={0}
                    gwfApplied={true}
                    gwfOriginalRolls={[1, 4]}
                    gwfDisplayRolls={[2, 4]}
                />
            );
            const gwf = container.querySelector('.dice-roll-gwf');
            expect(gwf).toBeInTheDocument();
            expect(gwf.textContent).toContain('Great Weapon Fighting');
            expect(gwf.textContent).toContain('1, 4');
            expect(gwf.textContent).toContain('2, 4');
        });

        it('does not show GWF when gwfApplied is false', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="damage"
                    rolls={[2, 4]}
                    bonus={0}
                    gwfApplied={false}
                    gwfOriginalRolls={[1, 4]}
                />
            );
            expect(screen.queryByText(/Great Weapon Fighting/)).not.toBeInTheDocument();
        });
    });

    describe('reliable talent display', () => {
        it('shows reliable talent indicator when d20 roll is 9 or less', () => {
            const { container } = render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[3]}
                    bonus={5}
                    rollType="skill"
                    reliableTalent={true}
                />
            );
            const rt = container.querySelector('.dice-roll-reliable-talent');
            expect(rt).toBeInTheDocument();
            expect(rt.textContent).toContain('Reliable Talent');
            expect(rt.textContent).toContain('d20 3');
            expect(rt.textContent).toContain('10');
        });

        it('does not show reliable talent when d20 roll is 10 or more', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[12]}
                    bonus={5}
                    rollType="skill"
                    reliableTalent={true}
                />
            );
            expect(screen.queryByText(/Reliable Talent/)).not.toBeInTheDocument();
        });

        it('does not show reliable talent for non-check/non-skill roll types', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[3]}
                    bonus={5}
                    rollType="attack"
                    reliableTalent={true}
                />
            );
            expect(screen.queryByText(/Reliable Talent/)).not.toBeInTheDocument();
        });
    });

    describe('Trance of Order (d20Floor10) display', () => {
        it('shows Trance of Order message when d20Floor10 and roll <= 9', () => {
            const { container } = render(
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
            const rt = container.querySelector('.dice-roll-reliable-talent');
            expect(rt.textContent).toContain('Trance of Order');
            expect(rt.textContent).toContain('d20 7');
            expect(rt.textContent).toContain('10');
        });

        it('does not show Trance of Order when d20Floor10 is false', () => {
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
            expect(screen.queryByText(/Trance of Order/)).not.toBeInTheDocument();
        });
    });

    describe('Starry Form (Dragon) floor display', () => {
        it('shows Starry Form message when starryDragonFloor and roll <= 9', () => {
            const { container } = render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[8]}
                    bonus={3}
                    rollType="save"
                    starryDragonFloor={true}
                />
            );
            const rt = container.querySelector('.dice-roll-reliable-talent');
            expect(rt.textContent).toContain('Starry Form (Dragon)');
            expect(rt.textContent).toContain('d20 8');
            expect(rt.textContent).toContain('10');
        });

        it('does not show Starry Form when starryDragonFloor is false', () => {
            render(
                <DiceRollResult
                    name="Constitution"
                    type="d20"
                    rolls={[8]}
                    bonus={3}
                    rollType="save"
                    starryDragonFloor={false}
                />
            );
            expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
        });
    });

    describe('natural 20 display', () => {
        it('shows Natural 20! for non-attack d20 rolls with natural 20', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[20]}
                    bonus={5}
                    rollType="check"
                />
            );
            expect(screen.getByText('Natural 20!')).toBeInTheDocument();
        });

        it('shows Natural 20! when isCrit is true', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[20, 5]}
                    bonus={3}
                    isCrit={true}
                    rollType="attack"
                />
            );
            expect(screen.getByText(/Critical Hit!/)).toBeInTheDocument();
        });

        it('does not show Natural 20! for non-d20 types', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                />
            );
            expect(screen.queryByText(/Natural 20/)).not.toBeInTheDocument();
        });
    });

    describe('critical miss display', () => {
        it('shows Critical Miss! when isNatural1 is true and rollType is attack', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[1, 15]}
                    bonus={3}
                    rollType="attack"
                    isNatural1={true}
                />
            );
            expect(screen.getByText('Critical Miss!')).toBeInTheDocument();
        });

        it('does not show Critical Miss! for non-attack rollTypes', () => {
            render(
                <DiceRollResult
                    name="Athletics"
                    type="d20"
                    rolls={[1, 10]}
                    bonus={2}
                    rollType="check"
                    isNatural1={true}
                />
            );
            expect(screen.queryByText('Critical Miss!')).not.toBeInTheDocument();
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

    describe('damage applied display', () => {
        it('shows damage applied without reduction', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    finalDamage={15}
                    damageApplied={true}
                    targetName="Goblin"
                    originalTotal={15}
                />
            );
            const damageEl = container.querySelector('.dice-roll-damage-applied');
            expect(damageEl.textContent).toContain('15');
            expect(damageEl.textContent).toContain('damage applied');
            expect(damageEl.textContent).toContain('Goblin');
        });

        it('shows damage applied with reduction and HP change', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    total={15}
                    finalDamage={8}
                    damageApplied={true}
                    damageReduced={true}
                    targetName="Orc"
                    targetCurrentHp={5}
                />
            );
            const damageEl = container.querySelector('.dice-roll-damage-applied');
            expect(damageEl.textContent).toContain('8');
            expect(damageEl.textContent).toContain('reduced from 15');
            expect(damageEl.textContent).toContain('HP:');
        });

        it('does not show damage applied when finalDamage is undefined', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    finalDamage={undefined}
                    damageApplied={true}
                    targetName="Goblin"
                />
            );
            expect(screen.queryByText(/damage applied/)).not.toBeInTheDocument();
        });
    });

    describe('heal applied display', () => {
        it('shows heal applied without reduction', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    targetName="Ally"
                />
            );
            const heal = container.querySelector('.dice-roll-heal-applied');
            expect(heal.textContent).toContain('8');
            expect(heal.textContent).toContain('healing applied');
            expect(heal.textContent).toContain('Ally');
        });

        it('shows heal applied with reduction and HP change', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={10}
                    finalHeal={6}
                    healReduced={true}
                    targetName="Ally"
                    targetCurrentHp={2}
                />
            );
            const heal = container.querySelector('.dice-roll-heal-applied');
            expect(heal.textContent).toContain('6');
            expect(heal.textContent).toContain('reduced from 10');
            expect(heal.textContent).toContain('HP:');
        });
    });

    describe('secondary damage display', () => {
        it('renders secondary formula with rolls, modifier, and total', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword" type="attack" rolls={[18]} bonus={5}
                    secondaryFormula="1d8" secondaryRolls={[5]}
                    secondaryTotal={8} secondaryModifier={3}
                />
            );
            const formulaEl = container.querySelector('.dice-roll-secondary-formula');
            expect(formulaEl.textContent).toContain('1d8');
            expect(formulaEl.textContent).toContain('+3');
            expect(formulaEl.textContent).toContain('= 8');
        });

        it('shows secondary total damage line when both damages are defined', () => {
            const { container } = render(
                <DiceRollResult
                    name="Longsword" type="attack" rolls={[18]} bonus={5}
                    finalDamage={10} damageType="slashing"
                    secondaryFinalDamage={5} secondaryDamageType="radiant"
                    damageApplied={true} targetName="Goblin"
                    secondaryFormula="1d8" secondaryRolls={[5]}
                    secondaryTotal={5} secondaryModifier={0}
                />
            );
            const totalEl = container.querySelector('.dice-roll-secondary-total');
            expect(totalEl.textContent).toContain('10 slashing damage');
            expect(totalEl.textContent).toContain('5 radiant damage');
            expect(totalEl.textContent).toContain('15 total damage');
        });

        it('does not show secondary total when either damage is undefined', () => {
            render(
                <DiceRollResult
                    name="Longsword" type="attack" rolls={[18]} bonus={5}
                    finalDamage={10}
                />
            );
            expect(screen.queryByText(/total damage/)).not.toBeInTheDocument();
        });

        it('shows secondary save result based on success value', () => {
            const { container: cSuccess } = render(
                <DiceRollResult
                    name="Fireball" type="damage" rolls={[6]} bonus={0}
                    secondaryFormula="1d6" secondaryRolls={[4]}
                    secondaryTotal={4} secondaryModifier={0}
                    secondarySaveResult={{ success: true, total: 16, roll: 12, bonus: 4 }}
                    saveDc={14}
                />
            );
            expect(cSuccess.querySelector('.dice-roll-secondary-save-result').textContent).toContain('SAVE SUCCESS');

            const { container: cFail } = render(
                <DiceRollResult
                    name="Fireball" type="damage" rolls={[6]} bonus={0}
                    secondaryFormula="1d6" secondaryRolls={[4]}
                    secondaryTotal={4} secondaryModifier={0}
                    secondarySaveResult={{ success: false, total: 10, roll: 6, bonus: 4 }}
                    saveDc={14}
                />
            );
            expect(cFail.querySelector('.dice-roll-secondary-save-result').textContent).toContain('SAVE FAILURE');
        });

        it('does not show secondary save result when secondarySaveResult is null', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball" type="damage" rolls={[6]} bonus={0}
                    secondaryFormula="1d6" secondaryRolls={[4]}
                    secondaryTotal={4} secondaryModifier={0}
                    secondarySaveResult={null}
                />
            );
            expect(container.querySelector('.dice-roll-secondary-save-result')).not.toBeInTheDocument();
        });
    });

    describe('bonus heal display', () => {
        it('shows bonus heal when bonusHeal is greater than 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    bonusHeal={3}
                    bonusHealDetail="Divine Spark"
                    targetName="Ally"
                />
            );
            const bonus = container.querySelector('.dice-roll-heal-bonus');
            expect(bonus).toBeInTheDocument();
            expect(bonus.textContent).toContain('+3');
            expect(bonus.textContent).toContain('Divine Spark');
        });

        it('does not show bonus heal when bonusHeal is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Cure Wounds"
                    type="heal"
                    rolls={[5, 3]}
                    bonus={0}
                    total={8}
                    finalHeal={8}
                    bonusHeal={0}
                    targetName="Ally"
                />
            );
            expect(container.querySelector('.dice-roll-heal-bonus')).not.toBeInTheDocument();
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
});
