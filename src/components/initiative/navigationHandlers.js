import { cloneDeep } from 'lodash'
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import storage from '../../services/ui/storage.js'
import { getNextCreatureName, getPreviousCreatureName } from '../../services/encounters/initiativeService.js'
import { clearPerRoundMajestyTrackers } from '../../services/combat/auras/unbreakableMajesty.js'
import { expireStaleEffects, applyTurnStartEffects } from '../../services/rules/effects/expirations.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'

// Turn-start effects must re-apply each round, so the dedupe key is round-scoped.
function turnStartGateKey(round, creatureName) {
    return `${round}:${creatureName}`
}

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
    return async function handleNextCreature() {
        const cs = combatSummaryRef.current
        if (!cs) return
        const { newActiveName, roundIncrement } = getNextCreatureName(cs, activeCreatureName)
        if (!roundIncrement) {
            storage.set('activeCreatureName', newActiveName, campaignName)
            setActiveCreatureName(newActiveName)
            return
        }
        const roundToSet = (roundRef.current ?? 1) + 1
        const updatedSummary = cloneDeep(cs)
        updatedSummary.round = roundToSet
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
        const gateKey = turnStartGateKey(roundToSet, newActiveName)
        const shouldApply = lastAppliedTurnStartCreatureRef.current !== gateKey
        let finalSummary = updatedSummary
        if (shouldApply) {
            lastAppliedTurnStartCreatureRef.current = gateKey
            setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', gateKey, campaignName)
            storage.set('lastAppliedTurnStartCreature', gateKey, campaignName)
            updatedSummary.lastAppliedTurnStartCreature = gateKey
            const newActiveChar = characters.find(ch => ch.name === newActiveName || ch.name.startsWith(newActiveName + ' '))
            await applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
            // Turn-start effects may have persisted damaged copies to the cache —
            // persist the cache (round + damage) last so nothing stale overwrites it.
            finalSummary = getCombatSummary(campaignName) || updatedSummary
        }
        storage.set('combatSummary', finalSummary, campaignName)
        setCombatSummary(cloneDeep(finalSummary))
        if (shouldApply) {
            setRuntimeStateTick(t => t + 1)
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
    return async function handlePreviousCreature() {
        if (isPreviousDisabled) return
        const cs = combatSummaryRef.current
        if (!cs) return
        const { newActiveName, roundDecrement } = getPreviousCreatureName(cs, activeCreatureName)
        if (!roundDecrement) {
            storage.set('activeCreatureName', newActiveName, campaignName)
            setActiveCreatureName(newActiveName)
            return
        }
        const currentRound = roundRef.current ?? 1
        if (currentRound <= 1) return
        const roundToSet = currentRound - 1
        const updatedSummary = cloneDeep(cs)
        updatedSummary.round = roundToSet
        setCombatSummary(updatedSummary)
        expireStaleEffects(campaignName, newActiveName)
        const gateKey = turnStartGateKey(roundToSet, newActiveName)
        const shouldApply = lastAppliedTurnStartCreatureRef.current !== gateKey
        let finalSummary = updatedSummary
        if (shouldApply) {
            lastAppliedTurnStartCreatureRef.current = gateKey
            setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', gateKey, campaignName)
            storage.set('lastAppliedTurnStartCreature', gateKey, campaignName)
            updatedSummary.lastAppliedTurnStartCreature = gateKey
            const newActiveChar = characters.find(ch => ch.name === newActiveName || ch.name.startsWith(newActiveName + ' '))
            await applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
            finalSummary = getCombatSummary(campaignName) || updatedSummary
        }
        storage.set('combatSummary', finalSummary, campaignName)
        setCombatSummary(cloneDeep(finalSummary))
        if (shouldApply) {
            setRuntimeStateTick(t => t + 1)
        }
        storage.set('activeCreatureName', newActiveName, campaignName)
        setActiveCreatureName(newActiveName)
        for (const creature of cs.creatures) {
            clearPerRoundMajestyTrackers(creature.name, campaignName)
        }
    }
}
