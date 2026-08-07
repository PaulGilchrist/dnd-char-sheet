import { render, screen, fireEvent } from '@testing-library/react';
import DiceRollResult from './DiceRollResult.jsx';

describe('DiceRollResult', () => {
    describe('bardic inspiration defense result', () => {
        it('shows bardic inspiration defense button when computedHit is true', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
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

        it('does not show bardic inspiration defense button when not hit', () => {
            render(
                <DiceRollResult
                    name="Longsword"
                    type="d20"
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

        it('shows bardic inspiration defense result after clicking', () => {
            const onBIDefense = vi.fn().mockResolvedValue(undefined);
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
                    bardicInspirationDefense={true}
                    bardicInspirationDefenseDieSize={6}
                    onBardicInspirationDefense={onBIDefense}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration - Defense/));
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl.textContent).toContain('Bardic Inspiration - Defense');
            expect(resultEl.textContent).toContain('AC');
        });
    });

    describe('bardic inspiration offense result', () => {
        it('shows bardic inspiration offense button for damage types', () => {
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

        it('does not show bardic inspiration offense button for non-damage types', () => {
            render(
                <DiceRollResult
                    name="Attack"
                    type="d20"
                    rolls={[18]}
                    bonus={3}
                    bardicInspirationOffense={true}
                    bardicInspirationOffenseDieSize={6}
                />
            );
            expect(screen.queryByText(/Bardic Inspiration - Offense/)).not.toBeInTheDocument();
        });

        it('shows bardic inspiration offense result after clicking', () => {
            const onBIOffense = vi.fn().mockResolvedValue(undefined);
            const { container } = render(
                <DiceRollResult
                    name="Fireball"
                    type="damage"
                    rolls={[6, 5, 4]}
                    bonus={0}
                    total={15}
                    bardicInspirationOffense={true}
                    bardicInspirationOffenseDieSize={6}
                    onBardicInspirationOffense={onBIOffense}
                />
            );
            fireEvent.click(screen.getByText(/Bardic Inspiration - Offense/));
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl.textContent).toContain('Bardic Inspiration - Offense');
            expect(resultEl.textContent).toContain('+');
        });
    });

    describe('dark ones own luck result', () => {
        it('shows dark ones own luck button for d20 check/skill/save', () => {
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

        it('does not show dark ones own luck for attack rollType', () => {
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

        it('shows dark ones own luck result after clicking', () => {
            const onDarkOnesLuck = vi.fn().mockResolvedValue(undefined);
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
            const resultEl = container.querySelector('.dice-roll-reroll-result');
            expect(resultEl.textContent).toContain("Dark One's Own Luck");
            expect(resultEl.textContent).toContain('d10');
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
        it('shows holy aura save result when provided', () => {
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
            expect(el.textContent).toContain('Holy Aura Save');
            expect(el.textContent).toContain('SAVE SUCCESSFUL');
            expect(el.textContent).toContain('14');
            expect(el.textContent).toContain('18');
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

        it('shows elemental adept with 1 die showing 1', () => {
            const { container } = render(
                <DiceRollResult
                    name="Fire Bolt"
                    type="damage"
                    rolls={[1, 6, 4]}
                    bonus={0}
                    elementalAdeptBonus={1}
                />
            );
            const el = container.querySelector('.dice-roll-elemental-adept');
            expect(el.textContent).toContain('1× 1 → 2');
            expect(el.textContent).toContain('+1');
        });

        it('shows elemental adept with 0 ones when no 1s in rolls', () => {
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
            expect(el.textContent).toContain('Elemental Adept');
            expect(el.textContent).toContain('0× 1 → 2');
            expect(el.textContent).toContain('+1');
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
        it('shows ray of enfeeblement when rayOfEnfeebleReduction > 0', () => {
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
        it('shows healing reroll when healingRerollOriginalRolls is provided', () => {
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

        it('falls back to safeRolls when healingRerollDisplayRolls is not provided', () => {
            const { container } = render(
                <DiceRollResult
                    name="Healing Word"
                    type="heal"
                    rolls={[5, 6]}
                    bonus={0}
                    healingRerollOriginalRolls={[1, 3]}
                />
            );
            const el = container.querySelector('.dice-roll-healing-reroll');
            expect(el.textContent).toContain('5, 6');
        });

        it('does not show healing reroll when healingRerollOriginalRolls is not provided', () => {
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
});
