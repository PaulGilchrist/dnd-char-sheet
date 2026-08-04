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
                { name: 'Spare the Dying', spell: { range: '15 feet', automation: { type: 'spare_the_dying' } }, playerStats },
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

        it('excludes the caster from targets', async () => {
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'Cleric', type: 'Humanoid' },
                    { name: 'Ally1', type: 'Humanoid' },
                ],
            })
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return false
                return undefined
            })

            const result = await handle(
                { name: 'Spare the Dying', spell: {}, playerStats },
                { name: 'Cleric' },
                campaignName,
                null
            )

            expect(result.payload.targets.length).toBe(1)
            expect(result.payload.targets[0].name).toBe('Ally1')
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
        it('sets currentHitPoints to 1 and deathSaves for target', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return []
                if (key === 'activeConditionMeta') return {}
                return undefined
            })

            const result = await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'currentHitPoints', 1, campaignName)
            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'deathSaves', [true, true, true], campaignName)
            expect(result.payload.description).toBe('Ally1 rose to 1 HP and gained the Unconscious condition.')
        })

        it('adds unconscious condition to target', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return []
                if (key === 'activeConditionMeta') return {}
                return undefined
            })

            await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'activeConditions', ['unconscious'], campaignName)
            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'activeConditionMeta', {
                unconscious: {
                    source: 'Cleric',
                    reason: 'Spare the Dying',
                },
            }, campaignName)
        })

        it('removes existing unconscious before adding it', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return ['unconscious', 'blinded']
                if (key === 'activeConditionMeta') return {}
                return undefined
            })

            await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'activeConditions', ['blinded', 'unconscious'], campaignName)
        })

        it('logs ability_use, spell_effect, and condition entries', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return []
                if (key === 'activeConditionMeta') return {}
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
                effects: ['Target rose to 1 HP', 'Target gained Unconscious condition'],
                timestamp: expect.any(Number),
            })

            expect(addEntry).toHaveBeenCalledWith(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: 'Ally1',
                condition: 'unconscious',
                reason: 'Spare the Dying',
                sourceName: 'Cleric',
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

        it('rejects if target no longer has 0 HP', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 5
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return []
                if (key === 'activeConditionMeta') return {}
                return undefined
            })

            const result = await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'Ally1' }
            )

            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toContain('no longer a valid target')
            expect(setRuntimeValue).not.toHaveBeenCalledWith('Ally1', 'currentHitPoints', 1, campaignName)
        })

        it('rejects if target has 0 HP but is dead', async () => {
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 0
                if (key === 'isDead') return true
                if (key === 'deathFailures') return [false, false, false]
                if (key === 'activeConditions') return []
                if (key === 'activeConditionMeta') return {}
                return undefined
            })

            const result = await applySpareTheDying(
                { name: 'Spare the Dying' },
                playerStats,
                campaignName,
                null,
                { targetName: 'DeadAlly' }
            )

            expect(result.payload.description).toContain('no longer a valid target')
        })
    })
})
