import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { storeSpellLastAttack, addTargetResult } from '../../../../services/automation/common/damageRollback.js';
import CreatureSelectionModal from './CreatureSelectionModal.jsx';
import AreaEffectTargetModalBase from './AreaEffectTargetModalBase.jsx';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

function AOEConditionModal({
    action,
    playerStats,
    campaignName,
    _shape,
    range,
    saveType,
    saveDc,
    effects,
    conditionLabel,
    activeOverlay,
    metamagicCareful,
    metamagicHeighten,
    onClose,
}) {
    const [resultsState, setResults] = useState([]);
    const [pendingPrompts, setPendingPrompts] = useState([]);

    useEffect(() => {
        return () => {
            setResults([]);
            setPendingPrompts([]);
        };
    }, []);

    useEffect(() => {
        if (resultsState.length > 0 && pendingPrompts.length === 0) {
            // Results are complete and ready for display
        }
    }, [resultsState, pendingPrompts]);
    const [heightenTarget, setHeightenTarget] = useState(null);

    const isCarefulSpell = metamagicCareful || false;
    const allyList = isCarefulSpell ? getAllyList(playerStats.name) : null;
    const isCarefulAlly = useCallback((name) => allyList ? allyList.includes(name) : false, [allyList]);

    useEffect(() => {
        return () => {
            setResults([]);
            setPendingPrompts([]);
        };
    }, []);

    const applyConditionsToTarget = useCallback((targetName, conditionList, campaignName) => {
        const storedConditions = getRuntimeValue(targetName, 'activeConditions') || [];
        const conditions = Array.isArray(storedConditions) ? storedConditions : [];
        const newConditions = conditions.filter(c => {
            const lowerC = String(c).toLowerCase();
            return !conditionList.some(e => (e.condition || e.type || '').toLowerCase() === lowerC);
        });
        conditionList.forEach(e => {
            const cond = e.condition || e.type;
            if (cond && !newConditions.some(c => String(c).toLowerCase() === cond.toLowerCase())) {
                newConditions.push(cond);
            }
        });
        setRuntimeValue(targetName, 'activeConditions', newConditions, campaignName);
    }, []);

    const resolveAllSaves = useCallback(async (selectedNames) => {
        const combatSummary = getCombatSummary(campaignName);
        if (!combatSummary) return { results: [], prompts: [] };

        const conditionList = effects || [{ type: 'blinded', condition: 'blinded' }];
        const results = [];
        const prompts = [];

        storeSpellLastAttack(campaignName, {
            casterName: playerStats.name,
            spellName: action.name,
            saveType,
            saveDc,
            attackScope: 'aoe',
        });

        for (const targetName of selectedNames) {
            const target = combatSummary.creatures.find(c => c.name === targetName);
            if (!target) continue;

            const isNpc = target.type === 'npc';
            const saveBonus = target?.saveBonuses?.[saveType.toLowerCase()] ?? 0;

            if (isNpc) {
                const carefulSpellProtected = isCarefulSpell && isCarefulAlly(targetName);
                const isHeightenTarget = heightenTarget === targetName;

                const saveRoll = isHeightenTarget ? Math.min(Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1) : Math.floor(Math.random() * 20) + 1;
                const saveTotal = saveRoll + saveBonus;
                const success = saveTotal >= saveDc;

                if (carefulSpellProtected) {
                    await addEntry(campaignName, {
                        type: 'save_result',
                        characterName: playerStats.name,
                        targetName,
                        saveDc,
                        saveType,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal}) — Careful Spell protected`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });
                    addTargetResult(campaignName, {
                        targetName,
                        saveResult: 'success',
                        roll: saveRoll,
                        total: saveTotal,
                        conditions: [],
                        appliedDamage: 0,
                    });
                    results.push({
                        targetName,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        conditionApplied: false,
                    });
                } else if (!success) {
                    applyConditionsToTarget(targetName, conditionList, campaignName);

                    await addEntry(campaignName, {
                        type: 'condition',
                        action: 'applied',
                        characterName: targetName,
                        condition: conditionLabel || conditionList.map(e => e.condition || e.type).join(', '),
                        dc: saveDc,
                        ability: saveType,
                        sourceName: playerStats.name,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[AOEConditionModal] Error logging condition:', e); });

                    await addEntry(campaignName, {
                        type: 'save_result',
                        characterName: playerStats.name,
                        targetName,
                        saveDc,
                        saveType,
                        success: false,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} failed ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal})`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

                    const appliedConditions = conditionList.map(e => e.condition || e.type).filter(Boolean);
                    addTargetResult(campaignName, {
                        targetName,
                        saveResult: 'failure',
                        roll: saveRoll,
                        total: saveTotal,
                        conditions: appliedConditions,
                        appliedDamage: 0,
                    });
                } else {
                    results.push({
                        targetName,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        conditionApplied: false,
                    });

                    await addEntry(campaignName, {
                        type: 'save_result',
                        characterName: playerStats.name,
                        targetName,
                        saveDc,
                        saveType,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal})`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

                    addTargetResult(campaignName, {
                        targetName,
                        saveResult: 'success',
                        roll: saveRoll,
                        total: saveTotal,
                        conditions: [],
                        appliedDamage: 0,
                    });
                }
            } else {
                const carefulSpellProtected = isCarefulSpell && isCarefulAlly(targetName);

                if (carefulSpellProtected) {
                    results.push({
                        targetName,
                        success: true,
                        roll: null,
                        total: 0,
                        saveBonus: 0,
                        conditionApplied: false,
                    });
                } else {
                    const promptId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

                    sendSavePrompt(campaignName, {
                        promptId,
                        targetName,
                        saveType: saveType,
                        saveDc: saveDc,
                        sourceName: playerStats.name,
                    });

                    const existingPrompts = Array.from(getRuntimeValue('campaign', 'pendingSaveListenerPrompts') || []);
                    existingPrompts.push(promptId);
                    setRuntimeValue('campaign', 'pendingSaveListenerPrompts', existingPrompts, campaignName);

                    prompts.push({ promptId, targetName });
                }
            }
        }

        persistAndNotify(getCombatSummary(campaignName), campaignName);

        return { results, prompts };
    }, [campaignName, playerStats.name, action.name, saveDc, saveType, isCarefulSpell, isCarefulAlly, heightenTarget, effects, conditionLabel, applyConditionsToTarget]);

    const handleSaveResult = useCallback(async (event) => {
        const detail = event.detail;
        if (!detail || !detail.promptId) return;

        const pendingIndex = pendingPrompts.findIndex(p => p.promptId === detail.promptId);
        if (pendingIndex === -1) return;

        const targetName = pendingPrompts[pendingIndex].targetName;
        const success = detail.success;

        if (!success) {
            const conditionList = effects || [{ type: 'blinded', condition: 'blinded' }];
            applyConditionsToTarget(targetName, conditionList, campaignName);

            await addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: conditionLabel || conditionList.map(e => e.condition || e.type).join(', '),
                dc: saveDc,
                ability: saveType,
                sourceName: playerStats.name,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging condition:', e); });

            await addEntry(campaignName, {
                type: 'save_result',
                characterName: playerStats.name,
                targetName,
                saveDc,
                saveType,
                success: false,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} failed ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

            const appliedConditions = (effects || []).map(e => e.condition || e.type).filter(Boolean);
            addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                conditions: appliedConditions,
                appliedDamage: 0,
            });
        } else {
            await addEntry(campaignName, {
                type: 'save_result',
                characterName: playerStats.name,
                targetName,
                saveDc,
                saveType,
                success: true,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                conditions: [],
                appliedDamage: 0,
            });
        }

        persistAndNotify(getCombatSummary(campaignName), campaignName);

        setResults(prev => {
            const newResults = [...prev, {
                targetName,
                success,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                conditionApplied: !success,
            }];
            return newResults;
        });
        setPendingPrompts(prev => {
            const updated = prev.filter(p => p.promptId !== detail.promptId);
            if (updated.length === 0) {
                setTimeout(() => onClose(), 500);
            }
            return updated;
        });
    }, [campaignName, saveDc, saveType, pendingPrompts, effects, conditionLabel, applyConditionsToTarget, playerStats.name, onClose]);

    useEffect(() => {
        if (pendingPrompts.length === 0) return;
        const handleSaveEvent = (event) => {
            handleSaveResult(event);
        };
        window.addEventListener('save-result', handleSaveEvent);
        return () => window.removeEventListener('save-result', handleSaveEvent);
    }, [pendingPrompts.length, handleSaveResult]);

    const combatSummary = getCombatSummary(campaignName);
    const isOverlayTargeted = playerStats.targetName?.startsWith('overlay-');

    const eligibleTargets = useMemo(() => {
        if (!combatSummary?.creatures) return [];
        return combatSummary.creatures
            .filter(c => c.name !== playerStats.name)
            .map(c => ({
                ...c,
                carefulSpellProtected: isCarefulSpell && isCarefulAlly(c.name),
            }));
    }, [combatSummary, playerStats.name, isCarefulSpell, isCarefulAlly]);

    const getCreatureTargets = () => {
        return eligibleTargets.map(c => ({
            name: c.name,
            type: c.type,
            currentHp: c.currentHp,
            maxHp: c.maxHp,
            carefulSpellProtected: c.carefulSpellProtected,
        }));
    };

    const handleCreatureSelectionConfirm = useCallback(async (selectedNames) => {
        await addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: action.name,
            description: `${action.name}: Selecting ${selectedNames.length} target(s) for save (DC ${saveDc} ${saveType})`,
            timestamp: Date.now(),
        }).catch((e) => { console.error('[AOEConditionModal] Error logging feature use:', e); });

        const { results: newResults, prompts } = await resolveAllSaves(selectedNames);
        setResults(newResults);
        setPendingPrompts(prompts);
    }, [campaignName, playerStats.name, action.name, saveDc, saveType, resolveAllSaves]);

    const handleCreatureSelectionSkip = useCallback(() => {
        onClose();
    }, [onClose]);

    const extraState = { selected: new Set(), setSelected: () => {}, toggleTarget: () => {}, heightenTarget, setHeightenTarget };

    const renderBody = (ctx) => {
        if (!ctx.processing && !ctx.allResolved) {
            return (
                <>
                    <p>Select creatures in the area of effect. Each must make a <strong>{saveType}</strong> saving throw (DC {saveDc}).</p>
                    <p className="sp-note">On a failed save, target becomes <strong>{conditionLabel}</strong>.</p>
                    {metamagicHeighten && <p className="sp-note">Heightened Spell: select one target for disadvantage on its first save.</p>}
                    <p className="sp-note">Targets selected: {ctx.selected.size}/{ctx.eligibleTargets.length}</p>
                    {renderTargetList({ eligibleTargets: ctx.eligibleTargets, selected: ctx.selected, toggleTarget: ctx.toggleTarget, heightenTarget: ctx.heightenTarget, setHeightenTarget: ctx.setHeightenTarget, metamagicHeighten: metamagicHeighten })}
                </>
            );
        }

        if (ctx.processing || ctx.pendingPrompts.length > 0) {
            return (
                <>
                    <p>Resolving {saveType} saving throws (DC {saveDc})...</p>
                    <div className="abjure-results-list">
                        {ctx.results.map(r => (
                            <div key={r.targetName} className={`abjure-result ${r.success ? 'abjure-result-success' : 'abjure-result-fail'}`}>
                                <strong>{r.targetName}</strong>: {r.success
                                    ? `Saved — unaffected (rolled ${r.roll ?? 0}{r.saveBonus !== 0 ? ' +' + r.saveBonus : ''} = ${r.total})`
                                    : `Failed — ${conditionLabel}! (rolled ${r.roll ?? 0}{r.saveBonus !== 0 ? ' +' + r.saveBonus : ''} = ${r.total})`}
                            </div>
                        ))}
                        {ctx.pendingPrompts.map(p => (
                            <div key={p.promptId} className="abjure-result abjure-result-pending">
                                <strong>{p.targetName}</strong>: <em>Waiting for save roll...</em>
                            </div>
                        ))}
                    </div>
                    {ctx.allResolved && (
                        <p className="sp-note" style={{ marginTop: '8px' }}>All targets resolved.</p>
                    )}
                </>
            );
        }

        return null;
    };

    const renderActions = (ctx) => {
        if (!ctx.processing && !ctx.allResolved) {
            return (
                <>
                    <button className="sp-roll-btn" onClick={() => ctx.handleApply()} disabled={ctx.selected.size === 0 || ctx.processing} type="button">
                        <i className="fa-solid fa-dice-d20"></i> {action.name} ({ctx.selected.size} target{ctx.selected.size !== 1 ? 's' : ''})
                    </button>
                    <button className="sp-dismiss-btn" onClick={onClose} type="button">Cancel</button>
                </>
            );
        }
        return null;
    };

    const handleApplyOverride = useCallback((ctx) => {
        if (ctx.selected.size === 0) return;
        ctx.setProcessing(true);

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: action.name,
            description: `${action.name}: Selecting ${ctx.selected.size} target(s) for save (DC ${saveDc} ${saveType})`,
            timestamp: Date.now(),
        }).catch((e) => { console.error('[AOEConditionModal] Error logging feature use:', e); });

        resolveAllSaves(Array.from(ctx.selected)).then(({ results: newResults, prompts }) => {
            ctx.setResults(newResults);
            ctx.setPendingPrompts(prompts);
        });
    }, [campaignName, playerStats.name, action.name, saveDc, saveType, resolveAllSaves]);

    const handleSaveResultOverride = useCallback((event, ctx) => {
        const detail = event.detail;
        if (!detail || !detail.promptId) return;

        const pendingIndex = ctx.pendingPrompts.findIndex(p => p.promptId === detail.promptId);
        if (pendingIndex === -1) return;

        const targetName = ctx.pendingPrompts[pendingIndex].targetName;
        const success = detail.success;

        if (!success) {
            const conditionList = effects || [{ type: 'blinded', condition: 'blinded' }];
            applyConditionsToTarget(targetName, conditionList, campaignName);

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: conditionLabel || conditionList.map(e => e.condition || e.type).join(', '),
                dc: saveDc,
                ability: saveType,
                sourceName: playerStats.name,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging condition:', e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: playerStats.name,
                targetName,
                saveDc,
                saveType,
                success: false,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} failed ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

            const appliedConditions = (effects || []).map(e => e.condition || e.type).filter(Boolean);
            addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                conditions: appliedConditions,
                appliedDamage: 0,
            });
        } else {
            addEntry(campaignName, {
                type: 'save_result',
                characterName: playerStats.name,
                targetName,
                saveDc,
                saveType,
                success: true,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[AOEConditionModal] Error logging save result:', e); });

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                conditions: [],
                appliedDamage: 0,
            });
        }

        persistAndNotify(getCombatSummary(campaignName), campaignName);

        ctx.setResults(prev => [...prev, {
            targetName,
            success,
            roll: detail.roll ?? 0,
            total: detail.total ?? 0,
            saveBonus: detail.saveBonus ?? 0,
            conditionApplied: !success,
        }]);
        ctx.setPendingPrompts(prev => prev.filter(p => p.promptId !== detail.promptId));
    }, [campaignName, saveDc, saveType, effects, conditionLabel, applyConditionsToTarget, playerStats.name]);

    if (isOverlayTargeted && activeOverlay) {
        return (
            <AreaEffectTargetModalBase
                combatSummary={combatSummary}
                attackerName={playerStats.name}
                attackerPos={null}
                saveDc={saveDc}
                campaignName={campaignName}
                mapData={null}
                featureName={action.name}
                saveType={saveType}
                rangeFeet={range}
                onClose={onClose}
                icon="fa-solid fa-dice-d20"
                handleApplyOverride={handleApplyOverride}
                handleSaveResultOverride={handleSaveResultOverride}
                extraState={extraState}
                renderBody={renderBody}
                renderActions={renderActions}
            />
        );
    }

    return (
        <CreatureSelectionModal
            title={action.name}
            icon="fa-dice-d20"
            targets={getCreatureTargets()}
            description={`Select creatures in the area of effect. Each must make a <strong>${saveType}</strong> saving throw (DC ${saveDc}).`}
            note={`On a failed save, target becomes <strong>${conditionLabel}</strong>.${metamagicHeighten ? ' Heightened Spell: one target will have disadvantage.' : ''}`}
            confirmLabel={action.name}
            confirmIcon="fa-dice-d20"
            onConfirm={handleCreatureSelectionConfirm}
            onSkip={handleCreatureSelectionSkip}
            metamagicHeighten={metamagicHeighten}
            heightenTarget={heightenTarget}
            setHeightenTarget={setHeightenTarget}
        />
    );
}

function renderTargetList({ eligibleTargets, selected, toggleTarget, heightenTarget, setHeightenTarget, metamagicHeighten }) {
    return (
        <div className="secondary-target-list">
            {eligibleTargets.map((target, i) => {
                const name = target.name || target;
                const isSelected = selected.has(name);
                const isPlayer = target.type === 'player';
                const hpDisplay = (!isPlayer && target.currentHp != null && target.maxHp != null)
                    ? `${Math.round((target.currentHp / target.maxHp) * 100)}%`
                    : null;
                return (
                    <label
                        key={i}
                        className={`secondary-target-row ${isSelected ? 'secondary-target-selected' : ''}`}
                        onClick={() => toggleTarget(name)}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTarget(name)}
                        />
                        <span className="secondary-target-name">
                            <strong>{name}</strong>
                            {hpDisplay && (
                                <span className="secondary-target-hp">
                                    ({hpDisplay} HP)
                                </span>
                            )}
                        </span>
                        {target.carefulSpellProtected && (
                            <span className="sp-note" style={{ fontSize: '0.85em', color: '#4ade80', marginLeft: '4px' }}>✓ Careful Spell protected</span>
                        )}
                        {metamagicHeighten && (
                            <span style={{ fontSize: '0.85em', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                                <input
                                    type="radio"
                                    name="heightenTarget"
                                    checked={heightenTarget === name}
                                    onChange={(e) => { e.stopPropagation(); setHeightenTarget(heightenTarget === name ? null : name); }}
                                    title="Select this target for Heightened Spell disadvantage"
                                />
                                Heighten
                            </span>
                        )}
                    </label>
                );
            })}
        </div>
    );
}

export default AOEConditionModal;
