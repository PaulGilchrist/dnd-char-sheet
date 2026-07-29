import { computeConditionEffects } from '../../services/combat/conditions/conditionEffects.js'
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { EFFECT_DESCRIPTIONS } from '../../services/combat/conditions/effectDescriptions.js'
import { rollD20 } from '../../services/dice/diceRoller.js'
import { getAbilitySaveBonus } from '../../services/combat/conditions/conditionUtils.js'
import { addEntry } from '../../services/ui/logService.js'
import { hasSaveAdvantage } from '../../services/combat/conditions/conditionEffects.js'
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'
import CreatureBadge from '../common/CreatureBadge.jsx'

const REPEAT_SAVE_INFO = {
  slow_repeat_save: { label: 'Slow', icon: 'fa-clock', saveType: 'WIS' },
  stinking_cloud_repeat_save: { label: 'Stinking Cloud', icon: 'fa-cloud', saveType: 'CON' },
  web_repeat_save: { label: 'Web', icon: 'fa-spider-web', saveType: 'DEX' },
  flesh_to_stone_repeat_save: { label: 'Flesh to Stone', icon: 'fa-skull', saveType: 'CON' },
  hold_monster_repeat_save: { label: 'Hold Monster', icon: 'fa-hand', saveType: 'WIS' },
  ottos_dance_repeat_save: { label: "Otto's Dance", icon: 'fa-music', saveType: 'WIS' },
  power_word_stun_repeat_save: { label: 'Power Word Stun', icon: 'fa-star', saveType: 'CON' },
  tashas_laughter_repeat_save: { label: "Tasha's Laughter", icon: 'fa-face-laugh-squint', saveType: 'WIS' },
}

function getEffectDescription(label) {
    if (EFFECT_DESCRIPTIONS[label]) return EFFECT_DESCRIPTIONS[label]
    if (label.startsWith('Speed -')) return 'Speed is reduced by the amount shown.'
    if (label.startsWith('+') && label.includes('to hit')) return 'Attackers gain the shown bonus to hit this creature.'
    return label
}

function removeConditionByKey(creatureName, conditionKey, campaignName) {
    const conditions = getRuntimeValue(creatureName, 'activeConditions') || []
    const filtered = conditions.filter(c => String(c).toLowerCase() !== conditionKey.toLowerCase())
    setRuntimeValue(creatureName, 'activeConditions', filtered, campaignName)
}

function removeTargetEffect(targetName, effectType, campaignName) {
    const existingEffects = getRuntimeValue('campaign', 'targetEffects') || []
    const filtered = existingEffects.filter(te => !(te.target === targetName && te.effect === effectType))
    setRuntimeValue('campaign', 'targetEffects', filtered, campaignName)
}

function removeRepeatSaveEffect(targetName, effectKey, campaignName) {
    const repeatSaveTypes = Object.keys(REPEAT_SAVE_INFO)
    const existingEffects = getRuntimeValue('campaign', 'targetEffects') || []
    const filtered = existingEffects.filter(te => !(te.target === targetName && repeatSaveTypes.includes(te.effect)))
    setRuntimeValue('campaign', 'targetEffects', filtered, campaignName)
}

async function handleRepeatSaveSave(badge, creatureName, campaignName, playerStats, characters, activeMapName, allCreatures, onRepeatSave) {
    const effectKey = badge.effectType
    const info = REPEAT_SAVE_INFO[effectKey]
    if (!info) return

    const effect = getRuntimeValue('campaign', 'targetEffects')?.find(
        te => te.target === creatureName && te.effect === effectKey
    )
    const dc = effect?.dc || 15
    const saveType = info.saveType || (effect?.saveType || 'CON').toLowerCase()
    const saveLabel = saveType.charAt(0).toUpperCase() + saveType.slice(1)
    const saveBonus = getAbilitySaveBonus(playerStats, saveType)
    const hasAdv = hasSaveAdvantage({}, effectKey)

    let roll1, roll2, finalRoll
    if (hasAdv) {
        roll1 = rollD20()
        roll2 = rollD20()
        finalRoll = Math.max(roll1, roll2)
    } else {
        roll1 = rollD20()
        roll2 = 0
        finalRoll = roll1
    }

    const combatSummary = getCombatSummary(campaignName)
    const aura = await computeAuraBonus({ targetName: creatureName, characters, campaignName, activeMapName, allCreatures: combatSummary?.creatures })
    const auraBonus = aura.bonus
    const total = finalRoll + saveBonus + auraBonus
    const success = total >= dc

    const bonusDetail = auraBonus > 0 ? `(+${auraBonus} aura${aura.sourceName ? ' from ' + aura.sourceName : ''})` : undefined

    addEntry(campaignName, {
        type: 'roll',
        characterName: creatureName,
        rollType: 'save',
        name: `${info.label} Repeat Save`,
        rolls: hasAdv ? [roll1, roll2] : [roll1],
        total,
        bonus: saveBonus + auraBonus,
        bonusDetail,
        dc,
        success,
        condition: info.label,
    }).catch((e) => { console.error("[ConditionEffectBadges] Error:", e); })

    if (onRepeatSave) {
        onRepeatSave({
            type: 'd20',
            rollType: 'condition-save',
            name: `${saveLabel} (DC ${dc})`,
            rolls: hasAdv ? [roll1, roll2] : [roll1],
            bonus: saveBonus + auraBonus,
            bonusDetail,
            total,
            dc,
            success,
            forcedMode: hasAdv ? 'advantage' : undefined,
            repeatSaveKey: effectKey,
            creatureName,
            campaignName,
        })
    }

    if (success) {
        removeRepeatSaveEffect(creatureName, effectKey, campaignName)
        const conditions = getRuntimeValue(creatureName, 'activeConditions') || []
        const conditionToRemove = effect?.condition || info.label.toLowerCase().replace(/['s]\s*|_/g, ' ').trim().replace(/\s+/g, ' ')
        const filtered = conditions.filter(c => String(c).toLowerCase() !== conditionToRemove)
        if (filtered.length !== conditions.length) {
            setRuntimeValue(creatureName, 'activeConditions', filtered, campaignName)
        }
        addEntry(campaignName, {
            type: 'save_result',
            characterName: creatureName,
            rollType: `save-${effectKey}`,
            targetName: creatureName,
            saveDc: dc,
            saveType: info.saveType,
            success: true,
            description: `${creatureName} succeeded on ${info.label} repeat save. Effect ends.`,
        }).catch((e) => { console.error("[ConditionEffectBadges] Error:", e); })
    }
}

const EFFECT_TO_SEMANTIC = {
    'effect-stealth-attack': 'effect-neutral',
    'effect-speed-zero': 'effect-debuff',
    'effect-target-disadv': 'effect-buff',
    'effect-cannot-act': 'effect-debuff',
}

function resolveCls(cls) {
    return EFFECT_TO_SEMANTIC[cls] || cls
}

function ConditionEffectBadges({ conditions, targetEffects = [], creatureName, campaignName, allCreatures, hasTacticalShift, hasSpeedyOpportunityDisadvantage, hasSpeedyDifficultTerrainIgnore, isLocalhost, coronaDisadvantage, playerStats, characters, activeMapName, onRepeatSave }) {
    const condKeys = (conditions || []).map(c => c.key)
    const effects = computeConditionEffects(condKeys, [], targetEffects, false, false, false, false, null, false, false, false, false, false, false, false, false, false, false, false, false)
    const activeBuffs = creatureName && campaignName ? (getRuntimeValue(creatureName, 'activeBuffs', campaignName) || []) : []
    const resolvedPlayerStats = playerStats || (characters?.length ? characters.find(c => c.name === creatureName) : null)
    if (Array.isArray(activeBuffs)) {
        for (const buff of activeBuffs) {
            if (buff.effect === 'advantage_attacks_and_saves') {
                effects.attackAdvantageCount = (effects.attackAdvantageCount || 0) + 1
                effects.attackAdvantageReasons.push(buff.name)
                effects.saveAdvantageCount = (effects.saveAdvantageCount || 0) + 1
                effects.saveAdvantageReasons.push(buff.name)
            }
            if (buff.effect === 'vow_of_enmity') {
                effects.attackAdvantageCount = (effects.attackAdvantageCount || 0) + 1
                effects.attackAdvantageReasons.push(buff.name)
            }
            if (buff.effect === 'dodge') {
                effects.targetDisadvantageCount = (effects.targetDisadvantageCount || 0) + 1
                effects.dexSaveAdvantageCount = (effects.dexSaveAdvantageCount || 0) + 1
            }
            if (buff.effect === 'clairvoyant_combatant') {
                effects.attackAdvantageCount = (effects.attackAdvantageCount || 0) + 1
                effects.attackAdvantageReasons.push('Clairvoyant Combatant')
            }
            if (buff.effect === 'haste') {
                effects.hasteActive = true
            }
        }
    }
    const badges = []
    // Check if any creature has Vow of Enmity against this creature
    if (allCreatures?.length && campaignName) {
        const hasVow = allCreatures.some(c => {
            const vowTarget = getRuntimeValue(c.name, 'vowOfEnmityTarget', campaignName);
            return vowTarget === creatureName;
        });
        if (hasVow) {
            effects.attackAdvantageCount = (effects.attackAdvantageCount || 0) + 1
            effects.attackAdvantageReasons.push('Vow of Enmity')
        }
    }
    const stealthAttackCost = creatureName && campaignName ? (getRuntimeValue(creatureName, 'stealthAttackCost', campaignName) ?? 0) : 0
    if (stealthAttackCost > 0) {
        badges.push({ label: 'Stealth Attack', cls: 'effect-neutral', icon: 'fa-eye-slash', removable: true, removeAction: 'stealth_attack' })
    }
    if (effects.speedReduction) {
        const label = effects.speedReduction >= 1000 ? 'Speed 0' : `Speed -${effects.speedReduction}`
        badges.push({ label, cls: 'effect-debuff', icon: 'fa-minus', removable: true, removeAction: 'target_effect', effectType: 'speed_reduction' })
    }
    if (effects.noAdvantageAgainst) {
        const noAdvConditionKeys = ['blinded', 'charmed', 'invisible', 'paralyzed', 'petrified', 'restrained', 'stunned', 'unconscious']
        const noAdvCondition = conditions.find(c => noAdvConditionKeys.includes(c.key))
        badges.push({ label: 'No Adv vs', cls: 'effect-buff', icon: 'fa-arrow-down', removable: true, removeAction: 'condition', removeKey: noAdvCondition?.key || 'blinded' })
    }
    if (effects.targetDisadvantageCount > 0 && !effects.noAdvantageAgainst) {
        const disAdvConditionKeys = ['blinded', 'charmed', 'invisible', 'paralyzed', 'petrified', 'restrained', 'stunned', 'unconscious']
        const disAdvCondition = conditions.find(c => disAdvConditionKeys.includes(c.key))
        badges.push({ label: 'Disadv vs', cls: 'effect-buff', icon: 'fa-arrow-down', removable: true, removeAction: 'condition', removeKey: disAdvCondition?.key || 'blinded' })
    }
    if (effects.targetAttackDisadvantageCount > 0) {
        badges.push({ label: 'Attack Disadv', cls: 'effect-buff', icon: 'fa-arrow-down', removable: true, removeAction: 'target_effect', effectType: 'slasher_enhanced_critical' })
    }
    if (effects.attackAdvantageCount > 0 || effects.targetAdvantageCount > 0) {
        const reasons = [(effects.attackAdvantageReasons || []), (effects.targetAdvantageReasons || [])].flat()
        const reasonText = reasons.length > 0 ? reasons.join(', ') : 'Advantage on attack rolls'
        const advSource = reasons.find(r => r === 'Vow of Enmity') || effects.attackAdvantageReasons?.find(r => r === 'Vow of Enmity') || activeBuffs.find(b => b.effect === 'vow_of_enmity') || activeBuffs.find(b => b.effect === 'advantage_attacks_and_saves')
        badges.push({ label: 'Adv', cls: 'effect-buff', icon: 'fa-arrow-up', removable: true, removeAction: advSource ? (advSource.effect === 'vow_of_enmity' ? 'vow_of_enmity' : 'remove_buff') : 'target_effect', tooltip: `Advantage on attack rolls${reasonText !== 'Advantage on attack rolls' ? ' (' + reasonText + ')' : ''}` })
    }
    if (effects.saveAdvantageCount > 0) {
        const reasons = (effects.saveAdvantageReasons || []).length > 0 ? effects.saveAdvantageReasons.join(', ') : 'Advantage on saving throws'
        const saveAdvSource = effects.saveAdvantageReasons?.find(r => r === 'Vow of Enmity') || activeBuffs.find(b => b.effect === 'advantage_attacks_and_saves')
        badges.push({ label: 'Adv Save', cls: 'effect-buff', icon: 'fa-shield-halved', removable: true, removeAction: saveAdvSource ? (saveAdvSource.effect === 'advantage_attacks_and_saves' ? 'remove_buff' : 'vow_of_enmity') : 'target_effect', tooltip: `Advantage on saving throws${reasons !== 'Advantage on saving throws' ? ' (' + reasons + ')' : ''}` })
    }
    if (effects.dexSaveAdvantageCount > 0) {
        const dodgeBuff = activeBuffs.find(b => b.effect === 'dodge')
        badges.push({ label: 'Adv DEX Save', cls: 'effect-buff', icon: 'fa-shield-halved', removable: true, removeAction: dodgeBuff ? 'remove_buff' : 'target_effect', tooltip: 'Advantage on Dexterity saving throws' })
    }
    if (effects.riderSaveDisadvantage) badges.push({ label: 'Save Disadv', cls: 'effect-debuff', icon: 'fa-shield', removable: true, removeAction: 'target_effect', effectType: 'disadvantage_on_next_save' })
    if (effects.saveDisadvantageCount > 0) {
      const reasons = (effects.saveDisadvantage || []).length > 0 ? ` (${effects.saveDisadvantage.join(', ')})` : ''
      badges.push({ label: `Save Disadv${reasons}`, cls: 'effect-debuff', icon: 'fa-shield', removable: true, removeAction: 'target_effect', effectType: 'hex_save_disadvantage' })
    }
    if (effects.abilityCheckDisadvantageAbilities?.length > 0) {
      const abilityNames = effects.abilityCheckDisadvantageAbilities.map(a => a.substring(0, 3).toLowerCase()).join(', ')
      badges.push({ label: `Check Disadv (${abilityNames})`, cls: 'effect-debuff', icon: 'fa-shield', removable: true, removeAction: 'target_effect', effectType: 'hex_ability_check_disadvantage' })
    }
    if (effects.riderAttackBonus > 0) badges.push({ label: `+${effects.riderAttackBonus} to hit`, cls: 'effect-debuff', icon: 'fa-bullseye', removable: true, removeAction: 'target_effect', effectType: 'next_attack_bonus' })
    if (effects.riderCannotOpportunityAttack) badges.push({ label: 'No OA', cls: 'effect-debuff', icon: 'fa-ban', removable: true, removeAction: 'target_effect', effectType: 'no_opportunity_attacks' })
    const noOA = getRuntimeValue(creatureName, 'inspiringMovementNoOA', campaignName) || hasTacticalShift
    if (creatureName && campaignName && noOA) {
        badges.push({ label: 'Insp. Move', cls: 'effect-buff', icon: 'fa-person-walking', removable: true, removeAction: 'inspiring_move' })
    }
    const remarkableNoOA = getRuntimeValue(creatureName, 'remarkableAthleteNoOA', campaignName)
    if (creatureName && campaignName && remarkableNoOA) {
        badges.push({ label: 'No OA (Crit)', cls: 'effect-buff', icon: 'fa-ban', removable: true, removeAction: 'remarkable_no_oa' })
    }
    if (hasSpeedyOpportunityDisadvantage) {
        badges.push({ label: 'OA Disadv', cls: 'effect-buff', icon: 'fa-arrow-down', removable: true, removeAction: 'oa_disadv' })
    }
    if (hasSpeedyDifficultTerrainIgnore) {
        badges.push({ label: 'No Difficult Terrain on Dash', cls: 'effect-buff', icon: 'fa-person-walking', removable: true, removeAction: 'difficult_terrain_ignore' })
    }
    if (coronaDisadvantage) {
        badges.push({ label: 'Disadv Fire/Radiant', cls: 'effect-debuff', icon: 'fa-sun', removable: true, removeAction: 'corona_disadvantage' })
    }
    const tauntingStepEffect = targetEffects?.find(te => te.effect === 'taunting_step' && te.target === creatureName)
    if (tauntingStepEffect) {
        badges.push({ label: 'Taunted', cls: 'effect-debuff', icon: 'fa-wand-sparkles', removable: true, removeAction: 'taunting_step', effectType: 'taunting_step', tooltip: `Disadvantage on attack rolls vs creatures other than ${tauntingStepEffect.source || 'you'}` })
    }
    if (effects.banePenalty) {
        const baneEffect = targetEffects?.find(te => te.effect === 'bane_penalty' && te.target === creatureName)
        const casterName = baneEffect?.source || 'unknown'
        const displayLabel = baneEffect?.displayLabel || 'Bane'
        const isSelf = casterName === creatureName
        badges.push({ label: displayLabel, cls: isSelf ? 'effect-buff' : 'effect-debuff', icon: 'fa-shield-halved', removable: true, removeAction: 'target_effect', effectType: 'bane_penalty', tooltip: `${displayLabel} from ${casterName}: -1d4 on attack rolls and saving throws` })
    }
    if (effects.blessBonus) {
        const blessEffect = targetEffects?.find(te => te.effect === 'bless_bonus' && te.target === creatureName)
        const casterName = blessEffect?.source || 'unknown'
        badges.push({ label: 'Bless', cls: 'effect-buff', icon: 'fa-hands', removable: true, removeAction: 'target_effect', effectType: 'bless_bonus', tooltip: `Bless from ${casterName}: +1d4 on attack rolls and saving throws` })
    }
    if (effects.hasteActive) {
        const hasteBuff = activeBuffs.find(b => b.effect === 'haste')
        badges.push({ label: 'Hasted', cls: 'effect-buff', icon: 'fa-bolt', removable: true, removeAction: hasteBuff ? 'remove_buff' : 'target_effect', tooltip: 'Haste: Speed doubled, +2 AC, Advantage on DEX saves, Extra action (Attack, Dash, Disengage, Hide, Use Object)' })
    }
    const silenceEffect = targetEffects?.find(te => te.effect === 'silenced' && te.target === creatureName)
    if (silenceEffect) {
        const casterName = silenceEffect.source || 'unknown'
        badges.push({ label: 'Silenced', cls: 'effect-debuff', icon: 'fa-volume-xmark', removable: true, removeAction: 'target_effect', effectType: 'silenced', tooltip: `Silenced by ${casterName} — Deafened, cannot cast spells with Verbal components` })
    }

    const repeatSaveTypes = Object.keys(REPEAT_SAVE_INFO)
    targetEffects?.forEach(te => {
        if (repeatSaveTypes.includes(te.effect) && te.target === creatureName) {
            const info = REPEAT_SAVE_INFO[te.effect]
            const dc = te.dc || '?'
            const canRoll = creatureName && campaignName && (isLocalhost || (resolvedPlayerStats && creatureName === resolvedPlayerStats.name))
            badges.push({
                label: `${info.label} DC ${dc}`,
                cls: 'effect-condition',
                icon: info.icon,
                removable: isLocalhost,
                removeAction: 'remove_repeat_save',
                effectType: te.effect,
                tooltip: `${info.label} — Repeat ${info.saveType} save (DC ${dc}) at end of turn`,
                onClick: canRoll ? () => handleRepeatSaveSave({ effectType: te.effect }, creatureName, campaignName, resolvedPlayerStats, characters, activeMapName, allCreatures, onRepeatSave) : null,
                disabled: !canRoll,
            })
        }
    })

    const handleRemoveEffect = (badge) => {
        switch (badge.removeAction) {
            case 'condition':
                removeConditionByKey(creatureName, badge.removeKey, campaignName)
                break
            case 'target_effect':
                removeTargetEffect(creatureName, badge.effectType, campaignName)
                break
            case 'inspiring_move':
                setRuntimeValue(creatureName, 'inspiringMovementNoOA', false, campaignName)
                break
            case 'remarkable_no_oa':
                setRuntimeValue(creatureName, 'remarkableAthleteNoOA', false, campaignName)
                break
            case 'oa_disadv':
                setRuntimeValue(creatureName, 'hasSpeedyOpportunityDisadvantage', false, campaignName)
                break
            case 'difficult_terrain_ignore':
                setRuntimeValue(creatureName, 'hasSpeedyDifficultTerrainIgnore', false, campaignName)
                break
            case 'corona_disadvantage':
                setRuntimeValue(creatureName, 'coronaDisadvantage', false, campaignName)
                break
            case 'taunting_step':
                removeTargetEffect(creatureName, badge.effectType, campaignName)
                break
            case 'remove_repeat_save':
                removeRepeatSaveEffect(creatureName, badge.effectType, campaignName)
                break
            case 'stealth_attack':
                setRuntimeValue(creatureName, 'stealthAttackCost', 0, campaignName)
                break
            case 'vow_of_enmity': {
                const vowCreature = allCreatures?.find(c => getRuntimeValue(c.name, 'vowOfEnmityTarget', campaignName) === creatureName)
                if (vowCreature) {
                    setRuntimeValue(vowCreature.name, 'vowOfEnmityTarget', null, campaignName)
                }
                break
            }
            case 'remove_buff': {
                const buffs = getRuntimeValue(creatureName, 'activeBuffs', campaignName) || []
                const filtered = buffs.filter(b => b.effect !== 'advantage_attacks_and_saves' && b.effect !== 'vow_of_enmity' && b.effect !== 'dodge' && b.effect !== 'haste')
                setRuntimeValue(creatureName, 'activeBuffs', filtered, campaignName)
                break
            }
        }
    }

    return (
        <>
            {badges.map((b, i) => (
                <CreatureBadge
                    key={`${b.label}-${i}`}
                    icon={b.icon}
                    label={b.label}
                    cls={resolveCls(b.cls)}
                    tooltip={b.tooltip || getEffectDescription(b.label)}
                    removable={isLocalhost && b.removable}
                    onRemove={() => handleRemoveEffect(b)}
                    onClick={b.onClick}
                    disabled={b.disabled}
                />
            ))}
        </>
    )
}

export default ConditionEffectBadges
