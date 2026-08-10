import { cloneDeep } from 'lodash'
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { loadMonsters } from '../../services/ui/dataLoader.js'
import { npcToMonsterFormat } from '../../services/encounters/npcStatBlockUtils.js'
import { getCombatSummary } from '../../services/encounters/combatData.js'
import { getMonsterData } from '../../services/npcs/monsterUtils.js'

/**
 * Builds the handleNpcClick handler for the initiative component.
 * Handles clicking on creatures to view their stat blocks (Wild Shape, Polymorph, Shapechange, etc.)
 */
export function createNpcClickHandler({
    isLocalhost,
    campaignNpcs,
    campaignName,
    characters,
    setViewingMonster,
    setViewingMonsterCreatureName,
}) {
    return async function handleNpcClick(creature, options = {}) {
        const { allowNonLocalhost = false } = options
        if (!isLocalhost && !allowNonLocalhost) return
        const npc = campaignNpcs.find(n => n.name?.toLowerCase() === creature.name?.toLowerCase())
        if (npc) {
            const formatted = npcToMonsterFormat(npc)
            if (formatted) {
                setViewingMonster(formatted)
                setViewingMonsterCreatureName(creature.name)
                return
            }
        }

        const combatSummary = getCombatSummary(campaignName)
        const runtimeCreature = combatSummary?.creatures?.find(c => c.name === creature.name)

        // Wild Shape form
        if (runtimeCreature?.wildShapeSource && runtimeCreature.beastIndex) {
            const monsters = await loadMonsters()
            const baseMonster = monsters.find(m => m.index === runtimeCreature.beastIndex)
            if (baseMonster) {
                const merged = cloneDeep(baseMonster)
                merged.name = runtimeCreature.beastName || baseMonster.name
                merged.hit_points = getRuntimeValue(creature.name, 'currentHitPoints', campaignName) ?? creature.currentHp
                const circleFormsAC = getRuntimeValue(creature.name, 'circleFormsAC') ?? null
                if (circleFormsAC != null) {
                    merged.armor_class = circleFormsAC
                }
                const druidCharacter = characters.find(c => c.name === runtimeCreature.wildShapeSource || c.name.startsWith(runtimeCreature.wildShapeSource + ' '))
                if (druidCharacter) {
                    const druidAbilities = druidCharacter.computedStats?.abilities || druidCharacter.abilities || []
                    const intScore = druidAbilities.find(a => a.name === 'Intelligence')?.score
                    const wisScore = druidAbilities.find(a => a.name === 'Wisdom')?.score
                    const chaScore = druidAbilities.find(a => a.name === 'Charisma')?.score
                    if (intScore != null) merged.ability_scores.int = intScore
                    if (wisScore != null) merged.ability_scores.wis = wisScore
                    if (chaScore != null) merged.ability_scores.cha = chaScore
                    const druidLanguages = druidCharacter.computedStats?.languages || druidCharacter.languages
                    if (druidLanguages) merged.languages = Array.isArray(druidLanguages) ? druidLanguages.join(', ') : druidLanguages
                }
                const isMoonDruid = druidCharacter?.computedStats?.class?.major?.name === 'Circle of the Moon' || druidCharacter?.computedStats?.class?.subclass?.name === 'Circle of the Moon'
                const beastSaves = {}
                for (const abbr of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
                    if (baseMonster.saving_throws?.[abbr]?.modifier != null) {
                        beastSaves[abbr] = baseMonster.saving_throws[abbr].modifier
                    } else if (baseMonster.ability_score_modifiers?.[abbr] != null) {
                        beastSaves[abbr] = baseMonster.ability_score_modifiers[abbr]
                    }
                }
                merged.saving_throws = {}
                for (const [abbr, mod] of Object.entries(beastSaves)) {
                    merged.saving_throws[abbr] = { modifier: mod }
                }
                if (isMoonDruid && druidCharacter) {
                    const druidAbilities = druidCharacter.computedStats?.abilities || druidCharacter.abilities || []
                    const wisScore = druidAbilities.find(a => a.name === 'Wisdom')?.score
                    const wisMod = Math.floor(((wisScore ?? 10) - 10) / 2)
                    merged.saving_throws.con.modifier = beastSaves.con + wisMod
                }
                for (const action of merged.actions || []) {
                    if (action.attack_bonus != null) {
                        action.damage_type_primary = 'Radiant'
                        if (action.damage_type_secondary) {
                            action.damage_type_secondary = 'Radiant'
                        }
                        if (action.description) {
                            action.description = action.description.replace(/\b([A-Za-z]+) damage\b/gi, 'Radiant damage')
                        }
                    }
                }
                if (runtimeCreature.lunarFormAction) {
                    merged.actions = [...(merged.actions || []), runtimeCreature.lunarFormAction]
                }
                setViewingMonster(merged)
                setViewingMonsterCreatureName(creature.name)
                return
            }
        }

        // Polymorph form
        if (runtimeCreature && runtimeCreature.polymorphSource && runtimeCreature.polymorphBeast?.index) {
            const monsters = await loadMonsters()
            const baseMonster = monsters.find(m => m.index === runtimeCreature.polymorphBeast.index)
            if (baseMonster) {
                const merged = cloneDeep(baseMonster)
                merged.name = runtimeCreature.beastName || baseMonster.name
                merged.hit_points = getRuntimeValue(creature.name, 'currentHitPoints', campaignName) ?? creature.currentHp
                merged.armor_class = runtimeCreature.ac
                merged.type = 'beast'
                merged.size = runtimeCreature.size || baseMonster.size
                merged.challenge_rating = runtimeCreature.polymorphBeast.challengeRating || baseMonster.challenge_rating
                if (runtimeCreature.speed) {
                    merged.speed = runtimeCreature.speed
                }
                const polymorphTempHp = getRuntimeValue(creature.name, 'polymorphTempHp', campaignName)
                if (typeof polymorphTempHp === 'number' && polymorphTempHp > 0) {
                    merged.hit_points_temp = polymorphTempHp
                }
                const casterName = runtimeCreature.polymorphSource
                const druidCharacter = characters.find(c => c.name === casterName || c.name.startsWith(casterName + ' '))
                if (druidCharacter) {
                    const druidAbilities = druidCharacter.computedStats?.abilities || druidCharacter.abilities || []
                    const intScore = druidAbilities.find(a => a.name === 'Intelligence')?.score
                    const wisScore = druidAbilities.find(a => a.name === 'Wisdom')?.score
                    const chaScore = druidAbilities.find(a => a.name === 'Charisma')?.score
                    if (intScore != null) merged.ability_scores.int = intScore
                    if (wisScore != null) merged.ability_scores.wis = wisScore
                    if (chaScore != null) merged.ability_scores.cha = chaScore
                    const druidLanguages = druidCharacter.computedStats?.languages || druidCharacter.languages
                    if (druidLanguages) merged.languages = Array.isArray(druidLanguages) ? druidLanguages.join(', ') : druidLanguages
                }
                const beastSaves = {}
                for (const abbr of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
                    if (baseMonster.saving_throws?.[abbr]?.modifier != null) {
                        beastSaves[abbr] = baseMonster.saving_throws[abbr].modifier
                    } else if (baseMonster.ability_score_modifiers?.[abbr] != null) {
                        beastSaves[abbr] = baseMonster.ability_score_modifiers[abbr]
                    }
                }
                merged.saving_throws = {}
                for (const [abbr, mod] of Object.entries(beastSaves)) {
                    merged.saving_throws[abbr] = { modifier: mod }
                }
                for (const action of merged.actions || []) {
                    if (action.attack_bonus != null) {
                        action.damage_type_primary = 'Radiant'
                        if (action.damage_type_secondary) {
                            action.damage_type_secondary = 'Radiant'
                        }
                        if (action.description) {
                            action.description = action.description.replace(/\b([A-Za-z]+) damage\b/gi, 'Radiant damage')
                        }
                    }
                }
                setViewingMonster(merged)
                setViewingMonsterCreatureName(creature.name)
                return
            }
        }

        // Shapechange form
        if (runtimeCreature && runtimeCreature.shapechangeSource && runtimeCreature.shapechangeForm?.index) {
            const monsters = await loadMonsters()
            const baseMonster = monsters.find(m => m.index === runtimeCreature.shapechangeForm.index)
            if (baseMonster) {
                const merged = cloneDeep(baseMonster)
                merged.name = runtimeCreature.formName || baseMonster.name
                merged.hit_points = getRuntimeValue(creature.name, 'currentHitPoints', campaignName) ?? creature.currentHp
                merged.armor_class = runtimeCreature.ac
                merged.size = runtimeCreature.size || baseMonster.size
                merged.challenge_rating = runtimeCreature.shapechangeForm.challengeRating || baseMonster.challenge_rating
                if (runtimeCreature.speed) {
                    merged.speed = runtimeCreature.speed
                }
                const shapechangeTempHp = getRuntimeValue(creature.name, 'shapechangeTempHp', campaignName)
                if (typeof shapechangeTempHp === 'number' && shapechangeTempHp > 0) {
                    merged.hit_points_temp = shapechangeTempHp
                }
                const casterName = runtimeCreature.shapechangeSource
                const druidCharacter = characters.find(c => c.name === casterName || c.name.startsWith(casterName + ' '))
                if (druidCharacter) {
                    const druidAbilities = druidCharacter.computedStats?.abilities || druidCharacter.abilities || []
                    const intScore = druidAbilities.find(a => a.name === 'Intelligence')?.score
                    const wisScore = druidAbilities.find(a => a.name === 'Wisdom')?.score
                    const chaScore = druidAbilities.find(a => a.name === 'Charisma')?.score
                    if (intScore != null) merged.ability_scores.int = intScore
                    if (wisScore != null) merged.ability_scores.wis = wisScore
                    if (chaScore != null) merged.ability_scores.cha = chaScore
                    const druidLanguages = druidCharacter.computedStats?.languages || druidCharacter.languages
                    if (druidLanguages) merged.languages = Array.isArray(druidLanguages) ? druidLanguages.join(', ') : druidLanguages
                }
                const beastSaves = {}
                for (const abbr of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
                    if (baseMonster.saving_throws?.[abbr]?.modifier != null) {
                        beastSaves[abbr] = baseMonster.saving_throws[abbr].modifier
                    } else if (baseMonster.ability_score_modifiers?.[abbr] != null) {
                        beastSaves[abbr] = baseMonster.ability_score_modifiers[abbr]
                    }
                }
                merged.saving_throws = {}
                for (const [abbr, mod] of Object.entries(beastSaves)) {
                    merged.saving_throws[abbr] = { modifier: mod }
                }
                for (const action of merged.actions || []) {
                    if (action.attack_bonus != null) {
                        action.damage_type_primary = 'Radiant'
                        if (action.damage_type_secondary) {
                            action.damage_type_secondary = 'Radiant'
                        }
                        if (action.description) {
                            action.description = action.description.replace(/\b([A-Za-z]+) damage\b/gi, 'Radiant damage')
                        }
                    }
                }
                setViewingMonster(merged)
                setViewingMonsterCreatureName(creature.name)
                return
            }
        }

        // Regular monster from campaign data
        if (runtimeCreature && runtimeCreature.monsterIndex) {
            const monsters = await loadMonsters()
            const baseMonster = monsters.find(m => m.index === runtimeCreature.monsterIndex)
            if (baseMonster) {
                const merged = cloneDeep(baseMonster)
                merged.name = runtimeCreature.name
                merged.armor_class = runtimeCreature.ac
                merged.hit_points = runtimeCreature.currentHp
                merged.type = runtimeCreature.type
                merged.size = runtimeCreature.size
                if (runtimeCreature.speed) {
                    merged.speed = runtimeCreature.speed
                }
                if (runtimeCreature.saveBonuses && baseMonster.saving_throws) {
                    for (const [abbr, bonus] of Object.entries(runtimeCreature.saveBonuses)) {
                        if (merged.saving_throws?.[abbr]) {
                            merged.saving_throws[abbr].modifier = bonus
                        }
                    }
                }
                if (runtimeCreature.resistances) {
                    merged.damage_resistances = runtimeCreature.resistances
                }
                if (runtimeCreature.immunities) {
                    merged.damage_immunities = runtimeCreature.immunities
                }
                if (runtimeCreature.actions) {
                    merged.actions = runtimeCreature.actions
                }
                if (runtimeCreature.wildShapeSource) {
                    const druidCharacter = characters.find(c => c.name === runtimeCreature.wildShapeSource || c.name.startsWith(runtimeCreature.wildShapeSource + ' '))
                    if (druidCharacter) {
                        const druidAbilities = druidCharacter.computedStats?.abilities || druidCharacter.abilities || []
                        const intScore = druidAbilities.find(a => a.name === 'Intelligence')?.score
                        const wisScore = druidAbilities.find(a => a.name === 'Wisdom')?.score
                        const chaScore = druidAbilities.find(a => a.name === 'Charisma')?.score
                        if (intScore != null) merged.ability_scores.int = intScore
                        if (wisScore != null) merged.ability_scores.wis = wisScore
                        if (chaScore != null) merged.ability_scores.cha = chaScore
                        const druidLanguages = druidCharacter.computedStats?.languages || druidCharacter.languages
                        if (druidLanguages) merged.languages = Array.isArray(druidLanguages) ? druidLanguages.join(', ') : druidLanguages
                    }
                }
                setViewingMonster(merged)
                setViewingMonsterCreatureName(creature.name)
                return
            }
        }

        // Fallback: external monster data
        const monster = await getMonsterData(creature.name)
        if (monster) {
            setViewingMonster(monster)
            setViewingMonsterCreatureName(creature.name)
        }
    }
}
