import { handle, applySpareTheDying } from './spareTheDyingHandler.js'

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => undefined),
    setRuntimeValue: vi.fn(),
}))

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}))

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
    rangeToFeet: vi.fn(() => 15),
}))

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js')
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js')
const { addEntry } = await import('../../../ui/logService.js')

const campaignName = 'TestCampaign'
const playerStats = { name: 'Cleric' }

describe('spareTheDyingHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('handle', () => {
        it('returns automation_info popup with valid targets', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'Ally1', type: 'Humanoid' },
                    { name: 'Ally2', type: 'Humanoid' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return false
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: { range: '15 feet', automation: { type: 'spare_the_dying' } } },
                playerStats,
                campaignName,
                null
            )

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.targets.length).toBe(2)
            expect(result.payload.targets[0].isValidTarget).toBe(true)
            expect(result.payload.targets[0].hp).toBe(0)
        })

        it('excludes creatures with >0 HP', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'HealthyAlly', type: 'Humanoid' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 10
                if (key === 'isDead') return false
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: { range: '15 feet' } },
                playerStats,
                campaignName,
                null
            )

            expect(result.payload.description).toContain('No valid targets found')
        })

        it('excludes dead creatures', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'DeadAlly', type: 'Humanoid' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return true
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: {} },
                playerStats,
                campaignName,
                null
            )

            expect(result.payload.description).toContain('No valid targets found')
        })

        it('excludes undead creatures', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'Zombie', type: 'Undead' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return false
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: {} },
                playerStats,
                campaignName,
                null
            )

            expect(result.payload.description).toContain('No valid targets found')
        })

        it('excludes construct creatures', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'IronGolem', type: 'Construct' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return false
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: {} },
                playerStats,
                campaignName,
                null
            )

            expect(result.payload.description).toContain('No valid targets found')
        })

        it('returns error when no combat context', async () => {
            getCombatContext.mockResolvedValue(null)

            const result = await handle(
                { name: 'Spare the Dying', spell: {} },
                playerStats,
                campaignName,
                null
            )

            expect(result.type).toBe('popup')
            expect(result.payload.description).toContain('No combat context found')
        })
    })

    describe('applySpareTheDying', () => {
        it('sets deathSaves to [true, true, true] for target', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                return undefined
            })

            const result = await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'deathSaves', [true, true, true], campaignName)
            expect(result.payload.description).toBe('Ally1 became stable.')
        })

        it('logs ability_use and spell_effect entries', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                return undefined
            })

            await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(addEntry).toHaveBeenCalledWith(campaignName, {
                type: 'ability_use',
                characterName: 'Cleric',
                abilityName: 'Spare the Dying',
                description: expect.stringContaining('Ally1'),
                targetName: 'Ally1',
                timestamp: expect.any(Number),
            })

            expect(addEntry).toHaveBeenCalledWith(campaignName, {
                type: 'spell_effect',
                characterName: 'Cleric',
                spellName: 'Spare the Dying',
                targetName: 'Ally1',
                effects: ['Target became stable'],
                timestamp: expect.any(Number),
            })
        })

        it('returns null when no target selected', async () => {
            const result = await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                {}
            )

            expect(result).toBeNull()
        })
    })
})
