import { addEntry } from '../../../services/ui/logService.js'

export function useMultiTargetHandler(playerStats, campaignName, cfClearPending, getPending, onExecute) {
  const handleConfirm = (result) => {
    const pending = getPending('multiTarget')
    if (!pending) return

    cfClearPending('multiTarget')

    const targets = pending.creatureTargets || []
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets: targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch((e) => { console.error("[useMultiTargetHandler:log-error]", e); })

    const metaCtx = {}
    if (result?.secondTarget) {
      metaCtx.multiTarget = result.secondTarget
    }

    onExecute(pending.spell, metaCtx)
  }

  const handleSkip = () => {
    const pending = getPending('multiTarget')
    if (!pending) return

    cfClearPending('multiTarget')

    const targets = pending.creatureTargets || []
    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: targets[0] || null,
      targets: targets,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      timestamp: Date.now(),
    }).catch((e) => { console.error("[useMultiTargetHandler:log-error]", e); })

    onExecute(pending.spell, {})
  }

  return { handleConfirm, handleSkip }
}
