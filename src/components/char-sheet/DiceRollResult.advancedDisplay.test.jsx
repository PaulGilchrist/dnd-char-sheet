import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('condition save result', () => {
        it('shows condition save success when rollType is condition-save and success is true', () => {
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
            expect(el.textContent).toContain('SAVE SUCCESS');
            expect(el.textContent).toContain('19 vs DC 14');
            expect(el.textContent).toContain('d20 15 + 4');
        });

        it('shows condition save failure when rollType is condition-save and success is false', () => {
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
            expect(el.textContent).toContain('SAVE FAILURE');
            expect(el.textContent).toContain('10 vs DC 14');
        });

        it('does not show condition save result when success is undefined', () => {
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

        it('shows advantage indicator when mode is advantage', () => {
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

        it('shows disadvantage indicator when mode is disadvantage', () => {
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
            expect(el.textContent).toContain('DC Unknown');
            expect(el.textContent).toContain('no success or failure');
        });

        it('does not show DC unknown when saveDc is defined', () => {
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

        it('does not show DC unknown when rollType is not save', () => {
            render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    saveDc={null}
                />
            );
            expect(screen.queryByText(/DC Unknown/)).not.toBeInTheDocument();
        });
    });

    describe('display formula edge cases', () => {
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
    });

    describe('crit labels display', () => {
        it('shows crit labels in breakdown when isCritDamage and critLabels provided', () => {
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
    });

    describe('save damage type hiding total', () => {
        it('hides total when type is save-damage and finalDamage is 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="save-damage"
                    rolls={[6]}
                    bonus={0}
                    finalDamage={0}
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
                />
            );
            expect(container.querySelector('.dice-roll-total')).not.toBeInTheDocument();
        });

        it('shows total when type is save-damage but finalDamage > 0', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="save-damage"
                    rolls={[6]}
                    bonus={0}
                    finalDamage={5}
                />
            );
            expect(container.querySelector('.dice-roll-total')).toBeInTheDocument();
        });
    });

    describe('stroke of luck display effects', () => {
        it('shows stroke result in breakdown after user clicks the button', () => {
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

        it('shows stroke result total after user clicks the button', () => {
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
    });

    describe('lucky reroll display effects', () => {
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
    });

    describe('reroll result display effects', () => {
        it('shows rerolled value in breakdown after user clicks reroll button', () => {
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

        it('shows reroll result div after user clicks reroll button', () => {
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
    });

    describe('bardic inspiration result display effects', () => {
        it('shows bardic inspiration result in breakdown after user clicks button', () => {
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

        it('shows bardic inspiration result div after user clicks button', () => {
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
    });

    describe('heal already at full HP', () => {
        it('shows already at full HP when finalHeal is 0 or less', () => {
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

        it('uses d20Floor10Total when starryDragonFloorTotal is null', () => {
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

        it('uses reliableTalentTotal when starryDragonFloorTotal and d20Floor10Total are null', () => {
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

        it('uses finalDisplayTotal as fallback when all floor options are null', () => {
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
    });

    describe('hit/miss with computed logic', () => {
        it('computes hit when finalTotal >= effectiveAc', () => {
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

        it('computes miss when finalTotal < effectiveAc', () => {
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

        it('uses coverAcBonus in effective AC calculation for hit determination', () => {
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
    });

    describe('save result display with advantage/disadvantage', () => {
        it('shows advantage indicator in save result when mode is advantage', () => {
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

        it('shows disadvantage indicator in save result when mode is disadvantage', () => {
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

        it('does not show advantage/disadvantage indicators in save result when mode is normal', () => {
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
    });
});
