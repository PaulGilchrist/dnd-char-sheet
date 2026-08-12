import { getMaxSorceryPoints, spendSorceryPoints, logMetamagicUse } from '../useMetamagic.js'
import { addEntry } from '../../../services/ui/logService.js'
import { isFreeCastAuthorized } from '../../../services/rules/spells/spellPreparationService.js'
import { prepareSpellCast } from '../../../services/rules/spells/spellPreparationService.js'
import { getConsumedMaterial, consumeMaterial } from '../../../services/rules/spells/materialComponents.js'

export function useMetamagicHandler(playerStats, campaignName, cfClearPending, getPending, onExecute) {
  const handleConfirm = async (result) => {
    const pending = getPending('metamagic')
    if (!pending) return

    cfClearPending('metamagic')

    let totalMetamagicCost = result?.totalCost || 0
    let psionicCost = 0

    if (pending.isPsionic && !result?.options?.includes('Subtle Spell')) {
      psionicCost = pending.psionicCost
    }

    const totalCost = totalMetamagicCost + psionicCost
    if (totalCost > 0) {
      spendSorceryPoints(playerStats.name, totalCost, campaignName, getMaxSorceryPoints(playerStats))
    }

    const metamagicOptions = result?.options || []
    if (psionicCost > 0 && !metamagicOptions.includes('Psionic Sorcery')) {
      metamagicOptions.push('Psionic Sorcery')
    }

    if (totalCost > 0) {
      logMetamagicUse(campaignName, playerStats.name, pending.spellName, metamagicOptions, totalCost)
    }

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      targetName: pending._metaCtx?.multiTarget || null,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      metamagic: metamagicOptions,
      spCost: totalCost,
      timestamp: Date.now(),
    }).catch(() => {})

    const metaCtx = { ...pending._metaCtx }
    if (result?.options) {
      if (result.options.includes('Heightened Spell')) metaCtx.metamagicHeighten = true
      if (result.options.includes('Careful Spell')) metaCtx.metamagicCareful = true
      if (result.options.includes('Twinned Spell') && result.twinTarget) metaCtx.metamagicTwinTarget = result.twinTarget
      if (result.options.includes('Distant Spell')) metaCtx.metamagicDistant = true
    }
    if (psionicCost > 0) {
      metaCtx.psionicSpell = true
    }

    const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pending.spellName, pending.spellLevel, playerStats, campaignName)
    const isUpcast = pending.spell?.isUpcast
    const upcastLevel = pending.spell?.upcastLevel
    const result2 = await prepareSpellCast(pending.spell, metaCtx, {
      playerName: playerStats.name,
      playerStats,
      campaignName,
      isUpcast,
      upcastLevel,
      freeCastAuthorized,
    })
    if (!metaCtx.slotLevel && upcastLevel) {
      metaCtx.slotLevel = upcastLevel
    }
    const sorcMaterial = getConsumedMaterial(pending.spell)
    if (sorcMaterial) await consumeMaterial(playerStats, sorcMaterial.itemName, campaignName)
    onExecute(result2.modifiedSpell, result2.metaCtx)
  }

  const handleSkip = async () => {
    const pending = getPending('metamagic')
    if (!pending) return

    cfClearPending('metamagic')

    addEntry(campaignName, {
      type: 'spell',
      characterName: playerStats.name,
      spellName: pending.spellName,
      spellLevel: pending.spellLevel || 0,
      castingTime: pending.castingTime,
      metamagic: [],
      spCost: 0,
      timestamp: Date.now(),
    }).catch(() => {})

    const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, pending.spellName, pending.spellLevel, playerStats, campaignName)
    const result = await prepareSpellCast(pending.spell, {}, {
      playerName: playerStats.name,
      playerStats,
      campaignName,
      isUpcast: false,
      freeCastAuthorized,
    })
    onExecute(result.modifiedSpell, result.metaCtx)
  }

  return { handleConfirm, handleSkip }
}
