
import React from 'react'
import { cloneDeep } from 'lodash';
import useActionPopup from '../../../hooks/combat/useActionPopup.js'
import useLoggedDiceRoll from '../../../hooks/combat/useLoggedDiceRoll.js'
import { useDiceRollPopup } from '../../../hooks/combat/DiceRollContext.js'
import Popup from '../../common/popup.jsx'
import MetamagicPopup from '../popups/MetamagicPopup.jsx'
import SpellDetailPopup from './SpellDetailPopup.jsx'
import CharSpellSlots from './CharSpellSlots.jsx'
import MultiTargetPopup from '../popups/MultiTargetPopup.jsx'
import SecondaryTargetModal from '../modals/shared/SecondaryTargetModal.jsx'
import SingleResistanceSelectionModal from '../modals/SingleResistanceSelectionModal.jsx'
import CreatureSelectionModal from '../modals/shared/CreatureSelectionModal.jsx'
import HexAbilityModal from '../modals/HexAbilityModal.jsx'
import { getExcludedSpellNames } from '../../../services/ui/spellSectionUtils.js'
import MagicMissileTargetPopup from '../popups/MagicMissileTargetPopup.jsx'
import { getTargetFromAttacker } from '../../../services/rules/combat/damageUtils.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { useSpellMetamagicFlow } from '../../../hooks/combat/useSpellMetamagicFlow.js'
import { useSpellUpcastFlow } from '../../../hooks/combat/useSpellUpcastFlow.js'
import UpcastPopup from './UpcastPopup.jsx';
import { useSpellCastExecutor } from '../../../hooks/combat/useSpellCastExecutor.js';
import { useSpellPositionResolver } from '../../../hooks/combat/useSpellPositionResolver.js';
import { isInnateSorceryActive } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import utils from '../../../services/ui/utils.js';
import { normalizeAutoDamage, resolveAttackDamageStandalone } from '../useAttackDamageResolution.js';
import './CharSpells.css'

const CharSpells = function CharSpells({ playerStats, handleTogglePreparedSpells, campaignName, exhaustionPenalty = 0, conditionAttackMode, cannotAct, mapName, characters, setModalState }) {
    const _activeBuffs = useRuntimeValue(playerStats.name, 'activeBuffs', campaignName); (void _activeBuffs); // subscribe to activeBuffs changes for re-render
    const innateSorceryActive = isInnateSorceryActive(playerStats.name, campaignName);
    useActionPopup('spell');
    const { setPopupHtml } = useDiceRollPopup();
    const [wordsOfCreationTarget, setWordsOfCreationTarget] = React.useState(null);
    const { rollAttack, rollDamage } = useLoggedDiceRoll(playerStats.name, campaignName, {
        characters,
        autoDamageSource: 'char-spells',
        autoDamageRoll: async (autoDamage, isCrit) => {
            const { attack, ctx: ctxOverrides } = normalizeAutoDamage(autoDamage, isCrit, playerStats);
            await resolveAttackDamageStandalone(attack, ctxOverrides, { playerStats, campaignName, setPopupHtml, rollDamage, setModalState: () => {} });
        },
    });
    const [selectedSpell, setSelectedSpell] = React.useState(null);
    const [pendingGreaterRestorationTarget, setPendingGreaterRestorationTarget] = React.useState(null);
    const [pendingLesserRestorationTarget, setPendingLesserRestorationTarget] = React.useState(null);
    const isSorcerer = playerStats.class?.name === 'Sorcerer';
    const isWizard = playerStats.class?.name === 'Wizard';

    const { resolvePositions: resolveSpellPositions, cachedPosRef: cachedCastPosRef } = useSpellPositionResolver(campaignName, mapName, playerStats.name);

    const { castAction } = useSpellCastExecutor(rollAttack, rollDamage, playerStats, async () => null, campaignName, mapName, characters, setPopupHtml, {}, cachedCastPosRef, setModalState);

    const { pendingMetamagic, pendingMultiTarget, gateMetamagic, handleConfirm, handleSkip, handleMultiTargetConfirm, handleMultiTargetSkip, pendingHeroesFeast, handleHeroesFeastConfirm, handleHeroesFeastSkip, pendingGreaterRestoration, handleGreaterRestorationConfirm, handleGreaterRestorationSkip, handleGreaterRestorationNoEffects, pendingLesserRestoration, handleLesserRestorationConfirm, handleLesserRestorationSkip, pendingMageArmor, handleMageArmorConfirm, handleMageArmorSkip, pendingBane, handleBaneConfirm, handleBaneSkip, pendingBless, handleBlessConfirm, handleBlessSkip, pendingFaerieFire, handleFaerieFireConfirm, handleFaerieFireSkip, pendingHolyAura, handleHolyAuraConfirm, handleHolyAuraSkip, pendingBeaconOfHope, handleBeaconOfHopeConfirm, handleBeaconOfHopeSkip, pendingSlow, handleSlowConfirm, handleSlowSkip, pendingHaste, handleHasteConfirm, handleHasteSkip, pendingEnhanceAbility, enhanceAbilityStage, handleEnhanceAbilityAbilitySelect, handleEnhanceAbilityConfirm, handleEnhanceAbilitySkip, pendingBarkskin, handleBarkskinConfirm, handleBarkskinSkip, pendingInvisibility, handleInvisibilityConfirm, handleInvisibilitySkip, pendingGreaterInvisibility, handleGreaterInvisibilityConfirm, handleGreaterInvisibilitySkip, pendingFeignDeath, handleFeignDeathConfirm, handleFeignDeathSkip, pendingHeal, handleHealConfirm, handleHealSkip, pendingProtectionFromEvilAndGood, handleProtectionFromEvilAndGoodConfirm, handleProtectionFromEvilAndGoodSkip, pendingProtectionFromPoison, handleProtectionFromPoisonConfirm, handleProtectionFromPoisonSkip, pendingStoneSkin, handleStoneSkinConfirm, handleStoneSkinSkip, pendingProtectionFromEnergy, protectionFromEnergyStage, handleProtectionFromEnergyTargetSelect, handleProtectionFromEnergyTypeSelect, handleProtectionFromEnergySkip, pendingResistance, resistanceStage, handleResistanceTargetSelect, handleResistanceTypeSelect, handleResistanceSkip, pendingRemoveCurse, handleRemoveCurseConfirm, handleRemoveCurseSkip, pendingMagicMissile, handleMagicMissileConfirm, handleMagicMissileSkip, pendingPassWithoutTrace, handlePassWithoutTraceConfirm, handlePassWithoutTraceSkip, pendingGlobe, handleGlobeConfirm, handleGlobeSkip, pendingAntimagicField, handleAntimagicFieldConfirm, handleAntimagicFieldSkip, pendingRegenerate, handleRegenerateConfirm, handleRegenerateSkip, pendingHealingWord, handleHealingWordConfirm, handleHealingWordSkip, pendingCureWounds, handleCureWoundsConfirm, handleCureWoundsSkip, pendingStinkingCloud, handleStinkingCloudConfirm, handleStinkingCloudSkip, pendingWeb, handleWebConfirm, handleWebSkip, pendingAnimalFriendship, handleAnimalFriendshipConfirm, handleAnimalFriendshipSkip, pendingAuraOfLife, handleAuraOfLifeConfirm, handleAuraOfLifeSkip, pendingAuraOfPurity, handleAuraOfPurityConfirm, handleAuraOfPuritySkip, pendingCircleOfPower, handleCircleOfPowerConfirm, handleCircleOfPowerSkip, pendingCompulsion, handleCompulsionConfirm, handleCompulsionSkip, pendingAuraOfVitality, handleAuraOfVitalityConfirm, handleAuraOfVitalitySkip, pendingForesight, handleForesightConfirm, handleForesightSkip, pendingLongstrider, handleLongstriderConfirm, handleLongstriderSkip,     pendingConfusion, handleConfusionConfirm, handleConfusionSkip, pendingDeathWard, handleDeathWardConfirm, handleDeathWardSkip,     pendingHeroism, handleHeroismConfirm, handleHeroismSkip,   pendingHoldMonster: flowHoldMonster, pendingHoldPerson: flowHoldPerson, handleHoldMonsterConfirm, handleHoldMonsterSkip, handleHoldPersonConfirm, handleHoldPersonSkip, pendingCharmPerson: flowCharmPerson, handleCharmPersonConfirm, handleCharmPersonSkip, pendingCharmMonster: flowCharmMonster, handleCharmMonsterConfirm, handleCharmMonsterSkip, pendingBanishment: flowBanishment, handleBanishmentConfirm, handleBanishmentSkip } = useSpellMetamagicFlow(playerStats, campaignName, castAction, setWordsOfCreationTarget, characters, setPopupHtml);
    const { pendingUpcast, buildUpcastLevels, handleUpcastConfirm, handleUpcastCancel } = useSpellUpcastFlow(playerStats, campaignName);

    const handleSpellCast = React.useCallback(async (spell, metaCtx) => {
        setSelectedSpell(null);
        await resolveSpellPositions();

        gateMetamagic(spell, metaCtx);
    }, [gateMetamagic, resolveSpellPositions]);

    const [filterPrepared, setFilterPrepared] = React.useState(false);
    const [spells, setSpells] = React.useState([]);
    const is2024 = playerStats.rules === '2024';
    // Only 5e shows the prepared column for everyone; in 2024 it's Wizard-only (spellbook vs prepared).
    const showPreparedColumn = !is2024 || (is2024 && isWizard);

    React.useEffect(() => {
        if(playerStats.spellAbilities) {
            setFilterPrepared(false);
            const excludedSpellNames = getExcludedSpellNames(playerStats, campaignName);
            const allSpells = playerStats.spellAbilities.spells;
            setSpells(allSpells.filter(spell => !excludedSpellNames.has(spell.name)));
          }
      }, [playerStats, campaignName]);
    const handleTogglePreparedFilter = () => {
        const excludedSpellNames = getExcludedSpellNames(playerStats, campaignName);
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        if(!filterPrepared) {
            const filtered = spells.filter(spell => !excludedSpellNames.has(spell.name) && (spell.prepared === 'Always' || spell.prepared === 'Prepared'));
            setSpells(filtered);
        } else {
            const filtered = spells.filter(spell => !excludedSpellNames.has(spell.name));
            setSpells(filtered);
        }
        setFilterPrepared(!filterPrepared)
    }
    const handleSortLevel = () => {
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        // Sort by level (ascending) then by name
        spells.sort((a, b) => {
            if (a.level !== b.level) {
                return a.level - b.level;
            } else {
                return a.name.localeCompare(b.name);
              }
          });
        setSpells(spells);
    }
    const handleSortSpell = () => {
        const spells = cloneDeep(playerStats.spellAbilities.spells);
        spells.sort((a, b) => a.name.localeCompare(b.name));
        setSpells(spells);
    }
return (
        <div className="char-spells">
            {(playerStats.spellAbilities) && <div className="spell-popup-parent">
                    {(playerStats.spellAbilities.spells.length > 0) && selectedSpell && (
                        <Popup onClickOrKeyDown={() => setSelectedSpell(null)}>
                            <SpellDetailPopup
                                spell={selectedSpell}
                                playerStats={playerStats}
                                campaignName={campaignName}
                                playerLevel={playerStats.level}
                                upcastLevels={buildUpcastLevels(selectedSpell)}
                                onClose={() => setSelectedSpell(null)}
                                onCast={(spell, metaCtx) => {
                                    // SINGLE ENTRY POINT: Every spell cast MUST go through handleSpellCast → gateMetamagic.
                                    // gateMetamagic is the only function that calls prepareSpellCast (spells slots, concentration, free casts).
                                    // NEVER call prepareSpellCast, castAction, or executeSpellCast directly from JSX onClick handlers.
                                    setSelectedSpell(null);
                                    handleSpellCast(spell, metaCtx);
                                }}
                            />
                        </Popup>
                    )}
                    {pendingUpcast && (
                      <UpcastPopup
                        spell={pendingUpcast.spell}
                        levels={buildUpcastLevels(pendingUpcast.spell)}
                        onConfirm={handleUpcastConfirm}
                        onCancel={handleUpcastCancel}
                      />
                    )}
                    {pendingMetamagic && (
                      <MetamagicPopup
                        spell={{ name: pendingMetamagic.spellName, level: pendingMetamagic.spellLevel || 0 }}
                        playerStats={{ ...playerStats, _metamagicCurrentSP: pendingMetamagic._currentSP, _isPsionicSpell: pendingMetamagic.isPsionic, _psionicCost: pendingMetamagic.psionicCost }}
                        campaignName={campaignName}
                        onConfirm={handleConfirm}
                        onSkip={handleSkip}
                      />
                    )}
                    {pendingMagicMissile && (() => {
                      const { spell, totalMissiles, missileDamage, creatureTargets } = pendingMagicMissile;
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
                          onConfirm={handleMagicMissileConfirm}
                          onSkip={handleMagicMissileSkip}
                        />
                      );
                    })()}
                    {pendingMultiTarget && (
                      <MultiTargetPopup
                        spell={{ name: pendingMultiTarget.spellName, level: pendingMultiTarget.spellLevel || 0 }}
                        playerStats={playerStats}
                        campaignName={campaignName}
                        range={pendingMultiTarget.range}
                        creatureTargets={pendingMultiTarget.creatureTargets}
                        onConfirm={handleMultiTargetConfirm}
                        onSkip={handleMultiTargetSkip}
                      />
                    )}
                    {wordsOfCreationTarget && (
                      <SecondaryTargetModal
                        title={wordsOfCreationTarget.title}
                        targets={wordsOfCreationTarget.targets}
                        onTargetSelected={wordsOfCreationTarget.onTargetSelected}
                        onSkip={wordsOfCreationTarget.onSkip}
                        featureDescription={wordsOfCreationTarget.featureDescription}
                        description={wordsOfCreationTarget.description}
                        confirmLabel={wordsOfCreationTarget.confirmLabel}
                        confirmIcon={wordsOfCreationTarget.confirmIcon}
                      />
                    )}
                    {flowHoldMonster && (
                      <CreatureSelectionModal
                        title="Hold Monster"
                        icon="fa-hand-back-fist"
                        targets={flowHoldMonster.creatureTargets}
                        maxTargets={flowHoldMonster.maxTargets}
                        description="Choose a creature that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. Concentration, up to 1 minute."
                        confirmLabel="Cast Hold Monster"
                        confirmIcon="fa-hand-back-fist"
                        onConfirm={handleHoldMonsterConfirm}
                        onSkip={handleHoldMonsterSkip}
                      />
                    )}
                    {flowHoldPerson && (
                      <CreatureSelectionModal
                        title="Hold Person"
                        icon="fa-hand-back-fist"
                        targets={flowHoldPerson.creatureTargets}
                        maxTargets={flowHoldPerson.maxTargets}
                        description="Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. Concentration, up to 1 minute."
                        confirmLabel="Cast Hold Person"
                        confirmIcon="fa-hand-back-fist"
                        onConfirm={handleHoldPersonConfirm}
                        onSkip={handleHoldPersonSkip}
                      />
                    )}
                    {flowCharmPerson && (
                      <CreatureSelectionModal
                        title="Charm Person"
                        icon="fa-heart"
                        targets={flowCharmPerson.creatureTargets}
                        maxTargets={flowCharmPerson.maxTargets}
                        description="Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The charmed creature regards you as a friendly acquaintance. The spell ends if you or your companions do anything harmful to the target."
                        confirmLabel="Cast Charm Person"
                        confirmIcon="fa-heart"
                        onConfirm={handleCharmPersonConfirm}
                        onSkip={handleCharmPersonSkip}
                      />
                    )}
                    {flowCharmMonster && (
                      <CreatureSelectionModal
                        title="Charm Monster"
                        icon="fa-heart"
                        targets={flowCharmMonster.creatureTargets}
                        maxTargets={flowCharmMonster.maxTargets}
                        description="Choose a creature that you can see within range. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The charmed creature regards you as a friendly acquaintance. The spell ends if you or your companions do anything harmful to the target."
                        confirmLabel="Cast Charm Monster"
                        confirmIcon="fa-heart"
                        onConfirm={handleCharmMonsterConfirm}
                        onSkip={handleCharmMonsterSkip}
                      />
                    )}
                    {flowBanishment && (
                      <CreatureSelectionModal
                        title="Banishment"
                        icon="fa-door-open"
                        targets={flowBanishment.creatureTargets}
                        maxTargets={flowBanishment.maxTargets}
                        description="Choose a creature that you can see within range. The target must succeed on a Charisma saving throw or be transported to a harmless demiplane for the duration. While there, the target has the Incapacitated condition. Concentration, up to 1 minute."
                        confirmLabel="Cast Banishment"
                        confirmIcon="fa-door-open"
                        onConfirm={handleBanishmentConfirm}
                        onSkip={handleBanishmentSkip}
                      />
                    )}
                    {pendingHeroesFeast && (
                      <CreatureSelectionModal
                        title="Heroes' Feast"
                        icon="fa-champagne-glasses"
                        targets={pendingHeroesFeast.creatureTargets}
                        maxTargets={pendingHeroesFeast.maxTargets}
                        description="You conjure a feast that benefits up to twelve creatures. Each target gains resistance to Poison damage, immunity to the Frightened and Poisoned conditions, and their Hit Point maximum increases by 2d10. These benefits last 24 hours."
                        confirmLabel="Cast Heroes' Feast"
                        onConfirm={handleHeroesFeastConfirm}
                        onSkip={handleHeroesFeastSkip}
                      />
                    )}
                    {pendingBane && (
                      <CreatureSelectionModal
                        title="Bane"
                        icon="fa-shield-halved"
                        targets={pendingBane.creatureTargets}
                        maxTargets={pendingBane.maxTargets}
                        description="Curse up to three creatures of your choice that you can see within range. Affected creatures subtract 1d4 from attack rolls and saving throws."
                        confirmLabel="Cast Bane"
                        onConfirm={handleBaneConfirm}
                        onSkip={handleBaneSkip}
                      />
                    )}
                    {pendingBless && (
                      <CreatureSelectionModal
                        title="Bless"
                        icon="fa-hands"
                        targets={pendingBless.creatureTargets}
                        maxTargets={pendingBless.maxTargets}
                        description="You bless up to three creatures of your choice within range. Affected creatures add 1d4 to attack rolls and saving throws."
                        confirmLabel="Cast Bless"
                        onConfirm={handleBlessConfirm}
                        onSkip={handleBlessSkip}
                      />
                    )}
                    {pendingFaerieFire && (
                      <CreatureSelectionModal
                        title="Faerie Fire"
                        icon="fa-fire"
                        targets={pendingFaerieFire.creatureTargets}
                        description="Each creature in a 20-foot Cube within range must succeed on a Dexterity saving throw or be outlined in light for the duration. Affected creatures shed Dim Light in a 10-foot radius, can't benefit from the Invisible condition, and attack rolls against them have Advantage if the attacker can see them. Concentration, up to 1 minute."
                        confirmLabel="Cast Faerie Fire"
                        confirmIcon="fa-fire"
                        onConfirm={handleFaerieFireConfirm}
                        onSkip={handleFaerieFireSkip}
                      />
                    )}
                    {pendingHolyAura && (
                      <CreatureSelectionModal
                        title="Holy Aura"
                        icon="fa-sun"
                        targets={pendingHolyAura.creatureTargets}
                        description="You emit an aura in a 30-foot Emanation. While in the aura, creatures of your choice have Advantage on all saving throws, and other creatures have Disadvantage on attack rolls against them. In addition, when a Fiend or an Undead hits an affected creature with a melee attack roll, the attacker must succeed on a Constitution saving throw or be Blinded until the end of its next turn."
                        confirmLabel="Cast Holy Aura"
                        onConfirm={handleHolyAuraConfirm}
                        onSkip={handleHolyAuraSkip}
                      />
                    )}
                    {pendingBeaconOfHope && (
                      <CreatureSelectionModal
                        title="Beacon of Hope"
                        icon="fa-star-of-life"
                        targets={pendingBeaconOfHope.creatureTargets}
                        description="Choose any number of creatures within range. Targets gain advantage on WIS saving throws and death saves, and regain maximum HP when healed."
                        confirmLabel="Cast Beacon of Hope"
                        onConfirm={handleBeaconOfHopeConfirm}
                        onSkip={handleBeaconOfHopeSkip}
                      />
                    )}
                    {pendingSlow && (
                      <CreatureSelectionModal
                        title="Slow"
                        icon="fa-clock"
                        targets={pendingSlow.creatureTargets}
                        description="Choose a creature within range. The target must make a WIS saving throw or be affected by Slow: Speed halved, -2 AC penalty, disadvantage on DEX saves, no reactions, action or bonus action (not both), one attack max, 25% somatic spell failure chance. Repeats WIS save at end of each turn."
                        confirmLabel="Cast Slow"
                        onConfirm={handleSlowConfirm}
                        onSkip={handleSlowSkip}
                      />
                    )}
                    {pendingPassWithoutTrace && (
                      <CreatureSelectionModal
                        title="Pass Without Trace"
                        icon="fa-ghost"
                        targets={pendingPassWithoutTrace.creatureTargets}
                        description="A veil of shadows and silence radiates from you, masking you and your companions from detection. Choose creatures within 30 feet of you. Each chosen creature has a +10 bonus to Dexterity (Stealth) checks and can't be tracked except by magical means."
                        confirmLabel="Cast Pass Without Trace"
                        onConfirm={handlePassWithoutTraceConfirm}
                        onSkip={handlePassWithoutTraceSkip}
                      />
                    )}
                    {pendingBeaconOfHope && (
                      <CreatureSelectionModal
                        title="Beacon of Hope"
                        icon="fa-heart-pulse"
                        targets={pendingBeaconOfHope.creatureTargets}
                        description="This spell bestows hope and vitality. Choose any number of creatures within range. For the duration, each target has advantage on wisdom saving throws and death saving throws, and regains the maximum number of hit points possible from any healing."
                        confirmLabel="Cast Beacon of Hope"
                        onConfirm={handleBeaconOfHopeConfirm}
                        onSkip={handleBeaconOfHopeSkip}
                      />
                    )}
                    {pendingGlobe && (
                      <CreatureSelectionModal
                        title="Globe of Invulnerability"
                        icon="fa-shield-halved"
                        targets={pendingGlobe.creatureTargets}
                        description="Choose creatures within 10 feet to protect by the globe barrier. All creatures inside the barrier are protected from spells of 5th level or lower from outside the globe."
                        confirmLabel="Activate Globe"
                        onConfirm={handleGlobeConfirm}
                        onSkip={handleGlobeSkip}
                      />
                    )}
                    {pendingAntimagicField && (
                      <CreatureSelectionModal
                        title="Antimagic Field"
                        icon="fa-shield-halved"
                        targets={pendingAntimagicField.creatureTargets}
                        description="Select all creatures within the 10-foot radius of the antimagic field. The caster is included by default. Only weapon attacks are allowed within the field — all magic and spells are suppressed."
                        confirmLabel="Cast Antimagic Field"
                        onConfirm={handleAntimagicFieldConfirm}
                        onSkip={handleAntimagicFieldSkip}
                      />
                    )}
                    {pendingStinkingCloud && (
                      <CreatureSelectionModal
                        title="Stinking Cloud"
                        icon="fa-cloud"
                        targets={pendingStinkingCloud.creatureTargets}
                        description="A 20-foot-radius sphere of yellow, nauseating gas appears. Each creature in the area must make a CON save or become Poisoned. The cloud is heavily obscured. Concentration, up to 1 minute. Expires on concentration loss, initiative roll, short rest, or long rest."
                        confirmLabel="Cast Stinking Cloud"
                        onConfirm={handleStinkingCloudConfirm}
                        onSkip={handleStinkingCloudSkip}
                      />
                    )}
                    {pendingConfusion && (
                      <CreatureSelectionModal
                        title="Confusion"
                        icon="fa-circle-notch"
                        targets={pendingConfusion.creatureTargets}
                        description="A 10-foot-radius sphere of swirling chaos appears at a point within range. Each creature in the area must make a WIS save or become Charmed and unable to take Bonus Actions or Reactions. At the start of each turn, a confused creature rolls 1d10 for behavior. End of turn: repeat WIS save (DC {dc}); success ends the spell. Concentration, up to 1 minute."
                        confirmLabel="Cast Confusion"
                        confirmIcon="fa-circle-notch"
                        onConfirm={handleConfusionConfirm}
                        onSkip={handleConfusionSkip}
                      />
                    )}
                    {pendingWeb && (
                      <CreatureSelectionModal
                        title="Web"
                        icon="fa-spider-web"
                        targets={pendingWeb.creatureTargets}
                        description="A 20-foot cube of sticky webbing appears at a point within range. Each creature in the area must make a DEX save or become Restrained. The webs are difficult terrain and lightly obscured. Concentration, up to 1 hour. STR save each turn or remain Restrained. Restrained creatures can use action for STR (Athletics) check vs DC to break free."
                        confirmLabel="Cast Web"
                        onConfirm={handleWebConfirm}
                        onSkip={handleWebSkip}
                      />
                    )}
                    {pendingAnimalFriendship && (
                      <CreatureSelectionModal
                        title="Animal Friendship"
                        icon="fa-paw"
                        targets={pendingAnimalFriendship.creatureTargets.map(name => ({ name, type: 'beast' }))}
                        maxTargets={pendingAnimalFriendship.spellLevel}
                        description="This spell lets you convince a beast that you mean it no harm. Choose a beast that you can see within range. It must see and hear you. The target must succeed on a WIS saving throw or be charmed by you for the duration. If you or one of your allies deals damage to the target, the spell ends. You can target one additional Beast for each spell slot level above 1."
                        confirmLabel="Cast Animal Friendship"
                        onConfirm={handleAnimalFriendshipConfirm}
                        onSkip={handleAnimalFriendshipSkip}
                      />
                    )}
                    {pendingAuraOfLife && (
                      <CreatureSelectionModal
                        title="Aura of Life"
                        icon="fa-heart-pulse"
                        targets={pendingAuraOfLife.creatureTargets}
                        maxTargets={5}
                        description="Choose up to 5 willing creatures within 30 feet. Each target gains resistance to necrotic damage, their hit point maximum can't be reduced, and they regain 1 HP at the start of their turn if they have 0 HP."
                        confirmLabel="Cast Aura of Life"
                        onConfirm={handleAuraOfLifeConfirm}
                        onSkip={handleAuraOfLifeSkip}
                      />
                    )}
                    {pendingAuraOfPurity && (
                      <CreatureSelectionModal
                        title="Aura of Purity"
                        icon="fa-shield-halved"
                        targets={pendingAuraOfPurity.creatureTargets}
                        maxTargets={5}
                        description="Choose up to 5 willing creatures within 30 feet. Each target gains resistance to Poison damage and Advantage on saving throws to avoid or end effects that include the Blinded, Charmed, Deafened, Frightened, Paralyzed, Poisoned, or Stunned condition."
                        confirmLabel="Cast Aura of Purity"
                        onConfirm={handleAuraOfPurityConfirm}
                        onSkip={handleAuraOfPuritySkip}
                      />
                    )}
                    {pendingCircleOfPower && (
                      <CreatureSelectionModal
                        title="Circle of Power"
                        icon="fa-shield-halved"
                        targets={pendingCircleOfPower.creatureTargets}
                        maxTargets={5}
                        description="An aura radiates from you in a 30-foot Emanation. Choose up to 5 creatures within the aura (including yourself). Each target gains Advantage on saving throws against spells and other magical effects, and takes no damage on a successful save against effects that allow half damage. Concentration, up to 10 minutes."
                        confirmLabel="Cast Circle of Power"
                        onConfirm={handleCircleOfPowerConfirm}
                        onSkip={handleCircleOfPowerSkip}
                      />
                    )}
                    {pendingCompulsion && (
                      <CreatureSelectionModal
                        title="Compulsion"
                        icon="fa-people-arrows"
                        targets={pendingCompulsion.creatureTargets}
                        description="Choose creatures within 30 feet. Each target must make a WIS saving throw or become Charmed. As a bonus action on each of its turns, the charmed creature must use its movement to travel to the nearest space that is furthest away from you. Concentration, up to 1 minute. Expires on concentration loss, initiative roll, short rest, or long rest."
                        confirmLabel="Cast Compulsion"
                        onConfirm={handleCompulsionConfirm}
                        onSkip={handleCompulsionSkip}
                      />
                    )}
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
                    {(() => {
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

                      const handleTargetSelected = async (targetName) => {
                        const effects = await getEffectsForTarget(targetName);
                        setPendingGreaterRestorationTarget({ targetName, effects });
                      };

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

                      if (pendingGreaterRestoration && !pendingGreaterRestorationTarget) {
                        return (
                          <SecondaryTargetModal
                            title="Greater Restoration"
                            targets={pendingGreaterRestoration.creatureTargets.map(name => ({ name, type: 'creature' }))}
                            onTargetSelected={handleTargetSelected}
                            onSkip={handleGreaterRestorationSkip}
                            description={`Choose a creature within <strong>${pendingGreaterRestoration.range}</strong>. You'll select which debilitating effect to remove.`}
                            confirmLabel="Cast Greater Restoration"
                            confirmIcon="fa-hand-holding-medical"
                          />
                        );
                      }

                      if (pendingGreaterRestorationTarget) {
                        const hasEffects = pendingGreaterRestorationTarget.effects.length > 0;
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
                      }

                      return null;
                    })()}
                    {(() => {
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

                      const handleTargetSelected = async (targetName) => {
                        const conditions = await getConditionsForTarget(targetName);
                        setPendingLesserRestorationTarget({ targetName, conditions });
                      };

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

                      if (pendingLesserRestoration && !pendingLesserRestorationTarget) {
                        return (
                          <SecondaryTargetModal
                            title="Lesser Restoration"
                            targets={pendingLesserRestoration.creatureTargets.map(name => ({ name, type: 'creature' }))}
                            onTargetSelected={handleTargetSelected}
                            onSkip={handleLesserRestorationSkip}
                            description={`Choose a creature within <strong>${pendingLesserRestoration.range}</strong>. You'll select one condition to remove.`}
                            confirmLabel="Cast Lesser Restoration"
                            confirmIcon="fa-hand-holding-medical"
                          />
                        );
                      }

                      if (pendingLesserRestorationTarget) {
                        const hasConditions = pendingLesserRestorationTarget.conditions.length > 0;
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
                      }

                      return null;
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
            <br />
            <div className='spell-abilities'>
                {/*
                 * CHAR SPELLS — The remaining spells after Action, Bonus Action, and Reaction spells
                 * have been placed in their respective sections. These are primarily non-damage,
                 * non-healing spells (utility, ritual, etc.) that don't fit elsewhere.
                 *
                 * A spell exists in EXACTLY ONE section on the character sheet. No duplicates.
                 * Action spells with damage/healing → CharActions
                 * Bonus action spells → CharBonusActions
                 * Reaction spells → CharReactions
                 * Everything else → CharSpells (including non-damage/non-healing action spells)
                 *
                 * HANDLERS: Standard spell slot casting via useSpellCastExecutor / useSpellMetamagicFlow.
                 * Spells with special target selection (e.g. Aid, Heroes' Feast) are gated in the hook
                 * and shown via popups.
                 */}
                <div className="sectionHeader"><h4>&nbsp;Spells</h4></div>
                <div>
                    <b className={'clickable' + (cannotAct ? ' disabled-attack' : '') + (exhaustionPenalty > 0 || conditionAttackMode === 'disadvantage' || cannotAct ? ' stat--penalized' : '')} onClick={() => {
                      if (cannotAct) return;
                      rollAttack('Spell Attack', playerStats.spellAbilities.toHit - exhaustionPenalty, { forcedMode: conditionAttackMode !== 'normal' ? conditionAttackMode : (isSorcerer && innateSorceryActive ? 'advantage' : undefined) });
                    }}>Attack (to hit):</b> <span className={exhaustionPenalty > 0 || conditionAttackMode === 'disadvantage' || cannotAct ? 'stat--penalized' : ''}>+{playerStats.spellAbilities.toHit - exhaustionPenalty}</span><br/>
                    <b>Modifier:</b> <span className={exhaustionPenalty > 0 ? 'stat--penalized' : ''}>+{playerStats.spellAbilities.modifier - exhaustionPenalty}</span><br/>
                      <b>Save DC:</b> {playerStats.spellAbilities.saveDc + (innateSorceryActive ? 1 : 0)}
                </div>
                <div>
                    <b>Cantrips Known:</b> {playerStats.spellAbilities.cantrips_known ? playerStats.spellAbilities.cantrips_known : 0}<br/>
                    {showPreparedColumn && <div>
                        <b>Prepared Spells:</b> {playerStats.spellAbilities.prepared_spells || playerStats.spellAbilities.spells_known ? (playerStats.spellAbilities.prepared_spells || playerStats.spellAbilities.spells_known) : 'All'}<br/>                    
                        <b>Max Prepared:</b> {playerStats.spellAbilities.maxPreparedSpells ? playerStats.spellAbilities.maxPreparedSpells : 'All'}
                    </div>}
                </div>
                <CharSpellSlots playerStats={playerStats} campaignName={campaignName}></CharSpellSlots>
            </div>
            {spells.length > 0 && <table className='table-spells table-striped'>
                <thead>
                    <tr>
                        <th className='left clickable' onClick={handleSortSpell}>Spell</th>
                        <th className='clickable' onClick={handleSortLevel}>Level</th>
                        {showPreparedColumn && <th className='clickable' onClick={handleTogglePreparedFilter}>Prepared</th>}
                        <th>Time</th>
                        <th>Range</th>
                        <th>Effect</th>
                        <th>Duration</th>
                        <th className='left'>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {spells.map((spell) => {
                        let notes = [];
                        if(spell.components) notes.push(spell.components.join('/'));
                        let effect = 'Utility';
                        if(spell.damage) {
                            const slotDmg = spell.damage.damage_at_slot_level;
                            const charDmg = spell.damage.damage_at_character_level;
                            const dmgObj = slotDmg && Object.keys(slotDmg).length ? slotDmg : charDmg;
                            if (dmgObj) {
                                const isCantrip = spell.level === 0;
                                let damageDisplay = isCantrip ? dmgObj[Math.max(...Object.keys(dmgObj).map(Number).filter(l => l <= playerStats.level))] || dmgObj[Object.keys(dmgObj)[0]] : dmgObj[Object.keys(dmgObj)[0]];
                                if (spell.name === "Hunter's Mark" && playerStats.class?.name === 'Ranger' && playerStats.level >= 20) {
                                    damageDisplay = damageDisplay.replace('1d6', '1d10');
                                }
                                if (isCantrip) {
                                    effect = `${damageDisplay} ${spell.damage.damage_type}`;
                                } else {
                                    effect = `${damageDisplay} ${spell.damage.damage_type}`;
                                }
                                if (spell.dc) {
                                    const saveLabel = spell.dc.dc_success === 'half' ? 'half' : 'negates';
                                    effect += ` (${spell.dc.dc_type} ${saveLabel})`;
                                }
                            }
                        } else if (spell.dc) {
                            const saveLabel = spell.dc.dc_success === 'half' ? 'half' : spell.dc.dc_success === 'negates' ? 'negates' : '';
                            effect = spell.dc.dc_type + (saveLabel ? ` ${saveLabel}` : '');
                        }
                        const isPrepared = spell.prepared === 'Always' || spell.prepared === 'Prepared';
                        // 2024 wizards: unprepared non-ritual spells are in the spellbook but not castable;
                        // unprepared rituals remain castable via Ritual Adept. Other classes always have
                        // prepared spells, so nothing is ever grayed.
                        const isGrayedNonCastable = is2024 && isWizard && !isPrepared && !spell.ritual;
                        return <tr key={spell.name} className={isGrayedNonCastable ? 'spell-row-not-castable' : ''}>
                            <td className={`left spell-name ${isGrayedNonCastable ? 'not-castable' : 'clickable'}`} title={isGrayedNonCastable ? 'Not prepared' : undefined} onClick={() => { if (!isGrayedNonCastable) setSelectedSpell(spell); }}>{spell.name}</td>
                            <td>{spell.level === 0 ? 'Cantrip' : spell.level}</td>
                            {showPreparedColumn && (spell.prepared !== 'Prepared' && spell.prepared !== '') && <td>{spell.prepared}</td>}
                            {showPreparedColumn && (spell.prepared === 'Prepared' || spell.prepared === '') && <td><input tabIndex={0} type="checkbox" checked={spell.prepared === 'Prepared'} onChange={() => handleTogglePreparedSpells(spell.name)}/></td>}
                            <td>{spell.casting_time ? spell.casting_time.replace(/\bbonus action\b/g, 'BA').replace(/\baction\b/g, ' A').replace(/\breaction\b/g, 'Reaction').replace(/\bminute\b/g, 'min').replace(/\bminutes\b/g, 'min') : ''}</td>
                            <td>{spell.range}</td>
                            <td>{effect}</td>
                            <td>{spell.duration ? spell.duration.replace('Instantaneous','Instant').replace('minute','min').replace('minutes','min').replace('up to ','') : ''}</td>
                            <td className='left'>{notes.join(', ').replace('Concentration','Con')}</td>
                        </tr>
                    })}
                </tbody>
            </table>}
        </div>}
    </div>
    )
};

export default CharSpells
