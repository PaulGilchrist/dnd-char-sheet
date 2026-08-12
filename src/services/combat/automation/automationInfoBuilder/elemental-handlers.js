// ── Elemental Aspect Handlers ────────────────────────────────────────

export const elementalHandlers = {
    'fire_burn': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'fire_burn',
            name: feature.name,
            damage: auto.damage || '1d10',
            damageType: auto.damageType || 'Fire',
            trigger: auto.trigger || 'hit',
            uses: auto.uses || null,
            recharge: auto.recharge || 'long_rest',
            casting_time: auto.casting_time || '1 action',
            hasAutomation: true
        }
    },

    'frosts_chill': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'frosts_chill',
            name: feature.name,
            damage: auto.damage || '1d6',
            damageType: auto.damageType || 'Cold',
            condition: auto.condition || 'speed_reduction',
            value: auto.value || '10_ft',
            trigger: auto.trigger || 'hit',
            uses: auto.uses || null,
            recharge: auto.recharge || 'long_rest',
            casting_time: auto.casting_time || '1 action',
            hasAutomation: true
        }
    },

    'hills_tumble': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'hills_tumble',
            name: feature.name,
            trigger: auto.trigger || 'melee_hit',
            effect: auto.effect || 'prone',
            uses: auto.uses || null,
            recharge: auto.recharge || 'long_rest',
            casting_time: auto.casting_time || '1 action',
            hasAutomation: true
        }
    },

    'stones_endurance': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'stones_endurance',
            name: feature.name,
            reductionExpression: auto.reductionExpression || '1d12 + CON modifier',
            trigger: auto.trigger || 'damage_received',
            uses: auto.uses || null,
            recharge: auto.recharge || 'long_rest',
            casting_time: auto.casting_time || '1 reaction',
            hasAutomation: true
        }
    },

    'storms_thunder': (feature, _playerStats) => {
        const auto = feature.automation
        return {
            type: 'storms_thunder',
            name: feature.name,
            damage: auto.damage || '1d8',
            damageType: auto.damageType || 'Thunder',
            range: auto.range || '60_ft',
            trigger: auto.trigger || 'damage_received_within_range',
            uses: auto.uses || null,
            recharge: auto.recharge || 'long_rest',
            casting_time: auto.casting_time || '1 reaction',
            hasAutomation: true
        }
    },
}
