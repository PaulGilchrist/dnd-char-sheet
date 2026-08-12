import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
  getMonsterData: vi.fn(),
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

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
  incrementFreeCastResource: vi.fn(),
}));

vi.mock('../runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => 3),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../useAllySelection.js', () => ({
  getAllyList: vi.fn((casterName) => [casterName.toLowerCase()]),
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

describe('useSpellMetamagicFlow — return value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all pending state keys and handler functions', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    const ret = result.current;

    // All pending state keys
    expect(ret).toHaveProperty('pendingMetamagic');
    expect(ret).toHaveProperty('pendingMultiTarget');
    expect(ret).toHaveProperty('pendingAid');
    expect(ret).toHaveProperty('pendingBane');
    expect(ret).toHaveProperty('pendingBless');
    expect(ret).toHaveProperty('pendingFaerieFire');
    expect(ret).toHaveProperty('pendingHolyAura');
    expect(ret).toHaveProperty('pendingBeaconOfHope');
    expect(ret).toHaveProperty('pendingSlow');
    expect(ret).toHaveProperty('pendingHaste');
    expect(ret).toHaveProperty('pendingEnhanceAbility');
    expect(ret).toHaveProperty('pendingBarkskin');
    expect(ret).toHaveProperty('pendingInvisibility');
    expect(ret).toHaveProperty('pendingGreaterInvisibility');
    expect(ret).toHaveProperty('pendingFeignDeath');
    expect(ret).toHaveProperty('pendingHeal');
    expect(ret).toHaveProperty('pendingHeroesFeast');
    expect(ret).toHaveProperty('pendingGreaterRestoration');
    expect(ret).toHaveProperty('pendingLesserRestoration');
    expect(ret).toHaveProperty('pendingMageArmor');
    expect(ret).toHaveProperty('pendingShieldOfFaith');
    expect(ret).toHaveProperty('pendingProtectionFromEvilAndGood');
    expect(ret).toHaveProperty('pendingProtectionFromPoison');
    expect(ret).toHaveProperty('pendingStoneSkin');
    expect(ret).toHaveProperty('pendingProtectionFromEnergy');
    expect(ret).toHaveProperty('pendingResistance');
    expect(ret).toHaveProperty('pendingRemoveCurse');
    expect(ret).toHaveProperty('pendingMagicMissile');
    expect(ret).toHaveProperty('pendingPassWithoutTrace');
    expect(ret).toHaveProperty('pendingGlobe');
    expect(ret).toHaveProperty('pendingForcecage');
    expect(ret).toHaveProperty('pendingAntimagicField');
    expect(ret).toHaveProperty('pendingRegenerate');
    expect(ret).toHaveProperty('pendingHealingWord');
    expect(ret).toHaveProperty('pendingCureWounds');
    expect(ret).toHaveProperty('pendingStinkingCloud');
    expect(ret).toHaveProperty('pendingWeb');
    expect(ret).toHaveProperty('pendingAnimalFriendship');
    expect(ret).toHaveProperty('pendingAuraOfLife');
    expect(ret).toHaveProperty('pendingAuraOfPurity');
    expect(ret).toHaveProperty('pendingCircleOfPower');
    expect(ret).toHaveProperty('pendingCompulsion');
    expect(ret).toHaveProperty('pendingAuraOfVitality');
    expect(ret).toHaveProperty('pendingForesight');
    expect(ret).toHaveProperty('pendingLongstrider');
    expect(ret).toHaveProperty('pendingSpareTheDying');
    expect(ret).toHaveProperty('pendingPrismaticSpray');
    expect(ret).toHaveProperty('pendingRevivify');
    expect(ret).toHaveProperty('pendingSanctuary');
    expect(ret).toHaveProperty('pendingSleetStorm');
    expect(ret).toHaveProperty('pendingHoldMonster');
    expect(ret).toHaveProperty('pendingHoldPerson');
    expect(ret).toHaveProperty('pendingPolymorph');
    expect(ret).toHaveProperty('pendingShapechange');
    expect(ret).toHaveProperty('pendingAnimalShapes');
    expect(ret).toHaveProperty('pendingTruePolymorph');
    expect(ret).toHaveProperty('pendingCharmPerson');
    expect(ret).toHaveProperty('pendingCharmMonster');
    expect(ret).toHaveProperty('pendingBanishment');
    expect(ret).toHaveProperty('pendingDeathWard');
    expect(ret).toHaveProperty('pendingHeroism');

    // Key handler functions
    expect(ret).toHaveProperty('gateMetamagic');
    expect(ret).toHaveProperty('handleConfirm');
    expect(ret).toHaveProperty('handleSkip');
    expect(ret).toHaveProperty('handleMultiTargetConfirm');
    expect(ret).toHaveProperty('handleMultiTargetSkip');
    expect(ret).toHaveProperty('handleAidConfirm');
    expect(ret).toHaveProperty('handleAidSkip');
    expect(ret).toHaveProperty('handleBaneConfirm');
    expect(ret).toHaveProperty('handleBaneSkip');
    expect(ret).toHaveProperty('handleBlessConfirm');
    expect(ret).toHaveProperty('handleBlessSkip');
    expect(ret).toHaveProperty('handleHolyAuraConfirm');
    expect(ret).toHaveProperty('handleHolyAuraSkip');
    expect(ret).toHaveProperty('handleSlowConfirm');
    expect(ret).toHaveProperty('handleSlowSkip');
    expect(ret).toHaveProperty('handleHasteConfirm');
    expect(ret).toHaveProperty('handleHasteSkip');
    expect(ret).toHaveProperty('handleEnhanceAbilityAbilitySelect');
    expect(ret).toHaveProperty('handleEnhanceAbilityConfirm');
    expect(ret).toHaveProperty('handleEnhanceAbilitySkip');
    expect(ret).toHaveProperty('handleBarkskinConfirm');
    expect(ret).toHaveProperty('handleBarkskinSkip');
    expect(ret).toHaveProperty('handleInvisibilityConfirm');
    expect(ret).toHaveProperty('handleInvisibilitySkip');
    expect(ret).toHaveProperty('handleGreaterInvisibilityConfirm');
    expect(ret).toHaveProperty('handleGreaterInvisibilitySkip');
    expect(ret).toHaveProperty('handleFeignDeathConfirm');
    expect(ret).toHaveProperty('handleFeignDeathSkip');
    expect(ret).toHaveProperty('handleHealConfirm');
    expect(ret).toHaveProperty('handleHealSkip');
    expect(ret).toHaveProperty('handleHeroesFeastConfirm');
    expect(ret).toHaveProperty('handleHeroesFeastSkip');
    expect(ret).toHaveProperty('handleAuraOfLifeConfirm');
    expect(ret).toHaveProperty('handleAuraOfLifeSkip');
    expect(ret).toHaveProperty('handleAuraOfPurityConfirm');
    expect(ret).toHaveProperty('handleAuraOfPuritySkip');
    expect(ret).toHaveProperty('handleCircleOfPowerConfirm');
    expect(ret).toHaveProperty('handleCircleOfPowerSkip');
    expect(ret).toHaveProperty('handleCompulsionConfirm');
    expect(ret).toHaveProperty('handleCompulsionSkip');
    expect(ret).toHaveProperty('handleAuraOfVitalityConfirm');
    expect(ret).toHaveProperty('handleAuraOfVitalitySkip');
    expect(ret).toHaveProperty('handleDeathWardConfirm');
    expect(ret).toHaveProperty('handleDeathWardSkip');
    expect(ret).toHaveProperty('handleHeroismConfirm');
    expect(ret).toHaveProperty('handleHeroismSkip');
    expect(ret).toHaveProperty('handleResistanceTargetSelect');
    expect(ret).toHaveProperty('handleResistanceTypeSelect');
    expect(ret).toHaveProperty('handleResistanceSkip');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTargetSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTypeSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergySkip');
    expect(ret).toHaveProperty('handleProtectionFromPoisonConfirm');
    expect(ret).toHaveProperty('handleProtectionFromPoisonSkip');
    expect(ret).toHaveProperty('handleStoneSkinConfirm');
    expect(ret).toHaveProperty('handleStoneSkinSkip');
    expect(ret).toHaveProperty('handleGlobeConfirm');
    expect(ret).toHaveProperty('handleGlobeSkip');
    expect(ret).toHaveProperty('handleForcecageConfirm');
    expect(ret).toHaveProperty('handleForcecageSkip');
    expect(ret).toHaveProperty('handleAntimagicFieldConfirm');
    expect(ret).toHaveProperty('handleAntimagicFieldSkip');
    expect(ret).toHaveProperty('handleStinkingCloudConfirm');
    expect(ret).toHaveProperty('handleStinkingCloudSkip');
    expect(ret).toHaveProperty('handleConfusionConfirm');
    expect(ret).toHaveProperty('handleConfusionSkip');
    expect(ret).toHaveProperty('handleWebConfirm');
    expect(ret).toHaveProperty('handleWebSkip');
    expect(ret).toHaveProperty('handleAnimalFriendshipConfirm');
    expect(ret).toHaveProperty('handleAnimalFriendshipSkip');
    expect(ret).toHaveProperty('handleRegenerateConfirm');
    expect(ret).toHaveProperty('handleRegenerateSkip');
    expect(ret).toHaveProperty('handleHealingWordConfirm');
    expect(ret).toHaveProperty('handleHealingWordSkip');
    expect(ret).toHaveProperty('handleCureWoundsConfirm');
    expect(ret).toHaveProperty('handleCureWoundsSkip');
    expect(ret).toHaveProperty('handleHoldMonsterConfirm');
    expect(ret).toHaveProperty('handleHoldMonsterSkip');
    expect(ret).toHaveProperty('handleHoldPersonConfirm');
    expect(ret).toHaveProperty('handleHoldPersonSkip');
    expect(ret).toHaveProperty('handlePolymorphConfirm');
    expect(ret).toHaveProperty('handlePolymorphSkip');
    expect(ret).toHaveProperty('handleAnimalShapesTargetConfirm');
    expect(ret).toHaveProperty('handleAnimalShapesSkip');
    expect(ret).toHaveProperty('handleAnimalShapesBeastConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphPathSelect');
    expect(ret).toHaveProperty('handleTruePolymorphTargetConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphSkip');
    expect(ret).toHaveProperty('handleCharmPersonConfirm');
    expect(ret).toHaveProperty('handleCharmPersonSkip');
    expect(ret).toHaveProperty('handleCharmMonsterConfirm');
    expect(ret).toHaveProperty('handleCharmMonsterSkip');
    expect(ret).toHaveProperty('handleBanishmentConfirm');
    expect(ret).toHaveProperty('handleBanishmentSkip');
    expect(ret).toHaveProperty('handlePrismaticSprayConfirm');
    expect(ret).toHaveProperty('handlePrismaticSpraySkip');
    expect(ret).toHaveProperty('handleRevivifyConfirm');
    expect(ret).toHaveProperty('handleRevivifySkip');
    expect(ret).toHaveProperty('handleSanctuaryConfirm');
    expect(ret).toHaveProperty('handleSanctuarySkip');
    expect(ret).toHaveProperty('handleSleetStormConfirm');
    expect(ret).toHaveProperty('handleSleetStormSkip');
    expect(ret).toHaveProperty('handleMagicMissileConfirm');
    expect(ret).toHaveProperty('handleMagicMissileSkip');
    expect(ret).toHaveProperty('handleForesightConfirm');
    expect(ret).toHaveProperty('handleForesightSkip');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodConfirm');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodSkip');
    expect(ret).toHaveProperty('handleShieldOfFaithConfirm');
    expect(ret).toHaveProperty('handleShieldOfFaithSkip');
    expect(ret).toHaveProperty('handleEnhanceAbilityConfirm');
    expect(ret).toHaveProperty('handleEnhanceAbilitySkip');
    expect(ret).toHaveProperty('handleBarkskinConfirm');
    expect(ret).toHaveProperty('handleBarkskinSkip');
    expect(ret).toHaveProperty('handleInvisibilityConfirm');
    expect(ret).toHaveProperty('handleInvisibilitySkip');
    expect(ret).toHaveProperty('handleGreaterInvisibilityConfirm');
    expect(ret).toHaveProperty('handleGreaterInvisibilitySkip');
    expect(ret).toHaveProperty('handleFaerieFireConfirm');
    expect(ret).toHaveProperty('handleFaerieFireSkip');
    expect(ret).toHaveProperty('handleBeaconOfHopeConfirm');
    expect(ret).toHaveProperty('handleBeaconOfHopeSkip');
    expect(ret).toHaveProperty('handleLongstriderConfirm');
    expect(ret).toHaveProperty('handleLongstriderSkip');
    expect(ret).toHaveProperty('handleSpareTheDyingConfirm');
    expect(ret).toHaveProperty('handleSpareTheDyingSkip');
    expect(ret).toHaveProperty('handlePassWithoutTraceConfirm');
    expect(ret).toHaveProperty('handlePassWithoutTraceSkip');
    expect(ret).toHaveProperty('handleLesserRestorationConfirm');
    expect(ret).toHaveProperty('handleLesserRestorationSkip');
    expect(ret).toHaveProperty('handleRemoveCurseConfirm');
    expect(ret).toHaveProperty('handleRemoveCurseSkip');
    expect(ret).toHaveProperty('handleMageArmorConfirm');
    expect(ret).toHaveProperty('handleMageArmorSkip');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTypeSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergySkip');
    expect(ret).toHaveProperty('handleProtectionFromPoisonConfirm');
    expect(ret).toHaveProperty('handleProtectionFromPoisonSkip');
    expect(ret).toHaveProperty('handleStoneSkinConfirm');
    expect(ret).toHaveProperty('handleStoneSkinSkip');
    expect(ret).toHaveProperty('handleGreaterRestorationConfirm');
    expect(ret).toHaveProperty('handleGreaterRestorationSkip');
    expect(ret).toHaveProperty('handleTruePolymorphTargetConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphSkip');
    expect(ret).toHaveProperty('handleCharmPersonConfirm');
    expect(ret).toHaveProperty('handleCharmPersonSkip');
    expect(ret).toHaveProperty('handleCharmMonsterConfirm');
    expect(ret).toHaveProperty('handleCharmMonsterSkip');
    expect(ret).toHaveProperty('handleBanishmentConfirm');
    expect(ret).toHaveProperty('handleBanishmentSkip');
    expect(ret).toHaveProperty('handleAnimalShapesTargetConfirm');
    expect(ret).toHaveProperty('handleAnimalShapesSkip');
    expect(ret).toHaveProperty('handleAnimalShapesBeastConfirm');
    expect(ret).toHaveProperty('handleRevivifyConfirm');
    expect(ret).toHaveProperty('handleRevivifySkip');
    expect(ret).toHaveProperty('handleSanctuaryConfirm');
    expect(ret).toHaveProperty('handleSanctuarySkip');
    expect(ret).toHaveProperty('handleSleetStormConfirm');
    expect(ret).toHaveProperty('handleSleetStormSkip');
    expect(ret).toHaveProperty('handleMagicMissileConfirm');
    expect(ret).toHaveProperty('handleMagicMissileSkip');
    expect(ret).toHaveProperty('handleForesightConfirm');
    expect(ret).toHaveProperty('handleForesightSkip');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodConfirm');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodSkip');
    expect(ret).toHaveProperty('handleShieldOfFaithConfirm');
    expect(ret).toHaveProperty('handleShieldOfFaithSkip');

    // Stage state
    expect(ret).toHaveProperty('resistanceStage');
    expect(ret).toHaveProperty('enhanceAbilityStage');
    expect(ret).toHaveProperty('protectionFromEnergyStage');
  });
});
