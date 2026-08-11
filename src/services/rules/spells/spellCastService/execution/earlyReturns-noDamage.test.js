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
const { handleFear: mockFear, handleConjureVolley: mockConjureVolley, handleSilence: mockSilence } = await import('./modalSpells.js');
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

function resetAllMocks() {
  vi.clearAllMocks();
  getRuntimeValue.mockReturnValue([]);
  resolveSpellDamageWithTypes.mockReturnValue({ formula: '1d8', primaryType: 'Fire' });
  mockRegenerate.mockResolvedValue({ handled: false });
  mockFear.mockReturnValue({ handled: false });
  mockConjureVolley.mockReturnValue({ handled: false });
  mockSilence.mockReturnValue({ handled: false });
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
}

describe('executeSpellCast — early returns (no damage path)', () => {
  beforeEach(resetAllMocks);

  describe('no damage path — general spells', () => {
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
  });
});
