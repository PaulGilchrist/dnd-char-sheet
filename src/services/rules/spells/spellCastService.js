import { rollExpression, rollExpressionMaximized, applyHealingRerollOnes } from '../../dice/diceRoller.js';
import { computeRangeEffect, computeEffectiveSpellRange, getDistanceFeet, rangeToFeet } from '../combat/rangeValidation.js';
import { isInnateSorceryActive, getActiveBuffs } from '../../combat/buffs/buffService.js';
import { triggerPostCastRiderSaves, triggerSpellThief, triggerBewitchingMagic, triggerSoulstitchSpells, getEmpoweredEvocationFeatures, getEmpoweredEvocationIntModifier } from './postCastRiderService.js';
import { triggerPostCastSelfHeals, triggerPostCastAllyHeals } from './postCastHealService.js';
import { triggerSmiteOfProtection } from '../features/smiteOfProtectionService.js';
import { triggerInspiringSmite } from '../features/inspiringSmiteService.js';
import { triggerPrimalCompanionSpellShare } from '../features/primalCompanionSpellShareService.js';
import { triggerWildMagicSurge } from '../features/wildMagicSurgeService.js';
import { setRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { applyHealingToTarget } from '../combat/applyHealing.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { addEntry } from '../../ui/logService.js';
import { executeHandler } from '../../automation/index.js';
import { resolveSpellDamageWithTypes } from '../core/spellDamageUtils.js';
import { addExpiration } from '../effects/expirations.js';
import { triggerFalseLife } from '../features/falseLifeService.js';
import { triggerHealingWord } from '../features/healingWordService.js';
import { usesSpellSlot } from '../features/spellUtils.js';
import { triggerFleshToStone } from '../features/fleshToStoneService.js';
import { triggerRemoveCurse } from '../features/removeCurseService.js';
import { triggerHoldMonster } from '../features/holdMonsterService.js';
import { triggerBanishment } from '../features/banishmentService.js';
import { triggerMaze } from '../features/mazeService.js';
import { triggerHypnoticPattern } from '../features/hypnoticPatternService.js';
import { triggerMassSuggestion } from '../features/massSuggestionService.js';
import { triggerSuggestion } from '../features/suggestionService.js';
import { triggerBlur } from '../features/blurService.js';
import { triggerResilientSphere } from '../features/resilientSphereService.js';
import { triggerOttoDance } from '../features/ottoDanceService.js';
import { triggerFriends, endFriendsOnHostileAction } from '../features/friendsService.js';
import { triggerCharmPerson } from '../features/charmPersonService.js';
import { triggerCharmMonster } from '../features/charmMonsterService.js';
import { triggerCompulsion } from '../features/compulsionService.js';
import { triggerCrownOfMadness } from '../features/crownOfMadnessService.js';
import { triggerAnimalFriendship } from '../features/animalFriendshipService.js';
import { triggerDominateBeast } from '../features/dominateBeastService.js';
import { triggerDominateMonster } from '../features/dominateMonsterService.js';
import { triggerDominatePerson } from '../features/dominatePersonService.js';
import { triggerRayOfEnfeeblement } from '../features/rayOfEnfeeblementService.js';
import { triggerCompelledDuel } from '../features/compelledDuelService.js';
import { checkCompelledDuelAttackExpiry } from '../../automation/index.js';
import { triggerViciousMockeryForGeneric } from '../features/viciousMockeryService.js';
import { endInvisibilityOnHostileAction } from '../features/invisibilityService.js';
import { triggerGlobeOfInvulnerability } from '../features/globeOfInvulnerabilityService.js';
import { triggerHolyAura } from '../features/holyAuraService.js';
import { getSilenceSource, isCreatureInSilenceZone } from '../features/silenceService.js';
import { triggerSlow } from '../features/slowService.js';
import { triggerBaneSpell } from '../features/baneService.js';
import { triggerBlessSpell } from '../features/blessService.js';
import { triggerExpeditiousRetreat } from '../features/expeditiousRetreatService.js';
import { triggerBeaconOfHope } from '../features/beaconOfHopeService.js';
import { triggerPowerWordStun } from '../features/powerWordStunService.js';
import { triggerSeeInvisibility } from '../features/seeInvisibilityService.js';
import { triggerStinkingCloud } from '../features/stinkingCloudService.js';
import { triggerSleetStorm } from '../features/sleetStormService.js';
import { triggerFaerieFire } from '../features/faerieFireService.js';
import { triggerImprisonment } from '../features/imprisonmentService.js';
import { triggerMassCureWounds } from '../features/massCureWoundsService.js';
import { triggerPrayerOfHealing } from '../features/prayerOfHealingService.js';
import { triggerMassHealingWord } from '../features/massHealingWordService.js';
import { triggerTashasHideousLaughter } from '../features/tashasHideousLaughterService.js';
import { executeHandler as executeLongstrider } from '../../automation/index.js';
import { executeHandler as executeProtectionFromEnergy } from '../../automation/index.js';
import { executeHandler as executeProtectionFromPoison } from '../../automation/index.js';
import { onAbjurationSpellCast } from '../../automation/handlers/class-wizard/arcaneWardHandler.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { getPsychicSpellsConfig } from '../../automation/handlers/class-warlock/psychicSpellsHandler.js';
import { resolveHealingBonusesWithDetails, hasHealingMaximizationForTarget, hasRerollHealingOnes } from '../../combat/automation/automationService.js';

function applyHexEffects(spell, playerStats, campaignName, targetName, ability) {
    if (spell.name !== 'Hex') return;

    if (!targetName || !ability) return;

    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const effects = [...storedEffects];

    // Base Hex: apply ability check disadvantage for chosen ability
    const existingAbilityCheckIndex = effects.findIndex(
        te => te.target === targetName && te.effect === 'hex_ability_check_disadvantage' && te.source === playerStats.name
    );
    const hexAbilityCheckEffect = {
        target: targetName,
        effect: 'hex_ability_check_disadvantage',
        source: playerStats.name,
        ability: ability,
        duration: 'hex_duration',
    };
    if (existingAbilityCheckIndex >= 0) {
        effects[existingAbilityCheckIndex] = hexAbilityCheckEffect;
    } else {
        effects.push(hexAbilityCheckEffect);
    }

    // Eldritch Hex (Warlock 10): also apply saving throw disadvantage
    const passives = playerStats.automation?.passives;
    const hasEldritchHex = Array.isArray(passives) && passives.some(p => p.name === 'Eldritch Hex' && p.type === 'conditional_disadvantage');
    if (hasEldritchHex) {
        const existingSaveIndex = effects.findIndex(
            te => te.target === targetName && te.effect === 'hex_save_disadvantage' && te.source === playerStats.name
        );
        const hexSaveEffect = {
            target: targetName,
            effect: 'hex_save_disadvantage',
            source: playerStats.name,
            ability: ability,
            duration: 'hex_duration',
        };
        if (existingSaveIndex >= 0) {
            effects[existingSaveIndex] = hexSaveEffect;
        } else {
            effects.push(hexSaveEffect);
        }
    }

    setRuntimeValue('campaign', 'targetEffects', effects, campaignName);
}

 export async function checkGlobeOfInvulnerability(spell, targetName, playerStats, campaignName) {
    const effectiveSpellLevel = spell.level ?? spell.baseLevel ?? 1;
    if (effectiveSpellLevel <= 5 && targetName) {
        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const effects = Array.isArray(storedEffects) ? storedEffects : [];
        const globeEffects = effects.filter(te => te.effect === 'globe_barrier');
        const globeEffect = effects.find(
            te => te.target === targetName && te.effect === 'globe_barrier'
        );
        if (globeEffect) {
            const attackerProtected = globeEffects.some(ge => ge.target === playerStats.name);
            if (!attackerProtected) {
                await addEntry(campaignName, {
                    type: 'automation',
                    creatureName: globeEffect.source,
                    name: 'Globe of Invulnerability',
                    description: `${spell.name} (level ${effectiveSpellLevel}) from ${playerStats.name} blocked — target is protected by Globe of Invulnerability.`,
                    timestamp: Date.now(),
                }).catch(() => {});

                return {
                    automationPopup: {
                        type: 'popup',
                        payload: {
                            type: 'automation_info',
                            name: 'Globe of Invulnerability',
                            description: `${spell.name} (level ${effectiveSpellLevel}) is blocked by Globe of Invulnerability protecting ${targetName}.`,
                        },
                    },
                };
            }
        }
    }
    return null;
}

export async function executeSpellCast(spell, metaCtx, { rollAttack, rollDamage, playerStats, getTargetInfo, attackerPos, targetPos, featEffects, campaignName, mapName, characters }) {
    if (getActiveBuffs(playerStats.name, campaignName).some(b => b.blocksSpellcasting)) {
        return;
    }

    const globeTargetName = getTargetInfo ? (await getTargetInfo())?.name : null;
    const globeBlock = await checkGlobeOfInvulnerability(spell, globeTargetName, playerStats, campaignName);
    if (globeBlock) {
        return globeBlock;
    }

    // Antimagic Field — block spell casting when caster or target is affected
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const antimagicEffects = storedEffects.filter(te => te.effect === 'antimagic_field');
    const casterAffected = antimagicEffects.some(te => te.target === playerStats.name);
    const targetAffected = globeTargetName ? antimagicEffects.some(te => te.target === globeTargetName) : false;

    if (casterAffected) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: playerStats.name,
            name: 'Antimagic Field',
            description: `${spell.name} blocked — caster is within Antimagic Field.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Antimagic Field',
                    description: `${spell.name} is blocked by Antimagic Field affecting ${playerStats.name}.`,
                },
            },
        };
    }

    if (targetAffected && globeTargetName) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: playerStats.name,
            name: 'Antimagic Field',
            description: `${spell.name} blocked — ${globeTargetName} is within Antimagic Field.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Antimagic Field',
                    description: `${spell.name} is blocked by Antimagic Field protecting ${globeTargetName}.`,
                },
            },
        };
    }

    // Compute hasInvisible early so it's available for all spell paths
    const magicalAmbush = (function () {
        const passives = playerStats.automation?.passives;
        if (passives == null) {
            console.error('[spellCast] magicalAmbush check: playerStats.automation.passives is missing');
            throw new Error('playerStats.automation.passives is required for magical ambush check');
        }
        return passives.some(p => p.type === 'passive_rule' && p.effect === 'magical_ambush');
    })();
    const rawConditions = getRuntimeValue(playerStats.name, 'activeConditions', campaignName);
    if (rawConditions == null || !Array.isArray(rawConditions)) {
        console.error('[spellCast] casterConditions: activeConditions is not an array');
        throw new Error('activeConditions must be an array for caster');
    }
    const casterConditions = rawConditions;
    const hasInvisible = magicalAmbush && casterConditions.some(c => String(c).toLowerCase() === 'invisible');

    // Silence — block Verbal components if caster is in a silence zone
    if (spell.components && spell.components.includes('V')) {
        const silenceCaster = getSilenceSource(playerStats.name, campaignName);
        if (silenceCaster && isCreatureInSilenceZone(playerStats.name, silenceCaster, campaignName)) {
            return;
        }
    }

    // Psychic Spells — remove Verbal/Somatic components for Enchantment/Illusion Warlock spells
    const psychicSpellsConfig = getPsychicSpellsConfig(playerStats);
    if (psychicSpellsConfig && spell.components) {
        const spellSchool = (spell.school || '').toLowerCase();
        const reducedSchools = (psychicSpellsConfig.spellSchools || []).map(s => s.toLowerCase());
        if (reducedSchools.includes(spellSchool)) {
            const reducedComponents = (psychicSpellsConfig.componentReduction || []).map(c => c.toUpperCase());
            spell.components = spell.components.filter(c => !reducedComponents.includes(c.toUpperCase()));
        }
    }

    // If casting any spell other than Friends, end active Friends early
    // (Friends ends early when you make an attack roll, deal damage, or force a save)
    if (spell.name && spell.name.toLowerCase() !== 'friends') {
        endFriendsOnHostileAction(playerStats.name, campaignName);
    }

    // Casting any spell ends active Invisibility early on the caster
    endInvisibilityOnHostileAction(playerStats.name, campaignName);

    if (spell.casting_time === '1 action') {
        setRuntimeValue(playerStats.name, 'lastActionSpellCast', 1, campaignName);
    }

    // Look up full spell data from spells.json if the spell object is incomplete
    // (character sheet stores only { name, prepared } for most spellcasting classes)
    let fullSpell = spell;
    const needsLookup = !spell.area_of_effect || (spell.automation?.type && !spell.automation?.effects);
    if (needsLookup) {
        try {
            const spellsUrl = playerStats.rules === '2024' ? '/data/2024/spells.json' : '/data/spells.json';
            const response = await fetch(spellsUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const allSpells = await response.json();
            const lookup = allSpells.find(s => s.name === spell.name);
            if (lookup) {
                fullSpell = { ...spell, ...lookup, index: undefined, name: spell.name };
            } else {
                console.error('[spellCast] Spell not found in spells.json:', spell.name, 'available:', allSpells.filter(s => s.name.toLowerCase().includes('burning')).map(s => s.name));
            }
        } catch (e) {
            console.error('[spellCast] Failed to look up full spell data for:', spell.name, e);
        }
    }

    const spellLevel = spell.level || 1;
    const innateSorceryActive = isInnateSorceryActive(playerStats.name, campaignName);
    const damageInfo = resolveSpellDamageWithTypes(spell, spellLevel);
    const formula = damageInfo?.formula || null;
    const damageType = damageInfo?.primaryType || spell.damage?.damage_type || '';
    let effectiveDamageType = damageType;
    if (psychicSpellsConfig && spell.damage && damageType) {
        effectiveDamageType = psychicSpellsConfig.damageType || 'Psychic';
    }

    const cantripSpellAbility = spell.spellCastingAbility || playerStats.spellAbilities?.spellCastingAbility;
    let spellToHit = playerStats.spellAbilities?.toHit || 0;
    let spellSaveDc;
    if (playerStats.spellAbilities?.saveDc == null) {
        if (playerStats.proficiency == null) {
            console.error('[spellCast] executeSpellCast: playerStats.proficiency is missing')
            throw new Error('playerStats.proficiency is required for spell save DC calculation')
        }
        spellSaveDc = 8 + playerStats.proficiency;
    } else {
        spellSaveDc = playerStats.spellAbilities.saveDc;
    }
    if (cantripSpellAbility && playerStats.abilities) {
        const ability = playerStats.abilities.find(a => a.name === cantripSpellAbility);
        if (ability) {
            spellToHit = ability.bonus + playerStats.proficiency;
            spellSaveDc = 8 + ability.bonus + playerStats.proficiency;
        }
    }

    let spellCastingMod = 0;
    if (cantripSpellAbility && playerStats.abilities) {
        const ability = playerStats.abilities.find(a => a.name === cantripSpellAbility);
        if (ability) {
            spellCastingMod = ability.bonus;
        }
    } else if (playerStats.spellAbilities) {
        spellCastingMod = playerStats.spellAbilities.modifier || 0;
    }

    // Generic spell cast log — fires for ALL spells with target and effect details
    // (Hex has its own custom log below, skip it here to avoid duplicates)
    if (spell.name !== 'Hex') {
        const resolvedTarget = await getTargetInfo();
        const resolvedTargetName = resolvedTarget?.name || null;
        addEntry(campaignName, {
          type: 'spell',
          characterName: playerStats.name,
          targetName: resolvedTargetName,
          spellName: spell.name,
          spellLevel: spell.level || 0,
          castingTime: spell.casting_time,
          damageType: damageType || null,
          damageFormula: formula || null,
          saveDC: spell.dc ? spellSaveDc : null,
          concentration: !!spell.concentration,
          timestamp: Date.now(),
        }).catch(() => {});
    }

    if (spell.name.toLowerCase() === 'power word heal') {
        if (metaCtx?.multiTarget) {
            await applyPowerWordHealToTarget(metaCtx.multiTarget, playerStats, campaignName);
        } else {
            const target = await getTargetInfo();
            if (target?.name) {
                await applyPowerWordHealToTarget(target.name, playerStats, campaignName);
            }
        }
        return;
    }

    if (spell.name && spell.name.toLowerCase() === 'power word kill') {
        if (metaCtx?.multiTarget) {
            await applyPowerWordKillToTarget(metaCtx.multiTarget, playerStats, campaignName);
        } else {
            const target = await getTargetInfo();
            if (target?.name) {
                await applyPowerWordKillToTarget(target.name, playerStats, campaignName);
            }
        }
        return;
    }

    // Mass Suggestion — multi-target WIS save for selected creatures (up to 12), must show modal before generic automation routing
    if (spell.name && spell.name.toLowerCase() === 'mass suggestion' && spellSaveDc) {
        return {
            automationPopup: {
                type: 'modal',
                modalName: 'massSuggestion',
                payload: {
                    action: { name: 'Mass Suggestion', automation: { type: 'mass_suggestion' } },
                    playerStats,
                    campaignName,
                    saveType: 'WIS',
                    saveDc: spellSaveDc,
                },
            },
        };
    }

    // Calm Emotions — multi-target CHA save for all creatures in 20-ft-radius sphere: per-creature choice (Grant Immunity to Charmed/Frightened or Apply Charmed), must show modal before generic automation routing
    if (fullSpell.name && fullSpell.name.toLowerCase() === 'calm emotions' && fullSpell.dc) {
        const calmEmotionsModalPayload = {
            action: { name: 'Calm Emotions', automation: { type: 'calm_emotions' } },
            playerStats,
            campaignName,
            saveType: 'CHA',
            saveDc: spellSaveDc,
            activeOverlay: null,
            metamagicCareful: metaCtx?.metamagicCareful || false,
            metamagicHeighten: metaCtx?.metamagicHeighten,
        };
        return {
            automationPopup: {
                type: 'modal',
                modalName: 'calmEmotions',
                payload: calmEmotionsModalPayload,
            },
        };
    }

    // Hypnotic Pattern — multi-target WIS save for all creatures in 20-ft-radius sphere: Charmed + Incapacitated + Speed 0, must show modal before generic automation routing
    if (fullSpell.name && fullSpell.name.toLowerCase() === 'hypnotic pattern' && fullSpell.dc) {
        const hypnoticInnateBonus = innateSorceryActive ? 1 : 0;
        const hypnoticModalPayload = {
            action: { name: 'Hypnotic Pattern', automation: { type: 'hypnotic_pattern' } },
            playerStats,
            campaignName,
            saveType: 'WIS',
            saveDc: spellSaveDc + hypnoticInnateBonus,
            activeOverlay: null,
            metamagicCareful: metaCtx?.metamagicCareful || false,
            metamagicHeighten: metaCtx?.metamagicHeighten,
        };
        return {
            automationPopup: {
                type: 'modal',
                modalName: 'hypnoticPattern',
                payload: hypnoticModalPayload,
            },
        };
    }

    // Confusion — multi-target WIS save for all creatures in 10-ft-radius sphere: Charmed + Speed 0 + no Bonus Actions/Reactions, must show modal before generic automation routing
    if (fullSpell.name && fullSpell.name.toLowerCase() === 'confusion' && fullSpell.dc) {
        const confusionModalPayload = {
            action: { name: 'Confusion', automation: { type: 'confusion' } },
            playerStats,
            campaignName,
            saveType: 'WIS',
            saveDc: spellSaveDc,
            activeOverlay: null,
            metamagicCareful: metaCtx?.metamagicCareful || false,
            metamagicHeighten: metaCtx?.metamagicHeighten,
        };
        return {
            automationPopup: {
                type: 'modal',
                modalName: 'confusion',
                payload: confusionModalPayload,
            },
        };
    }

    // Generic automation routing — any spell with automation.type that hasn't been handled by a specific case above
    // This ensures all automated spells (shield, blade_ward, buff_ally, temp_buff, etc.) work when cast
    // Skip spells with automation.effects — those have AoE/single-target effects handled below
    // Must come before generic healing path so spells like Mass Heal (which has heal_at_slot_level)
    // get routed to their automation handler instead of the single-target generic healer
    if (spell.automation?.type && !fullSpell.automation?.effects?.fail && !fullSpell.automation?.effects?.success) {
        const action = {
            name: spell.name,
            spell: spell,
            automation: spell.automation,
            metaCtx,
        };
        const handlerResult = await executeHandler(action, playerStats, campaignName, mapName, characters);
        if (handlerResult) {
            return { automationPopup: handlerResult };
        }
        triggerArcaneWard(spell, metaCtx, playerStats, campaignName).catch(e => {
            console.error('[spellCast] Arcane Ward trigger failed:', e);
        });
        return;
    }

    if (!formula) {

        // Fear — multi-target WIS save for all creatures (30-ft cone)
        if (spell.name && spell.name.toLowerCase() === 'fear' && spell.dc) {
            const fearInnateBonus = innateSorceryActive ? 1 : 0;
            const fearModalPayload = {
                action: { name: 'Fear', automation: { type: 'fear' } },
                playerStats,
                campaignName,
                saveType: 'WIS',
                saveDc: spellSaveDc + fearInnateBonus,
                activeOverlay: null,
                metamagicCareful: metaCtx?.metamagicCareful || false,
                metamagicHeighten: metaCtx?.metamagicHeighten,
            };
            return {
                automationPopup: {
                    type: 'modal',
                    modalName: 'fear',
                    payload: fearModalPayload,
                },
            };
        }

        // Regenerate — heal target, set turn-start healing, track body part regrowth
        if (spell.name && spell.name.toLowerCase() === 'regenerate') {
            const target = await getTargetInfo();
            if (target?.name) {
                return await applyRegenerateSpell(spell, target, playerStats, campaignName);
            }
            return null;
        }

        // Feign Death — handled by useSpellMetamagicFlow for target selection (no spellCastService case needed)

        // See Invisibility — self-target buff that lets you see invisible creatures
        if (spell.name && spell.name.toLowerCase() === 'see invisibility') {
            await triggerSeeInvisibility(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Flesh to Stone — CON save, progressive Restrained→Petrified
        if (spell.name && spell.name.toLowerCase() === 'flesh to stone') {
            await triggerFleshToStone(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Hold Monster / Hold Person — WIS save, Paralyzed condition with end-of-turn save
        if (spell.name && (spell.name.toLowerCase() === 'hold monster' || spell.name.toLowerCase() === 'hold person')) {
            await triggerHoldMonster(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Banishment — CHA save, Incapacitated condition, transports target to demiplane (concentration, up to 1 minute)
        if (spell.name && spell.name.toLowerCase() === 'banishment') {
            await triggerBanishment(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Maze — single target banished to demiplane, no save, target can use Study action (DC 20 INT Investigation) to escape, concentration up to 10 minutes
        if (spell.name && spell.name.toLowerCase() === 'maze') {
            await triggerMaze(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Power Word Stun — no save, HP threshold check: ≤150 HP = Stunned (with repeat CON save), >150 HP = Speed 0
        if (spell.name && spell.name.toLowerCase() === 'power word stun') {
            const pwsResult = await triggerPowerWordStun(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            if (pwsResult) {
                return { automationPopup: pwsResult };
            }
            return;
        }

        // Hypnotic Pattern — multi-target WIS save for all creatures in 30-ft cube (can see)
        if (spell.name && spell.name.toLowerCase() === 'hypnotic pattern') {
            await triggerHypnoticPattern(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Slow — multi-target WIS save, applies speed halved, -2 AC, no reactions, action/bonus limit
        if (spell.name && spell.name.toLowerCase() === 'slow') {
            await triggerSlow(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Bane — multi-target CHA save, applies -1d4 to attack rolls and saving throws
        if (spell.name && spell.name.toLowerCase() === 'bane') {
            await triggerBaneSpell(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Bless — multi-target, adds 1d4 to attack rolls and saving throws (no save required)
        if (spell.name && spell.name.toLowerCase() === 'bless') {
            await triggerBlessSpell(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Beacon of Hope — multi-target, advantage on WIS and death saves, maximized healing
        if (spell.name && spell.name.toLowerCase() === 'beacon of hope') {
            await triggerBeaconOfHope(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Mass Suggestion — multi-target WIS save, applies Charmed condition to failed targets
        if (spell.name && spell.name.toLowerCase() === 'mass suggestion') {
            await triggerMassSuggestion(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Suggestion — single target WIS save, applies Charmed condition to failed target
        if (spell.name && spell.name.toLowerCase() === 'suggestion') {
            await triggerSuggestion(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Otto's Irresistible Dance / Irresistible Dance — single target WIS save, Charmed + speed_zero + save/attack modifiers
        if (spell.name && (spell.name.toLowerCase() === "otto's irresistible dance" || spell.name.toLowerCase() === 'irresistible dance')) {
            await triggerOttoDance(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Otiluke's Resilient Sphere / Resilient Sphere — DEX save, encloses target in an immovable sphere
        if (spell.name && (spell.name.toLowerCase() === "otiluke's resilient sphere" || spell.name.toLowerCase() === 'resilient sphere')) {
            await triggerResilientSphere(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Blur — self-target illusion that gives attackers disadvantage on attack rolls against you
        if (spell.name && spell.name.toLowerCase() === 'blur') {
            await triggerBlur(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Expeditious Retreat — concentration badge for bonus action Dash
        if (spell.name && spell.name.toLowerCase() === 'expeditious retreat') {
            await triggerExpeditiousRetreat(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Friends — single-target WIS save or Charmed, with auto-save conditions and early-end triggers
        if (spell.name && spell.name.toLowerCase() === 'friends') {
            const friendsTarget = await getTargetInfo();
            const friendsMetaCtx = { ...metaCtx, spellSaveDc, targetName: friendsTarget?.name };
            const friendsResult = await triggerFriends(spell, friendsMetaCtx, playerStats, campaignName, mapName);
            if (friendsResult) {
                return { automationPopup: friendsResult };
            }
            return;
        }

        // Charm Person — single humanoid target WIS save or Charmed
        if (spell.name && spell.name.toLowerCase() === 'charm person') {
            const charmTarget = await getTargetInfo();
            const charmPersonResult = await triggerCharmPerson(spell, { ...metaCtx, spellSaveDc, targetName: charmTarget?.name }, playerStats, campaignName, mapName);
            if (charmPersonResult) {
                return { automationPopup: charmPersonResult };
            }
            return;
        }

        // Charm Monster — single creature target WIS save or Charmed
        if (spell.name && spell.name.toLowerCase() === 'charm monster') {
            const charmTarget = await getTargetInfo();
            const charmMonsterResult = await triggerCharmMonster(spell, { ...metaCtx, spellSaveDc, targetName: charmTarget?.name }, playerStats, campaignName, mapName);
            if (charmMonsterResult) {
                return { automationPopup: charmMonsterResult };
            }
            return;
        }

        // Compulsion — multi-target WIS save or Charmed (concentration)
        if (spell.name && spell.name.toLowerCase() === 'compulsion') {
            const compulsionTarget = await getTargetInfo();
            const compulsionResult = await triggerCompulsion(spell, { ...metaCtx, spellSaveDc, targetName: compulsionTarget?.name }, playerStats, campaignName, mapName);
            if (compulsionResult) {
                return { automationPopup: compulsionResult };
            }
            return;
        }

        // Crown of Madness — single humanoid target WIS save or Charmed (concentration)
        if (spell.name && spell.name.toLowerCase() === 'crown of madness') {
            const crownTarget = await getTargetInfo();
            const crownResult = await triggerCrownOfMadness(spell, { ...metaCtx, spellSaveDc, targetName: crownTarget?.name }, playerStats, campaignName, mapName);
            if (crownResult) {
                return { automationPopup: crownResult };
            }
            return;
        }

        // Animal Friendship — multi-target beast charm with upcasting
        if (spell.name && spell.name.toLowerCase() === 'animal friendship') {
            const animalFriendshipResult = await triggerAnimalFriendship(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            if (animalFriendshipResult) {
                return { automationPopup: animalFriendshipResult };
            }
            return;
        }

        // Dominate Beast — single beast target WIS save or Charmed (concentration)
        if (spell.name && spell.name.toLowerCase() === 'dominate beast') {
            const dominateBeastTarget = await getTargetInfo();
            const dominateBeastResult = await triggerDominateBeast(spell, { ...metaCtx, spellSaveDc, targetName: dominateBeastTarget?.name }, playerStats, campaignName, mapName);
            if (dominateBeastResult) {
                return { automationPopup: dominateBeastResult };
            }
            return;
        }

        // Dominate Monster — single creature target WIS save or Charmed (concentration)
        if (spell.name && spell.name.toLowerCase() === 'dominate monster') {
            const dominateMonsterTarget = await getTargetInfo();
            checkCompelledDuelAttackExpiry(playerStats.name, dominateMonsterTarget?.name, campaignName);
            const dominateMonsterResult = await triggerDominateMonster(spell, { ...metaCtx, spellSaveDc, targetName: dominateMonsterTarget?.name }, playerStats, campaignName, mapName);
            if (dominateMonsterResult) {
                return { automationPopup: dominateMonsterResult };
            }
            return;
        }

        // Dominate Person — single humanoid target WIS save or Charmed (concentration)
        if (spell.name && spell.name.toLowerCase() === 'dominate person') {
            const dominatePersonTarget = await getTargetInfo();
            checkCompelledDuelAttackExpiry(playerStats.name, dominatePersonTarget?.name, campaignName);
            const dominatePersonResult = await triggerDominatePerson(spell, { ...metaCtx, spellSaveDc, targetName: dominatePersonTarget?.name }, playerStats, campaignName, mapName);
            if (dominatePersonResult) {
                return { automationPopup: dominatePersonResult };
            }
            return;
        }

        // Ray of Enfeeblement (2024) — CON save: success = target has Disadvantage on next attack; failure = STR check disadvantage + 1d8 damage reduction
        if (spell.name && spell.name.toLowerCase() === 'ray of enfeeblement') {
            const rayTarget = await getTargetInfo();
            checkCompelledDuelAttackExpiry(playerStats.name, rayTarget?.name, campaignName);
            await triggerRayOfEnfeeblement(spell, { ...metaCtx, spellSaveDc, targetName: rayTarget?.name }, playerStats, campaignName, mapName);
            return;
        }

        // Compelled Duel — WIS save: on failure the target has Disadvantage on attack rolls against creatures other than the caster (Concentration)
        if (spell.name && spell.name.toLowerCase() === 'compelled duel') {
            const duelTarget = await getTargetInfo();
            const duelResult = await triggerCompelledDuel(spell, { ...metaCtx, spellSaveDc, targetName: duelTarget?.name }, playerStats, campaignName, mapName);
            if (duelResult) {
                return { automationPopup: duelResult };
            }
            return;
        }

        // Globe of Invulnerability — toggle passive barrier that blocks spells of level 5 or lower
        if (spell.name && spell.name.toLowerCase() === 'globe of invulnerability') {
            const result = await triggerGlobeOfInvulnerability(spell, metaCtx, playerStats, campaignName, mapName);
            if (result) {
                return { automationPopup: result };
            }
            return;
        }

        // Silence — 20-ft-radius sphere: creatures inside are Deafened, immune to Thunder, cannot cast Verbal spells
        if (spell.name && spell.name.toLowerCase() === 'silence') {
            const rangeFeet = (() => {
                const match = String(spell.range || '120 feet').match(/(\d+)-?foot/);
                return match ? parseInt(match[1], 10) : 120;
            })();
            const aoeSize = spell.area_of_effect?.size || '20-foot-radius';
            const aoeMatch = aoeSize.match(/(\d+)-foot-radius/);
            const aoeRadius = aoeMatch ? parseInt(aoeMatch[1], 10) : 20;
            const slotLevel = metaCtx?.slotLevel || spell.level || 2;

            const combatSummary = getCombatSummary(campaignName) || { creatures: [], players: [] };
            const allCreatures = [
                ...combatSummary.players?.map(p => ({ name: p.name, type: 'player' })) || [],
                ...combatSummary.creatures?.map(c => ({ name: c.name, type: 'creature' })) || [],
            ];

            return {
                automationPopup: {
                    type: 'modal',
                    modalName: 'silenceTargetSelection',
                    payload: {
                        action: { name: 'Silence', automation: { type: 'silence', aoeRadius, range: rangeFeet } },
                        playerStats,
                        campaignName,
                        aoeRadius,
                        slotLevel,
                        activeOverlay: null,
                        creatureTargets: allCreatures,
                    },
                },
            };
        }


        // Stinking Cloud — multi-target CON save for all creatures in 20-ft-radius sphere: Poisoned with repeating save
        if (spell.name && spell.name.toLowerCase() === 'stinking cloud') {
            await triggerStinkingCloud(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Sleet Storm — multi-target DEX save for all creatures in 40-ft-tall 20-ft-radius Cylinder: Prone + lose Concentration with repeating save
        if (spell.name && spell.name.toLowerCase() === 'sleet storm') {
            await triggerSleetStorm(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Faerie Fire — multi-target DEX save for all creatures in 20-ft cube: outlined in light, can't benefit from Invisible, attack rolls against them have Advantage
        if (spell.name && spell.name.toLowerCase() === 'faerie fire') {
            const ffResult = await triggerFaerieFire(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            if (ffResult) {
                return { automationPopup: ffResult };
            }
            return;
        }

        // Tasha's Hideous Laughter — single target WIS save: Prone + Incapacitated with repeating save (end of turn + on damage)
        if (spell.name && spell.name.toLowerCase() === "tasha's hideous laughter") {
            await triggerTashasHideousLaughter(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Imprisonment — 9th level abjuration: WIS save, apply chosen prison effect (Burial/Chaining/Hedged Prison/Minimus Containment/Slumber), no concentration, until dispelled
        if (spell.name && spell.name.toLowerCase() === 'imprisonment') {
            await triggerImprisonment(spell, { ...metaCtx, spellSaveDc }, playerStats, campaignName, mapName);
            return;
        }

        // Heroism — grants Frightened immunity and temp HP at start of each turn
        if (spell.name && spell.name.toLowerCase() === 'heroism') {
            const action = {
                name: spell.name,
                spell: spell,
                automation: spell.automation || { type: 'heroism' },
            };
            const heroismResult = await executeHandler(action, playerStats, campaignName, mapName, characters);
            if (heroismResult) {
                return { automationPopup: heroismResult };
            }
            return;
        }

        // Holy Aura — 30-ft emanation: allies in aura get save advantage, attackers get attack disadvantage, Fiend/Undead melee attackers save vs CON or Blinded
        if (spell.name && spell.name.toLowerCase() === 'holy aura') {
            await triggerHolyAura(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Longstrider — target's Speed increases by 10 feet for duration
        if (spell.name && spell.name.toLowerCase() === 'longstrider') {
            const action = {
                name: 'Longstrider',
                spell: spell,
                automation: { type: 'longstrider' },
            };
            const longstriderResult = await executeLongstrider(action, playerStats, campaignName, mapName);
            if (longstriderResult) {
                return { automationPopup: longstriderResult };
            }
            return;
        }

        // Spare the Dying — make a creature with 0 HP stable (3 death save successes)
        if (spell.name && spell.name.toLowerCase() === 'spare the dying') {
            const action = {
                name: 'Spare the Dying',
                spell: spell,
                automation: spell.automation || { type: 'spare_the_dying' },
            };
            const spareResult = await executeHandler(action, playerStats, campaignName, mapName, characters);
            if (spareResult) {
                return { automationPopup: spareResult };
            }
            return;
        }

        // Enhance Ability — target gains Advantage on ability checks of the chosen ability (Concentration)
        if (spell.name && spell.name.toLowerCase() === 'enhance ability') {
            const action = {
                name: spell.name,
                spell: spell,
                automation: spell.automation || { type: 'enhance_ability', range: 'Touch' },
                metaCtx,
            };
            const enhanceResult = await executeHandler(action, playerStats, campaignName, mapName, characters);
            if (enhanceResult) {
                return { automationPopup: enhanceResult };
            }
            return;
        }

        if (spell.dc && spell.status_effects && spell.status_effects.length > 0 && !fullSpell.area_of_effect) {
            const target = await getTargetInfo();
            const context = {
                targetName: target?.name,
                attackerName: playerStats.name,
                ...metaCtx,
                saveDc: spellSaveDc + (innateSorceryActive ? 1 : 0),
                saveType: spell.dc.dc_type,
                dcSuccess: spell.dc.dc_success,
                metamagicHeighten: hasInvisible || metaCtx?.metamagicHeighten,
                isCantrip: spell.baseLevel === 0 || spell.level === 0,
            };
            if (spell.status_effects && spell.status_effects.length > 0) {
                context.statusEffects = spell.status_effects;
            }
            rollDamage(spell.name, '0', 0, [], 0, context);
        }

        // Mass Cure Wounds — up to 6 creatures in 30-ft radius sphere regain 5d8 + modifier HP
        if (spell.name && spell.name.toLowerCase() === 'mass cure wounds') {
            await triggerMassCureWounds(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Mass Healing Word — up to 6 creatures regain 2d4 + spellcasting ability modifier HP
        if (spell.name && spell.name.toLowerCase() === 'mass healing word') {
            await triggerMassHealingWord(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Prayer of Healing — up to 5 creatures within range each regain 2d8 + modifier HP
        if (spell.name && spell.name.toLowerCase() === 'prayer of healing') {
            await triggerPrayerOfHealing(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // False Life — self-target temp HP, handled by dedicated service
        if (spell.name && spell.name.toLowerCase() === 'false life') {
            await triggerFalseLife(spell, metaCtx, playerStats, campaignName, mapName);
            return;
        }

        // Generic healing: use heal_at_slot_level for any healing spell without a dedicated handler
        if (spell.heal_at_slot_level) {
            const explicitTarget = metaCtx?.targetName ? { name: metaCtx.targetName } : null;
            const target = explicitTarget || await getTargetInfo();
            let genericHealResult = null;
            if (target?.name) {
                if (metaCtx?.slotLevel == null && spell.level == null) {
                    console.error('[spellCast] executeSpellCast: slot level is missing (metaCtx.slotLevel and spell.level) for healing spell')
                    throw new Error('slot level is required for healing spell')
                }
                const slotLevel = metaCtx?.slotLevel || spell.level;
                const healAtSlotLevel = spell.heal_at_slot_level;
                let expression = healAtSlotLevel[slotLevel];
                if (!expression) {
                    const levels = Object.keys(healAtSlotLevel).map(Number).sort((a, b) => a - b);
                    const highestBelow = levels.filter(l => l <= slotLevel).pop();
                    if (highestBelow) {
                        expression = healAtSlotLevel[highestBelow];
                    }
                }
                if (expression) {
                    const targetChar = (characters || []).find(c => c.name === target.name);
                    const targetStats = targetChar?.computedStats || targetChar;
                    const { totalBonus: bonusHeal, details: bonusDetails } = resolveHealingBonusesWithDetails(playerStats, playerStats.proficiency || 0, playerStats.level || 1, slotLevel, campaignName, targetStats);
                    if (expression === 'max') {
                        const isTargetPlayer = target.name === playerStats.name || (characters || []).some(c => c.name === target.name && c.type === 'player');
                        const maxHp = isTargetPlayer
                            ? (getRuntimeValue(target.name, 'hitPoints') || playerStats.hitPoints || 0)
                            : (getRuntimeValue(target.name, 'hitPoints') || 0);
                        const currentHp = isTargetPlayer
                            ? (getRuntimeValue(target.name, 'currentHitPoints') ?? maxHp)
                            : (getRuntimeValue(target.name, 'currentHitPoints') ?? maxHp);
                        const actualHeal = maxHp - currentHp;
                        genericHealResult = { targetName: target.name, healAmount: Math.max(0, actualHeal), formula: 'max', rolls: [], rawTotal: Math.max(0, actualHeal), bonusHeal, bonusDetails };
                        if (actualHeal > 0) {
                            const combatSummary = await getCombatContext(campaignName);
                            if (combatSummary) {
                                applyHealingToTarget(combatSummary, target.name, actualHeal, campaignName);
                            }
                        }
                        addEntry(campaignName, {
                            type: 'hp_change',
                            targetName: target.name,
                            delta: actualHeal,
                            currentHp: Math.min(maxHp, currentHp + Math.max(0, actualHeal)),
                            maxHp,
                            isHealing: true,
                            sourceName: playerStats.name,
                            note: spell.name,
                            timestamp: Date.now(),
                        }).catch((e) => { console.error("[spellCast] Error:", e); });
                    } else {
                        let resolvedExpression = expression.replace(/\bMOD\b/g, String(spellCastingMod));
                        const maximize = hasHealingMaximizationForTarget(playerStats, target.name, campaignName);
                        const rerollOnes = hasRerollHealingOnes(playerStats);
                        const result = maximize ? rollExpressionMaximized(resolvedExpression) : rollExpression(resolvedExpression);
                        let displayRolls = result?.rolls || null;
                        let healingRerollOriginalRolls = null;
                        if (result && rerollOnes && !maximize) {
                            const { displayRolls: rerolled, originalRolls } = applyHealingRerollOnes(result.rolls, resolvedExpression);
                            displayRolls = rerolled;
                            healingRerollOriginalRolls = originalRolls;
                        }
                        if (result) {
                            const isTargetPlayer = target.name === playerStats.name || (characters || []).some(c => c.name === target.name && c.type === 'player');
                            const maxHp = isTargetPlayer
                                ? (getRuntimeValue(target.name, 'hitPoints') || playerStats.hitPoints || 0)
                                : (getRuntimeValue(target.name, 'hitPoints') || 0);
                            const currentHp = isTargetPlayer
                                ? (getRuntimeValue(target.name, 'currentHitPoints') ?? maxHp)
                                : (getRuntimeValue(target.name, 'currentHitPoints') ?? maxHp);
                            const healAmount = result.total + bonusHeal;
                            const actualHeal = Math.min(Math.max(0, healAmount), Math.max(0, maxHp - currentHp));
                            if (actualHeal > 0) {
                                const combatSummary = await getCombatContext(campaignName);
                                if (combatSummary) {
                                    applyHealingToTarget(combatSummary, target.name, actualHeal, campaignName);
                                }
                            }
                            genericHealResult = { targetName: target.name, healAmount: actualHeal, formula: resolvedExpression, rolls: displayRolls || result.rolls, rawTotal: result.total + bonusHeal, bonusHeal, bonusDetails, healingRerollOriginalRolls, healingRerollDisplayRolls: displayRolls };
                            const formulaParts = [resolvedExpression];
                            if (bonusDetails.length > 0) {
                                const bonusParts = bonusDetails.map(d => `${d.amount} ${d.name}`).join(' + ');
                                formulaParts.push(`(${bonusParts})`);
                            }
                            addEntry(campaignName, {
                                type: 'hp_change',
                                targetName: target.name,
                                delta: actualHeal,
                                currentHp: Math.min(maxHp, currentHp + actualHeal),
                                maxHp,
                                isHealing: true,
                                sourceName: playerStats.name,
                                note: spell.name,
                                formula: formulaParts.join(' + '),
                                bonusDetails: bonusDetails && bonusDetails.length > 0 ? bonusDetails : undefined,
                                timestamp: Date.now(),
                            }).catch((e) => { console.error("[spellCast] Error:", e); });
                        }
                    }
                }
            }

            triggerPostCastSelfHeals(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
                console.error('[spellCast] Post-cast self-heal failed:', e);
            });
            triggerPostCastAllyHeals(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
                console.error('[spellCast] Post-cast ally-heal failed:', e);
            });

            return genericHealResult;
        }

        triggerHealingWord(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
            console.error('[spellCast] Healing Word trigger failed:', e);
        });

        // Protection from Energy — apply resistance buff to target
        if (spell.name && spell.name.toLowerCase() === 'protection from energy') {
            const target = await getTargetInfo();
            if (target) {
                const action = {
                    name: 'Protection from Energy',
                    spell: spell,
                    automation: spell.automation ?? {},
                };
                await executeProtectionFromEnergy(action, playerStats, campaignName, mapName);
            }
        }

        // Protection from Poison — remove Poisoned condition and apply buff
        if (spell.name && spell.name.toLowerCase() === 'protection from poison') {
            const target = await getTargetInfo();
            if (target) {
                const action = {
                    name: 'Protection from Poison',
                    spell: spell,
                    automation: spell.automation ?? {},
                };
                await executeProtectionFromPoison(action, playerStats, campaignName, mapName);
            }
        }

        // Remove Curse — remove curses and break attunement on target
        if (spell.name && spell.name.toLowerCase() === 'remove curse') {
            await triggerRemoveCurse(spell, metaCtx, playerStats, campaignName, mapName);
        }

        // Dispel Magic — ability check to dispel a spell on a target
        if (spell.name && spell.name.toLowerCase() === 'dispel magic') {
            const dispelTarget = await getTargetInfo();
            if (dispelTarget) {
                const dispelMetaCtx = { ...metaCtx, targetName: dispelTarget.name };
                await triggerDispelMagic(dispelMetaCtx, spell, playerStats, campaignName, mapName);
            }
        }

        // Resistance (2024) — apply damage reduction buff to target
        if (spell.name && spell.name.toLowerCase() === 'resistance') {
            const target = await getTargetInfo();
            if (target) {
                const action = {
                    name: 'Resistance',
                    spell: spell,
                    automation: spell.automation ?? {},
                    metaCtx,
                };
                await executeHandler(action, playerStats, campaignName, mapName, characters);
            }
        }

    }

    // Hunter's Mark: does not deal damage on cast — adds 1d6 Force damage to weapon attacks via concentration
    if (spell.name === "Hunter's Mark") {
        return;
    }

    // Hex (2024): does not deal damage on cast — adds 1d6 Necrotic damage to weapon attacks via concentration
    if (spell.name === 'Hex') {
        const ability = metaCtx?.hexAbility || 'STR';
        const hexTarget = metaCtx?.targetName || (await getTargetInfo())?.name;
        applyHexEffects(spell, playerStats, campaignName, hexTarget, ability);
        const hasEldritchHex = playerStats.automation?.passives?.some(p => p.name === 'Eldritch Hex' && p.type === 'conditional_disadvantage');
        const effects = hasEldritchHex ? 'ability check disadvantage + saving throw disadvantage' : 'ability check disadvantage';
        addEntry(campaignName, { type: 'spell', characterName: playerStats.name, targetName: hexTarget, spellName: 'Hex', spellLevel: 1, castingTime: '1 bonus action', hexAbility: ability, effectsApplied: effects }).catch(() => {});
        return;
    }

    const rollContext = { ...metaCtx, damageType: effectiveDamageType };

    if (attackerPos && targetPos) {
        let effectiveRange = computeEffectiveSpellRange(spell.range, metaCtx);
        if (effectiveRange != null) {
            const cantripRangeBonus = (featEffects?.cantripRangeBonus) || 0;
            if (cantripRangeBonus > 0 && spell.level === 0) {
                const baseRange = rangeToFeet(spell.range);
                if (baseRange != null && baseRange >= 10) {
                    effectiveRange += cantripRangeBonus;
                }
            }
            const distanceFt = getDistanceFeet(attackerPos, targetPos);
            const rangeResult = computeRangeEffect(effectiveRange, distanceFt, featEffects ?? {});
            if (rangeResult.mode === 'miss') {
                rollContext.isAutoMiss = true;
                rollContext.rangeReason = rangeResult.reason;
            }
        }
    }

    const hasEmpoweredEvoc = getEmpoweredEvocationFeatures(playerStats).length > 0;
    const empEvocIntMod = hasEmpoweredEvoc ? getEmpoweredEvocationIntModifier(playerStats) : 0;
    const spellSchool = (spell.school || '').toLowerCase();
    const isEvocation = spellSchool === 'evocation';
    const shouldApplyEmpoweredEvoc = hasEmpoweredEvoc && isEvocation && spell.damage && empEvocIntMod > 0;

    let empEvocFormula = formula;
    if (shouldApplyEmpoweredEvoc) {
        empEvocFormula = `${formula} + ${empEvocIntMod} [Empowered Evocation]`;
    }

    // Blessed Strikes / Potent Spellcasting: add Wisdom modifier to cantrip damage
    const isCantrip = spell.baseLevel === 0 || spell.level === 0;
    let finalFormula = empEvocFormula;
    if (isCantrip && spell.damage && playerStats.automation?.actions) {
        const potentFeature = playerStats.automation.actions.find(
            a => a.type === 'damage_bonus' && !a.upgrades && a.options?.some(o => o.toLowerCase().includes('spellcasting'))
        );
        if (potentFeature) {
            const optKey = `_${(potentFeature.name || 'PotentSpellcasting').replace(/\s+/g, '_')}_option`;
            const chosen = getRuntimeValue(playerStats.name, optKey, campaignName);
            if (potentFeature.options.length > 1 && !chosen) {
                // multi-option feature with no choice yet — skip
            } else if (chosen && chosen.toLowerCase().includes('spellcasting')) {
                const wis = playerStats.abilities?.find(a => a.name === 'Wisdom');
                const wisMod = Math.max(0, wis?.bonus || 0);
                if (wisMod > 0) {
                    finalFormula = `${empEvocFormula} + ${wisMod} [Blessed Strikes]`;
                }
            } else if (potentFeature.options.length === 1) {
                const wis = playerStats.abilities?.find(a => a.name === 'Wisdom');
                const wisMod = Math.max(0, wis?.bonus || 0);
                if (wisMod > 0) {
                    finalFormula = `${empEvocFormula} + ${wisMod} [Blessed Strikes]`;
                }
            }
        }
    }

    // Radiant Soul: add CHA mod to spell damage when dealing Radiant or Fire damage
    const radiantSoulPassive = playerStats.automation?.passives?.find(p => p.type === 'radiant_soul');
    const spellDamageType = (spell.damage?.damage_type || '').toLowerCase();
    const damageTypes = (radiantSoulPassive?.damageTypes || []).map(dt => dt.toLowerCase());
    const oncePerTurnKey = `_radiantSoul_${playerStats.name.replace(/\s+/g, '_')}_oncePerTurn`;
    const radiantSoulOnceUsed = getRuntimeValue(playerStats.name, oncePerTurnKey, campaignName);
    if (radiantSoulPassive && radiantSoulPassive.hasAutomation && !radiantSoulOnceUsed && damageTypes.includes(spellDamageType)) {
        const charismaAbility = playerStats.abilities?.find(a => a.name === 'Charisma');
        const chaMod = Math.max(0, charismaAbility?.bonus || 0);
        if (chaMod > 0) {
            finalFormula = `${finalFormula} + ${chaMod} [Radiant Soul]`;
        }
    }

    // Overchannel: maximize damage for Wizard spells (slot levels 1-5) that deal damage
    let overchannelFormula = formula;
    let overchannelActive = false;
    let overchannelUseCount = 0;
    const overchannelPassives = (function () {
        const passives = playerStats.automation?.passives;
        if (passives == null) {
            console.error('[spellCast] overchannelPassives: playerStats.automation.passives is missing');
            throw new Error('playerStats.automation.passives is required for overchannel check');
        }
        return passives.filter(p => p.type === 'overchannel');
    })();
    if (overchannelPassives.length > 0) {
        const spellLevel = metaCtx?.slotLevel || spell.level;
        const hasDamage = !!spell.damage;
        const isSlotLevelValid = spellLevel >= 1 && spellLevel <= 5;
        const usesKey = 'Overchannel_useCount';
        const currentUseCount = Number(getRuntimeValue(playerStats.name, usesKey) ?? 0);
        if (hasDamage && isSlotLevelValid && metaCtx?.overchannel) {
            overchannelActive = true;
            overchannelUseCount = currentUseCount + 1;
            overchannelFormula = `${empEvocFormula} [Overchannel Maximize]`;
            setRuntimeValue(playerStats.name, usesKey, overchannelUseCount, campaignName);
        }
    }

    if (spell.dc || fullSpell.dc) {
        try {
            await triggerSoulstitchSpells(fullSpell, metaCtx, playerStats, campaignName, mapName);
        } catch (e) {
            console.error('[spellCast] Soulstitch Spells trigger failed:', e);
        }

        // AoE spells without dedicated automation: show modal for creature selection
        const aoe = fullSpell.area_of_effect;
        const aoeShape = aoe?.shape || aoe?.type;
        const isAreaShape = aoeShape ? ['emanation','cone','line','sphere','cube','cylinder','square','circle','wall','cage','floor','area'].includes(String(aoeShape).toLowerCase()) : false;

        if (isAreaShape) {
            const cs = getCombatContext(campaignName);
            const attackerTargetName = cs ? cs.creatures?.find(c => c.name === playerStats.name)?.targetName : null;
            const isOverlayTargeted = attackerTargetName?.startsWith('overlay-');

            let activeOverlay = null;
            if (isOverlayTargeted) {
                const overlayId = attackerTargetName.slice('overlay-'.length);
                try {
                    const response = await fetch(`/api/campaigns/${campaignName}/spell-overlays`);
                    const overlays = await response.json();
                    activeOverlay = overlays.find(o => o.id === overlayId) || null;
                } catch (error) {
                    console.error('[spellCast] Error fetching overlay:', error);
                }
            }

            const rangeFeet = rangeToFeet(fullSpell.range || spell.range);
            const slotLevel = metaCtx?.slotLevel || spell.level;
            const damageAtSlotLevel = fullSpell.damage?.damage_at_slot_level || fullSpell.damage?.damage_at_character_level || spell.damage?.damage_at_slot_level || {};
            let damageExpression = damageAtSlotLevel[slotLevel];
            if (!damageExpression && Object.keys(damageAtSlotLevel).length > 0) {
                const levels = Object.keys(damageAtSlotLevel).map(Number).sort((a, b) => a - b);
                const highestBelow = levels.filter(l => l <= slotLevel).pop();
                if (highestBelow) {
                    damageExpression = damageAtSlotLevel[highestBelow];
                }
            }
            if (!damageExpression) {
                const firstKey = Object.keys(damageAtSlotLevel)[0];
                damageExpression = damageAtSlotLevel[firstKey];
            }

            const hasDamage = !!damageExpression && damageExpression !== '0' && damageExpression !== '';
            const automationEffects = fullSpell.automation?.effects;
            const isConditionOnlyAoe = !hasDamage && automationEffects?.fail?.length > 0;

            if (isConditionOnlyAoe) {
                const conditionNames = automationEffects.fail.map(e => e.condition || e.type).filter(Boolean);
                const includeCaster = fullSpell.name && fullSpell.name.toLowerCase() === 'grease';
                return {
                    automationPopup: {
                        type: 'modal',
                        modalName: 'aoeCondition',
                        payload: {
                            action: { name: fullSpell.name, automation: fullSpell.automation },
                            playerStats,
                            campaignName,
                            shape: aoeShape,
                            range: rangeFeet,
                            saveType: fullSpell.dc?.dc_type || spell.dc.dc_type || 'CON',
                            saveDc: spellSaveDc + (innateSorceryActive ? 1 : 0),
                            effects: automationEffects.fail,
                            conditionLabel: conditionNames.join(', '),
                            activeOverlay,
                            metamagicCareful: metaCtx?.metamagicCareful || false,
                            metamagicHeighten: hasInvisible || metaCtx?.metamagicHeighten,
                            includeCaster,
                        },
                    },
                };
            }

            return {
                automationPopup: {
                    type: 'modal',
                    modalName: 'saveAttackAoe',
                    payload: {
                        action: { name: fullSpell.name, automation: {}, spell: fullSpell },
                        playerStats,
                        campaignName,
                        shape: aoeShape,
                        range: rangeFeet,
                        damage: damageExpression || '0',
                        damageType: effectiveDamageType,
                        saveType: fullSpell.dc?.dc_type || spell.dc.dc_type || 'DEX',
                        saveDc: spellSaveDc + (innateSorceryActive ? 1 : 0),
                        dcSuccess: (() => {
                            const success = fullSpell.dc?.dc_success ?? spell.dc.dc_success;
                            return success === 0 ? 'none' : (success === 0.5 ? 'half' : success);
                        })(),
                         activeOverlay,
                         metamagicCareful: metaCtx?.metamagicCareful || false,
                         metamagicHeighten: hasInvisible || metaCtx?.metamagicHeighten,
                    },
                },
            };
        }

        const target = await getTargetInfo();
        const context = {
            targetName: target?.name,
            attackerName: playerStats.name,
            ...rollContext,
            saveDc: spellSaveDc + (innateSorceryActive ? 1 : 0),
            saveType: fullSpell.dc?.dc_type || spell.dc.dc_type,
            dcSuccess: fullSpell.dc?.dc_success ?? spell.dc.dc_success,
            metamagicHeighten: hasInvisible || metaCtx?.metamagicHeighten,
            isCantrip: spell.baseLevel === 0 || spell.level === 0,
            overchannelActive,
            overchannelUseCount,
            overchannelSpellLevel: metaCtx?.slotLevel || spell.level,
            playerStats,
        };
        if (spell.status_effects && spell.status_effects.length > 0) {
            context.statusEffects = spell.status_effects;
        }
        let overchannelResult;
        if (overchannelActive) {
            overchannelResult = rollExpressionMaximized(finalFormula);
        } else {
            overchannelResult = rollExpression(finalFormula);
        }
        if (overchannelResult) {
            rollDamage(spell.name, finalFormula, overchannelResult.total, overchannelResult.rolls, overchannelResult.modifier, context);
        }

        // Vicious Mockery — trigger disadvantage effect after save+damage roll
        if (spell.name && spell.name.toLowerCase() === 'vicious mockery') {
            const mockeryTarget = await getTargetInfo();
            triggerViciousMockeryForGeneric(spell, { ...metaCtx, spellSaveDc, targetName: mockeryTarget?.name }, playerStats, campaignName, mapName).catch(e => {
                console.error('[spellCast] Vicious Mockery trigger failed:', e);
            });
        }
    } else {
        if (isMagicMissile(spell)) {
            await executeMagicMissile(spell, metaCtx, { rollDamage, playerStats, getTargetInfo, campaignName, mapName, characters });
        } else if (spell.attack_type || spell.damage) {
            const target = await getTargetInfo();
            const rollCtx = innateSorceryActive && !rollContext.forcedMode ? { ...rollContext, forcedMode: 'advantage' } : rollContext;
            const damageRollResult = rollExpression(overchannelFormula);
            const attackCtx = {
                attackName: spell.name,
                targetName: target?.name,
                attackerName: playerStats.name,
                autoDamageFormula: finalFormula,
                autoDamageName: spell.name,
                spellName: spell.name,
                autoDamageSchool: spell.school,
                overchannelActive,
                overchannelUseCount,
                overchannelSpellLevel: metaCtx?.slotLevel || spell.level,
                autoDamageRollResult: damageRollResult,
                ...rollCtx,
                isCantrip: spell.baseLevel === 0 || spell.level === 0,
                playerStats,
            };
            if (hasInvisible) {
                attackCtx.metamagicHeighten = true;
            }
            rollAttack(spell.name, spellToHit, attackCtx);
        }
    }

    triggerPostCastRiderSaves(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Post-cast rider save failed:', e);
    });

    const hexTarget = metaCtx?.targetName || (await getTargetInfo())?.name;
    applyHexEffects(spell, playerStats, campaignName, hexTarget, metaCtx?.hexAbility);

    triggerPostCastSelfHeals(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Post-cast self-heal failed:', e);
    });
    triggerPostCastAllyHeals(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Post-cast ally-heal failed:', e);
    });
    triggerSmiteOfProtection(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Smite of Protection trigger failed:', e);
    });
    triggerInspiringSmite(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Inspiring Smite trigger failed:', e);
    });
    triggerPrimalCompanionSpellShare(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Primal companion spell share failed:', e);
    });
    triggerSpellThief(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Spell Thief failed:', e);
    });
    let triggerResult = null;
    const wmsResult = await triggerWildMagicSurge(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Wild Magic Surge trigger failed:', e);
    });
    if (wmsResult) triggerResult = wmsResult;
    triggerBewitchingMagic(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Bewitching Magic trigger failed:', e);
    });

    triggerExpertDivination(spell, metaCtx, playerStats, campaignName, mapName).catch(e => {
        console.error('[spellCast] Expert Divination trigger failed:', e);
    });

    triggerArcaneWard(spell, metaCtx, playerStats, campaignName).catch(e => {
        console.error('[spellCast] Arcane Ward trigger failed:', e);
    });

    // Spell Breaker: set up Dispel Magic slot retention listener (Dispel Magic ability check result)
    if (spell.name === 'Dispel Magic' && metaCtx?.slotLevel > 0) {
        setupSpellBreakerDispelRetention(playerStats.name, metaCtx.slotLevel, campaignName, playerStats);
    }

    // Sanctuary: ends if the warded creature casts a spell
    const sanctuaryEffects = (function () {
        try {
            return (getRuntimeValue('campaign', 'targetEffects') || []).filter(
                te => te.effect === 'sanctuary' && te.source === playerStats.name
            );
        } catch {
            return [];
        }
    })();
    if (sanctuaryEffects.length > 0) {
        for (const se of sanctuaryEffects) {
            const wardedCreature = characters?.find(c => c.name === se.target);
            if (wardedCreature) {
                const { endSanctuary: endSanctuaryFn } = await import('../../automation/handlers/spells/sanctuaryHandler.js');
                endSanctuaryFn(playerStats.name, se.target, campaignName,
                    `${se.target} cast a spell, ending Sanctuary.`);
            }
        }
    }

    return triggerResult;
}

// Spell Breaker slot retention for Dispel Magic: listens for spell-result events
// dispatched when Dispel Magic ability check resolves. Refunds the slot if the
// check failed (Dispel Magic didn't stop the spell).
function setupSpellBreakerDispelRetention(playerName, spellLevel, campaignName, playerStats) {
    const passives = playerStats?.automation?.passives;
    const spellBreaker = passives?.find(p => p.type === 'spell_breaker');
    if (!spellBreaker || !spellBreaker.slotRetentionSpells?.includes('Dispel Magic')) return;

    const slotKey = `spell_slots_level_${spellLevel}`;
    const handler = (event) => {
        if (event.detail?.spellName !== 'Dispel Magic') return;
        if (event.detail?.checkFailed !== true) return;

        const currentSlots = getRuntimeValue(playerName, slotKey);
        if (currentSlots != null && currentSlots >= 0) {
            setRuntimeValue(playerName, slotKey, currentSlots + 1, campaignName);
        }

        window.removeEventListener('spell-result', handler);
    };

    window.addEventListener('spell-result', handler);
}

async function triggerArcaneWard(spell, metaCtx, playerStats, campaignName) {
    const passives = playerStats.automation?.passives;
    if (passives == null) {
        console.error('[spellCast] triggerArcaneWard: playerStats.automation.passives is missing');
        throw new Error('playerStats.automation.passives is required for Arcane Ward');
    }
    const hasArcaneWard = passives.some(p => p.type === 'arcane_ward' || (p.type === 'passive_rule' && p.effect === 'arcane_ward'));
    if (!hasArcaneWard) return;

    const school = (spell.school || '').toLowerCase();
    if (school !== 'abjuration') return;

    if (!usesSpellSlot(spell, metaCtx)) return;

    const spellSlotLevel = metaCtx?.slotLevel || spell.level;
    const action = {
        name: 'Arcane Ward',
        automation: { type: 'arcane_ward' },
    };

    try {
        await onAbjurationSpellCast(action, playerStats, spell.name, spellSlotLevel, campaignName);
    } catch (e) {
        console.error('[spellCast] Arcane Ward trigger failed:', e);
    }
}

// Dispel Magic: ability check to dispel a spell on a target.
// Spell Breaker adds Proficiency Bonus to this check.
// On failure, dispatches a spell-result event for slot retention.
async function triggerDispelMagic(metaCtx, spell, playerStats, _campaignName, _mapName) {
    const profBonus = Math.floor((playerStats.level - 1) / 4 + 2);

    // Build the ability check bonus: spellcasting ability modifier + proficiency bonus + Spell Breaker bonus
    const spellCastAbility = spell.spellCastingAbility || playerStats.spellAbilities?.spellCastingAbility;
    let abilityMod = playerStats.spellAbilities?.modifier || 0;
    if (spellCastAbility && playerStats.abilities) {
        const ability = playerStats.abilities.find(a => a.name === spellCastAbility);
        if (ability) {
            abilityMod = ability.bonus;
        }
    }

    const totalCheckBonus = abilityMod + profBonus + (metaCtx?.dispelAbilityCheckBonus || 0);

    // Show a popup prompting for the Dispel Magic ability check
    const targetName = metaCtx?.targetName || 'unknown target';
    const spellLevel = metaCtx?.slotLevel || spell.level;
    const targetDC = 10 + spellLevel;

    window.dispatchEvent(new CustomEvent('spell-result', {
        detail: {
            spellName: 'Dispel Magic',
            targetName,
            checkBonus: totalCheckBonus,
            targetDC,
            isDispelMagic: true,
        },
        bubbles: true,
    }));
}

export function refundSpellBreakerSlot(playerName, spellLevel, campaignName) {
    const slotKey = `spell_slots_level_${spellLevel}`;
    const currentSlots = getRuntimeValue(playerName, slotKey);
    if (currentSlots == null || currentSlots < 0) return;
    setRuntimeValue(playerName, slotKey, currentSlots + 1, campaignName);
}

async function applyPowerWordHealToTarget(targetName, playerStats, campaignName) {
    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) return;

    const creature = combatSummary.creatures.find(c => c.name === targetName);
    if (!creature) return;

    const isPlayer = creature.type === 'player';
    const maxHp = isPlayer
        ? (getRuntimeValue(targetName, 'hitPoints') ?? creature.maxHp ?? 0)
        : (creature.maxHp ?? 0);
    const currentHp = isPlayer
        ? (getRuntimeValue(targetName, 'currentHitPoints') ?? creature.currentHp ?? maxHp)
        : (creature.currentHp ?? maxHp);
    const healAmount = Math.max(0, maxHp - currentHp);

    if (healAmount > 0) {
        const result = applyHealingToTarget(combatSummary, targetName, healAmount, campaignName);
        const actualHeal = result?.actualHeal ?? healAmount;
        const newHp = Math.min(maxHp, currentHp + actualHeal);
        addEntry(campaignName, {
            type: 'hp_change',
            targetName,
            delta: actualHeal,
            currentHp: newHp,
            maxHp,
            isHealing: true,
            sourceName: playerStats.name,
            note: 'Power Word Heal',
            timestamp: Date.now(),
        }).catch((e) => { console.error("[spellCast] Error:", e); });
        window.dispatchEvent(new CustomEvent('healing-popup', {
            detail: {
                targetName,
                sourceName: playerStats.name,
                healingName: 'Power Word Heal',
                rollInfo: '',
                maximizeHealingDice: false,
                popupText: `Power Word Heal on ${targetName}: Regained ${actualHeal} HP`,
            },
        }));
    }

    const conditionsToRemove = ['charmed', 'frightened', 'paralyzed', 'poisoned', 'stunned'];
    const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName);
    if (storedConditions == null || !Array.isArray(storedConditions)) {
        console.error('[spellCast] applyPowerWordHealToTarget: activeConditions is not an array');
        throw new Error('activeConditions must be an array');
    }
    const conditions = storedConditions;
    const hasProne = conditions.some(c => String(c).toLowerCase() === 'prone');
    const newConditions = conditions.filter(c => !conditionsToRemove.includes(String(c).toLowerCase()));
    if (newConditions.length !== conditions.length) {
        setRuntimeValue(targetName, 'activeConditions', newConditions, campaignName);
        for (const removed of conditionsToRemove) {
            if (!newConditions.some(c => String(c).toLowerCase() === removed)) {
                addEntry(campaignName, {
                    type: 'condition',
                    action: 'removed',
                    characterName: targetName,
                    condition: removed.charAt(0).toUpperCase() + removed.slice(1),
                    reason: 'Power Word Heal',
                    timestamp: Date.now(),
                }).catch((e) => { console.error("[spellCast] Error:", e); });
            }
        }
    }

    if (hasProne) {
        const existingStance = getRuntimeValue(targetName, 'powerWordHealStandPermission', campaignName);
        if (!existingStance) {
            setRuntimeValue(targetName, 'powerWordHealStandPermission', true, campaignName);
        }
    }
}

async function applyPowerWordKillToTarget(targetName, playerStats, campaignName) {
    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) return;

    const creature = combatSummary.creatures.find(c => c.name === targetName);
    if (!creature) return;

    const isPlayer = creature.type === 'player';
    const currentHp = isPlayer
        ? (getRuntimeValue(targetName, 'currentHitPoints') ?? creature.currentHp ?? creature.maxHp)
        : (creature.currentHp ?? creature.maxHp);

    if (currentHp <= 100) {
        addEntry(campaignName, {
            type: 'hp_change',
            targetName: targetName,
            delta: -(currentHp || creature.maxHp),
            currentHp: 0,
            maxHp: creature.maxHp,
            isHealing: false,
            isUnconscious: false,
            threshold: 'dead',
            note: 'Power Word Kill',
        }).catch((e) => { console.error("[spellCast] Error:", e); });

        applyDamageToTarget(combatSummary, targetName, currentHp, ['Psychic'], campaignName, [], false, playerStats.name);

        window.dispatchEvent(new CustomEvent('damage-popup', {
            detail: {
                targetName,
                sourceName: playerStats.name,
                spellName: 'Power Word Kill',
                popupText: `${targetName} was slain by Power Word Kill`,
                damageType: 'Psychic',
            },
        }));
    } else {
        const damageFormula = '12d12';
        const damageResult = rollExpression(damageFormula);
        const totalDamage = damageResult?.total ?? 0;
        applyDamageToTarget(combatSummary, targetName, totalDamage, ['Psychic'], campaignName, [], false, playerStats.name);

        window.dispatchEvent(new CustomEvent('damage-popup', {
            detail: {
                targetName,
                sourceName: playerStats.name,
                spellName: 'Power Word Kill',
                popupText: `${targetName} took ${totalDamage} Psychic damage (too healthy to kill)`,
                damageType: 'Psychic',
                rolls: damageResult?.rolls || [],
                formula: damageFormula,
            },
        }));
    }
}

const DIVINATION_SCHOOL = 'divination';

async function triggerExpertDivination(spell, metaCtx, playerStats, campaignName, mapName) {
    if (!usesSpellSlot(spell, metaCtx)) {
        return null;
    }

    const school = (spell.school || '').toLowerCase();
    if (school !== DIVINATION_SCHOOL) {
        return null;
    }

    const spellSlotLevel = metaCtx?.slotLevel || spell.level;
    if (!spellSlotLevel || spellSlotLevel < 2) {
        return null;
    }

    // Check if player has Expert Divination feature
    const passives = playerStats.automation?.passives;
    if (passives == null) {
        console.error('[spellCast] triggerExpertDivination: playerStats.automation.passives is missing');
        throw new Error('playerStats.automation.passives is required for expert divination');
    }
    const hasExpertDivination = passives.some(p => p.name === 'Expert Divination' && p.type === 'expert_divination');
    if (!hasExpertDivination) {
        return null;
    }

    const action = {
        name: 'Expert Divination',
        automation: {
            type: 'expert_divination',
            casting_time: 'passive',
        },
        spell,
        spellSlotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[spellCast] Expert Divination trigger failed:', e);
        return null;
    }
}

async function applyRegenerateSpell(spell, target, caster, campaignName) {
    const targetName = target.name;
    const casterName = caster.name;
    if (spell.level == null) {
        console.error('[spellCast] applyRegenerateSpell: spell.level is missing')
        throw new Error('spell.level is required for regenerate spell')
    }
    const slotLevel = spell.level;
    const healAtSlotLevel = spell.heal_at_slot_level;
    if (healAtSlotLevel == null || typeof healAtSlotLevel !== 'object') {
        console.error('[spellCast] applyRegenerateSpell: heal_at_slot_level is not an object');
        throw new Error('heal_at_slot_level must be an object');
    }
    let expression = healAtSlotLevel[slotLevel];
    if (!expression) {
        const levels = Object.keys(healAtSlotLevel).map(Number).sort((a, b) => a - b);
        const highestBelow = levels.filter(l => l <= slotLevel).pop();
        if (highestBelow) {
            expression = healAtSlotLevel[highestBelow];
        }
    }

    const { totalBonus: bonusHeal, details: bonusDetails } = resolveHealingBonusesWithDetails(caster, caster.proficiency || 0, caster.level || 1, slotLevel, campaignName);
    let initialHeal = 0;
    let result = null;
    // Apply initial healing
    if (expression) {
        const maximize = hasHealingMaximizationForTarget(caster, targetName, campaignName);
        const rerollOnes = hasRerollHealingOnes(caster);
        result = maximize ? rollExpressionMaximized(expression) : rollExpression(expression);
        if (result && rerollOnes && !maximize) {
            const { displayRolls } = applyHealingRerollOnes(result.rolls, expression);
            result = { ...result, rolls: displayRolls };
        }
        if (result) {
            const combatSummary = await getCombatContext(campaignName);
            if (combatSummary) {
                const creature = combatSummary.creatures.find(c => c.name === targetName);
                if (creature?.maxHp == null && caster.hitPoints == null) {
                    console.error('[spellCast] applyRegenerateSpell: max HP is missing for both creature and caster')
                    throw new Error('max HP is required for regenerate spell')
                }
                const maxHp = creature?.maxHp || caster.hitPoints;
                const currentHp = creature?.currentHp ?? getRuntimeValue(targetName, 'currentHitPoints', campaignName) ?? maxHp;
                const healAmount = result.total + bonusHeal;
                initialHeal = Math.min(healAmount, maxHp - currentHp);
                if (initialHeal > 0) {
                    applyHealingToTarget(combatSummary, targetName, initialHeal, campaignName);
                }
                const formulaParts = [expression];
                if (bonusDetails.length > 0) {
                    const bonusParts = bonusDetails.map(d => `${d.amount} ${d.name}`).join(' + ');
                    formulaParts.push(`(${bonusParts})`);
                }
                addEntry(campaignName, {
                    type: 'hp_change',
                    targetName,
                    delta: initialHeal,
                    currentHp: Math.min(maxHp, currentHp + initialHeal),
                    maxHp,
                    isHealing: true,
                    sourceName: casterName,
                    note: spell.name,
                    formula: formulaParts.join(' + '),
                    bonusDetails: bonusDetails && bonusDetails.length > 0 ? bonusDetails : undefined,
                    timestamp: Date.now(),
                }).catch((e) => { console.error("[spellCast] Error:", e); });
            }
        }
    }

    // Set up turn-start healing: store regenerateActive on the target
    await setRuntimeValue(targetName, 'regenerateActive', true, campaignName);
    await setRuntimeValue(targetName, 'regenerateSource', casterName, campaignName);

    // Add expiration for combat: remove regenerate buff after 1 hour (3600 seconds / 6 = 600 rounds)
    addExpiration(casterName, targetName, [
        { type: 'remove_regenerate_buff' }
    ], campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: spell.name,
        description: `${casterName} cast ${spell.name} on ${targetName}. Target regains HP and regains 1 HP at start of each turn for 1 hour.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[spellCast] Error:", e); });

    return { targetName, healAmount: initialHeal, formula: expression, rolls: result?.rolls || [], rawTotal: result?.total + bonusHeal || initialHeal, bonusHeal, bonusDetails };
}

function isMagicMissile(spell) {
    return spell.name && spell.name.toLowerCase() === 'magic missile';
}

function getMagicMissileCount(slotLevel) {
    return 3 + (slotLevel - 1);
}

async function executeMagicMissile(spell, metaCtx, { rollDamage, playerStats, getTargetInfo: _getTargetInfo, campaignName, mapName: _mapName, characters }) {
    const slotLevel = metaCtx?.slotLevel || spell.level;
    const numMissiles = getMagicMissileCount(slotLevel);
    const missileDamage = '1d4 + 1';
    const damageType = spell.damage?.damage_type || 'Force';
    const distribution = metaCtx?.magicMissileDistribution;
    if (!distribution || Object.keys(distribution).length === 0) {
        return;
    }

    const combatSummary = getCombatSummary(campaignName) || { creatures: [] };
    const casterName = playerStats.name;
    const logEntries = [];

    for (const [targetName, missileCount] of Object.entries(distribution)) {
        if (missileCount <= 0) continue;

        let totalTargetDamage = 0;
        const missileRolls = [];

        for (let i = 0; i < missileCount; i++) {
            const missileResult = rollExpression(missileDamage);
            if (!missileResult) continue;

            missileRolls.push(missileResult.total);
            totalTargetDamage += missileResult.total;
        }

        if (totalTargetDamage <= 0) continue;

        const target = combatSummary.creatures?.find(c => c.name === targetName) || null;
        void target;

        const isShieldActive = getRuntimeValue(targetName, 'activeBuffs', campaignName)?.some(b => b.effect === 'shield');
        let finalDamage;
        let damageReduced;

        if (isShieldActive) {
            finalDamage = 0;
            damageReduced = true;
        } else {
            const ignoreResistance = (function () {
                const passives = playerStats.automation?.passives;
                if (passives == null) {
                    console.error('[spellCast] executeMagicMissile: playerStats.automation.passives is missing');
                    throw new Error('playerStats.automation.passives is required for ignore resistance check');
                }
                return passives.some(p => p.type === 'auto_effect' && p.effect === 'ignore_resistance');
            })();
            const applyResult = applyDamageToTarget(combatSummary, targetName, totalTargetDamage, [damageType], campaignName, characters, ignoreResistance, casterName);
            if (applyResult && applyResult.finalDamage > 0) {
                endInvisibilityOnHostileAction(casterName, campaignName);
            }
            finalDamage = applyResult?.finalDamage ?? totalTargetDamage;
            damageReduced = applyResult?.damageReduced;
        }

        const missileFormula = missileCount === 1 ? missileDamage : `${missileCount}× ${missileDamage}`;

        rollDamage(`Magic Missile (${targetName})`, missileFormula, totalTargetDamage, missileRolls, 0, {
            targetName,
            isAutoDamage: true,
            damageType,
            isAutoHit: true,
        });

        logEntries.push({
            type: 'roll',
            characterName: casterName,
            rollType: 'damage',
            name: `Magic Missile (${targetName})`,
            formula: missileFormula,
            rolls: missileRolls,
            total: totalTargetDamage,
            modifier: 0,
            damageType,
            targetName,
            finalDamage,
            damageReduced,
            shieldImmune: isShieldActive,
            timestamp: Date.now(),
        });
    }

    if (logEntries.length > 0) {
        const allMissileDamage = logEntries.reduce((sum, e) => sum + e.total, 0);
        const allFinalDamage = logEntries.reduce((sum, e) => sum + e.finalDamage, 0);
        rollExpression(`${numMissiles}× ${missileDamage}`);

        addEntry(campaignName, {
            type: 'spell',
            characterName: casterName,
            spellName: spell.name,
            spellLevel: slotLevel,
            castingTime: spell.casting_time,
            missileCount: numMissiles,
            missileDamage,
            damageType,
            targets: logEntries.map(e => ({
                name: e.targetName,
                missiles: e.rolls.length,
                rawDamage: e.total,
                finalDamage: e.finalDamage,
                shieldImmune: e.shieldImmune,
            })),
            totalRawDamage: allMissileDamage,
            totalFinalDamage: allFinalDamage,
            timestamp: Date.now(),
        });
    }
}
