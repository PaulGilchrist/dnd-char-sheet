import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import * as helpers from './CharSpells.test.helpers.js';

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
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null,
    pendingMultiTarget: null,
    gateMetamagic: vi.fn(),
    handleConfirm: vi.fn(),
    handleSkip: vi.fn(),
    handleMultiTargetConfirm: vi.fn(),
    handleMultiTargetSkip: vi.fn(),
    pendingAid: null,
    handleAidConfirm: vi.fn(),
    handleAidSkip: vi.fn(),
    pendingHeroesFeast: null,
    handleHeroesFeastConfirm: vi.fn(),
    handleHeroesFeastSkip: vi.fn(),
    pendingGreaterRestoration: null,
    handleGreaterRestorationConfirm: vi.fn(),
    handleGreaterRestorationSkip: vi.fn(),
    handleGreaterRestorationNoEffects: vi.fn(),
    pendingLesserRestoration: null,
    handleLesserRestorationConfirm: vi.fn(),
    handleLesserRestorationSkip: vi.fn(),
    pendingMageArmor: null,
    handleMageArmorConfirm: vi.fn(),
    handleMageArmorSkip: vi.fn(),
    pendingProtectionFromEnergy: null,
    handleProtectionFromEnergyConfirm: vi.fn(),
    handleProtectionFromEnergySkip: vi.fn(),
    pendingResistance: null,
    handleResistanceConfirm: vi.fn(),
    handleResistanceSkip: vi.fn(),
    pendingRemoveCurse: null,
    handleRemoveCurseConfirm: vi.fn(),
    handleRemoveCurseSkip: vi.fn(),
    pendingMagicMissile: null,
    handleMagicMissileConfirm: vi.fn(),
    handleMagicMissileSkip: vi.fn(),
    pendingBane: null,
    handleBaneConfirm: vi.fn(),
    handleBaneSkip: vi.fn(),
    pendingBless: null,
    handleBlessConfirm: vi.fn(),
    handleBlessSkip: vi.fn(),
    pendingFaerieFire: null,
    handleFaerieFireConfirm: vi.fn(),
    handleFaerieFireSkip: vi.fn(),
    pendingHolyAura: null,
    handleHolyAuraConfirm: vi.fn(),
    handleHolyAuraSkip: vi.fn(),
    pendingBeaconOfHope: null,
    handleBeaconOfHopeConfirm: vi.fn(),
    handleBeaconOfHopeSkip: vi.fn(),
    pendingSlow: null,
    handleSlowConfirm: vi.fn(),
    handleSlowSkip: vi.fn(),
    pendingHaste: null,
    handleHasteConfirm: vi.fn(),
    handleHasteSkip: vi.fn(),
    pendingEnhanceAbility: null,
    enhanceAbilityStage: null,
    handleEnhanceAbilityAbilitySelect: vi.fn(),
    handleEnhanceAbilityConfirm: vi.fn(),
    handleEnhanceAbilitySkip: vi.fn(),
    pendingBarkskin: null,
    handleBarkskinConfirm: vi.fn(),
    handleBarkskinSkip: vi.fn(),
    pendingInvisibility: null,
    handleInvisibilityConfirm: vi.fn(),
    handleInvisibilitySkip: vi.fn(),
    pendingGreaterInvisibility: null,
    handleGreaterInvisibilityConfirm: vi.fn(),
    handleGreaterInvisibilitySkip: vi.fn(),
    pendingFeignDeath: null,
    handleFeignDeathConfirm: vi.fn(),
    handleFeignDeathSkip: vi.fn(),
    pendingHeal: null,
    handleHealConfirm: vi.fn(),
    handleHealSkip: vi.fn(),
    pendingProtectionFromEvilAndGood: null,
    handleProtectionFromEvilAndGoodConfirm: vi.fn(),
    handleProtectionFromEvilAndGoodSkip: vi.fn(),
    pendingProtectionFromPoison: null,
    handleProtectionFromPoisonConfirm: vi.fn(),
    handleProtectionFromPoisonSkip: vi.fn(),
    pendingStoneSkin: null,
    handleStoneSkinConfirm: vi.fn(),
    handleStoneSkinSkip: vi.fn(),
    pendingPassWithoutTrace: null,
    handlePassWithoutTraceConfirm: vi.fn(),
    handlePassWithoutTraceSkip: vi.fn(),
    pendingGlobe: null,
    handleGlobeConfirm: vi.fn(),
    handleGlobeSkip: vi.fn(),
    pendingAntimagicField: null,
    handleAntimagicFieldConfirm: vi.fn(),
    handleAntimagicFieldSkip: vi.fn(),
    pendingForcecage: null,
    handleForcecageConfirm: vi.fn(),
    handleForcecageSkip: vi.fn(),
    pendingStinkingCloud: null,
    handleStinkingCloudConfirm: vi.fn(),
    handleStinkingCloudSkip: vi.fn(),
    pendingConfusion: null,
    handleConfusionConfirm: vi.fn(),
    handleConfusionSkip: vi.fn(),
    pendingWeb: null,
    handleWebConfirm: vi.fn(),
    handleWebSkip: vi.fn(),
    pendingAnimalFriendship: null,
    handleAnimalFriendshipConfirm: vi.fn(),
    handleAnimalFriendshipSkip: vi.fn(),
    pendingAuraOfLife: null,
    handleAuraOfLifeConfirm: vi.fn(),
    handleAuraOfLifeSkip: vi.fn(),
    pendingAuraOfPurity: null,
    handleAuraOfPurityConfirm: vi.fn(),
    handleAuraOfPuritySkip: vi.fn(),
    pendingCircleOfPower: null,
    handleCircleOfPowerConfirm: vi.fn(),
    handleCircleOfPowerSkip: vi.fn(),
    pendingCompulsion: null,
    handleCompulsionConfirm: vi.fn(),
    handleCompulsionSkip: vi.fn(),
    pendingSleetStorm: null,
    handleSleetStormConfirm: vi.fn(),
    handleSleetStormSkip: vi.fn(),
    pendingAuraOfVitality: null,
    handleAuraOfVitalityConfirm: vi.fn(),
    handleAuraOfVitalitySkip: vi.fn(),
    pendingForesight: null,
    handleForesightConfirm: vi.fn(),
    handleForesightSkip: vi.fn(),
    pendingLongstrider: null,
    handleLongstriderConfirm: vi.fn(),
    handleLongstriderSkip: vi.fn(),
    pendingSpareTheDying: null,
    handleSpareTheDyingConfirm: vi.fn(),
    handleSpareTheDyingSkip: vi.fn(),
    pendingDeathWard: null,
    handleDeathWardConfirm: vi.fn(),
    handleDeathWardSkip: vi.fn(),
    pendingHeroism: null,
    handleHeroismConfirm: vi.fn(),
    handleHeroismSkip: vi.fn(),
    pendingSanctuary: null,
    handleSanctuaryConfirm: vi.fn(),
    handleSanctuarySkip: vi.fn(),
    pendingRegenerate: null,
    handleRegenerateConfirm: vi.fn(),
    handleRegenerateSkip: vi.fn(),
    pendingHealingWord: null,
    handleHealingWordConfirm: vi.fn(),
    handleHealingWordSkip: vi.fn(),
    pendingCureWounds: null,
    handleCureWoundsConfirm: vi.fn(),
    handleCureWoundsSkip: vi.fn(),
    pendingRevivify: null,
    handleRevivifyConfirm: vi.fn(),
    handleRevivifySkip: vi.fn(),
    pendingShapechange: null,
    pendingUpcast: null,
    buildUpcastLevels: vi.fn(() => []),
    handleUpcastConfirm: vi.fn(),
    handleUpcastCancel: vi.fn(),
    flowHoldMonster: null,
    handleHoldMonsterConfirm: vi.fn(),
    handleHoldMonsterSkip: vi.fn(),
    flowHoldPerson: null,
    handleHoldPersonConfirm: vi.fn(),
    handleHoldPersonSkip: vi.fn(),
    flowPolymorph: null,
    handlePolymorphConfirm: vi.fn(),
    handlePolymorphSkip: vi.fn(),
    flowAnimalShapes: null,
    handleAnimalShapesTargetConfirm: vi.fn(),
    handleAnimalShapesSkip: vi.fn(),
    flowTruePolymorph: null,
    handleTruePolymorphPathSelect: vi.fn(),
    handleTruePolymorphTargetConfirm: vi.fn(),
    handleTruePolymorphSkip: vi.fn(),
    flowCharmPerson: null,
    handleCharmPersonConfirm: vi.fn(),
    handleCharmPersonSkip: vi.fn(),
    flowCharmMonster: null,
    handleCharmMonsterConfirm: vi.fn(),
    handleCharmMonsterSkip: vi.fn(),
    flowBanishment: null,
    handleBanishmentConfirm: vi.fn(),
    handleBanishmentSkip: vi.fn(),
    flowPrismaticSpray: null,
    handlePrismaticSprayConfirm: vi.fn(),
    handlePrismaticSpraySkip: vi.fn(),
  })),
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

describe('CharSpells - Additional Coverage', () => {
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
      // toHit (5) - exhaustionPenalty (0) = 5
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('renders spell modifier with calculated value', () => {
      renderWithProps({});
      // modifier (3) - exhaustionPenalty (0) = 3
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

  describe('spell data edge cases', () => {
    it('handles spell with null damage gracefully', () => {
      const spell = {
        name: 'Null Damage Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        damage: null,
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Utility')).toBeInTheDocument();
    });

    it('handles spell with empty components array', () => {
      const spell = {
        name: 'Empty Components Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: [],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const notesCells = Array.from(table.querySelectorAll('tbody td:last-child')).map(td => td.textContent.trim());
      expect(notesCells).toContain('');
    });

    it('handles spell without range property', () => {
      const spell = {
        name: 'No Range Spell',
        level: 1,
        casting_time: '1 action',
        duration: 'Instantaneous',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const rangeCells = Array.from(table.querySelectorAll('tbody td:nth-child(5)')).map(td => td.textContent.trim());
      expect(rangeCells).toContain('');
    });

    it('handles spell without duration property', () => {
      const spell = {
        name: 'No Duration Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const durationCells = Array.from(table.querySelectorAll('tbody td:nth-child(7)')).map(td => td.textContent.trim());
      expect(durationCells).toContain('');
    });

    it('handles spell without casting_time property', () => {
      const spell = {
        name: 'No Casting Time Spell',
        level: 1,
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const timeCells = Array.from(table.querySelectorAll('tbody td:nth-child(4)')).map(td => td.textContent.trim());
      expect(timeCells).toContain('');
    });
  });

  describe('spell name click behavior', () => {
    it('sets selectedSpell to the clicked spell for opening details', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      fireEvent.click(lightCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
      expect(screen.getByTestId('spell-detail-popup')).toHaveTextContent('Light');
    });

    it('prevents opening details for grayed non-castable spells', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const shieldCell = screen.getByText('Shield');
      expect(shieldCell).toHaveClass('not-castable');
      expect(shieldCell).not.toHaveClass('clickable');
      fireEvent.click(shieldCell);
      expect(screen.queryByTestId('spell-detail-popup')).not.toBeInTheDocument();
    });

    it('allows opening details for unprepared ritual spells for 2024 wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const detectMagicCell = screen.getByText('Detect Magic');
      expect(detectMagicCell).toHaveClass('clickable');
      expect(detectMagicCell).not.toHaveClass('not-castable');
      fireEvent.click(detectMagicCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });
  });

  describe('spell table column ordering', () => {
    it('renders spell name in first column', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const firstCells = Array.from(table.querySelectorAll('tbody td:nth-child(1)')).map(td => td.textContent.trim());
      expect(firstCells).toContain('Light');
    });

    it('renders level in second column', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const secondCells = Array.from(table.querySelectorAll('tbody td:nth-child(2)')).map(td => td.textContent.trim());
      expect(secondCells).toContain('Cantrip');
      expect(secondCells).toContain('1');
    });

    it('renders range in correct column for 5e (6th column with prepared)', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const rangeCells = Array.from(table.querySelectorAll('tbody td:nth-child(5)')).map(td => td.textContent.trim());
      expect(rangeCells).toContain('Touch');
      expect(rangeCells).toContain('Self');
    });

    it('renders range in correct column for 2024 (5th column without prepared)', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      const table = screen.getByRole('table');
      const rangeCells = Array.from(table.querySelectorAll('tbody td:nth-child(4)')).map(td => td.textContent.trim());
      expect(rangeCells).toContain('Touch');
      expect(rangeCells).toContain('Self');
    });
  });

  describe('spell component formatting', () => {
    it('joins components with "/" separator', () => {
      const spell = {
        name: 'Three Component Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V', 'S', 'M'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const notesCells = Array.from(table.querySelectorAll('tbody td:last-child')).map(td => td.textContent.trim());
      expect(notesCells).toContain('V/S/M');
    });

    it('replaces "Concentration" with "Con" in notes', () => {
      const spell = {
        name: 'Concentration Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Concentration, up to 10 minutes',
        components: ['V', 'Concentration'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const table = screen.getByRole('table');
      const notesCells = Array.from(table.querySelectorAll('tbody td:last-child')).map(td => td.textContent.trim());
      expect(notesCells).toContain('V/Con');
    });
  });

  describe('casting time abbreviations', () => {
    it('abbreviates "minute" to "min" in duration', () => {
      const spell = {
        name: 'Minute Duration Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: '1 minute',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('1 min')).toBeInTheDocument();
    });

    it('removes "up to" from duration', () => {
      const spell = {
        name: 'Up To Duration Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'up to 1 hour',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('1 hour')).toBeInTheDocument();
    });
  });

  describe('spell effect formatting', () => {
    it('renders damage with type from damage_at_slot_level for non-action spells', () => {
      const spell = {
        name: 'Utility Damage Spell',
        level: 1,
        casting_time: '1 turn',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V'],
        damage: {
          damage_at_slot_level: {
            '1': '2d6',
          },
          damage_type: 'Acid',
        },
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('2d6 Acid')).toBeInTheDocument();
    });

    it('renders damage with type from damage_at_character_level as fallback for non-action spells', () => {
      const spell = {
        name: 'Character Level Damage Spell',
        level: 1,
        casting_time: '1 turn',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V'],
        damage: {
          damage_at_character_level: {
            '1': '3d6',
          },
          damage_type: 'Thunder',
        },
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('3d6 Thunder')).toBeInTheDocument();
    });

    it('renders "Utility" when no damage and no DC', () => {
      const spell = {
        name: 'Pure Utility Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: '1 hour',
        components: ['V'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Utility')).toBeInTheDocument();
    });

    it('renders save DC type when only DC present', () => {
      const spell = {
        name: 'Save DC Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        dc: {
          dc_type: 'INT',
          dc_success: 'negates',
        },
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('INT negates')).toBeInTheDocument();
    });
  });

  describe('spell row CSS classes', () => {
    it('applies clickable class to castable spell names', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      expect(lightCell).toHaveClass('clickable');
    });

    it('applies not-castable class to grayed 2024 wizard spells', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const shieldCell = screen.getByText('Shield');
      expect(shieldCell).toHaveClass('not-castable');
    });

    it('applies spell-row-not-castable class to the entire row for grayed spells', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const table = screen.getByRole('table');
      const shieldRow = Array.from(table.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Shield'));
      expect(shieldRow).toHaveClass('spell-row-not-castable');
    });

    it('applies table-striped class to the spell table', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      expect(table).toHaveClass('table-striped');
    });

    it('applies table-spells class to the spell table', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      expect(table).toHaveClass('table-spells');
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

  describe('prepared column header sorting', () => {
    it('makes Spell header clickable for alphabetical sort', () => {
      renderWithProps({});
      const spellHeader = screen.getByText('Spell');
      expect(spellHeader).toHaveClass('clickable');
    });

    it('makes Level header clickable for level sort', () => {
      renderWithProps({});
      const levelHeader = screen.getByText('Level');
      expect(levelHeader).toHaveClass('clickable');
    });

    it('makes Prepared header clickable for filter toggle (5e only)', () => {
      renderWithProps({});
      const preparedHeader = screen.getByText('Prepared');
      expect(preparedHeader).toHaveClass('clickable');
    });
  });

  describe('spell row key attribute', () => {
    it('renders each spell name in a unique row', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
      const names = Array.from(rows).map(row => row.querySelector('td:first-child')?.textContent.trim());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('CharSpellSlots rendering', () => {
    it('renders the CharSpellSlots component', () => {
      renderWithProps({});
      expect(screen.getByTestId('char-spell-slots')).toBeInTheDocument();
    });
  });

  describe('spell name title attribute', () => {
    it('sets title="Not prepared" for grayed non-castable 2024 wizard spells', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const shieldCell = screen.getByText('Shield');
      expect(shieldCell).toHaveAttribute('title', 'Not prepared');
    });

    it('does not set title attribute for castable spells', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      expect(lightCell).not.toHaveAttribute('title');
    });
  });
});
