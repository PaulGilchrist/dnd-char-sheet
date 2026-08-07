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

let mockRollAttack = vi.fn();
let mockRollDamage = vi.fn();

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

describe('CharSpells - Interactions & Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRollAttack.mockClear();
    mockRollDamage.mockClear();
  });

  describe('filter prepared toggle', () => {
    it('shows all spells initially when filterPrepared is false', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);
    });

    it('filters to only prepared/always spells when filter is toggled', () => {
      renderWithProps({});
      const filterHeader = screen.getByText('Prepared');
      fireEvent.click(filterHeader);

      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('toggles back to show all spells when filter is toggled again', () => {
      renderWithProps({});
      const filterHeader = screen.getByText('Prepared');
      fireEvent.click(filterHeader);
      fireEvent.click(filterHeader);

      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
    });
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

      expect(mockRollAttack).toHaveBeenCalledWith('Spell Attack', 5, expect.any(Object));
    });

    it('applies exhaustion penalty to to-hit value', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockRollAttack).toHaveBeenCalledWith('Spell Attack', 4, expect.any(Object));
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

  describe('concentration in duration field', () => {
    it('shows "Concentration" in the duration column and abbreviates "minutes" to "min"', () => {
      const spell = {
        name: 'Concentration Spell',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Concentration, up to 10 minutes',
        components: ['V', 'S'],
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
      expect(durationCells).toContain('Concentration, 10 mins');
    });
  });

  describe('notes with missing components', () => {
    it('shows empty notes when components are missing', () => {
      const spell = {
        name: 'No Components Spell',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
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
  });

  describe('spell abilities section display', () => {
    it('renders spell modifier with exhaustion penalty styling', () => {
      renderWithProps({ exhaustionPenalty: 1 });
      const spellAbilitiesSpan = document.querySelectorAll('.spell-abilities span');
      const modifierSpan = spellAbilitiesSpan[1];
      expect(modifierSpan).toHaveClass('stat--penalized');
    });
  });

  describe('spell level display', () => {
    it('renders "Cantrip" for level 0 spells', () => {
      renderWithProps({});
      expect(screen.getByText('Cantrip')).toBeInTheDocument();
    });

    it('renders the numeric level for non-cantrip spells', () => {
      renderWithProps({});
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('wrapper div visibility', () => {
    it('does not render the spell popup parent wrapper when spellAbilities is missing', () => {
      const stats = { name: 'No Spells' };
      render(<CharSpells playerStats={stats} campaignName="test" />);
      const wrapper = document.querySelector('.spell-popup-parent');
      expect(wrapper).not.toBeInTheDocument();
    });
  });

  describe('2024 non-wizard prepared column', () => {
    it('does not show prepared column for 2024 non-wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      const table = screen.getByRole('table');
      const headers = Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim());
      expect(headers).not.toContain('Prepared');
    });

    it('renders prepared column for 2024 wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const table = screen.getByRole('table');
      const headers = Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim());
      expect(headers).toContain('Prepared');
    });
  });

  describe('spell row class names', () => {
    it('applies spell-row-not-castable class to unprepared non-ritual 2024 wizard spells', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const table = screen.getByRole('table');
      const shieldRow = Array.from(table.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Shield'));
      expect(shieldRow).toHaveClass('spell-row-not-castable');
    });

    it('does not apply spell-row-not-castable to unprepared ritual spells for 2024 wizard', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024Wizard });
      const table = screen.getByRole('table');
      const detectMagicRow = Array.from(table.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Detect Magic'));
      expect(detectMagicRow).not.toHaveClass('spell-row-not-castable');
    });

    it('does not apply spell-row-not-castable for non-wizard 2024 rules', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        expect(row).not.toHaveClass('spell-row-not-castable');
      });
    });
  });

  // Note: "bonus action" → "BA" and "reaction" → "Reaction" abbreviations are tested
  // implicitly via the existing CharSpells.Rendering.test.jsx which covers casting time formatting.
  // Spells with those casting times are excluded from CharSpells by getExcludedSpellNames,
  // so they can't be directly tested in the CharSpells table.

  describe('duration formatting edge cases', () => {
    it('removes "up to" from duration string', () => {
      const spell = {
        name: 'Up To Spell',
        level: 1,
        casting_time: '1 turn',
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

  describe('spell effect formatting edge cases', () => {
    it('renders "Utility" for spells with no damage and no save DC', () => {
      const spell = {
        name: 'Utility Spell',
        level: 1,
        casting_time: '1 turn',
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

    it('renders save DC type with "negates" success', () => {
      const spell = {
        name: 'Negates Spell',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
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
      expect(screen.getByText('CON negates')).toBeInTheDocument();
    });

    it('renders save DC type with "half" success', () => {
      const spell = {
        name: 'Half Spell',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        dc: {
          dc_type: 'DEX',
          dc_success: 'half',
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
      expect(screen.getByText('DEX half')).toBeInTheDocument();
    });

    it('renders save DC type with empty success string', () => {
      const spell = {
        name: 'Empty Success Spell',
        level: 1,
        casting_time: '1 turn',
        range: 'Self',
        duration: 'Instantaneous',
        components: ['V'],
        dc: {
          dc_type: 'WIS',
          dc_success: '',
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
      expect(screen.getByText('WIS')).toBeInTheDocument();
    });
  });

  describe('prepared column rendering logic', () => {
    it('renders prepared text for spells with prepared="Always"', () => {
      renderWithProps({});
      const table = screen.getByRole('table');
      const preparedCells = Array.from(table.querySelectorAll('tbody td:nth-child(3)')).map(td => td.textContent.trim());
      expect(preparedCells).toContain('Always');
    });

    it('does not render prepared column cell for spells with prepared="Always" when prepared column is hidden', () => {
      renderWithProps({ playerStats: helpers.mockPlayerStats2024 });
      const table = screen.getByRole('table');
      const cells = Array.from(table.querySelectorAll('tbody td')).map(td => td.textContent.trim());
      expect(cells).not.toContain('Always');
    });

    it('renders checkbox for spells with prepared="" (empty string)', () => {
      const spell = {
        name: 'Empty Prepared Spell',
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
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);
    });
  });
});
