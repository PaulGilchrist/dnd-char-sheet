import { collectAutomationFromFeatures } from './automationCollector.js'

export function processFeatureAutomation(allActions, allBonusActions, allReactions, allSpecialActions, playerStats) {
    const combined = [
        ...(allActions || []),
        ...(allBonusActions || []),
        ...(allReactions || []),
        ...(allSpecialActions || [])
    ]

    const automation = collectAutomationFromFeatures(combined, playerStats)

    automation.actions.forEach(a => {
        if (!allActions.find(f => f.name === a.name)) {
            allActions.push({ name: a.name, description: a.description || '', automation: a, hasAutomation: true })
        }
    })

    automation.specialActions.forEach(a => {
        if (!allSpecialActions.find(f => f.name === a.name)) {
            allSpecialActions.push({ name: a.name, description: a.description || '', automation: a, hasAutomation: true })
        }
    })

    return automation
}
