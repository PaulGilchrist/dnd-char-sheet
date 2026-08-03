import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { storeSpellLastAttack, addTargetResult } from '../../../../services/automation/common/damageRollback.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';
import CreatureSelectionModal from './CreatureSelectionModal.jsx';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

function ConfusionModal({
    action,
    playerStats,
    campaignName,
    saveType,
    saveDc,
    activeOverlay,
    metamagicCareful,
    metamagicHeighten,
    onClose,
}) {
    const [pendingPrompts, setPendingPrompts] = useState([]);

    useEffect(() => {
        return () => {
            setPendingPrompts([]);
        };
    }, []);

    const [heightenTarget, setHeightenTarget] = useState(null);

    const isCarefulSpell = metamagicCareful || false;
    const allyList = isCarefulSpell ? getAllyList(playerStats.name) : null;
    const isCarefulAlly = useCallback((name) => allyList ? allyList.includes(name) : false, [allyList]);

    const applyConfusionToTarget = useCallback((targetName, campaignName) => {
        const storedConditions = getRuntimeValue(targetName, 'activeConditions') || [];
        const conditions = Array.isArray(storedConditions) ? storedConditions : [];
        const filtered = conditions.filter(c =>
            String(c).toLowerCase() !== 'charmed' &&
            String(c).toLowerCase() !== 'speed_zero'
        );
        setRuntimeValue(targetName, 'activeConditions', [...filtered, 'charmed', 'speed_zero'], campaignName);

        // Track confusion targetEffect
        const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const effects = Array.isArray(targetEffects) ? [...targetEffects] : [];
        const confusionEffect = {
            target: targetName,
            effect: 'confusion',
            source: playerStats.name,
            conditions: ['charmed', 'speed_zero'],
            dc: saveDc,
            duration: 'concentration',
        };
        const existingIdx = effects.findIndex(
            te => te.target === targetName && te.effect === 'confusion'
        );
        if (existingIdx >= 0) {
            effects[existingIdx] = confusionEffect;
        } else {
            effects.push(confusionEffect);
        }
        setRuntimeValue('campaign', 'targetEffects', effects, campaignName);

        addExpiration(playerStats.name, targetName, [
            { type: 'charmed', condition: 'charmed' },
            { type: 'speed_zero', condition: 'speed_zero' },
        ], campaignName);
    }, [playerStats.name, saveDc]);

    const resolveAllSaves = useCallback(async (selectedNames) => {
        const combatSummary = getCombatSummary(campaignName);
        if (!combatSummary) return { results: [], prompts: [] };

        const results = [];
        const prompts = [];
        const casterName = playerStats.name;

        storeSpellLastAttack(campaignName, {
            casterName,
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
                        characterName: casterName,
                        targetName,
                        saveDc,
                        saveType,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal}) — Careful Spell protected`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[ConfusionModal] Error logging save result:', e); });
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
                    applyConfusionToTarget(targetName, campaignName);

                    await addEntry(campaignName, {
                        type: 'condition',
                        action: 'applied',
                        characterName: targetName,
                        condition: 'Confused',
                        dc: saveDc,
                        ability: saveType,
                        sourceName: casterName,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[ConfusionModal] Error logging condition:', e); });

                    await addEntry(campaignName, {
                        type: 'save_result',
                        characterName: casterName,
                        targetName,
                        saveDc,
                        saveType,
                        success: false,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} failed ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal})`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[ConfusionModal] Error logging save result:', e); });

                    addTargetResult(campaignName, {
                        targetName,
                        saveResult: 'failure',
                        roll: saveRoll,
                        total: saveTotal,
                        conditions: ['charmed', 'speed_zero'],
                        appliedDamage: 0,
                    });

                    results.push({
                        targetName,
                        success: false,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        conditionApplied: true,
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
                        characterName: casterName,
                        targetName,
                        saveDc,
                        saveType,
                        success: true,
                        roll: saveRoll,
                        total: saveTotal,
                        saveBonus,
                        description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${saveRoll} + ${saveBonus} = ${saveTotal})`,
                        timestamp: Date.now(),
                    }).catch((e) => { console.error('[ConfusionModal] Error logging save result:', e); });

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
                        sourceName: casterName,
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
    }, [campaignName, playerStats.name, action.name, saveDc, saveType, isCarefulSpell, isCarefulAlly, heightenTarget, applyConfusionToTarget]);

    const handleSaveResult = useCallback(async (event) => {
        const detail = event.detail;
        if (!detail || !detail.promptId) return;

        const pendingIndex = pendingPrompts.findIndex(p => p.promptId === detail.promptId);
        if (pendingIndex === -1) return;

        const targetName = pendingPrompts[pendingIndex].targetName;
        const success = detail.success;
        const casterName = playerStats.name;

        if (!success) {
            applyConfusionToTarget(targetName, campaignName);

            await addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Confused',
                reason: 'Confusion spell',
                note: `${targetName} is Confused. Can't take Bonus Actions or Reactions. Subject to 1d10 behavior each turn. End of turn: repeat WIS save (DC ${saveDc}) to end effect.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[ConfusionModal] Error logging condition:', e); });

            await addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                targetName,
                saveDc,
                saveType,
                success: false,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} failed ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[ConfusionModal] Error logging save result:', e); });

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                conditions: ['charmed', 'speed_zero'],
                appliedDamage: 0,
            });
        } else {
            await addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                targetName,
                saveDc,
                saveType,
                success: true,
                roll: detail.roll ?? 0,
                total: detail.total ?? 0,
                saveBonus: detail.saveBonus ?? 0,
                description: `${targetName} succeeded on ${saveType} save (DC ${saveDc}, rolled ${detail.roll ?? 0}${detail.saveBonus !== 0 ? ' + ' + detail.saveBonus : ''} = ${detail.total ?? 0})`,
                timestamp: Date.now(),
            }).catch((e) => { console.error('[ConfusionModal] Error logging save result:', e); });

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

        setPendingPrompts(prev => {
            const updated = prev.filter(p => p.promptId !== detail.promptId);
            if (updated.length === 0) {
                setTimeout(() => onClose(), 500);
            }
            return updated;
        });
    }, [campaignName, saveDc, saveType, pendingPrompts, applyConfusionToTarget, playerStats.name, onClose]);

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
            .map(c => ({
                ...c,
                carefulSpellProtected: isCarefulSpell && isCarefulAlly(c.name),
            }));
    }, [combatSummary, isCarefulSpell, isCarefulAlly]);

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
        }).catch((e) => { console.error('[ConfusionModal] Error logging feature use:', e); });

        const { prompts } = await resolveAllSaves(selectedNames);
        setPendingPrompts(prompts);
    }, [campaignName, playerStats.name, action.name, saveDc, saveType, resolveAllSaves]);

    const handleCreatureSelectionSkip = useCallback(() => {
        onClose();
    }, [onClose]);

    if (isOverlayTargeted && activeOverlay) {
        return (
            <React.Fragment>
                {/* Overlay targeting not implemented for Confusion - fall back to CreatureSelectionModal */}
            </React.Fragment>
        );
    }

    return (
        <CreatureSelectionModal
            title={action.name}
            icon="fa-circle-notch"
            targets={getCreatureTargets()}
            description={`Select creatures in the 10-foot-radius sphere. Each must make a <strong>${saveType}</strong> saving throw (DC ${saveDc}).`}
            note={`On a failed save, target is <strong>Confused</strong>: can't take Bonus Actions or Reactions, and is subject to confused behavior each turn (1d10 rolls: 1=move randomly, 2-6=do nothing, 7-8=Attack, 9-10=choose). End of turn: repeat WIS save (DC ${saveDc}) to end effect.${metamagicHeighten ? ' Heightened Spell: one target will have disadvantage.' : ''}`}
            confirmLabel={action.name}
            confirmIcon="fa-circle-notch"
            onConfirm={handleCreatureSelectionConfirm}
            onSkip={handleCreatureSelectionSkip}
            metamagicHeighten={metamagicHeighten}
            heightenTarget={heightenTarget}
            setHeightenTarget={setHeightenTarget}
        />
    );
}

export default ConfusionModal;
