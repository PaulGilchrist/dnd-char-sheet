import React from 'react';
import SecondaryTargetModal from '../modals/shared/SecondaryTargetModal.jsx';
import SingleResistanceSelectionModal from '../modals/SingleResistanceSelectionModal.jsx';
import HexAbilityModal from '../modals/HexAbilityModal.jsx';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import utils from '../../../services/ui/utils.js';

const TargetSpellPopups = function TargetSpellPopups({
    playerStats,
    campaignName,
    pendingAuraOfVitality,
    handleAuraOfVitalityConfirm,
    handleAuraOfVitalitySkip,
    pendingForesight,
    handleForesightConfirm,
    handleForesightSkip,
    pendingProtectionFromEvilAndGood,
    handleProtectionFromEvilAndGoodConfirm,
    handleProtectionFromEvilAndGoodSkip,
    pendingProtectionFromPoison,
    handleProtectionFromPoisonConfirm,
    handleProtectionFromPoisonSkip,
    pendingStoneSkin,
    handleStoneSkinConfirm,
    handleStoneSkinSkip,
    pendingLongstrider,
    handleLongstriderConfirm,
    handleLongstriderSkip,
    pendingSpareTheDying,
    handleSpareTheDyingConfirm,
    handleSpareTheDyingSkip,
    pendingDeathWard,
    handleDeathWardConfirm,
    handleDeathWardSkip,
    pendingHeroism,
    handleHeroismConfirm,
    handleHeroismSkip,
    pendingHaste,
    handleHasteConfirm,
    handleHasteSkip,
    pendingEnhanceAbility,
    enhanceAbilityStage,
    handleEnhanceAbilityAbilitySelect,
    handleEnhanceAbilityConfirm,
    handleEnhanceAbilitySkip,
    pendingBarkskin,
    handleBarkskinConfirm,
    handleBarkskinSkip,
    pendingInvisibility,
    handleInvisibilityConfirm,
    handleInvisibilitySkip,
    pendingGreaterInvisibility,
    handleGreaterInvisibilityConfirm,
    handleGreaterInvisibilitySkip,
    pendingSanctuary,
    handleSanctuaryConfirm,
    handleSanctuarySkip,
    pendingFeignDeath,
    handleFeignDeathConfirm,
    handleFeignDeathSkip,
    pendingHeal,
    handleHealConfirm,
    handleHealSkip,
    pendingRegenerate,
    handleRegenerateConfirm,
    handleRegenerateSkip,
    pendingHealingWord,
    handleHealingWordConfirm,
    handleHealingWordSkip,
    pendingCureWounds,
    handleCureWoundsConfirm,
    handleCureWoundsSkip,
    pendingRevivify,
    handleRevivifyConfirm,
    handleRevivifySkip,
    pendingGreaterRestoration,
    handleGreaterRestorationConfirm,
    handleGreaterRestorationSkip,
    handleGreaterRestorationNoEffects,
    pendingGreaterRestorationTarget,
    setPendingGreaterRestorationTarget,
    pendingLesserRestoration,
    handleLesserRestorationConfirm,
    handleLesserRestorationSkip,
    pendingLesserRestorationTarget,
    setPendingLesserRestorationTarget,
    pendingRemoveCurse,
    handleRemoveCurseConfirm,
    handleRemoveCurseSkip,
    pendingMageArmor,
    handleMageArmorConfirm,
    handleMageArmorSkip,
    pendingProtectionFromEnergy,
    protectionFromEnergyStage,
    handleProtectionFromEnergyTargetSelect,
    handleProtectionFromEnergyTypeSelect,
    handleProtectionFromEnergySkip,
    pendingResistance,
    resistanceStage,
    handleResistanceTargetSelect,
    handleResistanceTypeSelect,
    handleResistanceSkip,
    pendingHex,
    handleHexConfirm,
    handleHexSkip,
}) {
    const getEffectsForTarget = async (targetName) => {
        const result = [];
        const conditions = getRuntimeValue(targetName, 'activeConditions') || [];
        let csConditions = [];
        try {
            const cs = await getCombatSummary(campaignName);
            if (cs) {
                const creature = cs.creatures?.find(c => utils.getName(c.name) === utils.getName(targetName));
                if (creature && Array.isArray(creature.conditions)) {
                    csConditions = creature.conditions.map(c => c.key);
                }
            }
        } catch { /* ignore */ }
        const allConditions = [...new Set([...conditions, ...csConditions])];
        const conditionMatches = (c, targetCondition) =>
            (typeof c === 'string' ? c.toLowerCase() : '').trim() === (typeof targetCondition === 'string' ? targetCondition.toLowerCase() : '').trim();
        const RESTORATION_CONDITIONS = ['charmed', 'petrified'];
        RESTORATION_CONDITIONS
            .filter(c => allConditions.some(cond => conditionMatches(cond, c)))
            .forEach(c => {
                result.push({ value: `condition:${c}`, label: `${c.charAt(0).toUpperCase() + c.slice(1)} condition` });
            });
        const exhaustion = getRuntimeValue(targetName, 'exhaustionLevel') || 0;
        if (exhaustion > 0) {
            result.push({ value: 'exhaustion', label: `Exhaustion level (current: ${exhaustion})` });
        }
        const activeBuffs = getRuntimeValue(targetName, 'activeBuffs') || [];
        const hasCurse = activeBuffs.some(b => b.type === 'cursed' || b.cursed);
        if (hasCurse) {
            result.push({ value: 'curse', label: 'Curse (including attunement to cursed magic item)' });
        }
        const abilityReductions = getRuntimeValue(targetName, 'abilityReductions') || {};
        if (Object.keys(abilityReductions).length > 0) {
            result.push({ value: 'ability_reduction', label: 'Ability score reduction' });
        }
        const hpMaxReduction = getRuntimeValue(targetName, 'hpMaxReduction') || 0;
        if (hpMaxReduction > 0) {
            result.push({ value: 'hp_max_reduction', label: 'Hit Point maximum reduction' });
        }
        return result;
    };

    const getConditionsForTarget = async (targetName) => {
        const conditions = getRuntimeValue(targetName, 'activeConditions') || [];
        let csConditions = [];
        try {
            const cs = await getCombatSummary(campaignName);
            if (cs) {
                const creature = cs.creatures?.find(c => utils.getName(c.name) === utils.getName(targetName));
                if (creature && Array.isArray(creature.conditions)) {
                    csConditions = creature.conditions.map(c => c.key);
                }
            }
        } catch { /* ignore */ }
        const allConditions = [...new Set([...conditions, ...csConditions])];
        const conditionMatches = (c, targetCondition) =>
            (typeof c === 'string' ? c.toLowerCase() : '').trim() === (typeof targetCondition === 'string' ? targetCondition.toLowerCase() : '').trim();
        const ALLOWED_CONDITIONS = ['blinded', 'deafened', 'paralyzed', 'poisoned'];
        return ALLOWED_CONDITIONS
            .filter(c => allConditions.some(cond => conditionMatches(cond, c)))
            .map(c => ({ value: `condition:${c}`, label: `${c.charAt(0).toUpperCase() + c.slice(1)} condition` }));
    };

    return (
        <>
            {pendingAuraOfVitality && (
                <SecondaryTargetModal
                    title="Aura of Vitality"
                    targets={pendingAuraOfVitality.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleAuraOfVitalityConfirm([targetName])}
                    onSkip={handleAuraOfVitalitySkip}
                    description="Choose a creature within 30 feet of you to heal for 2d6 HP. While concentrating on this spell, you can free cast it again once per turn to heal another creature."
                    confirmLabel="Cast Aura of Vitality"
                    confirmIcon="fa-heart-pulse"
                />
            )}
            {pendingForesight && (
                <SecondaryTargetModal
                    title="Foresight"
                    targets={pendingForesight.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleForesightConfirm([targetName])}
                    onSkip={handleForesightSkip}
                    description="You touch a willing creature and bestow a limited ability to see into the immediate future. For the duration, the target has Advantage on D20 Tests, and other creatures have Disadvantage on attack rolls against it."
                    confirmLabel="Cast Foresight"
                    confirmIcon="fa-eye"
                />
            )}
            {pendingProtectionFromEvilAndGood && (
                <SecondaryTargetModal
                    title="Protection from Evil and Good"
                    targets={pendingProtectionFromEvilAndGood.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleProtectionFromEvilAndGoodConfirm([targetName])}
                    onSkip={handleProtectionFromEvilAndGoodSkip}
                    description="Choose a willing creature within range (including yourself). Until the spell ends, the target is protected against Aberrations, Celestials, Elementals, Fey, Fiends, and Undead: those creatures have Disadvantage on attack rolls against the target, and the target can't gain the Charmed or Frightened conditions from them."
                    confirmLabel="Cast Protection from Evil and Good"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingProtectionFromPoison && (
                <SecondaryTargetModal
                    title="Protection from Poison"
                    targets={pendingProtectionFromPoison.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleProtectionFromPoisonConfirm([targetName])}
                    onSkip={handleProtectionFromPoisonSkip}
                    description="Choose a willing creature within range (including yourself). The target gains resistance to Poison damage and Advantage on saving throws against the Poisoned condition. Concentration, up to 1 hour."
                    confirmLabel="Cast Protection from Poison"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingStoneSkin && (
                <SecondaryTargetModal
                    title="Stone Skin"
                    targets={pendingStoneSkin.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={handleStoneSkinConfirm}
                    onSkip={handleStoneSkinSkip}
                    description="Choose a creature within range. The target has Resistance to Bludgeoning, Piercing, and Slashing damage. Concentration, up to 1 hour."
                    confirmLabel="Cast Stone Skin"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingLongstrider && (
                <SecondaryTargetModal
                    title="Longstrider"
                    targets={pendingLongstrider.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleLongstriderConfirm([targetName])}
                    onSkip={handleLongstriderSkip}
                    description="You touch a creature. The target's Speed increases by 10 feet until the spell ends."
                    confirmLabel="Cast Longstrider"
                    confirmIcon="fa-boot"
                />
            )}
            {pendingSpareTheDying && (
                <SecondaryTargetModal
                    title="Spare the Dying"
                    targets={pendingSpareTheDying.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleSpareTheDyingConfirm({ targetName })}
                    onSkip={handleSpareTheDyingSkip}
                    description="Choose a creature within range that has 0 HP. The target rises to 1 HP and gains the Unconscious condition."
                    confirmLabel="Cast Spare the Dying"
                    confirmIcon="fa-hand-holding-medical"
                />
            )}
            {pendingDeathWard && (
                <SecondaryTargetModal
                    title="Death Ward"
                    targets={pendingDeathWard.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleDeathWardConfirm([targetName])}
                    onSkip={handleDeathWardSkip}
                    description="Choose a willing creature within range. The target gains protection from death: the first time it would drop to 0 HP, it instead drops to 1 HP."
                    confirmLabel="Cast Death Ward"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingHeroism && (
                <SecondaryTargetModal
                    title="Heroism"
                    targets={pendingHeroism.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleHeroismConfirm([targetName])}
                    onSkip={handleHeroismSkip}
                    description="Choose a willing creature within range. Target is immune to Frightened and gains temp HP at start of each turn."
                    confirmLabel="Cast Heroism"
                    confirmIcon="fa-dragon"
                />
            )}
            {pendingHaste && (
                <SecondaryTargetModal
                    title="Haste"
                    targets={pendingHaste.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleHasteConfirm([targetName])}
                    onSkip={handleHasteSkip}
                    description="Choose a willing creature within range. Target's speed doubles, gains +2 AC, and gets advantage on DEX saves."
                    confirmLabel="Cast Haste"
                    confirmIcon="fa-bolt"
                />
            )}
            {pendingEnhanceAbility && enhanceAbilityStage === 'ability' && (
                <HexAbilityModal
                    onAbilitySelected={handleEnhanceAbilityAbilitySelect}
                    onCancel={handleEnhanceAbilitySkip}
                    abilities={[
                        { key: 'STR', label: 'Strength' },
                        { key: 'DEX', label: 'Dexterity' },
                        { key: 'INT', label: 'Intelligence' },
                        { key: 'WIS', label: 'Wisdom' },
                        { key: 'CHA', label: 'Charisma' },
                    ]}
                    title="Enhance Ability — Choose Ability"
                    prompt="Choose the ability that the target gains Advantage on ability checks with:"
                    icon="fa-hand"
                />
            )}
            {pendingEnhanceAbility && enhanceAbilityStage === 'target' && (
                <SecondaryTargetModal
                    title="Enhance Ability"
                    targets={pendingEnhanceAbility.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleEnhanceAbilityConfirm([targetName])}
                    onSkip={handleEnhanceAbilitySkip}
                    description="Choose a willing creature within range. The target gains Advantage on ability checks using the chosen ability for up to 1 hour (concentration)."
                    confirmLabel="Cast Enhance Ability"
                    confirmIcon="fa-hand"
                />
            )}
            {pendingBarkskin && (
                <SecondaryTargetModal
                    title="Barkskin"
                    targets={pendingBarkskin.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleBarkskinConfirm([targetName])}
                    onSkip={handleBarkskinSkip}
                    description="Choose a willing creature within range. Target's AC becomes 17."
                    confirmLabel="Cast Barkskin"
                    confirmIcon="fa-tree"
                />
            )}
            {pendingInvisibility && (
                <SecondaryTargetModal
                    title="Invisibility"
                    targets={pendingInvisibility.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleInvisibilityConfirm([targetName])}
                    onSkip={handleInvisibilitySkip}
                    description="Choose a creature within range. Target becomes invisible. Spell ends if target makes an attack roll, deals damage, casts a spell, or rolls initiative."
                    confirmLabel="Cast Invisibility"
                    confirmIcon="fa-eye-slash"
                />
            )}
            {pendingGreaterInvisibility && (
                <SecondaryTargetModal
                    title="Greater Invisibility"
                    targets={pendingGreaterInvisibility.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleGreaterInvisibilityConfirm([targetName])}
                    onSkip={handleGreaterInvisibilitySkip}
                    description="Choose a creature within range. Target becomes invisible. Spell ends if target makes an attack roll, deals damage, casts a spell, or rolls initiative."
                    confirmLabel="Cast Greater Invisibility"
                    confirmIcon="fa-eye-slash"
                />
            )}
            {pendingSanctuary && (
                <SecondaryTargetModal
                    title="Sanctuary"
                    targets={pendingSanctuary.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleSanctuaryConfirm(targetName)}
                    onSkip={handleSanctuarySkip}
                    description="Choose a creature within range. Until the spell ends, any creature who targets the warded creature with an attack roll or a damaging spell must succeed on a WIS save or lose the attack or spell. Does not protect from areas of effect. Spell ends if the warded creature makes an attack roll, casts a spell, or deals damage."
                    confirmLabel="Cast Sanctuary"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingFeignDeath && (
                <SecondaryTargetModal
                    title="Feign Death"
                    targets={pendingFeignDeath.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleFeignDeathConfirm([targetName])}
                    onSkip={handleFeignDeathSkip}
                    description="Choose a creature within range. Target appears dead: Blinded, Incapacitated, Speed 0, Resistant to all damage except Psychic, Immune to Poisoned. Expires on initiative roll, short rest, or long rest."
                    confirmLabel="Cast Feign Death"
                    confirmIcon="fa-skull"
                />
            )}
            {pendingHeal && (
                <SecondaryTargetModal
                    title="Heal"
                    targets={pendingHeal.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleHealConfirm({ targetName })}
                    onSkip={handleHealSkip}
                    description="A surge of positive energy washes through the creature, causing it to regain 70 hit points. This spell also ends blindness, deafness, and any diseases affecting the target."
                    confirmLabel="Cast Heal"
                    confirmIcon="fa-heart"
                />
            )}
            {pendingRegenerate && (
                <SecondaryTargetModal
                    title="Regenerate"
                    targets={pendingRegenerate.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleRegenerateConfirm({ targetName })}
                    onSkip={handleRegenerateSkip}
                    description="A powerful healing spell that restores 4d8 + 15 hit points initially, then 1 hit point per turn. When the effect ends, the target is restored to full health."
                    confirmLabel="Cast Regenerate"
                    confirmIcon="fa-heart-pulse"
                />
            )}
            {pendingHealingWord && (
                <SecondaryTargetModal
                    title="Healing Word"
                    targets={pendingHealingWord.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleHealingWordConfirm({ targetName })}
                    onSkip={handleHealingWordSkip}
                    description="Choose a creature within range. The target regains hit points equal to the roll of your dice plus your spellcasting ability modifier."
                    confirmLabel="Cast Healing Word"
                    confirmIcon="fa-heart"
                />
            )}
            {pendingCureWounds && (
                <SecondaryTargetModal
                    title="Cure Wounds"
                    targets={pendingCureWounds.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleCureWoundsConfirm({ targetName })}
                    onSkip={handleCureWoundsSkip}
                    description="Choose a creature within touch range. The target regains hit points equal to the roll of your dice plus your spellcasting ability modifier."
                    confirmLabel="Cast Cure Wounds"
                    confirmIcon="fa-heart"
                />
            )}
            {pendingRevivify && (
                <SecondaryTargetModal
                    title="Revivify"
                    targets={pendingRevivify.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleRevivifyConfirm({ targetName })}
                    onSkip={handleRevivifySkip}
                    description="Choose a creature to revive. The target must have 0 Hit Points. A diamond worth 300+ GP is consumed."
                    confirmLabel="Cast Revivify"
                    confirmIcon="fa-heart"
                />
            )}
            {pendingGreaterRestoration && !pendingGreaterRestorationTarget && (
                <SecondaryTargetModal
                    title="Greater Restoration"
                    targets={pendingGreaterRestoration.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={async (targetName) => {
                        const effects = await getEffectsForTarget(targetName);
                        setPendingGreaterRestorationTarget({ targetName, effects });
                    }}
                    onSkip={handleGreaterRestorationSkip}
                    description={`Choose a creature within <strong>${pendingGreaterRestoration.range}</strong>. You'll select which debilitating effect to remove.`}
                    confirmLabel="Cast Greater Restoration"
                    confirmIcon="fa-hand-holding-medical"
                />
            )}
            {pendingGreaterRestorationTarget && (() => {
                const hasEffects = pendingGreaterRestorationTarget.effects.length > 0;
                const handleEffectSelected = (effectValue) => {
                    const type = effectValue.split(':')[0];
                    const detail = effectValue.split(':')[1] || null;
                    const selection = { type };
                    if (detail) {
                        selection[type === 'condition' ? 'condition' : type] = detail;
                    }
                    handleGreaterRestorationConfirm({ targetName: pendingGreaterRestorationTarget.targetName, selections: [selection] });
                    setPendingGreaterRestorationTarget(null);
                };
                const handleEffectSkip = () => {
                    setPendingGreaterRestorationTarget(null);
                };
                const handleNoEffectsDismiss = () => {
                    handleGreaterRestorationNoEffects();
                    setPendingGreaterRestorationTarget(null);
                };
                return (
                    <SecondaryTargetModal
                        title="Greater Restoration"
                        targets={pendingGreaterRestorationTarget.effects.map(e => ({ value: e.value, label: e.label }))}
                        onTargetSelected={handleEffectSelected}
                        onSkip={hasEffects ? handleEffectSkip : handleNoEffectsDismiss}
                        description={hasEffects
                            ? `Choose one effect to remove from ${pendingGreaterRestorationTarget.targetName}.`
                            : `No removable effects found on ${pendingGreaterRestorationTarget.targetName}.`}
                        confirmLabel="Remove Effect"
                        confirmIcon="fa-hand-holding-medical"
                        hideConfirm={!hasEffects}
                    />
                );
            })()}
            {pendingLesserRestoration && !pendingLesserRestorationTarget && (
                <SecondaryTargetModal
                    title="Lesser Restoration"
                    targets={pendingLesserRestoration.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={async (targetName) => {
                        const conditions = await getConditionsForTarget(targetName);
                        setPendingLesserRestorationTarget({ targetName, conditions });
                    }}
                    onSkip={handleLesserRestorationSkip}
                    description={`Choose a creature within <strong>${pendingLesserRestoration.range}</strong>. You'll select one condition to remove.`}
                    confirmLabel="Cast Lesser Restoration"
                    confirmIcon="fa-hand-holding-medical"
                />
            )}
            {pendingLesserRestorationTarget && (() => {
                const hasConditions = pendingLesserRestorationTarget.conditions.length > 0;
                const handleConditionSelected = (conditionValue) => {
                    const condition = conditionValue.split(':')[1];
                    handleLesserRestorationConfirm({ targetName: pendingLesserRestorationTarget.targetName, condition });
                    setPendingLesserRestorationTarget(null);
                };
                const handleConditionSkip = () => {
                    setPendingLesserRestorationTarget(null);
                };
                const handleNoConditionsDismiss = () => {
                    handleLesserRestorationSkip();
                    setPendingLesserRestorationTarget(null);
                };
                return (
                    <SecondaryTargetModal
                        title="Lesser Restoration"
                        targets={pendingLesserRestorationTarget.conditions.map(c => ({ value: c.value, label: c.label }))}
                        onTargetSelected={handleConditionSelected}
                        onSkip={hasConditions ? handleConditionSkip : handleNoConditionsDismiss}
                        description={hasConditions
                            ? `Choose one condition to remove from ${pendingLesserRestorationTarget.targetName}.`
                            : `No removable conditions found on ${pendingLesserRestorationTarget.targetName}.`}
                        confirmLabel="Remove Condition"
                        confirmIcon="fa-hand-holding-medical"
                        hideConfirm={!hasConditions}
                    />
                );
            })()}
            {pendingRemoveCurse && (
                <SecondaryTargetModal
                    title="Remove Curse"
                    targets={pendingRemoveCurse.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleRemoveCurseConfirm({ targetName })}
                    onSkip={handleRemoveCurseSkip}
                    description={`Choose a creature within <strong>${pendingRemoveCurse.range}</strong>. This spell ends all curses affecting the target and breaks the target's attunement to any cursed magic items.`}
                    confirmLabel="Cast Remove Curse"
                    confirmIcon="fa-hand-holding-medical"
                />
            )}
            {pendingMageArmor && (
                <SecondaryTargetModal
                    title="Mage Armor"
                    targets={pendingMageArmor.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => handleMageArmorConfirm([targetName])}
                    onSkip={handleMageArmorSkip}
                    description="Choose a creature within range. The target's base AC becomes 13 + Dexterity modifier. Mage Armor lasts 8 hours and ends on a long rest."
                    confirmLabel="Cast Mage Armor"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingProtectionFromEnergy && protectionFromEnergyStage === 'target' && (
                <SecondaryTargetModal
                    title="Protection from Energy"
                    targets={pendingProtectionFromEnergy.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={handleProtectionFromEnergyTargetSelect}
                    onSkip={handleProtectionFromEnergySkip}
                    description={`Choose a creature within <strong>${pendingProtectionFromEnergy.range}</strong>. Then choose a damage type for resistance.`}
                    confirmLabel="Cast Protection from Energy"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingProtectionFromEnergy && protectionFromEnergyStage === 'type' && (
                <SingleResistanceSelectionModal
                    title="Choose Damage Type"
                    icon="fa-shield-halved"
                    action={{ automation: { damageTypes: pendingProtectionFromEnergy.damageTypes } }}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onConfirm={handleProtectionFromEnergyTypeSelect}
                    onClose={handleProtectionFromEnergySkip}
                />
            )}
            {pendingResistance && resistanceStage === 'target' && (
                <SecondaryTargetModal
                    title="Resistance"
                    targets={pendingResistance.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={handleResistanceTargetSelect}
                    onSkip={handleResistanceSkip}
                    description={`Choose a creature within <strong>${pendingResistance.range}</strong>. Then choose a damage type to reduce.`}
                    confirmLabel="Cast Resistance"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingResistance && resistanceStage === 'type' && (
                <SingleResistanceSelectionModal
                    title="Choose Damage Type"
                    icon="fa-shield-halved"
                    action={{ automation: { damageTypes: pendingResistance.damageTypes } }}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    onConfirm={handleResistanceTypeSelect}
                    onClose={handleResistanceSkip}
                />
            )}
            {pendingHex && (
                <SecondaryTargetModal
                    title="Hex"
                    targets={pendingHex.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={handleHexConfirm}
                    onSkip={handleHexSkip}
                    description="Choose a creature within 90 feet that you can see. You'll then select an ability for the target to have Disadvantage on."
                    confirmLabel="Select Target"
                    confirmIcon="fa-crown"
                />
            )}
        </>
    );
};

export default TargetSpellPopups;
