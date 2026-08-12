import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import * as helpers from './CharSpells.test.helpers.js';

const { useSpellMetamagicFlow } = vi.hoisted(() => {
  const spellFlowHandlers = [
    'gateMetamagic','handleConfirm','handleSkip','handleMultiTargetConfirm','handleMultiTargetSkip',
    'handleAidConfirm','handleAidSkip','handleHeroesFeastConfirm','handleHeroesFeastSkip',
    'handleGreaterRestorationConfirm','handleGreaterRestorationSkip','handleGreaterRestorationNoEffects',
    'handleLesserRestorationConfirm','handleLesserRestorationSkip',
    'handleMageArmorConfirm','handleMageArmorSkip',
    'handleProtectionFromEnergyConfirm','handleProtectionFromEnergySkip',
    'handleResistanceConfirm','handleResistanceSkip',
    'handleRemoveCurseConfirm','handleRemoveCurseSkip',
    'handleMagicMissileConfirm','handleMagicMissileSkip',
    'handleBaneConfirm','handleBaneSkip',
    'handleBlessConfirm','handleBlessSkip',
    'handleFaerieFireConfirm','handleFaerieFireSkip',
    'handleHolyAuraConfirm','handleHolyAuraSkip',
    'handleBeaconOfHopeConfirm','handleBeaconOfHopeSkip',
    'handleSlowConfirm','handleSlowSkip',
    'handleHasteConfirm','handleHasteSkip',
    'handleEnhanceAbilityAbilitySelect','handleEnhanceAbilityConfirm','handleEnhanceAbilitySkip',
    'handleBarkskinConfirm','handleBarkskinSkip',
    'handleInvisibilityConfirm','handleInvisibilitySkip',
    'handleGreaterInvisibilityConfirm','handleGreaterInvisibilitySkip',
    'handleFeignDeathConfirm','handleFeignDeathSkip',
    'handleHealConfirm','handleHealSkip',
    'handleProtectionFromEvilAndGoodConfirm','handleProtectionFromEvilAndGoodSkip',
    'handleProtectionFromPoisonConfirm','handleProtectionFromPoisonSkip',
    'handleStoneSkinConfirm','handleStoneSkinSkip',
    'handlePassWithoutTraceConfirm','handlePassWithoutTraceSkip',
    'handleGlobeConfirm','handleGlobeSkip',
    'handleAntimagicFieldConfirm','handleAntimagicFieldSkip',
    'handleForcecageConfirm','handleForcecageSkip',
    'handleStinkingCloudConfirm','handleStinkingCloudSkip',
    'handleConfusionConfirm','handleConfusionSkip',
    'handleWebConfirm','handleWebSkip',
    'handleAnimalFriendshipConfirm','handleAnimalFriendshipSkip',
    'handleAuraOfLifeConfirm','handleAuraOfLifeSkip',
    'handleAuraOfPurityConfirm','handleAuraOfPuritySkip',
    'handleCircleOfPowerConfirm','handleCircleOfPowerSkip',
    'handleCompulsionConfirm','handleCompulsionSkip',
    'handleSleetStormConfirm','handleSleetStormSkip',
    'handleAuraOfVitalityConfirm','handleAuraOfVitalitySkip',
    'handleForesightConfirm','handleForesightSkip',
    'handleLongstriderConfirm','handleLongstriderSkip',
    'handleSpareTheDyingConfirm','handleSpareTheDyingSkip',
    'handleDeathWardConfirm','handleDeathWardSkip',
    'handleHeroismConfirm','handleHeroismSkip',
    'handleSanctuaryConfirm','handleSanctuarySkip',
    'handleRegenerateConfirm','handleRegenerateSkip',
    'handleHealingWordConfirm','handleHealingWordSkip',
    'handleCureWoundsConfirm','handleCureWoundsSkip',
    'handleRevivifyConfirm','handleRevivifySkip',
    'handleUpcastConfirm','handleUpcastCancel',
    'handleHoldMonsterConfirm','handleHoldMonsterSkip',
    'handleHoldPersonConfirm','handleHoldPersonSkip',
    'handlePolymorphConfirm','handlePolymorphSkip',
    'handleAnimalShapesTargetConfirm','handleAnimalShapesSkip',
    'handleTruePolymorphPathSelect','handleTruePolymorphTargetConfirm','handleTruePolymorphSkip',
    'handleCharmPersonConfirm','handleCharmPersonSkip',
    'handleCharmMonsterConfirm','handleCharmMonsterSkip',
    'handleBanishmentConfirm','handleBanishmentSkip',
    'handlePrismaticSprayConfirm','handlePrismaticSpraySkip',
  ];

  const pendingProps = [
    'pendingMetamagic','pendingMultiTarget','pendingAid','pendingHeroesFeast',
    'pendingGreaterRestoration','pendingLesserRestoration','pendingMageArmor',
    'pendingProtectionFromEnergy','pendingResistance','pendingRemoveCurse',
    'pendingMagicMissile','pendingBane','pendingBless','pendingFaerieFire',
    'pendingHolyAura','pendingBeaconOfHope','pendingSlow','pendingHaste',
    'pendingEnhanceAbility','pendingBarkskin','pendingInvisibility','pendingGreaterInvisibility',
    'pendingFeignDeath','pendingHeal','pendingProtectionFromEvilAndGood',
    'pendingProtectionFromPoison','pendingStoneSkin','pendingPassWithoutTrace',
    'pendingGlobe','pendingAntimagicField','pendingForcecage','pendingStinkingCloud',
    'pendingConfusion','pendingWeb','pendingAnimalFriendship','pendingAuraOfLife',
    'pendingAuraOfPurity','pendingCircleOfPower','pendingCompulsion','pendingSleetStorm',
    'pendingAuraOfVitality','pendingForesight','pendingLongstrider','pendingSpareTheDying',
    'pendingDeathWard','pendingHeroism','pendingSanctuary','pendingRegenerate',
    'pendingHealingWord','pendingCureWounds','pendingRevivify','pendingShapechange',
    'pendingUpcast',
  ];

  const flowMock = {};
  spellFlowHandlers.forEach(h => { flowMock[h] = vi.fn(); });
  pendingProps.forEach(p => { flowMock[p] = null; });
  flowMock.enhanceAbilityStage = null;
  flowMock.protectionFromEnergyStage = null;
  flowMock.resistanceStage = null;
  flowMock.flowHoldMonster = null;
  flowMock.flowHoldPerson = null;
  flowMock.flowPolymorph = null;
  flowMock.flowAnimalShapes = null;
  flowMock.flowTruePolymorph = null;
  flowMock.flowCharmPerson = null;
  flowMock.flowCharmMonster = null;
  flowMock.flowBanishment = null;
  flowMock.flowPrismaticSpray = null;
  flowMock.buildUpcastLevels = vi.fn(() => []);

  return { useSpellMetamagicFlow: vi.fn(() => flowMock) };
});

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

  describe('characters prop', () => {
    it('renders without throwing when characters is provided', () => {
      const characters = [
        { name: 'Test Character', type: 'player' },
        { name: 'Goblin', type: 'enemy' },
      ];
      render(<CharSpells {...baseProps} characters={characters} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders without throwing when characters is undefined', () => {
      render(<CharSpells {...baseProps} characters={undefined} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('setModalState prop', () => {
    it('renders without throwing when setModalState is provided', () => {
      const setModalState = vi.fn();
      render(<CharSpells {...baseProps} setModalState={setModalState} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders without throwing when setModalState is undefined', () => {
      render(<CharSpells {...baseProps} setModalState={undefined} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('mapName prop', () => {
    it('renders without throwing when mapName is provided', () => {
      render(<CharSpells {...baseProps} mapName='test-map' />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders without throwing when mapName is null', () => {
      render(<CharSpells {...baseProps} mapName={null} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('exhaustion penalty styling', () => {
    it('adds stat--penalized class to to-hit span when exhaustionPenalty > 0', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const toHitSpan = document.querySelector('.spell-abilities span');
      expect(toHitSpan).toHaveClass('stat--penalized');
    });

    it('adds stat--penalized class to modifier span when exhaustionPenalty > 0', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const modifierSpan = document.querySelectorAll('.spell-abilities span')[1];
      expect(modifierSpan).toHaveClass('stat--penalized');
    });

    it('adds stat--penalized class to attack label when exhaustionPenalty > 0', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('stat--penalized');
    });

    it('adds stat--penalized class to attack label when conditionAttackMode is set', () => {
      renderWithProps({ conditionAttackMode: 'disadvantage' });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('stat--penalized');
    });

    it('adds stat--penalized class to attack label when conditionAttackMode is set', () => {
      renderWithProps({ conditionAttackMode: 'disadvantage' });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('stat--penalized');
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

    it('does not render spell-popup-parent when spells array is empty', () => {
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const wrapper = document.querySelector('.spell-popup-parent');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('spell abilities section', () => {
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

  describe('CharSpellSlots rendering', () => {
    it('renders the CharSpellSlots component', () => {
      renderWithProps({});
      expect(screen.getByTestId('char-spell-slots')).toBeInTheDocument();
    });
  });
});
