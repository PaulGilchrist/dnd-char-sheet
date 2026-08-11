import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mocks — all dependencies of execution/index.js                     */
/* ------------------------------------------------------------------ */

vi.mock('../../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_playerName, _key, _campaignName) => undefined),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../automation/index.js', () => ({
  executeHandler: vi.fn(),
  checkCompelledDuelAttackExpiry: vi.fn(),
}));

vi.mock('../../../features/healingWordService.js', () => ({
  triggerHealingWord: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../rules/spells/postCastHealService.js', () => ({
  triggerPostCastSelfHeals: vi.fn(() => Promise.resolve()),
  triggerPostCastAllyHeals: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../../features/smiteOfProtectionService.js', () => ({
  triggerSmiteOfProtection: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../features/inspiringSmiteService.js', () => ({
  triggerInspiringSmite: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../features/primalCompanionSpellShareService.js', () => ({
  triggerPrimalCompanionSpellShare: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../features/wildMagicSurgeService.js', () => ({
  triggerWildMagicSurge: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../../rules/spells/postCastRiderService.js', () => ({
  triggerBewitchingMagic: vi.fn(() => Promise.resolve()),
  triggerPostCastRiderSaves: vi.fn(() => Promise.resolve()),
  triggerSpellThief: vi.fn(() => Promise.resolve()),
  triggerSoulstitchSpells: vi.fn(() => Promise.resolve()),
  getEmpoweredEvocationFeatures: vi.fn(() => []),
  getEmpoweredEvocationIntModifier: vi.fn(() => 0),
}));

vi.mock('../../../../automation/handlers/spells/sanctuaryHandler.js', () => ({
  endSanctuary: vi.fn(),
}));

vi.mock('../../../combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => null),
}));

vi.mock('../../../combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../features/silenceService.js', () => ({
  getSilenceSource: vi.fn(() => null),
  isCreatureInSilenceZone: vi.fn(() => false),
}));

vi.mock('../../../features/friendsService.js', () => ({
  endFriendsOnHostileAction: vi.fn(),
}));

vi.mock('../../../features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../../../combat/buffs/buffService.js', () => ({
  isInnateSorceryActive: vi.fn(() => false),
}));

vi.mock('../../../core/spellDamageUtils.js', () => ({
  resolveSpellDamageWithTypes: vi.fn(() => ({ formula: '1d8', primaryType: 'Fire' })),
}));

vi.mock('../../../features/confusionService.js', () => ({
  triggerConfusion: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  resolveHealingBonusesWithDetails: vi.fn(() => ({ totalBonus: 0, details: [] })),
  hasHealingMaximizationForTarget: vi.fn(() => false),
  hasRerollHealingOnes: vi.fn(() => false),
}));

vi.mock('../../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [5] })),
  rollExpressionMaximized: vi.fn(() => ({ total: 8, rolls: [8] })),
  applyHealingRerollOnes: vi.fn(() => ({ displayRolls: [5], originalRolls: [5] })),
}));

vi.mock('./helpers.js', () => ({
  refundSpellBreakerSlot: vi.fn(),
  applyHexEffects: vi.fn(),
  applyPowerWordHealToTarget: vi.fn(),
  applyPowerWordKillToTarget: vi.fn(),
  triggerArcaneWard: vi.fn(() => Promise.resolve()),
  triggerDispelMagic: vi.fn(() => Promise.resolve()),
  setupSpellBreakerDispelRetention: vi.fn(),
  triggerExpertDivination: vi.fn(() => Promise.resolve(null)),
  applyRegenerateSpell: vi.fn(),
  executeMagicMissile: vi.fn(() => Promise.resolve()),
}));

vi.mock('./blockChecks.js', () => ({
  checkGlobeOfInvulnerability: vi.fn(() => Promise.resolve(null)),
  checkForcecageBlocked: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('./modalSpells.js', () => ({
  handlePowerWordHeal: vi.fn(() => Promise.resolve({ handled: false })),
  handlePowerWordKill: vi.fn(() => Promise.resolve({ handled: false })),
  handleMassSuggestion: vi.fn(() => ({ handled: false })),
  handleCalmEmotions: vi.fn(() => ({ handled: false })),
  handleHypnoticPatternEarly: vi.fn(() => ({ handled: false })),
  handleConfusionEarly: vi.fn(() => ({ handled: false })),
  handleShapechange: vi.fn(() => ({ handled: false })),
  handleFear: vi.fn(() => ({ handled: false })),
  handleConjureVolley: vi.fn(() => ({ handled: false })),
  handleSilence: vi.fn(() => ({ handled: false })),
}));

vi.mock('./triggerSpells.js', () => ({
  handleRegenerate: vi.fn(() => Promise.resolve({ handled: false })),
  handleSeeInvisibility: vi.fn(() => Promise.resolve({ handled: false })),
  handleFleshToStone: vi.fn(() => Promise.resolve({ handled: false })),
  handleHoldMonster: vi.fn(() => Promise.resolve({ handled: false })),
  handleBanishment: vi.fn(() => Promise.resolve({ handled: false })),
  handleConfusion: vi.fn(() => Promise.resolve({ handled: false })),
  handleMaze: vi.fn(() => Promise.resolve({ handled: false })),
  handlePowerWordStun: vi.fn(() => Promise.resolve({ handled: false })),
  handleHypnoticPattern: vi.fn(() => Promise.resolve({ handled: false })),
  handleSlow: vi.fn(() => Promise.resolve({ handled: false })),
  handleBane: vi.fn(() => Promise.resolve({ handled: false })),
  handleBless: vi.fn(() => Promise.resolve({ handled: false })),
  handleBeaconOfHope: vi.fn(() => Promise.resolve({ handled: false })),
  handleMassSuggestion: vi.fn(() => Promise.resolve({ handled: false })),
  handleSuggestion: vi.fn(() => Promise.resolve({ handled: false })),
  handleOttoDance: vi.fn(() => Promise.resolve({ handled: false })),
  handleResilientSphere: vi.fn(() => Promise.resolve({ handled: false })),
  handleBlur: vi.fn(() => Promise.resolve({ handled: false })),
  handleExpeditiousRetreat: vi.fn(() => Promise.resolve({ handled: false })),
  handleFriends: vi.fn(() => Promise.resolve({ handled: false })),
  handleCompulsion: vi.fn(() => Promise.resolve({ handled: false })),
  handleCrownOfMadness: vi.fn(() => Promise.resolve({ handled: false })),
  handleAnimalFriendship: vi.fn(() => Promise.resolve({ handled: false })),
  handleDominateBeast: vi.fn(() => Promise.resolve({ handled: false })),
  handleDominateMonster: vi.fn(() => Promise.resolve({ handled: false })),
  handleDominatePerson: vi.fn(() => Promise.resolve({ handled: false })),
  handleRayOfEnfeeblement: vi.fn(() => Promise.resolve({ handled: false })),
  handleCompelledDuel: vi.fn(() => Promise.resolve({ handled: false })),
  handleGlobeOfInvulnerability: vi.fn(() => Promise.resolve({ handled: false })),
  handleForcecage: vi.fn(() => Promise.resolve({ handled: false })),
  handleStinkingCloud: vi.fn(() => Promise.resolve({ handled: false })),
  handleSleetStorm: vi.fn(() => Promise.resolve({ handled: false })),
  handleFaerieFire: vi.fn(() => Promise.resolve({ handled: false })),
  handleTashasHideousLaughter: vi.fn(() => Promise.resolve({ handled: false })),
  handleImprisonment: vi.fn(() => Promise.resolve({ handled: false })),
  handleHeroism: vi.fn(() => Promise.resolve({ handled: false })),
  handleHolyAura: vi.fn(() => Promise.resolve({ handled: false })),
  handleLongstrider: vi.fn(() => Promise.resolve({ handled: false })),
  handleSpareTheDying: vi.fn(() => Promise.resolve({ handled: false })),
  handleEnhanceAbility: vi.fn(() => Promise.resolve({ handled: false })),
  handleMassCureWounds: vi.fn(() => Promise.resolve({ handled: false })),
  handleMassHealingWord: vi.fn(() => Promise.resolve({ handled: false })),
  handlePrayerOfHealing: vi.fn(() => Promise.resolve({ handled: false })),
  handleFalseLife: vi.fn(() => Promise.resolve({ handled: false })),
  handleRemoveCurse: vi.fn(() => Promise.resolve({ handled: false })),
  handleProtectionFromEnergy: vi.fn(() => Promise.resolve({ handled: false })),
  handleProtectionFromPoison: vi.fn(() => Promise.resolve({ handled: false })),
  handleResistance: vi.fn(() => Promise.resolve({ handled: false })),
  handleGenericAutomation: vi.fn(() => Promise.resolve({ handled: false })),
}));

vi.mock('./savePath.js', () => ({
  handleSavePath: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('./noSavePath.js', () => ({
  handleNoSavePath: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('./damageCalculation.js', () => ({
  computeRange: vi.fn(() => ({})),
  computeEmpoweredEvocation: vi.fn(() => ({ empEvocFormula: null })),
  computeBlessedStrikes: vi.fn((_, formula) => formula),
  computeRadiantSoul: vi.fn((_, __, ___, ____, formula) => formula),
  computeOverchannel: vi.fn(() => ({ overchannelFormula: null, overchannelActive: false, overchannelUseCount: 0 })),
}));

vi.mock('./spellResolution.js', () => ({
  getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

/* ------------------------------------------------------------------ */
/*  SUT import after mocks                                             */
/* ------------------------------------------------------------------ */

import { executeSpellCast } from './index.js';

/* ------------------------------------------------------------------ */
/*  Mock references                                                    */
/* ------------------------------------------------------------------ */

const { resolveSpellDamageWithTypes } = await import('../../../core/spellDamageUtils.js');
const { getRuntimeValue } = await import('../../../../../hooks/runtime/useRuntimeState.js');
const {
  handlePowerWordHeal: mockPwh,
  handlePowerWordKill: mockPwk,
  handleMassSuggestion: mockMassSuggestion,
  handleCalmEmotions: mockCalmEmotions,
  handleHypnoticPatternEarly: mockHypnoticEarly,
  handleConfusionEarly: mockConfusionEarly,
  handleShapechange: mockShapechange,
  handleFear: mockFear,
  handleConjureVolley: mockConjureVolley,
  handleSilence: mockSilence,
} = await import('./modalSpells.js');
const {
  handleRegenerate: mockRegenerate,
  handleSeeInvisibility: mockSeeInvisibility,
  handleFleshToStone: mockFleshToStone,
  handleHoldMonster: mockHoldMonster,
  handleBanishment: mockBanishment,
  handleConfusion: mockConfusion,
  handleMaze: mockMaze,
  handlePowerWordStun: mockPowerWordStun,
  handleHypnoticPattern: mockHypnoticPattern,
  handleSlow: mockSlow,
  handleBane: mockBane,
  handleBless: mockBless,
  handleBeaconOfHope: mockBeaconOfHope,
  handleMassSuggestion: mockMassSuggestionTrigger,
  handleSuggestion: mockSuggestion,
  handleOttoDance: mockOttoDance,
  handleResilientSphere: mockResilientSphere,
  handleBlur: mockBlur,
  handleExpeditiousRetreat: mockExpeditiousRetreat,
  handleFriends: mockFriends,
  handleCompulsion: mockCompulsion,
  handleCrownOfMadness: mockCrownOfMadness,
  handleAnimalFriendship: mockAnimalFriendship,
  handleDominateBeast: mockDominateBeast,
  handleDominateMonster: mockDominateMonster,
  handleDominatePerson: mockDominatePerson,
  handleRayOfEnfeeblement: mockRayOfEnfeeblement,
  handleCompelledDuel: mockCompelledDuel,
  handleGlobeOfInvulnerability: mockGlobeInvuln,
  handleForcecage: mockForcecage,
  handleStinkingCloud: mockStinkingCloud,
  handleSleetStorm: mockSleetStorm,
  handleFaerieFire: mockFaerieFire,
  handleTashasHideousLaughter: mockHideousLaughter,
  handleImprisonment: mockImprisonment,
  handleHeroism: mockHeroism,
  handleHolyAura: mockHolyAura,
  handleLongstrider: mockLongstrider,
  handleSpareTheDying: mockSpareTheDying,
  handleEnhanceAbility: mockEnhanceAbility,
  handleMassCureWounds: mockMassCureWounds,
  handleMassHealingWord: mockMassHealingWord,
  handlePrayerOfHealing: mockPrayerOfHealing,
  handleFalseLife: mockFalseLife,
  handleRemoveCurse: mockRemoveCurse,
  handleProtectionFromEnergy: mockProtectionFromEnergy,
  handleProtectionFromPoison: mockProtectionFromPoison,
  handleResistance: mockResistance,
  handleGenericAutomation: mockGenericAutomation,
} = await import('./triggerSpells.js');

/* ------------------------------------------------------------------ */
/*  Test-data factories                                                */
/* ------------------------------------------------------------------ */

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    range: '150 feet',
    damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
    dc: { dc_type: 'dex', dc_success: 'half' },
    ...overrides,
  };
}

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    abilities: [{ name: 'Intelligence', bonus: 5 }],
    proficiency: 4,
    spellAbilities: {
      spellCastingAbility: 'Intelligence',
      toHit: 9,
      saveDc: 17,
      modifier: 5,
    },
    automation: { passives: [] },
    hitPoints: 100,
    level: 10,
    ...overrides,
  };
}

function makeMetaCtx(overrides = {}) {
  return {
    targetName: 'Goblin',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  beforeEach — reset all mock implementations to safe defaults       */
/* ------------------------------------------------------------------ */

describe('executeSpellCast — early returns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue([]);
    resolveSpellDamageWithTypes.mockReturnValue({ formula: '1d8', primaryType: 'Fire' });
    mockPwh.mockResolvedValue({ handled: false });
    mockPwk.mockResolvedValue({ handled: false });
    mockMassSuggestion.mockReturnValue({ handled: false });
    mockCalmEmotions.mockReturnValue({ handled: false });
    mockHypnoticEarly.mockReturnValue({ handled: false });
    mockConfusionEarly.mockReturnValue({ handled: false });
    mockShapechange.mockReturnValue({ handled: false });
    mockGenericAutomation.mockResolvedValue({ handled: false });
    mockRegenerate.mockResolvedValue({ handled: false });
    mockFear.mockReturnValue({ handled: false });
    mockConjureVolley.mockReturnValue({ handled: false });
    mockSeeInvisibility.mockResolvedValue({ handled: false });
    mockFleshToStone.mockResolvedValue({ handled: false });
    mockHoldMonster.mockResolvedValue({ handled: false });
    mockBanishment.mockResolvedValue({ handled: false });
    mockConfusion.mockResolvedValue({ handled: false });
    mockMaze.mockResolvedValue({ handled: false });
    mockPowerWordStun.mockResolvedValue({ handled: false });
    mockHypnoticPattern.mockResolvedValue({ handled: false });
    mockSlow.mockResolvedValue({ handled: false });
    mockBane.mockResolvedValue({ handled: false });
    mockBless.mockResolvedValue({ handled: false });
    mockBeaconOfHope.mockResolvedValue({ handled: false });
    mockMassSuggestionTrigger.mockResolvedValue({ handled: false });
    mockSuggestion.mockResolvedValue({ handled: false });
    mockOttoDance.mockResolvedValue({ handled: false });
    mockResilientSphere.mockResolvedValue({ handled: false });
    mockBlur.mockResolvedValue({ handled: false });
    mockExpeditiousRetreat.mockResolvedValue({ handled: false });
    mockFriends.mockResolvedValue({ handled: false });
    mockCompulsion.mockResolvedValue({ handled: false });
    mockCrownOfMadness.mockResolvedValue({ handled: false });
    mockAnimalFriendship.mockResolvedValue({ handled: false });
    mockDominateBeast.mockResolvedValue({ handled: false });
    mockDominateMonster.mockResolvedValue({ handled: false });
    mockDominatePerson.mockResolvedValue({ handled: false });
    mockRayOfEnfeeblement.mockResolvedValue({ handled: false });
    mockCompelledDuel.mockResolvedValue({ handled: false });
    mockGlobeInvuln.mockResolvedValue({ handled: false });
    mockForcecage.mockResolvedValue({ handled: false });
    mockStinkingCloud.mockResolvedValue({ handled: false });
    mockSleetStorm.mockResolvedValue({ handled: false });
    mockFaerieFire.mockResolvedValue({ handled: false });
    mockHideousLaughter.mockResolvedValue({ handled: false });
    mockImprisonment.mockResolvedValue({ handled: false });
    mockHeroism.mockResolvedValue({ handled: false });
    mockHolyAura.mockResolvedValue({ handled: false });
    mockLongstrider.mockResolvedValue({ handled: false });
    mockSpareTheDying.mockResolvedValue({ handled: false });
    mockEnhanceAbility.mockResolvedValue({ handled: false });
    mockMassCureWounds.mockResolvedValue({ handled: false });
    mockMassHealingWord.mockResolvedValue({ handled: false });
    mockPrayerOfHealing.mockResolvedValue({ handled: false });
    mockFalseLife.mockResolvedValue({ handled: false });
    mockRemoveCurse.mockResolvedValue({ handled: false });
    mockProtectionFromEnergy.mockResolvedValue({ handled: false });
    mockProtectionFromPoison.mockResolvedValue({ handled: false });
    mockResistance.mockResolvedValue({ handled: false });
    mockSilence.mockReturnValue({ handled: false });
  });

  /* ---------------------------------------------------------------- */
  /*  Power Word Heal early return                                    */
  /* ---------------------------------------------------------------- */

  describe('Power Word Heal early return', () => {
    it('returns early when Power Word Heal is handled', async () => {
      mockPwh.mockResolvedValue({ handled: true, result: { type: 'modal' } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Power Word Heal' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ type: 'modal' });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Power Word Kill early return                                    */
  /* ---------------------------------------------------------------- */

  describe('Power Word Kill early return', () => {
    it('returns early when Power Word Kill is handled', async () => {
      mockPwk.mockResolvedValue({ handled: true, result: { type: 'modal' } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Power Word Kill' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ type: 'modal' });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Modal spells early returns                                      */
  /* ---------------------------------------------------------------- */

  describe('modal spells early returns', () => {
    it('returns early for Mass Suggestion', async () => {
      mockMassSuggestion.mockReturnValue({ handled: true, result: { automationPopup: { type: 'modal', modalName: 'massSuggestion' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Mass Suggestion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'modal', modalName: 'massSuggestion' } });
    });

    it('returns early for Calm Emotions', async () => {
      mockCalmEmotions.mockReturnValue({ handled: true, result: { automationPopup: { type: 'modal', modalName: 'calmEmotions' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Calm Emotions' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'modal', modalName: 'calmEmotions' } });
    });

    it('returns early for Hypnotic Pattern (early)', async () => {
      mockHypnoticEarly.mockReturnValue({ handled: true, result: { automationPopup: { type: 'modal', modalName: 'hypnoticPattern' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Hypnotic Pattern' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'modal', modalName: 'hypnoticPattern' } });
    });

    it('returns early for Confusion (early)', async () => {
      mockConfusionEarly.mockReturnValue({ handled: true, result: { result: { handled: true } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Confusion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ handled: true });
    });

    it('returns early for Shapechange', async () => {
      mockShapechange.mockReturnValue({ handled: true, result: Promise.resolve({ automationPopup: { type: 'popup' } }) });

      const result = await executeSpellCast(
        makeSpell({ name: 'Shapechange' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Generic automation early return                                 */
  /* ---------------------------------------------------------------- */

  describe('generic automation early return', () => {
    it('returns early when generic automation is handled with result', async () => {
      mockGenericAutomation.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const spell = { name: 'TestSpell', automation: { type: 'test_type', effects: ['damage'] } };
      const result = await executeSpellCast(
        spell,
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns undefined when generic automation is handled without result', async () => {
      mockGenericAutomation.mockResolvedValue({ handled: true });

      const spell = { name: 'TestSpell', automation: { type: 'test_type', effects: ['damage'] } };
      const result = await executeSpellCast(
        spell,
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  No damage path — no formula                                     */
  /* ---------------------------------------------------------------- */

  describe('no damage path — no formula', () => {
    it('returns early when Regenerate is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockRegenerate.mockResolvedValue({ handled: true, result: { healed: 10 } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Regenerate' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ healed: 10 });
    });

    it('returns early when Fear is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockFear.mockReturnValue({ handled: true, result: { automationPopup: { type: 'modal' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Fear' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'modal' } });
    });

    it('returns early when Conjure Volley is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockConjureVolley.mockReturnValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Conjure Volley' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when See Invisibility is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSeeInvisibility.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'See Invisibility' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Flesh to Stone is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockFleshToStone.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Flesh to Stone' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Hold Monster is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockHoldMonster.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Hold Monster' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Banishment is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockBanishment.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Banishment' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Confusion (no-damage path) is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockConfusion.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Confusion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Maze is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockMaze.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Maze' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Power Word Stun is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockPowerWordStun.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Power Word Stun' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Hypnotic Pattern (no-damage path) is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockHypnoticPattern.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Hypnotic Pattern' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Slow is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSlow.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Slow' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Bane is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockBane.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Bane' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Bless is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockBless.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Bless' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Beacon of Hope is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockBeaconOfHope.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Beacon of Hope' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Mass Suggestion (trigger) is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockMassSuggestionTrigger.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Mass Suggestion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Suggestion is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSuggestion.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Suggestion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Otto Dance is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockOttoDance.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: "Otto's Irresistible Dance" }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Resilient Sphere is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockResilientSphere.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: "Otiluke's Resilient Sphere" }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Blur is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockBlur.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Blur' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Expeditious Retreat is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockExpeditiousRetreat.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Expeditious Retreat' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Friends is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockFriends.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Friends' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Compulsion is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockCompulsion.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Compulsion' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Crown of Madness is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockCrownOfMadness.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Crown of Madness' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Animal Friendship is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockAnimalFriendship.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Animal Friendship' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Dominate Beast is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockDominateBeast.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Dominate Beast' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Dominate Monster is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockDominateMonster.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Dominate Monster' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Dominate Person is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockDominatePerson.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Dominate Person' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Ray of Enfeeblement is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockRayOfEnfeeblement.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Ray of Enfeeblement' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Compelled Duel is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockCompelledDuel.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Compelled Duel' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Globe of Invulnerability is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockGlobeInvuln.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Globe of Invulnerability' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Forcecage is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockForcecage.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Forcecage' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Silence is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSilence.mockReturnValue({ handled: true, result: { automationPopup: { type: 'modal' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Silence' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'modal' } });
    });

    it('returns early when Stinking Cloud is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockStinkingCloud.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Stinking Cloud' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Sleet Storm is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSleetStorm.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Sleet Storm' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Faerie Fire is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockFaerieFire.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Faerie Fire' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Tasha\'s Hideous Laughter is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockHideousLaughter.mockResolvedValue({ handled: true, result: { handled: true } });

      const result = await executeSpellCast(
        makeSpell({ name: "Tasha's Hideous Laughter" }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ handled: true });
    });

    it('returns early when Imprisonment is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockImprisonment.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Imprisonment' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Holy Aura is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockHolyAura.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Holy Aura' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  No damage path — healing spells                                 */
  /* ---------------------------------------------------------------- */

  describe('no damage path — healing spells', () => {
    it('returns early when Mass Cure Wounds is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockMassCureWounds.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Mass Cure Wounds' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Mass Healing Word is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockMassHealingWord.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Mass Healing Word' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Prayer of Healing is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockPrayerOfHealing.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Prayer of Healing' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when False Life is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockFalseLife.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'False Life' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Remove Curse is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockRemoveCurse.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Remove Curse' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Protection From Energy is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockProtectionFromEnergy.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Protection from Energy' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Protection From Poison is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockProtectionFromPoison.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Protection from Poison' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });

    it('returns early when Resistance is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockResistance.mockResolvedValue({ handled: true });

      const result = await executeSpellCast(
        makeSpell({ name: 'Resistance' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  No damage path — Heroism, Longstrider, Spare the Dying, Enhance */
  /* ---------------------------------------------------------------- */

  describe('no damage path — special spells', () => {
    it('returns early when Heroism is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockHeroism.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Heroism' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Longstrider is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockLongstrider.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Longstrider' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Spare the Dying is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockSpareTheDying.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Spare the Dying' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });

    it('returns early when Enhance Ability is handled', async () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      mockEnhanceAbility.mockResolvedValue({ handled: true, result: { automationPopup: { type: 'popup' } } });

      const result = await executeSpellCast(
        makeSpell({ name: 'Enhance Ability' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toEqual({ automationPopup: { type: 'popup' } });
    });
  });
});
