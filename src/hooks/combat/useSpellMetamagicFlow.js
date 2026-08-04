import React from 'react'
import { getCurrentSorceryPoints, getMaxSorceryPoints, spendSorceryPoints, logMetamagicUse } from './useMetamagic.js'
import { addEntry } from '../../services/ui/logService.js'
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'
import { getMonsterData } from '../../services/npcs/monsterUtils.js'
import { isPsionicSpell, hasPsionicSorcery } from '../../services/rules/spells/metamagicRules.js'
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
import { triggerFaerieFire } from '../../services/rules/features/faerieFireService.js'
import { triggerRevivify } from '../../services/rules/features/revivifyService.js'
import { executeHandler } from '../../services/automation/index.js'
import { useConfirmableFlow, rollbackSpellSlot } from './useConfirmableFlow.js'
import { confirmGreaterRestoration } from '../../services/rules/features/greaterRestorationService.js'
import { confirmRegenerate } from '../../services/rules/features/regenerateService.js'
import { prepareSpellCast, isFreeCastAuthorized } from '../../services/rules/spells/spellPreparationService.js'
import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js'
import { getConsumedMaterial, hasMaterial, consumeMaterial, getMaterialRequirementMessage } from '../../services/rules/spells/materialComponents.js'

function getCreatureTargets(excludeName, campaignName, characters = []) {
  const cs = getCombatSummary(campaignName);
  if (cs?.creatures) {
    return cs.creatures.map(c => c.name);
  }
  return characters.map(c => c.name);
}

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
    const consumedMaterial = getConsumedMaterial(spell);
    if (consumedMaterial && !hasMaterial(playerStats, consumedMaterial.itemName)) {
      if (setPopupHtml) {
        setPopupHtml({
          type: 'automation_info',
          name: spell.name,
          automationType: 'material_required',
          description: getMaterialRequirementMessage(spell),
        });
      }
      return;
    }

    const isGreaterRestoration = (spell.name || '').toLowerCase() === 'greater restoration';
    const isLesserRestoration = (spell.name || '').toLowerCase() === 'lesser restoration';
    const isRemoveCurse = (spell.name || '').toLowerCase() === 'remove curse';
    const isAid = (spell.name || '').toLowerCase() === 'aid';
    const isForesight = (spell.name || '').toLowerCase() === 'foresight';
    const isProtectionFromEvilAndGood = (spell.name || '').toLowerCase() === 'protection from evil and good';
    const isSanctuary = (spell.name || '').toLowerCase() === 'sanctuary';
    const isProtectionFromPoison = (spell.name || '').toLowerCase() === 'protection from poison';
    const isStoneSkin = (spell.name || '').toLowerCase() === 'stone skin';

    if (isForesight) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      // Include the caster in the target list
      if (!creatureTargets.includes(playerStats.name)) {
        creatureTargets.unshift(playerStats.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('foresight', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isSanctuary) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      // Include the caster in the target list (willing creature within range)
      if (!creatureTargets.includes(playerStats.name)) {
        creatureTargets.unshift(playerStats.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('sanctuary', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    if (isProtectionFromEvilAndGood) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      // Include the caster in the target list (willing creature you touch)
      if (!creatureTargets.includes(playerStats.name)) {
        creatureTargets.unshift(playerStats.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('protectionFromEvilAndGood', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isProtectionFromPoison) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      // Include the caster in the target list (willing creature you touch)
      if (!creatureTargets.includes(playerStats.name)) {
        creatureTargets.unshift(playerStats.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('protectionFromPoison', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isStoneSkin) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('stoneSkin', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isHoldMonster = (spell.name || '').toLowerCase() === 'hold monster';
    if (isHoldMonster) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.filter(c => c.name !== playerStats.name)
        .map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        const upcastAtSlotLevel = spell.upcast_at_slot_level;
        let maxTargets = null;
        if (upcastAtSlotLevel && typeof upcastAtSlotLevel === 'object') {
          const effectiveSlotLevel = spell.upcastLevel || spell.level;
          const key = String(effectiveSlotLevel);
          const value = upcastAtSlotLevel[key];
          if (value && typeof value === 'string') {
            const match = value.match(/(\d+)\s+targets?/i);
            if (match) maxTargets = parseInt(match[1], 10);
          }
        }
        cfSetPending('holdMonster', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '90 feet',
          creatureTargets,
          maxTargets,
        });
        return;
      }
    }

    const isHoldPerson = (spell.name || '').toLowerCase() === 'hold person';
    if (isHoldPerson) {
      const cs = getCombatSummary(campaignName);
      const nonCasterCreatures = cs?.creatures
        ?.filter(c => c.name !== playerStats.name) || [];
      const creatureTargets = [];
      for (const creature of nonCasterCreatures) {
        if (creature.type === 'player') {
          creatureTargets.push(creature.name);
        } else {
          try {
            const monsterData = await getMonsterData(creature.name, null);
            if (monsterData?.type && monsterData.type.toLowerCase() === 'humanoid') {
              creatureTargets.push(creature.name);
            }
          } catch { /* default to excluding */ }
        }
      }
      if (creatureTargets.length > 0) {
        const upcastAtSlotLevel = spell.upcast_at_slot_level;
        let maxTargets = null;
        if (upcastAtSlotLevel && typeof upcastAtSlotLevel === 'object') {
          const effectiveSlotLevel = spell.upcastLevel || spell.level;
          const key = String(effectiveSlotLevel);
          const value = upcastAtSlotLevel[key];
          if (value && typeof value === 'string') {
            const match = value.match(/(\d+)\s+targets?/i);
            if (match) maxTargets = parseInt(match[1], 10);
          }
        }
        cfSetPending('holdPerson', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
          maxTargets,
        });
        return;
      }
    }

    const isCharmPerson = (spell.name || '').toLowerCase() === 'charm person';
    if (isCharmPerson) {
      const cs = getCombatSummary(campaignName);
      const nonCasterCreatures = cs?.creatures
        ?.filter(c => c.name !== playerStats.name) || [];
      const creatureTargets = [];
      for (const creature of nonCasterCreatures) {
        if (creature.type === 'player') {
          creatureTargets.push(creature.name);
        } else {
          try {
            const monsterData = await getMonsterData(creature.name, null);
            if (monsterData?.type && monsterData.type.toLowerCase() === 'humanoid') {
              creatureTargets.push(creature.name);
            }
          } catch { /* default to excluding */ }
        }
      }
      if (creatureTargets.length > 0) {
        const upcastAtSlotLevel = spell.upcast_at_slot_level;
        let maxTargets = null;
        if (upcastAtSlotLevel && typeof upcastAtSlotLevel === 'object') {
          const effectiveSlotLevel = spell.upcastLevel || spell.level;
          const key = String(effectiveSlotLevel);
          const value = upcastAtSlotLevel[key];
          if (value && typeof value === 'string') {
            const match = value.match(/(\d+)\s+targets?/i);
            if (match) maxTargets = parseInt(match[1], 10);
          }
        }
        cfSetPending('charmPerson', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
          maxTargets,
        });
        return;
      }
    }

    const isCharmMonster = (spell.name || '').toLowerCase() === 'charm monster';
    if (isCharmMonster) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.filter(c => c.name !== playerStats.name)
        .map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        const upcastAtSlotLevel = spell.upcast_at_slot_level;
        let maxTargets = null;
        if (upcastAtSlotLevel && typeof upcastAtSlotLevel === 'object') {
          const effectiveSlotLevel = spell.upcastLevel || spell.level;
          const key = String(effectiveSlotLevel);
          const value = upcastAtSlotLevel[key];
          if (value && typeof value === 'string') {
            const match = value.match(/(\d+)\s+targets?/i);
            if (match) maxTargets = parseInt(match[1], 10);
          }
        }
        cfSetPending('charmMonster', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
          maxTargets,
        });
        return;
      }
    }

    const isBanishment = (spell.name || '').toLowerCase() === 'banishment';
    if (isBanishment) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.filter(c => c.name !== playerStats.name)
        .map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        const upcastAtSlotLevel = spell.upcast_at_slot_level;
        let maxTargets = null;
        if (upcastAtSlotLevel && typeof upcastAtSlotLevel === 'object') {
          const effectiveSlotLevel = spell.upcastLevel || spell.level;
          const key = String(effectiveSlotLevel);
          const value = upcastAtSlotLevel[key];
          if (value && typeof value === 'string') {
            const match = value.match(/(\d+)\s+targets?/i);
            if (match) maxTargets = parseInt(match[1], 10);
          }
        }
        cfSetPending('banishment', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
          maxTargets,
        });
        return;
      }
    }

    const isPrismaticSpray = (spell.name || '').toLowerCase() === 'prismatic spray';
    if (isPrismaticSpray) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.filter(c => c.name !== playerStats.name)
        .map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('prismatic_spray', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          creatureTargets,
          maxTargets: null,
        });
        return;
      }
    }

    if (isLesserRestoration) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('lesserRestoration', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isGreaterRestoration) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('greaterRestoration', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isRemoveCurse) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('removeCurse', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    if (isAid) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('aid', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          maxTargets: 3,
          creatureTargets,
        });
        return;
      }
    }

    const isBane = (spell.name || '').toLowerCase() === 'bane';
    if (isBane) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('bane', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          maxTargets: 3,
          creatureTargets,
        });
        return;
      }
    }

    const isBless = (spell.name || '').toLowerCase() === 'bless';
    if (isBless) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('bless', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          maxTargets: 3,
          creatureTargets,
        });
        return;
      }
    }

    const isHolyAura = (spell.name || '').toLowerCase() === 'holy aura';
    if (isHolyAura) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('holyAura', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 8,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          creatureTargets,
        });
        return;
      }
    }

    const isFaerieFire = (spell.name || '').toLowerCase() === 'faerie fire';
    if (isFaerieFire) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.filter(c => c.name !== playerStats.name)
        .map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('faerieFire', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 1,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isSlow = (spell.name || '').toLowerCase() === 'slow';
    if (isSlow) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('slow', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '50 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isHaste = (spell.name || '').toLowerCase() === 'haste';
    if (isHaste) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('haste', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isEnhanceAbility = (spell.name || '').toLowerCase() === 'enhance ability';
    if (isEnhanceAbility) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      let creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        if (!creatureTargets.includes(playerStats.name)) {
          creatureTargets = [playerStats.name, ...creatureTargets];
        }
        cfSetPending('enhanceAbility', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isBarkskin = (spell.name || '').toLowerCase() === 'barkskin';
    if (isBarkskin) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('barkskin', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }


    const isInvisibility = (spell.name || '').toLowerCase() === 'invisibility';
    if (isInvisibility) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('invisibility', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isGreaterInvisibility = (spell.name || '').toLowerCase() === 'greater invisibility';
    if (isGreaterInvisibility) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('greaterInvisibility', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isFeignDeath = (spell.name || '').toLowerCase() === 'feign death';
    if (isFeignDeath) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('feignDeath', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isHeal = (spell.name || '').toLowerCase() === 'heal';
    if (isHeal) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('heal', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isLongstrider = (spell.name || '').toLowerCase() === 'longstrider';
    if (isLongstrider) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('longstrider', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isSpareTheDying = (spell.name || '').toLowerCase() === 'spare the dying';
    if (isSpareTheDying) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      let creatureTargets = cs?.creatures?.map(c => c.name) || [];
      creatureTargets = creatureTargets.filter(name => name !== playerStats.name);
      if (creatureTargets.length > 0) {
        cfSetPending('spareTheDying', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '15 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isPassWithoutTrace = (spell.name || '').toLowerCase() === 'pass without trace';
    if (isPassWithoutTrace) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('passWithoutTrace', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          creatureTargets,
        });
        return;
      }
    }

    const isBeaconOfHope = (spell.name || '').toLowerCase() === 'beacon of hope';
    if (isBeaconOfHope) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      let creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length === 0 && characters.length > 0) {
        creatureTargets = characters.map(c => c.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('beaconOfHope', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isHeroesFeast = (spell.name || '').toLowerCase() === "heroes' feast";
    if (isHeroesFeast) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('heroesFeast', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          maxTargets: 12,
          creatureTargets,
        });
        return;
      }
    }

    const isMageArmor = (spell.name || '').toLowerCase() === 'mage armor';
    if (isMageArmor) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('mageArmor', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isProtectionFromEnergy = (spell.name || '').toLowerCase() === 'protection from energy';
    if (isProtectionFromEnergy) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('protectionFromEnergy', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
          damageTypes: spell.automation?.damageTypes || ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'],
        });
        return;
      }
    }

    const isResistance = (spell.name || '').toLowerCase() === 'resistance';
    if (isResistance) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('resistance', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
          damageTypes: ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Radiant', 'Slashing', 'Thunder'],
        });
        return;
      }
    }

    const isMagicMissile = (spell.name || '').toLowerCase() === 'magic missile';
    if (isMagicMissile) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        const slotLevel = spell.level || 1;
        const totalMissiles = 3 + (slotLevel - 1);
        cfSetPending('magicMissile', {
          spell,
          totalMissiles,
          missileDamage: '1d4 + 1',
          creatureTargets,
        });
        return;
      }
    }

    const isGlobe = (spell.name || '').toLowerCase() === 'globe of invulnerability';
    if (isGlobe) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('globe', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          creatureTargets,
        });
        return;
      }
    }

    const isAntimagicField = (spell.name || '').toLowerCase() === 'antimagic field';
    if (isAntimagicField) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('antimagicField', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self (10-foot radius)',
          creatureTargets,
        });
        return;
      }
    }

    const isForcecage = (spell.name || '').toLowerCase() === 'forcecage';
    if (isForcecage) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('forcecage', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '100 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isStinkingCloud = (spell.name || '').toLowerCase() === 'stinking cloud';
    if (isStinkingCloud) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('stinkingCloud', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '90 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isConfusion = (spell.name || '').toLowerCase() === 'confusion';
    if (isConfusion) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('confusion', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '90 feet',
          creatureTargets,
          spellSaveDc: metaCtx?.spellSaveDc,
          metamagicHeighten: metaCtx?.metamagicHeighten,
        });
        return;
      }
    }

    const isWeb = (spell.name || '').toLowerCase() === 'web';
    if (isWeb) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('web', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isSleetStorm = (spell.name || '').toLowerCase() === 'sleet storm';
    if (isSleetStorm) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('sleetStorm', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '150 feet',
          creatureTargets,
          spellSaveDc: metaCtx?.spellSaveDc,
        });
        return;
      }
    }

    const isAnimalFriendship = (spell.name || '').toLowerCase() === 'animal friendship';
    if (isAnimalFriendship) {
      const cs = getCombatSummary(campaignName);
      const allCreatureNames = cs?.creatures?.map(c => c.name) || [];
      const beastTargets = [];
      for (const creatureName of allCreatureNames) {
        const csCheck = getCombatSummary(campaignName);
        const creature = csCheck?.creatures?.find(c => c.name === creatureName);
        if (creature?.type === 'player') continue;
        try {
          const monsterData = await getMonsterData(creatureName, null);
          if (monsterData?.type && monsterData.type.toLowerCase() === 'beast') {
            beastTargets.push(creatureName);
          }
        } catch {
          // Not a known monster, skip
        }
      }
      if (beastTargets.length > 0) {
        cfSetPending('animalFriendship', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          rangeFt: 30,
          creatureTargets: beastTargets,
        });
        return;
      }
    }

    const isRegenerate = (spell.name || '') === 'Regenerate';
    if (isRegenerate) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('regenerate', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isHealingWord = (spell.name || '').toLowerCase() === 'healing word';
    if (isHealingWord) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('healingWord', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isCureWounds = (spell.name || '').toLowerCase() === 'cure wounds';
    if (isCureWounds) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('cureWounds', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isRevivify = (spell.name || '').toLowerCase() === 'revivify';
    if (isRevivify) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`[revivify] Combat summary missing or has no creatures for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
        return;
      }
      const creatureTargets = cs.creatures
        .filter(c => c.name !== playerStats.name)
        .map(c => c.name);
      if (creatureTargets.length > 0) {
        cfSetPending('revivify', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isAuraOfLife = (spell.name || '').toLowerCase() === 'aura of life';
    if (isAuraOfLife) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('auraOfLife', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isAuraOfPurity = (spell.name || '').toLowerCase() === 'aura of purity';
    if (isAuraOfPurity) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('auraOfPurity', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isCircleOfPower = (spell.name || '').toLowerCase() === 'circle of power';
    if (isCircleOfPower) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('circleOfPower', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isCompulsion = (spell.name || '').toLowerCase() === 'compulsion';
    if (isCompulsion) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('compulsion', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isAuraOfVitality = (spell.name || '').toLowerCase() === 'aura of vitality';
    if (isAuraOfVitality) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        // Free cast: use pending state so the existing modal renders
        if (metaCtx?.freeCastUsed) {
          cfSetPending('auraOfVitality', {
            spell,
            spellName: spell.name,
            spellLevel: spell.level || 0,
            castingTime: spell.casting_time,
            range: spell.range || '30 feet',
            creatureTargets,
            isFreeCast: true,
          });
          return;
        }
        cfSetPending('auraOfVitality', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
        });
        return;
      }
    }

    const isDeathWard = (spell.name || '').toLowerCase() === 'death ward';
    if (isDeathWard) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('deathWard', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isHeroism = (spell.name || '').toLowerCase() === 'heroism';
    if (isHeroism) {
      const cs = getCombatSummary(campaignName);
      if (!cs?.creatures) {
        console.error(`Creature targets empty for ${spell?.name || "unknown"}: cs=${cs ? "exists" : "null"}, characters.length=${characters?.length ?? "undefined"}`);
      }
      const creatureTargets = cs?.creatures?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('heroism', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Touch',
          creatureTargets,
        });
        return;
      }
    }

    const isPowerWordSpell = spell.name && (spell.name.toLowerCase() === 'power word heal' || spell.name.toLowerCase() === 'power word kill');
    const multiTargetSpread = isPowerWordSpell ? { range: '10 ft' } : getMultiTargetSpreadForSpell(playerStats, spell.name);

    if (multiTargetSpread) {
      const creatureTargets = getCreatureTargets(playerStats?.name, campaignName, characters);
      if (creatureTargets.length > 0) {
        if (isPowerWordSpell && setSecondaryTargetModal) {
          const modalConfig = {
            title: 'Words of Creation — Choose Second Target',
            targets: creatureTargets.map(name => ({ name, type: 'creature' })),
            confirmLabel: 'Cast Spell',
            confirmIcon: 'fa-solid fa-sparkles',
            featureDescription: `When you cast ${spell.name}, you can target a second creature within ${multiTargetSpread.range || '10 ft'} of the first target.`,
            description: 'Select a second creature to also be affected by the spell.',
            onTargetSelected: async (secondTargetName) => {
              addEntry(campaignName, {
                type: 'spell',
                characterName: playerStats.name,
                targetName: secondTargetName,
                spellName: spell.name,
                spellLevel: spell.level || 0,
                castingTime: spell.casting_time,
                timestamp: Date.now(),
              }).catch(() => {});
              const metaCtx = { multiTarget: secondTargetName };
              onExecute(spell, metaCtx);
              setSecondaryTargetModal(null);
            },
            onSkip: () => {
              addEntry(campaignName, {
                type: 'spell',
                characterName: playerStats.name,
                spellName: spell.name,
                spellLevel: spell.level || 0,
                castingTime: spell.casting_time,
                timestamp: Date.now(),
              }).catch(() => {});
              onExecute(spell, {});
              setSecondaryTargetModal(null);
            },
          };
          setSecondaryTargetModal({ secondaryTargetModal: modalConfig });
          return;
        }
        cfSetPending('multiTarget', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: multiTargetSpread.range || '10 ft',
          creatureTargets,
        });
        return;
      }
    }

    if (!isSorcerer) {
      const isCantrip = spell.level === 0;
      const cantripAutoLevel = (function() {
        if (!isCantrip || !spell.damage) return null;
        const charDmg = spell.damage?.damage_at_character_level;
        const slotDmg = spell.damage?.damage_at_slot_level;
        const dmgObj = (charDmg && Object.keys(charDmg).length) ? charDmg : (slotDmg && Object.keys(slotDmg).length ? slotDmg : null);
        if (!dmgObj) return null;
        const levels = Object.keys(dmgObj).map(Number).sort((a, b) => a - b);
        const applicable = levels.filter(l => l <= playerStats.level);
        return applicable.length > 0 ? Math.max(...applicable) : null;
      })();

      if (isCantrip && cantripAutoLevel) {
        const preparedSpell = { ...spell, level: cantripAutoLevel, baseLevel: 0 };
        if (consumedMaterial) await consumeMaterial(playerStats, consumedMaterial.itemName, campaignName);
        onExecute(preparedSpell, metaCtx);
      } else if (metaCtx.oldConcentrationSpell !== undefined) {
        if (consumedMaterial) await consumeMaterial(playerStats, consumedMaterial.itemName, campaignName);
        onExecute(spell, metaCtx);
      } else {
        const isUpcast = spell.isUpcast;
        const upcastLevel = spell.upcastLevel;
        const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, spell.name, spell.level, playerStats, campaignName);
        const result = await prepareSpellCast(spell, metaCtx, {
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
        if (consumedMaterial) await consumeMaterial(playerStats, consumedMaterial.itemName, campaignName);
        onExecute(result.modifiedSpell, result.metaCtx);
      }
      return;
    }

    let sorcerySpell = spell;
    if (spell.level === 0 && spell.damage) {
      const charDmg = spell.damage?.damage_at_character_level;
      const slotDmg = spell.damage?.damage_at_slot_level;
      const dmgObj = (charDmg && Object.keys(charDmg).length) ? charDmg : (slotDmg && Object.keys(slotDmg).length ? slotDmg : null);
      if (dmgObj) {
        const levels = Object.keys(dmgObj).map(Number).sort((a, b) => a - b);
        const applicable = levels.filter(l => l <= playerStats.level);
        if (applicable.length > 0) {
          const autoLevel = Math.max(...applicable);
          sorcerySpell = { ...spell, level: autoLevel, baseLevel: 0 };
        }
      }
    }

    const spellLevel = (metaCtx?.slotLevel ?? (sorcerySpell.baseLevel ?? sorcerySpell.level)) || 0;
    const currentSP = getCurrentSorceryPoints(playerStats.name, getMaxSorceryPoints(playerStats));
    const isPsionic = isPsionicSpell(playerStats, spell.name);
    const hasPsionic = hasPsionicSorcery(playerStats);

    cfSetPending('metamagic', {
      spell: sorcerySpell,
      spellName: spell.name,
      spellLevel: spellLevel,
      castingTime: spell.casting_time,
      _currentSP: currentSP,
      isPsionic: isPsionic && hasPsionic,
      psionicCost: isPsionic && hasPsionic ? spellLevel : 0,
      _metaCtx: metaCtx,
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

  return { pendingMetamagic, pendingMultiTarget, pendingAid, pendingBane, pendingBless, pendingFaerieFire, handleFaerieFireConfirm, handleFaerieFireSkip, pendingHolyAura, pendingBeaconOfHope, pendingSlow, pendingHaste, pendingEnhanceAbility, pendingBarkskin, pendingInvisibility, pendingGreaterInvisibility, pendingHeal, pendingHeroesFeast, pendingGreaterRestoration, pendingLesserRestoration, pendingMageArmor, pendingShieldOfFaith, pendingProtectionFromEvilAndGood, pendingProtectionFromPoison, pendingStoneSkin, pendingProtectionFromEnergy, pendingResistance, pendingRemoveCurse, pendingMagicMissile, pendingPassWithoutTrace, pendingGlobe, pendingForcecage, pendingAntimagicField, pendingRegenerate, pendingHealingWord, pendingCureWounds, pendingStinkingCloud, pendingWeb, pendingAnimalFriendship, pendingAuraOfLife, pendingAuraOfPurity, pendingCircleOfPower, pendingCompulsion, pendingAuraOfVitality, pendingForesight, pendingLongstrider, pendingSpareTheDying, pendingPrismaticSpray, handlePrismaticSprayConfirm, handlePrismaticSpraySkip, pendingRevivify, handleRevivifyConfirm, handleRevivifySkip, resistanceStage, enhanceAbilityStage, handleResistanceTargetSelect, handleResistanceTypeSelect, gateMetamagic, handleConfirm, handleSkip, handleMultiTargetConfirm, handleMultiTargetSkip, handleAidConfirm, handleAidSkip, handleBaneConfirm, handleBaneSkip, handleBlessConfirm, handleBlessSkip, handleHolyAuraConfirm, handleHolyAuraSkip, handleBeaconOfHopeConfirm, handleBeaconOfHopeSkip, handleSlowConfirm, handleSlowSkip, handleHasteConfirm, handleHasteSkip, handleEnhanceAbilityAbilitySelect, handleEnhanceAbilityConfirm, handleEnhanceAbilitySkip, handleBarkskinConfirm, handleBarkskinSkip, handleInvisibilityConfirm, handleInvisibilitySkip, handleGreaterInvisibilityConfirm, handleGreaterInvisibilitySkip, pendingFeignDeath, handleFeignDeathConfirm, handleFeignDeathSkip, handleHealConfirm, handleHealSkip, handleHeroesFeastConfirm, handleHeroesFeastSkip, handleAuraOfLifeConfirm, handleAuraOfLifeSkip, handleAuraOfPurityConfirm, handleAuraOfPuritySkip, handleCircleOfPowerConfirm, handleCircleOfPowerSkip, handleCompulsionConfirm, handleCompulsionSkip,     handleAuraOfVitalityConfirm, handleAuraOfVitalitySkip, handleForesightConfirm, handleForesightSkip, handleLongstriderConfirm, handleLongstriderSkip, handleSpareTheDyingConfirm, handleSpareTheDyingSkip, pendingConfusion, handleConfusionConfirm, handleConfusionSkip, pendingDeathWard: _pendingDeathWard, handleDeathWardConfirm, handleDeathWardSkip, pendingHeroism, handleHeroismConfirm, handleHeroismSkip, handleGreaterRestorationConfirm, handleGreaterRestorationSkip, handleGreaterRestorationNoEffects, handleLesserRestorationConfirm, handleLesserRestorationSkip, handleMageArmorConfirm, handleMageArmorSkip, handleShieldOfFaithConfirm, handleShieldOfFaithSkip, protectionFromEnergyStage, handleProtectionFromEnergyTargetSelect, handleProtectionFromEnergyTypeSelect, handleProtectionFromEnergySkip, handleProtectionFromEvilAndGoodConfirm, handleProtectionFromEvilAndGoodSkip, handleProtectionFromPoisonConfirm, handleProtectionFromPoisonSkip, handleStoneSkinConfirm, handleStoneSkinSkip, handleResistanceSkip, handleRemoveCurseConfirm, handleRemoveCurseSkip, handleMagicMissileConfirm, handleMagicMissileSkip, handlePassWithoutTraceConfirm, handlePassWithoutTraceSkip, handleGlobeConfirm, handleGlobeSkip, handleForcecageConfirm, handleForcecageSkip, handleAntimagicFieldConfirm, handleAntimagicFieldSkip, handleRegenerateConfirm, handleRegenerateSkip, handleHealingWordConfirm, handleHealingWordSkip, handleCureWoundsConfirm, handleCureWoundsSkip, handleStinkingCloudConfirm, handleStinkingCloudSkip, handleWebConfirm, handleWebSkip, handleAnimalFriendshipConfirm, handleAnimalFriendshipSkip, pendingHoldMonster, pendingHoldPerson, handleHoldMonsterConfirm, handleHoldMonsterSkip, handleHoldPersonConfirm, handleHoldPersonSkip, pendingCharmPerson, handleCharmPersonConfirm, handleCharmPersonSkip, pendingCharmMonster, handleCharmMonsterConfirm, handleCharmMonsterSkip, pendingBanishment, handleBanishmentConfirm, handleBanishmentSkip, pendingSanctuary, handleSanctuaryConfirm, handleSanctuarySkip, pendingSleetStorm, handleSleetStormConfirm, handleSleetStormSkip, cfClearPending };
}
