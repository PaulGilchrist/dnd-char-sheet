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

const { getRuntimeValue, setRuntimeValue } = await import('../../../../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../../../ui/logService.js');
const { executeHandler } = await import('../../../../automation/index.js');
const { triggerPostCastSelfHeals, triggerPostCastAllyHeals } = await import('../../../../rules/spells/postCastHealService.js');
const { triggerSmiteOfProtection } = await import('../../../features/smiteOfProtectionService.js');
const { triggerInspiringSmite } = await import('../../../features/inspiringSmiteService.js');
const { triggerPrimalCompanionSpellShare } = await import('../../../features/primalCompanionSpellShareService.js');
const { triggerBewitchingMagic, triggerPostCastRiderSaves, triggerSpellThief } = await import('../../../../rules/spells/postCastRiderService.js');
const { endSanctuary } = await import('../../../../automation/handlers/spells/sanctuaryHandler.js');
const { getCombatContext } = await import('../../../combat/damageUtils.js');
const { getSilenceSource, isCreatureInSilenceZone } = await import('../../../features/silenceService.js');
const { endFriendsOnHostileAction } = await import('../../../features/friendsService.js');
const { endInvisibilityOnHostileAction } = await import('../../../features/invisibilityService.js');
const { isInnateSorceryActive } = await import('../../../../combat/buffs/buffService.js');
const { resolveSpellDamageWithTypes } = await import('../../../core/spellDamageUtils.js');
const { rollExpression, rollExpressionMaximized } = await import('../../../../dice/diceRoller.js');
const {
  triggerArcaneWard: mockTriggerArcaneWard,
  triggerDispelMagic: mockTriggerDispelMagic,
  setupSpellBreakerDispelRetention: mockSetupSpellBreaker,
  triggerExpertDivination: mockTriggerExpertDivination,
} = await import('./helpers.js');
const { checkGlobeOfInvulnerability: mockCheckGlobe, checkForcecageBlocked: mockCheckForcecage } = await import('./blockChecks.js');
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
const { handleSavePath: mockHandleSavePath } = await import('./savePath.js');
const { handleNoSavePath: mockHandleNoSavePath } = await import('./noSavePath.js');
const { computeRange, computeEmpoweredEvocation, computeBlessedStrikes, computeRadiantSoul, computeOverchannel } = await import('./damageCalculation.js');

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

describe('executeSpellCast', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockResolvedValue(undefined);
    addEntry.mockResolvedValue(undefined);
    executeHandler.mockResolvedValue(null);
    isInnateSorceryActive.mockReturnValue(false);
    getSilenceSource.mockReturnValue(null);
    isCreatureInSilenceZone.mockReturnValue(false);
    resolveSpellDamageWithTypes.mockReturnValue({ formula: '1d8', primaryType: 'Fire' });
    mockCheckGlobe.mockResolvedValue(null);
    mockCheckForcecage.mockResolvedValue(null);
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
    rollExpression.mockReturnValue({ total: 5, rolls: [5] });
    rollExpressionMaximized.mockReturnValue({ total: 8, rolls: [8] });
    computeRange.mockReturnValue({});
    computeEmpoweredEvocation.mockReturnValue({ empEvocFormula: '1d8' });
    computeBlessedStrikes.mockImplementation((_, formula) => formula);
    computeRadiantSoul.mockImplementation((_, __, ____, ___, formula) => formula);
    computeOverchannel.mockReturnValue({ overchannelFormula: null, overchannelActive: false, overchannelUseCount: 0 });
    getCombatContext.mockReturnValue(null);
  });

  /* ---------------------------------------------------------------- */
  /*  Block checks — buff blocking                                    */
  /* ---------------------------------------------------------------- */

  describe('block checks — buff blocking', () => {
    it('returns undefined when a buff blocks spellcasting', async () => {
      // Import and mock the dynamic import for spellResolution
      const spellResolution = await import('./spellResolution.js');
      const originalGetActiveBuffs = spellResolution.getActiveBuffs;
      spellResolution.getActiveBuffs = vi.fn(() => [{ blocksSpellcasting: true }]);

      const result = await executeSpellCast(
        makeSpell(),
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

      // Restore
      spellResolution.getActiveBuffs = originalGetActiveBuffs;
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Block checks — Globe of Invulnerability                         */
  /* ---------------------------------------------------------------- */

  describe('block checks — Globe of Invulnerability', () => {
    it('returns the globe block result when globe blocks the spell', async () => {
      const blockResult = { automationPopup: { type: 'popup', payload: { type: 'automation_info', name: 'Globe of Invulnerability', description: 'Fireball is blocked' } } };
      mockCheckGlobe.mockResolvedValue(blockResult);

      const result = await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBe(blockResult);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Block checks — Forcecage                                        */
  /* ---------------------------------------------------------------- */

  describe('block checks — Forcecage', () => {
    it('returns the forcecage block result when forcecage blocks the spell', async () => {
      const blockResult = { automationPopup: { type: 'popup', payload: { type: 'automation_info', name: 'Forcecage', description: 'Fireball is blocked' } } };
      mockCheckForcecage.mockResolvedValue(blockResult);

      const result = await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBe(blockResult);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Block checks — Antimagic Field (caster affected)                */
  /* ---------------------------------------------------------------- */

  describe('block checks — Antimagic Field (caster)', () => {
    it('returns popup when caster is affected by antimagic field', async () => {
      getRuntimeValue.mockImplementation((key, prop, _cn) => {
        if (key === 'campaign' && prop === 'targetEffects') {
          return [{ effect: 'antimagic_field', target: 'TestWizard' }];
        }
        return undefined;
      });

      const result = await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeDefined();
      expect(result.automationPopup).toBeDefined();
      expect(result.automationPopup.payload.description).toContain('Antimagic Field');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Block checks — Antimagic Field (target affected)                */
  /* ---------------------------------------------------------------- */

  describe('block checks — Antimagic Field (target)', () => {
    it('returns popup when target is affected by antimagic field', async () => {
      getRuntimeValue.mockImplementation((key, prop, _cn) => {
        if (key === 'campaign' && prop === 'targetEffects') {
          return [{ effect: 'antimagic_field', target: 'Goblin' }];
        }
        return undefined;
      });

      const result = await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeDefined();
      expect(result.automationPopup.payload.description).toContain('Antimagic Field');
      expect(result.automationPopup.payload.description).toContain('Goblin');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — magical ambush missing passives              */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — missing passives', () => {
    it('throws when passives is null', async () => {
      const playerStats = makePlayerStats({ automation: { passives: null } });

      await expect(
        executeSpellCast(makeSpell(), makeMetaCtx(), {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats,
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        }),
      ).rejects.toThrow('playerStats.automation.passives is required for magical ambush check');
    });

    it('throws when passives is undefined', async () => {
      const playerStats = makePlayerStats({ automation: {} });

      await expect(
        executeSpellCast(makeSpell(), makeMetaCtx(), {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats,
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        }),
      ).rejects.toThrow('playerStats.automation.passives is required for magical ambush check');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — missing activeConditions                     */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — missing activeConditions', () => {
    it('throws when activeConditions is null', async () => {
      getRuntimeValue.mockImplementation((playerName, key, _cn) => {
        if (key === 'activeConditions') return null;
        return undefined;
      });

      await expect(
        executeSpellCast(makeSpell(), makeMetaCtx(), {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        }),
      ).rejects.toThrow('activeConditions must be an array for caster');
    });

    it('throws when activeConditions is not an array', async () => {
      getRuntimeValue.mockImplementation((playerName, key, _cn) => {
        if (key === 'activeConditions') return 'not-an-array';
        return undefined;
      });

      await expect(
        executeSpellCast(makeSpell(), makeMetaCtx(), {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        }),
      ).rejects.toThrow('activeConditions must be an array for caster');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — silence blocking                             */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — silence blocking', () => {
    it('returns undefined when caster is silenced with verbal component', async () => {
      getSilenceSource.mockReturnValue('SilenceCaster');
      isCreatureInSilenceZone.mockReturnValue(true);

      const result = await executeSpellCast(
        makeSpell({ components: ['V', 'S'] }),
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

    it('does not block when spell has no verbal component', async () => {
      getSilenceSource.mockReturnValue(null);

      const result = await executeSpellCast(
        makeSpell({ components: ['S'] }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      // Function continues through and returns null (triggerResult default)
      expect(result).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — lastActionSpellCast                          */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — lastActionSpellCast', () => {
    it('sets lastActionSpellCast when casting_time is 1 action', async () => {
      await executeSpellCast(
        makeSpell({ casting_time: '1 action' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'lastActionSpellCast', 1, 'test-campaign');
    });

    it('does not set lastActionSpellCast for non-action spells', async () => {
      await executeSpellCast(
        makeSpell({ casting_time: '1 bonus action' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(setRuntimeValue).not.toHaveBeenCalledWith('TestWizard', 'lastActionSpellCast', 1, 'test-campaign');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — endFriends / endInvisibility                 */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — Friends / Invisibility', () => {
    it('calls endFriendsOnHostileAction for non-Friends spells', async () => {
      await executeSpellCast(
        makeSpell({ name: 'Fireball' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(endFriendsOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });

    it('does not call endFriendsOnHostileAction for Friends spell', async () => {
      await executeSpellCast(
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

      expect(endFriendsOnHostileAction).not.toHaveBeenCalled();
    });

    it('calls endInvisibilityOnHostileAction for all spells', async () => {
      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Spell resolution — logGenericSpellCast                          */
  /* ---------------------------------------------------------------- */

  describe('spell resolution — spell cast log', () => {
    it('logs a spell entry when spell is not Hex', async () => {
      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        type: 'spell',
        characterName: 'TestWizard',
        spellName: 'Fireball',
      }));
    });

    it('does not log the generic spell entry when spell name is Hex', async () => {
      await executeSpellCast(
        makeSpell({ name: 'Hex' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      // Hex skips the generic spell log (lines 174-185) but has its own Hex-specific log entry
      // The Hex-specific log uses spellName: 'Hex' as a separate entry
      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        spellName: 'Hex',
        type: 'spell',
      }));
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Hunter's Mark / Hex                                             */
  /* ---------------------------------------------------------------- */

  describe("Hunter's Mark / Hex", () => {
    it('returns early for Hunter\'s Mark', async () => {
      const result = await executeSpellCast(
        makeSpell({ name: "Hunter's Mark" }),
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
      // Should not have called any of the handler functions
      expect(mockTriggerDispelMagic).not.toHaveBeenCalled();
    });

    it('returns early for Hex and applies hex effects', async () => {
      const result = await executeSpellCast(
        makeSpell({ name: 'Hex' }),
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
      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        spellName: 'Hex',
      }));
    });

    it('Hex with Eldritch Hex passive logs both disadvantages', async () => {
      const playerStats = makePlayerStats({
        automation: {
          passives: [
            { name: 'Eldritch Hex', type: 'conditional_disadvantage' },
          ],
        },
      });

      await executeSpellCast(
        makeSpell({ name: 'Hex' }),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats,
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        effectsApplied: 'ability check disadvantage + saving throw disadvantage',
      }));
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Damage path — auto miss                                         */
  /* ---------------------------------------------------------------- */

  describe('damage path — auto miss', () => {
    it('returns null when range result is auto miss with save DC', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({ isAutoMiss: true, rangeReason: 'out of range' });

      const result = await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(result).toBeNull();
      expect(mockHandleSavePath).toHaveBeenCalled();
    });

    it('returns null when range result is auto miss without save DC', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({ isAutoMiss: true, rangeReason: 'out of range' });

      const spell = makeSpell({ dc: undefined });
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

      expect(result).toBeNull();
      expect(mockHandleSavePath).not.toHaveBeenCalled();
    });

    it('handles save path when spell has dc', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(mockHandleSavePath).toHaveBeenCalled();
    });

    it('handles no-save path when spell has no dc', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      const spell = makeSpell({ dc: undefined });
      await executeSpellCast(
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

      expect(mockHandleNoSavePath).toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Post-cast triggers                                              */
  /* ---------------------------------------------------------------- */

  describe('post-cast triggers', () => {
    it('calls all post-cast trigger functions on the damage path', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(triggerPostCastRiderSaves).toHaveBeenCalled();
      expect(triggerPostCastSelfHeals).toHaveBeenCalled();
      expect(triggerPostCastAllyHeals).toHaveBeenCalled();
      expect(triggerSmiteOfProtection).toHaveBeenCalled();
      expect(triggerInspiringSmite).toHaveBeenCalled();
      expect(triggerPrimalCompanionSpellShare).toHaveBeenCalled();
      expect(triggerSpellThief).toHaveBeenCalled();
      expect(triggerBewitchingMagic).toHaveBeenCalled();
      expect(mockTriggerExpertDivination).toHaveBeenCalled();
      expect(mockTriggerArcaneWard).toHaveBeenCalled();
    });

    it('calls setupSpellBreakerDispelRetention for Dispel Magic with slotLevel > 0', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      await executeSpellCast(
        makeSpell({ name: 'Dispel Magic' }),
        { ...makeMetaCtx(), slotLevel: 2 },
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(mockSetupSpellBreaker).toHaveBeenCalledWith('TestWizard', 2, 'test-campaign', expect.any(Object));
    });

    it('does not call setupSpellBreakerDispelRetention for Dispel Magic with slotLevel 0', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      await executeSpellCast(
        makeSpell({ name: 'Dispel Magic' }),
        { ...makeMetaCtx(), slotLevel: 0 },
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(mockSetupSpellBreaker).not.toHaveBeenCalled();
    });

    it('does not call setupSpellBreakerDispelRetention for non-Dispel Magic', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});

      await executeSpellCast(
        makeSpell({ name: 'Fireball' }),
        { ...makeMetaCtx(), slotLevel: 2 },
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
        },
      );

      expect(mockSetupSpellBreaker).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Post-cast — Sanctuary end                                       */
  /* ---------------------------------------------------------------- */

  describe('post-cast — Sanctuary end', () => {
    it('ends Sanctuary when caster has sanctuary effect and target is in characters list', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});
      getRuntimeValue.mockImplementation((playerName, prop, _cn) => {
        if (prop === 'targetEffects') {
          return [{ effect: 'sanctuary', target: 'TestWizard', source: 'Cleric' }];
        }
        if (prop === 'activeConditions') {
          return [];
        }
        return undefined;
      });

      const characters = [{ name: 'Cleric' }];

      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
          characters,
        },
      );

      expect(endSanctuary).toHaveBeenCalledWith('Cleric', 'TestWizard', 'test-campaign', expect.stringContaining('cast a spell'));
    });

    it('does not end Sanctuary when caster effect exists but caster not in characters', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});
      getRuntimeValue.mockImplementation((playerName, prop, _cn) => {
        if (prop === 'targetEffects') {
          return [{ effect: 'sanctuary', target: 'TestWizard', source: 'UnknownCaster' }];
        }
        if (prop === 'activeConditions') {
          return [];
        }
        return undefined;
      });

      const characters = [{ name: 'Cleric' }];

      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
          characters,
        },
      );

      expect(endSanctuary).not.toHaveBeenCalled();
    });

    it('handles empty sanctuary effects gracefully', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});
      getRuntimeValue.mockReturnValue([]);

      await executeSpellCast(
        makeSpell(),
        makeMetaCtx(),
        {
          rollAttack: vi.fn(),
          rollDamage: vi.fn(),
          playerStats: makePlayerStats(),
          getTargetInfo: async () => ({ name: 'Goblin' }),
          campaignName: 'test-campaign',
          characters: [],
        },
      );

      expect(endSanctuary).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Post-cast — Wild Magic Surge                                    */
  /* ---------------------------------------------------------------- */

  describe('post-cast — Wild Magic Surge', () => {
    it('handles Wild Magic Surge result when returned', async () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '8d6', primaryType: 'Fire' });
      computeRange.mockReturnValue({});
      const { triggerWildMagicSurge: wms } = await import('../../../features/wildMagicSurgeService.js');
      vi.mocked(wms).mockResolvedValue({ automationPopup: { type: 'popup' } });

      const result = await executeSpellCast(
        makeSpell(),
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
