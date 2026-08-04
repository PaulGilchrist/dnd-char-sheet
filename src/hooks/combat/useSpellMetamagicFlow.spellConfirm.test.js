// @cleaned-by-ai
// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { addEntry } from '../../services/ui/logService.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';
import { isPsionicSpell, hasPsionicSorcery } from '../../services/rules/spells/metamagicRules.js';
import { confirmRemoveCurse } from '../../services/rules/features/removeCurseService.js';
import { spendSorceryPoints } from './useMetamagic.js';

const flushMicrotasks = () => new Promise(r => setTimeout(r, 0));

vi.mock('./useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 5),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
  logMetamagicUse: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
  getMultiTargetSpreadForSpell: vi.fn(() => null),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({
    creatures: [
      { name: 'Goblin A' },
      { name: 'Goblin B' },
      { name: 'Goblin C' },
    ],
  })),
}));

vi.mock('../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../services/automation/index.js', () => ({
  applyAidEffect: vi.fn(),
  applyHeroesFeastEffect: vi.fn(),
  applyLesserRestorationEffect: vi.fn(),
  applyMageArmorEffect: vi.fn(),
  applyShieldOfFaithEffect: vi.fn(),
  applyProtectionFromEnergyHandler: vi.fn(),
  applyProtectionFromPoisonHandler: vi.fn(),
  applyResistanceEffect: vi.fn(),
  executeHandler: vi.fn(),
  confirmGreaterRestoration: vi.fn(),
  applyHolyAuraEffect: vi.fn(),
}));

vi.mock('../../services/rules/features/greaterRestorationService.js', () => ({
  confirmGreaterRestoration: vi.fn(),
}));

vi.mock('../../services/rules/features/removeCurseService.js', () => ({
  confirmRemoveCurse: vi.fn(),
}));

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestSorcerer',
    class: { name: 'Sorcerer' },
    ...overrides,
  };
}

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    casting_time: '1 Action',
    range: '150 ft.',
    ...overrides,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderHookWithSpell(hookSetup, spellName, spellOverrides = {}) {
  const onExecute = vi.fn();
  const { result } = renderHook(() =>
    hookSetup(onExecute)
  );
  const spell = makeSpell({ name: spellName, ...spellOverrides });
  act(() => {
    result.current.gateMetamagic(spell);
  });
  return { result, onExecute, spell };
}

// ── Multi-target ─────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleMultiTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCombatSummary.mockReturnValue({
      creatures: [{ name: 'Goblin A' }, { name: 'Goblin B' }],
    });
  });

  it('logs entry with Words of Creation metamagic and calls onExecute with multiTarget', () => {
    getMultiTargetSpreadForSpell.mockReturnValueOnce({ range: '20 ft' });
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );
    const spell = makeSpell({ name: 'Word of Radiance' });
    act(() => {
      result.current.gateMetamagic(spell);
    });

    act(() => {
      result.current.handleMultiTargetConfirm({ secondTarget: 'Goblin B' });
    });

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: ['Goblin A', 'Goblin B'],
      spellName: 'Word of Radiance',
      spellLevel: 3,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(onExecute).toHaveBeenCalledWith(spell, { multiTarget: 'Goblin B' });
    expect(result.current.pendingMultiTarget).toBeNull();
  });

  it('calls onExecute with empty context when no secondTarget is provided or on skip', () => {
    getMultiTargetSpreadForSpell.mockReturnValueOnce({ range: '20 ft' });
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );
    const spell = makeSpell({ name: 'Word of Radiance' });
    act(() => {
      result.current.gateMetamagic(spell);
    });

    // Confirm without secondTarget
    act(() => {
      result.current.handleMultiTargetConfirm({});
    });

    expect(onExecute).toHaveBeenCalledWith(spell, {});

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: ['Goblin A', 'Goblin B'],
      spellName: 'Word of Radiance',
      spellLevel: 3,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    vi.clearAllMocks();

    // Skip
    getMultiTargetSpreadForSpell.mockReturnValueOnce({ range: '20 ft' });
    const { result: result2 } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );
    act(() => {
      result2.current.gateMetamagic(spell);
    });

    act(() => {
      result2.current.handleMultiTargetSkip();
    });

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: ['Goblin A', 'Goblin B'],
      spellName: 'Word of Radiance',
      spellLevel: 3,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(onExecute).toHaveBeenCalledWith(spell, {});
    expect(result2.current.pendingMultiTarget).toBeNull();
  });
});

// ── Spell-specific confirm handlers ──────────────────────────────────────────

// Each spell handler (aid, heroesFeast, greaterRestoration, lesserRestoration,
// removeCurse, mageArmor, protectionFromEnergy, resistance) follows the same
// pattern via useConfirmableFlow.createConfirmHandler.  We test each one once
// to verify the correct automation / service function is invoked and the log
// entry is written.  The no-pending guard and skip logic are exercised by
// the generic handler tests below and by useConfirmableFlow's own tests.

describe('useSpellMetamagicFlow — spell confirm handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const spellConfigs = [
    {
      name: 'Aid',
      level: 2,
      handler: 'handleAidConfirm',
      pendingKey: 'pendingAid',
      args: { targets: ['Goblin A', 'Goblin B'] },
      verify: async (automation) => {
        expect(automation.applyAidEffect).toHaveBeenCalled();
      },
    },
    {
      name: "Heroes' Feast",
      level: 6,
      handler: 'handleHeroesFeastConfirm',
      pendingKey: 'pendingHeroesFeast',
      args: { targets: ['Goblin A', 'Goblin B'] },
      verify: async (automation) => {
        expect(automation.applyHeroesFeastEffect).toHaveBeenCalled();
      },
    },
    {
      name: 'Greater Restoration',
      level: 5,
      handler: 'handleGreaterRestorationConfirm',
      pendingKey: 'pendingGreaterRestoration',
      args: { targets: ['Goblin A'] },
      verify: async (_automation) => {
        // Greater Restoration uses confirmGreaterRestoration from greaterRestorationService, not automation/index
        const { confirmGreaterRestoration: cgMock } = await import('../../services/rules/features/greaterRestorationService.js');
        expect(cgMock).toHaveBeenCalled();
      },
    },
    {
      name: 'Holy Aura',
      level: 8,
      handler: 'handleHolyAuraConfirm',
      pendingKey: 'pendingHolyAura',
      args: { targets: ['Goblin A', 'Goblin B'] },
      verify: async (_automation) => {
        // Holy Aura uses executeHandler directly — just verify the flow completes
      },
    },
    {
      name: 'Forcecage',
      level: 7,
      handler: 'handleForcecageConfirm',
      pendingKey: 'pendingForcecage',
      args: ['Goblin A', 'Goblin B'],
      verify: async (automation) => {
        expect(automation.executeHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Forcecage',
            automation: expect.objectContaining({ type: 'forcecage', saveAbility: 'CHA', concentration: true, ruleset: '2024' }),
            metaCtx: { creatures: ['Goblin A', 'Goblin B'] },
          }),
          expect.any(Object),
          'TestCampaign',
          null
        );
      },
    },
    {
      name: 'Lesser Restoration',
      level: 2,
      handler: 'handleLesserRestorationConfirm',
      pendingKey: 'pendingLesserRestoration',
      args: { targetName: 'Goblin A' },
      verify: async (automation) => {
        expect(automation.applyLesserRestorationEffect).toHaveBeenCalled();
      },
    },
    {
      name: 'Remove Curse',
      level: 3,
      handler: 'handleRemoveCurseConfirm',
      pendingKey: 'pendingRemoveCurse',
      args: { targetName: 'Goblin A' },
      verify: () => {
        expect(confirmRemoveCurse).toHaveBeenCalled();
      },
    },
    {
      name: 'Mage Armor',
      level: 1,
      handler: 'handleMageArmorConfirm',
      pendingKey: 'pendingMageArmor',
      args: { targetName: 'Goblin A' },
      verify: async (automation) => {
        expect(automation.applyMageArmorEffect).toHaveBeenCalled();
      },
    },
    {
      name: 'Protection from Energy',
      level: 3,
      handler: 'handleProtectionFromEnergyTypeSelect',
      pendingKey: 'pendingProtectionFromEnergy',
      args: 'Fire',
      preStep: async (result) => {
        await act(async () => {
          result.current.handleProtectionFromEnergyTargetSelect('Goblin A');
        });
      },
      verify: async (automation) => {
        expect(automation.applyProtectionFromEnergyHandler).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Protection from Energy' }),
          expect.any(Object),
          'TestCampaign',
          'Goblin A',
          'Fire'
        );
      },
    },
  ];

  for (const config of spellConfigs) {
    it(`applies effect and logs entry for ${config.name}`, async () => {
      const { result, onExecute } = renderHookWithSpell(
        (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
        config.name,
        { level: config.level },
      );

      const automation = await import('../../services/automation/index.js');

      if (config.preStep) {
        await act(async () => {
          await config.preStep(result);
        });
      }

      await act(async () => {
        await result.current[config.handler](config.args);
      });

      const expectedTargets = config.name === 'Protection from Energy'
        ? ['Goblin A']
        : ['Goblin A', 'Goblin B'];

      expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
        type: 'spell',
        characterName: 'TestSorcerer',
        targetName: 'Goblin A',
        targets: expectedTargets,
        spellName: config.name,
        spellLevel: config.level,
        castingTime: '1 Action',
        timestamp: expect.any(Number),
      });
      await config.verify(automation);
      expect(onExecute).not.toHaveBeenCalled();
      expect(result.current[config.pendingKey]).toBeNull();
    });
  }

  it('applies effect and logs entry for Resistance (two-stage flow)', async () => {
    const { result, onExecute } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleResistanceTargetSelect('Goblin A');
    });

    expect(result.current.resistanceStage).toBe('type');

    await act(async () => {
      await result.current.handleResistanceTypeSelect('Fire');
    });

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: ['Goblin A'],
      spellName: 'Resistance',
      spellLevel: 0,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(automation.applyResistanceEffect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Resistance' }),
      expect.any(Object),
      'TestCampaign',
      'Goblin A',
      'Fire'
    );
    expect(onExecute).not.toHaveBeenCalled();
    expect(result.current.pendingResistance).toBeNull();
    expect(result.current.resistanceStage).toBeNull();
  });
});

// ── Spell-specific skip handlers ─────────────────────────────────────────────

describe('useSpellMetamagicFlow — spell skip handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const spellConfigs = [
    { name: 'Aid', level: 2, handler: 'handleAidSkip', pendingKey: 'pendingAid' },
    { name: "Heroes' Feast", level: 6, handler: 'handleHeroesFeastSkip', pendingKey: 'pendingHeroesFeast' },
    { name: 'Greater Restoration', level: 5, handler: 'handleGreaterRestorationSkip', pendingKey: 'pendingGreaterRestoration' },
    { name: 'Holy Aura', level: 8, handler: 'handleHolyAuraSkip', pendingKey: 'pendingHolyAura' },
    { name: 'Lesser Restoration', level: 2, handler: 'handleLesserRestorationSkip', pendingKey: 'pendingLesserRestoration' },
    { name: 'Remove Curse', level: 3, handler: 'handleRemoveCurseSkip', pendingKey: 'pendingRemoveCurse' },
    { name: 'Mage Armor', level: 1, handler: 'handleMageArmorSkip', pendingKey: 'pendingMageArmor' },
    { name: 'Protection from Energy', level: 3, handler: 'handleProtectionFromEnergySkip', pendingKey: 'pendingProtectionFromEnergy' },
  ];

  for (const config of spellConfigs) {
    it(`logs entry and clears pending for ${config.name} skip`, () => {
      const { result } = renderHookWithSpell(
        (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
        config.name,
        { level: config.level },
      );

      act(() => {
        result.current[config.handler]();
      });

      const expectedTargets = ['Goblin A', 'Goblin B'];

      expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
        type: 'spell',
        characterName: 'TestSorcerer',
        targetName: 'Goblin A',
        targets: expectedTargets,
        spellName: config.name,
        spellLevel: config.level,
        castingTime: '1 Action',
        timestamp: expect.any(Number),
      });
      expect(result.current[config.pendingKey]).toBeNull();
    });
  }

  it('logs entry and clears pending for Resistance skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    act(() => {
      result.current.handleResistanceSkip();
    });

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: null,
      spellName: 'Resistance',
      spellLevel: 0,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(result.current.pendingResistance).toBeNull();
    expect(result.current.resistanceStage).toBeNull();
  });
});

// ── Magic Missile (unique logic — distribution validation) ───────────────────

describe('useSpellMetamagicFlow — handleMagicMissile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => renderHookWithSpell(
    (onExecute) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute),
    'Magic Missile',
    { level: 1 },
  );

  it('calls onExecute with magicMissileDistribution and slotLevel on confirm with targets', () => {
    const { result, onExecute, spell } = setup();

    act(() => {
      result.current.handleMagicMissileConfirm({
        distribution: { 'Goblin A': 2, 'Goblin B': 1 },
      });
    });

    expect(onExecute).toHaveBeenCalledWith(spell, {
      magicMissileDistribution: { 'Goblin A': 2, 'Goblin B': 1 },
      slotLevel: 1,
    });
    expect(addEntry).not.toHaveBeenCalled();
    expect(result.current.pendingMagicMissile).toBeNull();
  });

  it('does nothing when all distribution values are zero or on skip', () => {
    const { result, onExecute } = setup();

    // All zeros — no execute, no entry, no pending clear
    act(() => {
      result.current.handleMagicMissileConfirm({
        distribution: { 'Goblin A': 0, 'Goblin B': 0 },
      });
    });

    expect(onExecute).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
    expect(result.current.pendingMagicMissile).toBeNull();
    vi.clearAllMocks();

    // Skip — clears pending only
    act(() => {
      result.current.handleMagicMissileSkip();
    });

    expect(result.current.pendingMagicMissile).toBeNull();
  });
});

// ── Psionic sorcery confirm ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleConfirm with psionic sorcery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupPsionicPending() {
    isPsionicSpell.mockReturnValueOnce(true);
    hasPsionicSorcery.mockReturnValueOnce(true);

    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Mind Sliver', level: 2 }));
    });

    return { result, onExecute };
  }

  it('adds psionic cost to total cost when psionic and no Subtle Spell', async () => {
    const { result, onExecute } = setupPsionicPending();

    act(() => {
      result.current.handleConfirm({ totalCost: 1, options: ['Empowered Spell'] });
    });

    await flushMicrotasks();

    expect(spendSorceryPoints).toHaveBeenCalledWith(
      'TestSorcerer', 3, 'TestCampaign', expect.any(Number)
    );
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: null,
      spellName: 'Mind Sliver',
      spellLevel: 2,
      castingTime: '1 Action',
      metamagic: ['Empowered Spell', 'Psionic Sorcery'],
      spCost: 3,
      timestamp: expect.any(Number),
    });
    expect(onExecute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ psionicSpell: true })
    );
  });

  it('does not add psionic cost when Subtle Spell is used', () => {
    const { result } = setupPsionicPending();

    act(() => {
      result.current.handleConfirm({ totalCost: 1, options: ['Subtle Spell'] });
    });

    expect(spendSorceryPoints).toHaveBeenCalledWith(
      'TestSorcerer', 1, 'TestCampaign', expect.any(Number)
    );
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: null,
      spellName: 'Mind Sliver',
      spellLevel: 2,
      castingTime: '1 Action',
      metamagic: ['Subtle Spell'],
      spCost: 1,
      timestamp: expect.any(Number),
    });
  });

  it('does not add Psionic Sorcery to options or metaCtx when psionicCost is 0', async () => {
    isPsionicSpell.mockReturnValueOnce(false);

    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Fireball', level: 3 }));
    });

    act(() => {
      result.current.handleConfirm({ totalCost: 2, options: ['Empowered Spell'] });
    });

    await flushMicrotasks();

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: null,
      spellName: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      metamagic: ['Empowered Spell'],
      spCost: 2,
      timestamp: expect.any(Number),
    });
    vi.clearAllMocks();

    isPsionicSpell.mockReturnValueOnce(false);
    const { result: result2 } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );
    act(() => {
      result2.current.gateMetamagic(makeSpell({ name: 'Fireball', level: 3 }));
    });
    act(() => {
      result2.current.handleConfirm({ totalCost: 0, options: [] });
    });

    await flushMicrotasks();

    expect(onExecute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.not.objectContaining({ psionicSpell: true })
    );
  });
});
