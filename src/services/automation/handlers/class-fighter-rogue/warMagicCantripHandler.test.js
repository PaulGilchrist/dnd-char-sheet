// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handle, confirmWarMagicCantrip } from './warMagicCantripHandler.js'

vi.mock('../../../ui/dataLoader.js', () => ({
    loadSpellData: vi.fn(),
    loadWildMagicSurgeTable: vi.fn(async () => []),
}))

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}))

const mockCampaignName = 'test-campaign'

function makeCantrip(overrides = {}) {
    return {
        name: 'Ray of Frost',
        level: 0,
        casting_time: '1 action',
        range: '120 feet',
        description: 'A freezing beam of blue light.',
        damage: '1d8 cold',
        ...overrides,
    }
}

function makeNonCantrip(overrides = {}) {
    return {
        name: 'Burning Hands',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        description: 'A flash of flames.',
        damage: '3d6 fire',
        ...overrides,
    }
}

function makeAction(overrides = {}) {
    return {
        name: 'War Magic',
        automation: { type: 'war_magic_cantrip' },
        ...overrides,
    }
}

function makePlayerStats(overrides = {}) {
    return { name: 'TestFighter', rules: '2024', ...overrides }
}

describe('warMagicCantripHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('handle', () => {
        it('returns a modal with cantrip options and details', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeCantrip(), makeCantrip({ name: 'Shocking Grasp' }), makeNonCantrip()])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('modal')
            expect(result.modalName).toBe('warMagicCantrip')
            expect(result.payload.options).toEqual(['Ray of Frost', 'Shocking Grasp'])
            expect(result.payload.action).toBeInstanceOf(Object)
            expect(result.payload.playerStats).toEqual(makePlayerStats())
            expect(result.payload.campaignName).toBe(mockCampaignName)
            expect(result.payload.spellListKey).toBe('wizard_cantrips')
        })

        it('includes all spell detail fields in optionDetails', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            const cantrip = makeCantrip({ name: 'Ray of Frost' })
            loadSpellData.mockResolvedValue([cantrip])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            const details = result.payload.optionDetails['Ray of Frost']
            expect(details).toEqual({
                name: 'Ray of Frost',
                level: 0,
                casting_time: '1 action',
                range: '120 feet',
                description: 'A freezing beam of blue light.',
                damage: '1d8 cold',
            })
        })

        it('defaults missing spell fields to sensible values', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeCantrip({ casting_time: undefined, range: undefined, description: undefined, damage: undefined })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            const details = result.payload.optionDetails['Ray of Frost']
            expect(details.casting_time).toBe('1 action')
            expect(details.range).toBe('')
            expect(details.description).toBe('')
            expect(details.damage).toBeNull()
        })

        it('uses custom spellListKey from automation when specified', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeCantrip()])

            const result = await handle(
                makeAction({ automation: { type: 'war_magic_cantrip', spellList: 'sorcerer_cantrips' } }),
                makePlayerStats(),
                mockCampaignName
            )

            expect(result.payload.spellListKey).toBe('sorcerer_cantrips')
        })

        it('returns an info popup when the spell list is null or empty', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No Wizard cantrips available.')
        })

        it('returns an info popup when the spell list contains no cantrips', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeNonCantrip(), makeNonCantrip({ name: 'Fireball' })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No Wizard cantrips available.')
        })

        it('filters out non-cantrips from options', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeCantrip({ name: 'Ray of Frost' }),
                makeNonCantrip({ name: 'Burning Hands' }),
                makeCantrip({ name: 'Shocking Grasp' }),
                makeNonCantrip({ name: 'Fireball' }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Ray of Frost', 'Shocking Grasp'])
        })
    })

    describe('confirmWarMagicCantrip', () => {
        it('returns a popup with the selected cantrip and automationType', async () => {
            const action = makeAction({ name: 'Improved War Magic' })
            const result = await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, 'Ray of Frost')

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.name).toBe('Improved War Magic')
            expect(result.payload.automationType).toBe('war_magic_cantrip')
            expect(result.payload.description).toContain('Ray of Frost')
            expect(result.payload.automation).toEqual(action.automation)
        })

        it('returns an error popup when no cantrip is selected', async () => {
            const action = makeAction()
            const result1 = await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, null)
            const result2 = await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, undefined)
            const result3 = await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, '')

            expect(result1.payload.description).toBe('No cantrip selected.')
            expect(result2.payload.description).toBe('No cantrip selected.')
            expect(result3.payload.description).toBe('No cantrip selected.')
        })

        it('logs an ability_use entry with the correct description format', async () => {
            const { addEntry } = await import('../../../ui/logService.js')

            const action = makeAction({ name: 'Improved War Magic' })
            await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, 'Shocking Grasp')

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, {
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Improved War Magic',
                description: 'Improved War Magic: Replaced attack with cantrip "Shocking Grasp"',
            })
        })

        it('uses playerStats.name for the characterName in the log entry', async () => {
            const { addEntry } = await import('../../../ui/logService.js')

            const action = makeAction()
            await confirmWarMagicCantrip(action, makePlayerStats({ name: 'CustomName' }), mockCampaignName, 'Ray of Frost')

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
                characterName: 'CustomName',
            }))
        })

        it('does not throw when addEntry rejects', async () => {
            const { addEntry } = await import('../../../ui/logService.js')
            addEntry.mockRejectedValue(new Error('log failed'))

            const action = makeAction()
            const result = await confirmWarMagicCantrip(action, makePlayerStats(), mockCampaignName, 'Ray of Frost')

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
        })
    })
})
