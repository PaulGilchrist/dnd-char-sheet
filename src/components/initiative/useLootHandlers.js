import { useState, useCallback } from 'react'
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { generateLootFromCombatSummary } from '../../services/items/lootGenerator.js'
import * as logService from '../../services/ui/logService.js'

/**
 * Hook for loot generation and awarding in the initiative component.
 */
export function useLootHandlers(campaignName, characters, combatSummary) {
    const [lootData, setLootData] = useState({ lootEntries: [], totalEncounterXp: 0 })
    const [generatingLoot, setGeneratingLoot] = useState(false)
    const [lootTextValue, setLootTextValue] = useState('')
    const [showAwardLoot, setShowAwardLoot] = useState(false)
    const [awardingLoot, setAwardingLoot] = useState(false)

    const handleGenerateLoot = useCallback(async () => {
        setGeneratingLoot(true)
        try {
            const lootResult = await generateLootFromCombatSummary(
                combatSummary,
                characters,
                campaignName
            )
            setLootData(lootResult || { lootEntries: [], totalEncounterXp: 0 })
            setLootTextValue(lootResult.lootEntries.join('\n'))
        } catch (error) {
            console.error('Failed to generate loot:', error)
        } finally {
            setGeneratingLoot(false)
        }
    }, [campaignName, characters, combatSummary])

    const handleAwardLoot = useCallback(async () => {
        if (awardingLoot) return
        setAwardingLoot(true)
        try {
            const numChars = characters && characters.length > 0 ? characters.length : 1
            const xpPerChar = Math.floor(lootData.totalEncounterXp / numChars)

            const lootItems = lootTextValue
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)

            if (lootItems.length > 0 && lootItems.some(item => item !== 'No loot for these monsters')) {
                await logService.addEntry(campaignName, {
                    type: 'loot',
                    encounterName: 'Combat',
                    lootItems: lootItems.filter(item => item !== 'No loot for these monsters'),
                    xpPerChar,
                    totalEncounterXp: lootData.totalEncounterXp,
                })
            }

            const logEntry = async (entry) => {
                try { await logService.addEntry(campaignName, entry) } catch { /* ignore */ }
            }
            await logEntry({
                type: 'encounter',
                action: 'loot_awarded',
                encounterName: 'Combat',
                xpPerChar,
                totalEncounterXp: lootData.totalEncounterXp,
                lootItems,
            })

            for (const charData of (characters || [])) {
                const currentXp = getRuntimeValue(charData.name, 'xp') || 0
                setRuntimeValue(charData.name, 'xp', currentXp + xpPerChar, campaignName)
            }

            setShowAwardLoot(false)
            setLootTextValue('')
            setLootData({ lootEntries: [], totalEncounterXp: 0 })
        } catch (error) {
            console.error('Failed to award loot:', error)
        } finally {
            setAwardingLoot(false)
        }
    }, [awardingLoot, lootData, lootTextValue, campaignName, characters])

    const handleClearLoot = useCallback(() => {
        setLootData({ lootEntries: [], totalEncounterXp: 0 })
        setLootTextValue('')
        setShowAwardLoot(false)
    }, [])

    return {
        lootData,
        setLootData,
        generatingLoot,
        lootTextValue,
        setLootTextValue,
        showAwardLoot,
        setShowAwardLoot,
        awardingLoot,
        handleGenerateLoot,
        handleAwardLoot,
        handleClearLoot,
    }
}
