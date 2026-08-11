import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionSpellMetamagic } from './useActionSpellMetamagic.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 5),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
  logMetamagicUse: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(() => Promise.resolve(null)),
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestSorcerer',
    class: { name: 'Sorcerer' },
    level: 5,
    ...overrides,
  };
}

function makeNonSorcererStats(overrides = {}) {
  return {
    name: 'TestWizard',
    class: { name: 'Wizard' },
    level: 5,
    ...overrides,
  };
}

function makeAttack(overrides = {}) {
  return {
    name: 'Fireball',
    spellLevel: 3,
    castingTime: '1 Action',
    ...overrides,
  };
}

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    casting_time: '1 Action',
    ...overrides,
  };
}

function makeHookProps(overrides = {}) {
  return {
    playerStats: makePlayerStats(),
    campaignName: 'test-campaign',
    mapName: 'test-map',
    cannotAct: false,
    setPopupHtml: vi.fn(),
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    buildCtx: vi.fn(),
    handleAttackClick: vi.fn(),
    setModalState: vi.fn(),
    characters: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useActionSpellMetamagic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Return value structure ─────────────────────────────────────────────

  describe('return value', () => {
    it('returns an object with expected properties', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current).toHaveProperty('pendingActionMetamagic');
      expect(result.current).toHaveProperty('isBonusSorcerer');
      expect(result.current).toHaveProperty('handleActionMetamagicConfirm');
      expect(result.current).toHaveProperty('handleActionMetamagicSkip');
      expect(result.current).toHaveProperty('handleActionSpellDamageClick');
      expect(result.current).toHaveProperty('handleSpellAttackClick');
      expect(typeof result.current.handleActionMetamagicConfirm).toBe('function');
      expect(typeof result.current.handleActionMetamagicSkip).toBe('function');
      expect(typeof result.current.handleActionSpellDamageClick).toBe('function');
      expect(typeof result.current.handleSpellAttackClick).toBe('function');
    });

    it('returns null for pendingActionMetamagic initially', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.pendingActionMetamagic).toBeNull();
    });

    it('sets isBonusSorcerer to true when class is Sorcerer', () => {
      const props = makeHookProps({ playerStats: makePlayerStats() });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.isBonusSorcerer).toBe(true);
    });

    it('sets isBonusSorcerer to false when class is not Sorcerer', () => {
      const props = makeHookProps({ playerStats: makeNonSorcererStats() });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.isBonusSorcerer).toBe(false);
    });
  });

  // ── handleActionMetamagicConfirm ───────────────────────────────────────

  describe('handleActionMetamagicConfirm', () => {
    it('does nothing when no pending metamagic', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      act(() => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(result.current.pendingActionMetamagic).toBeNull();
    });

    it('clears pending and calls action on confirm with basic result', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(result.current.pendingActionMetamagic).toBeNull();
      expect(executeSpellCast).toHaveBeenCalled();
    });

    it('spends sorcery points when totalCost > 0', async () => {
      const { spendSorceryPoints } = await import('./useMetamagic.js');
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 3, options: ['Heightened Spell'] });
      });

      expect(spendSorceryPoints).toHaveBeenCalledWith(
        'TestSorcerer',
        3,
        'test-campaign',
        10,
      );
    });

    it('adds Psionic Sorcery to options when psionicCost > 0', async () => {
      const { logMetamagicUse } = await import('./useMetamagic.js');
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(true);
      hasPsionicSorcery.mockReturnValue(true);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
      });

      expect(logMetamagicUse).toHaveBeenCalledWith(
        'test-campaign',
        'TestSorcerer',
        'Fireball',
        expect.arrayContaining(['Psionic Sorcery']),
        3,
      );
    });

    it('logs metamagic use when totalCost > 0', async () => {
      const { logMetamagicUse } = await import('./useMetamagic.js');
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 2, options: ['Quickened Spell'] });
      });

      expect(logMetamagicUse).toHaveBeenCalledWith(
        'test-campaign',
        'TestSorcerer',
        'Fireball',
        expect.arrayContaining(['Quickened Spell']),
        2,
      );
    });

    it('adds logEntry for spell when confirming with metamagic', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 2, options: ['Quickened Spell'] });
      });

      expect(addEntry).toHaveBeenCalledWith(
        'test-campaign',
        expect.objectContaining({
          type: 'spell',
          characterName: 'TestSorcerer',
          spellName: 'Fireball',
          spellLevel: 3,
          castingTime: '1 Action',
          metamagic: expect.arrayContaining(['Quickened Spell']),
          spCost: 2,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('sets metamagicHeighten in metaCtx when Heightened Spell is selected', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 3, options: ['Heightened Spell'] });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ metamagicHeighten: true }),
        expect.any(Object),
      );
    });

    it('sets metamagicCareful in metaCtx when Careful Spell is selected', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 1, options: ['Careful Spell'] });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ metamagicCareful: true }),
        expect.any(Object),
      );
    });

    it('sets metamagicTwinTarget when Twinned Spell with twinTarget', async () => {
      const spell = makeSpell({ name: 'Magic Missile', level: 1 });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Magic Missile' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({
          totalCost: 1,
          options: ['Twinned Spell'],
          twinTarget: 'Goblin A',
        });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ metamagicTwinTarget: 'Goblin A' }),
        expect.any(Object),
      );
    });

    it('does not set metamagicTwinTarget when Twinned Spell without twinTarget', async () => {
      const spell = makeSpell({ name: 'Magic Missile', level: 1 });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Magic Missile' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({
          totalCost: 1,
          options: ['Twinned Spell'],
        });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({}),
        expect.any(Object),
      );
    });

    it('sets metamagicDistant in metaCtx when Distant Spell is selected', async () => {
      const spell = makeSpell({ name: 'Magic Missile', level: 1 });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Magic Missile' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 1, options: ['Distant Spell'] });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ metamagicDistant: true }),
        expect.any(Object),
      );
    });

    it('sets psionicSpell in metaCtx when psionicCost > 0', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(true);
      hasPsionicSorcery.mockReturnValue(true);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ psionicSpell: true }),
        expect.any(Object),
      );
    });

    it('does not spend SP when totalCost is 0', async () => {
      const { spendSorceryPoints } = await import('./useMetamagic.js');
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      await act(async () => {
        result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
      });

      expect(spendSorceryPoints).not.toHaveBeenCalled();
    });
  });

  // ── handleActionMetamagicSkip ──────────────────────────────────────────

  describe('handleActionMetamagicSkip', () => {
    it('does nothing when no pending metamagic', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      act(() => {
        result.current.handleActionMetamagicSkip();
      });

      expect(result.current.pendingActionMetamagic).toBeNull();
    });

    it('clears pending and calls action with empty metaCtx on skip', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { addEntry } = await import('../../services/ui/logService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({ name: 'Fireball' });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicSkip();
      });

      expect(result.current.pendingActionMetamagic).toBeNull();
      expect(addEntry).toHaveBeenCalledWith(
        'test-campaign',
        expect.objectContaining({
          type: 'spell',
          characterName: 'TestSorcerer',
          spellName: 'Fireball',
          spellLevel: 3,
          castingTime: '1 Action',
          metamagic: [],
          spCost: 0,
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  // ── handleActionSpellDamageClick (resolveSpellDamage) ──────────────────

  describe('handleActionSpellDamageClick', () => {
    it('sets modalState for area of effect attacks with shape', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
        saveDc: 15,
        saveSuccess: 0.5,
        damage: '8d6',
        damageType: 'fire',
        saveType: 'DEX',
        range: '150 feet',
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({
            shape: 'sphere',
            range: 150,
            damage: '8d6',
            damageType: 'fire',
            saveType: 'DEX',
            saveDc: 15,
            dcSuccess: 'half',
          }),
        }),
      );
    });

    it('extracts range number from range string', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'cone', size: '30-foot' },
        range: '30 feet',
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({ range: 30 }),
        }),
      );
    });

    it('handles Self range as 0', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
        range: 'Self',
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({ range: 0 }),
        }),
      );
    });

    it('handles numeric range directly', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
        range: 60,
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({ range: 60 }),
        }),
      );
    });

    it('handles saveSuccess 0 as none', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
        saveSuccess: 0,
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({ dcSuccess: 'none' }),
        }),
      );
    });

    it('handles all recognized area shapes', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const shapes = ['emanation', 'cone', 'line', 'sphere', 'cube', 'cylinder', 'square', 'circle', 'wall', 'cage', 'floor', 'area'];

      for (const shape of shapes) {
        vi.clearAllMocks();
        setModalState.mockClear();
        const attack = makeAttack({
          name: 'Fireball',
          area_of_effect: { shape: shape, size: '20-foot-radius' },
        });

        await act(async () => {
          result.current.handleActionSpellDamageClick(attack);
        });

        expect(setModalState).toHaveBeenCalled();
        expect(setModalState).toHaveBeenCalledWith(
          expect.objectContaining({
            saveAttackAoeModal: expect.objectContaining({ shape }),
          }),
        );
      }
    });

    it('does not set modalState for non-area attacks', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Magic Missile',
        area_of_effect: null,
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).not.toHaveBeenCalled();
    });

    it('does not set modalState when setModalState is null', async () => {
      const props = makeHookProps({ setModalState: null });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      });

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).toBeNull();
    });

    it('does not set modalState for non-sorcerer when no spell found', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [] },
        }),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');
      const { isFreeCastAuthorized } = await import('../../services/rules/spells/spellPreparationService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(executeSpellCast).toHaveBeenCalled();
      expect(prepareSpellCast).toHaveBeenCalled();
      expect(isFreeCastAuthorized).toHaveBeenCalled();
    });

    it('non-sorcerer resolveSpellDamage calls setPopupHtml when automationPopup popup returned (no spell)', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Spell cast!</div>',
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Spell cast!</div>');
    });

    it('non-sorcerer resolveSpellDamage does not call setPopupHtml when automationPopup type is modal (no spell)', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'testModal',
          payload: { action: { name: 'Test' } },
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('calls executeSpellCast for non-sorcerer with spell found', async () => {
      const setModalState = vi.fn();
      const spell = makeSpell();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(prepareSpellCast).toHaveBeenCalled();
      expect(executeSpellCast).toHaveBeenCalled();
    });

    it('non-sorcerer calls setPopupHtml when automationPopup is returned', async () => {
      const setModalState = vi.fn();
      const spell = makeSpell();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Spell cast!</div>',
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Spell cast!</div>');
    });

    it('non-sorcerer does not call setPopupHtml when automationPopup type is modal', async () => {
      const setModalState = vi.fn();
      const spell = makeSpell();
      const props = makeHookProps({
        setModalState,
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'testModal',
          payload: { action: { name: 'Test' } },
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('sorcerer with no spell found calls handleAttackClick', async () => {
      const handleAttackClick = vi.fn();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [] },
        }),
        handleAttackClick,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      const attack = makeAttack({
        name: 'UnknownSpell',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(handleAttackClick).toHaveBeenCalledWith(attack);
      expect(executeSpellCast).not.toHaveBeenCalled();
    });

    it('sorcerer sets pendingActionMetamagic when spell is found', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();
      expect(result.current.pendingActionMetamagic.spellName).toBe('Fireball');
      expect(result.current.pendingActionMetamagic.spellLevel).toBe(3);
      expect(result.current.pendingActionMetamagic.isPsionic).toBe(false);
    });

    it('sorcerer sets pendingActionMetamagic with psionic info when psionic', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(true);
      hasPsionicSorcery.mockReturnValue(true);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();
      expect(result.current.pendingActionMetamagic.isPsionic).toBe(true);
      expect(result.current.pendingActionMetamagic.psionicCost).toBe(3);
    });

    it('sorcerer pending action calls executeSpellCast when confirmed', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(executeSpellCast).toHaveBeenCalled();
    });

    it('sorcerer pending action calls setPopupHtml when automationPopup returned', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Cast result!</div>',
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Cast result!</div>');
    });

    it('sorcerer pending action does not call setPopupHtml when automationPopup type is modal', async () => {
      const spell = makeSpell();
      const setModalState = vi.fn();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
        setModalState,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'testModal',
          payload: { action: { name: 'Test' } },
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('does not set modalState for area attacks when cannotAct is true (handled by handleSpellAttackClick)', async () => {
      const setModalState = vi.fn();
      const props = makeHookProps({ setModalState });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      });

      // Manually set cannotAct to true
      props.cannotAct = true;

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      // resolveSpellDamage does NOT check cannotAct - only handleSpellAttackClick does
      // So modal should still be set
      expect(setModalState).toHaveBeenCalled();
    });
  });

  // ── handleSpellAttackClick ─────────────────────────────────────────────

  describe('handleSpellAttackClick', () => {
    it('returns early when cannotAct is true', async () => {
      const handleAttackClick = vi.fn();
      const props = makeHookProps({
        cannotAct: true,
        handleAttackClick,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(handleAttackClick).not.toHaveBeenCalled();
      expect(executeSpellCast).not.toHaveBeenCalled();
      expect(prepareSpellCast).not.toHaveBeenCalled();
    });

    it('calls handleAttackClick when spell is not found for non-sorcerer', async () => {
      const handleAttackClick = vi.fn();
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [] },
        }),
        handleAttackClick,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      const attack = makeAttack({
        name: 'UnknownSpell',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(handleAttackClick).toHaveBeenCalledWith(attack);
      expect(executeSpellCast).not.toHaveBeenCalled();
    });

    it('calls executeSpellCast for non-sorcerer when spell is found', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(prepareSpellCast).toHaveBeenCalled();
      expect(executeSpellCast).toHaveBeenCalled();
    });

    it('non-sorcerer calls setPopupHtml when automationPopup is returned', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Attack cast!</div>',
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Attack cast!</div>');
    });

    it('non-sorcerer does not call setPopupHtml when automationPopup type is modal', async () => {
      const spell = makeSpell();
      const setModalState = vi.fn();
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        setModalState,
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'testModal',
          payload: { action: { name: 'Test' } },
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('sorcerer with no spell found calls handleAttackClick', async () => {
      const handleAttackClick = vi.fn();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [] },
        }),
        handleAttackClick,
      });

      const attack = makeAttack({
        name: 'UnknownSpell',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(handleAttackClick).toHaveBeenCalledWith(attack);
    });

    it('sorcerer sets pendingActionMetamagic when spell is found', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();
      expect(result.current.pendingActionMetamagic.spellName).toBe('Fireball');
      expect(result.current.pendingActionMetamagic.spellLevel).toBe(3);
    });

    it('sorcerer pending uses spell.casting_time from spell object', async () => {
      const spell = makeSpell({ casting_time: '1 Bonus Action' });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic.castingTime).toBe('1 Bonus Action');
    });

    it('sorcerer pending uses attack.castingTime fallback when spell missing casting_time', async () => {
      const spell = makeSpell({});
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        castingTime: '1 Action',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic.castingTime).toBe('1 Action');
    });

    it('sorcerer pending action calls executeSpellCast when confirmed', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(executeSpellCast).toHaveBeenCalled();
    });

    it('sorcerer pending action calls setPopupHtml when automationPopup returned', async () => {
      const spell = makeSpell();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Attack result!</div>',
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Attack result!</div>');
    });

    it('sorcerer pending action does not call setPopupHtml when automationPopup type is modal', async () => {
      const spell = makeSpell();
      const setModalState = vi.fn();
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        setPopupHtml: vi.fn(),
        setModalState,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'testModal',
          payload: { action: { name: 'Test' } },
        },
      });

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('sorcerer pending uses spell.level as fallback for attack.spellLevel', async () => {
      const spell = makeSpell({ level: 4 });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        spellLevel: 0,
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic.spellLevel).toBe(4);
    });

    it('sorcerer pending uses spell.level when attack missing spellLevel', async () => {
      const spell = makeSpell({ level: 5 });
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);

      const attack = makeAttack({
        name: 'Fireball',
        spellLevel: undefined,
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic.spellLevel).toBe(5);
    });

    it('sorcerer handleSpellAttackClick passes targetName from buildCtx to getTargetInfo', async () => {
      const spell = makeSpell();
      const buildCtx = vi.fn(async () => ({ targetName: 'Goblin A' }));
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        buildCtx,
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toEqual({ name: 'Goblin A' });
    });

    it('sorcerer handleSpellAttackClick getTargetInfo returns null when buildCtx has no targetName', async () => {
      const spell = makeSpell();
      const buildCtx = vi.fn(async () => ({}));
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        buildCtx,
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toBeNull();
    });

    it('non-sorcerer resolveSpellDamage with spell passes targetName from buildCtx to getTargetInfo', async () => {
      const spell = makeSpell();
      const buildCtx = vi.fn(async () => ({ targetName: 'Orc B' }));
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        buildCtx,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toEqual({ name: 'Orc B' });
    });

    it('non-sorcerer handleSpellAttackClick with spell passes targetName from buildCtx to getTargetInfo', async () => {
      const spell = makeSpell();
      const buildCtx = vi.fn(async () => ({ targetName: 'Orc B' }));
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [spell] },
        }),
        buildCtx,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleSpellAttackClick(attack);
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toEqual({ name: 'Orc B' });
    });

    it('non-sorcerer resolveSpellDamage no spell passes targetName from buildCtx to getTargetInfo', async () => {
      const buildCtx = vi.fn(async () => ({ targetName: 'Skeleton C' }));
      const props = makeHookProps({
        playerStats: makeNonSorcererStats({
          spellAbilities: { spells: [] },
        }),
        buildCtx,
      });
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toEqual({ name: 'Skeleton C' });
    });

    it('sorcerer resolveSpellDamage pending action passes targetName from buildCtx to getTargetInfo', async () => {
      const spell = makeSpell();
      const buildCtx = vi.fn(async () => ({ targetName: 'Dragon D' }));
      const props = makeHookProps({
        playerStats: makePlayerStats({
          spellAbilities: { spells: [spell] },
        }),
        buildCtx,
      });
      const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
      const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

      isPsionicSpell.mockReturnValue(false);
      hasPsionicSorcery.mockReturnValue(false);
      executeSpellCast.mockResolvedValue(null);

      const attack = makeAttack({
        name: 'Fireball',
        area_of_effect: null,
      });

      const { result } = renderHook(() => useActionSpellMetamagic(props));

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(result.current.pendingActionMetamagic).not.toBeNull();

      await act(async () => {
        result.current.handleActionMetamagicConfirm({});
      });

      expect(executeSpellCast).toHaveBeenCalled();
      const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
      const targetInfo = await getTargetInfo();
      expect(targetInfo).toEqual({ name: 'Dragon D' });
    });
  });
});
