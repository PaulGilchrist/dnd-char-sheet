import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';

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

vi.mock('../../services/npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(() => Promise.resolve({ type: 'humanoid' })),
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
  applyProtectionFromEnergyHandler: vi.fn(),
  applyProtectionFromEvilAndGood: vi.fn(),
  applyProtectionFromPoisonHandler: vi.fn(() => Promise.resolve(null)),
  applyResistanceEffect: vi.fn(),
  executeHandler: vi.fn(() => Promise.resolve(null)),
  confirmGreaterRestoration: vi.fn(),
  applyHolyAuraEffect: vi.fn(() => Promise.resolve(null)),
  applyBaneEffect: vi.fn(),
  applyBlessEffect: vi.fn(),
  applyFaerieFire: vi.fn(() => Promise.resolve(null)),
  applyHaste: vi.fn(),
  applyEnhanceAbilityEffect: vi.fn(() => Promise.resolve(null)),
  applyBarkskinEffect: vi.fn(() => Promise.resolve(null)),
  applyInvisibility: vi.fn(),
  applyGreaterInvisibility: vi.fn(),
  applyFeignDeath: vi.fn(() => Promise.resolve(null)),
  applyLongstriderEffect: vi.fn(() => Promise.resolve(null)),
  applySpareTheDyingEffect: vi.fn(() => Promise.resolve(null)),
  applyPassWithoutTraceEffect: vi.fn(() => Promise.resolve(null)),
  applyBeaconOfHopeEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfLifeEffect: vi.fn(),
  applyAuraOfPurityEffect: vi.fn(),
  applyCircleOfPowerEffect: vi.fn(() => Promise.resolve(null)),
  applyCompulsionEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfVitalityEffect: vi.fn(() => Promise.resolve(null)),
  applyDeathWardEffect: vi.fn(() => Promise.resolve(null)),
  applyHeroism: vi.fn(() => Promise.resolve(null)),
  applyStoneSkinHandler: vi.fn(() => Promise.resolve(null)),
  handleSanctuary: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/greaterRestorationService.js', () => ({
  confirmGreaterRestoration: vi.fn(),
}));

vi.mock('../../services/rules/features/removeCurseService.js', () => ({
  confirmRemoveCurse: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/regenerateService.js', () => ({
  confirmRegenerate: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/foresightService.js', () => ({
  triggerForesight: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/holdMonsterService.js', () => ({
  triggerHoldMonster: vi.fn(),
}));

vi.mock('../../services/rules/features/charmPersonService.js', () => ({
  triggerCharmPerson: vi.fn(),
}));

vi.mock('../../services/rules/features/charmMonsterService.js', () => ({
  triggerCharmMonster: vi.fn(),
}));

vi.mock('../../services/rules/features/banishmentService.js', () => ({
  triggerBanishment: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/faerieFireService.js', () => ({
  triggerFaerieFire: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/healService.js', () => ({
  triggerHeal: vi.fn(),
}));

vi.mock('../../services/rules/features/healingWordService.js', () => ({
  triggerHealingWord: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/revivifyService.js', () => ({
  triggerRevivify: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/automation/handlers/spells/polymorphService.js', () => ({
  applyPolymorph: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/automation/handlers/spells/animalShapesService.js', () => ({
  applyAnimalShapes: vi.fn(() => Promise.resolve({ ok: false })),
}));

vi.mock('../../services/automation/handlers/spells/truePolymorphService.js', () => ({
  applyTruePolymorph: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/spells/materialComponents.js', () => ({
  getConsumedMaterial: vi.fn(() => null),
  hasMaterial: vi.fn(() => true),
  consumeMaterial: vi.fn(() => Promise.resolve(true)),
  getMaterialRequirementMessage: vi.fn(() => null),
}));

vi.mock('../runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => 3),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../useAllySelection.js', () => ({
  getAllyList: vi.fn((casterName) => [casterName.toLowerCase()]),
}));

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
  incrementFreeCastResource: vi.fn(),
}));

global.fetch = vi.fn((url) => {
  if (url && url.includes('combat-summary')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ creatures: [] }),
    });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
});

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestSorcerer',
    class: { name: 'Sorcerer' },
    level: 5,
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

// ── Simple createConfirmHandler/createSkipHandler pairs ────────────────────────
// These handlers follow the identical pattern: gateMetamagic sets pending,
// confirm handler calls a single automation function, skip handler clears pending.

describe('useSpellMetamagicFlow — simple handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const simpleHandlers = [
    { name: 'Bane', level: 0, handler: 'handleBaneConfirm', pending: 'pendingBane', automationModule: '../../services/automation/index.js', automation: 'applyBaneEffect', targetsArg: true },
    { name: 'Bless', level: 1, handler: 'handleBlessConfirm', pending: 'pendingBless', automationModule: '../../services/automation/index.js', automation: 'applyBlessEffect', targetsArg: true },
    { name: 'Faerie Fire', level: 1, handler: 'handleFaerieFireConfirm', pending: 'pendingFaerieFire' },
    { name: 'Slow', level: 3, handler: 'handleSlowConfirm', pending: 'pendingSlow', automationModule: '../../services/automation/index.js', automation: 'executeHandler' },
    { name: 'Haste', level: 3, handler: 'handleHasteConfirm', pending: 'pendingHaste', automationModule: '../../services/automation/index.js', automation: 'applyHaste', targetsArg: true },
    { name: 'Barkskin', level: 2, handler: 'handleBarkskinConfirm', pending: 'pendingBarkskin', automationModule: '../../services/automation/index.js', automation: 'applyBarkskinEffect' },
    { name: 'Invisibility', level: 2, handler: 'handleInvisibilityConfirm', pending: 'pendingInvisibility', automationModule: '../../services/automation/index.js', automation: 'applyInvisibility', targetsArg: true },
    { name: 'Greater Invisibility', level: 4, handler: 'handleGreaterInvisibilityConfirm', pending: 'pendingGreaterInvisibility', automationModule: '../../services/automation/index.js', automation: 'applyGreaterInvisibility', targetsArg: true },
    { name: 'Feign Death', level: 3, handler: 'handleFeignDeathConfirm', pending: 'pendingFeignDeath' },
    { name: 'Longstrider', level: 0, handler: 'handleLongstriderConfirm', pending: 'pendingLongstrider' },
    { name: 'Spare The Dying', level: 0, handler: 'handleSpareTheDyingConfirm', pending: 'pendingSpareTheDying' },
    { name: 'Beacon of Hope', level: 3, handler: 'handleBeaconOfHopeConfirm', pending: 'pendingBeaconOfHope', automationModule: '../../services/automation/index.js', automation: 'applyBeaconOfHopeEffect' },
    { name: 'Aura of Life', level: 4, handler: 'handleAuraOfLifeConfirm', pending: 'pendingAuraOfLife', automationModule: '../../services/automation/index.js', automation: 'applyAuraOfLifeEffect' },
    { name: 'Aura of Purity', level: 4, handler: 'handleAuraOfPurityConfirm', pending: 'pendingAuraOfPurity', automationModule: '../../services/automation/index.js', automation: 'applyAuraOfPurityEffect' },
    { name: 'Circle of Power', level: 9, handler: 'handleCircleOfPowerConfirm', pending: 'pendingCircleOfPower' },
    { name: 'Compulsion', level: 4, handler: 'handleCompulsionConfirm', pending: 'pendingCompulsion' },
    { name: 'Aura of Vitality', level: 3, handler: 'handleAuraOfVitalityConfirm', pending: 'pendingAuraOfVitality' },
    { name: 'Death Ward', level: 4, handler: 'handleDeathWardConfirm', pending: 'pendingDeathWard' },
    { name: 'Heroism', level: 1, handler: 'handleHeroismConfirm', pending: 'pendingHeroism' },
    { name: 'Web', level: 1, handler: 'handleWebConfirm', pending: 'pendingWeb', automationModule: '../../services/automation/index.js', automation: 'executeHandler' },
    { name: 'Animal Friendship', level: 1, handler: 'handleAnimalFriendshipConfirm', pending: 'pendingAnimalFriendship' },
    { name: 'Revivify', level: 5, handler: 'handleRevivifyConfirm', pending: 'pendingRevivify' },
    { name: 'Sanctuary', level: 1, handler: 'handleSanctuaryConfirm', pending: 'pendingSanctuary', automationModule: '../../services/automation/index.js', automation: 'handleSanctuary' },
    { name: 'Sleet Storm', level: 3, handler: 'handleSleetStormConfirm', pending: 'pendingSleetStorm', automationModule: '../../services/automation/index.js', automation: 'executeHandler' },
    { name: 'Foresight', level: 9, handler: 'handleForesightConfirm', pending: 'pendingForesight' },
  ];

  for (const spellInfo of simpleHandlers) {
    it(`applies ${spellInfo.name.toLowerCase()} and clears pending on confirm`, async () => {
      const { result } = renderHookWithSpell(
        (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
        spellInfo.name,
        { level: spellInfo.level },
      );

      await act(async () => {
        if (spellInfo.handler === 'handleSanctuaryConfirm') {
          await result.current.handleSanctuaryConfirm('Goblin A');
        } else if (spellInfo.handler === 'handleBarkskinConfirm') {
          await result.current.handleBarkskinConfirm(['Goblin A']);
        } else {
          await result.current[spellInfo.handler](['Goblin A']);
        }
      });

      expect(result.current[spellInfo.pending]).toBeNull();
    });
  }
});
