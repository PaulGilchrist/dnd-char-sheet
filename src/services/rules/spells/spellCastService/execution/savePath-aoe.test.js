import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  SUT — imported after mocks in main file                            */
/* ------------------------------------------------------------------ */

// Re-export the helpers from the main test file via a shared module
// Each file has its own mocks to be independently runnable

vi.mock('../../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [5] })),
  rollExpressionMaximized: vi.fn(() => ({ total: 8, rolls: [8] })),
}));

vi.mock('../../postCastRiderService.js', () => ({
  triggerSoulstitchSpells: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/rangeValidation.js', () => ({
  rangeToFeet: vi.fn((range) => {
    if (!range || typeof range !== 'string') return null;
    const match = String(range).match(/^(-?\d+(?:\.\d+)?)\s*(feet|foot|ft\.?)?$/i);
    return match ? parseFloat(match[1]) : null;
  }),
}));

vi.mock('../../../combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => null),
}));

vi.mock('../../../features/viciousMockeryService.js', () => ({
  triggerViciousMockeryForGeneric: vi.fn(() => Promise.resolve()),
}));

const { handleSavePath } = await import('./savePath.js');
const { rollExpression, rollExpressionMaximized } = await import('../../../../dice/diceRoller.js');
const { getCombatContext } = await import('../../../combat/damageUtils.js');

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

function makeFullSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    area_of_effect: { type: 'cone', size: 60 },
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

function makeSavePathArgs(overrides = {}) {
  return {
    spell: makeSpell(),
    fullSpell: makeSpell(),
    metaCtx: makeMetaCtx(),
    playerStats: makePlayerStats(),
    campaignName: 'test-campaign',
    mapName: null,
    characters: [],
    getTargetInfo: async () => ({ name: 'Goblin' }),
    getRuntimeValue: vi.fn(),
    innateSorceryActive: false,
    effectiveDamageType: 'Fire',
    spellSaveDc: 17,
    overchannelFormula: null,
    overchannelActive: false,
    overchannelUseCount: 0,
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    formula: undefined,
    hasInvisible: false,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  beforeEach — reset all mocks                                       */
/* ------------------------------------------------------------------ */

describe('savePath.js — handleAoE', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    rollExpression.mockReturnValue({ total: 5, rolls: [5] });
    rollExpressionMaximized.mockReturnValue({ total: 8, rolls: [8] });
    getCombatContext.mockReturnValue(null);
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — overlay targeting                                    */
  /* ---------------------------------------------------------------- */

  describe('overlay targeting', () => {
    it('fetches overlay when targetName starts with overlay-', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'overlay-abc123' }));

      getCombatContext.mockReturnValue({
        creatures: [{ name: 'TestWizard', targetName: 'overlay-abc123' }],
      });

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ id: 'abc123', name: 'Test Overlay' }]),
        }),
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock;

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/spell-overlays');
      expect(result.automationPopup.payload.activeOverlay).toEqual({ id: 'abc123', name: 'Test Overlay' });

      globalThis.fetch = originalFetch;
    });

    it('sets activeOverlay to null when overlay not found in fetch result', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'overlay-xyz789' }));

      getCombatContext.mockReturnValue({
        creatures: [{ name: 'TestWizard', targetName: 'overlay-xyz789' }],
      });

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ id: 'abc123', name: 'Other Overlay' }]),
        }),
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock;

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.activeOverlay).toBeNull();

      globalThis.fetch = originalFetch;
    });

    it('sets activeOverlay to null when fetch throws', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'overlay-abc123' }));

      getCombatContext.mockReturnValue({
        creatures: [{ name: 'TestWizard', targetName: 'overlay-abc123' }],
      });

      const fetchMock = vi.fn(() => Promise.reject(new Error('Network error')));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock;

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.activeOverlay).toBeNull();

      globalThis.fetch = originalFetch;
    });

    it('does not fetch overlay when targetName does not start with overlay-', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));

      getCombatContext.mockReturnValue({
        creatures: [{ name: 'TestWizard', targetName: 'Goblin' }],
      });

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ id: 'abc123', name: 'Test Overlay' }]),
        }),
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock;

      await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(fetchMock).not.toHaveBeenCalled();

      globalThis.fetch = originalFetch;
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — damage expression resolution                         */
  /* ---------------------------------------------------------------- */

  describe('damage expression resolution', () => {
    it('uses damage_at_slot_level at slot level', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6', 4: '10d6', 5: '12d6' } },
      });
      args.metaCtx = { slotLevel: 4 };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('10d6');
    });

    it('falls back to highest slot level <= slotLevel when exact level missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6', 5: '12d6' } },
      });
      args.metaCtx = { slotLevel: 4 };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('8d6');
    });

    it('falls back to first key when no slot level matches', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_type: 'Fire', damage_at_slot_level: { 5: '12d6' } },
      });
      args.metaCtx = { slotLevel: 3 };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('12d6');
    });

    it('uses spell.damage_at_slot_level when fullSpell.damage is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeSpell({
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: { 3: '6d6' } },
      });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('6d6');
    });

    it('uses damage_at_character_level when damage_at_slot_level is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Fireball',
        area_of_effect: { type: 'cone', size: 60 },
        damage: {
          damage_type: 'Fire',
          damage_at_character_level: { 1: '3d6', 5: '8d6' },
        },
        dc: { dc_type: 'dex', dc_success: 'half' },
      };
      args.metaCtx = { slotLevel: 5 };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('8d6');
    });

    it('uses spell.damage_at_slot_level as final fallback', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Fireball',
        area_of_effect: { type: 'cone', size: 60 },
        dc: { dc_type: 'dex', dc_success: 'half' },
      };
      args.spell = { damage: { damage_at_slot_level: { 3: '6d6' } } };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damage).toBe('6d6');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — condition-only AoE (grease)                          */
  /* ---------------------------------------------------------------- */

  describe('condition-only AoE', () => {
    it('returns aoeCondition modal for grease with fail effects', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Grease',
        area_of_effect: { type: 'square', size: 10 },
        damage: { damage_type: 'Bludgeoning', damage_at_slot_level: {} },
        dc: { dc_type: 'dex' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'prone' }],
          },
        },
      };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('aoeCondition');
      expect(result.automationPopup.payload.includeCaster).toBe(true);
      expect(result.automationPopup.payload.shape).toBe('square');
      expect(result.automationPopup.payload.saveType).toBe('dex');
      expect(result.automationPopup.payload.conditionLabel).toBe('prone');
    });

    it('does not include caster for non-grease condition-only AoE', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Slow',
        area_of_effect: { type: 'cube', size: 40 },
        damage: { damage_type: '', damage_at_slot_level: {} },
        dc: { dc_type: 'wis' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'slowed' }],
          },
        },
      };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('aoeCondition');
      expect(result.automationPopup.payload.includeCaster).toBe(false);
    });

    it('uses fullSpell.dc.dc_type when present', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Grease',
        area_of_effect: { type: 'square', size: 10 },
        damage: { damage_at_slot_level: {} },
        dc: { dc_type: 'str' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'prone' }],
          },
        },
      };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('str');
    });

    it('falls back to spell.dc.dc_type when fullSpell.dc is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Grease',
        area_of_effect: { type: 'square', size: 10 },
        damage: { damage_at_slot_level: {} },
        dc: null,
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'prone' }],
          },
        },
      };
      args.spell = { dc: { dc_type: 'con' } };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('con');
    });

    it('defaults saveType to CON when no dc is defined', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Grease',
        area_of_effect: { type: 'square', size: 10 },
        damage: { damage_at_slot_level: {} },
        dc: null,
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'prone' }],
          },
        },
      };
      args.spell = { dc: {} };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('CON');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — innate sorcery DC bonus                              */
  /* ---------------------------------------------------------------- */

  describe('innate sorcery DC bonus', () => {
    it('adds +1 to saveDc when innateSorceryActive is true for condition-only AoE', async () => {
      const args = makeSavePathArgs({ innateSorceryActive: true });
      args.fullSpell = {
        name: 'Grease',
        area_of_effect: { type: 'square', size: 10 },
        damage: { damage_at_slot_level: {} },
        dc: { dc_type: 'dex' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'prone' }],
          },
        },
      };
      args.effectiveDamageType = '';

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveDc).toBe(18);
    });

    it('adds +1 to saveDc when innateSorceryActive is true for regular AoE', async () => {
      const args = makeSavePathArgs({ innateSorceryActive: true });
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveDc).toBe(18);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — dc_success resolution                                */
  /* ---------------------------------------------------------------- */

  describe('dc_success resolution', () => {
    it('maps dc_success 0 to "none"', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: { dc_type: 'dex', dc_success: 0 },
      });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.dcSuccess).toBe('none');
    });

    it('maps dc_success 0.5 to "half"', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: { dc_type: 'dex', dc_success: 0.5 },
      });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.dcSuccess).toBe('half');
    });

    it('uses dc_success value as-is when not 0 or 0.5', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: { dc_type: 'dex', dc_success: 'none' },
      });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.dcSuccess).toBe('none');
    });

    it('falls back to spell.dc.dc_success when fullSpell.dc is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: null,
      });
      args.spell = { dc: { dc_success: 0 } };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.dcSuccess).toBe('none');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — metamagicHeighten with hasInvisible                  */
  /* ---------------------------------------------------------------- */

  describe('metamagicHeighten', () => {
    it('sets metamagicHeighten to true when hasInvisible is true', async () => {
      const args = makeSavePathArgs({ hasInvisible: true });
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.metamagicHeighten).toBe(true);
    });

    it('sets metamagicHeighten from metaCtx when hasInvisible is false', async () => {
      const args = makeSavePathArgs({ hasInvisible: false });
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.metaCtx = { metamagicHeighten: 'Heightened' };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.metamagicHeighten).toBe('Heightened');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — rangeToFeet integration                              */
  /* ---------------------------------------------------------------- */

  describe('rangeToFeet integration', () => {
    it('passes range through rangeToFeet', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 }, range: '200 feet' });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.range).toBe(200);
    });

    it('handles null range when both fullSpell and spell have null range', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 }, range: null });
      args.spell = { range: null };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.range).toBe(null);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — getCombatContext with overlay targeted creature      */
  /* ---------------------------------------------------------------- */

  describe('getCombatContext with overlay targeted creature', () => {
    it('finds targetName from combat context when overlay targeted', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'overlay-test123' }));

      getCombatContext.mockReturnValue({
        creatures: [{ name: 'TestWizard', targetName: 'overlay-test123' }],
      });

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([{ id: 'test123', name: 'Overlay' }]),
        }),
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock;

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.activeOverlay).toEqual({ id: 'test123', name: 'Overlay' });

      globalThis.fetch = originalFetch;
    });

    it('handles null combat context', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));

      getCombatContext.mockReturnValue(null);

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.activeOverlay).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — automationEffects fail conditions                    */
  /* ---------------------------------------------------------------- */

  describe('automationEffects fail conditions', () => {
    it('extracts condition names from fail effects', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: '' });
      args.fullSpell = {
        name: 'Frightful Presence',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: {} },
        dc: { dc_type: 'wis' },
        automation: {
          effects: {
            fail: [
              { type: 'condition', condition: 'frightened' },
              { type: 'condition', condition: 'incapacitated' },
            ],
          },
        },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.conditionLabel).toBe('frightened, incapacitated');
    });

    it('filters out effects without condition/type', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: '' });
      args.fullSpell = {
        name: 'TestSpell',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: {} },
        dc: { dc_type: 'dex' },
        automation: {
          effects: {
            fail: [
              { type: 'condition', condition: 'prone' },
              { someOtherField: 'value' },
              { condition: 'blinded' },
            ],
          },
        },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.conditionLabel).toBe('prone, blinded');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — hasDamage detection                                  */
  /* ---------------------------------------------------------------- */

  describe('hasDamage detection', () => {
    it('treats damageExpression "0" as no damage', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: '' });
      args.fullSpell = {
        name: 'TestSpell',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: { 3: '0' } },
        dc: { dc_type: 'dex' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'slowed' }],
          },
        },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('aoeCondition');
    });

    it('treats empty string damageExpression as no damage', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: '' });
      args.fullSpell = {
        name: 'TestSpell',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: { 3: '' } },
        dc: { dc_type: 'dex' },
        automation: {
          effects: {
            fail: [{ type: 'condition', condition: 'slowed' }],
          },
        },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('aoeCondition');
    });

    it('treats valid damage expression as having damage', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Fireball',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
        dc: { dc_type: 'dex', dc_success: 'half' },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('saveAttackAoe');
      expect(result.automationPopup.payload.damage).toBe('8d6');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — saveAttackAoe payload structure                      */
  /* ---------------------------------------------------------------- */

  describe('saveAttackAoe payload structure', () => {
    it('includes full action object with name and automation', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.action.name).toBe('Fireball');
      expect(result.automationPopup.payload.action.automation).toEqual({});
      expect(result.automationPopup.payload.action.spell).toEqual(args.fullSpell);
    });

    it('includes playerStats and campaignName in payload', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.playerStats).toEqual(args.playerStats);
      expect(result.automationPopup.payload.campaignName).toBe('test-campaign');
    });

    it('includes metamagicCareful from metaCtx', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });
      args.metaCtx = { metamagicCareful: ['Goblin'] };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.metamagicCareful).toEqual(['Goblin']);
    });

    it('defaults metamagicCareful to false when not in metaCtx', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.metamagicCareful).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — damage type and dc_type fallbacks                    */
  /* ---------------------------------------------------------------- */

  describe('damage type and dc_type fallbacks', () => {
    it('uses effectiveDamageType directly', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: 'Lightning' });
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 } });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.damageType).toBe('Lightning');
    });

    it('uses fullSpell.dc.dc_type when present', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: { dc_type: 'con' },
      });

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('con');
    });

    it('falls back to spell.dc.dc_type when fullSpell.dc is null', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: null,
      });
      args.spell = { dc: { dc_type: 'str' } };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('str');
    });

    it('defaults to DEX when no dc_type is defined', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({
        area_of_effect: { type: 'cone', size: 60 },
        dc: null,
      });
      args.spell = { dc: {} };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.saveType).toBe('DEX');
    });

    it('uses spell.range when fullSpell.range is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = makeFullSpell({ area_of_effect: { type: 'cone', size: 60 }, range: null });
      args.spell = { range: '150 feet' };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.payload.range).toBe(150);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — condition-only with no fail effects                  */
  /* ---------------------------------------------------------------- */

  describe('condition-only with no fail effects', () => {
    it('goes to saveAttackAoe when automationEffects.fail is empty', async () => {
      const args = makeSavePathArgs({ effectiveDamageType: '' });
      args.fullSpell = {
        name: 'TestSpell',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_at_slot_level: {} },
        dc: { dc_type: 'dex' },
        automation: {
          effects: { fail: [] },
        },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('saveAttackAoe');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  handleAoE — no automation at all                                 */
  /* ---------------------------------------------------------------- */

  describe('no automation at all', () => {
    it('goes to saveAttackAoe when automation is missing', async () => {
      const args = makeSavePathArgs();
      args.fullSpell = {
        name: 'Fireball',
        area_of_effect: { type: 'cone', size: 60 },
        damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
        dc: { dc_type: 'dex', dc_success: 'half' },
      };

      const result = await handleSavePath(
        args.spell, args.fullSpell, args.metaCtx, args.playerStats,
        args.campaignName, args.mapName, args.characters, args.getTargetInfo,
        args.getRuntimeValue, args.innateSorceryActive, args.effectiveDamageType,
        args.spellSaveDc, args.overchannelFormula, args.overchannelActive,
        args.overchannelUseCount, args.rollAttack, args.rollDamage,
        args.formula, args.hasInvisible,
      );

      expect(result.automationPopup.modalName).toBe('saveAttackAoe');
    });
  });
});
