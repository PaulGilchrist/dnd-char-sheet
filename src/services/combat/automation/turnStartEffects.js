export function collectTurnStartEffects(features) {
    const effects = []
    if (!features) return effects

    features.forEach(feature => {
        if (!feature?.automation) return
        const automations = Array.isArray(feature.automation) ? feature.automation : [feature.automation]
        for (const auto of automations) {
            if (auto?.type === 'passive_rule' && auto?.effect === 'heroic_inspiration_turn_start') {
                effects.push({
                    type: 'heroic_inspiration',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'end_of_turn_condition_removal') {
                const conditions = (auto.conditions || []).map(c => c.toLowerCase())
                if (conditions.length > 0) {
                    effects.push({
                        type: 'condition_removal',
                        name: feature.name,
                        conditions,
                    })
                }
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'flurry_healing_harm') {
                effects.push({
                    type: 'flurry_healing_harm',
                    name: feature.name,
                    usesExpression: auto.usesExpression || 'WIS modifier minimum 1',
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'dread_ambush_speed') {
                effects.push({
                    type: 'dread_ambush_speed',
                    name: feature.name,
                    bonusExpression: auto.bonusExpression || '10',
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'supreme_sneak') {
                effects.push({
                    type: 'supreme_sneak',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'umbral_sight') {
                effects.push({
                    type: 'umbral_sight',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'naturally_stealthy') {
                effects.push({
                    type: 'naturally_stealthy',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'create_thrall_temp_hp') {
                effects.push({
                    type: 'create_thrall_temp_hp',
                    name: feature.name,
                    tempHpExpression: auto.tempHpExpression || 'warlock level + CHA modifier',
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'mage_hand_legerdemain') {
                effects.push({
                    type: 'mage_hand_legerdemain',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'roving_aim') {
                effects.push({
                    type: 'steady_aim_clear',
                    name: feature.name,
                })
            }
            if (auto?.type === 'steady_aim') {
                effects.push({
                    type: 'steady_aim_clear',
                    name: feature.name,
                })
            }
            if (auto?.type === 'living_legend') {
                effects.push({
                    type: 'living_legend_turn_start',
                    name: feature.name,
                })
            }
            if (auto?.type === 'elder_champion') {
                effects.push({
                    type: 'elder_champion_regeneration',
                    name: feature.name,
                    healExpression: '10',
                })
            }
            if (auto?.type === 'radiant_soul') {
                effects.push({
                    type: 'radiant_soul_turn_start',
                    name: feature.name,
                })
            }
            if (auto?.type === 'damage_aura' && feature.name === 'Inner Radiance') {
                effects.push({
                    type: 'inner_radiance_turn_start',
                    name: feature.name,
                    damageExpression: auto.damageExpression || 'proficiency_bonus',
                    damageType: auto.damageType || 'Radiant',
                    range: auto.range || '10_ft',
                })
            }
            if (auto?.type === 'temp_hp_buff' && auto?.healingStartOfTurn) {
                effects.push({
                    type: 'vitalityOfTheTree_turn_start',
                    name: feature.name,
                    ongoingHealingExpression: auto.ongoingHealingExpression || '',
                    healingRange: auto.healingRange || '10 ft',
                })
            }
            if (auto?.type === 'precise_hunter') {
                effects.push({
                    type: 'precise_hunter',
                    name: feature.name,
                })
            }
            if (auto?.type === 'hunter_lore') {
                effects.push({
                    type: 'hunter_lore',
                    name: feature.name,
                })
            }
            if (auto?.type === 'use_magic_device') {
                effects.push({
                    type: 'use_magic_device',
                    name: feature.name,
                    attunementLimit: auto.attunementLimit || 4,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'divination_savant') {
                effects.push({
                    type: 'divination_savant',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'evocation_savant') {
                effects.push({
                    type: 'evocation_savant',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'illusion_savant') {
                effects.push({
                    type: 'illusion_savant',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'improved_illusions') {
                effects.push({
                    type: 'improved_illusions',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'tavern_brawler_push') {
                effects.push({
                    type: 'tavern_brawler_push',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'ignore_loading_crossbows') {
                effects.push({
                    type: 'ignore_loading_crossbows',
                    name: feature.name,
                    weapons: auto.weapons || [],
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'no_melee_disadvantage_crossbows') {
                effects.push({
                    type: 'no_melee_disadvantage_crossbows',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'grapple_damage') {
                effects.push({
                    type: 'grapple_damage',
                    name: feature.name,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'confusion_turn_start') {
                effects.push({
                    type: 'confusion_turn_start',
                    name: feature.name,
                })
            }
            if (auto?.type === 'healing_start_of_turn') {
                effects.push({
                    type: auto.bloodiedOnly ? 'survivor_turn_start_heal' : 'regenerate_turn_start_heal',
                    name: feature.name,
                    healExpression: auto.healExpression || '1',
                    bloodiedOnly: auto.bloodiedOnly || false,
                    bodyPartRegrowMinutes: auto.bodyPartRegrowMinutes || 2,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'arcane_ward') {
                effects.push({
                    type: 'arcane_ward',
                    name: feature.name,
                    wardHpExpression: auto.wardHpExpression || '',
                    wardRestoreExpression: auto.wardRestoreExpression || '',
                    bonusActionRestore: !!auto.bonusActionRestore,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'projected_ward') {
                effects.push({
                    type: 'projected_ward',
                    name: feature.name,
                    range: auto.range || 30,
                    reaction: true,
                })
            }
            if (auto?.type === 'passive_rule' && auto?.effect === 'spell_breaker') {
                effects.push({
                    type: 'spell_breaker',
                    name: feature.name,
                    alwaysPreparedSpells: auto.alwaysPreparedSpells || [],
                    bonusActionSpells: auto.bonusActionSpells || [],
                    dispelAbilityCheckBonus: auto.dispelAbilityCheckBonus || '',
                    slotRetentionSpells: auto.slotRetentionSpells || [],
                })
            }
            if (auto?.type === 'phantasmal_creatures') {
                effects.push({
                    type: 'phantasmal_creatures',
                    name: feature.name,
                    alwaysPreparedSpells: auto.alwaysPreparedSpells || [],
                    freeCastSpells: auto.freeCastSpells || [],
                    usesMax: auto.usesMax || 1,
                    halvesHp: auto.halvesHp || false,
                })
            }
        }
    })

    return effects
}
