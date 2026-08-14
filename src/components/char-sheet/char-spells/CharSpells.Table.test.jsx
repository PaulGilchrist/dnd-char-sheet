// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    pendingUpcast: null,
    pendingShapechange: null,
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
    gateUpcast: vi.fn(() => false),
    getCantripAutoLevel: vi.fn(() => null),
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

const basePlayerStats = helpers.mockPlayerStats;
const baseProps = { playerStats: basePlayerStats, campaignName: 'test' };

function renderWithProps(props) {
  return render(<CharSpells {...baseProps} {...props} />);
}

describe('CharSpells - Table Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('table structure', () => {
    it('renders the spell table', () => {
      renderWithProps({});
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it.each`
      ruleset                | playerStats              | expectedHeaders
      ${'5e'}                | ${basePlayerStats}       | ${['Spell', 'Level', 'Prepared', 'Time', 'Range', 'Effect', 'Duration', 'Notes']}
      ${'2024'}              | ${helpers.mockPlayerStats2024} | ${['Spell', 'Level', 'Time', 'Range', 'Effect', 'Duration', 'Notes']}
      ${'2024 wizard'}       | ${helpers.mockPlayerStats2024Wizard} | ${['Spell', 'Level', 'Prepared', 'Time', 'Range', 'Effect', 'Duration', 'Notes']}
    `('renders correct headers for $ruleset rules', ({ playerStats, expectedHeaders }) => {
      renderWithProps({ playerStats });
      const table = screen.getByRole('table');
      const headers = Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim());
      expect(headers).toEqual(expectedHeaders);
    });

    it('renders a row for each spell in the list', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);
    });
  });

  describe('spell content rendering', () => {
    it('renders spell names, levels, ranges, and notes from the data', () => {
      renderWithProps({});
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Detect Magic')).toBeInTheDocument();
      expect(screen.getByText('Cantrip')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Touch')).toBeInTheDocument();
      expect(screen.getByText('Self')).toBeInTheDocument();
    });

    it('abbreviates "Instantaneous" duration as "Instant"', () => {
      const spell = {
        name: 'Instant Spell',
        level: 1,
        casting_time: '1 turn',
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
  });

  describe('prepared column', () => {
    it('renders checkboxes for spells with prepared: "Prepared"', () => {
      const spellWithCheckbox = {
        name: 'Shield',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: '1 round',
        components: ['S'],
        prepared: 'Prepared',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spellWithCheckbox],
        },
      };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);
    });

    it('renders prepared text for spells with prepared: "Always"', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const preparedCells = Array.from(table.querySelectorAll('tbody td:nth-child(3)')).map(td => td.textContent.trim());
      expect(preparedCells).toContain('Always');
    });

    it('toggles checkbox checked state and calls handleTogglePreparedSpells', () => {
      const spellWithCheckbox = {
        name: 'Shield',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: '1 round',
        components: ['S'],
        prepared: 'Prepared',
      };
      const stats = {
        ...basePlayerStats,
        spellAbilities: {
          ...basePlayerStats.spellAbilities,
          spells: [spellWithCheckbox],
        },
      };
      const toggleFn = vi.fn();
      render(<CharSpells playerStats={stats} campaignName="test" handleTogglePreparedSpells={toggleFn} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(toggleFn).toHaveBeenCalledWith('Shield');
    });

    it('does not render prepared column or checkboxes for non-wizard 2024 rules', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      const headers = screen.getByRole('table').querySelectorAll('th');
      const headerTexts = Array.from(headers).map(h => h.textContent.trim());
      expect(headerTexts).not.toContain('Prepared');
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('renders the prepared column and checkboxes for a 2024 wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const headers = screen.getByRole('table').querySelectorAll('th');
      const headerTexts = Array.from(headers).map(h => h.textContent.trim());
      expect(headerTexts).toContain('Prepared');
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      checkboxes.forEach(checkbox => expect(checkbox).not.toBeChecked());
    });

    it('grays unprepared non-ritual 2024 wizard spells but keeps unprepared rituals castable', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const table = screen.getByRole('table');
      const shieldRow = Array.from(table.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Shield'));
      const detectMagicRow = Array.from(table.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Detect Magic'));
      expect(shieldRow).toHaveClass('spell-row-not-castable');
      expect(detectMagicRow).not.toHaveClass('spell-row-not-castable');

      const shieldCell = screen.getByText('Shield');
      expect(shieldCell).not.toHaveClass('clickable');
      fireEvent.click(shieldCell);
      expect(screen.queryByTestId('spell-detail-popup')).not.toBeInTheDocument();

      const detectMagicCell = screen.getByText('Detect Magic');
      expect(detectMagicCell).toHaveClass('clickable');
      fireEvent.click(detectMagicCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });
  });

  describe('spell detail popup', () => {
    it('opens the spell detail popup when a spell name is clicked', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      fireEvent.click(lightCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
      expect(screen.getByTestId('spell-detail-popup')).toHaveTextContent('Light');
    });
  });

  describe('sorting', () => {
    it('sorts spells alphabetically when Spell header is clicked', () => {
      renderWithProps({});
      const spellHeader = screen.getByText('Spell');
      fireEvent.click(spellHeader);
      expect(screen.getByText('Detect Magic')).toBeInTheDocument();
    });

    it('sorts spells by level ascending when Level header is clicked', () => {
      renderWithProps({});
      const levelHeader = screen.getByText('Level');
      fireEvent.click(levelHeader);
      expect(screen.getByText('Light')).toBeInTheDocument();
    });
  });

  describe('spell attack to-hit label', () => {
    it('renders the attack to-hit label with clickable class', () => {
      renderWithProps({});
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('clickable');
    });

    it('adds disabled-attack class when cannotAct is true', () => {
      renderWithProps({ cannotAct: true });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('disabled-attack');
    });

    it('adds stat--penalized class to to hit span when exhaustionPenalty is set', () => {
      renderWithProps({ exhaustionPenalty: 2 });
      const toHitSpan = document.querySelector('.spell-abilities span');
      expect(toHitSpan).toHaveClass('stat--penalized');
    });
  });
});
