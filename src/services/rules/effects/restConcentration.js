import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js'
import * as storageService from '../../../services/ui/storage.js'
import { getCombatSummary } from '../../../services/encounters/combatData.js'

export function clearHuntersMarkConcentration(name, campaignName) {
  const cs = getCombatSummary(campaignName)
  if (!cs || !cs.creatures) return
  const creature = cs.creatures.find(c => c.name === name)
  if (creature && creature.concentration?.spell === "Hunter's Mark") {
    creature.concentration = null
    storageService.default.set('combatSummary', cs, campaignName)
    const existingBuffs = getRuntimeValue(name, 'activeBuffs') || []
    const filteredBuffs = Array.isArray(existingBuffs) ? existingBuffs.filter(b => b.name !== "Hunter's Mark") : []
    if (filteredBuffs.length !== existingBuffs.length) {
      setRuntimeValue(name, 'activeBuffs', filteredBuffs, campaignName)
    }
    window.dispatchEvent(new CustomEvent('combat-summary-updated'))
  }
}
