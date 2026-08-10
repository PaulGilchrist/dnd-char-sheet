import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';
import { getAllyList } from '../useAllySelection.js';
import { addEntry } from '../../services/ui/logService.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';
import { getConsumedMaterial, getMaterialRequirementMessage } from '../../services/rules/spells/materialComponents.js';
import { isFreeCastAuthorized } from '../../services/rules/spells/spellPreparationService.js';
import { prepareSpellCast } from '../../services/rules/spells/spellPreparationService.js';
import { consumeMaterial } from '../../services/rules/spells/materialComponents.js';
import { getCurrentSorceryPoints, getMaxSorceryPoints } from './useMetamagic.js';
import { isPsionicSpell, hasPsionicSorcery } from '../../services/rules/spells/metamagicRules.js';
import { getCreatureTargets } from './useSpellMetamagicHelpers.js';

export async function gateMetamagic(spell, metaCtx, {
  hasMaterial, setPopupHtml, isSorcerer, playerStats, campaignName, cfSetPending, setSecondaryTargetModal, characters, onExecute
}) {
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

    const isPolymorph = (spell.name || '').toLowerCase() === 'polymorph';
    if (isPolymorph) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('polymorph', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '60 feet',
          creatureTargets,
          maxTargets: 1,
          characters,
        });
        return;
      }
    }

    const isShapechange = (spell.name || '').toLowerCase() === 'shapechange';
    if (isShapechange && isSorcerer) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      // Shapechange is self-only: include caster even if not in combat
      if (!creatureTargets.includes(playerStats.name)) {
        creatureTargets.unshift(playerStats.name);
      }
      if (creatureTargets.length > 0) {
        cfSetPending('shapechange', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || 'Self',
          creatureTargets,
          maxTargets: 1,
          characters,
        });
        return;
      }
    }

    const isAnimalShapes = (spell.name || '').toLowerCase() === 'animal shapes';
    if (isAnimalShapes) {
      const allies = getAllyList(playerStats.name);
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.filter(c => allies.some(a => a.toLowerCase() === c.name.toLowerCase()))
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('animalShapes', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
          maxCR: 4,
          characters,
        });
        return;
      }
    }

    const isTruePolymorph = (spell.name || '').toLowerCase() === 'true polymorph';
    if (isTruePolymorph) {
      const cs = getCombatSummary(campaignName);
      const creatureTargets = cs?.creatures
        ?.map(c => c.name) || [];
      if (creatureTargets.length > 0) {
        cfSetPending('truePolymorph', {
          spell,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          range: spell.range || '30 feet',
          creatureTargets,
          characters,
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
}
