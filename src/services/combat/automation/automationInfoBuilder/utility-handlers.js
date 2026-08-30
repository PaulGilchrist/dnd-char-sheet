import { getAbilityModifier } from '../../../shared/abilityLookup.js'

// ── Utility / Item Handlers ──────────────────────────────────────────

export const utilityHandlers = {
    'brew_poison': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'brew_poison',
            name: feature.name,
            description: feature.description || '',
            casting_time: auto.casting_time || 'passive',
            hasAutomation: true
        }
    },

    'apply_poison': (feature, playerStats) => {
        const auto = feature.automation
        const dexMod = getAbilityModifier(playerStats.abilities, 'Dexterity')
        const intMod = getAbilityModifier(playerStats.abilities, 'Intelligence')
        const poisonerAbilityModifier = Math.max(dexMod, intMod)
        const proficiencyBonus = playerStats.proficiency || 0
        const saveDc = 8 + poisonerAbilityModifier + proficiencyBonus
        return {
            type: 'apply_poison',
            name: feature.name,
            description: feature.description || '',
            casting_time: auto.casting_time || '1 bonus action',
            damageExpression: auto.damageExpression || '2d8',
            damageType: auto.damageType || 'Poison',
            condition: auto.condition || 'poisoned',
            saveType: auto.saveType || 'CON',
            saveDc: saveDc,
            poisonerAbilityModifier: poisonerAbilityModifier,
            hasAutomation: true
        }
    },
}
