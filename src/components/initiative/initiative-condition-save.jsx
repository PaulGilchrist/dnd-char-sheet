import { cloneDeep } from 'lodash'
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import storage from '../../services/ui/storage.js'
import { rollConditionSave, removeCondition, buildConditionPopup } from '../../services/combat/conditions/conditionSaveService.js'
import { removeForcecageEffect } from '../../services/automation/handlers/spells/forcecageHandler.js'
import { removeMazeEffect } from '../../services/automation/handlers/spells/mazeHandler.js'
import { getAbilityLabel } from '../../services/combat/conditions/conditionUtils.js'
import { logConditionSave } from '../../services/encounters/combatLoggingService.js'
import * as logService from '../../services/ui/logService.js'

/**
 * Creates the handleRollConditionSave handler.
 */
export function createRollConditionSaveHandler({
    combatSummary,
    campaignName,
    characters,
    campaignNpcs,
    mapName,
    setConditionPopup,
    setCombatSummary,
}) {
    return async function handleRollConditionSave(creatureName, condition) {
        if (!combatSummary) return
        const creature = combatSummary.creatures.find(c => c.name === creatureName)
        if (!creature) return

        const { roll: r1, success, bonus, bonusDetail, rolls, starryDragonFloor } = await rollConditionSave(
            creature, condition, characters, campaignNpcs, campaignName, mapName, (name) => name
        )

        if (success) {
            removeCondition(combatSummary, creatureName, condition, getRuntimeValue, setRuntimeValue, campaignName)

            // Otto's Irresistible Dance
            if (String(condition.key).toLowerCase() === 'charmed') {
                const danceEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'ottos_irresistible_dance' && te.target === creatureName
                )
                if (danceEffect) {
                    removeCondition(combatSummary, creatureName, { key: 'speed_zero' }, getRuntimeValue, setRuntimeValue, campaignName)
                    const remainingEffects = (getRuntimeValue('campaign', 'targetEffects') || []).filter(
                        te => !(te.target === creatureName && te.effect === 'ottos_irresistible_dance')
                    )
                    setRuntimeValue('campaign', 'targetEffects', remainingEffects, campaignName)
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: danceEffect.source,
                        rollType: 'save-ottos-dance',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'WIS',
                        success: true,
                        description: `${creatureName} succeeded on WIS save against Otto's Irresistible Dance. The spell ends; Charmed and Speed 0 removed.`,
                    }).catch(() => {})
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Charmed, Speed 0',
                        reason: "Otto's Irresistible Dance (successful reroll)",
                        note: `${creatureName} succeeded on the WIS reroll; Otto's Irresistible Dance ends.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }

            // Tasha's Hideous Laughter
            if (String(condition.key).toLowerCase() === 'prone' || String(condition.key).toLowerCase() === 'incapacitated') {
                const laughterEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'tashas_hideous_laughter' && te.target === creatureName
                )
                if (laughterEffect) {
                    removeCondition(combatSummary, creatureName, { key: 'prone' }, getRuntimeValue, setRuntimeValue, campaignName)
                    removeCondition(combatSummary, creatureName, { key: 'incapacitated' }, getRuntimeValue, setRuntimeValue, campaignName)
                    const remainingEffects = (getRuntimeValue('campaign', 'targetEffects') || []).filter(
                        te => !(te.target === creatureName && te.effect === 'tashas_hideous_laughter')
                    )
                    setRuntimeValue('campaign', 'targetEffects', remainingEffects, campaignName)
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: laughterEffect.source,
                        rollType: 'save-tashas-laughter',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'WIS',
                        success: true,
                        description: `${creatureName} succeeded on WIS save against Tasha's Hideous Laughter. The spell ends; Prone and Incapacitated removed.`,
                    }).catch(() => {})
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Prone, Incapacitated',
                        reason: "Tasha's Hideous Laughter (successful reroll)",
                        note: `${creatureName} succeeded on the WIS reroll; Tasha's Hideous Laughter ends.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }

            // Confusion
            if (String(condition.key).toLowerCase() === 'confused') {
                const confusionEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'confusion' && te.target === creatureName
                )
                if (confusionEffect) {
                    removeCondition(combatSummary, creatureName, { key: 'charmed' }, getRuntimeValue, setRuntimeValue, campaignName)
                    removeCondition(combatSummary, creatureName, { key: 'speed_zero' }, getRuntimeValue, setRuntimeValue, campaignName)
                    const remainingEffects = (getRuntimeValue('campaign', 'targetEffects') || []).filter(
                        te => !(te.target === creatureName && te.effect === 'confusion')
                    )
                    setRuntimeValue('campaign', 'targetEffects', remainingEffects, campaignName)
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: confusionEffect.source,
                        rollType: 'save-confusion',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'WIS',
                        success: true,
                        description: `${creatureName} succeeded on WIS save against Confusion. The spell ends; Charmed and Speed 0 removed.`,
                    }).catch(() => {})
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Charmed, Speed 0',
                        reason: 'Confusion (successful reroll)',
                        note: `${creatureName} succeeded on the WIS reroll; Confusion ends.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }

            // Forcecage
            if (String(condition.key).toLowerCase() === 'forcecaged') {
                const forcecageEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'forcecage' && te.target === creatureName
                )
                if (forcecageEffect) {
                    removeForcecageEffect(creatureName, forcecageEffect.source, campaignName)
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: forcecageEffect.source,
                        rollType: 'save-forcecage',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'CHA',
                        success: true,
                        description: `${creatureName} succeeded on CHA save against Forcecage and escaped the prison using teleportation or interplanar travel.`,
                    }).catch(() => {})
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Forcecaged',
                        reason: 'Forcecage escape (successful CHA save)',
                        note: `${creatureName} succeeded on the CHA reroll; the Forcecage no longer traps them.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }

            // Maze
            if (String(condition.key).toLowerCase() === 'incapacitated') {
                const mazeEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'maze' && te.target === creatureName
                )
                if (mazeEffect) {
                    removeMazeEffect(creatureName, mazeEffect.source, campaignName)
                    setRuntimeValue(creatureName, 'mazeData', null, campaignName)
                    const storedConditions = getRuntimeValue(creatureName, 'activeConditions') || []
                    const conditions = Array.isArray(storedConditions) ? storedConditions : []
                    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'incapacitated')
                    setRuntimeValue(creatureName, 'activeConditions', filtered, campaignName)
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: mazeEffect.source,
                        rollType: 'save-maze-escape',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'INT',
                        success: true,
                        description: `${creatureName} succeeded on INT (Investigation) check (${r1} + ${bonus} = ${r1 + bonus} vs DC ${condition.dc}) and escaped the Maze.`,
                    }).catch(() => {})
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Incapacitated',
                        reason: 'Maze escape (successful INT Investigation check)',
                        note: `${creatureName} escaped the Maze and is no longer Incapacitated.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }
        }

        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))

        setConditionPopup(buildConditionPopup(r1, bonus, bonusDetail, getAbilityLabel(condition.ability), condition.label, condition.dc, success, rolls, rolls && rolls.length > 1, starryDragonFloor))

        logConditionSave(campaignName, creatureName, r1, bonus, bonusDetail, condition.label, getAbilityLabel(condition.ability), condition.dc, success)
    }
}
