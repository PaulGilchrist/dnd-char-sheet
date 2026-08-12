import React from 'react';
import CreatureSelectionModal from '../modals/shared/CreatureSelectionModal.jsx';
import PolymorphSelectionModal from '../modals/PolymorphSelectionModal.jsx';
import TruePolymorphPathModal from '../modals/TruePolymorphPathModal.jsx';
import { confirmShapechangeTransform } from '../../../services/automation/handlers/spells/shapechangeService.js';
import { prepareSpellCast, isFreeCastAuthorized } from '../../../services/rules/spells/spellPreparationService.js';

const CreatureTargetPopups = function CreatureTargetPopups({
    playerStats,
    campaignName,
    flowHoldMonster,
    handleHoldMonsterConfirm,
    handleHoldMonsterSkip,
    flowHoldPerson,
    handleHoldPersonConfirm,
    handleHoldPersonSkip,
    flowPolymorph,
    handlePolymorphConfirm,
    handlePolymorphSkip,
    pendingShapechange,
    flowAnimalShapes,
    handleAnimalShapesTargetConfirm,
    handleAnimalShapesSkip,
    flowTruePolymorph,
    handleTruePolymorphPathSelect,
    handleTruePolymorphSkip,
    handleTruePolymorphTargetConfirm,
    flowCharmPerson,
    handleCharmPersonConfirm,
    handleCharmPersonSkip,
    flowCharmMonster,
    handleCharmMonsterConfirm,
    handleCharmMonsterSkip,
    flowBanishment,
    handleBanishmentConfirm,
    handleBanishmentSkip,
    flowPrismaticSpray,
    handlePrismaticSprayConfirm,
    handlePrismaticSpraySkip,
    pendingHeroesFeast,
    handleHeroesFeastConfirm,
    handleHeroesFeastSkip,
    pendingBane,
    handleBaneConfirm,
    handleBaneSkip,
    pendingBless,
    handleBlessConfirm,
    handleBlessSkip,
    pendingFaerieFire,
    handleFaerieFireConfirm,
    handleFaerieFireSkip,
    pendingHolyAura,
    handleHolyAuraConfirm,
    handleHolyAuraSkip,
    pendingBeaconOfHope,
    handleBeaconOfHopeConfirm,
    handleBeaconOfHopeSkip,
    pendingSlow,
    handleSlowConfirm,
    handleSlowSkip,
    pendingPassWithoutTrace,
    handlePassWithoutTraceConfirm,
    handlePassWithoutTraceSkip,
    pendingGlobe,
    handleGlobeConfirm,
    handleGlobeSkip,
    pendingAntimagicField,
    handleAntimagicFieldConfirm,
    handleAntimagicFieldSkip,
    pendingForcecage,
    handleForcecageConfirm,
    handleForcecageSkip,
    pendingStinkingCloud,
    handleStinkingCloudConfirm,
    handleStinkingCloudSkip,
    pendingConfusion,
    handleConfusionConfirm,
    handleConfusionSkip,
    pendingWeb,
    handleWebConfirm,
    handleWebSkip,
    pendingAnimalFriendship,
    handleAnimalFriendshipConfirm,
    handleAnimalFriendshipSkip,
    pendingAuraOfLife,
    handleAuraOfLifeConfirm,
    handleAuraOfLifeSkip,
    pendingAuraOfPurity,
    handleAuraOfPurityConfirm,
    handleAuraOfPuritySkip,
    pendingCircleOfPower,
    handleCircleOfPowerConfirm,
    handleCircleOfPowerSkip,
    pendingCompulsion,
    handleCompulsionConfirm,
    handleCompulsionSkip,
    pendingSleetStorm,
    handleSleetStormConfirm,
    handleSleetStormSkip,
}) {
    return (
        <>
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
            {flowPolymorph && (
                <CreatureSelectionModal
                    title="Polymorph"
                    icon="fa-paw"
                    targets={flowPolymorph.creatureTargets}
                    maxTargets={flowPolymorph.maxTargets}
                    description="Choose a creature you can see within range. The target must succeed on a Wisdom saving throw or be transformed into a beast whose Challenge Rating is equal to or less than the target's Challenge Rating or level. The spell has no effect on a shapechanger or a creature with 0 hit points. Concentration, up to 1 hour."
                    confirmLabel="Cast Polymorph"
                    confirmIcon="fa-paw"
                    onConfirm={handlePolymorphConfirm}
                    onSkip={handlePolymorphSkip}
                />
            )}
            {pendingShapechange && (
                <PolymorphSelectionModal
                    playerStats={playerStats}
                    maxCR={playerStats.level}
                    campaignName={campaignName}
                    title="Shapechange"
                    icon="fa-paw"
                    actionLabel="Shapechange"
                    allowAnyCreature={true}
                    excludeTypes={['construct', 'undead']}
                    onConfirm={async (form) => {
                        const isCantrip = pendingShapechange.spell.level === 0;
                        if (!isCantrip) {
                            const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pendingShapechange.spell.name, pendingShapechange.spell.level, playerStats, campaignName);
                            const isUpcast = pendingShapechange.spell.isUpcast;
                            const upcastLevel = pendingShapechange.spell.upcastLevel;
                            await prepareSpellCast(pendingShapechange.spell, {}, {
                                playerName: playerStats.name,
                                playerStats,
                                campaignName,
                                isUpcast,
                                upcastLevel,
                                freeCastAuthorized,
                            });
                        }
                        await confirmShapechangeTransform({
                            targetName: playerStats.name,
                            form,
                            casterName: playerStats.name,
                            spell: pendingShapechange.spell,
                            spellLevel: pendingShapechange.spellLevel,
                            playerStats,
                            campaignName,
                        });
                    }}
                    onCancel={() => {}}
                />
            )}
            {flowAnimalShapes && (
                <CreatureSelectionModal
                    title="Animal Shapes"
                    icon="fa-paw"
                    targets={flowAnimalShapes.creatureTargets}
                    description="Choose any number of willing creatures you can see within range. Each target will be transformed into a beast of your choice (CR 4 or lower, Small or Large). No concentration required. Duration: 24 hours."
                    confirmLabel="Cast Animal Shapes"
                    confirmIcon="fa-paw"
                    onConfirm={handleAnimalShapesTargetConfirm}
                    onSkip={handleAnimalShapesSkip}
                />
            )}
            {flowTruePolymorph && !flowTruePolymorph.path && (
                <TruePolymorphPathModal
                    onConfirm={handleTruePolymorphPathSelect}
                    onCancel={handleTruePolymorphSkip}
                />
            )}
            {flowTruePolymorph && flowTruePolymorph.path === 'creature_to_creature' && (
                <CreatureSelectionModal
                    title="True Polymorph"
                    icon="fa-paw"
                    targets={flowTruePolymorph.creatureTargets}
                    maxTargets={flowTruePolymorph.maxTargets}
                    description="Choose a creature you can see within range. The target must succeed on a Wisdom saving throw or be transformed into a creature of your choice whose Challenge Rating is equal to or less than the target's Challenge Rating or level. The spell has no effect on a shapechanger or a creature with 0 hit points. Concentration, up to 1 hour."
                    confirmLabel="Cast True Polymorph"
                    confirmIcon="fa-paw"
                    onConfirm={handleTruePolymorphTargetConfirm}
                    onSkip={handleTruePolymorphSkip}
                />
            )}
            {flowTruePolymorph && flowTruePolymorph.path === 'creature_to_object' && (
                <CreatureSelectionModal
                    title="True Polymorph"
                    icon="fa-paw"
                    targets={flowTruePolymorph.creatureTargets}
                    maxTargets={flowTruePolymorph.maxTargets}
                    description="Choose a creature you can see within range. The target is transformed into a nonmagical object. The target gains the incapacitated condition. Concentration, up to 1 hour."
                    confirmLabel="Cast True Polymorph"
                    confirmIcon="fa-paw"
                    onConfirm={handleTruePolymorphTargetConfirm}
                    onSkip={handleTruePolymorphSkip}
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
            {flowPrismaticSpray && (
                <CreatureSelectionModal
                    title="Prismatic Spray"
                    icon="fa-eye"
                    targets={flowPrismaticSpray.creatureTargets}
                    maxTargets={flowPrismaticSpray.maxTargets}
                    description="Eight rays of light flash from you in a 60-foot Cone. Each creature in the Cone makes a DEX saving throw. For each target, roll 2d7 to determine which ray affects it. Choose creatures in the cone."
                    confirmLabel="Cast Prismatic Spray"
                    confirmIcon="fa-eye"
                    onConfirm={handlePrismaticSprayConfirm}
                    onSkip={handlePrismaticSpraySkip}
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
            {pendingForcecage && (
                <CreatureSelectionModal
                    title="Forcecage"
                    icon="fa-dungeon"
                    targets={pendingForcecage.creatureTargets}
                    description="Select the creatures completely inside the prison to trap. Trapped creatures can't leave by nonmagical means. No attack, spell, or effect can pass between inside and outside the prison. Each trapped creature can attempt a CHA save to use teleportation or interplanar travel to exit. Concentration, up to 1 hour."
                    confirmLabel="Cast Forcecage"
                    onConfirm={handleForcecageConfirm}
                    onSkip={handleForcecageSkip}
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
            {pendingSleetStorm && (
                <CreatureSelectionModal
                    title="Sleet Storm"
                    icon="fa-snowflake"
                    targets={pendingSleetStorm.creatureTargets}
                    description="Sleet falls in a 40-foot-tall, 20-foot-radius Cylinder within range. The area is Heavily Obscured. When a creature enters the Cylinder for the first time on a turn or starts its turn there, it must succeed on a DEX saving throw or have the Prone condition and lose Concentration. Concentration, up to 1 minute."
                    confirmLabel="Cast Sleet Storm"
                    confirmIcon="fa-snowflake"
                    onConfirm={handleSleetStormConfirm}
                    onSkip={handleSleetStormSkip}
                />
            )}
        </>
    );
};

export default CreatureTargetPopups;
