import { cloneDeep } from 'lodash'
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import storage from '../../services/ui/storage.js'
import { getNextCreatureName, getPreviousCreatureName } from '../../services/encounters/initiativeService.js'
import { clearPerRoundMajestyTrackers } from '../../services/combat/auras/unbreakableMajesty.js'
import { expireStaleEffects, applyTurnStartEffects } from '../../services/rules/effects/expirations.js'

/**
 * Creates the handleNextCreature handler.
 */
export function createNextCreatureHandler({
    combatSummaryRef,
    activeCreatureName,
    campaignName,
    characters,
    roundRef,
    lastAppliedTurnStartCreatureRef,
    setCombatSummary,
    setActiveCreatureName,
    setRuntimeStateTick,
}) {
    return function handleNextCreature() {
        const cs = combatSummaryRef.current
        if (!cs) return
        const { newActiveName, roundIncrement } = getNextCreatureName(cs, activeCreatureName)
        if (!roundIncrement) {
            storage.set('activeCreatureName', newActiveName, campaignName)
            setActiveCreatureName(newActiveName)
        } else {
            const roundToSet = (roundRef.current ?? 1) + 1
            const updatedSummary = cloneDeep(cs)
            updatedSummary.round = roundToSet
            storage.set('combatSummary', updatedSummary, campaignName)
            setCombatSummary(updatedSummary)
            storage.set('activeCreatureName', newActiveName, campaignName)
            setActiveCreatureName(newActiveName)
            for (const creature of cs.creatures) {
                clearPerRoundMajestyTrackers(creature.name, campaignName)
                if (creature.type === 'player') {
                    setRuntimeValue(creature.name, '_cunningStrikeCostUsed', 0, campaignName)
                    setRuntimeValue(creature.name, '_CunningStrike_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Charge_Attack_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_FastHands_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_CunningAction_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Cleave_UsedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Nick_UsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'surgeUsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'illusoryRealityUsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'portentUsedThisTurn', null, campaignName)
                    setRuntimeValue(creature.name, 'psionicStrikeUsedThisTurn', null, campaignName)
                    setRuntimeValue(creature.name, '_BrutalStrike_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_fortifiedHealth_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Shield_Bash_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'piercerPunctureUsedThisTurn', null, campaignName)
                }
            }
            expireStaleEffects(campaignName, newActiveName)
            const lastApplied = lastAppliedTurnStartCreatureRef.current
            if (lastApplied !== newActiveName) {
                lastAppliedTurnStartCreatureRef.current = newActiveName
                setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', newActiveName, campaignName)
                storage.set('lastAppliedTurnStartCreature', newActiveName, campaignName)
                if (updatedSummary.lastAppliedTurnStartCreature !== newActiveName) {
                    updatedSummary.lastAppliedTurnStartCreature = newActiveName
                    setCombatSummary(cloneDeep(updatedSummary))
                }
                const newActiveChar = characters.find(ch => ch.name === newActiveName || ch.name.startsWith(newActiveName + ' '))
                applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                setRuntimeStateTick(t => t + 1)
            }
        }
    }
}

/**
 * Creates the handlePreviousCreature handler.
 */
export function createPreviousCreatureHandler({
    combatSummaryRef,
    activeCreatureName,
    campaignName,
    characters,
    roundRef,
    lastAppliedTurnStartCreatureRef,
    setCombatSummary,
    setActiveCreatureName,
    setRuntimeStateTick,
    isPreviousDisabled,
}) {
    return function handlePreviousCreature() {
        if (isPreviousDisabled) return
        const cs = combatSummaryRef.current
        if (!cs) return
        const { newActiveName, roundDecrement } = getPreviousCreatureName(cs, activeCreatureName)
        if (!roundDecrement) {
            storage.set('activeCreatureName', newActiveName, campaignName)
            setActiveCreatureName(newActiveName)
        } else {
            const currentRound = roundRef.current ?? 1
            if (currentRound > 1) {
                const updatedSummary = cloneDeep(cs)
                updatedSummary.round = currentRound - 1
                storage.set('combatSummary', updatedSummary, campaignName)
                setCombatSummary(updatedSummary)
                expireStaleEffects(campaignName, newActiveName)
                const lastApplied = lastAppliedTurnStartCreatureRef.current
                if (lastApplied !== newActiveName) {
                    lastAppliedTurnStartCreatureRef.current = newActiveName
                    setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', newActiveName, campaignName)
                    storage.set('lastAppliedTurnStartCreature', newActiveName, campaignName)
                    if (updatedSummary.lastAppliedTurnStartCreature !== newActiveName) {
                        updatedSummary.lastAppliedTurnStartCreature = newActiveName
                        setCombatSummary(cloneDeep(updatedSummary))
                    }
                    const newActiveChar = characters.find(ch => ch.name === newActiveName || ch.name.startsWith(newActiveName + ' '))
                    applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                    setRuntimeStateTick(t => t + 1)
                }
                storage.set('activeCreatureName', newActiveName, campaignName)
                setActiveCreatureName(newActiveName)
                for (const creature of cs.creatures) {
                    clearPerRoundMajestyTrackers(creature.name, campaignName)
                }
            }
        }
    }
}
