import * as concentrationRules from './concentrationRules.js'
import { computeAuraBonus } from '../auras/auraOfProtection.js'
import { getCreatureSaveBonus } from '../conditions/conditionSaveService.js'
import { getRuntimeValue, setRuntimeValue, getAllStoreKeys } from '../../../hooks/runtime/useRuntimeState.js'
import storage from '../../../services/ui/storage.js'
import { getCombatSummary } from '../../encounters/combatData.js'
import { clearExpirationEffects } from '../../rules/effects/expirations.js'
import utils from '../../ui/utils.js'
import { logConditionEvent } from '../../encounters/combatLoggingService.js'
import { addEntry } from '../../ui/logService.js'
import { clearFleshToStonePrompt } from '../conditions/savePromptService.js'
import { removeHeroismBuff } from '../../rules/features/heroismService.js'

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

function clearAllConcentrations(campaignName, restingCreatureName) {
    const cs = getRuntimeValue('campaign', 'combatSummary');
    const creatures = cs?.creatures || [];
    let changed = false;
    for (const creature of creatures) {
        if (creature.name === restingCreatureName && creature.concentration) {
            const spellName = creature.concentration.spell;
            creature.concentration = null;
            changed = true;
            cleanupConcentrationEffects(creature.name, spellName, campaignName);
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

// Blade Ward uses the same bane_penalty effect, so clearBaneEffects handles it too
// This is kept for backwards compatibility and clarity
function clearBladeWardEffects(campaignName, casterName) {
    return clearBaneEffects(campaignName, casterName);
}

function clearBlessEffects(campaignName, casterName) {
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = storedEffects.filter(te => !(te.effect === 'bless_bonus' && te.source === casterName));
    if (filtered.length !== storedEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }
}

function clearRayOfEnfeeblementEffects(campaignName, casterName) {
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = storedEffects.filter(te => !(te.effect === 'ray_of_enfeeble_debuff' && te.source === casterName));
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

    if (casterEffects.length > 0) {
        const remaining = targetEffects.filter(te => !(te.source === casterName && te.duration === 'concentration'))
        setRuntimeValue('campaign', 'targetEffects', remaining, campaignName, true)

        for (const effect of casterEffects) {
            if (effect.target) {
                const invisKey = `_activeInvisibility_${effect.target}`;
                if (getRuntimeValue('campaign', invisKey, campaignName) === casterName) {
                    const campaignData = getRuntimeValue('campaign', '', campaignName) || {};
                    const rest = Object.fromEntries(Object.entries(campaignData).filter(([k]) => k !== invisKey));
                    setRuntimeValue('campaign', '', rest, campaignName);
                }
                const greaterInvisKey = `_activeGreaterInvisibility_${effect.target}`;
                if (getRuntimeValue('campaign', greaterInvisKey, campaignName) === casterName) {
                    const campaignData = getRuntimeValue('campaign', '', campaignName) || {};
                    const rest = Object.fromEntries(Object.entries(campaignData).filter(([k]) => k !== greaterInvisKey));
                    setRuntimeValue('campaign', '', rest, campaignName);
                }
            }
        }

        // Calm Emotions: restore suppressed conditions for immunity-mode effects
        for (const effect of casterEffects) {
            if (effect.effect === 'calm_emotions' && effect.mode === 'immunity' && Array.isArray(effect.suppressedConditions) && effect.suppressedConditions.length > 0 && effect.target) {
                const storedConditions = getRuntimeValue(effect.target, 'activeConditions') || [];
                const conditions = Array.isArray(storedConditions) ? storedConditions : [];
                const lowerConditions = conditions.map(c => String(c).toLowerCase());
                for (const suppressedCond of effect.suppressedConditions) {
                    const lowerSuppressed = String(suppressedCond).toLowerCase();
                    if (!lowerConditions.includes(lowerSuppressed)) {
                        setRuntimeValue(effect.target, 'activeConditions', [...conditions, suppressedCond], campaignName);
                    }
                }
            }
        }

        // Remove "Calm Emotions" activeBuffs from all creatures
        const cs = getCombatSummary(campaignName);
        if (cs?.creatures) {
            for (const creature of cs.creatures) {
                const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
                const filtered = buffs.filter(b => b.name !== 'Calm Emotions');
                if (filtered.length !== buffs.length) {
                    setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName);
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
            if (effect.conditions) {
                for (const cond of effect.conditions) {
                    const remainingEffectsForTarget = remaining.filter(te => te.target === effect.target)
                    const stillHasCondition = remainingEffectsForTarget.some(te => te.condition === cond)
                    if (!stillHasCondition) {
                        const condList = getRuntimeValue(effect.target, 'activeConditions') || []
                        const filtered = condList.filter(c => utils.getName(c) !== utils.getName(cond))
                        if (filtered.length !== condList.length) {
                            setRuntimeValue(effect.target, 'activeConditions', filtered, campaignName)
                            logConditionEvent(campaignName, 'removed', effect.target, cond, 'Concentration lost by ' + casterName)
                        }
                    }
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

    // Clear aura_of_life buffs and HP protection from all creatures
    const cs = getCombatSummary(campaignName);
    if (cs?.creatures) {
        for (const creature of cs.creatures) {
            const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
            const filtered = buffs.filter(b => !(b.name === 'Aura of Life' && b.sourceCharacter === casterName));
            if (filtered.length !== buffs.length) {
                setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName);
                setRuntimeValue(creature.name, 'auraOfLifeHpMaxProtected', false, campaignName);
            }
        }
    }

    // Clear aura_of_purity buffs and save advantage conditions from all creatures
    const cs2 = getCombatSummary(campaignName);
    if (cs2?.creatures) {
        for (const creature of cs2.creatures) {
            const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
            const filtered = buffs.filter(b => !(b.name === 'Aura of Purity' && b.sourceCharacter === casterName));
            if (filtered.length !== buffs.length) {
                setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName);
            }
            const savedConditions = getRuntimeValue(creature.name, 'auraOfPuritySaveAdvantageConditions', campaignName);
            if (savedConditions && savedConditions.length > 0) {
                setRuntimeValue(creature.name, 'auraOfPuritySaveAdvantageConditions', [], campaignName);
            }
        }
    }

    clearRayOfEnfeeblementEffects(campaignName, casterName)

    // Clean up Flesh to Stone recurring save tracking when concentration breaks
    cleanupFleshToStoneEffects(casterName, campaignName)

    // Clean up Heroism buff and effects when concentration breaks
    removeHeroismBuff(casterName, campaignName)

    // Clean up Holy Aura buffs and targets when concentration breaks
    cleanupHolyAuraEffects(casterName, campaignName)

    // Clean up Resilient Sphere targetEffects for this caster
    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filteredSphereEffects = allTargetEffects.filter(te => !(te.effect === 'resilient_sphere' && te.source === casterName));
    if (filteredSphereEffects.length !== allTargetEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filteredSphereEffects, campaignName, true);
    }

    // Clean up Faerie Fire targetEffects and activeBuffs for this caster
    const allFaerieEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filteredFaerieEffects = allFaerieEffects.filter(te => !(te.effect === 'faerie_fire' && te.source === casterName));
    if (filteredFaerieEffects.length !== allFaerieEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filteredFaerieEffects, campaignName, true);
    }
    // Also clean up activeBuffs on targets that had faerie_fire from this caster
    if (cs?.creatures) {
        for (const creature of cs.creatures) {
            const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
            const filteredBuffs = buffs.filter(b => !(b.name === 'Faerie Fire' && b.source === casterName));
            if (filteredBuffs.length !== buffs.length) {
                setRuntimeValue(creature.name, 'activeBuffs', filteredBuffs, campaignName);
            }
        }
    }
}

function cleanupHolyAuraEffects(casterName, campaignName) {
    const cs = getCombatSummary(campaignName);
    if (cs?.creatures) {
        for (const creature of cs.creatures) {
            const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
            const filtered = buffs.filter(b => !(b.name === 'Holy Aura' && b.sourceCharacter === casterName));
            if (filtered.length !== buffs.length) {
                setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName);
            }
        }
    }
    // Clean up targetEffects for Holy Aura badges
    const storedEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const filteredEffects = storedEffects.filter(te => !(te.effect === 'holy_aura' && te.source === casterName));
    if (filteredEffects.length !== storedEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filteredEffects, campaignName);
    }
    setRuntimeValue(casterName, 'holyAuraTargets', [], campaignName);
    setRuntimeValue(casterName, 'holyAuraSaveDc', null, campaignName);
}

function cleanupFleshToStoneEffects(casterName, campaignName) {
    const allKeys = getAllStoreKeys();
    for (const key of allKeys) {
        if (typeof key !== 'string') continue;
        const value = getRuntimeValue('campaign', key, campaignName);
        if (!value || !key.startsWith('_fleshToStone_')) continue;
        if (value.casterName !== casterName) continue;
        const targetName = key.replace('_fleshToStone_', '').replace(/_/g, ' ');
        const conditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
        const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
        if (filtered.length !== conditions.length) {
            setRuntimeValue(targetName, 'activeConditions', filtered, campaignName);
        }
        const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const cleanedEffects = allTargetEffects.filter(te => !(te.target === targetName && te.effect === 'flesh_to_stone' && te.source === casterName));
        setRuntimeValue('campaign', 'targetEffects', cleanedEffects, campaignName);
        setRuntimeValue('campaign', key, null, campaignName);
        clearFleshToStonePrompt(campaignName, targetName);
    }
    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: 'Flesh to Stone',
        description: 'Concentration broken; Flesh to Stone ends.',
    }).catch(() => {});
}

function cleanupBuffsByName(casterName, buffName, campaignName) {
    const cs = getCombatSummary(campaignName)
    if (!cs || !cs.creatures) {
        return
    }
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
    clearBladeWardEffects,
    clearBlessEffects,
    clearRayOfEnfeeblementEffects,
    addConcentration,
    buildConcentrationPopup,
    cleanupConcentrationEffects,
}
