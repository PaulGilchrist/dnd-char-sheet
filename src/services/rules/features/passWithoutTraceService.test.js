// @improved-by-ai
import { triggerPassWithoutTraceSpell, applyPassWithoutTraceEffect } from './passWithoutTraceService.js'
import { executeHandler } from '../../automation/index.js'
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js'
import { addEntry } from '../../ui/logService.js'

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}))

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}))

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}))

const CAMPAIGN = 'test-campaign'

function makeSpell(overrides = {}) {
    return {
        name: 'Pass Without Trace',
        level: 2,
        casting_time: '1 action',
        automation: { type: 'pass_without_trace', auraRange: 30 },
        ...overrides,
    }
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'Druid',
        ...overrides,
    }
}

describe('passWithoutTraceService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('triggerPassWithoutTraceSpell', () => {
        it('returns null for non-matching spell name', async () => {
            const result = await triggerPassWithoutTraceSpell(
                { name: 'Bless' },
                {},
                makePlayerStats(),
                CAMPAIGN,
                null
            )
            expect(result).toBeNull()
        })

        it('calls executeHandler with correct action for Pass Without Trace', async () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } })

            await triggerPassWithoutTraceSpell(
                makeSpell(),
                { slotLevel: 2 },
                makePlayerStats(),
                CAMPAIGN,
                null
            )

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Pass Without Trace',
                    automation: expect.objectContaining({
                        type: 'pass_without_trace',
                        auraRange: 30,
                    }),
                }),
                makePlayerStats(),
                CAMPAIGN,
                null
            )
        })

        it('returns the handler result', async () => {
            const expected = { type: 'popup', payload: { type: 'test' } }
            executeHandler.mockResolvedValue(expected)

            const result = await triggerPassWithoutTraceSpell(
                makeSpell(),
                {},
                makePlayerStats(),
                CAMPAIGN,
                null
            )

            expect(result).toEqual(expected)
        })
    })

    describe('applyPassWithoutTraceEffect', () => {
        it('returns null when no target names provided', async () => {
            const result = await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                null
            )
            expect(result).toBeNull()
        })

        it('returns null when target names is empty array', async () => {
            const result = await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                []
            )
            expect(result).toBeNull()
        })

        it('stores per-target effects in targetEffects', async () => {
            getRuntimeValue.mockReturnValue([])

            await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                ['Druid', 'Barbarian', 'Wizard']
            )

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Druid',
                        effect: 'pass_without_trace_bonus',
                        source: 'Druid',
                        bonusExpression: '+10',
                    }),
                    expect.objectContaining({
                        target: 'Barbarian',
                        effect: 'pass_without_trace_bonus',
                        source: 'Druid',
                    }),
                    expect.objectContaining({
                        target: 'Wizard',
                        effect: 'pass_without_trace_bonus',
                        source: 'Druid',
                    }),
                ]),
                CAMPAIGN
            )
        })

        it('adds spell log entry', async () => {
            getRuntimeValue.mockReturnValue([])

            await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                ['Druid', 'Barbarian']
            )

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    type: 'spell',
                    characterName: 'Druid',
                    targets: ['Druid', 'Barbarian'],
                    spellName: 'Pass Without Trace',
                })
            )
        })

        it('adds automation log entry', async () => {
            getRuntimeValue.mockReturnValue([])

            await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                ['Druid', 'Barbarian']
            )

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    type: 'automation',
                    characterName: 'Druid',
                    automationType: 'pass_without_trace',
                    description: expect.stringContaining('2 creature(s) affected'),
                })
            )
        })

        it('returns popup with result summary', async () => {
            getRuntimeValue.mockReturnValue([])

            const result = await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                ['Druid', 'Barbarian', 'Wizard']
            )

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Pass Without Trace',
                    description: 'Pass Without Trace cast: 3 creature(s) affected — Druid, Barbarian, Wizard. Each has +10 to Dexterity (Stealth) checks and leaves no tracks.',
                },
            })
        })

        it('updates existing effects for same caster and target', async () => {
            const existingEffects = [
                { target: 'Druid', effect: 'pass_without_trace_bonus', source: 'Druid', old: true },
            ]
            getRuntimeValue.mockReturnValue(existingEffects)

            await applyPassWithoutTraceEffect(
                makeSpell(),
                makePlayerStats(),
                CAMPAIGN,
                null,
                ['Druid']
            )

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [expect.objectContaining({
                    target: 'Druid',
                    effect: 'pass_without_trace_bonus',
                    source: 'Druid',
                    bonusExpression: '+10',
                })],
                CAMPAIGN
            )
        })
    })
})
