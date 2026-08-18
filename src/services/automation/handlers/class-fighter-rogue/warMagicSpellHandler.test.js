// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handle, confirmWarMagicSpell } from './warMagicSpellHandler.js'

vi.mock('../../../ui/dataLoader.js', () => ({
    loadSpellData: vi.fn(),
    loadWildMagicSurgeTable: vi.fn(async () => []),
}))

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}))

const mockCampaignName = 'test-campaign'

function makeSpell(overrides = {}) {
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

function makeCantrip(overrides = {}) {
    return {
        name: 'Ray of Frost',
        level: 0,
        ...overrides,
    }
}

function makeLevel3Spell(overrides = {}) {
    return {
        name: 'Fireball',
        level: 3,
        ...overrides,
    }
}

function makeAction(overrides = {}) {
    return {
        name: 'War Magic',
        automation: { type: 'war_magic_spell', maxSpellLevel: 2 },
        ...overrides,
    }
}

function makePlayerStats(overrides = {}) {
    return { name: 'TestFighter', rules: '2024', ...overrides }
}

describe('warMagicSpellHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('handle', () => {
        it('returns a modal with filtered spell options and payload structure', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands' }),
                makeSpell({ name: 'Web', level: 2 }),
                makeCantrip(),
                makeLevel3Spell(),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('modal')
            expect(result.modalName).toBe('warMagicSpell')
            expect(result.payload.options).toEqual(['Burning Hands', 'Web'])
            expect(result.payload.spellListKey).toBe('wizard_spells')
            expect(result.payload.maxSpellLevel).toBe(2)
            expect(result.payload.action).toBeInstanceOf(Object)
            expect(result.payload.playerStats).toEqual(makePlayerStats())
            expect(result.payload.campaignName).toBe(mockCampaignName)
        })

        it('includes all spell detail fields in optionDetails', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            const spell = makeSpell({ name: 'Burning Hands' })
            loadSpellData.mockResolvedValue([spell])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            const details = result.payload.optionDetails['Burning Hands']
            expect(details).toEqual({
                name: 'Burning Hands',
                level: 1,
                casting_time: '1 action',
                range: 'Self',
                description: 'A flash of flames.',
                damage: '3d6 fire',
            })
        })

        it('defaults all optional spell fields when missing', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell({
                name: 'Sparse Spell',
                level: 1,
                casting_time: undefined,
                range: undefined,
                description: undefined,
                damage: undefined,
            })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            const details = result.payload.optionDetails['Sparse Spell']
            expect(details.casting_time).toBe('1 action')
            expect(details.range).toBe('')
            expect(details.description).toBe('')
            expect(details.damage).toBeNull()
        })

        it('filters out cantrips and spells above maxSpellLevel', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeCantrip({ name: 'Ray of Frost' }),
                makeSpell({ name: 'Burning Hands', level: 1 }),
                makeLevel3Spell({ name: 'Fireball' }),
                makeSpell({ name: 'Mystery Spell', level: undefined }),
                makeSpell({ name: 'Negative Spell', level: -1 }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('returns an info popup when the spell list is null or empty', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue(null)

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No Wizard spells available.')
        })

        it('returns an info popup when no eligible spells remain after filtering', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeCantrip(), makeLevel3Spell()])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No Wizard spells of level 1-2 available.')
        })

        it('uses custom spellListKey and maxSpellLevel from automation config', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands', level: 1 }),
                makeSpell({ name: 'Fireball', level: 3 }),
            ])

            const result = await handle(
                makeAction({ automation: { type: 'war_magic_spell', maxSpellLevel: 3, spellList: 'sorcerer_spells' } }),
                makePlayerStats(),
                mockCampaignName
            )

            expect(result.payload.spellListKey).toBe('sorcerer_spells')
            expect(result.payload.maxSpellLevel).toBe(3)
            expect(result.payload.options).toEqual(['Burning Hands', 'Fireball'])
        })

        it('defaults spellListKey and maxSpellLevel when automation has no config', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands', level: 2 }),
                makeSpell({ name: 'Fireball', level: 3 }),
            ])

            const result = await handle(
                makeAction({ automation: { type: 'war_magic_spell' } }),
                makePlayerStats(),
                mockCampaignName
            )

            expect(result.payload.spellListKey).toBe('wizard_spells')
            expect(result.payload.maxSpellLevel).toBe(2)
            expect(result.payload.options).toEqual(['Burning Hands'])
        })
    })

    describe('confirmWarMagicSpell', () => {
        it('returns a popup with the selected spell and automation config', async () => {
            const action = makeAction({ automation: { type: 'war_magic_spell', maxSpellLevel: 3, spellList: 'wizard_spells' } })
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Burning Hands')

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.name).toBe('War Magic')
            expect(result.payload.automationType).toBe('war_magic_spell')
            expect(result.payload.description).toContain('<b>Burning Hands</b>')
            expect(result.payload.description).toContain('level 3')
            expect(result.payload.automation).toEqual({ type: 'war_magic_spell', maxSpellLevel: 3, spellList: 'wizard_spells' })
        })

        it('returns an error popup when no spell is selected', async () => {
            const action = makeAction()

            for (const badValue of [null, undefined, '']) {
                const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, badValue)
                expect(result.type).toBe('popup')
                expect(result.payload.type).toBe('automation_info')
                expect(result.payload.description).toBe('No spell selected.')
            }
        })

        it('logs an ability_use entry with the correct description format', async () => {
            const { addEntry } = await import('../../../ui/logService.js')

            const action = makeAction({ name: 'Improved War Magic' })
            await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Shield')

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, {
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Improved War Magic',
                description: 'Improved War Magic: Replaced attack with spell "Shield"',
            })
        })

        it('uses playerStats.name for the characterName in the log entry', async () => {
            const { addEntry } = await import('../../../ui/logService.js')

            const action = makeAction()
            await confirmWarMagicSpell(action, makePlayerStats({ name: 'CustomName' }), mockCampaignName, 'Burning Hands')

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
                characterName: 'CustomName',
            }))
        })

        it('does not throw when addEntry rejects', async () => {
            const { addEntry } = await import('../../../ui/logService.js')
            addEntry.mockRejectedValue(new Error('log failed'))

            const action = makeAction()
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Burning Hands')

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
        })
    })
})
