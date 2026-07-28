import * as concentrationRules from './concentrationRules.js'
import { computeAuraBonus } from '../auras/auraOfProtection.js'
import { getCreatureSaveBonus } from '../conditions/conditionSaveService.js'
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js'
import storage from '../../../services/ui/storage.js'
import { getCombatSummary } from '../../encounters/combatData.js'
import { clearExpirationEffects } from '../../rules/effects/expirations.js'
import utils from '../../ui/utils.js'
import { logConditionEvent } from '../../encounters/combatLoggingService.js'

function hasDragonConstellation(creature, characters) {
    if (!creature || !creature.name) return false;
    const target = characters?.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name === creature.name;
    });
    if (!target || typeof target === 'string') return false;
    const activeBuffs = target.activeBuffs || target.computedStats?.activeBuffs || [];
    return activeBuffs.some(b => b.name === 'Starry Form' && b.constellation === 'Dragon');
}

async function rollConcentrationSave(creature, concentration, characters, campaignNpcs, campaignName, mapName, getName, disadvantage = false) {
    const saveBonus = await getCreatureSaveBonus(creature, 'con', characters, campaignNpcs, getName)
    const aura = await computeAuraBonus({ targetName: creature.name, characters, campaignName, activeMapName: mapName, allCreatures: getCombatSummary(campaignName)?.creatures })
    const auraBonus = aura.bonus
    const effectiveSaveBonus = saveBonus + auraBonus
    const dragonConstellationActive = hasDragonConstellation(creature, characters)
    const { roll: r1, success } = concentrationRules.rollConcentrationSave(effectiveSaveBonus, concentration.dc, dragonConstellationActive, disadvantage)
    const bonusDetail = auraBonus > 0 ? `(+${auraBonus} aura${aura.sourceName ? ' from ' + aura.sourceName : ''})` : undefined
    return { roll: r1, success, bonus: effectiveSaveBonus, bonusDetail }
}

function breakConcentration(combatSummary, creatureName) {
    const creature = combatSummary.creatures.find(c => c.name === creatureName)
    if (!creature || !creature.concentration) return null
    const spell = creature.concentration.spell
    creature.concentration = concentrationRules.breakConcentration(creature.concentration)
    return spell
}

function clearAllConcentrations(campaignName) {
    const cs = getRuntimeValue('campaign', 'combatSummary');
    const creatures = cs?.creatures || [];
    let changed = false;
    for (const creature of creatures) {
        if (creature.concentration) {
            creature.concentration = null;
            changed = true;
        }
    }
    if (changed && cs) {
        storage.set('combatSummary', cs, campaignName);
    }
}

function clearBaneEffects(campaignName, casterName) {
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = storedEffects.filter(te => !(te.effect === 'bane_penalty' && te.source === casterName));
    if (filtered.length !== storedEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }
}

function clearBlessEffects(campaignName, casterName) {
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = storedEffects.filter(te => !(te.effect === 'bless_bonus' && te.source === casterName));
    if (filtered.length !== storedEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }
}

function addConcentration(combatSummary, creatureName, spellName, dc, target = null) {
    const creature = combatSummary.creatures.find(c => c.name === creatureName)
    if (!creature) return
    creature.concentration = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        spell: spellName.trim(),
        dc,
        target,
    }
}

function buildConcentrationPopup(roll, bonus, bonusDetail, spellName, dc, success) {
    return {
        type: 'd20',
        rollType: 'condition-save',
        name: 'Concentration',
        rolls: [roll],
        bonus,
        bonusDetail,
        targetName: null,
        targetAc: null,
        hit: undefined,
        condition: spellName,
        dc,
        success,
    }
}

async function cleanupConcentrationEffects(casterName, spellName, campaignName) {
    const targetEffects = getRuntimeValue('campaign', 'targetEffects') || []
    const casterEffects = targetEffects.filter(te => te.source === casterName && te.duration === 'concentration')

    if (casterEffects.length === 0) return

    const remaining = targetEffects.filter(te => !(te.source === casterName && te.duration === 'concentration'))
    setRuntimeValue('campaign', 'targetEffects', remaining, campaignName, true)

    for (const effect of casterEffects) {
        if (effect.target) {
            const invisKey = `_activeInvisibility_${effect.target}`
            if (getRuntimeValue('campaign', invisKey, campaignName) === casterName) {
                const campaignData = getRuntimeValue('campaign', '', campaignName) || {}
                const rest = Object.fromEntries(Object.entries(campaignData).filter(([k]) => k !== invisKey))
                setRuntimeValue('campaign', '', rest, campaignName)
            }
        }
    }

    for (const effect of casterEffects) {
        if (effect.condition) {
            const remainingEffectsForTarget = remaining.filter(te => te.target === effect.target)
            const stillHasCondition = remainingEffectsForTarget.some(te => te.condition === effect.condition)
            if (!stillHasCondition) {
                const condList = getRuntimeValue(effect.target, 'activeConditions') || []
                const filtered = condList.filter(c => utils.getName(c) !== utils.getName(effect.condition))
                if (filtered.length !== condList.length) {
                    setRuntimeValue(effect.target, 'activeConditions', filtered, campaignName)
                    logConditionEvent(campaignName, 'removed', effect.target, effect.condition, 'Concentration lost by ' + casterName)
                }
            }
        }
    }

    const expirations = getRuntimeValue(casterName, 'pendingExpirations') || []
    if (Array.isArray(expirations) && expirations.length > 0) {
        for (const entry of expirations) {
            clearExpirationEffects(entry.effects, entry.target, casterName, campaignName)
        }
        setRuntimeValue(casterName, 'pendingExpirations', [], campaignName)
    }

    cleanupBuffsByName(casterName, spellName, campaignName)
}

function cleanupBuffsByName(casterName, buffName, campaignName) {
    const cs = getCombatSummary(campaignName)
    if (!cs || !cs.creatures) return
    for (const creature of cs.creatures) {
        const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || []
        if (!Array.isArray(buffs)) continue
        const filtered = buffs.filter(b => b.name !== buffName)
        if (filtered.length !== buffs.length) {
            setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName)
        }
    }
}

export {
    rollConcentrationSave,
    breakConcentration,
    clearAllConcentrations,
    clearBaneEffects,
    clearBlessEffects,
    addConcentration,
    buildConcentrationPopup,
    cleanupConcentrationEffects,
}
