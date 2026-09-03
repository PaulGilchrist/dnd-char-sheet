import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ConditionEffectBadges from './ConditionEffectBadges.jsx'
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getStore: vi.fn(() => new Map()),
    useSyncedState: vi.fn(() => [null, vi.fn()]),
    listeners: new Map(),
    getRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    setRuntimeValue: vi.fn(),
}))

vi.mock('../../services/ui/storage.js', () => ({
    default: { set: vi.fn() },
}))

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn(() => ({
        speedReduction: 0,
        noAdvantageAgainst: false,
        targetDisadvantageCount: 0,
        targetAttackDisadvantageCount: 0,
        attackAdvantageCount: 0,
        attackAdvantageReasons: [],
        targetAdvantageCount: 0,
        targetAdvantageReasons: [],
        saveAdvantageCount: 0,
        saveAdvantageReasons: [],
        dexSaveAdvantageCount: 0,
        riderSaveDisadvantage: false,
        saveDisadvantageCount: 0,
        saveDisadvantage: [],
        abilityCheckDisadvantageAbilities: null,
        abilityCheckAdvantageAbilities: null,
        abilityCheckAdvantage: false,
        abilityCheckAdvantageReasons: [],
        riderAttackBonus: 0,
        riderCannotOpportunityAttack: false,
        banePenalty: false,
        rayOfEnfeebleDamageReduction: false,
        resistanceDamageReduction: false,
        blessBonus: false,
        beaconOfHope: false,
        hasteActive: false,
        barkskinActive: false,
    })),
}))

const CREATURE_NAME = 'FeyRanger'
const CAMPAIGN_NAME = 'test-campaign'

describe('ConditionEffectBadges — Pass Without Trace aura badge (SP-085)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getRuntimeValue.mockImplementation(() => [])
    })

    it('renders the Pass Without Trace badge for pass_without_trace_bonus targetEffect', () => {
        render(
            <ConditionEffectBadges
                conditions={[]}
                targetEffects={[{ target: CREATURE_NAME, effect: 'pass_without_trace_bonus', source: CREATURE_NAME, slotLevel: 2, bonusExpression: '+10' }]}
                creatureName={CREATURE_NAME}
                campaignName={CAMPAIGN_NAME}
                isLocalhost={true}
            />
        )

        const badge = screen.getByText('Pass Without Trace')
        expect(badge).toBeTruthy()
        expect(document.querySelector('.creature-badge i.fa-wind')).toBeTruthy()
    })

    it('does not render the badge without a pass_without_trace_bonus targetEffect', () => {
        render(
            <ConditionEffectBadges
                conditions={[]}
                targetEffects={[]}
                creatureName={CREATURE_NAME}
                campaignName={CAMPAIGN_NAME}
                isLocalhost={true}
            />
        )

        expect(screen.queryByText('Pass Without Trace')).toBeNull()
    })
})
