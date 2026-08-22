import { buildAttackInfo } from './automationInfoBuilder.js'
import { routeAutomation } from './automationRouter.js'
export { collectTurnStartEffects } from './turnStartEffects.js'
export { processFeatureAutomation } from './processFeatureAutomation.js'

export function collectAutomationFromFeatures(features, playerStats) {
    const result = {
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: [],
        passives: [],
        autoEffects: [],
        saveModifiers: [],
        primalKnowledge: [],
        ritualSpells: []
    }

    if (!features) return result


    features.forEach(feature => {
        if (!feature?.automation) return
        const automations = Array.isArray(feature.automation) ? feature.automation : [feature.automation]
        for (const auto of automations) {
            if (auto?.type === 'passive_rule' && auto?.effect === 'arcane_ward') {
                result.passives.push({
                    type: 'arcane_ward',
                    name: feature.name,
                    wardHpExpression: auto.wardHpExpression || '',
                    wardRestoreExpression: auto.wardRestoreExpression || '',
                    bonusActionRestore: !!auto.bonusActionRestore,
                })
                continue
            }
            if (auto?.type === 'projected_ward') {
                result.reactions.push({
                    type: 'projected_ward',
                    name: feature.name,
                    range: auto.range || 30,
                    reaction: true,
                    automation: {
                        type: 'projected_ward',
                        name: feature.name,
                        range: auto.range || 30,
                        reaction: true,
                        wardTrigger: auto.wardTrigger || 'ally_damage_taken',
                        casting_time: auto.casting_time || '1 reaction',
                        hasAutomation: true,
                    },
                })
                continue
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'arcane_apotheosis') {
                result.passives.push({
                    type: 'passive_rule',
                    name: feature.name,
                    effect: 'arcane_apotheosis',
                    hasAutomation: true,
                })
                continue
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'spell_breaker') {
                result.passives.push({
                    type: 'spell_breaker',
                    name: feature.name,
                    spellLevel: auto.spellLevel || 1,
                    alwaysPreparedSpells: auto.alwaysPreparedSpells || [],
                    bonusActionSpells: auto.bonusActionSpells || [],
                    dispelAbilityCheckBonus: auto.dispelAbilityCheckBonus || '',
                    slotRetentionSpells: auto.slotRetentionSpells || [],
                })
                continue
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'relentless') {
                result.passives.push({
                    type: 'passive_rule',
                    name: feature.name,
                    effect: 'relentless',
                    hasAutomation: true,
                })
                continue
            }
            const info = buildAttackInfo({ ...feature, automation: auto }, playerStats)
            if (!info) continue

            routeAutomation(info, auto, result)

            if (info && info.type === 'damage_bonus' && info.rangeBonusCantrip) {
                const bonusMatch = String(info.rangeBonusCantrip).match(/(\d+)/);
                if (bonusMatch) {
                    result.passives.push({
                        type: 'cantrip_range_bonus',
                        name: info.name,
                        effect: 'cantrip_range_bonus',
                        bonusExpression: bonusMatch[1],
                        hasAutomation: true,
                    });
                }
            }
        }
    })

    return result
}

