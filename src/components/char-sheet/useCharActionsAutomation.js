import { onSpellSelected as onDivineInterventionSpellSelected } from '../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js'
import { executeSpellCast } from '../../services/rules/spells/spellCastService.js'
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js'
import { getClassFeatures } from '../../services/character/classFeatures.js'

export default function useCharActionsAutomation({
    cannotAct,
    playerStats,
    campaignName,
    mapName,
    characters,
    getRuntimeValue,
    setRuntimeValue,
    setPopupHtml,
    setModalState,
    modalState,
    rollDamage,
    rollAttack,
    executeHandler,
    addEntry,
    onBuffsChange,
}) {
    async function handleAutomationAction(action) {
        const MONK_KI_FEATURES = ['Flurry of Blows', 'Patient Defense', 'Step of the Wind', 'Heightened Flurry of Blows', 'Heightened Patient Defense', 'Heightened Step of the Wind', 'Hand of Healing', 'Stunning Strike'];
        const HAS_FLURRY_HEALING_HARM = playerStats.specialActions?.some(f => f.name === "Flurry of Healing and Harm");

        if (cannotAct) return;

        const playerName = playerStats.name;
        const activeBuffs = getRuntimeValue(playerName, 'activeBuffs', campaignName) || [];
        const cloakActive = Array.isArray(activeBuffs) && activeBuffs.some(b => b.effect === 'cloak_of_shadows');

        const auto = action.automation;

        // If feature has options that need choosing (e.g. Blessed Strikes), present choice
        if (auto?.type === 'damage_bonus' && auto?.options?.length > 0) {
            const optionKey = `_${action.name.replace(/\s+/g, '_')}_option`;
            const chosenOption = getRuntimeValue(playerStats.name, optionKey, campaignName);
            if (!chosenOption) {
                setModalState({ featureChoice: { action, options: auto.options, optionKey } });
                return;
            }
        }

        // Defensive Tactics: present choice between Escape the Horde and Multiattack Defense
        if (auto?.type === 'defensive_tactics') {
            const optionKey = `_${action.name.replace(/\s+/g, '_')}_choice`;
            const chosenOption = getRuntimeValue(playerStats.name, optionKey, campaignName);
            if (!chosenOption) {
                setModalState({ featureChoice: { action, options: ['Escape the Horde', 'Multiattack Defense'], optionKey } });
                return;
            }
        }

        // Spend 1 focus point for monk Ki features before dispatching
        // Skip FP cost for Hand of Healing and Flurry of Blows when Flurry of Healing and Harm is active
        // Skip FP cost for Flurry of Blows when Cloak of Shadows (Shadow Flurry) is active
        if (MONK_KI_FEATURES.includes(action.name)) {
            const skipFP = (HAS_FLURRY_HEALING_HARM && (action.name === 'Hand of Healing' || action.name === 'Flurry of Blows' || action.name === 'Heightened Flurry of Blows'))
                || (cloakActive && (action.name === 'Flurry of Blows' || action.name === 'Heightened Flurry of Blows'));
            if (!skipFP) {
                const classLevel = (playerStats.class?.class_levels || []).find(cl => cl.level === playerStats.level);
                const maxFP = classLevel?.focus_points || getClassFeatures(playerStats)?.maxFocusPoints || 0;
                const storedFP = getRuntimeValue(playerStats.name, 'focusPoints', campaignName);
                const currentFP = storedFP != null ? Number(storedFP) : (playerStats._trackedResources?.focusPoints?.current ?? maxFP);
                if (currentFP <= 0) {
                    setPopupHtml(`<b>${action.name}</b><br/>No ${playerStats.rules === '2024' ? "Focus Points" : 'ki points'} remaining.`);
                    return;
                }
                await setRuntimeValue(playerStats.name, 'focusPoints', currentFP - 1, campaignName);
                window.dispatchEvent(new CustomEvent('focus-points-updated'));
            }
        }

        // Check trigger conditions for gated actions
        if (auto?.trigger && auto.trigger !== '') {
            if (auto.trigger === 'after_casting_action_spell') {
                const lastCast = getRuntimeValue(playerStats.name, 'lastActionSpellCast', campaignName);
                if (!lastCast) {
                    setPopupHtml(`<b>${action.name}</b><br/>You must cast a spell with a casting time of an action first.`);
                    return;
                }
                await setRuntimeValue(playerStats.name, 'lastActionSpellCast', 0, campaignName);
            }
        }

        const result = await executeHandler(action, playerStats, campaignName, mapName, characters);
        if (!result) return;

        switch (result.type) {
            case 'popup':
                setPopupHtml(result.payload);
                break;
            case 'modal':
                switch (result.modalName) {
                    case 'healingPool': setModalState({ healingPoolModal: result.payload }); break;
                    case 'handOfHealing': setModalState({ handOfHealingModal: result.payload }); break;
                    case 'fontOfMagic': setModalState({ fontOfMagicModal: true }); break;
                    case 'resourcePool': setModalState({ resourcePoolModal: result.payload }); break;
                    case 'wildCompanion': setModalState({ wildCompanionModal: result.payload }); break;
                    case 'setCondition': setModalState({ setConditionModal: result.payload }); break;
                    case 'blindnessDeafness': setModalState({ blindnessDeafnessModal: result.payload }); break;
                    case 'eyebiteEffect': setModalState({ eyebiteEffectModal: result.payload }); break;
                    case 'attackRider': setModalState({ attackRiderModal: result.payload }); break;
                    case 'openHandTechnique': setModalState({ openHandTechniqueModal: result.payload }); break;
                    case 'shieldBash': setModalState({ shieldBashModal: result.payload }); break;
                    case 'quiveringPalm': setModalState({ quiveringPalmModal: result.payload }); break;
                    case 'combatStance': setModalState({ combatStanceModal: result.payload }); break;
                    case 'teleport': setModalState({ teleportModal: result.payload }); break;
                    case 'healingIllusion': setModalState({ healingIllusionModal: result.payload }); break;
                    case 'invokeDuplicity': setModalState({ invokeDuplicityModal: result.payload }); break;
                    case 'saveAttackHeal':
                        setModalState({ saveAttackHealModal: result.payload });
                        break;
                    case 'saveAttackAoe':
                        setModalState({ saveAttackAoeModal: result.payload });
                        break;
                    case 'aoeCondition':
                        setModalState({ aoeConditionModal: result.payload });
                        break;
                    case 'elementalAttunement': setModalState({ elementalAttunementModal: result.payload }); break;
                    case 'elementalBurst': setModalState({ elementalBurstModal: result.payload }); break;
                    case 'divineSpark': setModalState({ divineSparkModal: result.payload }); break;
                    case 'divineIntervention':
                        setModalState({ divineInterventionAction: action, divineInterventionModal: result.payload });
                        break;
                    case 'moonlightStepResource': setModalState({ moonlightStepResourceModal: result.payload }); break;
                    case 'moonlightStepFallback': setModalState({ moonlightStepFallbackModal: result.payload }); break;
                    case 'starryFormConstellation': setModalState({ starryFormConstellationModal: result.payload }); break;
                    case 'twinklingConstellation': setModalState({ twinklingConstellationModal: result.payload }); break;
                    case 'arcaneCharge': setModalState({ arcaneChargeModal: result.payload }); break;
                    case 'warMagicCantrip': setModalState({ warMagicCantripModal: result.payload }); break;
                    case 'warMagicSpell': setModalState({ warMagicSpellModal: result.payload }); break;
                    case 'sacredWeaponDamageType': setModalState({ sacredWeaponModal: result.payload }); break;
                    case 'primalCompanionBonusActionCommand': setModalState({ primalCompanionBonusActionModal: result.payload }); break;
                    case 'primalCompanionSummon': setModalState({ primalCompanionSummonModal: result.payload }); break;
                    case 'mistyWanderer': setModalState({ mistyWandererModal: result.payload }); break;
                    case 'feyReinforcements': setModalState({ feyReinforcementsModal: result.payload }); break;
                    case 'stepsOfTheFeyTaunt': setModalState({ stepsOfTheFeyTauntModal: result.payload }); break;
                    case 'bonusActionChoice': setModalState({ bonusActionChoiceModal: result.payload }); break;
                    case 'stealthAttack': setModalState({ stealthAttackModal: result.payload }); break;
                    case 'revelationInFlesh': setModalState({ revelationInFleshModal: result.payload }); break;
                    case 'bastionOfLaw': setModalState({ bastionOfLawModal: result.payload }); break;
                    case 'elementalAffinity': {
                        const affPayload = result.payload;
                        const affAction = affPayload?.action;
                        const affTypes = affPayload?.damageTypes || ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'];
                        setModalState({ elementalAffinityModal: { action: affAction, playerStats, campaignName, damageTypes: affTypes, existingType: affPayload?.existingType } });
                        break;
                    }
                    case 'fiendishResilience': {
                        const frPayload = result.payload;
                        const frAction = frPayload?.action;
                        const frTypes = frPayload?.damageTypes || ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'];
                        setModalState({ fiendishResilienceModal: { action: frAction, playerStats, campaignName, damageTypes: frTypes, existingType: frPayload?.existingType } });
                        break;
                    }
                    case 'dragonCompanion':
                        setModalState({ dragonCompanionModal: result.payload });
                        break;
                    case 'wildMagicSurge':
                        setModalState({ wildMagicSurgeModal: result.payload });
                        break;
                    case 'weaponMasteryChoice':
                        setModalState({ weaponMasteryChoiceModal: result.payload });
                        break;
                    case 'weaponKindMastery':
                        setModalState({ weaponKindMasteryModal: result.payload });
                        break;
                    case 'bendFateChoice':
                        setModalState({ bendFateModal: result.payload });
                        break;
                    case 'thirdEye':
                        setModalState({ thirdEyeModal: result.payload });
                        break;
                    case 'soulstitchSpells':
                        setModalState({ soulstitchSpellsModal: result.payload });
                        break;
                    case 'illusoryReality':
                        setModalState({ illusoryRealityModal: result.payload });
                        break;
                    case 'celestialRevelation':
                        setModalState({ celestialRevelationModal: result.payload });
                        break;
                    case 'celestialResilienceModal':
                        setModalState({ celestialResilienceModal: { ...result.payload, playerStats, campaignName } });
                        break;
                    case 'elfishLineage':
                        setModalState({ elfishLineageModal: result.payload });
                        break;
                    case 'gnomishLineage':
                        setModalState({ gnomishLineageModal: result.payload });
                        break;
                    case 'fiendishLegacy':
                        setModalState({ fiendishLegacyModal: result.payload });
                        break;
                    case 'giantAncestry':
                        setModalState({ giantAncestryModal: result.payload });
                        break;
                    case 'breathWeaponShape': {
                        const bwPayload = result.payload;
                        setModalState({ breathWeaponShapeModal: { action: bwPayload.action, playerStats, campaignName, options: bwPayload.options } });
                        break;
                    }
                    case 'hypnoticPatternShake': {
                        const shakePayload = result.payload;
                        setModalState({ hypnoticPatternShakeModal: shakePayload });
                        break;
                    }
                    case 'combatSuperiority':
                        setModalState({ combatSuperiorityModal: result.payload });
                        break;
                    case 'sweepingAttackTarget':
                        setModalState({ sweepingAttackTargetModal: result.payload });
                        break;
                    case 'baitAndSwitchChoice':
                        setModalState({ baitAndSwitchChoiceModal: result.payload });
                        break;
                    case 'bulwarkOfForceTarget':
                        setModalState({ bulwarkOfForceModal: result.payload });
                        break;
                    case 'zealousPresenceTarget':
                        setModalState({ zealousPresenceModal: result.payload });
                        break;
                    case 'clockworkCavalcade':
                        setModalState({ clockworkCavalcadeModal: result.payload });
                        break;
                    case 'naturesSanctuaryCreatures':
                        setModalState({ naturesSanctuaryCreaturesModal: result.payload });
                        break;
                    case 'coronaEnemySelection':
                        setModalState({ coronaEnemySelectionModal: result.payload });
                        break;
                    case 'radianceOfDawn':
                        setModalState({ radianceOfDawnModal: result.payload });
                        break;
                    case 'mantleOfInspirationTarget':
                        setModalState({ mantleOfInspirationTarget: result.payload });
                        break;
                    case 'vitalityOfTheTreeTarget':
                        setModalState({ vitalityOfTheTreeTarget: result.payload });
                        break;
                    case 'tricksterBlessing':
                        setModalState({ tricksterBlessingModal: result.payload });
                        break;
                    case 'bardicInspirationTarget':
                        setModalState({ bardicInspirationTargetModal: result.payload });
                        break;
                    case 'inspiringMovementAlly':
                        setModalState({ inspiringMovementAllyModal: result.payload });
                        break;
                    case 'arcaneWardRestore':
                        setModalState({ arcaneWardRestoreModal: result.payload });
                        break;
                    case 'oceanicGiftTarget':
                        setModalState({ oceanicGiftTargetModal: result.payload });
                        break;
                    case 'telepathicSpeech': {
                        const { action, creatureTargets } = result.payload;
                        setModalState({ secondaryTargetModal: {
                            title: action.name || 'Telepathic Speech',
                            icon: 'fa-brain',
                            targets: creatureTargets,
                            confirmLabel: 'Establish Link',
                            confirmIcon: 'fa-brain',
                            description: 'Choose one creature within 30 feet to communicate with telepathically.',
                            featureDescription: `Range: ${Math.max(1, playerStats.abilities?.find(a => a.name === 'Charisma')?.bonus || 1)} mile(s) | Duration: ${playerStats.level} minute(s)`,
                            onTargetSelected: async (_targetName) => {
                                // confirmTelepathicSpeech needs to be passed in
                                setModalState({ secondaryTargetModal: null });
                            },
                            onSkip: () => {
                                setModalState({ secondaryTargetModal: null });
                            },
                        }});
                        break;
                    }
                    case 'flurryOfBlows':
                        setModalState({ flurryOfBlowsModal: result.payload });
                        break;
                    case 'elementalEpitome':
                        setModalState({ epitomeModal: result.payload });
                        break;
                    case 'destructiveStride':
                        setModalState({ destructiveStrideModal: result.payload });
                        break;
                    case 'destructiveStrideTarget':
                        setModalState({ destructiveStrideTargetModal: result.payload });
                        break;
                    case 'animateDead':
                        setModalState({ animateDeadModal: result.payload });
                        break;
                    case 'createUndead':
                        setModalState({ createUndeadModal: result.payload });
                        break;
                    case 'summonSpirit':
                        setModalState({ summonSpiritModal: result.payload });
                        break;
                }
                break;
            case 'roll':
                if (result.payload.rollType === 'damage') {
                    rollDamage(
                        result.payload.name,
                        result.payload.formula,
                        result.payload.total,
                        result.payload.rolls,
                        result.payload.modifier,
                        result.payload.contextConfig || {}
                    );
                }
                break;
            case 'attack_roll':
                {
                    const { attack, targetName } = result.payload;
                    const autoDamageFormula = attack?.autoDamageFormula || null;
                    const autoDamageName = attack?.autoDamageName || attack?.name;
                    const damageType = attack?.damageType || 'Slashing';
                    rollAttack(attack.name, attack.hitBonus, { targetName, forcedMode: undefined, isOpportunityAttack: false, autoDamageFormula, autoDamageName, damageType });
                }
                break;
            case 'notify_buffs_changed':
                if (onBuffsChange) onBuffsChange();
                break;
        }

        if (result.logEntries) {
            result.logEntries.forEach(entry => addEntry(campaignName, entry).catch((e) => { console.error("[useCharActionsAutomation:log-error]", e); }));
        }

        if (result.type === 'popup' && (auto?.type === 'temp_buff' || auto?.type === 'combat_stance')) {
            if (onBuffsChange) onBuffsChange();
        }
    }

    async function handleDivineInterventionCast(selectedSpell) {
        setModalState({ divineInterventionModal: null, divineInterventionAction: null });
        const action = getRuntimeValue('charActions', 'divineInterventionAction', campaignName) || modalState?.divineInterventionAction;
        if (!action) return;

        const result = await onDivineInterventionSpellSelected(action, playerStats, campaignName, selectedSpell);
        if (!result) return;

        if (result.type === 'spell_selected') {
            const spell = result.spell;
            const getTargetInfoFn = async () => {
                const cs = await getCombatContext(campaignName);
                return cs ? getTargetFromAttacker(cs, playerStats.name) : null;
            };
            executeSpellCast(spell, {}, {
                rollAttack,
                rollDamage,
                playerStats,
                getTargetInfo: getTargetInfoFn,
                campaignName,
                mapName,
                characters,
            }).then((healResult) => {
                if (healResult?.triggerResult) {
                    const tr = healResult.triggerResult;
                    if (tr.type === 'modal') {
                        if (tr.modalName === 'wildMagicSurge') {
                            setModalState({ wildMagicSurgeModal: tr.payload });
                        }
                    } else if (tr.type === 'popup') {
                        const payload = tr.payload;
                        const name = payload?.name || spell.name || 'Automation';
                        const description = payload?.description || '';
                        setPopupHtml({
                            type: 'automation_info',
                            name,
                            description,
                        });
                    }
                }
                if (healResult && healResult.healAmount > 0) {
                    const bonusHealDetail = healResult.bonusDetails?.length > 0
                        ? healResult.bonusDetails.map(d => `${d.amount} ${d.name}`).join(', ')
                        : '';
                    const rawTotal = healResult.rawTotal ?? healResult.healAmount;
                    setPopupHtml({
                        type: 'heal',
                        name: spell.name,
                        formula: healResult.formula,
                        rolls: healResult.rolls || [],
                        total: rawTotal,
                        targetName: healResult.targetName,
                        finalHeal: healResult.healAmount,
                        bonusHeal: healResult.bonusHeal || 0,
                        bonusHealDetail,
                        healingRerollOriginalRolls: healResult.healingRerollOriginalRolls || null,
                        healingRerollDisplayRolls: healResult.healingRerollDisplayRolls || null,
                    });
                }
            }).catch((e) => { console.error('[CharActions] executeSpellCast error:', e); });

            setPopupHtml({
                type: 'automation_info',
                name: result.name,
                description: `Divine Intervention cast ${spell.name}. Divine Intervention recharges ${result.rechargeMessage}`,
            });
        }
    }

    return {
        handleAutomationAction,
        handleDivineInterventionCast,
    };
}
