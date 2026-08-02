import React from 'react'
import { cloneDeep } from 'lodash'
import useSSEEqualityGuard from '../../hooks/runtime/useSSEEqualityGuard.js'
import utils from '../../services/ui/utils.js'
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js'
import { useSyncedState } from '../../hooks/runtime/useSyncedState.js'
import storage from '../../services/ui/storage.js'
import { clearDeathSavePrompt, clearFleshToStonePrompt } from '../../services/combat/conditions/savePromptService.js'
import { getMonsterImageUrl, getMonsterData } from '../../services/npcs/monsterUtils.js'
import { getAbilityLabel, CONDITIONS } from '../../services/combat/conditions/conditionUtils.js'
import { generateLootFromCombatSummary } from '../../services/items/lootGenerator.js'
import * as logService from '../../services/ui/logService.js'

// INITIATIVE RESET (initiative component): When advancing to a new round or rolling
// initiative from the initiative panel, reset once-per-turn trackers for player creatures
// using setRuntimeValue(creature.name, '_TrackerName_usedRound', null, campaignName)
// inside the initiative-rolled handler and handleNextCreature round-increment block.
import { loadNPCs } from '../../services/npcs/npcsService.js'
import { npcToMonsterFormat, npcHasStatBlock } from '../../services/encounters/npcStatBlockUtils.js'
import { expireStaleEffects, applyTurnStartEffects, clearExpirationEffects } from '../../services/rules/effects/expirations.js'
import { loadCombatSummary, getCombatSummary, getActiveCreatureName, setCombatSummaryCache } from '../../services/encounters/combatData.js'
import { clearPerRoundMajestyTrackers } from '../../services/combat/auras/unbreakableMajesty.js'
import {
    setupCreatures,
    addNpc,
    removeNpc,
    getNextCreatureName,
    getPreviousCreatureName,
    isPreviousDisabled,
    setInitiative,
    renameNpc,
    setTarget,
    clearCombat,
    mergeCombatSummaryWithCharacters,
} from '../../services/encounters/initiativeService.js'
import {
    rollConditionSave,
    removeCondition,
    addCondition,
    buildConditionPopup,
} from '../../services/combat/conditions/conditionSaveService.js'
import {
    rollConcentrationSave,
    breakConcentration,
    addConcentration,
    buildConcentrationPopup,
    cleanupConcentrationEffects,
} from '../../services/combat/concentration/concentrationService.js'
import {
    logConditionEvent,
    logConcentrationSave,
    logConditionSave,
} from '../../services/encounters/combatLoggingService.js'
import MonsterCardModal from '../encounter/MonsterCardModal.jsx'
import Subscriber from '../common/Subscriber.jsx'
import Popup from '../common/popup.jsx'
import DiceRollResult from '../char-sheet/DiceRollResult.jsx'
import CreatureCard from './CreatureCard.jsx'
import EffectAdder from './EffectAdder.jsx'
import './initiative.css'

function Initiative({ characters, campaignName, onNpcsChange, isLocalhost, mapName }) {
    const [combatSummary, setCombatSummary] = React.useState(null)
    const setCombatSummaryG = useSSEEqualityGuard(setCombatSummary)
    const [numOfNpc, setNumOfNpc] = React.useState(0)
    const [activeCreatureName, setActiveCreatureName] = React.useState(null)
    const activeCreatureNameRef = React.useRef(null)
    const lastAppliedTurnStartCreatureRef = React.useRef(null)

    // Restore last-applied turn-start creature from runtime store so it survives remount
    React.useEffect(() => {
        if (combatSummary?.lastAppliedTurnStartCreature) {
            lastAppliedTurnStartCreatureRef.current = combatSummary.lastAppliedTurnStartCreature
        }
        const stored = getRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature')
        if (stored) {
            lastAppliedTurnStartCreatureRef.current = stored
        }
    }, [campaignName, combatSummary])
    const setActiveCreatureNameG = useSSEEqualityGuard(setActiveCreatureName)
    const [npcImages, setNpcImages] = React.useState({})
    const [viewingMonster, setViewingMonster] = useSyncedState(campaignName, 'combat-ui-viewingMonster', null, campaignName)
    const [viewingMonsterCreatureName, setViewingMonsterCreatureName] = useSyncedState(campaignName, 'combat-ui-viewingMonsterCreatureName', null, campaignName)
    const carouselRef = React.useRef(null)
    const combatSummaryRef = React.useRef(null)
    combatSummaryRef.current = combatSummary

    React.useEffect(() => {
        setCombatSummaryCache(combatSummary, campaignName)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [combatSummary])

    const [conditionPopup, setConditionPopup] = React.useState(null)

    const [effectAdderTarget, setEffectAdderTarget] = useSyncedState(campaignName, 'combat-ui-effectAdderTarget', null, campaignName)
    const [effectAdderTab, setEffectAdderTab] = React.useState('conditions')

    const [campaignNpcs, setCampaignNpcs] = React.useState([])

    const [overlays, setOverlays] = React.useState([])

    const [turnStartTick, setTurnStartTick] = React.useState(0)
    const [runtimeStateTick, setRuntimeStateTick] = React.useState(0)

    const [lootData, setLootData] = React.useState({ lootEntries: [], totalEncounterXp: 0 })
    const [generatingLoot, setGeneratingLoot] = React.useState(false)
    const [lootTextValue, setLootTextValue] = React.useState('')
    const [showAwardLoot, setShowAwardLoot] = React.useState(false)
    const [awardingLoot, setAwardingLoot] = React.useState(false)

    const displayCreatures = React.useMemo(() => {
        if (!combatSummary || !combatSummary.creatures) return []
        return combatSummary.creatures.map(c => {
            const runtimeConditions = getRuntimeValue(c.name, 'activeConditions') || []
            const conditionMeta = getRuntimeValue(c.name, 'activeConditionMeta') || {}
            const csConditions = c.conditions || []
            const conditions = runtimeConditions.map((key, i) => {
                const condKey = String(key).toLowerCase()
                const meta = conditionMeta[condKey]
                const csMatch = csConditions.find(cs => String(cs.key).toLowerCase() === condKey)
                return {
                    id: `runtime-${key}-${i}`,
                    key,
                    label: csMatch?.label || (key === 'speed_zero' ? 'Speed 0' : key.charAt(0).toUpperCase() + key.slice(1)),
                    dc: (meta?.dc ?? csMatch?.dc) || 0,
                    ability: (meta?.ability ?? csMatch?.ability) || 'con',
                }
            })
            if (c.type !== 'player') {
                return {
                    ...c,
                    conditions,
                }
            }
            const character = characters.find(ch => utils.getName(ch.name) === c.name)
            const stats = character?.computedStats || character
            const maxHp = getRuntimeValue(c.name, 'hitPoints') ?? stats?.hitPoints ?? 0
            const currentHp = getRuntimeValue(c.name, 'currentHitPoints') ?? maxHp
            const activeBuffs = getRuntimeValue(c.name, 'activeBuffs') || []
            const shieldOfFaithBonus = Array.isArray(activeBuffs) && activeBuffs.some(b => b.effect === 'shield_of_faith') ? 2 : 0
            const barkskinActive = Array.isArray(activeBuffs) && activeBuffs.some(b => b.effect === 'barkskin')
            return {
                ...c,
                imagePath: character?.imagePath || '',
                ac: barkskinActive ? 17 : (stats?.armorClass ?? 10) + shieldOfFaithBonus,
                resistances: stats?.resistances || [],
                immunities: stats?.immunities || [],
                currentHp,
                maxHp,
                conditions,
            }
        })
    }, [combatSummary, characters, turnStartTick]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!campaignName) return
        loadNPCs(campaignName).then(response => {
            const withStats = (response.npcs || []).filter(npcHasStatBlock)
            setCampaignNpcs(withStats)
        }).catch((e) => { console.error("[initiative] Error:", e); throw e; })
    }, [campaignName])

    const handleOverlayEvent = React.useCallback((event) => {
        if (!event || !event.key || !event.key.startsWith('spell-overlay-')) return
        if (event.key !== `spell-overlay-${campaignName}`) return
        const { action, overlays: newOverlays, overlayId } = event.data || {}
        switch (action) {
            case 'add':
                if (newOverlays?.length) {
                    setOverlays(prev => {
                        const existingIds = new Set(prev.map(o => o.id))
                        const unique = newOverlays.filter(n => !existingIds.has(n.id))
                        return unique.length ? [...prev, ...unique] : prev
                    })
                }
                break
            case 'update':
                if (newOverlays?.length) {
                    setOverlays(prev => prev.map(o => {
                        const replacement = newOverlays.find(n => n.id === o.id)
                        return replacement || o
                    }))
                }
                break
            case 'remove':
                if (overlayId) {
                    setOverlays(prev => prev.filter(o => o.id !== overlayId))
                }
                break
            case 'clear':
                setOverlays([])
                break
            default:
                break
        }
    }, [campaignName])

      /**
       * WARNING: SSE re-render loop risk
       * All setters in this handler use equality guards (useSSEEqualityGuard).
       */
    const handleEvent = React.useCallback((event) => {
        if (event.key == null || event.data == null) return

        if (event.key.startsWith('spell-overlay-')) {
            handleOverlayEvent(event)
            return
        }

        if (!event.key.startsWith(`change-${campaignName}-`)) return

        const dataKey = event.key.slice(`change-${campaignName}-`.length)
        if (dataKey === 'combatSummary') {
            if (!event.data?.creatures) return
            const merged = { ...event.data }
            if (!merged.activeCreatureName) {
                const activeName = getActiveCreatureName(campaignName)
                if (activeName) {
                    merged.activeCreatureName = activeName
                }
            }
            combatSummaryRef.current = merged
            setCombatSummaryCache(merged, campaignName)
            setCombatSummaryG(merged)
            if (merged.round !== (combatSummaryRef.current?.round ?? 1)) {
                expireStaleEffects(campaignName, merged.activeCreatureName || null)
            }
        } else if (dataKey === 'lastAttack') {
            // lastAttack is now a root-level key — no in-memory cache needed
            // The runtime store handles sync via getRuntimeValue/setRuntimeValue
        } else if (dataKey === 'activeCreatureName') {
               const prevActive = activeCreatureNameRef.current
               const newActive = event.data
               activeCreatureNameRef.current = newActive
               const cs = combatSummaryRef.current || getCombatSummary(campaignName)
               if (cs) {
                   cs.activeCreatureName = newActive
                   setCombatSummaryCache(cs, campaignName)
               }
               setActiveCreatureNameG(newActive)
               expireStaleEffects(campaignName, newActive)
              // Only apply turn-start effects when the active creature actually changes
              // (not on SSE snapshot re-sync where the creature is the same)
              const lastApplied = lastAppliedTurnStartCreatureRef.current
              const shouldApply = prevActive !== event.data && lastApplied !== event.data
               if (shouldApply) {
                   lastAppliedTurnStartCreatureRef.current = event.data
                  // Persist to runtime store so it survives remount (sync access)
                  setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', event.data, campaignName)
                  // Also persist to server so it syncs to all clients
                  storage.set('lastAppliedTurnStartCreature', event.data, campaignName)
                  const cs = combatSummaryRef.current
                  if (cs && cs.lastAppliedTurnStartCreature !== event.data) {
                      cs.lastAppliedTurnStartCreature = event.data
                      setCombatSummary(cloneDeep(cs))
                  }
                  const newActiveChar = characters.find(ch => utils.getName(ch.name) === utils.getName(event.data))
                  applyTurnStartEffects(event.data, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                   setTurnStartTick(t => t + 1)
               }
           } else if (!['log', 'spell-overlay'].includes(dataKey)) {
               // Any character-level change (vowOfEnmityTarget, activeBuffs, etc.) triggers a re-render
               // so ConditionEffectBadges picks up the updated runtime state
               setRuntimeStateTick(t => t + 1)
           }
        }, [campaignName, characters, handleOverlayEvent, setCombatSummaryG, setActiveCreatureNameG])

    React.useEffect(() => {
        if (!combatSummary) return
        let cancelled = false
        const npcs = combatSummary.creatures.filter(c => c.type !== 'player')
        const promises = npcs.map(async (creature) => {
            if (creature.imagePath) return { name: creature.name, url: null }
            const url = await getMonsterImageUrl(creature.name, campaignNpcs, campaignName)
            return { name: creature.name, url }
        })
        Promise.all(promises).then(results => {
            if (cancelled) return
            const newImages = {}
            results.forEach(({ name, url }) => { newImages[name] = url })
            setNpcImages(newImages)
        })
        return () => { cancelled = true }
    }, [combatSummary, campaignNpcs, campaignName])

    const handleAddNpc = React.useCallback(() => {
        if (!combatSummary) return
        const nextNum = addNpc(combatSummary)
        setNumOfNpc(nextNum)
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
    }, [combatSummary, campaignName])

    const handleRemoveNpc = React.useCallback((creatureName) => {
        if (!combatSummary) return
        const creature = combatSummary.creatures.find(c => c.name === creatureName)
        if (!creature || creature.type === 'player') return

        const needsConfirmation = creature.currentHp > 0 || creature.initiative !== ''
        if (needsConfirmation) {
            const msg = creature.currentHp > 0
                ? `${creature.name} has ${creature.currentHp} HP. Remove anyway?`
                : `${creature.name} has initiative assigned. Remove anyway?`
            if (!window.confirm(msg)) return
        }

        removeNpc(combatSummary, creatureName)
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
    }, [combatSummary, campaignName])

    const isPrevDisabled = isPreviousDisabled(combatSummary, activeCreatureName)

      const handleNextCreature = React.useCallback(() => {
            const cs = combatSummaryRef.current
            if (!cs) return
            const { newActiveName, roundIncrement } = getNextCreatureName(cs, activeCreatureName)
            if (!roundIncrement) {
                 storage.set('activeCreatureName', newActiveName, campaignName)
                setActiveCreatureName(newActiveName)
              } else {
                cs.round++
                storage.set('combatSummary', cs, campaignName)
                setCombatSummary(cloneDeep(cs))
                storage.set('activeCreatureName', newActiveName, campaignName)
                 setActiveCreatureName(newActiveName)
                  for (const creature of cs.creatures) {
                      clearPerRoundMajestyTrackers(creature.name, campaignName)
                      if (creature.type === 'player') {
                           setRuntimeValue(creature.name, '_cunningStrikeCostUsed', 0, campaignName);
                           setRuntimeValue(creature.name, '_CunningStrike_usedRound', null, campaignName);
                           setRuntimeValue(creature.name, '_Charge_Attack_usedRound', null, campaignName);
                           setRuntimeValue(creature.name, '_FastHands_usedRound', null, campaignName);
                           setRuntimeValue(creature.name, '_CunningAction_usedRound', null, campaignName);
                           setRuntimeValue(creature.name, '_Cleave_UsedRound', null, campaignName);
                           setRuntimeValue(creature.name, '_Nick_UsedRound', null, campaignName);
                           setRuntimeValue(creature.name, 'surgeUsedRound', null, campaignName);
                           setRuntimeValue(creature.name, 'illusoryRealityUsedRound', null, campaignName);
                           setRuntimeValue(creature.name, 'portentUsedThisTurn', null, campaignName);
                           setRuntimeValue(creature.name, 'psionicStrikeUsedThisTurn', null, campaignName);
                             setRuntimeValue(creature.name, '_BrutalStrike_usedRound', null, campaignName);
                             setRuntimeValue(creature.name, '_fortifiedHealth_usedRound', null, campaignName);
                             setRuntimeValue(creature.name, '_Shield_Bash_usedRound', null, campaignName);
                             setRuntimeValue(creature.name, 'piercerPunctureUsedThisTurn', null, campaignName);
                       }
                  }
              }
              expireStaleEffects(campaignName, newActiveName)
              const lastApplied = lastAppliedTurnStartCreatureRef.current
              if (lastApplied !== newActiveName) {
                  lastAppliedTurnStartCreatureRef.current = newActiveName
                  setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', newActiveName, campaignName)
                  storage.set('lastAppliedTurnStartCreature', newActiveName, campaignName)
                  const cs = combatSummaryRef.current
                  if (cs && cs.lastAppliedTurnStartCreature !== newActiveName) {
                      cs.lastAppliedTurnStartCreature = newActiveName
                      setCombatSummary(cloneDeep(cs))
                  }
                  const newActiveChar = characters.find(ch => utils.getName(ch.name) === utils.getName(newActiveName))
                  applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                  setTurnStartTick(t => t + 1)
              }
             }, [activeCreatureName, campaignName, characters])

    const handlePreviousCreature = React.useCallback(() => {
          if (isPrevDisabled) return
          const cs = combatSummaryRef.current
          if (!cs) return
           const { newActiveName, roundDecrement } = getPreviousCreatureName(cs, activeCreatureName)
           if (!roundDecrement) {
               storage.set('activeCreatureName', newActiveName, campaignName)
              setActiveCreatureName(newActiveName)
             } else {
               if (cs.round > 1) {
                   cs.round--
                  storage.set('combatSummary', cs, campaignName)
                  setCombatSummary(cloneDeep(cs))
                 }
               storage.set('activeCreatureName', newActiveName, campaignName)
              setActiveCreatureName(newActiveName)
             }
                expireStaleEffects(campaignName, newActiveName)
               const lastApplied = lastAppliedTurnStartCreatureRef.current
               if (lastApplied !== newActiveName) {
                   lastAppliedTurnStartCreatureRef.current = newActiveName
                   setRuntimeValue('__initiative__', 'lastAppliedTurnStartCreature', newActiveName, campaignName)
                   storage.set('lastAppliedTurnStartCreature', newActiveName, campaignName)
                   const cs = combatSummaryRef.current
                   if (cs && cs.lastAppliedTurnStartCreature !== newActiveName) {
                       cs.lastAppliedTurnStartCreature = newActiveName
                       setCombatSummary(cloneDeep(cs))
                   }
                   const newActiveChar = characters.find(ch => utils.getName(ch.name) === utils.getName(newActiveName))
                   applyTurnStartEffects(newActiveName, newActiveChar?.computedStats || newActiveChar, campaignName, characters)
                   setTurnStartTick(t => t + 1)
               }
              }, [activeCreatureName, campaignName, isPrevDisabled, characters])

    React.useEffect(() => {
        let cancelled = false
        ;(async () => {
            const initialSummary = await loadCombatSummary(campaignName)

            if (initialSummary && initialSummary.creatures) {
                const merged = mergeCombatSummaryWithCharacters(initialSummary, characters, utils.getName)

                if (cancelled) return
                const npcCount = merged.creatures.filter(c => c.type === 'npc').length
                setNumOfNpc(npcCount)

                storage.set('combatSummary', merged, campaignName)
                setCombatSummary(merged)
                combatSummaryRef.current = merged

                if (!activeCreatureNameRef.current) {
                    const activeName = getActiveCreatureName(campaignName)
                    if (activeName) {
                        setActiveCreatureName(activeName)
                        activeCreatureNameRef.current = activeName
                    } else {
                        const firstCreature = merged.creatures[0]?.name || null
                        setActiveCreatureName(firstCreature)
                        activeCreatureNameRef.current = firstCreature
                    }
                }
            } else {
                if (cancelled) return
                const creatures = setupCreatures(characters, numOfNpc, utils.getName)
                const newSummary = { round: 1, creatures }
                const firstName = creatures[0]?.name
                storage.set('combatSummary', newSummary, campaignName)
                setCombatSummary(newSummary)
                combatSummaryRef.current = newSummary
                storage.set('activeCreatureName', firstName, campaignName)
                setActiveCreatureName(firstName)
                activeCreatureNameRef.current = firstName
            }
        })()
        return () => { cancelled = true }
    }, [campaignName]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!combatSummary || !onNpcsChange) return
        const npcList = combatSummary.creatures
            .filter(c => c.type === 'npc')
            .map(c => ({ name: c.name, type: 'npc', imageUrl: npcImages[c.name] || null }))
        onNpcsChange(npcList)
    }, [combatSummary, onNpcsChange, npcImages])

    React.useEffect(() => {
        if (!combatSummary) return
        const handleKeyDown = (event) => {
            if (event.key === 'ArrowRight') {
                event.preventDefault()
                handleNextCreature()
              } else if (event.key === 'ArrowLeft' && !isPrevDisabled) {
                event.preventDefault()
                handlePreviousCreature()
              } else if (event.key === '+') {
                event.preventDefault()
                handleAddNpc()
              }
          }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
          }, [combatSummary, activeCreatureName]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!carouselRef.current || !activeCreatureName) return
        activeCreatureNameRef.current = activeCreatureName
        const activeCard = carouselRef.current.querySelector('.creature-card.active')
        if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [activeCreatureName])

    React.useEffect(() => {
        const handler = () => {
            const summary = getCombatSummary(campaignName)
            if (summary && JSON.stringify(summary) !== JSON.stringify(combatSummaryRef.current)) {
                combatSummaryRef.current = summary
                setCombatSummary(summary)
            }
        }
        window.addEventListener('combat-summary-updated', handler)
        return () => {
            window.removeEventListener('combat-summary-updated', handler)
          }
      }, [campaignName])

    React.useEffect(() => {
        const handler = () => {
            const summary = getCombatSummary(campaignName)
            if (!summary) return
            combatSummaryRef.current = summary
            let clearedHuntersMark = false
            for (const creature of (summary?.creatures || [])) {
                if (creature.type === 'player') {
                    setRuntimeValue(creature.name, 'activeBuffs', [], campaignName)
                    setRuntimeValue(creature.name, 'invokeDuplicityAdvantageTargets', [], campaignName)
                    setRuntimeValue(creature.name, 'unbreakableMajestyActive', null, campaignName)
                    setRuntimeValue(creature.name, 'unbreakableMajestySaveDc', null, campaignName)
                    setRuntimeValue(creature.name, 'wrathOfTheSeaActive', null, campaignName)
                    setRuntimeValue(creature.name, 'wrathOfTheSeaDc', null, campaignName)
                    setRuntimeValue(creature.name, 'wrathOfTheSeaWisMod', null, campaignName)
                    setRuntimeValue(creature.name, 'wrathOfTheSeaSource', null, campaignName)
                    setRuntimeValue(creature.name, 'peerlessAthleteActive', null, campaignName)
                    setRuntimeValue(creature.name, 'elementalAttunementActive', null, campaignName)
                    setRuntimeValue(creature.name, 'elementalAttunementElement', null, campaignName)
                    setRuntimeValue(creature.name, '_CunningStrike_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Charge_Attack_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_FastHands_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_CunningAction_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Cleave_UsedRound', null, campaignName)
                    setRuntimeValue(creature.name, '_Nick_UsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'surgeUsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'illusoryRealityUsedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'portentUsedThisTurn', null, campaignName)
                    setRuntimeValue(creature.name, 'psionicStrikeUsedThisTurn', null, campaignName)
                     setRuntimeValue(creature.name, '_BrutalStrike_usedRound', null, campaignName)
                     setRuntimeValue(creature.name, '_fortifiedHealth_usedRound', null, campaignName)
                     setRuntimeValue(creature.name, '_Shield_Bash_usedRound', null, campaignName)
                    setRuntimeValue(creature.name, 'piercerPunctureUsedThisTurn', null, campaignName)
                }
                if (creature.concentration?.spell === "Hunter's Mark") {
                    creature.concentration = null
                    storage.set('combatSummary', summary, campaignName)
                    clearedHuntersMark = true
                }

                // Clear dominate expirations owned by this creature (initiative-based expiration)
                const dominateList = getRuntimeValue(creature.name, 'pendingExpirations')
                if (Array.isArray(dominateList) && dominateList.length > 0) {
                    for (const entry of dominateList) {
                        if (entry.effects && Array.isArray(entry.effects)) {
                            for (const effect of entry.effects) {
                                if (effect.type === 'dominated') {
                                    clearExpirationEffects([effect], entry.target, creature.name, campaignName)
                                }
                            }
                        }
                    }
                    const filteredExpirations = dominateList.filter(entry => {
                        if (!entry.effects || !Array.isArray(entry.effects)) return true
                        return entry.effects.every(e => e.type !== 'dominated')
                    })
                    setRuntimeValue(creature.name, 'pendingExpirations', filteredExpirations, campaignName)
                }
            }
            if (clearedHuntersMark) {
                setCombatSummaryG(cloneDeep(summary))
            }
        }
        window.addEventListener('initiative-rolled', handler)
        return () => {
            window.removeEventListener('initiative-rolled', handler)
          }
      }, [campaignName, setCombatSummaryG])

    React.useEffect(() => {
        const handler = (e) => {
            if (!combatSummary) return
            const creature = combatSummary.creatures.find(c =>
                c.name === e.detail.targetName || c.name.startsWith(e.detail.targetName + ' ')
            )
            if (creature && !e.detail.success) {
                const concentrationSpell = creature.concentration?.spell
                creature.concentration = null
                storage.set('combatSummary', combatSummary, campaignName)
                setCombatSummary(cloneDeep(combatSummary))
                cleanupConcentrationEffects(creature.name, concentrationSpell, campaignName)
            }
        }
        window.addEventListener('concentration-result', handler)
        return () => window.removeEventListener('concentration-result', handler)
    }, [combatSummary, campaignName])

    React.useEffect(() => {
        const handler = (e) => {
            if (!combatSummary || !e.detail.restoredToHp) return
            const creature = combatSummary.creatures.find(c =>
                c.name === e.detail.targetName || c.name.startsWith(e.detail.targetName + ' ')
            )
            if (creature) {
                setRuntimeValue(creature.name, 'currentHitPoints', e.detail.restoredToHp, campaignName)
                if (creature.type === 'npc') {
                    creature.currentHp = e.detail.restoredToHp
                }
                storage.set('combatSummary', combatSummary, campaignName)
                setCombatSummary(cloneDeep(combatSummary))
            }
        }
        window.addEventListener('death-save-result', handler)
        return () => window.removeEventListener('death-save-result', handler)
    }, [combatSummary, campaignName])

    React.useEffect(() => {
        const handler = async (e) => {
            const { campaignName: evtCampaign, targetName, result } = e.detail;
            if (evtCampaign !== campaignName || !combatSummary || !result) return;

            const creature = combatSummary.creatures.find(c => c.name === targetName);
            if (!creature) return;

            const saveTrackingKey = `_fleshToStone_${targetName.replace(/\s+/g, '_')}`;
            const saveData = getRuntimeValue('campaign', saveTrackingKey, campaignName);
            if (!saveData) return;

            if (result.success) {
                const newSuccesses = saveData.successes + 1;
                if (newSuccesses >= 3) {
                    const conditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
                    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
                    setRuntimeValue(targetName, 'activeConditions', filtered, campaignName);
                    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                    const cleanedEffects = allTargetEffects.filter(te => !(te.target === targetName && te.effect === 'flesh_to_stone' && te.source === saveData.casterName));
                    setRuntimeValue('campaign', 'targetEffects', cleanedEffects, campaignName);
                    setRuntimeValue('campaign', saveTrackingKey, null, campaignName);
                    clearFleshToStonePrompt(campaignName, targetName);
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: saveData.casterName,
                        rollType: 'save-flesh-to-stone',
                        targetName,
                        saveDc: saveData.dc,
                        saveType: 'CON',
                        success: true,
                        description: `${targetName} collected 3 successful saves against Flesh to Stone. The spell ends.`,
                    }).catch(() => {});
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: targetName,
                        condition: 'Restrained',
                        reason: 'Flesh to Stone (3 successes)',
                        note: `${targetName} collected 3 successful saves; Restrained condition removed.`,
                        timestamp: Date.now(),
                    }).catch(() => {});
                } else {
                    setRuntimeValue('campaign', saveTrackingKey, {
                        ...saveData,
                        successes: newSuccesses,
                    }, campaignName);
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: saveData.casterName,
                        rollType: 'save-flesh-to-stone',
                        targetName,
                        saveDc: saveData.dc,
                        saveType: 'CON',
                        success: true,
                        description: `${targetName} succeeded on CON save against Flesh to Stone (${newSuccesses}/3 successes needed).`,
                    }).catch(() => {});
                }
            } else {
                const newFailures = saveData.failures + 1;
                if (newFailures >= 3) {
                    const conditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
                    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
                    setRuntimeValue(targetName, 'activeConditions', [...filtered, 'petrified'], campaignName);
                    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                    const cleanedEffects = allTargetEffects.filter(te => !(te.target === targetName && te.effect === 'flesh_to_stone' && te.source === saveData.casterName));
                    setRuntimeValue('campaign', 'targetEffects', cleanedEffects, campaignName);
                    setRuntimeValue('campaign', saveTrackingKey, null, campaignName);
                    clearFleshToStonePrompt(campaignName, targetName);
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: saveData.casterName,
                        rollType: 'save-flesh-to-stone',
                        targetName,
                        saveDc: saveData.dc,
                        saveType: 'CON',
                        success: false,
                        description: `${targetName} failed 3 CON saves against Flesh to Stone and is turned to stone (Petrified).`,
                    }).catch(() => {});
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: targetName,
                        condition: 'Restrained',
                        reason: 'Flesh to Stone (3 failures)',
                        note: `${targetName} collected 3 failed saves; Restrained removed, Petrified applied.`,
                        timestamp: Date.now(),
                    }).catch(() => {});
                    await logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'applied',
                        characterName: targetName,
                        condition: 'Petrified',
                        reason: 'Flesh to Stone',
                        note: `${targetName} is Petrified by Flesh to Stone after failing 3 saves.`,
                        timestamp: Date.now(),
                    }).catch(() => {});
                } else {
                    setRuntimeValue('campaign', saveTrackingKey, {
                        ...saveData,
                        failures: newFailures,
                    }, campaignName);
                    await logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: saveData.casterName,
                        rollType: 'save-flesh-to-stone',
                        targetName,
                        saveDc: saveData.dc,
                        saveType: 'CON',
                        success: false,
                        description: `${targetName} failed CON save against Flesh to Stone (${newFailures}/3 failures needed).`,
                    }).catch(() => {});
                }
            }

            setCombatSummary(cloneDeep(combatSummary));
        };
        window.addEventListener('flesh-to-stone-result', handler);
        return () => window.removeEventListener('flesh-to-stone-result', handler);
    }, [combatSummary, campaignName])

     const handleCreatureHpChange = React.useCallback((creatureName, newValue) => {
         if (!combatSummary) return
         const creature = combatSummary.creatures.find(c => c.name === creatureName)
         if (!creature) return

         const isPlayer = creature.type === 'player'
         const oldHp = isPlayer ? (getRuntimeValue(creature.name, 'currentHitPoints') ?? 0) : creature.currentHp
         const delta = newValue - oldHp
         if (delta === 0) return

          if (isPlayer) {
             setRuntimeValue(creature.name, 'currentHitPoints', newValue, campaignName)
              if (oldHp <= 0 && newValue > 0) {
                  setRuntimeValue(creature.name, 'deathSaves', [false, false, false], campaignName)
                  setRuntimeValue(creature.name, 'deathFailures', [false, false, false], campaignName)
                  setRuntimeValue(creature.name, 'isDead', 0, campaignName)
                  clearDeathSavePrompt(campaignName, creature.name)
              }
          }
          else {
              creature.currentHp = newValue
          }
          storage.set('combatSummary', combatSummary, campaignName)
          setCombatSummary(cloneDeep(combatSummary))
      }, [combatSummary, campaignName])

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all combat status?')) {
            const newSummary = clearCombat(characters, numOfNpc, utils.getName)
            storage.set('combatSummary', newSummary, campaignName)
            setCombatSummary(newSummary)
            const firstCreatureName = newSummary.creatures[0].name
            storage.set('activeCreatureName', firstCreatureName, campaignName)
            setActiveCreatureName(firstCreatureName)
        }
    }

    const handleInitiativeChange = (creatureName, value) => {
        if (!combatSummary) return
        setInitiative(combatSummary, creatureName, value)
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
    }

    const handleNameChange = (oldName, newName) => {
        if (!combatSummary) return
        renameNpc(combatSummary, oldName, newName, campaignNpcs, setNpcImages)
            .then(() => {
                storage.set('combatSummary', combatSummary, campaignName)
                setCombatSummary(cloneDeep(combatSummary))
            })
            .catch((e) => { console.error("[initiative] Error:", e); throw e; })
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
    }

    const handleTargetChange = (creatureName, targetName) => {
        if (!combatSummary) return
        if (targetName && targetName.startsWith('overlay-')) {
            const overlayId = targetName.slice('overlay-'.length)
            const overlay = overlays.find(o => o.id === overlayId)
            if (overlay) {
                setTarget(combatSummary, creatureName, targetName)
                // AOE context is now managed via server/SSE only
            }
        } else {
            setTarget(combatSummary, creatureName, targetName)
        }
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
    }

    const handleNpcClick = async (creature, options = {}) => {
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
        const monster = await getMonsterData(creature.name)
        if (monster) {
            setViewingMonster(monster)
            setViewingMonsterCreatureName(creature.name)
        }
    }

    const openEffectAdder = (creature, tab) => {
        if (!isLocalhost) return
        setEffectAdderTarget(creature)
        setEffectAdderTab(tab)
    }

    const handleApplyEffect = (tab, data) => {
        if (!effectAdderTarget || !combatSummary) return

        if (tab === 'conditions') {
            const conditionDef = CONDITIONS.find(c => c.key === data.conditionKey)
            if (!conditionDef) return
            const targetCharacter = characters.find(c => utils.getName(c.name) === effectAdderTarget.name)
            const targetStats = targetCharacter?.computedStats || targetCharacter
            addCondition(combatSummary, effectAdderTarget.name, conditionDef, data.dc, data.ability, getRuntimeValue, setRuntimeValue, campaignName, targetStats)
            storage.set('combatSummary', combatSummary, campaignName)
            setCombatSummary(cloneDeep(combatSummary))
            logConditionEvent(campaignName, 'applied', effectAdderTarget.name, conditionDef.label, data.dc, data.ability)
        } else if (tab === 'effects') {
            const effectEntry = { target: effectAdderTarget.name, effect: data.effectKey }
            if (data.source) effectEntry.source = data.source
            if (data.value !== undefined) effectEntry.value = data.value
            if (data.ability) effectEntry.ability = data.ability
            if (data.dc !== undefined) {
                effectEntry.saveDc = data.dc
                effectEntry.saveAbility = data.ability || 'wis'
            }
            if (data.notes) effectEntry.notes = data.notes
            const existing = getRuntimeValue('campaign', 'targetEffects') || []
            const filtered = existing.filter(te => !(te.target === effectAdderTarget.name && te.effect === data.effectKey))
            setRuntimeValue('campaign', 'targetEffects', [...filtered, effectEntry], campaignName)
            logConditionEvent(campaignName, 'target-effect-applied', effectAdderTarget.name, data.effectKey, data.dc, data.ability)
        } else if (tab === 'concentration') {
            const targetBuffs = getRuntimeValue(effectAdderTarget.name, 'activeBuffs', campaignName)
            if (Array.isArray(targetBuffs) && targetBuffs.some(b => b.name === 'Rage')) {
                setEffectAdderTarget(null)
                return
            }
            addConcentration(combatSummary, effectAdderTarget.name, data.spellName, data.dc)
            storage.set('combatSummary', combatSummary, campaignName)
            setCombatSummary(cloneDeep(combatSummary))
            logConditionEvent(campaignName, 'concentration-started', effectAdderTarget.name, `Concentration: ${data.spellName}`, data.dc, 'con')
        }

        setEffectAdderTarget(null)
    }

    const handleRollConditionSave = async (creatureName, condition) => {
        if (!combatSummary) return
        const creature = combatSummary.creatures.find(c => c.name === creatureName)
        if (!creature) return

        const { roll: r1, success, bonus, bonusDetail, rolls } = await rollConditionSave(
            creature, condition, characters, campaignNpcs, campaignName, mapName, utils.getName
        )

        if (success) {
            removeCondition(combatSummary, creatureName, condition, getRuntimeValue, setRuntimeValue, campaignName)

            // Otto's Irresistible Dance: a successful WIS reroll on the Charmed
            // badge ends the whole spell — remove Speed 0 and the spell badge too.
            if (String(condition.key).toLowerCase() === 'charmed') {
                const danceEffect = (getRuntimeValue('campaign', 'targetEffects') || []).find(
                    te => te.effect === 'ottos_irresistible_dance' && te.target === creatureName
                )
                if (danceEffect) {
                    removeCondition(combatSummary, creatureName, { key: 'speed_zero' }, getRuntimeValue, setRuntimeValue, campaignName)
                    const remainingEffects = (getRuntimeValue('campaign', 'targetEffects') || []).filter(
                        te => !(te.target === creatureName && te.effect === 'ottos_irresistible_dance')
                    )
                    setRuntimeValue('campaign', 'targetEffects', remainingEffects, campaignName)
                    logService.addEntry(campaignName, {
                        type: 'save_result',
                        characterName: danceEffect.source,
                        rollType: 'save-ottos-dance',
                        targetName: creatureName,
                        saveDc: condition.dc,
                        saveType: 'WIS',
                        success: true,
                        description: `${creatureName} succeeded on WIS save against Otto's Irresistible Dance. The spell ends; Charmed and Speed 0 removed.`,
                    }).catch(() => {})
                    logService.addEntry(campaignName, {
                        type: 'condition',
                        action: 'removed',
                        characterName: creatureName,
                        condition: 'Charmed, Speed 0',
                        reason: "Otto's Irresistible Dance (successful reroll)",
                        note: `${creatureName} succeeded on the WIS reroll; Otto's Irresistible Dance ends.`,
                        timestamp: Date.now(),
                    }).catch(() => {})
                }
            }
        }

        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))

        setConditionPopup(buildConditionPopup(r1, bonus, bonusDetail, getAbilityLabel(condition.ability), condition.label, condition.dc, success, rolls, rolls && rolls.length > 1))

        logConditionSave(campaignName, creatureName, r1, bonus, bonusDetail, condition.label, getAbilityLabel(condition.ability), condition.dc, success)
    }

    const handleRollConcentrationSave = async (creatureName) => {
        if (!combatSummary) return
        const creature = combatSummary.creatures.find(c => c.name === creatureName)
        if (!creature || !creature.concentration) return

        const concentration = creature.concentration

        const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName)
        const attackerName = lastAttack?.attackerName
        const attacker = attackerName ? characters.find(c => c.name === attackerName || c.name.startsWith(attackerName + ' ')) : null
        const attackerModifiers = attacker?.saveModifiers || attacker?.computedStats?.saveModifiers
        const hasConcentrationBreaker = attackerModifiers?.some(mod =>
          mod.condition === 'concentration_breaker' && mod.effect === 'disadvantage'
        ) ?? false

        const targetCharacter = characters.find(c => c.name === creatureName || c.name.startsWith(creatureName + ' '))
        const targetModifiers = targetCharacter?.saveModifiers || targetCharacter?.computedStats?.saveModifiers
        const advantageSources = []
        if (targetModifiers) {
          targetModifiers.forEach(mod => {
            if (mod.source && ((mod.target === 'concentration_saving_throws') || (mod.target === 'saving_throw' && mod.condition === 'concentration_spell_damage' && mod.effect === 'advantage' && mod.abilities && mod.abilities.includes('Constitution')))) {
              if (!advantageSources.includes(mod.source)) {
                advantageSources.push(mod.source)
              }
            }
          })
        }

        const { roll: r1, success, bonus, bonusDetail } = await rollConcentrationSave(
            creature, concentration, characters, campaignNpcs, campaignName, mapName, utils.getName, hasConcentrationBreaker
        )

        if (!success) {
            creature.concentration = null
        }

        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))

        setConditionPopup(buildConcentrationPopup(r1, bonus, bonusDetail, concentration.spell, concentration.dc, success))

        const mode = hasConcentrationBreaker ? 'disadvantage' : (advantageSources.length > 0 ? 'advantage' : 'normal')
        logConcentrationSave(campaignName, creatureName, r1, bonus, bonusDetail, concentration.spell, concentration.dc, success, mode, advantageSources.length > 0 ? advantageSources : undefined)

        if (!success) {
            cleanupConcentrationEffects(creatureName, concentration.spell, campaignName)
        }
    }

    const handleBreakConcentration = (creatureName) => {
        if (!combatSummary) return
        const spell = breakConcentration(combatSummary, creatureName)
        if (!spell) return
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
        logConditionEvent(campaignName, 'removed', creatureName, `Concentration: ${spell}`)
        cleanupConcentrationEffects(creatureName, spell, campaignName)
    }

    const handleGenerateLoot = async () => {
        setGeneratingLoot(true)
        try {
            const lootResult = await generateLootFromCombatSummary(
                combatSummaryRef.current || combatSummary,
                characters,
                campaignName
            )
            setLootData(lootResult || { lootEntries: [], totalEncounterXp: 0 })
            setLootTextValue(lootResult.lootEntries.join('\n'))
        } catch (error) {
            console.error('Failed to generate loot:', error)
        } finally {
            setGeneratingLoot(false)
        }
    }

    const handleAwardLoot = async () => {
        if (awardingLoot) return
        setAwardingLoot(true)
        try {
            const numChars = characters && characters.length > 0 ? characters.length : 1
            const xpPerChar = Math.floor(lootData.totalEncounterXp / numChars)

            const lootItems = lootTextValue
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)

            if (lootItems.length > 0 && lootItems.some(item => item !== 'No loot for these monsters')) {
                await logService.addEntry(campaignName, {
                    type: 'loot',
                    encounterName: 'Combat',
                    lootItems: lootItems.filter(item => item !== 'No loot for these monsters'),
                    xpPerChar,
                    totalEncounterXp: lootData.totalEncounterXp,
                })
            }

            await logEntry({
                type: 'encounter',
                action: 'loot_awarded',
                encounterName: 'Combat',
                xpPerChar,
                totalEncounterXp: lootData.totalEncounterXp,
                lootItems,
            })

            for (const charData of (characters || [])) {
                const currentXp = getRuntimeValue(charData.name, 'xp') || 0
                setRuntimeValue(charData.name, 'xp', currentXp + xpPerChar, campaignName)
            }

            setShowAwardLoot(false)
            setLootTextValue('')
            setLootData({ lootEntries: [], totalEncounterXp: 0 })
        } catch (error) {
            console.error('Failed to award loot:', error)
        } finally {
            setAwardingLoot(false)
        }
    }

    const handleClearLoot = () => {
        setLootData({ lootEntries: [], totalEncounterXp: 0 })
        setLootTextValue('')
        setShowAwardLoot(false)
    }

    const logEntry = async (entry) => {
        try { await logService.addEntry(campaignName, entry); } catch { /* ignore */ }
    }

    const handleAutoBreakCondition = (creatureName, condition) => {
        if (!isLocalhost || !combatSummary) return
        const conditionKey = String(condition.key || condition).toLowerCase()
        const creature = combatSummary.creatures.find(c => c.name === creatureName)
        if (creature?.conditions) {
            creature.conditions = creature.conditions.filter(c => {
                if (!c || typeof c !== 'object') return true
                return String(c.key || c).toLowerCase() !== conditionKey
            })
        }
        removeCondition(combatSummary, creatureName, condition, getRuntimeValue, setRuntimeValue, campaignName)
        storage.set('combatSummary', combatSummary, campaignName)
        setCombatSummary(cloneDeep(combatSummary))
        logConditionEvent(campaignName, 'broken', creatureName, condition.label)
    }

    return (
        <div className='initiative'>
            <Subscriber campaignName={campaignName} handleEvent={handleEvent} />
            {combatSummary && combatSummary.creatures ? (
             <>
             <h4>Initiative (round {combatSummary.round})</h4>
             <div className='carousel-container' ref={carouselRef}>
                  {displayCreatures?.map((creature) => {
                    const isActive = creature.name === activeCreatureName
                    const character = characters.find(ch => utils.getName(ch.name) === creature.name)
                    const stats = character?.computedStats || character
                    const hasTacticalShift = stats?.automation?.passives?.some(p => p.type === 'passive_rule' && p.effect === 'tactical_shift_no_oa')
                    const hasSpeedyOpportunityDisadvantage = stats?.automation?.passives?.some(p => p.type === 'passive_rule' && p.effect === 'opportunity_attacks_disadvantage')
                    const hasSpeedyDifficultTerrainIgnore = stats?.automation?.passives?.some(p => p.type === 'passive_rule' && p.effect === 'ignore_difficult_terrain_on_dash')
                    const coronaDisadvantage = (() => {
                        const playerNames = (combatSummary?.creatures || [])
                            .filter(c => c.type === 'player')
                            .map(c => c.name)
                        let result = false
                        for (const playerName of playerNames) {
                            const buffs = getRuntimeValue(playerName, 'activeBuffs', campaignName) || []
                            const coronaBuff = Array.isArray(buffs) ? buffs.find(b => b.effect === 'sunlight_aura') : null
                            if (!coronaBuff) continue
                            const applicableTypes = coronaBuff.enemiesDisadvantageSaves || []
                            if (applicableTypes.length === 0) continue
                            const storedEnemies = getRuntimeValue(playerName, 'coronaOfLightEnemies', campaignName) || []
                            if (storedEnemies.length === 0) {
                                result = true
                                break
                            }
                            if (storedEnemies.includes(creature.name)) {
                                result = true
                                break
                            }
                        }
                        return result
                    })()
                    return (
                        <CreatureCard
                            key={`${creature.name}-${runtimeStateTick}`}
                            creature={creature}
                            isActive={isActive}
                            isLocalhost={isLocalhost}
                            npcImage={npcImages[creature.name]}
                            campaignNpcs={campaignNpcs}
                            overlays={overlays}
                            onRemoveNpc={handleRemoveNpc}
                            onNpcClick={handleNpcClick}
                            onNameChange={handleNameChange}
                            onHpChange={handleCreatureHpChange}
                            onInitiativeChange={handleInitiativeChange}
                            onTargetChange={handleTargetChange}
                            onRollConditionSave={handleRollConditionSave}
                            onBreakCondition={handleAutoBreakCondition}
                            onOpenEffectAdder={openEffectAdder}
                            onRollConcentrationSave={handleRollConcentrationSave}
                            onBreakConcentration={handleBreakConcentration}
                            allCreatures={combatSummary.creatures}
                            campaignName={campaignName}
                            hasTacticalShift={hasTacticalShift}
                            hasSpeedyOpportunityDisadvantage={hasSpeedyOpportunityDisadvantage}
                            hasSpeedyDifficultTerrainIgnore={hasSpeedyDifficultTerrainIgnore}
                            coronaDisadvantage={coronaDisadvantage}
                            characters={characters}
                            mapName={mapName}
                        />
                    )
                })}
            </div>
              <div className='combat-controls'>
                  <button className='clear-button' onClick={handleClear}>Clear</button>
                  <button onClick={handleAddNpc}>+ NPC</button>
                  <button onClick={handlePreviousCreature} disabled={isPrevDisabled}>← Prev</button>
                  <button onClick={handleNextCreature}>Next →</button>
              </div>
              <div className='initiative-loot-section'>
                  <div className='initiative-loot-header'>
                      <i className="fa-solid fa-gem"></i>&nbsp; Loot
                      {(lootData.lootEntries.length > 0 || lootTextValue.length > 0) && (
                        <button
                          className='initiative-btn initiative-btn-secondary'
                          onClick={handleClearLoot}
                          title="Clear loot suggestions"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                  </div>
                  <button
                    className='initiative-btn initiative-btn-loot'
                    onClick={handleGenerateLoot}
                    disabled={generatingLoot}
                    title="Generate loot from defeated monsters in combat"
                  >
                    <i className="fa-solid fa-coins"></i>&nbsp; {generatingLoot ? 'Generating...' : 'Generate Loot'}
                  </button>
                  {(lootData.lootEntries.length > 0 || lootTextValue.length > 0) && (
                    <>
                      <textarea
                        className='initiative-loot-textarea'
                        value={lootTextValue || lootData.lootEntries.join('\n')}
                        onChange={(e) => setLootTextValue(e.target.value)}
                        placeholder="Loot will appear here..."
                        rows={6}
                      />
                      {lootData.totalEncounterXp > 0 && (
                        <div className='initiative-xp-summary'>
                          <span className='initiative-xp-label'>
                            <i className="fa-solid fa-star"></i>&nbsp; Encounter XP: {lootData.totalEncounterXp.toLocaleString()} total &middot; {Math.floor(lootData.totalEncounterXp / (characters && characters.length > 0 ? characters.length : 1))} per character
                          </span>
                          {showAwardLoot && (
                            <div className='initiative-award-loot-actions'>
                              <button
                                className='initiative-btn initiative-btn-complete'
                                onClick={handleAwardLoot}
                                disabled={awardingLoot}
                                title="Award loot and XP to party"
                              >
                                <i className="fa-solid fa-trophy"></i>{awardingLoot ? 'Awarding...' : 'Award Loot'}
                              </button>
                              <button
                                className='initiative-btn initiative-btn-secondary'
                                onClick={() => setShowAwardLoot(false)}
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {!showAwardLoot && lootTextValue.length > 0 && (
                            <button
                              className='initiative-btn initiative-btn-loot'
                              onClick={() => setShowAwardLoot(true)}
                              title="Award loot and XP to party"
                            >
                              <i className="fa-solid fa-trophy"></i>Award Loot
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
              </div>
            {viewingMonster && (
                <MonsterCardModal
                    monster={viewingMonster}
                    onClose={() => { setViewingMonster(null); setViewingMonsterCreatureName(null) }}
                    campaignName={campaignName}
                    creatures={combatSummary.creatures}
                    creatureName={viewingMonsterCreatureName}
                    mapName={mapName}
                    characters={characters}
                />
            )}
            {effectAdderTarget && (
                <EffectAdder
                    targetName={effectAdderTarget.name}
                    initialTab={effectAdderTab}
                    onCancel={() => setEffectAdderTarget(null)}
                    onApply={handleApplyEffect}
                    creatures={combatSummary?.creatures || []}
                />
            )}
            {conditionPopup && (
                <Popup onClickOrKeyDown={() => setConditionPopup(null)}>
                    <DiceRollResult
                        name={conditionPopup.condition ? `${conditionPopup.condition} — ${conditionPopup.name}` : conditionPopup.name}
                        type={conditionPopup.type}
                        rolls={conditionPopup.rolls}
                        bonus={conditionPopup.bonus}
                        targetName={conditionPopup.targetName}
                        targetAc={conditionPopup.targetAc}
                        hit={conditionPopup.hit}
                        forcedMode={conditionPopup.forcedMode}
                    >
                    </DiceRollResult>
                    <div className={`condition-save-result ${conditionPopup.success ? 'condition-save-success' : 'condition-save-failure'}`}>
                        {conditionPopup.success ? 'SAVE SUCCESSFUL' : 'SAVE FAILED'} (DC {conditionPopup.dc})
                    </div>
                </Popup>
            )}
            </>
            ) : null}
        </div>
    )
}

export default Initiative
