import Popup from '../common/popup.jsx'
import MetamagicPopup from './popups/MetamagicPopup.jsx'
import CreatureSelectionModal from './modals/shared/CreatureSelectionModal.jsx'
import TargetWithCheckboxesPopup from './popups/TargetWithCheckboxesPopup.jsx'
import MagicMissileTargetPopup from './popups/MagicMissileTargetPopup.jsx'
import SpellDetailPopup from './char-spells/SpellDetailPopup.jsx'
import SecondaryTargetModal from './modals/shared/SecondaryTargetModal.jsx'
import { getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'

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
    actionPendingHaste,
    actionHandleHasteConfirm,
    actionHandleHasteSkip,
    actionPendingHeal,
    actionHandleHealConfirm,
    actionHandleHealSkip,
    actionPendingGreaterRestoration,
    actionHandleGreaterRestorationConfirm,
    actionHandleGreaterRestorationSkip,
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
            {actionPendingGreaterRestoration && (
                <TargetWithCheckboxesPopup
                    spell={{ name: actionPendingGreaterRestoration.spellName, level: actionPendingGreaterRestoration.spellLevel || 0 }}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    creatureTargets={actionPendingGreaterRestoration.creatureTargets}
                    range={actionPendingGreaterRestoration.range}
                    onConfirm={actionHandleGreaterRestorationConfirm}
                    onSkip={actionHandleGreaterRestorationSkip}
                />
            )}
            {actionPendingRemoveCurse && (
                <TargetWithCheckboxesPopup
                    spell={{ name: actionPendingRemoveCurse.spellName, level: actionPendingRemoveCurse.spellLevel || 0 }}
                    playerStats={playerStats}
                    campaignName={campaignName}
                    creatureTargets={actionPendingRemoveCurse.creatureTargets}
                    range={actionPendingRemoveCurse.range}
                    onConfirm={actionHandleRemoveCurseConfirm}
                    onSkip={actionHandleRemoveCurseSkip}
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
