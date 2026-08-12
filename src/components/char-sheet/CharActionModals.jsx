import React, { useEffect } from 'react';
import { rollExpression, rollExpressionDoubled } from '../../services/dice/diceRoller.js';
import { setSkipFlag } from '../../services/automation/common/oncePerTurn.js';
import HealingPoolModal from './modals/divine/HealingPoolModal.jsx'
import HandOfHealingModal from './modals/shared/HandOfHealingModal.jsx'
import FontOfMagicModal from './modals/FontOfMagicModal.jsx'
import ResourcePoolModal from './modals/ResourcePoolModal.jsx'
import WildCompanionModal from './modals/WildCompanionModal.jsx'
import SetConditionModal from './modals/shared/SetConditionModal.jsx'
import BlindnessDeafnessModal from './modals/BlindnessDeafnessModal.jsx'
import EyebiteEffectModal from './modals/EyebiteEffectModal.jsx'
import AttackRiderModal from './modals/shared/AttackRiderModal.jsx'
import StealthAttackModal from './modals/shared/StealthAttackModal.jsx'
import OpenHandTechniqueModal from './modals/OpenHandTechniqueModal.jsx'
import ShieldBashChoiceModal from './modals/ShieldBashChoiceModal.jsx'
import QuiveringPalmModal from './modals/QuiveringPalmModal.jsx'
import WeaponMasteryModal from './modals/WeaponMasteryModal.jsx'
import WeaponMasteryChoiceModal from './modals/WeaponMasteryChoiceModal.jsx'
import WeaponKindMasteryModal from './modals/WeaponKindMasteryModal.jsx'
import BastionOfLawModal from './modals/divine/BastionOfLawModal.jsx'
import CombatStanceModal from './modals/shared/CombatStanceModal.jsx'
import TeleportModal from './modals/TeleportModal.jsx'
import SaveAttackHealModal from './modals/shared/SaveAttackHealModal.jsx'
import SaveAttackAoeModal from './modals/shared/SaveAttackAoeModal.jsx'
import AOEConditionModal from './modals/shared/AOEConditionModal.jsx'
import FearModal from './modals/shared/FearModal.jsx'
import HypnoticPatternModal from './modals/shared/HypnoticPatternModal.jsx'
import MassSuggestionModal from './modals/shared/MassSuggestionModal.jsx'
import CalmEmotionsModal from './modals/shared/CalmEmotionsModal.jsx'
import ElementalAttunementModal from './modals/ElementalAttunementModal.jsx'
import ElementalBurstModal from './modals/ElementalBurstModal.jsx'
import DivineSparkModal from './modals/divine/DivineSparkModal.jsx'
import DivineInterventionModal from './modals/divine/DivineInterventionModal.jsx'
import ArcaneChargeModal from './modals/arcane/ArcaneChargeModal.jsx'
import WarMagicCantripModal from './modals/WarMagicCantripModal.jsx'
import WarMagicSpellModal from './modals/WarMagicSpellModal.jsx'
import SacredWeaponModal from './modals/divine/SacredWeaponModal.jsx'
import PrimalCompanionBonusActionModal from './modals/PrimalCompanionBonusActionModal.jsx'
import PrimalCompanionSummonModal from './modals/PrimalCompanionSummonModal.jsx'
import MistyWandererModal from './modals/MistyWandererModal.jsx'
import FeyReinforcementsModal from './modals/FeyReinforcementsModal.jsx'
import StepsOfTheFeyTauntModal from './modals/StepsOfTheFeyTauntModal.jsx'
import BonusActionChoiceModal from './modals/shared/BonusActionChoiceModal.jsx'
import RevelationInFleshModal from './modals/RevelationInFleshModal.jsx'
import ElementalAffinityModal from './modals/ElementalAffinityModal.jsx'
import SingleResistanceSelectionModal from './modals/SingleResistanceSelectionModal.jsx'
import DragonCompanionModal from './modals/DragonCompanionModal.jsx'
import WildMagicSurgeModal from './modals/WildMagicSurgeModal.jsx'
import BendFateModal from './modals/BendFateModal.jsx'
import ThirdEyeModal from './modals/arcane/ThirdEyeModal.jsx'
import SoulstitchSpellsModal from './modals/arcane/SoulstitchSpellsModal.jsx'
import IllusoryRealityModal from './modals/arcane/IllusoryRealityModal.jsx'
import CelestialRevelationModal from './modals/CelestialRevelationModal.jsx'
import FiendishLegacyModal from './modals/FiendishLegacyModal.jsx'
import BreathWeaponShapeModal from './modals/racial/BreathWeaponShapeModal.jsx'
import HypnoticPatternShakeModal from './modals/shared/HypnoticPatternShakeModal.jsx'
import ArcaneWardRestoreModal from './modals/arcane/ArcaneWardRestoreModal.jsx'
import MoonlightStepResourceModal from './modals/MoonlightStepResourceModal.jsx'
import ConstellationSelectionModal from './modals/ConstellationSelectionModal.jsx'
import CombatSuperiorityModal from './modals/CombatSuperiorityModal.jsx'
import AttackRiderManeuverPrompt from './modals/AttackRiderManeuverPrompt.jsx'
import SecondaryTargetModal from './modals/shared/SecondaryTargetModal.jsx'
import CreatureSelectionModal from './modals/shared/CreatureSelectionModal.jsx'
import BulwarkOfForceModal from './modals/BulwarkOfForceModal.jsx'
import ZealousPresenceModal from './modals/ZealousPresenceModal.jsx'
import CoronaEnemySelectionModal from './modals/CoronaEnemySelectionModal.jsx'
import RadianceOfDawnModal from './modals/RadianceOfDawnModal.jsx'
import MantleOfInspirationModal from './modals/MantleOfInspirationModal.jsx'
import CelestialResilienceModal from './modals/CelestialResilienceModal.jsx'
import VitalityOfTheTreeModal from './modals/VitalityOfTheTreeModal.jsx'
import InspiringSmiteModal from './modals/InspiringSmiteModal.jsx'
import RecklessAttackModal from './modals/shared/RecklessAttackModal.jsx'
import ClockworkCavalcadeModal from './modals/divine/ClockworkCavalcadeModal.jsx'
import SilenceModal from './modals/SilenceModal.jsx'
import TashasLaughterModal from './modals/shared/TashasLaughterModal.jsx'
import FlurryOfBlowsTargetPopup from './popups/FlurryOfBlowsTargetPopup.jsx'
import ElementalEpitomeModal from './modals/ElementalEpitomeModal.jsx'
import DestructiveStrideModal from './modals/DestructiveStrideModal.jsx'
import AnimateDeadModal from './modals/AnimateDeadModal.jsx'
import CreateUndeadModal from './modals/CreateUndeadModal.jsx'
import SummonSpiritModal from './modals/SummonSpiritModal.jsx'
import { confirmAnimateDead } from '../../services/automation/handlers/spells/animateDeadHandler.js'
import { confirmCreateUndead } from '../../services/automation/handlers/spells/createUndeadHandler.js'
import { confirmSummonSpirit } from '../../services/automation/handlers/spells/summonSpiritHandler.js'
import { handleApply } from '../../services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js'
import { applyResistanceChoice } from '../../services/automation/handlers/combat/elementalEpitomeHandler.js'
import { applyDamageTypeChoice, applyTargetChoice, skipTargetChoice } from '../../services/automation/handlers/combat/destructiveStrideHandler.js'
import { applyStarryChaliceHeal } from '../../services/rules/spells/postCastHealService.js'
import { getCombatContext } from '../../services/rules/combat/damageUtils.js'
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { sanitizeHtml } from '../../services/ui/sanitize.js'
import { logHealingToSSE } from '../../services/automation/common/healingRoll.js'
import { addEntry } from '../../services/ui/logService.js'
import InlineChoiceModals from './modals/InlineChoiceModals.jsx'
import SecondaryTargetModals from './modals/SecondaryTargetModals.jsx'
import HealingModals from './modals/HealingModals.jsx'

function CharActionModals({
    playerStats,
    campaignName,
    characters,
    _rollSkillCheck,
    _rollAbilityCheck,
    modalState,
    spellModalState,
    setModalState,
    setSpellModalState,
    combatSuperiorityModal, setCombatSuperiorityModal,
    handleCombatSuperiorityConfirm,
    handleAttackRiderManeuverUse,
    handleAttackRiderManeuverSkip,
    handleAttackRiderOptionSelect,
    handleSweepingAttackConfirm,
    handleBaitAndSwitchChoiceConfirm,
    handleCommanderStrikeChoiceConfirm,
    handleRallyChoiceConfirm,
    handleBulwarkOfForceConfirm,
    handleZealousPresenceConfirm,
    handleNaturesSanctuaryConfirm,
    handleCoronaEnemySelectionConfirm,
    handleRadianceOfDawnConfirm,
    handleMantleOfInspirationConfirm,
    handleCelestialResilienceConfirm,
    handleCelestialResilienceSkip,
    handleVitalityOfTheTreeConfirm,
    handleInspiringSmiteConfirm,
    handleTricksterBlessingConfirm,
    handleBardicInspirationConfirm,
    handleInspiringMovementConfirm,
    handleOceanicGiftConfirm,
    handleDivineInterventionCast,
    pendingDamage,
    buildCtx,
    buildCtxSync,
    autoDamageContext,
    rollDamage,
    setPopupHtml,
    mapName,
    handleMasteryClose,
    handleWeaponMasteryChoice,
    handleWeaponKindMasteryClose,
    handleDivineFuryDamageType,
    handleDivineFurySkip,
    handleGenericDamageTypeChoice,
    handleGenericDamageTypeSkip,
    handleDamageTypeModifierChoice,
    handleDamageTypeModifierSkip,
    handleEnhancedUnarmedChoice,
    handleEnhancedUnarmedSkip,
    handleFeatureChoiceConfirm,
    handleFeatureChoiceSkip,
    handleConstellationSelect,
    handleRecklessAttackConfirm,
    handleRecklessAttackCancel,
    handleBrutalStrikeConfirm,
    handleBrutalStrikeCancel,
    handleMassHealConfirm,
    handleClockworkCavalcadeHealConfirm,
    handleClockworkCavalcadeDispelConfirm,
    handleClockworkCavalcadeRepairConfirm,
    handleMassCureWoundsConfirm,
    handlePrayerOfHealingConfirm,
    handlePowerWordFortifyConfirm,
    handleMassHealingWordConfirm,
    handleFlurryOfBlowsConfirm,
    handleOpenHandFromFlurryConfirm,
    handleOpenHandFromFlurrySkip,
}) {
    const [combatSummary, setCombatSummary] = React.useState(null);
    const mergedModalState = React.useMemo(() => {
        const result = { ...modalState, ...spellModalState };
        return result;
    }, [modalState, spellModalState]);

    useEffect(() => {
        getCombatContext(campaignName).then(cs => {
            if (cs) setCombatSummary(cs);
        });
    }, [campaignName]);

    const handleClockworkCavalcadeChoice = React.useCallback((choice) => {
        const choiceModal = mergedModalState.clockworkCavalcadeModal;
        if (!choiceModal) return;
        setModalState({ clockworkCavalcadeModal: null });
        if (choice === 'heal') {
            setModalState({ clockworkCavalcadeHealModal: choiceModal });
        } else if (choice === 'dispel') {
            setModalState({ clockworkCavalcadeDispelModal: choiceModal });
        } else if (choice === 'repair') {
            setModalState({ clockworkCavalcadeRepairModal: choiceModal });
        }
    }, [mergedModalState.clockworkCavalcadeModal, setModalState]);

    const handleStarryChaliceConfirm = async (targetName) => {
        setModalState({ starryChaliceHealModal: null });
        const result = await applyStarryChaliceHeal(targetName, campaignName);
        if (result) {
            setPopupHtml({
                type: 'heal',
                name: 'Starry Form: Chalice',
                formula: `${mergedModalState.starryChaliceHealModal.amount} HP`,
                rolls: [],
                total: mergedModalState.starryChaliceHealModal.amount,
                targetName: result.targetName,
                finalHeal: result.actualHeal,
            });
        }
    };

    const handleEpitomeConfirm = async (chosenType) => {
        setModalState({ epitomeModal: null });
        const result = await applyResistanceChoice(mergedModalState.epitomeModal?.action, playerStats, campaignName, chosenType);
        if (result?.payload) {
            setPopupHtml(result.payload);
        }
    };

    const handleDestructiveStrideConfirm = async (chosenType) => {
        setModalState({ destructiveStrideModal: null });
        const result = await applyDamageTypeChoice(mergedModalState.destructiveStrideModal?.action, playerStats, campaignName, chosenType);
        if (result?.type === 'modal') {
            setModalState({ destructiveStrideTargetModal: result.payload });
        } else if (result?.payload) {
            setPopupHtml(result.payload);
        }
    };

    const handleDestructiveStrideTargetConfirm = async (targetName) => {
        const payload = mergedModalState.destructiveStrideTargetModal;
        setModalState({ destructiveStrideTargetModal: null });
        const result = await applyTargetChoice(payload?.action, playerStats, campaignName, targetName, payload?.chosenType, payload?.martialArtsDie);
        if (result?.payload) {
            setPopupHtml(result.payload);
        }
    };

    const handleDestructiveStrideTargetSkip = async () => {
        const payload = mergedModalState.destructiveStrideTargetModal;
        setModalState({ destructiveStrideTargetModal: null });
        const result = await skipTargetChoice(payload?.action, playerStats, campaignName);
        if (result?.payload) {
            setPopupHtml(result.payload);
        }
    };

    const handleHealingIllusionConfirm = async (targetName, payload, characters, campaignName, combatSummary, onClose) => {
        const { action, playerStats } = payload;
        const casterName = playerStats.name;
        const stored = getRuntimeValue(casterName, 'activeBuffs', campaignName);
        const activeBuffs = Array.isArray(stored) ? stored : [];
        const newBuffs = activeBuffs.filter(b => b.name !== action.name);
        setRuntimeValue(casterName, 'activeBuffs', newBuffs, campaignName);
        const healAmount = playerStats.level || 1;
        const maxHp = targetName === playerStats.name
            ? playerStats.hitPoints
            : (Number(getRuntimeValue(targetName, 'hitPoints', campaignName)) || findCreatureMaxHp(targetName, combatSummary, characters) || 0);
        const currentHp = Number(getRuntimeValue(targetName, 'currentHitPoints', campaignName)) || findCreatureCurrentHp(targetName, combatSummary) || 0;
        const newHp = Math.min(maxHp, currentHp + healAmount);
        await setRuntimeValue(targetName, 'currentHitPoints', newHp, campaignName);
        logHealingToSSE(campaignName, {
            targetName,
            sourceName: action.name,
            actualHeal: newHp - currentHp,
            newHp,
            maxHp,
            healingName: 'Healing Illusion',
        });
        onClose();
    };

    const findCreatureMaxHp = (targetName, combatSummary, characters) => {
        const creature = combatSummary?.creatures?.find(c => c.name === targetName);
        if (creature?.maxHp) return creature.maxHp;
        const char = characters?.find(c => c.name === targetName);
        return char?.maxHp;
    };

    const findCreatureCurrentHp = (targetName, combatSummary) => {
        const creature = combatSummary?.creatures?.find(c => c.name === targetName);
        return creature?.currentHp;
    };

    const buildHealingIllusionTargets = () => {
        const allCreatures = [...(characters || []), ...(combatSummary?.creatures || [])];
        const names = new Set(allCreatures.map(c => c.name));
        const result = Array.from(names)
            .map(name => {
                const creature = allCreatures.find(c => c.name === name);
                return { name: creature.name, type: creature.type, size: creature.size, currentHp: creature.currentHp, maxHp: creature.maxHp };
            });
        return result;
    };

    const buildInvokeDuplicityTargets = () => {
        const allCreatures = [...(characters || []), ...(combatSummary?.creatures || [])];
        const names = new Set(allCreatures.map(c => c.name));
        const result = Array.from(names)
            .map(name => {
                const creature = allCreatures.find(c => c.name === name);
                return { name: creature.name, type: creature.type, currentHp: creature.currentHp, maxHp: creature.maxHp };
            });
        return result;
    };

    const handleInvokeDuplicityConfirm = async (selectedAllyNames, payload, campaignName, onClose) => {
        const { playerStats } = payload;
        if (selectedAllyNames.length === 0) {
            onClose();
            return;
        }
        await setRuntimeValue(playerStats.name, 'invokeDuplicityAdvantageTargets', selectedAllyNames, campaignName);
        await addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Improved Duplicity',
            description: `${playerStats.name} used Improved Duplicity, granting Advantage to ${selectedAllyNames.join(', ')}.`,
        }).catch(() => {});
        window.dispatchEvent(new CustomEvent('buffs-updated'));
        onClose();
    };

    const handleAttackRiderClose = async () => {
        const modalAction = mergedModalState.attackRiderModal?.action;
        const modalPlayerStats = mergedModalState.attackRiderModal?.playerStats;
        const modalCampaignName = mergedModalState.attackRiderModal?.campaignName;
        setModalState({ attackRiderModal: null });
        window.dispatchEvent(new CustomEvent('target-effects-updated'));
        if (modalAction?.name === "Stalker's Flurry") {
            const optKey = `_${modalAction.name.replace(/\s+/g, '_')}_option`;
            const chosen = getRuntimeValue(modalPlayerStats.name, optKey, modalCampaignName);
            if (!chosen) {
                const skipKey = `_${modalAction.name.replace(/\s+/g, '_')}_skippedRound`;
                await setSkipFlag(skipKey, modalPlayerStats, modalCampaignName);
            }
        }
        const isCunningStrikeVariant = ['Cunning Strike', 'Improved Cunning Strike', 'Devious Strikes'].includes(modalAction?.name);
        if (isCunningStrikeVariant) {
            const costUsed = getRuntimeValue(modalPlayerStats.name, '_cunningStrikeCostUsed', modalCampaignName);
            if (!costUsed || costUsed === 0) {
                if (autoDamageContext?.current) {
                    const ctx = autoDamageContext.current;
                    const sneakAttackDice = ctx.sneakAttackDice || 0;
                    let formula = ctx.formula;
                    let total = ctx.total;
                    let rolls = ctx.rolls;
                    if (sneakAttackDice > 0) {
                        const sneakFormula = `${sneakAttackDice}d6`;
                        const sneakResult = ctx.context?.isAutoCrit ? rollExpressionDoubled(sneakFormula) : rollExpression(sneakFormula);
                        if (sneakResult) {
                            formula += ` + ${sneakFormula} [Sneak Attack]`;
                            total += sneakResult.total;
                            rolls = [...rolls, ...sneakResult.rolls];
                        }
                    }
                    setPopupHtml(null);
                    rollDamage(ctx.attackName, formula, total, rolls, ctx.modifier, ctx.context);
                    autoDamageContext.current = null;
                }
            } else if (autoDamageContext) {
                const ctx = autoDamageContext.current;
                if (ctx) {
                    const cunningStrikeCost = Number(getRuntimeValue(modalPlayerStats.name, '_cunningStrikeCostUsed', modalCampaignName) ?? 0);
                    const effectiveSneakDice = Math.max(0, ctx.sneakAttackDice - cunningStrikeCost);
                    let formula = ctx.formula;
                    let total = ctx.total;
                    let rolls = ctx.rolls;
                    if (effectiveSneakDice > 0) {
                        const sneakFormula = `${effectiveSneakDice}d6`;
                        const sneakResult = ctx.context?.isAutoCrit ? rollExpressionDoubled(sneakFormula) : rollExpression(sneakFormula);
                        if (sneakResult) {
                            formula += ` + ${sneakFormula} [Sneak Attack]`;
                            total += sneakResult.total;
                            rolls = [...rolls, ...sneakResult.rolls];
                        }
                    }
                    setPopupHtml(null);
                    rollDamage(ctx.attackName, formula, total, rolls, ctx.modifier, ctx.context);
                    autoDamageContext.current = null;
                }
            } else if (pendingDamage?._cunningStrike) {
                const pending = pendingDamage;
                const { attack } = pending;
                pendingDamage = null;
                (mapName ? buildCtx(attack) : buildCtxSync(attack)).then(ctx => {
                    const sneakAttackDice = ctx?.sneakAttackDice || 0;
                    const cunningStrikeCost = Number(getRuntimeValue(playerStats.name, '_cunningStrikeCostUsed', campaignName) ?? 0);
                    const effectiveSneakDice = Math.max(0, sneakAttackDice - cunningStrikeCost);
                    const wasCrit = pending.popupHtml?.isCrit;
                    const baseResult = rollExpression(attack.damage);
                    if (!baseResult) return;
                    let formula = attack.damage;
                    let total = baseResult.total;
                    let rolls = baseResult.rolls;
                    const modifier = baseResult.modifier;
                    if (effectiveSneakDice > 0) {
                        const sneakFormula = `${effectiveSneakDice}d6`;
                        const sneakResult = wasCrit ? rollExpressionDoubled(sneakFormula) : rollExpression(sneakFormula);
                        if (sneakResult) {
                            formula += ` + ${sneakFormula} [Sneak Attack]`;
                            total += sneakResult.total;
                            rolls = [...rolls, ...sneakResult.rolls];
                        }
                    }
                    setPopupHtml(null);
                    rollDamage(attack.name, formula, total, rolls, modifier, ctx);
                }).catch((e) => { console.error("[CharActionModals] Error:", e); });
            }
        }
    };

    return (
        <>
            {mergedModalState.healingPoolModal && (
                <HealingPoolModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    name={mergedModalState.healingPoolModal.name}
                    poolMax={mergedModalState.healingPoolModal.pool}
                    poolExpression={mergedModalState.healingPoolModal.poolExpression}
                    isDicePool={mergedModalState.healingPoolModal.isDicePool}
                    dieType={mergedModalState.healingPoolModal.dieType}
                    resourceKey={mergedModalState.healingPoolModal.resourceKey}
                    alsoCures={mergedModalState.healingPoolModal.alsoCures}
                    cureCost={mergedModalState.healingPoolModal.cureCost}
                    bloodiedOnly={mergedModalState.healingPoolModal.bloodiedOnly}
                    restoringTouchConditions={mergedModalState.healingPoolModal.restoringTouchConditions}
                    maxDicePerUse={mergedModalState.healingPoolModal.maxDicePerUse}
                    creatureTargets={mergedModalState.healingPoolModal.creatureTargets}
                    onClose={() => setModalState({ healingPoolModal: null })}
                />
            )}
            {mergedModalState.handOfHealingModal && (
                <HandOfHealingModal
                    {...mergedModalState.handOfHealingModal}
                    campaignName={campaignName}
                    onClose={() => setModalState({ handOfHealingModal: null })}
                />
            )}
            {mergedModalState.fontOfMagicModal && (
                <FontOfMagicModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setModalState({ fontOfMagicModal: null })}
                />
            )}
            {mergedModalState.resourcePoolModal && (
                <ResourcePoolModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    automation={mergedModalState.resourcePoolModal.automation}
                    onClose={() => setModalState({ resourcePoolModal: null })}
                />
            )}
            {mergedModalState.moonlightStepResourceModal && (
                <MoonlightStepResourceModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    automation={mergedModalState.moonlightStepResourceModal.automation}
                    onClose={() => setModalState({ moonlightStepResourceModal: null })}
                />
            )}
            {mergedModalState.wildCompanionModal && (
                <WildCompanionModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setModalState({ wildCompanionModal: null })}
                />
            )}
            {mergedModalState.setConditionModal && (
                <SetConditionModal
                    {...mergedModalState.setConditionModal}
                    characters={characters}
                    onClose={() => setModalState({ setConditionModal: null })}
                />
            )}
            {mergedModalState.blindnessDeafnessModal && (
                <BlindnessDeafnessModal
                    {...mergedModalState.blindnessDeafnessModal}
                    characters={characters}
                    onClose={() => setModalState({ blindnessDeafnessModal: null })}
                />
            )}
            {mergedModalState.eyebiteEffectModal && (
                <EyebiteEffectModal
                    {...mergedModalState.eyebiteEffectModal}
                    characters={characters}
                    onClose={() => setModalState({ eyebiteEffectModal: null })}
                />
            )}
            {mergedModalState.attackRiderModal && (
                <AttackRiderModal
                    {...mergedModalState.attackRiderModal}
                    onClose={handleAttackRiderClose}
                />
            )}
            {mergedModalState.openHandTechniqueModal && (
                <OpenHandTechniqueModal
                    {...mergedModalState.openHandTechniqueModal}
                    onClose={() => { setModalState({ openHandTechniqueModal: null }); window.dispatchEvent(new CustomEvent('target-effects-updated')); window.dispatchEvent(new CustomEvent('combat-summary-updated')); }}
                />
            )}
            {mergedModalState.shieldBashModal && (
                <ShieldBashChoiceModal
                    {...mergedModalState.shieldBashModal}
                    onClose={() => { setModalState({ shieldBashModal: null }); window.dispatchEvent(new CustomEvent('target-effects-updated')); window.dispatchEvent(new CustomEvent('combat-summary-updated')); }}
                />
            )}
            {mergedModalState.quiveringPalmModal && (
                <QuiveringPalmModal
                    {...mergedModalState.quiveringPalmModal}
                    onClose={() => { setModalState({ quiveringPalmModal: null }); window.dispatchEvent(new CustomEvent('target-effects-updated')); window.dispatchEvent(new CustomEvent('combat-summary-updated')); }}
                />
            )}
            {mergedModalState.openHandFromFlurry && (
                <OpenHandTechniqueModal
                    action={mergedModalState.openHandFromFlurry.targets[mergedModalState.openHandFromFlurry.currentIndex]?.action}
                    playerStats={mergedModalState.openHandFromFlurry.targets[mergedModalState.openHandFromFlurry.currentIndex]?.playerStats}
                    campaignName={mergedModalState.openHandFromFlurry.targets[mergedModalState.openHandFromFlurry.currentIndex]?.campaignName}
                    targetName={mergedModalState.openHandFromFlurry.targets[mergedModalState.openHandFromFlurry.currentIndex]?.targetName}
                    saveDc={mergedModalState.openHandFromFlurry.saveDc}
                    onClose={() => { handleOpenHandFromFlurrySkip(); window.dispatchEvent(new CustomEvent('target-effects-updated')); window.dispatchEvent(new CustomEvent('combat-summary-updated')); }}
                    onConfirm={(optionName) => { handleOpenHandFromFlurryConfirm({ optionName }); window.dispatchEvent(new CustomEvent('target-effects-updated')); window.dispatchEvent(new CustomEvent('combat-summary-updated')); }}
                />
            )}
            {mergedModalState.weaponMasteryModal && (
                <WeaponMasteryModal
                    {...mergedModalState.weaponMasteryModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    targetName={null}
                    onClose={handleMasteryClose}
                />
            )}
            {mergedModalState.weaponMasteryChoiceModal && (
                <WeaponMasteryChoiceModal
                    {...mergedModalState.weaponMasteryChoiceModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => { setModalState({ weaponMasteryChoiceModal: null }); }}
                    onConfirm={handleWeaponMasteryChoice}
                />
            )}
            {mergedModalState.weaponKindMasteryModal && (
                <WeaponKindMasteryModal
                    {...mergedModalState.weaponKindMasteryModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={handleWeaponKindMasteryClose}
                />
            )}
            {mergedModalState.combatStanceModal && (
                <CombatStanceModal
                    {...mergedModalState.combatStanceModal}
                    onClose={() => { setModalState({ combatStanceModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); }}
                />
            )}
            {mergedModalState.revelationInFleshModal && (
                <RevelationInFleshModal
                    {...mergedModalState.revelationInFleshModal}
                    onClose={() => { setModalState({ revelationInFleshModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); }}
                />
            )}
            {mergedModalState.bastionOfLawModal && (
                <BastionOfLawModal
                    {...mergedModalState.bastionOfLawModal}
                    campaignName={campaignName}
                    onConfirm={async (spAmount, selectedTargetName) => {
                        const action = { name: mergedModalState.bastionOfLawModal.featureName, automation: mergedModalState.bastionOfLawModal.auto };
                        const result = await handleApply(action, playerStats, campaignName, spAmount, selectedTargetName);
                        if (result?.payload) {
                            setPopupHtml(result.payload);
                        }
                        setModalState({ bastionOfLawModal: null });
                    }}
                    onClose={() => setModalState({ bastionOfLawModal: null })}
                />
            )}
            {mergedModalState.teleportModal && (
                <TeleportModal
                    {...mergedModalState.teleportModal}
                    onClose={() => { setModalState({ teleportModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); }}
                    isMoonlightStep={mergedModalState.teleportModal.action?.automation?.effect === 'moonlight_step_teleport'}
                />
            )}
            {mergedModalState.healingIllusionModal && (
                <SecondaryTargetModal
                    title="Healing Illusion"
                    targets={buildHealingIllusionTargets()}
                    description={`The illusion has ended. Choose a creature within 5 feet to regain ${playerStats.level || 1} HP:`}
                    onTargetSelected={(targetName) => handleHealingIllusionConfirm(targetName, mergedModalState.healingIllusionModal, characters, campaignName, combatSummary, () => { setModalState({ healingIllusionModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); })}
                    onSkip={() => { setModalState({ healingIllusionModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); }}
                    confirmLabel="Heal"
                    confirmIcon="fa-heart"
                    showHp={true}
                    showSize={false}
                />
            )}
            {mergedModalState.invokeDuplicityModal && (
                <CreatureSelectionModal
                    title="Improved Duplicity — Choose Allies"
                    icon="fa-people-arrows"
                    targets={buildInvokeDuplicityTargets()}
                    description="When you and your illusion are within 5 feet of a creature, your allies have Advantage on attack rolls against that creature."
                    note="Select all allies who should gain Advantage from the Improved Duplicity."
                    confirmLabel="Grant Advantage"
                    confirmIcon="fa-shield-halved"
                    onConfirm={(selected) => handleInvokeDuplicityConfirm(selected, mergedModalState.invokeDuplicityModal, campaignName, () => { setModalState({ invokeDuplicityModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); })}
                    onSkip={() => { setModalState({ invokeDuplicityModal: null }); window.dispatchEvent(new CustomEvent('buffs-updated')); }}
                />
            )}
            {mergedModalState.saveAttackHealModal && (
                <SaveAttackHealModal
                    {...mergedModalState.saveAttackHealModal}
                    onClose={() => setModalState({ saveAttackHealModal: null })}
                />
            )}
            {mergedModalState.saveAttackAoeModal && (
                <SaveAttackAoeModal
                    {...mergedModalState.saveAttackAoeModal}
                    onClose={() => setModalState({ saveAttackAoeModal: null })}
                />
            )}
            {mergedModalState.aoeConditionModal && (
                <AOEConditionModal
                    {...mergedModalState.aoeConditionModal}
                    onClose={() => setModalState({ aoeConditionModal: null })}
                />
            )}
            {mergedModalState.fearModal && (
                <FearModal
                    {...mergedModalState.fearModal}
                    onClose={() => setModalState({ fearModal: null })}
                />
            )}
            {mergedModalState.hypnoticPatternModal && (
                <HypnoticPatternModal
                    {...mergedModalState.hypnoticPatternModal}
                    onClose={() => setModalState({ hypnoticPatternModal: null })}
                />
            )}
            {mergedModalState.tashasLaughterModal && (
                <TashasLaughterModal
                    {...mergedModalState.tashasLaughterModal}
                    onClose={() => setModalState({ tashasLaughterModal: null })}
                    setPopupHtml={setPopupHtml}
                />
            )}
            {mergedModalState.silenceModal && (
                <SilenceModal
                    {...mergedModalState.silenceModal}
                    onClose={() => setModalState({ silenceModal: null })}
                />
            )}
            {mergedModalState.massSuggestionModal && (
                <MassSuggestionModal
                    {...mergedModalState.massSuggestionModal}
                    onClose={() => setModalState({ massSuggestionModal: null })}
                />
            )}
            {mergedModalState.calmEmotionsModal && (
                <CalmEmotionsModal
                    {...mergedModalState.calmEmotionsModal}
                    onClose={() => setModalState({ calmEmotionsModal: null })}
                />
            )}
            {mergedModalState.elementalAttunementModal && (
                <ElementalAttunementModal
                    {...mergedModalState.elementalAttunementModal}
                    onClose={() => setModalState({ elementalAttunementModal: null })}
                />
            )}
            {mergedModalState.elementalBurstModal && (
                <ElementalBurstModal
                    {...mergedModalState.elementalBurstModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setModalState({ elementalBurstModal: null })}
                />
            )}
            {mergedModalState.divineSparkModal && (
                <DivineSparkModal
                    {...mergedModalState.divineSparkModal}
                    playerStats={playerStats}
                    onClose={() => setModalState({ divineSparkModal: null })}
                />
            )}
            {mergedModalState.divineInterventionModal && (
                <DivineInterventionModal
                    {...mergedModalState.divineInterventionModal}
                    onSelect={handleDivineInterventionCast}
                    onClose={() => {
                        setModalState({ divineInterventionModal: null, divineInterventionAction: null });
                    }}
                />
            )}
            {mergedModalState.arcaneChargeModal && (
                <ArcaneChargeModal
                    {...mergedModalState.arcaneChargeModal}
                    onClose={() => setModalState({ arcaneChargeModal: null })}
                />
            )}
            {mergedModalState.warMagicCantripModal && (
                <WarMagicCantripModal
                    {...mergedModalState.warMagicCantripModal}
                    onClose={() => setModalState({ warMagicCantripModal: null })}
                />
            )}
            {mergedModalState.warMagicSpellModal && (
                <WarMagicSpellModal
                    {...mergedModalState.warMagicSpellModal}
                    onClose={() => setModalState({ warMagicSpellModal: null })}
                />
            )}
            {mergedModalState.sacredWeaponModal && (
                <SacredWeaponModal
                    {...mergedModalState.sacredWeaponModal}
                    onClose={() => setModalState({ sacredWeaponModal: null })}
                />
            )}
            {mergedModalState.primalCompanionBonusActionModal && (
                <PrimalCompanionBonusActionModal
                    {...mergedModalState.primalCompanionBonusActionModal}
                    onClose={() => setModalState({ primalCompanionBonusActionModal: null })}
                />
            )}
            {mergedModalState.primalCompanionSummonModal && (
                <PrimalCompanionSummonModal
                    {...mergedModalState.primalCompanionSummonModal}
                    onClose={() => setModalState({ primalCompanionSummonModal: null })}
                />
            )}
            {mergedModalState.mistyWandererModal && (
                <MistyWandererModal
                    {...mergedModalState.mistyWandererModal}
                    onClose={() => setModalState({ mistyWandererModal: null })}
                />
            )}
            {mergedModalState.feyReinforcementsModal && (
                <FeyReinforcementsModal
                    {...mergedModalState.feyReinforcementsModal}
                    onClose={() => setModalState({ feyReinforcementsModal: null })}
                />
            )}
            {mergedModalState.stepsOfTheFeyTauntModal && (
                <StepsOfTheFeyTauntModal
                    {...mergedModalState.stepsOfTheFeyTauntModal}
                    onClose={() => setModalState({ stepsOfTheFeyTauntModal: null })}
                />
            )}
            {mergedModalState.bonusActionChoiceModal && (
                <BonusActionChoiceModal
                    action={mergedModalState.bonusActionChoiceModal.action}
                    options={mergedModalState.bonusActionChoiceModal.options}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setModalState({ bonusActionChoiceModal: null })}
                />
            )}
            {mergedModalState.stealthAttackModal && (
                <StealthAttackModal
                    {...mergedModalState.stealthAttackModal}
                    onClose={() => setModalState({ stealthAttackModal: null })}
                />
            )}
            {mergedModalState.elementalAffinityModal && (
                <ElementalAffinityModal
                    {...mergedModalState.elementalAffinityModal}
                    onClose={() => setModalState({ elementalAffinityModal: null })}
                />
            )}
            {mergedModalState.fiendishResilienceModal && (
                <SingleResistanceSelectionModal
                    {...mergedModalState.fiendishResilienceModal}
                    onClose={() => setModalState({ fiendishResilienceModal: null })}
                />
            )}
            {mergedModalState.dragonCompanionModal && (
                <DragonCompanionModal
                    {...mergedModalState.dragonCompanionModal}
                    onClose={() => setModalState({ dragonCompanionModal: null })}
                />
            )}
            {mergedModalState.wildMagicSurgeModal && (
                <WildMagicSurgeModal
                    {...mergedModalState.wildMagicSurgeModal}
                    onClose={() => {
                        setModalState({ wildMagicSurgeModal: null });
                        if (setSpellModalState) {
                            setSpellModalState({ wildMagicSurgeModal: null });
                        }
                    }}
                />
            )}
            {mergedModalState.bendFateModal && (
                <BendFateModal
                    {...mergedModalState.bendFateModal}
                    onClose={() => setModalState({ bendFateModal: null })}
                />
            )}
            {mergedModalState.thirdEyeModal && (
                <ThirdEyeModal
                    action={mergedModalState.thirdEyeModal.action}
                    playerStats={mergedModalState.thirdEyeModal.playerStats}
                    campaignName={mergedModalState.thirdEyeModal.campaignName}
                    onClose={() => setModalState({ thirdEyeModal: null })}
                />
            )}
            {mergedModalState.soulstitchSpellsModal && (
                <SoulstitchSpellsModal
                    {...mergedModalState.soulstitchSpellsModal}
                    onClose={() => setModalState({ soulstitchSpellsModal: null })}
                />
            )}
            {mergedModalState.illusoryRealityModal && (
                <IllusoryRealityModal
                    {...mergedModalState.illusoryRealityModal}
                    onClose={() => setModalState({ illusoryRealityModal: null })}
                />
            )}
            {mergedModalState.celestialRevelationModal && (
                <CelestialRevelationModal
                    {...mergedModalState.celestialRevelationModal}
                    onClose={() => setModalState({ celestialRevelationModal: null })}
                    onSetConditionModal={setModalState}
                />
            )}
            {mergedModalState.fiendishLegacyModal && (
                <FiendishLegacyModal
                    {...mergedModalState.fiendishLegacyModal}
                    onClose={() => setModalState({ fiendishLegacyModal: null })}
                />
            )}
            {mergedModalState.breathWeaponShapeModal && (
                <BreathWeaponShapeModal
                    {...mergedModalState.breathWeaponShapeModal}
                    onClose={() => setModalState({ breathWeaponShapeModal: null })}
                />
            )}
            {mergedModalState.hypnoticPatternShakeModal && (
                <HypnoticPatternShakeModal
                    {...mergedModalState.hypnoticPatternShakeModal}
                    onClose={() => setModalState({ hypnoticPatternShakeModal: null })}
                />
            )}
            {mergedModalState.arcaneWardRestoreModal && (
                <ArcaneWardRestoreModal
                    {...mergedModalState.arcaneWardRestoreModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setModalState({ arcaneWardRestoreModal: null })}
                />
            )}
            {combatSuperiorityModal && (
                <CombatSuperiorityModal
                    {...combatSuperiorityModal}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onClose={() => setCombatSuperiorityModal(null)}
                    onConfirm={handleCombatSuperiorityConfirm}
                />
            )}
            {mergedModalState.attackRiderManeuverPrompt && (
                <AttackRiderManeuverPrompt
                    maneuvers={mergedModalState.attackRiderManeuverPrompt.maneuvers}
                    attack={mergedModalState.attackRiderManeuverPrompt.attack}
                    popupHtml={mergedModalState.attackRiderManeuverPrompt.popupHtml}
                    isMiss={mergedModalState.attackRiderManeuverPrompt.isMiss}
                    onUse={handleAttackRiderManeuverUse}
                    onSkip={handleAttackRiderManeuverSkip}
                />
            )}
            {mergedModalState.starryFormConstellationModal && (
                <ConstellationSelectionModal
                    action={mergedModalState.starryFormConstellationModal.action}
                    playerStats={mergedModalState.starryFormConstellationModal.playerStats}
                    campaignName={mergedModalState.starryFormConstellationModal.campaignName}
                    isTwinkled={mergedModalState.starryFormConstellationModal.playerStats?.level >= 10}
                    onConfirm={(option) => handleConstellationSelect(mergedModalState.starryFormConstellationModal, option)}
                    onClose={() => setModalState({ starryFormConstellationModal: null })}
                />
            )}
            {mergedModalState.twinklingConstellationModal && (
                <ConstellationSelectionModal
                    action={mergedModalState.twinklingConstellationModal.action}
                    playerStats={mergedModalState.twinklingConstellationModal.playerStats}
                    campaignName={mergedModalState.twinklingConstellationModal.campaignName}
                    isTwinkled={true}
                    onConfirm={(option) => handleConstellationSelect(mergedModalState.twinklingConstellationModal, option)}
                    onClose={() => setModalState({ twinklingConstellationModal: null })}
                />
            )}
            {mergedModalState.bulwarkOfForceModal && (
                <BulwarkOfForceModal
                    targets={mergedModalState.bulwarkOfForceModal.creatureTargets}
                    maxTargets={mergedModalState.bulwarkOfForceModal.maxTargets}
                    onConfirm={handleBulwarkOfForceConfirm}
                    onSkip={() => setModalState({ bulwarkOfForceModal: null })}
                />
            )}
            {mergedModalState.zealousPresenceModal && (
                <ZealousPresenceModal
                    targets={mergedModalState.zealousPresenceModal.creatureTargets}
                    maxTargets={mergedModalState.zealousPresenceModal.maxTargets}
                    onConfirm={handleZealousPresenceConfirm}
                    onSkip={() => setModalState({ zealousPresenceModal: null })}
                />
            )}
            {mergedModalState.coronaEnemySelectionModal && (
                <CoronaEnemySelectionModal
                    creatureTargets={mergedModalState.coronaEnemySelectionModal.creatureTargets}
                    onConfirm={handleCoronaEnemySelectionConfirm}
                    onSkip={() => setModalState({ coronaEnemySelectionModal: null })}
                />
            )}
            {mergedModalState.radianceOfDawnModal && (
                <RadianceOfDawnModal
                    creatureTargets={mergedModalState.radianceOfDawnModal.creatureTargets}
                    saveType={mergedModalState.radianceOfDawnModal.saveType}
                    saveDc={mergedModalState.radianceOfDawnModal.saveDc}
                    damageExpression={mergedModalState.radianceOfDawnModal.damageExpression}
                    damageType={mergedModalState.radianceOfDawnModal.damageType}
                    rangeFeet={mergedModalState.radianceOfDawnModal.rangeFeet}
                    onConfirm={handleRadianceOfDawnConfirm}
                    onSkip={() => setModalState({ radianceOfDawnModal: null })}
                />
            )}
            {mergedModalState.mantleOfInspirationTarget && (
                <MantleOfInspirationModal
                    creatureTargets={mergedModalState.mantleOfInspirationTarget.creatureTargets}
                    tempHp={mergedModalState.mantleOfInspirationTarget.tempHp}
                    dieRoll={mergedModalState.mantleOfInspirationTarget.dieRoll}
                    bardicDieSize={mergedModalState.mantleOfInspirationTarget.bardicDieSize}
                    maxTargets={mergedModalState.mantleOfInspirationTarget.maxTargets}
                    onConfirm={handleMantleOfInspirationConfirm}
                    onSkip={() => setModalState({ mantleOfInspirationTarget: null })}
                />
            )}
            {mergedModalState.celestialResilienceModal && (
                <CelestialResilienceModal
                    creatureTargets={mergedModalState.celestialResilienceModal.creatureTargets}
                    allyTempHp={mergedModalState.celestialResilienceModal.allyTempHp}
                    selfTempHp={mergedModalState.celestialResilienceModal.selfTempHp}
                    maxTargets={mergedModalState.celestialResilienceModal.maxTargets}
                    onConfirm={handleCelestialResilienceConfirm}
                    onSkip={handleCelestialResilienceSkip}
                />
            )}
            {mergedModalState.vitalityOfTheTreeTarget && (
                <VitalityOfTheTreeModal
                    creatureTargets={mergedModalState.vitalityOfTheTreeTarget.creatureTargets}
                    tempHp={mergedModalState.vitalityOfTheTreeTarget.tempHp}
                    maxTargets={mergedModalState.vitalityOfTheTreeTarget.maxTargets}
                    onConfirm={handleVitalityOfTheTreeConfirm}
                    onSkip={() => setModalState({ vitalityOfTheTreeTarget: null })}
                />
            )}
            {mergedModalState.inspiringSmiteModal && (
                <InspiringSmiteModal
                    creatureTargets={mergedModalState.inspiringSmiteModal.creatureTargets}
                    tempHp={mergedModalState.inspiringSmiteModal.tempHp}
                    roll={mergedModalState.inspiringSmiteModal.roll}
                    onConfirm={handleInspiringSmiteConfirm}
                    onSkip={() => setModalState({ inspiringSmiteModal: null })}
                />
            )}
            {mergedModalState.epitomeModal && (
                <ElementalEpitomeModal
                    action={mergedModalState.epitomeModal.action}
                    playerStats={mergedModalState.epitomeModal.playerStats}
                    campaignName={mergedModalState.epitomeModal.campaignName}
                    currentResistance={mergedModalState.epitomeModal.currentResistance}
                    onConfirm={handleEpitomeConfirm}
                    onClose={() => setModalState({ epitomeModal: null })}
                />
            )}
            {mergedModalState.destructiveStrideModal && (
                <DestructiveStrideModal
                    action={mergedModalState.destructiveStrideModal.action}
                    playerStats={mergedModalState.destructiveStrideModal.playerStats}
                    campaignName={mergedModalState.destructiveStrideModal.campaignName}
                    onConfirm={handleDestructiveStrideConfirm}
                    onClose={() => setModalState({ destructiveStrideModal: null })}
                />
            )}
            {mergedModalState.recklessAttackModal && (
                <RecklessAttackModal
                    playerStats={playerStats}
                    campaignName={campaignName}
                    attack={mergedModalState.recklessAttackModal.attack}
                    mode={mergedModalState.recklessAttackModal.mode || 'full'}
                    hasBrutalStrike={mergedModalState.recklessAttackModal.hasBrutalStrike || false}
                    brutalStrikeOptions={mergedModalState.recklessAttackModal.brutalStrikeOptions || []}
                    maxEffects={mergedModalState.recklessAttackModal.maxEffects || 1}
                    onConfirm={mergedModalState.recklessAttackModal.mode === 'brutalOnly'
                        ? (choice) => handleBrutalStrikeConfirm(choice)
                        : (attack, choice) => handleRecklessAttackConfirm(attack, choice)}
                    onCancel={mergedModalState.recklessAttackModal.mode === 'brutalOnly'
                        ? (choice) => handleBrutalStrikeCancel(choice)
                        : () => handleRecklessAttackCancel(mergedModalState.recklessAttackModal.attack)}
                />
            )}
            {mergedModalState.clockworkCavalcadeModal && (
                <ClockworkCavalcadeModal
                    onChoose={handleClockworkCavalcadeChoice}
                    onClose={() => setModalState({ clockworkCavalcadeModal: null })}
                />
            )}
            {mergedModalState.animateDeadModal && (
                <AnimateDeadModal
                    maxTargets={mergedModalState.animateDeadModal.maxTargets}
                    onConfirm={async ({ zombieCount, skeletonCount }) => {
                        setModalState({ animateDeadModal: null });
                        const result = await confirmAnimateDead(
                            mergedModalState.animateDeadModal.action,
                            mergedModalState.animateDeadModal.playerStats,
                            mergedModalState.animateDeadModal.campaignName,
                            { zombieCount, skeletonCount }
                        );
                        if (result?.payload) {
                            setPopupHtml(result.payload);
                        }
                    }}
                    onClose={() => setModalState({ animateDeadModal: null })}
                />
            )}
            {mergedModalState.createUndeadModal && (
                <CreateUndeadModal
                    maxTargets={mergedModalState.createUndeadModal.maxTargets}
                    onConfirm={async ({ ghoulCount }) => {
                        setModalState({ createUndeadModal: null });
                        const result = await confirmCreateUndead(
                            mergedModalState.createUndeadModal.action,
                            mergedModalState.createUndeadModal.playerStats,
                            mergedModalState.createUndeadModal.campaignName,
                            { ghoulCount }
                        );
                        if (result?.payload) {
                            setPopupHtml(result.payload);
                        }
                    }}
                    onClose={() => setModalState({ createUndeadModal: null })}
                />
            )}
            {mergedModalState.summonSpiritModal && (
                <SummonSpiritModal
                    action={mergedModalState.summonSpiritModal.action}
                    onConfirm={async (variantName) => {
                        setModalState({ summonSpiritModal: null });
                        const result = await confirmSummonSpirit(
                            mergedModalState.summonSpiritModal.action,
                            mergedModalState.summonSpiritModal.playerStats,
                            mergedModalState.summonSpiritModal.campaignName,
                            variantName
                        );
                        if (result?.payload) {
                            setPopupHtml(result.payload);
                        }
                    }}
                    onClose={() => setModalState({ summonSpiritModal: null })}
                />
            )}
            {mergedModalState.flurryOfBlowsModal && (
                <FlurryOfBlowsTargetPopup
                    totalAttacks={mergedModalState.flurryOfBlowsModal.numAttacks || 3}
                    creatureTargets={mergedModalState.flurryOfBlowsModal.creatureTargets}
                    currentTargetName={mergedModalState.flurryOfBlowsModal.currentTargetName}
                    onConfirm={handleFlurryOfBlowsConfirm}
                    onSkip={() => setModalState({ flurryOfBlowsModal: null })}
                />
            )}

            <InlineChoiceModals
                mergedModalState={mergedModalState}
                setModalState={setModalState}
                setPopupHtml={setPopupHtml}
                _autoDamageContext={autoDamageContext}
                pendingDamage={pendingDamage}
                _mapName={mapName}
                _buildCtx={buildCtx}
                _buildCtxSync={buildCtxSync}
                _rollDamage={rollDamage}
                _playerStats={playerStats}
                _campaignName={campaignName}
                handleDivineFuryDamageType={handleDivineFuryDamageType}
                handleDivineFurySkip={handleDivineFurySkip}
                handleEnhancedUnarmedChoice={handleEnhancedUnarmedChoice}
                handleEnhancedUnarmedSkip={handleEnhancedUnarmedSkip}
                handleGenericDamageTypeChoice={handleGenericDamageTypeChoice}
                handleGenericDamageTypeSkip={handleGenericDamageTypeSkip}
                handleDamageTypeModifierChoice={handleDamageTypeModifierChoice}
                handleDamageTypeModifierSkip={handleDamageTypeModifierSkip}
                handleFeatureChoiceConfirm={handleFeatureChoiceConfirm}
                handleFeatureChoiceSkip={handleFeatureChoiceSkip}
                handleAttackRiderOptionSelect={handleAttackRiderOptionSelect}
                handleClockworkCavalcadeRepairConfirm={handleClockworkCavalcadeRepairConfirm}
                sanitizeHtml={sanitizeHtml}
            />

            <SecondaryTargetModals
                mergedModalState={mergedModalState}
                setModalState={setModalState}
                handleSweepingAttackConfirm={handleSweepingAttackConfirm}
                handleBaitAndSwitchChoiceConfirm={handleBaitAndSwitchChoiceConfirm}
                handleCommanderStrikeChoiceConfirm={handleCommanderStrikeChoiceConfirm}
                handleRallyChoiceConfirm={handleRallyChoiceConfirm}
                handleTricksterBlessingConfirm={handleTricksterBlessingConfirm}
                handleBardicInspirationConfirm={handleBardicInspirationConfirm}
                handleInspiringMovementConfirm={handleInspiringMovementConfirm}
                handleOceanicGiftConfirm={handleOceanicGiftConfirm}
                handleDestructiveStrideTargetConfirm={handleDestructiveStrideTargetConfirm}
                handleDestructiveStrideTargetSkip={handleDestructiveStrideTargetSkip}
                handleStarryChaliceConfirm={handleStarryChaliceConfirm}
            />

            <HealingModals
                mergedModalState={mergedModalState}
                setModalState={setModalState}
                handleMassHealConfirm={handleMassHealConfirm}
                handleClockworkCavalcadeHealConfirm={handleClockworkCavalcadeHealConfirm}
                handleClockworkCavalcadeDispelConfirm={handleClockworkCavalcadeDispelConfirm}
                handleMassCureWoundsConfirm={handleMassCureWoundsConfirm}
                handlePrayerOfHealingConfirm={handlePrayerOfHealingConfirm}
                handlePowerWordFortifyConfirm={handlePowerWordFortifyConfirm}
                handleMassHealingWordConfirm={handleMassHealingWordConfirm}
                handleNaturesSanctuaryConfirm={handleNaturesSanctuaryConfirm}
            />
        </>
    );
}

export default CharActionModals;
