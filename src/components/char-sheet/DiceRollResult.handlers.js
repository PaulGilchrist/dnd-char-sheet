import { evaluateAutoExpression } from '../../services/combat/automation/automationExpressions.js';

export function createDiceRollHandlers(props, state) {
    const {
        bonus, modifier, total, rolls, formula, targetName, damageType,
        bardicInspirationDie, bardicInspirationOffenseDieSize, autoDamage,
        bardicInspirationDefenseDieSize, spellName, onReroll, onTacticalMind, onDarkOnesLuck,
        onBardicInspiration, onBardicInspirationDefense, onBardicInspirationOffense,
        onEmpoweredSpell, onPuncture, onSavageAttacker, onSuperiorityManeuver,
        playerStats,
    } = props;

    const {
        setRerollResult, setRerollUsed,
        setTacticalResult, setTacticalUsed,
        setBardicInspirationResult, setBardicInspirationUsed,
        setBardicInspirationDefenseResult, setBardicInspirationDefenseUsed,
        setBardicInspirationOffenseResult, setBardicInspirationOffenseUsed,
        setSuperiorityResult, setSuperiorityUsed,
        setEmpoweredSpellResult, setEmpoweredSpellUsed,
        setDarkOnesLuckResult, setDarkOnesLuckUsed,
        setPunctureResult, setPunctureUsed,
        setSavageAttackerResult, setSavageAttackerUsed,
        finalRoll,
    } = state;

    const handleReroll = () => {
        const newRoll = Math.floor(Math.random() * 20) + 1;
        const rerollBonus = props.autoRerollBonus || 0;
        setRerollResult({ roll: newRoll, total: newRoll + bonus + rerollBonus });
        setRerollUsed(true);
        if (onReroll) onReroll();
    };

    const handleTacticalMind = async () => {
        const dieResult = Math.floor(Math.random() * 10) + 1;
        const newTotal = finalRoll + bonus + modifier + dieResult;
        setTacticalResult({ bonus: dieResult, total: newTotal });
        setTacticalUsed(true);
        if (onTacticalMind) await onTacticalMind(dieResult);
    };

    const handleDarkOnesLuck = async () => {
        const dieValue = Math.floor(Math.random() * 10) + 1;
        const currentTotal = finalRoll + bonus + modifier;
        setDarkOnesLuckResult({ dieValue, total: currentTotal + dieValue });
        setDarkOnesLuckUsed(true);
        if (onDarkOnesLuck) await onDarkOnesLuck(dieValue);
    };

    const handleBardicInspiration = async () => {
        const dieSize = parseInt(bardicInspirationDie, 10) || 6;
        const dieValue = Math.floor(Math.random() * dieSize) + 1;
        const newTotal = finalRoll + bonus + modifier + dieValue;
        setBardicInspirationResult({ d20Roll: finalRoll, dieValue, dieSize, total: newTotal });
        setBardicInspirationUsed(true);
        if (onBardicInspiration) await onBardicInspiration(dieValue, dieSize);
    };

    const handleBardicInspirationDefense = async () => {
        const dieSize = bardicInspirationDefenseDieSize || 6;
        const dieValue = Math.floor(Math.random() * dieSize) + 1;
        const newAc = (props.targetAc || 0) + dieValue;
        const attackTotal = state.finalTotal;
        const willMiss = attackTotal < newAc;
        setBardicInspirationDefenseResult({ dieValue, dieSize, newAc, willMiss, attackTotal });
        setBardicInspirationDefenseUsed(true);
        if (onBardicInspirationDefense) {
            await onBardicInspirationDefense(dieValue, dieSize, newAc, willMiss);
        } else {
            console.error('[BI Defense] onBardicInspirationDefense is falsy!');
        }
    };

    const handleBardicInspirationOffense = async () => {
        const dieSize = bardicInspirationOffenseDieSize || autoDamage?.bardicInspirationOffenseDieSize || 6;
        const dieValue = Math.floor(Math.random() * dieSize) + 1;
        const newTotal = total + dieValue;
        setBardicInspirationOffenseResult({ dieValue, dieSize, bonusTotal: newTotal });
        setBardicInspirationOffenseUsed(true);
        if (onBardicInspirationOffense) await onBardicInspirationOffense(dieValue, dieSize);
    };

    const handleEmpoweredSpell = async () => {
        if (onEmpoweredSpell) {
            const lastEvent = {
                damageFormula: formula,
                rolls: rolls,
                rawDamage: total,
                targetName: targetName,
                spellName: spellName || '',
                damageTypes: damageType ? [damageType] : [],
            };
            const result = await onEmpoweredSpell(lastEvent);
            setEmpoweredSpellResult(result);
            setEmpoweredSpellUsed(true);
        }
    };

    const handlePuncture = async () => {
        if (!rolls || rolls.length === 0 || !onPuncture) return;

        const sortedWithIndex = rolls
            .map((r, i) => ({ value: r, index: i }))
            .sort((a, b) => a.value - b.value);
        const lowestIndex = sortedWithIndex[0].index;
        const originalRolls = [...rolls];
        const newRoll = Math.floor(Math.random() * (rolls[0] > 0 ? rolls[0] : 6)) + 1;
        const newRolls = [...rolls];
        newRolls[lowestIndex] = newRoll;

        setPunctureResult({
            originalDice: originalRolls,
            newDice: newRolls,
            rerolledIndex: lowestIndex,
            originalValue: originalRolls[lowestIndex],
            newValue: newRoll,
        });
        setPunctureUsed(true);

        await onPuncture({
            damageFormula: formula,
            rolls: newRolls,
            rawDamage: total,
            targetName: targetName,
            damageTypes: damageType ? [damageType] : [],
            originalRolls,
            newRolls,
            rerolledIndex: lowestIndex,
            originalValue: originalRolls[lowestIndex],
            newValue: newRoll,
        });
    };

    const handleSavageAttacker = () => {
        if (!rolls || rolls.length === 0 || !formula || !onSavageAttacker) return;

        const diceMatch = formula.match(/(\d+)d(\d+)/);
        if (!diceMatch) return;

        const numDice = parseInt(diceMatch[1], 10);
        const dieSize = parseInt(diceMatch[2], 10);
        if (numDice !== rolls.length || dieSize <= 0) return;

        const originalRolls = [...rolls];
        const originalTotal = originalRolls.reduce((sum, r) => sum + r, 0);

        const newRolls = [];
        for (let i = 0; i < numDice; i++) {
            newRolls.push(Math.floor(Math.random() * dieSize) + 1);
        }
        const newTotal = newRolls.reduce((sum, r) => sum + r, 0);

        setSavageAttackerResult({
            original: originalRolls.join(', '),
            rerolled: newRolls.join(', '),
            originalTotal,
            newTotal,
            better: newTotal > originalTotal,
        });
        setSavageAttackerUsed(true);

        onSavageAttacker({
            damageFormula: formula,
            rolls: newTotal > originalTotal ? newRolls : originalRolls,
            rawDamage: total,
            targetName: targetName,
            damageTypes: damageType ? [damageType] : [],
            originalRolls,
            newRolls,
        });
    };

    const handleSuperiorityManeuver = async (maneuver) => {
        if (!onSuperiorityManeuver) return;
        try {
            const dieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);
            const dieResult = Math.floor(Math.random() * dieSize) + 1;
            const newTotal = finalRoll + bonus + modifier + dieResult;
            setSuperiorityResult({ dieValue: dieResult, maneuverName: maneuver.name, total: newTotal });
            setSuperiorityUsed(true);
            await onSuperiorityManeuver(maneuver.name, dieResult);
        } catch (e) {
            console.error('[DiceRollResult] Superiority maneuver failed:', e);
        }
    };

    return {
        handleReroll,
        handleTacticalMind,
        handleDarkOnesLuck,
        handleBardicInspiration,
        handleBardicInspirationDefense,
        handleBardicInspirationOffense,
        handleEmpoweredSpell,
        handlePuncture,
        handleSavageAttacker,
        handleSuperiorityManeuver,
    };
}
