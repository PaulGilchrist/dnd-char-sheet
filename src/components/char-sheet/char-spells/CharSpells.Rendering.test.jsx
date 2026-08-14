// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import * as helpers from './CharSpells.test.helpers.js';

const { useSpellMetamagicFlow } = vi.hoisted(() => {
  const spellFlowHandlers = [
    'gateMetamagic','handleConfirm','handleSkip','handleMultiTargetConfirm','handleMultiTargetSkip',
    'handleAidConfirm','handleAidSkip','handleHeroesFeastConfirm','handleHeroesFeastSkip',
    'handleGreaterRestorationConfirm','handleGreaterRestorationSkip',
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

vi.mock('./CharSpellSlotLevel.jsx', () => ({
  default: function CharSpellSlotLevel() {
    return <div data-testid="char-spell-slot-level">SlotLevel</div>;
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

vi.mock('../popups/MultiTargetCountPopup.jsx', () => ({
  default: function MultiTargetCountPopup() {
    return <div data-testid="aid-target-popup">Aid</div>;
  },
}));

vi.mock('../popups/TargetWithCheckboxesPopup.jsx', () => ({
  default: function TargetWithCheckboxesPopup() {
    return <div data-testid="greater-restoration-popup">GreaterRestoration</div>;
  },
}));

vi.mock('../popups/SingleTargetPopup.jsx', () => ({
  default: function SingleTargetPopup() {
    return <div data-testid="mage-armor-popup">MageArmor</div>;
  },
}));

vi.mock('../popups/TargetWithTypePopup.jsx', () => ({
  default: function TargetWithTypePopup() {
    return <div data-testid="protection-from-energy-popup">ProtectionFromEnergy</div>;
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

vi.mock('../DiceRollResult.jsx', () => ({
  default: function DiceRollResult() {
    return <div data-testid="dice-roll-result">DiceRollResult</div>;
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

const basePlayerStats = helpers.mockPlayerStats;
const baseProps = { playerStats: basePlayerStats, campaignName: 'test' };

function renderWithProps(props) {
  return render(<CharSpells {...baseProps} {...props} />);
}

describe('CharSpells - Rendering Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('no spellAbilities', () => {
    it('renders nothing when spellAbilities is absent', () => {
      const stats = { name: 'No Spells' };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders nothing when spells array is empty', () => {
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('spell effect rendering', () => {
    it('renders effect with save DC half success', () => {
      const spell = {
        name: 'Cone of Cold',
        level: 2,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V', 'S', 'M'],
        damage: {
          damage_at_slot_level: {
            '2': '3d8',
          },
          damage_type: 'Cold',
        },
        dc: {
          dc_type: 'DEX',
          dc_success: 'half',
        },
        prepared: 'Prepared',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('3d8 Cold (DEX half)')).toBeInTheDocument();
    });

    it('renders effect with save DC negates success', () => {
      const spell = {
        name: 'Frostbite',
        level: 0,
        casting_time: '1 turn',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        damage: {
          damage_at_slot_level: {
            '1': '1d6',
          },
          damage_type: 'Cold',
        },
        dc: {
          dc_type: 'CON',
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
      expect(screen.getByText('1d6 Cold (CON negates)')).toBeInTheDocument();
    });

    it('renders damage from damage_at_character_level when damage_at_slot_level is absent', () => {
      const spell = {
        name: 'Character Level Spell',
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

    it('renders Utility when spell has no damage and no DC', () => {
      const utilitySpell = {
        name: 'Comprehend Languages',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: '1 hour',
        components: ['S'],
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [utilitySpell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('Utility')).toBeInTheDocument();
    });

    it('renders Utility when damage is null', () => {
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

    it('renders cantrip damage using highest level at or below player level', () => {
      const cantrip = {
        name: 'Fire Bolt',
        level: 0,
        casting_time: '1 turn',
        range: '120 feet',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        damage: {
          damage_at_slot_level: {
            '1': '1d10',
            '5': '2d10',
            '11': '3d10',
          },
          damage_type: 'Fire',
        },
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        level: 5,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [cantrip],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('2d10 Fire')).toBeInTheDocument();
    });

    it('falls back to first damage key when player level is below all cantrip damage keys', () => {
      const cantrip = {
        name: 'Custom Cantrip',
        level: 0,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        damage: {
          damage_at_slot_level: {
            '5': '2d10',
            '11': '3d10',
          },
          damage_type: 'Lightning',
        },
        prepared: 'Always',
      };
      const stats = {
        ...basePlayerStats,
        level: 0,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [cantrip],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      expect(screen.getByText('2d10 Lightning')).toBeInTheDocument();
    });
  });

  describe('duration formatting', () => {
    it('abbreviates "minute" to "min"', () => {
      const spell = {
        name: 'Minute Spell',
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

    it('abbreviates "minutes" to "min"', () => {
      const spell = {
        name: 'Minutes Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: '10 minutes',
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
      expect(screen.getByText('10 mins')).toBeInTheDocument();
    });

    it('removes "up to" from duration', () => {
      const spell = {
        name: 'Up To Spell',
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

    it('renders "Instant" for Instantaneous duration', () => {
      const spell = {
        name: 'Instant Spell',
        level: 1,
        casting_time: '1 action',
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
      expect(screen.getByText('Instant')).toBeInTheDocument();
    });

    it('handles missing duration gracefully', () => {
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
  });

  describe('casting time formatting', () => {
    it('abbreviates "action" to " A"', () => {
      const spell = {
        name: 'Action Spell',
        level: 1,
        casting_time: '1 action',
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
      expect(timeCells).toContain('1  A');
    });

    it('handles missing casting_time gracefully', () => {
      const spell = {
        name: 'No Time Spell',
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

  describe('notes formatting', () => {
    it('joins multiple components with "/" in notes', () => {
      const spell = {
        name: 'Multi Component Spell',
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

    it('joins two components with "/"', () => {
      const spell = {
        name: 'Two Component Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V', 'M'],
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
      expect(notesCells).toContain('V/M');
    });

    it('renders empty notes for empty components array', () => {
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

  describe('missing property handling', () => {
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

  describe('spell row prepared logic', () => {
    it('renders checkbox for spells with empty prepared string', () => {
      const spell = {
        name: 'Empty Prepared Spell',
        level: 1,
        casting_time: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        prepared: '',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spell],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);
    });
  });

  describe('spell popup close', () => {
    it('closes the spell detail popup when the popup overlay is clicked', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      fireEvent.click(lightCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();

      const popupOverlay = screen.getByTestId('popup-overlay');
      fireEvent.click(popupOverlay);
      expect(screen.queryByTestId('spell-detail-popup')).not.toBeInTheDocument();
    });
  });

  describe('spell abilities section info', () => {
    it('renders cantrips_known count', () => {
      renderWithProps({});
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders prepared_spells info for 5e', () => {
      renderWithProps({});
      expect(screen.getByText(/Prepared Spells:/)).toBeInTheDocument();
      expect(screen.getByText(/Max Prepared:/)).toBeInTheDocument();
    });

    it('does not render prepared_spells info for 2024 non-wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      expect(screen.queryByText(/Prepared Spells:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Max Prepared:/)).not.toBeInTheDocument();
    });
  });
});
