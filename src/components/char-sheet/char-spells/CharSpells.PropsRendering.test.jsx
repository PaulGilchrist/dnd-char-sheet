// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import * as helpers from './CharSpells.test.helpers.js';

const { useSpellMetamagicFlow } = vi.hoisted(() => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null,
    pendingMultiTarget: null,
    pendingAid: null,
    pendingHeroesFeast: null,
    pendingGreaterRestoration: null,
    pendingLesserRestoration: null,
    pendingMageArmor: null,
    pendingProtectionFromEnergy: null,
    pendingResistance: null,
    pendingRemoveCurse: null,
    pendingMagicMissile: null,
    pendingBane: null,
    pendingBless: null,
    pendingFaerieFire: null,
    pendingHolyAura: null,
    pendingBeaconOfHope: null,
    pendingSlow: null,
    pendingHaste: null,
    pendingEnhanceAbility: null,
    pendingBarkskin: null,
    pendingInvisibility: null,
    pendingGreaterInvisibility: null,
    pendingFeignDeath: null,
    pendingHeal: null,
    pendingProtectionFromEvilAndGood: null,
    pendingProtectionFromPoison: null,
    pendingStoneSkin: null,
    pendingPassWithoutTrace: null,
    pendingGlobe: null,
    pendingAntimagicField: null,
    pendingForcecage: null,
    pendingStinkingCloud: null,
    pendingConfusion: null,
    pendingWeb: null,
    pendingAnimalFriendship: null,
    pendingAuraOfLife: null,
    pendingAuraOfPurity: null,
    pendingCircleOfPower: null,
    pendingCompulsion: null,
    pendingSleetStorm: null,
    pendingAuraOfVitality: null,
    pendingForesight: null,
    pendingLongstrider: null,
    pendingSpareTheDying: null,
    pendingDeathWard: null,
    pendingHeroism: null,
    pendingSanctuary: null,
    pendingRegenerate: null,
    pendingHealingWord: null,
    pendingCureWounds: null,
    pendingRevivify: null,
    pendingShapechange: null,
    pendingUpcast: null,
    enhanceAbilityStage: null,
    protectionFromEnergyStage: null,
    resistanceStage: null,
    flowHoldMonster: null,
    flowHoldPerson: null,
    flowPolymorph: null,
    flowAnimalShapes: null,
    flowTruePolymorph: null,
    flowCharmPerson: null,
    flowCharmMonster: null,
    flowBanishment: null,
    flowPrismaticSpray: null,
    gateMetamagic: vi.fn(),
    handleConfirm: vi.fn(),
    handleSkip: vi.fn(),
    handleMultiTargetConfirm: vi.fn(),
    handleMultiTargetSkip: vi.fn(),
    handleAidConfirm: vi.fn(),
    handleAidSkip: vi.fn(),
    handleHeroesFeastConfirm: vi.fn(),
    handleHeroesFeastSkip: vi.fn(),
    handleGreaterRestorationConfirm: vi.fn(),
    handleGreaterRestorationSkip: vi.fn(),
    handleGreaterRestorationNoEffects: vi.fn(),
    handleLesserRestorationConfirm: vi.fn(),
    handleLesserRestorationSkip: vi.fn(),
    handleMageArmorConfirm: vi.fn(),
    handleMageArmorSkip: vi.fn(),
    handleProtectionFromEnergyConfirm: vi.fn(),
    handleProtectionFromEnergySkip: vi.fn(),
    handleResistanceConfirm: vi.fn(),
    handleResistanceSkip: vi.fn(),
    handleRemoveCurseConfirm: vi.fn(),
    handleRemoveCurseSkip: vi.fn(),
    handleMagicMissileConfirm: vi.fn(),
    handleMagicMissileSkip: vi.fn(),
    handleBaneConfirm: vi.fn(),
    handleBaneSkip: vi.fn(),
    handleBlessConfirm: vi.fn(),
    handleBlessSkip: vi.fn(),
    handleFaerieFireConfirm: vi.fn(),
    handleFaerieFireSkip: vi.fn(),
    handleHolyAuraConfirm: vi.fn(),
    handleHolyAuraSkip: vi.fn(),
    handleBeaconOfHopeConfirm: vi.fn(),
    handleBeaconOfHopeSkip: vi.fn(),
    handleSlowConfirm: vi.fn(),
    handleSlowSkip: vi.fn(),
    handleHasteConfirm: vi.fn(),
    handleHasteSkip: vi.fn(),
    handleEnhanceAbilityAbilitySelect: vi.fn(),
    handleEnhanceAbilityConfirm: vi.fn(),
    handleEnhanceAbilitySkip: vi.fn(),
    handleBarkskinConfirm: vi.fn(),
    handleBarkskinSkip: vi.fn(),
    handleInvisibilityConfirm: vi.fn(),
    handleInvisibilitySkip: vi.fn(),
    handleGreaterInvisibilityConfirm: vi.fn(),
    handleGreaterInvisibilitySkip: vi.fn(),
    handleFeignDeathConfirm: vi.fn(),
    handleFeignDeathSkip: vi.fn(),
    handleHealConfirm: vi.fn(),
    handleHealSkip: vi.fn(),
    handleProtectionFromEvilAndGoodConfirm: vi.fn(),
    handleProtectionFromEvilAndGoodSkip: vi.fn(),
    handleProtectionFromPoisonConfirm: vi.fn(),
    handleProtectionFromPoisonSkip: vi.fn(),
    handleStoneSkinConfirm: vi.fn(),
    handleStoneSkinSkip: vi.fn(),
    handlePassWithoutTraceConfirm: vi.fn(),
    handlePassWithoutTraceSkip: vi.fn(),
    handleGlobeConfirm: vi.fn(),
    handleGlobeSkip: vi.fn(),
    handleAntimagicFieldConfirm: vi.fn(),
    handleAntimagicFieldSkip: vi.fn(),
    handleForcecageConfirm: vi.fn(),
    handleForcecageSkip: vi.fn(),
    handleStinkingCloudConfirm: vi.fn(),
    handleStinkingCloudSkip: vi.fn(),
    handleConfusionConfirm: vi.fn(),
    handleConfusionSkip: vi.fn(),
    handleWebConfirm: vi.fn(),
    handleWebSkip: vi.fn(),
    handleAnimalFriendshipConfirm: vi.fn(),
    handleAnimalFriendshipSkip: vi.fn(),
    handleAuraOfLifeConfirm: vi.fn(),
    handleAuraOfLifeSkip: vi.fn(),
    handleAuraOfPurityConfirm: vi.fn(),
    handleAuraOfPuritySkip: vi.fn(),
    handleCircleOfPowerConfirm: vi.fn(),
    handleCircleOfPowerSkip: vi.fn(),
    handleCompulsionConfirm: vi.fn(),
    handleCompulsionSkip: vi.fn(),
    handleSleetStormConfirm: vi.fn(),
    handleSleetStormSkip: vi.fn(),
    handleAuraOfVitalityConfirm: vi.fn(),
    handleAuraOfVitalitySkip: vi.fn(),
    handleForesightConfirm: vi.fn(),
    handleForesightSkip: vi.fn(),
    handleLongstriderConfirm: vi.fn(),
    handleLongstriderSkip: vi.fn(),
    handleSpareTheDyingConfirm: vi.fn(),
    handleSpareTheDyingSkip: vi.fn(),
    handleDeathWardConfirm: vi.fn(),
    handleDeathWardSkip: vi.fn(),
    handleHeroismConfirm: vi.fn(),
    handleHeroismSkip: vi.fn(),
    handleSanctuaryConfirm: vi.fn(),
    handleSanctuarySkip: vi.fn(),
    handleRegenerateConfirm: vi.fn(),
    handleRegenerateSkip: vi.fn(),
    handleHealingWordConfirm: vi.fn(),
    handleHealingWordSkip: vi.fn(),
    handleCureWoundsConfirm: vi.fn(),
    handleCureWoundsSkip: vi.fn(),
    handleRevivifyConfirm: vi.fn(),
    handleRevivifySkip: vi.fn(),
    handleUpcastConfirm: vi.fn(),
    handleUpcastCancel: vi.fn(),
    handleHoldMonsterConfirm: vi.fn(),
    handleHoldMonsterSkip: vi.fn(),
    handleHoldPersonConfirm: vi.fn(),
    handleHoldPersonSkip: vi.fn(),
    handlePolymorphConfirm: vi.fn(),
    handlePolymorphSkip: vi.fn(),
    handleAnimalShapesTargetConfirm: vi.fn(),
    handleAnimalShapesSkip: vi.fn(),
    handleTruePolymorphPathSelect: vi.fn(),
    handleTruePolymorphTargetConfirm: vi.fn(),
    handleTruePolymorphSkip: vi.fn(),
    handleCharmPersonConfirm: vi.fn(),
    handleCharmPersonSkip: vi.fn(),
    handleCharmMonsterConfirm: vi.fn(),
    handleCharmMonsterSkip: vi.fn(),
    handleBanishmentConfirm: vi.fn(),
    handleBanishmentSkip: vi.fn(),
    handlePrismaticSprayConfirm: vi.fn(),
    handlePrismaticSpraySkip: vi.fn(),
    buildUpcastLevels: vi.fn(() => []),
  })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => []),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
  default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: vi.fn(),
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    quickRollPlayerSave: vi.fn(),
  })),
}));

vi.mock('../../../hooks/combat/useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 3),
  getMaxSorceryPoints: vi.fn(() => 6),
  spendSorceryPoints: vi.fn(),
}));

vi.mock('../../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow,
}));

vi.mock('../../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({
    pendingUpcast: null,
    buildUpcastLevels: vi.fn(() => []),
    gateUpcast: vi.fn(() => false),
    handleUpcastConfirm: vi.fn(),
    handleUpcastCancel: vi.fn(),
    getCantripAutoLevel: vi.fn(() => null),
  })),
}));

vi.mock('../../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useSpellCastExecutor.js', () => ({
  useSpellCastExecutor: vi.fn(() => ({
    castAction: vi.fn(),
  })),
}));

vi.mock('../../../hooks/combat/useSpellPositionResolver.js', () => ({
  useSpellPositionResolver: vi.fn(() => ({
    resolvePositions: vi.fn(() => Promise.resolve()),
    cachedPosRef: { current: null },
  })),
}));

vi.mock('../../../hooks/combat/useDiceRoll.js', () => ({
  useDiceRoll: vi.fn(() => ({
    popupHtml: null,
    setPopupHtml: vi.fn(),
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
  })),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 8, rolls: [4, 4], modifier: 0 })),
  rollExpressionDoubled: vi.fn(() => ({ total: 16, rolls: [4, 4, 4, 4], modifier: 0 })),
  rollExpressionMaximized: vi.fn(() => ({ total: 24, rolls: [6, 6, 6, 6], modifier: 0 })),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue(null),
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn().mockResolvedValue({ players: [], placedItems: [] }),
}));

vi.mock('../../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
  isInnateSorceryActive: vi.fn(() => false),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(() => ({ finalDamage: 0 })),
}));

vi.mock('../../../services/automation/handlers/spells/shapechangeService.js', () => ({
  confirmShapechangeTransform: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn().mockResolvedValue(undefined),
  isFreeCastAuthorized: vi.fn(() => false),
}));

vi.mock('./SpellDetailPopup.jsx', () => ({
  default: function SpellDetailPopup({ spell }) {
    return <div data-testid="spell-detail-popup">{spell?.name}</div>;
  },
}));

vi.mock('./CharSpellSlots.jsx', () => ({
  default: function CharSpellSlots() {
    return <div data-testid="char-spell-slots">Spell Slots</div>;
  },
}));

vi.mock('../popups/MetamagicPopup.jsx', () => ({
  default: function MetamagicPopup() {
    return <div data-testid="metamagic-popup">Metamagic</div>;
  },
}));

vi.mock('../popups/MultiTargetPopup.jsx', () => ({
  default: function MultiTargetPopup() {
    return <div data-testid="multi-target-popup">MultiTarget</div>;
  },
}));

vi.mock('../popups/MagicMissileTargetPopup.jsx', () => ({
  default: function MagicMissileTargetPopup() {
    return <div data-testid="magic-missile-popup">MagicMissile</div>;
  },
}));

vi.mock('./UpcastPopup.jsx', () => ({
  default: function UpcastPopup() {
    return <div data-testid="upcast-popup">Upcast</div>;
  },
}));

vi.mock('../common/Popup.jsx', () => ({
  default: function Popup({ children }) {
    return <div data-testid="popup">{children}</div>;
  },
}));

vi.mock('../popups/TruePolymorphPathModal.jsx', () => ({
  default: function TruePolymorphPathModal() {
    return <div data-testid="true-polymorph-path-modal">TruePolymorphPath</div>;
  },
}));

vi.mock('../modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function SecondaryTargetModal() {
    return <div data-testid="secondary-target-modal">SecondaryTarget</div>;
  },
}));

vi.mock('../modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function CreatureSelectionModal() {
    return <div data-testid="creature-selection-modal">CreatureSelection</div>;
  },
}));

vi.mock('../modals/SingleResistanceSelectionModal.jsx', () => ({
  default: function SingleResistanceSelectionModal() {
    return <div data-testid="single-resistance-selection-modal">SingleResistance</div>;
  },
}));

vi.mock('../modals/HexAbilityModal.jsx', () => ({
  default: function HexAbilityModal() {
    return <div data-testid="hex-ability-modal">HexAbility</div>;
  },
}));

vi.mock('./CharSpellSlotLevel.jsx', () => ({
  default: function CharSpellSlotLevel() {
    return <div data-testid="char-spell-slot-level">SlotLevel</div>;
  },
}));

const basePlayerStats = helpers.mockPlayerStats;
const baseProps = { playerStats: basePlayerStats, campaignName: 'test' };

function renderWithProps(props) {
  return render(<CharSpells {...baseProps} {...props} />);
}

describe('CharSpells - Props and Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('innate sorcery save DC', () => {
    it('renders base save DC of 13 when no innate sorcery', () => {
      renderWithProps({});
      expect(screen.getByText('13')).toBeInTheDocument();
    });
  });

  describe('spell abilities section rendering', () => {
    it('renders spell attack to-hit with calculated value', () => {
      renderWithProps({});
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('renders spell modifier with calculated value', () => {
      renderWithProps({});
      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('renders cantrips_known when present', () => {
      renderWithProps({});
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders 0 for cantrips_known when undefined', () => {
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          cantrips_known: undefined,
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders "All" for prepared_spells when both prepared_spells and spells_known are undefined', () => {
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          prepared_spells: undefined,
          spells_known: undefined,
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const spellAbilitiesDiv = document.querySelector('.spell-abilities');
      expect(spellAbilitiesDiv.textContent).toContain('All');
    });

    it('renders the spell-abilities section div', () => {
      renderWithProps({});
      const section = document.querySelector('.spell-abilities');
      expect(section).toBeInTheDocument();
    });

    it('renders the Spells section header', () => {
      renderWithProps({});
      expect(screen.getByText('Spells')).toBeInTheDocument();
    });

    it('renders Attack (to hit) label', () => {
      renderWithProps({});
      expect(screen.getByText(/Attack \(to hit\):/)).toBeInTheDocument();
    });

    it('renders Modifier label', () => {
      renderWithProps({});
      expect(screen.getByText('Modifier:')).toBeInTheDocument();
    });

    it('renders Save DC label', () => {
      renderWithProps({});
      expect(screen.getByText(/Save DC:/)).toBeInTheDocument();
    });

    it('renders Cantrips Known label', () => {
      renderWithProps({});
      expect(screen.getByText(/Cantrips Known:/)).toBeInTheDocument();
    });
  });

  describe('spell popup parent wrapper', () => {
    it('renders the spell-popup-parent wrapper div when spellAbilities exists', () => {
      renderWithProps({});
      const wrapper = document.querySelector('.spell-popup-parent');
      expect(wrapper).toBeInTheDocument();
    });

    it('does not render spell-popup-parent when spellAbilities is missing', () => {
      const stats = { name: 'No Spells' };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const wrapper = document.querySelector('.spell-popup-parent');
      expect(wrapper).not.toBeInTheDocument();
    });
  });

  describe('CharSpellSlots rendering', () => {
    it('renders the CharSpellSlots component', () => {
      renderWithProps({});
      expect(screen.getByTestId('char-spell-slots')).toBeInTheDocument();
    });
  });
});
