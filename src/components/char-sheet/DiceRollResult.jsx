import { useState } from 'react';
import './diceRollResult.css';

function DiceRollResult({ name, type, rolls, rollType, bonus = 0, bonusDetail, formula = '', modifier = 0, total = 0, targetName, targetAc, hit, resistanceNotice, hunterLoreNotice, forcedMode, advantageReason, isAutoMiss, rangeReason, coverReason, isAutoCrit, isCrit, isNatural1, dc, success, dcType, dcSuccess, waitingForPlayerSave, saveDc, saveType, saveResult, finalDamage, damageApplied, targetCurrentHp, damageReduced, damageType, onQuickRoll, autoDamage, coverLevel, coverAcBonus, autoReroll, autoRerollBonus, autoRerollCondition, strSaveReplace, strCheckReplace, strScore, wisCheckReplace, wisCheckMinBonus, reliableTalent, onReroll, tacticalMind, tacticalMindBonus, darkOnesLuck, onDarkOnesLuck, strokeOfLuck, onStrokeOfLuck, defensiveDuelistBonus, baitAndSwitchBonus, isPotentCantrip, luckyAdvantage, luckyDisadvantage, onLuckyAdvantage, onLuckyDisadvantage, secondaryFormula, secondaryRolls, secondaryTotal, secondaryModifier, secondaryDamageType, secondaryFinalDamage, secondarySaveResult, availableSuperiorityManeuvers, onSuperiorityManeuver, onTacticalMind, gwfApplied, gwfOriginalRolls, gwfDisplayRolls, elementalAdeptBonus, types, baseFormula, baseTotal, baseRolls, bonusFormula, bonusTotal, bonusRolls, finalHeal, healReduced, bonusHeal, bonusHealDetail, psiBolsteredKnack, onPsiBolsteredKnack, psiBolsteredKnackDieSize, bardicInspiration, bardicInspirationDie, onBardicInspiration, luckyRerolled, luckyRerollValue, bardicInspirationDefense, bardicInspirationDefenseDieSize, bardicInspirationDefenseTargetName: _bardicInspirationDefenseTargetName, bardicInspirationOffense, bardicInspirationOffenseDieSize, onBardicInspirationDefense, onBardicInspirationOffense, unerringStrikeApplied, onDone, interceptedFeature, empoweredSpell, _empoweredSpellChaMod, spellName, onEmpoweredSpell, d20Floor10, autoRerollForAttack, healingRerollOriginalRolls, healingRerollDisplayRolls, piercerPuncture, onPuncture,     critLabels, savageAttacker, onSavageAttacker, tavernBrawlerRerolls, rayOfEnfeebleReduction, rayOfEnfeebleRoll }) {
    const isD20 = type === 'd20';
    const [mode, setMode] = useState(forcedMode || 'normal');
    const [rerollUsed, setRerollUsed] = useState(false);
    const [rerollResult, setRerollResult] = useState(null);
    const [tacticalUsed, setTacticalUsed] = useState(false);
    const [tacticalResult, setTacticalResult] = useState(null);
    const [strokeUsed, setStrokeUsed] = useState(false);
    const [strokeResult, setStrokeResult] = useState(null);
    const [bardicInspirationUsed, setBardicInspirationUsed] = useState(false);
    const [bardicInspirationResult, setBardicInspirationResult] = useState(null);
    const [bardicInspirationDefenseUsed, setBardicInspirationDefenseUsed] = useState(false);
    const [bardicInspirationDefenseResult, setBardicInspirationDefenseResult] = useState(null);
    const [bardicInspirationOffenseUsed, setBardicInspirationOffenseUsed] = useState(false);
    const [bardicInspirationOffenseResult, setBardicInspirationOffenseResult] = useState(null);
    const [superiorityUsed, setSuperiorityUsed] = useState(false);
    const [superiorityResult, setSuperiorityResult] = useState(null);
    const [psiKnackClicked, setPsiKnackClicked] = useState(false);
    const [psiKnackResult, setPsiKnackResult] = useState(null);
    const [psiKnackConsumed, setPsiKnackConsumed] = useState(false);
    const [empoweredSpellUsed, setEmpoweredSpellUsed] = useState(false);
    const [empoweredSpellResult, setEmpoweredSpellResult] = useState(null);
    const [darkOnesLuckUsed, setDarkOnesLuckUsed] = useState(false);
    const [darkOnesLuckResult, setDarkOnesLuckResult] = useState(null);
    const [boonUsed, setBoonUsed] = useState(false);
    const [punctureUsed, setPunctureUsed] = useState(false);
    const [punctureResult, setPunctureResult] = useState(null);
    const [savageAttackerUsed, setSavageAttackerUsed] = useState(false);
    const [savageAttackerResult, setSavageAttackerResult] = useState(null);

    let finalRoll = 0;
    const safeRolls = Array.isArray(rolls) ? rolls : [];

    if (isD20) {
        const r1 = safeRolls[0] || 0;
        const r2 = safeRolls[1] || 0;

        if (mode === 'advantage') {
            finalRoll = Math.max(r1, r2);
        } else if (mode === 'disadvantage') {
            finalRoll = Math.min(r1, r2);
        } else {
            finalRoll = r1;
        }
    } else {
         finalRoll = safeRolls.reduce((sum, r) => sum + r, 0);
      }

    const isDamageType = type === 'damage' || rollType === 'damage' || type === 'save-damage' || rollType === 'save-damage' || type === 'aoe-damage' || rollType === 'aoe-damage' || type === 'overchannel-damage' || rollType === 'overchannel-damage' || type === 'graze-damage' || rollType === 'graze-damage';

    const isHealType = type === 'heal';

    const isCritDamage = isDamageType && (isCrit || isAutoCrit);

    const originalTotal = (isDamageType || isHealType) ? total : (finalRoll + bonus + modifier);
    const displayRoll = luckyRerolled ? luckyRerollValue : (strokeResult !== null ? 20 : (rerollResult !== null ? rerollResult.roll : (bardicInspirationResult !== null ? bardicInspirationResult.d20Roll : finalRoll)));
    const displayTotal = luckyRerolled ? (luckyRerollValue + bonus + modifier) : (strokeResult !== null ? 20 + bonus + modifier : (rerollResult !== null ? rerollResult.total : (bardicInspirationResult !== null ? bardicInspirationResult.total : originalTotal)));
    const appliesReplace = (strSaveReplace && rollType === 'save') || (strCheckReplace && (rollType === 'check' || rollType === 'skill'));
    const strReplaceApplied = appliesReplace && displayTotal < (strScore || 10);
    const finalDisplayTotal = strReplaceApplied ? strScore : displayTotal;
    const wisBonus = wisCheckReplace ? (wisCheckMinBonus || 1) : bonus;
    const wisDisplayTotal = wisCheckReplace && (rollType === 'check' || rollType === 'skill') ? finalRoll + wisBonus + modifier : displayTotal;
    const reliableTalentTotal = reliableTalent && (rollType === 'check' || rollType === 'skill') && displayRoll <= 9 ? 10 + bonus + modifier : null;
    const d20Floor10Total = d20Floor10 && displayRoll <= 9 ? 10 + bonus + modifier : null;
    const finalTotal = (d20Floor10Total !== null ? d20Floor10Total : reliableTalentTotal !== null ? reliableTalentTotal : (wisCheckReplace && (rollType === 'check' || rollType === 'skill') ? wisDisplayTotal : finalDisplayTotal));
    const showFumble = isNatural1 && rollType === 'attack';

    const critDiceRolls = isCritDamage && rolls ? rolls.map((r, i) => {
        const label = critLabels?.[i] || null;
        return label ? `${r}*2 [${label}]` : `${r}*2`;
    }) : null;
    const displayFormula = formula;

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
        const newAc = (targetAc || 0) + dieValue;
        const attackTotal = finalTotal;
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
            const dieResult = Math.floor(Math.random() * 12) + 1;
            const newTotal = finalRoll + bonus + modifier + dieResult;
            setSuperiorityResult({ dieValue: dieResult, maneuverName: maneuver.name, total: newTotal });
            setSuperiorityUsed(true);
            await onSuperiorityManeuver(maneuver.name, dieResult);
        } catch (e) {
            console.error('[DiceRollResult] Superiority maneuver failed:', e);
        }
    };

    const saveAbilityLabel = saveType ? saveType.toUpperCase() : '';

    const isSaveDamageType = type === 'save-damage';

    const handleReroll = () => {
        const newRoll = Math.floor(Math.random() * 20) + 1;
        const rerollBonus = autoRerollBonus || 0;
        setRerollResult({ roll: newRoll, total: newRoll + bonus + rerollBonus });
        setRerollUsed(true);
        if (onReroll) onReroll();
    };

    return (
        <div className="dice-roll-result">
            {type !== 'damage_type_choice' && (
                <div className="dice-roll-header">
                    <i className={`fa-solid ${
                        type === 'd20' ? 'fa-dice-d20' :
                        type === 'attack' ? 'fa-crosshairs' :
                        type === 'save' || isSaveDamageType ? 'fa-shield-halved' :
                        type === 'initiative' ? 'fa-gavel' :
                        isHealType ? 'fa-heart' : 'fa-bolt'
                    }`}></i>
                    {name}
                </div>
            )}
            {type !== 'damage_type_choice' && !((isSaveDamageType || rollType === 'save-damage') && finalDamage !== undefined && finalDamage <= 0) && <div className="dice-roll-total">{finalTotal}</div>}
            {type !== 'damage_type_choice' && !((isSaveDamageType || rollType === 'save-damage') && finalDamage !== undefined && finalDamage <= 0) && (
                <div className="dice-roll-breakdown">
                    {displayFormula ? `${displayFormula}: ` : type === 'd20' ? 'd20 ' : ''}
                    {strokeResult !== null ? (
                      <span className="dice-rolled">
                        20 (Stroke of Luck)
                      </span>
                    ) : luckyRerolled ? (
                      <span className="dice-rolled">
                        {luckyRerollValue} (Lucky reroll)
                      </span>
                    ) : rerollResult !== null ? (
                      <span className="dice-rolled">
                        {rerollResult.roll} (reroll)
                      </span>
                    ) : bardicInspirationResult !== null ? (
                      <span className="dice-rolled">
                        {bardicInspirationResult.d20Roll}
                      </span>
                    ) : isD20 && mode !== 'normal' && safeRolls.length === 2 ? (
                      <span className="dice-rolled">
                        {safeRolls[0]}, {safeRolls[1]} → {finalRoll}
                      </span>
                    ) : (
                      <span className="dice-rolled">
                        {isD20
                            ? (mode === 'normal' ? safeRolls[0] || 0 : finalRoll)
                            : (critDiceRolls ? critDiceRolls.join(', ') : safeRolls.join(', '))
                        }
                      </span>
                    )}
                    {strokeResult !== null ? (
                       ` +${20 + bonus + modifier - 20}`
                    ) : rerollResult !== null ? (
                       ` +${rerollResult.total - rerollResult.roll}`
                    ) : bardicInspirationResult !== null ? (
                       ` +${bardicInspirationResult.total - bardicInspirationResult.d20Roll}`
                    ) : strReplaceApplied ? (
                       ` → ${strScore} (Indomitable Might)`
                    ) : isCritDamage ? ` +${modifier}${bonusDetail && bonus > 0 ? ' ' + bonusDetail : ''}` : (bonus + modifier) >= 0 && (bonus + modifier) !== 0 ? ` +${(bonus + modifier)}${bonusDetail ? ' ' + bonusDetail : ''}` :
                      (bonus + modifier) < 0 ? ` ${(bonus + modifier)}${bonusDetail ? ' ' + bonusDetail : ''}` : ''}
                </div>
            )}

            {reliableTalent && (rollType === 'check' || rollType === 'skill') && safeRolls[0] <= 9 && (
              <div className="dice-roll-reliable-talent">
                <i className="fa-solid fa-star"></i> Reliable Talent: d20 {safeRolls[0]} → 10
              </div>
            )}

            {d20Floor10 && safeRolls[0] <= 9 && (
              <div className="dice-roll-reliable-talent">
                <i className="fa-solid fa-clock"></i> Trance of Order: d20 {safeRolls[0]} → 10
              </div>
            )}

            {gwfApplied && gwfOriginalRolls && (
              <div className="dice-roll-gwf">
                <i className="fa-solid fa-shield-halved"></i> Great Weapon Fighting: {gwfOriginalRolls.join(', ')} → {(gwfDisplayRolls || safeRolls).join(', ')}
              </div>
            )}

            {rayOfEnfeebleReduction > 0 && (
              <div className="dice-roll-ray-enfeeblement">
                <i className="fa-solid fa-hand-fist"></i> -1d8 [Enfeeblement]: -{rayOfEnfeebleRoll}
              </div>
            )}

            {healingRerollOriginalRolls && (
              <div className="dice-roll-healing-reroll">
                <i className="fa-solid fa-heart"></i> Healing Rerolls: {healingRerollOriginalRolls.join(', ')} → {(healingRerollDisplayRolls || safeRolls).join(', ')}
              </div>
            )}

            {elementalAdeptBonus > 0 && rolls && Array.isArray(rolls) && (
              <div className="dice-roll-elemental-adept">
                <i className="fa-solid fa-fire"></i> Elemental Adept: {rolls.filter(r => r === 1).length}× 1 → 2 (+{elementalAdeptBonus})
              </div>
            )}

            {tavernBrawlerRerolls && tavernBrawlerRerolls.length > 0 && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-fist-raised"></i> Tavern Brawler: {tavernBrawlerRerolls.map(r => r.original).join(', ')} → {tavernBrawlerRerolls.map(r => r.rerolled).join(', ')}
              </div>
            )}

              {isD20 && (
                  <div className="dice-roll-toggles">
                      <label className={`badge-toggle ${mode === 'advantage' ? 'active' : ''}`}>
                          <input
                             type="checkbox"
                             checked={mode === 'advantage'}
                             onChange={() => setMode(mode === 'advantage' ? 'normal' : 'advantage')}
                              style={{ display: 'none' }}
                          />
                          Advantage
                      </label>
                      <label className={`badge-toggle ${mode === 'disadvantage' ? 'active' : ''}`}>
                          <input
                             type="checkbox"
                             checked={mode === 'disadvantage'}
                             onChange={() => setMode(mode === 'disadvantage' ? 'normal' : 'disadvantage')}
                              style={{ display: 'none' }}
                          />
                          Disadvantage
                      </label>
                        {forcedMode && forcedMode !== 'normal' && (
                           <span className="badge-toggle forced-mode-badge" title={advantageReason || rangeReason || "Automatically set by active conditions"}>
                             <i className="fa-solid fa-asterisk"></i> {forcedMode === 'advantage' ? 'Adv' : 'Disadv'} ({advantageReason || rangeReason || 'conditions'})
                           </span>
                         )}
                  </div>
              )}

            {(isCritDamage || isCrit || isAutoCrit) && <div className="dice-roll-crit">Critical Hit! — damage dice doubled</div>}
            {(isD20 && !isCrit && !isAutoCrit && displayRoll === 20) && <div className="dice-roll-crit">Natural 20!</div>}
            {strokeResult !== null && isD20 && !isCrit && !isAutoCrit && <div className="dice-roll-crit">Natural 20!</div>}
            {showFumble && <div className="dice-roll-crit dice-roll-crit-miss">Critical Miss!</div>}
               {targetName && hit !== undefined && !isSaveDamageType && rollType === 'attack' && (
                   <div className={`dice-roll-hit-miss ${hit ? 'hit' : 'miss'}`}>
                      {isAutoMiss ? `✗ AUTO-MISS (${coverReason || rangeReason || 'out of range'})` : (hit ? `✓ HIT (${displayTotal} vs AC ${targetAc ?? '—'}${(defensiveDuelistBonus > 0 || (baitAndSwitchBonus || 0) > 0) ? ` + ${Math.max(0, defensiveDuelistBonus || 0) + Math.max(0, baitAndSwitchBonus || 0)} reaction` : ''})` : `✗ MISS (${displayTotal} vs AC ${targetAc ?? '—'}${(defensiveDuelistBonus > 0 || (baitAndSwitchBonus || 0) > 0) ? ` + ${Math.max(0, defensiveDuelistBonus || 0) + Math.max(0, baitAndSwitchBonus || 0)} reaction` : ''})`)}
                   </div>
                 )}

            {unerringStrikeApplied && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-shield-halved"></i> Unerring Strike: missed weapon attack turned into a hit
              </div>
            )}

            {coverAcBonus > 0 && (
              <div className="dice-roll-cover">
                {coverLevel === 'threeQuarter' ? '3/4' : '1/2'} Cover (+{coverAcBonus} AC)
              </div>
            )}

            {waitingForPlayerSave && (
              <div className="dice-roll-save-waiting">
                <i className="fa-solid fa-spinner fa-spin"></i> Waiting for <strong>{targetName}</strong> to roll {saveAbilityLabel} save (DC {saveDc})...
                {onQuickRoll && (
                  <button className="dice-roll-quick-roll" onClick={() => onQuickRoll()} type="button">
                    <i className="fa-solid fa-dice-d20"></i> Quick Roll (Local)
                  </button>
                )}
              </div>
            )}

            {saveResult !== undefined && saveResult !== null && (
              <div className={`dice-roll-save-result ${saveResult.success ? 'save-success' : 'save-failure'}`}>
                {saveResult.success ? '✓ SAVE SUCCESS' : '✗ SAVE FAILURE'} ({saveResult.total} vs DC {saveDc})
                <span className="dice-roll-save-detail"> (d20 {saveResult.roll} + {saveResult.bonus})</span>
                {mode === 'disadvantage' && <span className="dice-roll-save-detail"> [Disadvantage]</span>}
                {mode === 'advantage' && <span className="dice-roll-save-detail"> [Advantage]</span>}
              </div>
            )}

            {rollType === 'save' && saveDc == null && (
              <div className="dice-roll-save-info">
                <i className="fa-solid fa-triangle-exclamation"></i> DC Unknown — no success or failure
              </div>
            )}

            {dc !== undefined && success === undefined && !waitingForPlayerSave && !isSaveDamageType && (
              <div className="dice-roll-save-info">
                Save DC {dc} {dcType}: {dcSuccess === 'half' ? 'half damage on save' : 'no damage on save'}
              </div>
            )}

            {rollType === 'condition-save' && success !== undefined && (
              <div className={`dice-roll-save-result ${success ? 'save-success' : 'save-failure'}`}>
                {success ? '✓ SAVE SUCCESS' : '✗ SAVE FAILURE'} ({finalTotal} vs DC {dc})
                <span className="dice-roll-save-detail"> (d20 {safeRolls[0] || 0} + {bonus})</span>
                {mode === 'disadvantage' && <span className="dice-roll-save-detail"> [Disadvantage]</span>}
                {mode === 'advantage' && <span className="dice-roll-save-detail"> [Advantage]</span>}
              </div>
            )}

            {resistanceNotice && (
              <div className="dice-roll-resistance">{resistanceNotice}</div>
            )}

            {hunterLoreNotice && (
              <div className="dice-roll-hunter-lore">
                <i className="fa-solid fa-eye"></i> {hunterLoreNotice.split('\n').map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            )}

            {finalDamage !== undefined && damageApplied && (
              <div className="dice-roll-damage-applied">
                {damageReduced ? (
                  <span><strong>{finalDamage}</strong> damage applied to <strong>{targetName}</strong> (reduced from {originalTotal}){targetCurrentHp !== undefined ? ` — HP: ${targetCurrentHp + finalDamage} → ${targetCurrentHp}` : ''}</span>
                ) : (
                  <span><strong>{finalDamage}</strong> damage applied to <strong>{targetName}</strong>{targetCurrentHp !== undefined ? ` — HP: ${targetCurrentHp + finalDamage} → ${targetCurrentHp}` : ''}</span>
                )}
              </div>
            )}

            {isDamageType && interceptedFeature && (
              <div className="dice-roll-intercepted">
                <i className="fa-solid fa-shield-halved"></i> {interceptedFeature}: damage intercepted, {targetName} survives!
              </div>
            )}

            {isHealType && (
              <div className="dice-roll-heal-applied">
                {finalHeal <= 0 ? (
                  <span><strong>{targetName}</strong> is already at full HP</span>
                ) : healReduced ? (
                  <span><strong>{finalHeal}</strong> healing applied to <strong>{targetName}</strong> (reduced from {originalTotal}){targetCurrentHp !== undefined ? ` — HP: ${targetCurrentHp + finalHeal} → ${targetCurrentHp}` : ''}</span>
                ) : (
                  <span><strong>{finalHeal}</strong> healing applied to <strong>{targetName}</strong>{targetCurrentHp !== undefined ? ` — HP: ${targetCurrentHp + finalHeal} → ${targetCurrentHp}` : ''}</span>
                )}
                {bonusHeal > 0 && (
                  <div className="dice-roll-heal-bonus">
                    <i className="fa-solid fa-sparkles"></i> Bonus: +{bonusHeal} ({bonusHealDetail})
                  </div>
                )}
              </div>
            )}

            {isPotentCantrip && (
              <div className="dice-roll-potent-cantrip">
                <i className="fa-solid fa-wand-magic-sparkles"></i> Potent Cantrip: half damage on miss
              </div>
            )}

            {luckyRerolled && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-star"></i> Lucky (Halfling): rerolled natural 1 → {luckyRerollValue}
              </div>
            )}

            {autoReroll && !rerollUsed && (isD20 || type === 'save-damage') && autoRerollCondition !== 'roll_equals_1' && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleReroll} type="button">
                  <i className="fa-solid fa-rotate"></i> Reroll{autoRerollBonus ? ` (+${autoRerollBonus})` : ''}
                </button>
              </div>
            )}

            {strokeOfLuck && !strokeUsed && isD20 && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => { setStrokeResult({ roll: 20, total: 20 + bonus + modifier }); setStrokeUsed(true); if (onStrokeOfLuck) onStrokeOfLuck(); }} type="button">
                  <i className="fa-solid fa-star"></i> Stroke of Luck
                </button>
              </div>
            )}

            {autoRerollForAttack && !boonUsed && isD20 && !hit && !isAutoMiss && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => { setBoonUsed(true); if (onStrokeOfLuck) onStrokeOfLuck(); }} type="button">
                  <i className="fa-solid fa-shield-halved"></i> Boon of Combat Prowess
                </button>
              </div>
            )}

            {bardicInspiration && !bardicInspirationUsed && isD20 && (rollType === 'check' || rollType === 'skill' || rollType === 'save') && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleBardicInspiration} type="button">
                  <i className="fa-solid fa-music"></i> Bardic Inspiration (d{bardicInspirationDie})
                </button>
              </div>
            )}

            {luckyAdvantage && isD20 && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => { setMode('advantage'); if (onLuckyAdvantage) onLuckyAdvantage(); }} type="button">
                  <i className="fa-solid fa-eye"></i> Lucky: Advantage (1 LP)
                </button>
              </div>
            )}

            {luckyDisadvantage && isD20 && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => { setMode('disadvantage'); if (onLuckyDisadvantage) onLuckyDisadvantage(); }} type="button">
                  <i className="fa-solid fa-eye-slash"></i> Lucky: Disadvantage (1 LP)
                </button>
              </div>
            )}

            {tacticalMind && !tacticalUsed && (rollType === 'check' || rollType === 'skill') && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleTacticalMind} type="button">
                  <i className="fa-solid fa-hand"></i> Tactical Mind{tacticalMindBonus ? ` (+${tacticalMindBonus})` : ''}
                </button>
              </div>
            )}

            {darkOnesLuck && !darkOnesLuckUsed && isD20 && (rollType === 'check' || rollType === 'skill' || rollType === 'save') && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleDarkOnesLuck} type="button">
                  <i className="fa-solid fa-fire"></i> Dark One's Own Luck (1d10)
                </button>
              </div>
            )}

            {availableSuperiorityManeuvers && availableSuperiorityManeuvers.length > 0 && !superiorityUsed && (
              <div className="dice-roll-reroll">
                {availableSuperiorityManeuvers.map(m => (
                  <button key={m.name} className="dice-roll-reroll-btn" onClick={() => handleSuperiorityManeuver(m)} type="button">
                    <i className="fa-solid fa-bolt"></i> {m.name} (Superiority Die)
                  </button>
                ))}
              </div>
            )}

            {psiBolsteredKnack && !psiKnackClicked && (rollType === 'check' || rollType === 'skill') && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => {
                  const dieSize = psiBolsteredKnackDieSize || 6;
                  const dieValue = Math.floor(Math.random() * dieSize) + 1;
                  const currentTotal = strokeResult !== null ? 20 + bonus + modifier : (rerollResult !== null ? rerollResult.total : (finalRoll + bonus + modifier));
                  setPsiKnackResult({ dieValue, dieSize, newTotal: currentTotal + dieValue });
                  setPsiKnackClicked(true);
                }} type="button">
                  <i className="fa-solid fa-brain"></i> Psi-Bolstered Knack (d{psiBolsteredKnackDieSize || 6})
                </button>
              </div>
            )}

            {bardicInspirationDefense && !bardicInspirationDefenseUsed && hit && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleBardicInspirationDefense} type="button">
                  <i className="fa-solid fa-music"></i> Bardic Inspiration - Defense (d{bardicInspirationDefenseDieSize})
                </button>
              </div>
            )}

            {bardicInspirationOffense && !bardicInspirationOffenseUsed && isDamageType && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => handleBardicInspirationOffense()} type="button">
                  <i className="fa-solid fa-music"></i> Bardic Inspiration - Offense (d{bardicInspirationOffenseDieSize})
                </button>
              </div>
            )}

            {empoweredSpell && !empoweredSpellUsed && isDamageType && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleEmpoweredSpell} type="button">
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Empowered Spell (1 SP)
                </button>
              </div>
            )}

            {piercerPuncture && !punctureUsed && isDamageType && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handlePuncture} type="button">
                  <i className="fa-solid fa-bolt"></i> Piercer - Puncture
                </button>
              </div>
            )}

            {savageAttacker && !savageAttackerUsed && isDamageType && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={handleSavageAttacker} type="button">
                  <i className="fa-solid fa-arrows-spin"></i> Savage Attacker
                </button>
              </div>
            )}

            {psiKnackClicked && !psiKnackConsumed && psiKnackResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-brain"></i> Psi-Bolstered Knack: +{psiKnackResult.dieValue} (d{psiKnackResult.dieSize}) → <strong>{psiKnackResult.newTotal}</strong>
                <div className="dice-roll-reroll" style={{ marginTop: '8px' }}>
                  <button className="dice-roll-reroll-btn" onClick={() => {
                    setPsiKnackConsumed(true);
                    if (onPsiBolsteredKnack) onPsiBolsteredKnack({ dieValue: psiKnackResult.dieValue, dieSize: psiKnackResult.dieSize, success: true });
                  }} type="button">
                    <i className="fa-solid fa-check"></i> Succeeded
                  </button>
                  <button className="dice-roll-reroll-btn" onClick={() => {
                    setPsiKnackConsumed(true);
                    if (onPsiBolsteredKnack) onPsiBolsteredKnack({ dieValue: psiKnackResult.dieValue, dieSize: psiKnackResult.dieSize, success: false });
                  }} type="button">
                    <i className="fa-solid fa-xmark"></i> Still Failed
                  </button>
                </div>
              </div>
            )}

            {psiKnackClicked && psiKnackConsumed && psiKnackResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-brain"></i> Psi-Bolstered Knack: +{psiKnackResult.dieValue} (d{psiKnackResult.dieSize}) → <strong>{psiKnackResult.newTotal}</strong>
              </div>
            )}

            {rerollUsed && rerollResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-rotate"></i> Rerolled: {rerollResult.roll} + {rerollResult.total - rerollResult.roll} = <strong>{rerollResult.total}</strong>
              </div>
            )}

            {strokeUsed && strokeResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-star"></i> Stroke of Luck: d20 → 20 + {strokeResult.total - 20} = <strong>{strokeResult.total}</strong>
              </div>
            )}

            {boonUsed && autoRerollForAttack && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-shield-halved"></i> Boon of Combat Prowess: Miss converted to Hit
              </div>
            )}

            {bardicInspirationUsed && bardicInspirationResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-music"></i> Bardic Inspiration: 1d{bardicInspirationResult.dieSize} → {bardicInspirationResult.dieValue} + <strong>{bardicInspirationResult.total}</strong>
              </div>
            )}

            {bardicInspirationDefenseUsed && bardicInspirationDefenseResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-music"></i> Bardic Inspiration - Defense: 1d{bardicInspirationDefenseResult.dieSize} → {bardicInspirationDefenseResult.dieValue} → AC {bardicInspirationDefenseResult.newAc} ({bardicInspirationDefenseResult.willMiss ? 'Attack misses!' : 'Attack still hits'})
              </div>
            )}

            {bardicInspirationOffenseUsed && bardicInspirationOffenseResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-music"></i> Bardic Inspiration - Offense: 1d{bardicInspirationOffenseResult.dieSize} → +{bardicInspirationOffenseResult.dieValue} → <strong>{bardicInspirationOffenseResult.bonusTotal}</strong>
              </div>
            )}

            {empoweredSpellUsed && empoweredSpellResult && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-wand-magic-sparkles"></i> Empowered Spell: rerolled {empoweredSpellResult.rerollCount} dice ({empoweredSpellResult.originalDice?.join(', ')} → {empoweredSpellResult.newDice?.join(', ')}) → <strong>{empoweredSpellResult.newTotal}</strong>{empoweredSpellResult.damageDifference > 0 ? ` (+${empoweredSpellResult.damageDifference})` : empoweredSpellResult.damageDifference < 0 ? ` (${empoweredSpellResult.damageDifference})` : ''}
                {empoweredSpellResult.damageDifference === 0 && !empoweredSpellResult.message ? '' : empoweredSpellResult.message ? ` — ${empoweredSpellResult.message}` : ''}
              </div>
            )}

            {punctureUsed && punctureResult && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-bolt"></i> Piercer - Puncture: {punctureResult.originalDice?.join(', ')} → {punctureResult.newDice?.join(', ')}
              </div>
            )}

            {savageAttackerUsed && savageAttackerResult && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-arrows-spin"></i> Savage Attacker: {savageAttackerResult.original} → {savageAttackerResult.rerolled}
                {savageAttackerResult.better ? ` (+${savageAttackerResult.newTotal - savageAttackerResult.originalTotal})` : ' — Original kept'}
              </div>
            )}

            {tacticalUsed && tacticalResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-hand"></i> Tactical Mind: +{tacticalResult.bonus} → <strong>{tacticalResult.total}</strong>
              </div>
            )}

            {darkOnesLuckUsed && darkOnesLuckResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-fire"></i> Dark One's Own Luck: +{darkOnesLuckResult.dieValue} (d10) → <strong>{darkOnesLuckResult.total}</strong>
              </div>
            )}

            {superiorityUsed && superiorityResult !== null && (
              <div className="dice-roll-reroll-result">
                <i className="fa-solid fa-bolt"></i> {superiorityResult.maneuverName}: d12 {superiorityResult.dieValue} → <strong>{superiorityResult.total}</strong> (+{superiorityResult.dieValue})
              </div>
            )}

            {secondaryFormula && (
              <div className="dice-roll-secondary-damage">
                <div className="dice-roll-secondary-label">Secondary Damage:</div>
                <div className="dice-roll-secondary-formula">
                  {secondaryFormula}: {secondaryRolls ? secondaryRolls.join(', ') : ''}{secondaryModifier !== undefined && secondaryModifier !== 0 ? ` +${secondaryModifier}` : ''} = {secondaryTotal}
                </div>
                {secondarySaveResult && (
                  <div className={`dice-roll-secondary-save-result ${secondarySaveResult.success ? 'save-success' : 'save-failure'}`}>
                    {secondarySaveResult.success ? '✓ SAVE SUCCESS' : '✗ SAVE FAILURE'} ({secondarySaveResult.total} vs DC {saveDc})
                  </div>
                )}
                {secondaryFinalDamage !== undefined && finalDamage !== undefined && (
                  <div className="dice-roll-secondary-total">
                    {finalDamage} {damageType || ''} damage + {secondaryFinalDamage} {secondaryDamageType || ''} damage = <strong>{finalDamage + secondaryFinalDamage} total damage</strong>
                  </div>
                )}
                {finalDamage !== undefined && damageApplied && secondaryFinalDamage !== undefined && (
                  <div className="dice-roll-damage-applied">
                    <span><strong>{finalDamage + secondaryFinalDamage}</strong> damage applied to <strong>{targetName}</strong>{targetCurrentHp !== undefined ? ` — HP: ${targetCurrentHp + finalDamage + secondaryFinalDamage} → ${targetCurrentHp}` : ''}</span>
                  </div>
                )}
              </div>
            )}

            {type === 'damage_type_choice' && (
                <div className="dice-roll-damage-type-choice">
                    <div className="dice-roll-header">
                        <i className="fa-solid fa-bolt"></i> {name}
                    </div>
                    <p>Choose the damage type for this hit:</p>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <div className="dice-roll-breakdown">
                            <strong>Weapon Damage:</strong> {baseFormula}: {baseRolls?.join(', ')} = {baseTotal}
                        </div>
                        <div className="dice-roll-breakdown">
                            <strong>Divine Strike:</strong> {bonusFormula}: {bonusRolls?.join(', ')} = {bonusTotal}
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Choose bonus damage type:</div>
                            {types?.map((typeChoice) => (
                                <button
                                    key={typeChoice}
                                    className="sp-roll-btn"
                                    style={{ margin: '0 6px 8px 6px' }}
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('damage-type-choice', { detail: { chosenType: typeChoice } }));
                                    }}
                                >
                                    {typeChoice}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="sp-actions">
                        <button className="sp-dismiss-btn" onClick={() => {
                            window.dispatchEvent(new CustomEvent('damage-type-skip'));
                        }}>Skip</button>
                    </div>
                </div>
            )}

            {autoDamage && hit && (
              <div className="dice-roll-reroll">
                <button className="dice-roll-reroll-btn" onClick={() => onDone?.()} type="button">
                  <i className="fa-solid fa-check"></i> Done
                </button>
              </div>
            )}

            <div className="dice-roll-hint">click to dismiss</div>
        </div>
    );
}

export default DiceRollResult;
