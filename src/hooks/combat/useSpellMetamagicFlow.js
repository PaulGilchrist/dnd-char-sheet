import React from 'react'
import { getMaxSorceryPoints, spendSorceryPoints, logMetamagicUse } from './useMetamagic.js'
import { addEntry } from '../../services/ui/logService.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'
import { gateMetamagic as executeGateMetamagic } from './useSpellMetamagicGates.js'
import { confirmRemoveCurse } from '../../services/rules/features/removeCurseService.js'
import {
    applyAidEffect,
    applyHeroesFeastEffect,
    applyLesserRestorationEffect,
    applyMageArmorEffect,
    applyProtectionFromEnergyHandler,
    applyProtectionFromEvilAndGood,
    applyProtectionFromPoisonHandler,
    applyResistanceEffect,
    applyShieldOfFaithEffect,
    applyBarkskinEffect,
    applyBaneEffect,
    applyBlessEffect,
    applyBeaconOfHopeEffect,
    applyHolyAuraEffect,
    applyHaste,
    applyInvisibility,
    applyPassWithoutTraceEffect,
    applyGreaterInvisibility,
    applyAuraOfLifeEffect,
    applyAuraOfPurityEffect,
    applyCircleOfPowerEffect,
    applyAuraOfVitalityEffect,
    applyCompulsionEffect,
    applyDeathWardEffect,
    applyEnhanceAbilityEffect,
    applyFeignDeath,
    applyHeroism,
    applyLongstriderEffect,
    applySpareTheDyingEffect,
    applyStoneSkinHandler,
    handleSanctuary,
} from '../../services/automation/index.js'
import { triggerHeal } from '../../services/rules/features/healService.js'
import { triggerHealingWord } from '../../services/rules/features/healingWordService.js'
import { triggerForesight } from '../../services/rules/features/foresightService.js'
import { triggerHoldMonster } from '../../services/rules/features/holdMonsterService.js'
import { triggerCharmPerson } from '../../services/rules/features/charmPersonService.js'
import { triggerCharmMonster } from '../../services/rules/features/charmMonsterService.js'
import { triggerBanishment } from '../../services/rules/features/banishmentService.js'
import { applyPolymorph } from '../../services/automation/handlers/spells/polymorphService.js'
import { applyAnimalShapes } from '../../services/automation/handlers/spells/animalShapesService.js'
import { applyTruePolymorph } from '../../services/automation/handlers/spells/truePolymorphService.js'
import { triggerFaerieFire } from '../../services/rules/features/faerieFireService.js'
import { triggerRevivify } from '../../services/rules/features/revivifyService.js'
import { executeHandler } from '../../services/automation/index.js'
import { useConfirmableFlow, rollbackSpellSlot } from './useConfirmableFlow.js'
import { confirmGreaterRestoration } from '../../services/rules/features/greaterRestorationService.js'
import { confirmRegenerate } from '../../services/rules/features/regenerateService.js'
import { prepareSpellCast, isFreeCastAuthorized } from '../../services/rules/spells/spellPreparationService.js'
import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js'
import { getConsumedMaterial, hasMaterial, consumeMaterial } from '../../services/rules/spells/materialComponents.js'

export function useSpellMetamagicFlow(playerStats, campaignName, onExecute, setSecondaryTargetModal, characters = [], setPopupHtml) {
  const isSorcerer = playerStats?.class?.name === 'Sorcerer';
  const { setPending: cfSetPending, getPending, createConfirmHandler, createSkipHandler, clearPending: cfClearPending } = useConfirmableFlow(playerStats, campaignName);

  const pendingMetamagic = getPending('metamagic');
  const pendingMultiTarget = getPending('multiTarget');
  const pendingAid = getPending('aid');
  const pendingHeroesFeast = getPending('heroesFeast');
  const pendingGreaterRestoration = getPending('greaterRestoration');
  const pendingLesserRestoration = getPending('lesserRestoration');
  const pendingMageArmor = getPending('mageArmor');
  const pendingShieldOfFaith = getPending('shieldOfFaith');
  const pendingProtectionFromEnergy = getPending('protectionFromEnergy');
  const pendingResistance = getPending('resistance');
  const pendingRemoveCurse = getPending('removeCurse');
  const pendingMagicMissile = getPending('magicMissile');
  const pendingBane = getPending('bane');
  const pendingBless = getPending('bless');
  const pendingFaerieFire = getPending('faerieFire');
  const pendingHolyAura = getPending('holyAura');
  const pendingHaste = getPending('haste');
  const pendingEnhanceAbility = getPending('enhanceAbility');
  const pendingBarkskin = getPending('barkskin');
  const pendingInvisibility = getPending('invisibility');
  const pendingGreaterInvisibility = getPending('greaterInvisibility');
  const pendingFeignDeath = getPending('feignDeath');
  const pendingHeal = getPending('heal');
  const pendingPassWithoutTrace = getPending('passWithoutTrace');
  const pendingBeaconOfHope = getPending('beaconOfHope');
  const pendingSlow = getPending('slow');
  const pendingGlobe = getPending('globe');
  const pendingForcecage = getPending('forcecage');
  const pendingAntimagicField = getPending('antimagicField');
  const pendingRegenerate = getPending('regenerate');
  const pendingHealingWord = getPending('healingWord');
  const pendingCureWounds = getPending('cureWounds');
  const pendingStinkingCloud = getPending('stinkingCloud');
  const pendingConfusion = getPending('confusion');
  const pendingWeb = getPending('web');
  const pendingAnimalFriendship = getPending('animalFriendship');
  const pendingAuraOfLife = getPending('auraOfLife');
  const pendingAuraOfPurity = getPending('auraOfPurity');
    const pendingCircleOfPower = getPending('circleOfPower');
    const pendingCompulsion = getPending('compulsion');
  const pendingAuraOfVitality = getPending('auraOfVitality');
  const _pendingDeathWard = getPending('deathWard');
  const pendingProtectionFromEvilAndGood = getPending('protectionFromEvilAndGood');
  const pendingProtectionFromPoison = getPending('protectionFromPoison');
  const pendingStoneSkin = getPending('stoneSkin');
  const pendingHeroism = getPending('heroism');
  const pendingForesight = getPending('foresight');
  const pendingLongstrider = getPending('longstrider');
  const pendingSpareTheDying = getPending('spareTheDying');
  const pendingHoldMonster = getPending('holdMonster');
  const pendingHoldPerson = getPending('holdPerson');
  const pendingPolymorph = getPending('polymorph');
  const pendingShapechange = getPending('shapechange');
  const pendingAnimalShapes = getPending('animalShapes');
  const pendingTruePolymorph = getPending('truePolymorph');
  const pendingCharmPerson = getPending('charmPerson');
  const pendingCharmMonster = getPending('charmMonster');
  const pendingBanishment = getPending('banishment');
  const pendingPrismaticSpray = getPending('prismatic_spray');
  const pendingRevivify = getPending('revivify');
  const pendingSanctuary = getPending('sanctuary');
  const pendingSleetStorm = getPending('sleetStorm');

  const [resistanceStage, setResistanceStage] = React.useState(null);
  const [resistanceSelectedTargets, setResistanceSelectedTargets] = React.useState([]);

  const [protectionFromEnergyStage, setProtectionFromEnergyStage] = React.useState(null);
  const [protectionFromEnergySelectedTarget, setProtectionFromEnergySelectedTarget] = React.useState(null);

  const [enhanceAbilityStage, setEnhanceAbilityStage] = React.useState(null);
  const [enhanceAbilitySelectedAbility, setEnhanceAbilitySelectedAbility] = React.useState(null);

  React.useEffect(() => {
    if (pendingResistance && resistanceStage === null) {
      setResistanceStage('target');
    }
  }, [pendingResistance, resistanceStage]);

  React.useEffect(() => {
    if (pendingProtectionFromEnergy && protectionFromEnergyStage === null) {
      setProtectionFromEnergyStage('target');
    }
  }, [pendingProtectionFromEnergy, protectionFromEnergyStage]);

  React.useEffect(() => {
    if (pendingEnhanceAbility && enhanceAbilityStage === null) {
      setEnhanceAbilityStage('ability');
    }
  }, [pendingEnhanceAbility, enhanceAbilityStage]);

  const gateMetamagic = React.useCallback(async (spell, metaCtx = {}) => {
    await executeGateMetamagic(spell, metaCtx, {
      hasMaterial, setPopupHtml, isSorcerer, playerStats, campaignName, cfSetPending, setSecondaryTargetModal, characters, onExecute
    });
  }, [isSorcerer, playerStats, campaignName, onExecute, cfSetPending, setSecondaryTargetModal, characters, setPopupHtml]);


  const handleConfirm = React.useCallback(async (result) => {
    const pending = pendingMetamagic;
    if (!pending) return;

    cfClearPending('metamagic');

    let totalMetamagicCost = result?.totalCost || 0;
    let psionicCost = 0;

    if (pending.isPsionic && !result?.options?.includes('Subtle Spell')) {
      psionicCost = pending.psionicCost;
    }

    const totalCost = totalMetamagicCost + psionicCost;
    if (totalCost > 0) {
      spendSorceryPoints(playerStats.name, totalCost, campaignName, getMaxSorceryPoints(playerStats));
    }

    const metamagicOptions = result?.options || [];
    if (psionicCost > 0 && !metamagicOptions.includes('Psionic Sorcery')) {
      metamagicOptions.push('Psionic Sorcery');
    }

    if (totalCost > 0) {
      logMetamagicUse(campaignName, playerStats.name, pending.spellName, metamagicOptions, totalCost);
    }

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: pending._metaCtx?.multiTarget || null,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      metamagic: metamagicOptions,
      spCost: totalCost,
      timestamp: Date.now(),
    }).catch(() => {});

    const metaCtx = { ...pending._metaCtx };
    if (result?.options) {
      if (result.options.includes('Heightened Spell')) metaCtx.metamagicHeighten = true;
      if (result.options.includes('Careful Spell')) metaCtx.metamagicCareful = true;
      if (result.options.includes('Twinned Spell') && result.twinTarget) metaCtx.metamagicTwinTarget = result.twinTarget;
      if (result.options.includes('Distant Spell')) metaCtx.metamagicDistant = true;
    }
    if (psionicCost > 0) {
      metaCtx.psionicSpell = true;
    }

    const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pending.spellName, pending.spellLevel, playerStats, campaignName);
    const isUpcast = pending.spell?.isUpcast;
    const upcastLevel = pending.spell?.upcastLevel;
    const result2 = await prepareSpellCast(pending.spell, metaCtx, {
      playerName: playerStats.name,
      playerStats,
      campaignName,
      isUpcast,
      upcastLevel,
      freeCastAuthorized,
    });
    if (!metaCtx.slotLevel && upcastLevel) {
      metaCtx.slotLevel = upcastLevel;
    }
    const sorcMaterial = getConsumedMaterial(pending.spell);
    if (sorcMaterial) await consumeMaterial(playerStats, sorcMaterial.itemName, campaignName);
    onExecute(result2.modifiedSpell, result2.metaCtx);
  }, [pendingMetamagic, playerStats, campaignName, onExecute, cfClearPending]);

  const handleSkip = React.useCallback(async () => {
    const pending = pendingMetamagic;
    if (!pending) return;

    cfClearPending('metamagic');

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      metamagic: [],
      spCost: 0,
      timestamp: Date.now(),
    }).catch(() => {});

    const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pending.spellName, pending.spellLevel, playerStats, campaignName);
    const result = await prepareSpellCast(pending.spell, {}, {
      playerName: playerStats.name,
      playerStats,
      campaignName,
      isUpcast: false,
      freeCastAuthorized,
    });
    onExecute(result.modifiedSpell, result.metaCtx);
  }, [pendingMetamagic, playerStats, campaignName, onExecute, cfClearPending]);

  const handleMultiTargetConfirm = React.useCallback((result) => {
    const pending = pendingMultiTarget;
    if (!pending) return;

    cfClearPending('multiTarget');

    const targets = pending.creatureTargets || [];
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets: targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const metaCtx = {};
    if (result?.secondTarget) {
      metaCtx.multiTarget = result.secondTarget;
    }

    onExecute(pending.spell, metaCtx);
  }, [pendingMultiTarget, playerStats, campaignName, onExecute, cfClearPending]);

  const handleMultiTargetSkip = React.useCallback(() => {
    const pending = pendingMultiTarget;
    if (!pending) return;

    cfClearPending('multiTarget');

    const targets = pending.creatureTargets || [];
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets: targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    onExecute(pending.spell, {});
  }, [pendingMultiTarget, playerStats, campaignName, onExecute, cfClearPending]);

  const handleAidConfirm = createConfirmHandler('aid', async (pending, result) => {
    await applyAidEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'aid', range: pending.range, maxTargets: pending.maxTargets } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleAidSkip = createSkipHandler('aid', (pending) => pending.creatureTargets);

  const handleBaneConfirm = createConfirmHandler('bane', async (pending, result) => {
    await applyBaneEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'bane', range: pending.range, maxTargets: pending.maxTargets } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleBaneSkip = createSkipHandler('bane', (pending) => pending.creatureTargets);

  const handleBlessConfirm = createConfirmHandler('bless', async (pending, result) => {
    await applyBlessEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'bless', range: pending.range, maxTargets: pending.maxTargets } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleBlessSkip = createSkipHandler('bless', (pending) => pending.creatureTargets);

  const handleFaerieFireConfirm = createConfirmHandler('faerieFire', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    const popup = await triggerFaerieFire(pending.spell, { targets: targetNames }, playerStats, campaignName, null);
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleFaerieFireSkip = createSkipHandler('faerieFire', (pending) => pending.creatureTargets);

  const handleHolyAuraConfirm = createConfirmHandler('holyAura', async (pending, result) => {
    const popup = await applyHolyAuraEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'holy_aura', duration: pending.spell.duration, auraRange: 30, casting_time: pending.castingTime } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleHolyAuraSkip = createSkipHandler('holyAura', (pending) => pending.creatureTargets);

  const handleSlowConfirm = createConfirmHandler('slow', async (pending, result) => {
    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'slow', range: pending.range },
      metaCtx: { targets: result },
    };
    await executeHandler(action, playerStats, campaignName, null, null);
  }, (pending) => pending.creatureTargets);

  const handleSlowSkip = createSkipHandler('slow', (pending) => pending.creatureTargets);

  const handleHasteSkip = createSkipHandler('haste', (pending) => pending.creatureTargets);

  const handleHasteConfirm = createConfirmHandler('haste', async (pending, result) => {
    await applyHaste(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'haste' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleEnhanceAbilityAbilitySelect = React.useCallback((ability) => {
    setEnhanceAbilitySelectedAbility(ability);
    setEnhanceAbilityStage('target');
  }, []);

  const handleEnhanceAbilityConfirm = React.useCallback(async (result) => {
    const pending = getPending('enhanceAbility');
    if (!pending) return;

    const ability = enhanceAbilitySelectedAbility;
    if (!ability) return;

    const targets = Array.isArray(result) ? result : [result?.targetName || result];
    cfClearPending('enhanceAbility');
    setEnhanceAbilityStage(null);
    setEnhanceAbilitySelectedAbility(null);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const popup = await applyEnhanceAbilityEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'enhance_ability', range: pending.range } },
      playerStats,
      campaignName,
      null,
      targets,
      ability
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, enhanceAbilitySelectedAbility, setPopupHtml]);

  const handleEnhanceAbilitySkip = React.useCallback(() => {
    const pending = getPending('enhanceAbility');
    if (!pending) return;
    cfClearPending('enhanceAbility');
    setEnhanceAbilityStage(null);
    setEnhanceAbilitySelectedAbility(null);
    rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);
  }, [cfClearPending, getPending, playerStats, campaignName]);

  const handleBarkskinConfirm = React.useCallback(async (result) => {
    const pending = getPending('barkskin');
    if (!pending) return;

    cfClearPending('barkskin');

    const targets = pending.creatureTargets;
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: result?.[0] || null,
      targets: targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const popup = await applyBarkskinEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'barkskin', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result,
      characters
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml, characters]);

  const handleBarkskinSkip = createSkipHandler('barkskin', (pending) => pending.creatureTargets);

  const handleInvisibilityConfirm = createConfirmHandler('invisibility', async (pending, result) => {
    await applyInvisibility(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'invisibility' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleInvisibilitySkip = createSkipHandler('invisibility', (pending) => pending.creatureTargets);

  const handleGreaterInvisibilityConfirm = createConfirmHandler('greaterInvisibility', async (pending, result) => {
    await applyGreaterInvisibility(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'greater_invisibility' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleGreaterInvisibilitySkip = createSkipHandler('greaterInvisibility', (pending) => pending.creatureTargets);

  const handleFeignDeathConfirm = createConfirmHandler('feignDeath', async (pending, result) => {
    const popup = await applyFeignDeath(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'feign_death' } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleFeignDeathSkip = createSkipHandler('feignDeath', (pending) => pending.creatureTargets);

  const handleHealConfirm = createConfirmHandler('heal', async (pending, result) => {
    const targetName = result.targetName;
    if (!targetName) return;
    await triggerHeal(
      { name: pending.spellName, spell: pending.spell, level: pending.spellLevel },
      { targetName },
      playerStats,
      campaignName,
      null
    );
  }, (pending) => pending.creatureTargets);

  const handleHealSkip = createSkipHandler('heal', (pending) => pending.creatureTargets);

  const handleLongstriderConfirm = createConfirmHandler('longstrider', async (pending, result) => {
    const popup = await applyLongstriderEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'longstrider' } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleLongstriderSkip = createSkipHandler('longstrider', (pending) => pending.creatureTargets);

  const handleSpareTheDyingConfirm = createConfirmHandler('spareTheDying', async (pending, result) => {
    const popup = await applySpareTheDyingEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'spare_the_dying' } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleSpareTheDyingSkip = createSkipHandler('spareTheDying', (pending) => pending.creatureTargets);

  const handlePassWithoutTraceConfirm = React.useCallback(async (result) => {
    const pending = getPending('passWithoutTrace');
    if (!pending) return;

    cfClearPending('passWithoutTrace');

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: result?.[0] || null,
      targets: result || [],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const popup = await applyPassWithoutTraceEffect(
      { name: pending.spellName, spell: pending.spell },
      playerStats,
      campaignName,
      null,
      result
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handlePassWithoutTraceSkip = createSkipHandler('passWithoutTrace', (pending) => pending.creatureTargets);

  const handleBeaconOfHopeConfirm = createConfirmHandler('beaconOfHope', async (pending, result) => {
    const popup = await applyBeaconOfHopeEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'beacon_of_hope', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleBeaconOfHopeSkip = createSkipHandler('beaconOfHope', (pending) => pending.creatureTargets);

  const handleHeroesFeastConfirm = createConfirmHandler('heroesFeast', async (pending, result) => {
    await consumeMaterial(playerStats, 'Gem-Encrusted Bowl (1,000 gp)', campaignName);
    await applyHeroesFeastEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'heroes_feast', range: pending.range, maxTargets: pending.maxTargets } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleHeroesFeastSkip = createSkipHandler('heroesFeast', (pending) => pending.creatureTargets);

  const handleAuraOfLifeConfirm = createConfirmHandler('auraOfLife', async (pending, result) => {
    await applyAuraOfLifeEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'aura_of_life' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleAuraOfLifeSkip = createSkipHandler('auraOfLife', (pending) => pending.creatureTargets);

  const handleAuraOfPurityConfirm = createConfirmHandler('auraOfPurity', async (pending, result) => {
    await applyAuraOfPurityEffect(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'aura_of_purity' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleAuraOfPuritySkip = createSkipHandler('auraOfPurity', (pending) => pending.creatureTargets);

  const handleCircleOfPowerConfirm = createConfirmHandler('circleOfPower', async (pending, result) => {
    const popup = await applyCircleOfPowerEffect(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'circle_of_power', auraRange: 30 } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleCircleOfPowerSkip = createSkipHandler('circleOfPower', (pending) => pending.creatureTargets);

  const handleCompulsionConfirm = createConfirmHandler('compulsion', async (pending, result) => {
    const popup = await applyCompulsionEffect(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'compulsion' } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleCompulsionSkip = createSkipHandler('compulsion', (pending) => pending.creatureTargets);

  const handleAuraOfVitalityConfirm = createConfirmHandler('auraOfVitality', async (pending, result) => {
    const popup = await applyAuraOfVitalityEffect(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'aura_of_vitality' }, spellSlotLevel: pending.spellLevel },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleAuraOfVitalitySkip = createSkipHandler('auraOfVitality', (pending) => pending.creatureTargets);

  const handleDeathWardConfirm = createConfirmHandler('deathWard', async (pending, result) => {
    const popup = await applyDeathWardEffect(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'death_ward' }, spellSlotLevel: pending.spellLevel },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleDeathWardSkip = createSkipHandler('deathWard', (pending) => pending.creatureTargets);

  const handleHeroismConfirm = createConfirmHandler('heroism', async (pending, result) => {
    const popup = await applyHeroism(
      { name: pending.spellName, spell: pending.spell, automation: pending.spell.automation || { type: 'heroism' } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleHeroismSkip = createSkipHandler('heroism', (pending) => pending.creatureTargets);

  const handleGreaterRestorationConfirm = createConfirmHandler('greaterRestoration', async (pending, result) => {
    await consumeMaterial(playerStats, 'Diamond Dust (100 gp)', campaignName);
    await confirmGreaterRestoration(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'greater_restoration', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleGreaterRestorationSkip = createSkipHandler('greaterRestoration', (pending) => pending.creatureTargets);

  const handleGreaterRestorationNoEffects = () => {
    const pending = getPending('greaterRestoration');
    if (!pending) return;
    cfClearPending('greaterRestoration');
    const slotKey = `spell_slots_level_${pending.spellLevel || 0}`;
    const current = getRuntimeValue(playerStats.name, slotKey, campaignName);
    const max = (playerStats.spellAbilities && playerStats.spellAbilities[slotKey]) || 0;
    const available = current != null ? current : max;
    if (available >= 0) {
      setRuntimeValue(playerStats.name, slotKey, available + 1, campaignName);
    }
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: null,
      targets: [],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});
  };

  const handleLesserRestorationConfirm = createConfirmHandler('lesserRestoration', async (pending, result) => {
    await applyLesserRestorationEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'lesser_restoration', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleLesserRestorationSkip = createSkipHandler('lesserRestoration', (pending) => pending.creatureTargets);

  const handleRemoveCurseConfirm = createConfirmHandler('removeCurse', async (pending, result) => {
    const popup = await confirmRemoveCurse(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'remove_curse', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleRemoveCurseSkip = createSkipHandler('removeCurse', (pending) => pending.creatureTargets);

  const handleMageArmorConfirm = createConfirmHandler('mageArmor', async (pending, result) => {
    await applyMageArmorEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'mage_armor', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleMageArmorSkip = createSkipHandler('mageArmor', (pending) => pending.creatureTargets);

  const handleForesightConfirm = createConfirmHandler('foresight', async (pending, result) => {
    const targetName = result?.[0] || pending.creatureTargets?.[0];
    if (!targetName) return;
    const popup = await triggerForesight(
      { name: pending.spellName, spell: pending.spell },
      { targetName },
      playerStats,
      campaignName,
      null
    );
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleForesightSkip = createSkipHandler('foresight', (pending) => pending.creatureTargets);

  const handleProtectionFromEvilAndGoodConfirm = createConfirmHandler('protectionFromEvilAndGood', async (pending, result) => {
    await consumeMaterial(playerStats, 'Flask of Holy Water (25 gp)', campaignName);
    await applyProtectionFromEvilAndGood(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'protection_from_evil_and_good' } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => [pending.creatureTargets.find(n => n === playerStats.name) || pending.creatureTargets[0]]);

  const handleProtectionFromEvilAndGoodSkip = createSkipHandler('protectionFromEvilAndGood', (pending) => [pending.creatureTargets[0]]);

  const handleShieldOfFaithConfirm = createConfirmHandler('shieldOfFaith', async (pending, result) => {
    await applyShieldOfFaithEffect(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'shield_of_faith', range: pending.range } },
      playerStats,
      campaignName,
      null,
      result
    );
  }, (pending) => pending.creatureTargets);

  const handleShieldOfFaithSkip = createSkipHandler('shieldOfFaith', (pending) => pending.creatureTargets);

  const handleProtectionFromEnergyTargetSelect = React.useCallback(async (targetName) => {
    setProtectionFromEnergySelectedTarget(targetName);
    setProtectionFromEnergyStage('type');
  }, []);

  const handleProtectionFromEnergyTypeSelect = React.useCallback(async (damageType) => {
    const pending = getPending('protectionFromEnergy');
    if (!pending || !protectionFromEnergySelectedTarget) return;

    cfClearPending('protectionFromEnergy');
    setProtectionFromEnergyStage(null);
    setProtectionFromEnergySelectedTarget(null);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: protectionFromEnergySelectedTarget,
      targets: [protectionFromEnergySelectedTarget],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    await applyProtectionFromEnergyHandler(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'protection_from_energy', damageTypes: pending.damageTypes } },
      playerStats,
      campaignName,
      protectionFromEnergySelectedTarget,
      damageType
    );
  }, [playerStats, campaignName, cfClearPending, getPending, protectionFromEnergySelectedTarget]);

  const handleProtectionFromEnergySkip = React.useCallback(() => {
    const pending = getPending('protectionFromEnergy');
    if (pending) {
      const targets = pending.creatureTargets;
      addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName: targets?.[0] || null,
        targets,
        spellName: pending.spellName,
        spellLevel: pending.spellLevel || 0,
        castingTime: pending.castingTime,
        timestamp: Date.now(),
      }).catch(() => {});
      rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);
    }
    cfClearPending('protectionFromEnergy');
    setProtectionFromEnergyStage(null);
    setProtectionFromEnergySelectedTarget(null);
  }, [playerStats, campaignName, cfClearPending, getPending]);

  const handleProtectionFromPoisonConfirm = React.useCallback(async (result) => {
    const pending = getPending('protectionFromPoison');
    if (!pending) return;

    cfClearPending('protectionFromPoison');

    const targetName = result?.[0];
    if (!targetName) return;

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targetName,
      targets: [targetName],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const popup = await applyProtectionFromPoisonHandler(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'protection_from_poison', range: pending.range } },
      playerStats,
      campaignName,
      null,
      { targetName }
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleProtectionFromPoisonSkip = React.useCallback(() => {
    const pending = getPending('protectionFromPoison');
    if (pending) {
      const targets = pending.creatureTargets;
      addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName: targets?.[0] || null,
        targets,
        spellName: pending.spellName,
        spellLevel: pending.spellLevel || 0,
        castingTime: pending.castingTime,
        timestamp: Date.now(),
      }).catch(() => {});
      rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);
    }
    cfClearPending('protectionFromPoison');
  }, [playerStats, campaignName, cfClearPending, getPending]);

  const handleStoneSkinConfirm = React.useCallback(async (targetName) => {
    const pending = getPending('stoneSkin');
    if (!pending) return;

    cfClearPending('stoneSkin');
    await consumeMaterial(playerStats, 'Diamond Dust (100 gp)', campaignName);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targetName,
      targets: [targetName],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const popup = await applyStoneSkinHandler(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'protection_from_energy', damageTypes: ['Bludgeoning', 'Piercing', 'Slashing'], duration: 'Concentration, up to 1 hour', target: 'willing_creature' } },
      playerStats,
      campaignName,
      targetName
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleStoneSkinSkip = React.useCallback(() => {
    const pending = getPending('stoneSkin');
    if (pending) {
      const targetName = pending.creatureTargets?.[0] || null;
      addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName: targetName,
        targets: pending.creatureTargets,
        spellName: pending.spellName,
        spellLevel: pending.spellLevel || 0,
        castingTime: pending.castingTime,
        timestamp: Date.now(),
      }).catch(() => {});
      rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);
    }
    cfClearPending('stoneSkin');
  }, [playerStats, campaignName, cfClearPending, getPending]);

  const handleResistanceTargetSelect = React.useCallback(async (targetName) => {
    setResistanceSelectedTargets([targetName]);
    setResistanceStage('type');
  }, []);

  const handleResistanceTypeSelect = React.useCallback(async (damageType) => {
    const pending = getPending('resistance');
    if (!pending) return;

    const targets = resistanceSelectedTargets.length > 0 ? resistanceSelectedTargets : [resistanceSelectedTargets];
    cfClearPending('resistance');
    setResistanceStage(null);
    setResistanceSelectedTargets([]);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    for (const target of targets) {
      await applyResistanceEffect(
        { name: pending.spellName, spell: pending.spell, automation: { type: 'damage_reduction', reductionExpression: '1d4', damageTypes: [], trigger: 'damage_taken_of_chosen_resistance_type' } },
        playerStats,
        campaignName,
        target,
        damageType
      );
    }
  }, [playerStats, campaignName, cfClearPending, getPending, resistanceSelectedTargets]);

  const handleResistanceSkip = React.useCallback(() => {
    const pending = getPending('resistance');
    if (!pending) return;
    cfClearPending('resistance');
    setResistanceStage(null);
    setResistanceSelectedTargets([]);

    rollbackSpellSlot(playerStats.name, pending.spellName, pending.spellLevel || 0, playerStats, campaignName);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: null,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});
  }, [playerStats, campaignName, cfClearPending, getPending]);

  const handleGlobeConfirm = React.useCallback(async (result) => {
    const pending = getPending('globe');
    if (!pending) return;

    cfClearPending('globe');

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: result?.[0] || null,
      targets: result || [],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'globe_of_invulnerability', range: pending.range },
      metaCtx: { creatures: result },
    };
    const popup = await executeHandler(action, playerStats, campaignName, null);

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleGlobeSkip = createSkipHandler('globe', (pending) => pending.creatureTargets);

  const handleForcecageConfirm = React.useCallback(async (result) => {
    const pending = getPending('forcecage');
    if (!pending) return;

    cfClearPending('forcecage');
    await consumeMaterial(playerStats, 'Ruby Dust (1,500 gp)', campaignName);

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: result?.[0] || null,
      targets: result || [],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: {
        type: 'forcecage',
        saveDc: 'ability',
        saveAbility: 'CHA',
        duration: 'Concentration, up to 1 hour',
        concentration: true,
        ruleset: '2024',
        range: pending.range,
      },
      metaCtx: { creatures: result },
    };
    const popup = await executeHandler(action, playerStats, campaignName, null);

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleForcecageSkip = createSkipHandler('forcecage', (pending) => pending.creatureTargets);

  const handleAntimagicFieldConfirm = React.useCallback(async (result) => {
    const pending = getPending('antimagicField');
    if (!pending) return;

    cfClearPending('antimagicField');

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: result?.[0] || null,
      targets: result || [],
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch(() => {});

    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'antimagic_field', range: pending.range },
      metaCtx: { creatures: result },
    };
    const popup = await executeHandler(action, playerStats, campaignName, null);

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleAntimagicFieldSkip = createSkipHandler('antimagicField', (pending) => pending.creatureTargets);

  const handleStinkingCloudConfirm = createConfirmHandler('stinkingCloud', async (pending, result) => {
    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'stinking_cloud', saveDc: pending.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2), saveType: 'CON' },
      metaCtx: { targets: result },
    };
    await executeHandler(action, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleStinkingCloudSkip = createSkipHandler('stinkingCloud', (pending) => pending.creatureTargets);

  const handleConfusionConfirm = createConfirmHandler('confusion', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'confusion', saveDc: pending.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2), saveType: 'WIS' },
      metaCtx: { targets: targetNames, metamagicHeighten: pending.metamagicHeighten },
    };
    const popup = await executeHandler(action, playerStats, campaignName, null);
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleConfusionSkip = createSkipHandler('confusion', (pending) => pending.creatureTargets);

  const handleWebConfirm = createConfirmHandler('web', async (pending, result) => {
    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'web_area_save', saveType: 'DEX', saveDc: playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2) },
      metaCtx: { targets: result },
    };
    await executeHandler(action, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleWebSkip = createSkipHandler('web', (pending) => pending.creatureTargets);

  const handleAnimalFriendshipConfirm = createConfirmHandler('animalFriendship', async (pending, result) => {
    const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pending.spellName, pending.spellLevel, playerStats, campaignName);
    const preparedResult = await prepareSpellCast(pending.spell, { targetNames: result }, {
      playerName: playerStats.name,
      playerStats,
      campaignName,
      isUpcast: false,
      freeCastAuthorized,
    });
    onExecute(preparedResult.modifiedSpell, preparedResult.metaCtx);
  }, (pending) => pending.creatureTargets);

  const handleAnimalFriendshipSkip = createSkipHandler('animalFriendship', (pending) => pending.creatureTargets);

  const handleRegenerateConfirm = React.useCallback(async (result) => {
    const pending = getPending('regenerate');
    if (!pending) return;
    cfClearPending('regenerate');

    const targetName = result?.targetName;
    if (!targetName) return;

    const popup = await confirmRegenerate(
      { name: pending.spellName, spell: pending.spell, automation: { type: 'regenerate', range: pending.range } },
      playerStats,
      campaignName,
      null,
      targetName
    );

    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, [playerStats, campaignName, cfClearPending, getPending, setPopupHtml]);

  const handleRegenerateSkip = createSkipHandler('regenerate', (pending) => pending.creatureTargets);

  const handleHealingWordConfirm = createConfirmHandler('healingWord', async (pending, result) => {
    const targetName = result.targetName;
    if (!targetName) return;
    const healResult = await triggerHealingWord(
      pending.spell,
      { targetName, slotLevel: pending.spellLevel },
      playerStats,
      campaignName,
      null
    );
    if (healResult && setPopupHtml) {
      const bonusHealDetail = healResult.bonusDetails?.length > 0
        ? healResult.bonusDetails.map(d => `${d.amount} ${d.name}`).join(', ')
        : '';
      const rawTotal = healResult.rawTotal ?? healResult.healAmount;
      setPopupHtml({
        type: 'heal',
        name: pending.spellName,
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
  }, (pending) => pending.creatureTargets);

  const handleHealingWordSkip = createSkipHandler('healingWord', (pending) => pending.creatureTargets);

  const handleCureWoundsConfirm = createConfirmHandler('cureWounds', async (pending, result) => {
    const targetName = result.targetName;
    if (!targetName) return;
    onExecute(pending.spell, { targetName, slotLevel: pending.spellLevel });
  }, (pending) => pending.creatureTargets);

  const handleCureWoundsSkip = createSkipHandler('cureWounds', (pending) => pending.creatureTargets);

  const handleHoldMonsterConfirm = createConfirmHandler('holdMonster', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    await triggerHoldMonster(pending.spell, { holdMonsterTargets: targetNames }, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleHoldMonsterSkip = createSkipHandler('holdMonster', (pending) => pending.creatureTargets);

  const handleHoldPersonConfirm = createConfirmHandler('holdPerson', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    await triggerHoldMonster(pending.spell, { holdPersonTargets: targetNames }, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleHoldPersonSkip = createSkipHandler('holdPerson', (pending) => pending.creatureTargets);

  const handlePolymorphConfirm = createConfirmHandler('polymorph', async (pending, result) => {
    const targetName = Array.isArray(result) ? result[0] : result;
    if (!targetName) return;
    const popup = await applyPolymorph(pending.spell, {
      polymorphTarget: targetName,
      characters: pending.characters || [],
    }, playerStats, campaignName, null);
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handlePolymorphSkip = createSkipHandler('polymorph', (pending) => pending.creatureTargets);

  const handleAnimalShapesTargetConfirm = createConfirmHandler('animalShapes', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    if (!targetNames.length) return;
    setPopupHtml({
      type: 'animal_shapes_target_selection',
      targets: targetNames,
      casterName: playerStats.name,
      campaignName,
      spell: pending.spell,
      spellLevel: pending.spellLevel,
      maxCR: pending.maxCR || 4,
    });
  }, (pending) => pending.creatureTargets);

  const handleAnimalShapesSkip = createSkipHandler('animalShapes', (pending) => pending.creatureTargets);

  const handleAnimalShapesBeastConfirm = React.useCallback(async (targetBeastMap) => {
    const result = await applyAnimalShapes({
      targetBeastMap,
      casterName: playerStats.name,
      spell: pendingAnimalShapes?.spell,
      playerStats,
      campaignName,
    });
    if (result?.ok) {
      const casterCreature = getCombatSummary(campaignName)?.creatures?.find(c => c.name === playerStats.name);
      if (casterCreature) {
        const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
        setRuntimeValue(playerStats.name, 'animalShapesConcentrationActive', true, campaignName);
        setRuntimeValue(playerStats.name, 'animalShapesConcentrationDc', concentrationDc, campaignName);
      }
    }
    setPopupHtml(null);
  }, [playerStats, campaignName, setPopupHtml, pendingAnimalShapes]);

  const handleTruePolymorphPathSelect = React.useCallback(async (path) => {
    const pending = pendingTruePolymorph;
    if (!pending) return;
    if (path === 'object_into_creature') {
      cfClearPending('truePolymorph');
      const popup = await applyTruePolymorph(pending.spell, {
        truePolymorphTarget: null,
        truePolymorphPath: path,
        characters: pending.characters || [],
      }, playerStats, campaignName, null);
      if (popup?.payload && setPopupHtml) {
        setPopupHtml(popup.payload);
      }
      return;
    }
    cfSetPending('truePolymorph', { ...pending, path });
  }, [pendingTruePolymorph, cfSetPending, cfClearPending, playerStats, campaignName, setPopupHtml]);

  const handleTruePolymorphTargetConfirm = createConfirmHandler('truePolymorph', async (pending, result) => {
    const targetName = Array.isArray(result) ? result[0] : result;
    const path = pending.path || 'creature_to_creature';
    const popup = await applyTruePolymorph(pending.spell, {
      truePolymorphTarget: targetName || null,
      truePolymorphPath: path,
      characters: pending.characters || [],
    }, playerStats, campaignName, null);
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
    cfClearPending('truePolymorph');
  }, (pending) => pending.creatureTargets);

  const handleTruePolymorphSkip = React.useCallback(() => {
    cfClearPending('truePolymorph');
  }, [cfClearPending]);

  const handleCharmPersonConfirm = createConfirmHandler('charmPerson', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    await triggerCharmPerson(pending.spell, { charmPersonTargets: targetNames }, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleCharmPersonSkip = createSkipHandler('charmPerson', (pending) => pending.creatureTargets);

  const handleCharmMonsterConfirm = createConfirmHandler('charmMonster', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    await triggerCharmMonster(pending.spell, { charmMonsterTargets: targetNames }, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleCharmMonsterSkip = createSkipHandler('charmMonster', (pending) => pending.creatureTargets);

  const handleBanishmentConfirm = createConfirmHandler('banishment', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    const popup = await triggerBanishment(pending.spell, { banishmentTargets: targetNames }, playerStats, campaignName, null);
    if (popup?.payload && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleBanishmentSkip = createSkipHandler('banishment', (pending) => pending.creatureTargets);

  const handlePrismaticSprayConfirm = createConfirmHandler('prismatic_spray', async (pending, result) => {
    const targetNames = Array.isArray(result) ? result : [result];
    const finalMetaCtx = { selectedTargets: targetNames };
    onExecute(pending.spell, finalMetaCtx);
  }, (pending) => pending.creatureTargets);

  const handlePrismaticSpraySkip = createSkipHandler('prismatic_spray', (pending) => pending.creatureTargets);

  const handleRevivifyConfirm = createConfirmHandler('revivify', async (pending, result) => {
    const targetName = result.targetName;
    if (!targetName) return;
    const popup = await triggerRevivify(
      pending.spell,
      { targetName },
      playerStats,
      campaignName,
      targetName
    );
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleRevivifySkip = createSkipHandler('revivify', (pending) => pending.creatureTargets);

  const handleSanctuaryConfirm = createConfirmHandler('sanctuary', async (pending, result) => {
    const targetName = result;
    if (!targetName) return;

    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'sanctuary', range: pending.range, duration: '1 minute', casting_time: pending.castingTime },
      metaCtx: { targetName },
    };
    const popup = await handleSanctuary(action, playerStats, campaignName, null);
    if (popup && setPopupHtml) {
      setPopupHtml(popup.payload);
    }
  }, (pending) => pending.creatureTargets);

  const handleSanctuarySkip = createSkipHandler('sanctuary', (pending) => pending.creatureTargets);

  const handleSleetStormConfirm = createConfirmHandler('sleetStorm', async (pending, result) => {
    const action = {
      name: pending.spellName,
      spell: pending.spell,
      automation: { type: 'sleet_storm', saveDc: pending.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2), saveType: 'DEX' },
      metaCtx: { targets: result },
    };
    await executeHandler(action, playerStats, campaignName, null);
  }, (pending) => pending.creatureTargets);

  const handleSleetStormSkip = createSkipHandler('sleetStorm', (pending) => pending.creatureTargets);

  const handleMagicMissileConfirm = React.useCallback((result) => {
    const pending = pendingMagicMissile;
    if (!pending) return;

    cfClearPending('magicMissile');

    const { spell } = pending;
    const distribution = result.distribution;

    const hasAnyTargets = Object.values(distribution).some(v => v > 0);
    if (!hasAnyTargets) return;

    const slotLevel = spell.level || 1;
    const finalMetaCtx = { magicMissileDistribution: distribution, slotLevel };
    onExecute(spell, finalMetaCtx);
  }, [pendingMagicMissile, onExecute, cfClearPending]);

  const handleMagicMissileSkip = React.useCallback(() => {
    cfClearPending('magicMissile');
  }, [cfClearPending]);

  return { pendingMetamagic, pendingMultiTarget, pendingAid, pendingBane, pendingShapechange, pendingBless, pendingFaerieFire, handleFaerieFireConfirm, handleFaerieFireSkip, pendingHolyAura, pendingBeaconOfHope, pendingSlow, pendingHaste, pendingEnhanceAbility, pendingBarkskin, pendingInvisibility, pendingGreaterInvisibility, pendingHeal, pendingHeroesFeast, pendingGreaterRestoration, pendingLesserRestoration, pendingMageArmor, pendingShieldOfFaith, pendingProtectionFromEvilAndGood, pendingProtectionFromPoison, pendingStoneSkin, pendingProtectionFromEnergy, pendingResistance, pendingRemoveCurse, pendingMagicMissile, pendingPassWithoutTrace, pendingGlobe, pendingForcecage, pendingAntimagicField, pendingRegenerate, pendingHealingWord, pendingCureWounds, pendingStinkingCloud, pendingWeb, pendingAnimalFriendship, pendingAuraOfLife, pendingAuraOfPurity, pendingCircleOfPower, pendingCompulsion, pendingAuraOfVitality, pendingForesight, pendingLongstrider, pendingSpareTheDying, pendingPrismaticSpray, handlePrismaticSprayConfirm, handlePrismaticSpraySkip, pendingRevivify, handleRevivifyConfirm, handleRevivifySkip, resistanceStage, enhanceAbilityStage, handleResistanceTargetSelect, handleResistanceTypeSelect, gateMetamagic, handleConfirm, handleSkip, handleMultiTargetConfirm, handleMultiTargetSkip, handleAidConfirm, handleAidSkip, handleBaneConfirm, handleBaneSkip, handleBlessConfirm, handleBlessSkip, handleHolyAuraConfirm, handleHolyAuraSkip, handleBeaconOfHopeConfirm, handleBeaconOfHopeSkip, handleSlowConfirm, handleSlowSkip, handleHasteConfirm, handleHasteSkip, handleEnhanceAbilityAbilitySelect, handleEnhanceAbilityConfirm, handleEnhanceAbilitySkip, handleBarkskinConfirm, handleBarkskinSkip, handleInvisibilityConfirm, handleInvisibilitySkip, handleGreaterInvisibilityConfirm, handleGreaterInvisibilitySkip, pendingFeignDeath, handleFeignDeathConfirm, handleFeignDeathSkip, handleHealConfirm, handleHealSkip, handleHeroesFeastConfirm, handleHeroesFeastSkip, handleAuraOfLifeConfirm, handleAuraOfLifeSkip, handleAuraOfPurityConfirm, handleAuraOfPuritySkip, handleCircleOfPowerConfirm, handleCircleOfPowerSkip, handleCompulsionConfirm, handleCompulsionSkip,     handleAuraOfVitalityConfirm, handleAuraOfVitalitySkip, handleForesightConfirm, handleForesightSkip, handleLongstriderConfirm, handleLongstriderSkip, handleSpareTheDyingConfirm, handleSpareTheDyingSkip, pendingConfusion, handleConfusionConfirm, handleConfusionSkip, pendingDeathWard: _pendingDeathWard, handleDeathWardConfirm, handleDeathWardSkip, pendingHeroism, handleHeroismConfirm, handleHeroismSkip, handleGreaterRestorationConfirm, handleGreaterRestorationSkip, handleGreaterRestorationNoEffects, handleLesserRestorationConfirm, handleLesserRestorationSkip, handleMageArmorConfirm, handleMageArmorSkip, handleShieldOfFaithConfirm, handleShieldOfFaithSkip, protectionFromEnergyStage, handleProtectionFromEnergyTargetSelect, handleProtectionFromEnergyTypeSelect, handleProtectionFromEnergySkip, handleProtectionFromEvilAndGoodConfirm, handleProtectionFromEvilAndGoodSkip, handleProtectionFromPoisonConfirm, handleProtectionFromPoisonSkip, handleStoneSkinConfirm, handleStoneSkinSkip, handleResistanceSkip, handleRemoveCurseConfirm, handleRemoveCurseSkip, handleMagicMissileConfirm, handleMagicMissileSkip, handlePassWithoutTraceConfirm, handlePassWithoutTraceSkip, handleGlobeConfirm, handleGlobeSkip, handleForcecageConfirm, handleForcecageSkip, handleAntimagicFieldConfirm, handleAntimagicFieldSkip, handleRegenerateConfirm, handleRegenerateSkip, handleHealingWordConfirm, handleHealingWordSkip, handleCureWoundsConfirm, handleCureWoundsSkip, handleStinkingCloudConfirm, handleStinkingCloudSkip, handleWebConfirm, handleWebSkip, handleAnimalFriendshipConfirm, handleAnimalFriendshipSkip, pendingHoldMonster, pendingHoldPerson, handleHoldMonsterConfirm, handleHoldMonsterSkip, handleHoldPersonConfirm, handleHoldPersonSkip,   pendingPolymorph, handlePolymorphConfirm, handlePolymorphSkip, pendingAnimalShapes, handleAnimalShapesTargetConfirm, handleAnimalShapesSkip, handleAnimalShapesBeastConfirm, pendingTruePolymorph, handleTruePolymorphPathSelect, handleTruePolymorphTargetConfirm, handleTruePolymorphSkip, pendingCharmPerson, handleCharmPersonConfirm, handleCharmPersonSkip, pendingCharmMonster, handleCharmMonsterConfirm, handleCharmMonsterSkip, pendingBanishment, handleBanishmentConfirm, handleBanishmentSkip, pendingSanctuary, handleSanctuaryConfirm, handleSanctuarySkip, pendingSleetStorm, handleSleetStormConfirm, handleSleetStormSkip, cfClearPending };
}
