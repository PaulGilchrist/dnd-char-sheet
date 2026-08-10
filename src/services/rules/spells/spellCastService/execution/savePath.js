import { rollExpression, rollExpressionMaximized } from '../../../../dice/diceRoller.js';
import { triggerSoulstitchSpells } from '../../postCastRiderService.js';
import { rangeToFeet } from '../../../combat/rangeValidation.js';
import { getCombatContext } from '../../../combat/damageUtils.js';
import { triggerViciousMockeryForGeneric } from '../../../features/viciousMockeryService.js';

async function handleSavePath(spell, fullSpell, metaCtx, playerStats, campaignName, mapName, characters,
    getTargetInfo, getRuntimeValue, innateSorceryActive, effectiveDamageType, spellSaveDc,
    overchannelFormula, overchannelActive, overchannelUseCount, rollAttack, rollDamage, formula, hasInvisible) {

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
        return await handleAoE(spell, fullSpell, metaCtx, playerStats, campaignName, mapName, getTargetInfo, getRuntimeValue,
            innateSorceryActive, effectiveDamageType, spellSaveDc, aoeShape, rangeToFeet, hasInvisible);
    }

    return await handleSingleTargetSave(spell, fullSpell, metaCtx, playerStats, campaignName, mapName, characters,
        getTargetInfo, getRuntimeValue, innateSorceryActive, effectiveDamageType, spellSaveDc,
        overchannelFormula, overchannelActive, overchannelUseCount, rollDamage, formula, hasInvisible);
}

async function handleAoE(spell, fullSpell, metaCtx, playerStats, campaignName, mapName, getTargetInfo, getRuntimeValue,
    innateSorceryActive, effectiveDamageType, spellSaveDc, aoeShape, rangeToFeet, hasInvisible) {

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

async function handleSingleTargetSave(spell, fullSpell, metaCtx, playerStats, campaignName, mapName, characters,
    getTargetInfo, getRuntimeValue, innateSorceryActive, effectiveDamageType, spellSaveDc,
    overchannelFormula, overchannelActive, overchannelUseCount, rollDamage, formula, hasInvisible) {

    const target = await getTargetInfo();
    const context = {
        targetName: target?.name,
        attackerName: playerStats.name,
        ...metaCtx,
        damageType: effectiveDamageType,
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
    const damageFormula = overchannelFormula || formula;
    if (overchannelActive) {
        overchannelResult = rollExpressionMaximized(damageFormula);
    } else {
        overchannelResult = rollExpression(damageFormula);
    }
    if (overchannelResult) {
        rollDamage(spell.name, overchannelFormula || formula, overchannelResult.total, overchannelResult.rolls, overchannelResult.modifier, context);
    }

    // Vicious Mockery — trigger disadvantage effect after save+damage roll
    if (spell.name && spell.name.toLowerCase() === 'vicious mockery') {
        const mockeryTarget = await getTargetInfo();
        triggerViciousMockeryForGeneric(spell, { ...metaCtx, spellSaveDc, targetName: mockeryTarget?.name }, playerStats, campaignName, mapName).catch(e => {
            console.error('[spellCast] Vicious Mockery trigger failed:', e);
        });
    }
}

export { handleSavePath };
