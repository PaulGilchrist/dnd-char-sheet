import { useState, useCallback } from 'react';
import Popup from '../common/popup.jsx'
import MetamagicPopup from './popups/MetamagicPopup.jsx'
import CreatureSelectionModal from './modals/shared/CreatureSelectionModal.jsx'
import MagicMissileTargetPopup from './popups/MagicMissileTargetPopup.jsx'
import SpellDetailPopup from './char-spells/SpellDetailPopup.jsx'
import SecondaryTargetModal from './modals/shared/SecondaryTargetModal.jsx'
import { getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import utils from '../../services/ui/utils.js'

export default function CharActionSpellPopups({
    playerStats,
    campaignName,
    selectedActionSpell,
    setSelectedActionSpell,
    buildUpcastLevels,
    handleActionSpellCast,
    actionPendingMetamagic,
    actionHandleConfirm,
    actionHandleSkip,
    actionPendingAid,
    actionHandleAidConfirm,
    actionHandleAidSkip,
    actionPendingBane,
    actionHandleBaneConfirm,
    actionHandleBaneSkip,
    actionPendingBless,
    actionHandleBlessConfirm,
    actionHandleBlessSkip,
    actionPendingPassWithoutTrace,
    actionHandlePassWithoutTraceConfirm,
    actionHandlePassWithoutTraceSkip,
    actionPendingHaste,
    actionHandleHasteConfirm,
    actionHandleHasteSkip,
    actionPendingHeal,
    actionHandleHealConfirm,
    actionHandleHealSkip,
    actionPendingGreaterRestoration,
    actionHandleGreaterRestorationConfirm,
    actionHandleGreaterRestorationSkip,
    actionHandleGreaterRestorationNoEffects,
    actionPendingRemoveCurse,
    actionHandleRemoveCurseConfirm,
    actionHandleRemoveCurseSkip,
    actionPendingMagicMissile,
    actionHandleMagicMissileConfirm,
    actionHandleMagicMissileSkip,
    actionPendingMageArmor,
    actionHandleMageArmorConfirm,
    actionHandleMageArmorSkip,
    pendingActionMetamagic,
    handleActionMetamagicConfirm,
    handleActionMetamagicSkip,
}) {
    const [greaterRestorationSelectedTarget, setGreaterRestorationSelectedTarget] = useState(null);

    const loadGreaterRestorationEffects = useCallback(async (targetName) => {
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
    }, [campaignName]);

    const handleGreaterRestorationTargetSelected = useCallback(async (targetName) => {
        const effects = await loadGreaterRestorationEffects(targetName);
        setGreaterRestorationSelectedTarget({ targetName, effects });
    }, [loadGreaterRestorationEffects]);

    const handleGreaterRestorationEffectSelected = useCallback((effectValue) => {
        const parts = effectValue.split(':');
        const type = parts[0];
        const detail = parts[1] || null;
        const selection = { type };
        if (detail) {
            selection[type === 'condition' ? 'condition' : type] = detail;
        }
        actionHandleGreaterRestorationConfirm({ targetName: greaterRestorationSelectedTarget.targetName, selections: [selection] });
        setGreaterRestorationSelectedTarget(null);
    }, [greaterRestorationSelectedTarget, actionHandleGreaterRestorationConfirm]);

    const handleGreaterRestorationEffectSkip = useCallback(() => {
        setGreaterRestorationSelectedTarget(null);
    }, []);

    const handleNoEffectsDismiss = useCallback(() => {
        actionHandleGreaterRestorationNoEffects();
        setGreaterRestorationSelectedTarget(null);
    }, [actionHandleGreaterRestorationNoEffects]);
    return (
        <>
            {selectedActionSpell && (
                <Popup onClickOrKeyDown={() => setSelectedActionSpell(null)}>
                    <SpellDetailPopup
                        spell={selectedActionSpell}
                        playerStats={playerStats}
                        campaignName={campaignName}
                        playerLevel={playerStats.level}
                        upcastLevels={buildUpcastLevels(selectedActionSpell)}
                        onClose={() => setSelectedActionSpell(null)}
                        onCast={handleActionSpellCast}
                    />
                </Popup>
            )}
            {actionPendingMetamagic && (
                <MetamagicPopup
                    spell={{ name: actionPendingMetamagic.spellName, level: actionPendingMetamagic.spellLevel || 0 }}
                    playerStats={{ ...playerStats, _metamagicCurrentSP: actionPendingMetamagic._currentSP }}
                    campaignName={campaignName}
                    onConfirm={actionHandleConfirm}
                    onSkip={actionHandleSkip}
                />
            )}
            {actionPendingAid && (
                <CreatureSelectionModal
                    title="Aid"
                    icon="fa-hand-holding-heart"
                    targets={actionPendingAid.creatureTargets}
                    maxTargets={actionPendingAid.maxTargets}
                    description="Your spell bolsters your allies with toughness and resolve. Choose up to 3 creatures within range."
                    confirmLabel="Cast Aid"
                    onConfirm={actionHandleAidConfirm}
                    onSkip={actionHandleAidSkip}
                />
            )}
            {actionPendingBane && (
                <CreatureSelectionModal
                    title="Bane"
                    icon="fa-shield-halved"
                    targets={actionPendingBane.creatureTargets}
                    maxTargets={actionPendingBane.maxTargets}
                    description="Curse up to three creatures of your choice that you can see within range. Affected creatures subtract 1d4 from attack rolls and saving throws."
                    confirmLabel="Cast Bane"
                    onConfirm={actionHandleBaneConfirm}
                    onSkip={actionHandleBaneSkip}
                />
            )}
            {actionPendingBless && (
                <CreatureSelectionModal
                    title="Bless"
                    icon="fa-hands"
                    targets={actionPendingBless.creatureTargets}
                    maxTargets={actionPendingBless.maxTargets}
                    description="You bless up to three creatures of your choice within range. Affected creatures add 1d4 to attack rolls and saving throws."
                    confirmLabel="Cast Bless"
                    onConfirm={actionHandleBlessConfirm}
                    onSkip={actionHandleBlessSkip}
                />
            )}
            {actionPendingPassWithoutTrace && (
                <CreatureSelectionModal
                    title="Pass Without Trace"
                    icon="fa-ghost"
                    targets={actionPendingPassWithoutTrace.creatureTargets}
                    description="A veil of shadows and silence radiates from you, masking you and your companions from detection. Choose creatures within 30 feet of you. Each chosen creature has a +10 bonus to Dexterity (Stealth) checks and can't be tracked except by magical means."
                    confirmLabel="Cast Pass Without Trace"
                    onConfirm={actionHandlePassWithoutTraceConfirm}
                    onSkip={actionHandlePassWithoutTraceSkip}
                />
            )}
            {actionPendingHaste && (
                <SecondaryTargetModal
                    title="Haste"
                    targets={actionPendingHaste.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => actionHandleHasteConfirm([targetName])}
                    onSkip={actionHandleHasteSkip}
                    description="Choose a willing creature within range. Target's speed doubles, gains +2 AC, and gets advantage on DEX saves."
                    confirmLabel="Cast Haste"
                    confirmIcon="fa-bolt"
                />
            )}
            {actionPendingHeal && (
                <SecondaryTargetModal
                    title="Heal"
                    targets={actionPendingHeal.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => actionHandleHealConfirm({ targetName })}
                    onSkip={actionHandleHealSkip}
                    description="A surge of positive energy washes through the creature, causing it to regain 70 hit points. This spell also ends blindness, deafness, and any diseases affecting the target."
                    confirmLabel="Cast Heal"
                    confirmIcon="fa-heart"
                />
            )}
            {(() => {
                if (actionPendingGreaterRestoration && !greaterRestorationSelectedTarget) {
                    return (
                        <SecondaryTargetModal
                            title="Greater Restoration"
                            targets={actionPendingGreaterRestoration.creatureTargets.map(name => ({ name, type: 'creature' }))}
                            onTargetSelected={handleGreaterRestorationTargetSelected}
                            onSkip={actionHandleGreaterRestorationSkip}
                            description={`Choose a creature within <strong>${actionPendingGreaterRestoration.range}</strong>. You'll select which debilitating effect to remove.`}
                            confirmLabel="Cast Greater Restoration"
                            confirmIcon="fa-hand-holding-medical"
                        />
                    );
                }
                if (greaterRestorationSelectedTarget) {
                    const hasEffects = greaterRestorationSelectedTarget.effects.length > 0;
                    return (
                        <SecondaryTargetModal
                            title="Greater Restoration"
                            targets={greaterRestorationSelectedTarget.effects.map(e => ({ value: e.value, label: e.label }))}
                            onTargetSelected={handleGreaterRestorationEffectSelected}
                            onSkip={hasEffects ? handleGreaterRestorationEffectSkip : handleNoEffectsDismiss}
                            description={hasEffects
                                ? `Choose one effect to remove from ${greaterRestorationSelectedTarget.targetName}.`
                                : `No removable effects found on ${greaterRestorationSelectedTarget.targetName}.`}
                            confirmLabel="Remove Effect"
                            confirmIcon="fa-hand-holding-medical"
                            hideConfirm={!hasEffects}
                        />
                    );
                }
                return null;
            })()}
            {actionPendingRemoveCurse && (
                <SecondaryTargetModal
                    title="Remove Curse"
                    targets={actionPendingRemoveCurse.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => actionHandleRemoveCurseConfirm({ targetName })}
                    onSkip={actionHandleRemoveCurseSkip}
                    description={`Choose a creature within <strong>${actionPendingRemoveCurse.range}</strong>. This spell ends all curses affecting the target and breaks the target's attunement to any cursed magic items.`}
                    confirmLabel="Cast Remove Curse"
                    confirmIcon="fa-hand-holding-medical"
                />
            )}
            {actionPendingMagicMissile && (() => {
              const { spell, totalMissiles, missileDamage, creatureTargets } = actionPendingMagicMissile;
              const currentTargetName = getTargetFromAttacker(getCombatSummary(campaignName), playerStats.name)?.name;
              return (
                <MagicMissileTargetPopup
                  spell={{ name: spell.name, level: spell.level || 0 }}
                  playerStats={playerStats}
                  campaignName={campaignName}
                  totalMissiles={totalMissiles}
                  missileDamage={missileDamage}
                  creatureTargets={creatureTargets}
                  currentTargetName={currentTargetName}
                  onConfirm={actionHandleMagicMissileConfirm}
                  onSkip={actionHandleMagicMissileSkip}
                />
              );
            })()}
            {actionPendingMageArmor && (
                <SecondaryTargetModal
                    title="Mage Armor"
                    targets={actionPendingMageArmor.creatureTargets.map(name => ({ name, type: 'creature' }))}
                    onTargetSelected={(targetName) => actionHandleMageArmorConfirm([targetName])}
                    onSkip={actionHandleMageArmorSkip}
                    description="Choose a creature within range. The target's base AC becomes 13 + Dexterity modifier. Mage Armor lasts 8 hours and ends on a long rest."
                    confirmLabel="Cast Mage Armor"
                    confirmIcon="fa-shield-halved"
                />
            )}
            {pendingActionMetamagic && (
                <MetamagicPopup
                    spell={{ name: pendingActionMetamagic.spellName, level: pendingActionMetamagic.spellLevel || 0 }}
                    playerStats={{ ...playerStats, _metamagicCurrentSP: pendingActionMetamagic._currentSP }}
                    campaignName={campaignName}
                    onConfirm={handleActionMetamagicConfirm}
                    onSkip={handleActionMetamagicSkip}
                />
            )}
        </>
    )
}
