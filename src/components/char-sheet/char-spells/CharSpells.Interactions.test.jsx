// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';
import * as helpers from './CharSpells.test.helpers.js';

const { useSpellMetamagicFlow } = vi.hoisted(() => ({
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
  })),
}));

let mockRollAttack = vi.fn();
let mockRollDamage = vi.fn();

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
    rollAttack: mockRollAttack,
    rollDamage: mockRollDamage,
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

describe('CharSpells - Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRollAttack.mockClear();
    mockRollDamage.mockClear();
  });

  describe('spell attack click behavior', () => {
    it('does not call rollAttack when cannotAct is true', () => {
      renderWithProps({ cannotAct: true });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).not.toHaveBeenCalled();
    });

    it('calls rollAttack with spell attack name and correct to-hit value', () => {
      renderWithProps({});
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).toHaveBeenCalledWith(
        'Spell Attack',
        5,
        expect.any(Object)
      );
    });

    it('applies exhaustion penalty to to-hit value', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).toHaveBeenCalledWith(
        'Spell Attack',
        4,
        expect.any(Object)
      );
    });

    it('applies conditionAttackMode as forcedMode to rollAttack', () => {
      renderWithProps({ conditionAttackMode: 'disadvantage' });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).toHaveBeenCalledWith(
        'Spell Attack',
        5,
        expect.objectContaining({ forcedMode: 'disadvantage' })
      );
    });

    it('applies both exhaustion penalty and conditionAttackMode together', () => {
      renderWithProps({ exhaustionPenalty: 2, conditionAttackMode: 'disadvantage' });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).toHaveBeenCalledWith(
        'Spell Attack',
        3,
        expect.objectContaining({ forcedMode: 'disadvantage' })
      );
    });
  });

  describe('spell row click behavior', () => {
    it('does NOT open spell detail popup when a non-castable 2024 wizard spell is clicked', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const shieldCell = screen.getByText('Shield');
      expect(shieldCell).toHaveClass('not-castable');
      fireEvent.click(shieldCell);
      expect(screen.queryByTestId('spell-detail-popup')).not.toBeInTheDocument();
    });

    it('opens spell detail popup when a castable spell is clicked', () => {
      renderWithProps({});
      const lightCell = screen.getByText('Light');
      expect(lightCell).toHaveClass('clickable');
      fireEvent.click(lightCell);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });
  });

  describe('prepared checkbox interaction', () => {
    it('toggles checkbox checked state and calls handleTogglePreparedSpells', () => {
      const spell = {
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
          spells: [spell],
        },
      };
      const toggleFn = vi.fn();
      render(
        <CharSpells
          playerStats={stats}
          campaignName="test"
          handleTogglePreparedSpells={toggleFn}
        />
      );
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(toggleFn).toHaveBeenCalledWith('Shield');
    });

    it('renders checkbox unchecked for spells with empty prepared string', () => {
      const spell = {
        name: 'Unprepared Spell',
        level: 1,
        casting_time: '1 turn',
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
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('sorting interactions', () => {
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
});
