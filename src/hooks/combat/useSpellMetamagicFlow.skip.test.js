import { describe, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';


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
  applyShieldOfFaithEffect: vi.fn(),
  applyProtectionFromEnergyHandler: vi.fn(),
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
  applyProtectionFromEvilAndGood: vi.fn(),
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

// ── handle*Skip — parameterized ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — handle*Skip', () => {
  const skipTests = [
    { spell: 'Magic Missile', spellLevel: 1, handler: 'handleMagicMissileSkip', pending: 'pendingMagicMissile' },
    { spell: 'Animal Friendship', spellLevel: 1, handler: 'handleAnimalFriendshipSkip', pending: 'pendingAnimalFriendship' },
    { spell: 'Regenerate', spellLevel: 7, handler: 'handleRegenerateSkip', pending: 'pendingRegenerate' },
    { spell: 'Healing Word', spellLevel: 1, handler: 'handleHealingWordSkip', pending: 'pendingHealingWord' },
    { spell: 'Cure Wounds', spellLevel: 1, handler: 'handleCureWoundsSkip', pending: 'pendingCureWounds' },
    { spell: 'Hold Monster', spellLevel: 5, handler: 'handleHoldMonsterSkip', pending: 'pendingHoldMonster' },
    { spell: 'Hold Person', spellLevel: 2, handler: 'handleHoldPersonSkip', pending: 'pendingHoldPerson' },
    { spell: 'Polymorph', spellLevel: 4, handler: 'handlePolymorphSkip', pending: 'pendingPolymorph' },
    { spell: 'Animal Shapes', spellLevel: 8, handler: 'handleAnimalShapesSkip', pending: 'pendingAnimalShapes' },
    { spell: 'Charm Person', spellLevel: 1, handler: 'handleCharmPersonSkip', pending: 'pendingCharmPerson' },
    { spell: 'Charm Monster', spellLevel: 4, handler: 'handleCharmMonsterSkip', pending: 'pendingCharmMonster' },
    { spell: 'Banishment', spellLevel: 4, handler: 'handleBanishmentSkip', pending: 'pendingBanishment' },
    { spell: 'Prismatic Spray', spellLevel: 7, handler: 'handlePrismaticSpraySkip', pending: 'pendingPrismaticSpray' },
    { spell: 'Revivify', spellLevel: 5, handler: 'handleRevivifySkip', pending: 'pendingRevivify' },
    { spell: 'Web', spellLevel: 1, handler: 'handleWebSkip', pending: 'pendingWeb' },
    { spell: 'Confusion', spellLevel: 4, handler: 'handleConfusionSkip', pending: 'pendingConfusion' },
    { spell: 'Stinking Cloud', spellLevel: 1, handler: 'handleStinkingCloudSkip', pending: 'pendingStinkingCloud' },
    { spell: 'Antimagic Field', spellLevel: 4, handler: 'handleAntimagicFieldSkip', pending: 'pendingAntimagicField' },
    { spell: 'Forcecage', spellLevel: 7, handler: 'handleForcecageSkip', pending: 'pendingForcecage' },
    { spell: 'Globe of Invulnerability', spellLevel: 4, handler: 'handleGlobeSkip', pending: 'pendingGlobe' },
    { spell: 'Pass Without Trace', spellLevel: 2, handler: 'handlePassWithoutTraceSkip', pending: 'pendingPassWithoutTrace' },
    { spell: 'Beacon of Hope', spellLevel: 3, handler: 'handleBeaconOfHopeSkip', pending: 'pendingBeaconOfHope' },
    { spell: 'Spare The Dying', spellLevel: 0, handler: 'handleSpareTheDyingSkip', pending: 'pendingSpareTheDying' },
    { spell: 'Longstrider', spellLevel: 0, handler: 'handleLongstriderSkip', pending: 'pendingLongstrider' },
    { spell: 'Heal', spellLevel: 6, handler: 'handleHealSkip', pending: 'pendingHeal' },
    { spell: 'Feign Death', spellLevel: 3, handler: 'handleFeignDeathSkip', pending: 'pendingFeignDeath' },
    { spell: 'Greater Invisibility', spellLevel: 4, handler: 'handleGreaterInvisibilitySkip', pending: 'pendingGreaterInvisibility' },
    { spell: 'Invisibility', spellLevel: 2, handler: 'handleInvisibilitySkip', pending: 'pendingInvisibility' },
    { spell: 'Barkskin', spellLevel: 2, handler: 'handleBarkskinSkip', pending: 'pendingBarkskin' },
    { spell: 'Lesser Restoration', spellLevel: 2, handler: 'handleLesserRestorationSkip', pending: 'pendingLesserRestoration' },
    { spell: 'Remove Curse', spellLevel: 3, handler: 'handleRemoveCurseSkip', pending: 'pendingRemoveCurse' },
    { spell: 'Mage Armor', spellLevel: 1, handler: 'handleMageArmorSkip', pending: 'pendingMageArmor' },
    { spell: "Heroes' Feast", spellLevel: 6, handler: 'handleHeroesFeastSkip', pending: 'pendingHeroesFeast' },
    { spell: 'Aura of Life', spellLevel: 4, handler: 'handleAuraOfLifeSkip', pending: 'pendingAuraOfLife' },
    { spell: 'Aura of Purity', spellLevel: 4, handler: 'handleAuraOfPuritySkip', pending: 'pendingAuraOfPurity' },
    { spell: 'Circle of Power', spellLevel: 9, handler: 'handleCircleOfPowerSkip', pending: 'pendingCircleOfPower' },
    { spell: 'Compulsion', spellLevel: 4, handler: 'handleCompulsionSkip', pending: 'pendingCompulsion' },
    { spell: 'Aura of Vitality', spellLevel: 3, handler: 'handleAuraOfVitalitySkip', pending: 'pendingAuraOfVitality' },
    { spell: 'Death Ward', spellLevel: 4, handler: 'handleDeathWardSkip', pending: 'pendingDeathWard' },
    { spell: 'Heroism', spellLevel: 1, handler: 'handleHeroismSkip', pending: 'pendingHeroism' },
    { spell: 'Greater Restoration', spellLevel: 5, handler: 'handleGreaterRestorationSkip', pending: 'pendingGreaterRestoration' },
  ];

  test.each(skipTests)('clears $pending on $handler skip', ({ spell, spellLevel, handler, pending }) => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);

    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      spell,
      { level: spellLevel },
    );

    act(() => {
      result.current[handler]();
    });

    expect(result.current[pending]).toBeNull();
  });
});
