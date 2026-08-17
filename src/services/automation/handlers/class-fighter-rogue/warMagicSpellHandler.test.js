// @improved-by-ai
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
        it('returns a modal with filtered spell options and details', async () => {
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

        it('filters out cantrips (level 0) from options', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeCantrip({ name: 'Ray of Frost' }),
                makeSpell({ name: 'Burning Hands' }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('filters out spells above maxSpellLevel from options', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands', level: 1 }),
                makeLevel3Spell({ name: 'Fireball' }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('returns an info popup when the spell list is null', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue(null)

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No Wizard spells available.')
        })

        it('returns an info popup when the spell list is empty', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([])

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

        it('defaults spellListKey to "wizard_spells" when automation has no spellList', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell()])

            const result = await handle(
                makeAction({ automation: { type: 'war_magic_spell' } }),
                makePlayerStats(),
                mockCampaignName
            )

            expect(result.payload.spellListKey).toBe('wizard_spells')
        })

        it('uses custom spellListKey when specified', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell()])

            const result = await handle(
                makeAction({ automation: { type: 'war_magic_spell', spellList: 'sorcerer_spells' } }),
                makePlayerStats(),
                mockCampaignName
            )

            expect(result.payload.spellListKey).toBe('sorcerer_spells')
        })

        it('defaults maxSpellLevel to 2 when not specified in automation', async () => {
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

            expect(result.payload.maxSpellLevel).toBe(2)
            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('defaults casting_time to "1 action" when missing from spell data', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell({ casting_time: undefined })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.optionDetails['Burning Hands'].casting_time).toBe('1 action')
        })

        it('defaults range to empty string when missing from spell data', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell({ range: undefined })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.optionDetails['Burning Hands'].range).toBe('')
        })

        it('defaults description to empty string when missing from spell data', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell({ description: undefined })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.optionDetails['Burning Hands'].description).toBe('')
        })

        it('defaults damage to null when missing from spell data', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell({ damage: undefined })])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.optionDetails['Burning Hands'].damage).toBeNull()
        })

        it('passes the _mapName parameter through without using it', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([makeSpell()])

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                mockCampaignName,
                'battle-map-1'
            )

            expect(result.type).toBe('modal')
            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('filters out spells with undefined level', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands', level: 1 }),
                makeSpell({ name: 'Mystery Spell', level: undefined }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Burning Hands'])
        })

        it('filters out spells with negative level', async () => {
            const { loadSpellData } = await import('../../../ui/dataLoader.js')
            loadSpellData.mockResolvedValue([
                makeSpell({ name: 'Burning Hands', level: 1 }),
                makeSpell({ name: 'Negative Spell', level: -1 }),
            ])

            const result = await handle(makeAction(), makePlayerStats(), mockCampaignName)

            expect(result.payload.options).toEqual(['Burning Hands'])
        })
    })

    describe('confirmWarMagicSpell', () => {
        it('returns a popup with the selected spell and automationType', async () => {
            const action = makeAction({ name: 'Improved War Magic' })
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Burning Hands')

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.name).toBe('Improved War Magic')
            expect(result.payload.automationType).toBe('war_magic_spell')
            expect(result.payload.description).toContain('Burning Hands')
            expect(result.payload.automation).toEqual(action.automation)
        })

        it('renders the spell name as bold HTML in the description', async () => {
            const action = makeAction()
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Web')

            expect(result.payload.description).toContain('<b>Web</b>')
        })

        it('includes the maxSpellLevel in the description', async () => {
            const action = makeAction({ name: 'War Magic' })
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Burning Hands')

            expect(result.payload.description).toContain('level 2')
        })

        it('defaults maxSpellLevel to 2 in the description when not specified', async () => {
            const action = makeAction({ automation: { type: 'war_magic_spell' } })
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Burning Hands')

            expect(result.payload.description).toContain('level 2')
        })

        it('returns an error popup when no spell is selected (null)', async () => {
            const action = makeAction()
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, null)

            expect(result.type).toBe('popup')
            expect(result.payload.type).toBe('automation_info')
            expect(result.payload.description).toBe('No spell selected.')
        })

        it('returns an error popup when no spell is selected (undefined)', async () => {
            const action = makeAction()
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, undefined)

            expect(result.payload.description).toBe('No spell selected.')
        })

        it('returns an error popup when no spell is selected (empty string)', async () => {
            const action = makeAction()
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, '')

            expect(result.payload.description).toBe('No spell selected.')
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

        it('passes action.automation through in the popup payload', async () => {
            const action = makeAction({ automation: { type: 'war_magic_spell', maxSpellLevel: 3, spellList: 'wizard_spells' } })
            const result = await confirmWarMagicSpell(action, makePlayerStats(), mockCampaignName, 'Fireball')

            expect(result.payload.automation).toEqual({ type: 'war_magic_spell', maxSpellLevel: 3, spellList: 'wizard_spells' })
        })
    })
})
