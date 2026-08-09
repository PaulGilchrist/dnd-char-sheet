import { describe, it, expect, vi, beforeEach } from 'vitest'

import { executeSpellCast } from './spellCastService.js'

/* ------------------------------------------------------------------ */
/*  Mocks — minimal surface area for no-formula spell routing         */
/* ------------------------------------------------------------------ */

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  getRuntimeValue: vi.fn(() => undefined),
}))

vi.mock('../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 10, rolls: [1, 2, 3, 4], modifier: 0 })),
  rollExpressionMaximized: vi.fn(() => ({ total: 24, rolls: [6, 6, 6, 6], modifier: 0, maximized: true })),
}))

vi.mock('../../automation/index.js', () => ({
  executeHandler: vi.fn(),
  checkCompelledDuelAttackExpiry: vi.fn(),
}))

vi.mock('../combat/rangeValidation.js', () => ({
  computeRangeEffect: vi.fn(() => ({ mode: 'normal' })),
  computeEffectiveSpellRange: vi.fn(() => 60),
  getDistanceFeet: vi.fn(() => 30),
  rangeToFeet: vi.fn((r) => typeof r === 'number' ? r : 60),
}))

vi.mock('../../combat/buffs/buffService.js', () => ({
  isInnateSorceryActive: vi.fn(() => false),
  getActiveBuffs: vi.fn(() => []),
}))

vi.mock('../features/silenceService.js', () => ({
  getSilenceSource: vi.fn(() => null),
  isCreatureInSilenceZone: vi.fn(() => false),
  triggerSilence: vi.fn(),
}))

vi.mock('../features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}))

vi.mock('../features/friendsService.js', () => ({
  endFriendsOnHostileAction: vi.fn(),
  triggerFriends: vi.fn(),
}))

// Feature modules — all trigger functions default to no-op
vi.mock('../features/smiteOfProtectionService.js', () => ({ triggerSmiteOfProtection: vi.fn(async () => {}) }))
vi.mock('../features/inspiringSmiteService.js', () => ({ triggerInspiringSmite: vi.fn(async () => {}) }))
vi.mock('../features/primalCompanionSpellShareService.js', () => ({ triggerPrimalCompanionSpellShare: vi.fn(async () => {}) }))
vi.mock('../features/wildMagicSurgeService.js', () => ({ triggerWildMagicSurge: vi.fn(async () => {}) }))
vi.mock('../features/fearService.js', () => ({ triggerFear: vi.fn(async () => {}) }))
vi.mock('../features/falseLifeService.js', () => ({ triggerFalseLife: vi.fn(async () => {}) }))
vi.mock('../features/healingWordService.js', () => ({ triggerHealingWord: vi.fn(async () => {}) }))
vi.mock('../features/fleshToStoneService.js', () => ({ triggerFleshToStone: vi.fn(async () => {}) }))
vi.mock('../features/holdMonsterService.js', () => ({ triggerHoldMonster: vi.fn(async () => {}) }))
vi.mock('../features/hypnoticPatternService.js', () => ({ triggerHypnoticPattern: vi.fn(async () => {}) }))
vi.mock('../features/massSuggestionService.js', () => ({ triggerMassSuggestion: vi.fn(async () => {}) }))
vi.mock('../features/suggestionService.js', () => ({ triggerSuggestion: vi.fn(async () => {}) }))
vi.mock('../features/ottoDanceService.js', () => ({ triggerOttoDance: vi.fn(async () => {}) }))
vi.mock('../features/resilientSphereService.js', () => ({ triggerResilientSphere: vi.fn(async () => {}) }))
vi.mock('../features/foresightService.js', () => ({ triggerForesight: vi.fn(async () => {}) }))
vi.mock('../features/rayOfEnfeeblementService.js', () => ({ triggerRayOfEnfeeblement: vi.fn(async () => {}) }))
vi.mock('../features/compelledDuelService.js', () => ({ triggerCompelledDuel: vi.fn(async () => {}) }))
vi.mock('../features/globeOfInvulnerabilityService.js', () => ({ triggerGlobeOfInvulnerability: vi.fn(async () => {}) }))
vi.mock('../features/forcecageService.js', () => ({ triggerForcecage: vi.fn(async () => {}) }))
vi.mock('../features/banishmentService.js', () => ({ triggerBanishment: vi.fn(async () => {}) }))
vi.mock('../features/confusionService.js', () => ({ triggerConfusion: vi.fn(async () => {}) }))
vi.mock('../features/mazeService.js', () => ({ triggerMaze: vi.fn(async () => {}) }))
vi.mock('../features/blurService.js', () => ({ triggerBlur: vi.fn(async () => {}) }))
vi.mock('../features/expeditiousRetreatService.js', () => ({ triggerExpeditiousRetreat: vi.fn(async () => {}) }))
vi.mock('../features/crownOfMadnessService.js', () => ({ triggerCrownOfMadness: vi.fn(async () => {}) }))
vi.mock('../features/animalFriendshipService.js', () => ({ triggerAnimalFriendship: vi.fn(async () => {}) }))
vi.mock('../features/dominateBeastService.js', () => ({ triggerDominateBeast: vi.fn(async () => {}) }))
vi.mock('../features/dominateMonsterService.js', () => ({ triggerDominateMonster: vi.fn(async () => {}) }))
vi.mock('../features/dominatePersonService.js', () => ({ triggerDominatePerson: vi.fn(async () => {}) }))
vi.mock('../features/compulsionService.js', () => ({ triggerCompulsion: vi.fn(async () => {}) }))
vi.mock('../features/holyAuraService.js', () => ({ triggerHolyAura: vi.fn(async () => {}) }))
vi.mock('../features/powerWordStunService.js', () => ({ triggerPowerWordStun: vi.fn(async () => {}) }))
vi.mock('../features/seeInvisibilityService.js', () => ({ triggerSeeInvisibility: vi.fn(async () => {}) }))
vi.mock('../features/stinkingCloudService.js', () => ({ triggerStinkingCloud: vi.fn(async () => {}) }))
vi.mock('../features/sleetStormService.js', () => ({ triggerSleetStorm: vi.fn(async () => {}) }))
vi.mock('../features/faerieFireService.js', () => ({ triggerFaerieFire: vi.fn(async () => {}) }))
vi.mock('../features/tashasHideousLaughterService.js', () => ({ triggerTashasHideousLaughter: vi.fn(async () => {}) }))
vi.mock('../features/imprisonmentService.js', () => ({ triggerImprisonment: vi.fn(async () => {}) }))
vi.mock('../features/removeCurseService.js', () => ({ triggerRemoveCurse: vi.fn(async () => {}) }))
vi.mock('../features/slowService.js', () => ({ triggerSlow: vi.fn(async () => {}) }))
vi.mock('../features/baneService.js', () => ({ triggerBaneSpell: vi.fn(async () => {}) }))
vi.mock('../features/blessService.js', () => ({ triggerBlessSpell: vi.fn(async () => {}) }))
vi.mock('../features/beaconOfHopeService.js', () => ({ triggerBeaconOfHope: vi.fn(async () => {}) }))
vi.mock('../features/massCureWoundsService.js', () => ({ triggerMassCureWounds: vi.fn(async () => {}) }))
vi.mock('../features/massHealingWordService.js', () => ({ triggerMassHealingWord: vi.fn(async () => {}) }))
vi.mock('../features/prayerOfHealingService.js', () => ({ triggerPrayerOfHealing: vi.fn(async () => {}) }))
vi.mock('../features/confusionService.js', () => ({ triggerConfusion: vi.fn(async () => {}) }))
vi.mock('../features/mazeService.js', () => ({ triggerMaze: vi.fn(async () => {}) }))
vi.mock('../features/heroismService.js', () => ({ handle: vi.fn(), applyHeroism: vi.fn(), isHeroismActive: vi.fn() }))

vi.mock('./postCastRiderService.js', () => ({
  triggerPostCastRiderSaves: vi.fn(async () => null),
  triggerSpellThief: vi.fn(async () => null),
  triggerBewitchingMagic: vi.fn(async () => null),
  triggerSoulstitchSpells: vi.fn(async () => null),
  getEmpoweredEvocationFeatures: vi.fn(() => []),
  getEmpoweredEvocationIntModifier: vi.fn(() => 0),
}))

vi.mock('./postCastHealService.js', () => ({
  triggerPostCastSelfHeals: vi.fn(async () => {}),
  triggerPostCastAllyHeals: vi.fn(async () => {}),
}))

/* ------------------------------------------------------------------ */
/*  Test-data factories                                                */
/* ------------------------------------------------------------------ */

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball', level: 3, school: 'Evocation',
    casting_time: '1 action', components: ['V', 'S'], range: '150 feet',
    damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
    dc: { dc_type: 'dex', dc_success: 'half' },
    ...overrides,
  }
}

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    abilities: [{ name: 'Intelligence', bonus: 5 }],
    proficiency: 4,
    spellAbilities: {
      spellCastingAbility: 'Intelligence', toHit: 9, saveDc: 17, modifier: 5,
    },
    automation: { passives: [] },
    hitPoints: 100,
    ...overrides,
  }
}

function makeMetaCtx(overrides = {}) {
  return { slotLevel: 3, ...overrides }
}

function makeServices(overrides = {}) {
  return {
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    playerStats: makePlayerStats(),
    getTargetInfo: vi.fn(),
    attackerPos: null, targetPos: null,
    featEffects: {},
    campaignName: 'testCampaign',
    mapName: 'testMap',
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/*  Suite — no-formula spell routing (no damage)                      */
/* ------------------------------------------------------------------ */

describe('executeSpellCast - no-formula spell routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const runtime = await import('../../../hooks/runtime/useRuntimeState.js')
    runtime.getRuntimeValue.mockImplementation((key1, key2) => {
      if (key2 === 'activeConditions' || key2 === 'targetEffects') return []
      return undefined
    })

    const postCastRider = await import('./postCastRiderService.js')
    postCastRider.getEmpoweredEvocationFeatures.mockReturnValue([])
    postCastRider.getEmpoweredEvocationIntModifier.mockReturnValue(0)
  })

  // ------------------------------------------------------------------
  // Fear — returns modal when no formula
  // ------------------------------------------------------------------
  describe('fear modal', () => {
    it('returns fear modal when spell has no formula', async () => {
      const services = makeServices()
      const spell = makeSpell({ name: 'Fear' })
      delete spell.damage

      const result = await executeSpellCast(spell, makeMetaCtx(), services)

      expect(result.automationPopup).toEqual({
        type: 'modal',
        modalName: 'fear',
        payload: expect.objectContaining({
          action: { name: 'Fear', automation: { type: 'fear' } },
          saveType: 'WIS',
          saveDc: 17,
          activeOverlay: null,
          metamagicCareful: false,
        }),
      })
    })
  })

  // ------------------------------------------------------------------
  // Conjure Volley — returns info popup
  // ------------------------------------------------------------------
  describe('conjure volley', () => {
    it('returns info popup for Conjure Volley', async () => {
      const services = makeServices()
      const spell = makeSpell({ name: 'Conjure Volley' })
      delete spell.damage
      delete spell.dc

      const result = await executeSpellCast(spell, makeMetaCtx(), services)

      expect(result.automationPopup).toEqual({
        type: 'popup',
        payload: expect.objectContaining({
          type: 'automation_info',
          name: 'Conjure Volley',
        }),
      })
    })
  })

  // ------------------------------------------------------------------
  // See Invisibility — triggers service
  // ------------------------------------------------------------------
  describe('see invisibility', () => {
    it('triggers see invisibility service', async () => {
      const { triggerSeeInvisibility } = await import('../features/seeInvisibilityService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'See Invisibility' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerSeeInvisibility).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Flesh to Stone — triggers service
  // ------------------------------------------------------------------
  describe('flesh to stone', () => {
    it('triggers flesh to stone service', async () => {
      const { triggerFleshToStone } = await import('../features/fleshToStoneService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Flesh to Stone' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerFleshToStone).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Hold Monster / Hold Person — triggers service
  // ------------------------------------------------------------------
  describe('hold monster / hold person', () => {
    it('triggers hold monster service', async () => {
      const { triggerHoldMonster } = await import('../features/holdMonsterService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Hold Monster' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerHoldMonster).toHaveBeenCalled()
    })

    it('triggers hold monster service for Hold Person too', async () => {
      const { triggerHoldMonster } = await import('../features/holdMonsterService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Hold Person' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerHoldMonster).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Banishment — triggers service
  // ------------------------------------------------------------------
  describe('banishment', () => {
    it('triggers banishment service', async () => {
      const { triggerBanishment } = await import('../features/banishmentService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Banishment' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerBanishment).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Maze — triggers service
  // ------------------------------------------------------------------
  describe('maze', () => {
    it('triggers maze service', async () => {
      const { triggerMaze } = await import('../features/mazeService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Maze' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerMaze).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Power Word Stun — triggers service
  // ------------------------------------------------------------------
  describe('power word stun', () => {
    it('triggers power word stun service', async () => {
      const { triggerPowerWordStun } = await import('../features/powerWordStunService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Power Word Stun' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerPowerWordStun).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Slow — triggers service
  // ------------------------------------------------------------------
  describe('slow', () => {
    it('triggers slow service', async () => {
      const { triggerSlow } = await import('../features/slowService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Slow' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerSlow).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Bane — triggers service
  // ------------------------------------------------------------------
  describe('bane', () => {
    it('triggers bane service', async () => {
      const { triggerBaneSpell } = await import('../features/baneService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Bane' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerBaneSpell).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Bless — triggers service
  // ------------------------------------------------------------------
  describe('bless', () => {
    it('triggers bless service', async () => {
      const { triggerBlessSpell } = await import('../features/blessService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Bless' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerBlessSpell).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Beacon of Hope — triggers service
  // ------------------------------------------------------------------
  describe('beacon of hope', () => {
    it('triggers beacon of hope service', async () => {
      const { triggerBeaconOfHope } = await import('../features/beaconOfHopeService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Beacon of Hope' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerBeaconOfHope).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Blur — triggers service
  // ------------------------------------------------------------------
  describe('blur', () => {
    it('triggers blur service', async () => {
      const { triggerBlur } = await import('../features/blurService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Blur' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerBlur).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Expeditious Retreat — triggers service
  // ------------------------------------------------------------------
  describe('expeditious retreat', () => {
    it('triggers expeditious retreat service', async () => {
      const { triggerExpeditiousRetreat } = await import('../features/expeditiousRetreatService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Expeditious Retreat' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerExpeditiousRetreat).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Crown of Madness — triggers service
  // ------------------------------------------------------------------
  describe('crown of madness', () => {
    it('triggers crown of madness service', async () => {
      const { triggerCrownOfMadness } = await import('../features/crownOfMadnessService.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Crown of Madness' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerCrownOfMadness).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Animal Friendship — triggers service
  // ------------------------------------------------------------------
  describe('animal friendship', () => {
    it('triggers animal friendship service', async () => {
      const { triggerAnimalFriendship } = await import('../features/animalFriendshipService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Animal Friendship' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerAnimalFriendship).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Dominate Beast — triggers service
  // ------------------------------------------------------------------
  describe('dominate beast', () => {
    it('triggers dominate beast service', async () => {
      const { triggerDominateBeast } = await import('../features/dominateBeastService.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Dominate Beast' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerDominateBeast).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Dominate Monster — triggers service
  // ------------------------------------------------------------------
  describe('dominate monster', () => {
    it('triggers dominate monster service', async () => {
      const { triggerDominateMonster } = await import('../features/dominateMonsterService.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Dominate Monster' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerDominateMonster).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Dominate Person — triggers service
  // ------------------------------------------------------------------
  describe('dominate person', () => {
    it('triggers dominate person service', async () => {
      const { triggerDominatePerson } = await import('../features/dominatePersonService.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Dominate Person' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerDominatePerson).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Ray of Enfeeblement — triggers service
  // ------------------------------------------------------------------
  describe('ray of enfeeblement', () => {
    it('triggers ray of enfeeblement service', async () => {
      const { triggerRayOfEnfeeblement } = await import('../features/rayOfEnfeeblementService.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Ray of Enfeeblement' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerRayOfEnfeeblement).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Globe of Invulnerability — triggers service
  // ------------------------------------------------------------------
  describe('globe of invulnerability', () => {
    it('triggers globe of invulnerability service', async () => {
      const { triggerGlobeOfInvulnerability } = await import('../features/globeOfInvulnerabilityService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Globe of Invulnerability' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerGlobeOfInvulnerability).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Silence — returns modal
  // ------------------------------------------------------------------
  describe('silence modal', () => {
    it('returns silence target selection modal', async () => {
      const services = makeServices()
      const spell = makeSpell({ name: 'Silence' })
      delete spell.damage
      delete spell.dc

      const result = await executeSpellCast(spell, makeMetaCtx(), services)

      expect(result.automationPopup).toEqual({
        type: 'modal',
        modalName: 'silenceTargetSelection',
        payload: expect.objectContaining({
          action: expect.objectContaining({ name: 'Silence' }),
          aoeRadius: expect.any(Number),
          slotLevel: expect.any(Number),
        }),
      })
    })
  })

  // ------------------------------------------------------------------
  // Stinking Cloud — triggers service
  // ------------------------------------------------------------------
  describe('stinking cloud', () => {
    it('triggers stinking cloud service', async () => {
      const { triggerStinkingCloud } = await import('../features/stinkingCloudService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Stinking Cloud' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerStinkingCloud).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Sleet Storm — triggers service
  // ------------------------------------------------------------------
  describe('sleet storm', () => {
    it('triggers sleet storm service', async () => {
      const { triggerSleetStorm } = await import('../features/sleetStormService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Sleet Storm' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerSleetStorm).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Faerie Fire — triggers service
  // ------------------------------------------------------------------
  describe('faerie fire', () => {
    it('triggers faerie fire service', async () => {
      const { triggerFaerieFire } = await import('../features/faerieFireService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Faerie Fire' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerFaerieFire).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Tasha's Hideous Laughter — triggers service
  // ------------------------------------------------------------------
  describe("tasha's hideous laughter", () => {
    it("triggers tasha's hideous laughter service", async () => {
      const { triggerTashasHideousLaughter } = await import('../features/tashasHideousLaughterService.js')
      const services = makeServices()
      const spell = makeSpell({ name: "Tasha's Hideous Laughter" })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerTashasHideousLaughter).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Imprisonment — triggers service
  // ------------------------------------------------------------------
  describe('imprisonment', () => {
    it('triggers imprisonment service', async () => {
      const { triggerImprisonment } = await import('../features/imprisonmentService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Imprisonment' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerImprisonment).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Heroism — routes through executeHandler
  // ------------------------------------------------------------------
  describe('heroism', () => {
    it('routes heroism through executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Heroism' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Holy Aura — triggers service
  // ------------------------------------------------------------------
  describe('holy aura', () => {
    it('triggers holy aura service', async () => {
      const { triggerHolyAura } = await import('../features/holyAuraService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Holy Aura' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerHolyAura).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Longstrider — routes through executeHandler
  // ------------------------------------------------------------------
  describe('longstrider', () => {
    it('routes longstrider through executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Longstrider' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Spare the Dying — routes through executeHandler
  // ------------------------------------------------------------------
  describe('spare the dying', () => {
    it('routes spare the dying through executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Spare the Dying' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Enhance Ability — routes through executeHandler
  // ------------------------------------------------------------------
  describe('enhance ability', () => {
    it('routes enhance ability through executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Enhance Ability' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Mass Cure Wounds — triggers service
  // ------------------------------------------------------------------
  describe('mass cure wounds', () => {
    it('triggers mass cure wounds service', async () => {
      const { triggerMassCureWounds } = await import('../features/massCureWoundsService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Mass Cure Wounds' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerMassCureWounds).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Mass Healing Word — triggers service
  // ------------------------------------------------------------------
  describe('mass healing word', () => {
    it('triggers mass healing word service', async () => {
      const { triggerMassHealingWord } = await import('../features/massHealingWordService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Mass Healing Word' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerMassHealingWord).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Prayer of Healing — triggers service
  // ------------------------------------------------------------------
  describe('prayer of healing', () => {
    it('triggers prayer of healing service', async () => {
      const { triggerPrayerOfHealing } = await import('../features/prayerOfHealingService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Prayer of Healing' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerPrayerOfHealing).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // False Life — triggers service
  // ------------------------------------------------------------------
  describe('false life', () => {
    it('triggers false life service', async () => {
      const { triggerFalseLife } = await import('../features/falseLifeService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'False Life' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerFalseLife).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Healing Word — triggers service
  // ------------------------------------------------------------------
  describe('healing word', () => {
    it('triggers healing word service', async () => {
      const { triggerHealingWord } = await import('../features/healingWordService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Healing Word' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerHealingWord).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Protection from Energy — triggers executeHandler
  // ------------------------------------------------------------------
  describe('protection from energy', () => {
    it('triggers protection from energy via executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Protection from Energy' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Protection from Poison — triggers executeHandler
  // ------------------------------------------------------------------
  describe('protection from poison', () => {
    it('triggers protection from poison via executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Protection from Poison' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Remove Curse — triggers service
  // ------------------------------------------------------------------
  describe('remove curse', () => {
    it('triggers remove curse service', async () => {
      const { triggerRemoveCurse } = await import('../features/removeCurseService.js')
      const services = makeServices()
      const spell = makeSpell({ name: 'Remove Curse' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(triggerRemoveCurse).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Dispel Magic — dispatches spell-result event
  // ------------------------------------------------------------------
  describe('dispel magic', () => {
    it('dispatches spell-result event for Dispel Magic', async () => {
      const events = []
      const handler = (e) => events.push(e.detail)
      window.addEventListener('spell-result', handler)

      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Dispel Magic' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx({ slotLevel: 2 }), services)

      const dispelEvent = events.find(e => e.isDispelMagic)
      expect(dispelEvent).toBeDefined()
      expect(dispelEvent.spellName).toBe('Dispel Magic')

      window.removeEventListener('spell-result', handler)
    })
  })

  // ------------------------------------------------------------------
  // Resistance (2024) — triggers executeHandler
  // ------------------------------------------------------------------
  describe('resistance', () => {
    it('routes resistance through executeHandler', async () => {
      const { executeHandler } = await import('../../automation/index.js')
      const services = makeServices({
        getTargetInfo: async () => ({ name: 'Target' }),
      })
      const spell = makeSpell({ name: 'Resistance' })
      delete spell.damage
      delete spell.dc

      await executeSpellCast(spell, makeMetaCtx(), services)

      expect(executeHandler).toHaveBeenCalled()
    })
  })
})
