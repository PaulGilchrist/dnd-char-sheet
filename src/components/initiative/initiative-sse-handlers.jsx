import { cloneDeep } from 'lodash'
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { getActiveCreatureName, getCombatSummary, setCombatSummaryCache } from '../../services/encounters/combatData.js'
import { expireStaleEffects, applyTurnStartEffects } from '../../services/rules/effects/expirations.js'

/**
 * SSE overlay event handler - manages spell-overlay events
 */
export function createOverlayHandler(campaignName) {
    return function handleOverlayEvent(event, setOverlays) {
        if (!event || !event.key || !event.key.startsWith('spell-overlay-')) return
        if (event.key !== `spell-overlay-${campaignName}`) return
        const { action, overlays: newOverlays, overlayId } = event.data || {}
        switch (action) {
            case 'add':
                if (newOverlays?.length) {
                    setOverlays(prev => {
                        const existingIds = new Set(prev.map(o => o.id))
                        const unique = newOverlays.filter(n => !existingIds.has(n.id))
                        return unique.length ? [...prev, ...unique] : prev
                    })
                }
                break
            case 'update':
                if (newOverlays?.length) {
                    setOverlays(prev => prev.map(o => {
                        const replacement = newOverlays.find(n => n.id === o.id)
                        return replacement || o
                    }))
                }
                break
            case 'remove':
                if (overlayId) {
                    setOverlays(prev => prev.filter(o => o.id !== overlayId))
                }
                break
            case 'clear':
                setOverlays([])
                break
            default:
                break
        }
    }
}

/**
 * Main SSE event handler - processes change-{campaignName}-* events
 */
export function createSseEventHandler({
    campaignName,
    characters,
    combatSummaryRef,
    activeCreatureNameRef,
    lastAppliedTurnStartCreatureRef,
    setCombatSummary,
    setCombatSummaryG,
    setActiveCreatureNameG,
    setRuntimeStateTick,
    handleOverlayEvent,
}) {
    return function handleEvent(event) {
        if (event.key == null || event.data == null) return

        if (event.key.startsWith('spell-overlay-')) {
            handleOverlayEvent(event)
            return
        }

        if (!event.key.startsWith(`change-${campaignName}-`)) return

        const dataKey = event.key.slice(`change-${campaignName}-`.length)
        if (dataKey === 'combatSummary') {
            if (!event.data?.creatures) return
            const merged = cloneDeep(event.data)
            if (!merged.activeCreatureName) {
                const activeName = getActiveCreatureName(campaignName)
                if (activeName) {
                    merged.activeCreatureName = activeName
                }
            }
            const prevRound = combatSummaryRef.current?.round ?? 1
            if (merged.round < prevRound) {
                return
            }
            combatSummaryRef.current = merged
            setCombatSummaryCache(merged, campaignName)
            setCombatSummaryG(merged)
            if (merged.round !== (combatSummaryRef.current?.round ?? 1)) {
                expireStaleEffects(campaignName, merged.activeCreatureName || null)
            }
        } else if (dataKey === 'lastAttack') {
            // lastAttack is now a root-level key — no in-memory cache needed
        } else if (dataKey === 'activeCreatureName') {
            const prevActive = activeCreatureNameRef.current
            const newActive = event.data
            activeCreatureNameRef.current = newActive
            const cs = combatSummaryRef.current || getCombatSummary(campaignName)
            if (cs) {
                cs.activeCreatureName = newActive
                setCombatSummaryCache(cs, campaignName)
            }
            setActiveCreatureNameG(newActive)
            expireStaleEffects(campaignName, newActive)

            // Only apply turn-start effects when the active creature actually changes
            const lastApplied = lastAppliedTurnStartCreatureRef.current
            const shouldApply = prevActive !== event.data && lastApplied !== event.data
            if (shouldApply) {
                lastAppliedTurnStartCreatureRef.current = event.data
                setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', event.data, campaignName)
                const cs = combatSummaryRef.current
                if (cs && cs.lastAppliedTurnStartCreature !== event.data) {
                    cs.lastAppliedTurnStartCreature = event.data
                    setCombatSummary(cloneDeep(cs))
                }
                const newActiveChar = characters.find(ch => ch.name === event.data || ch.name.startsWith(event.data + ' '))
                applyTurnStartEffects(event.data, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                setRuntimeStateTick(t => t + 1)
            }
        } else if (!['log', 'spell-overlay'].includes(dataKey)) {
            // Any character-level change triggers a re-render
            setRuntimeStateTick(t => t + 1)
        }
    }
}
