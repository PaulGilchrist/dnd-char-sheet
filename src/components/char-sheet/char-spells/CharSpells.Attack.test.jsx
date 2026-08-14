// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpells from './CharSpells.jsx';

import { mockPlayerStats, mockHandleTogglePreparedSpells } from './CharSpells.test.helpers.js';

import useActionPopup from '../../../hooks/combat/useActionPopup.js';

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
  default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

let mockDiceRoll = { rollAttack: vi.fn(), rollDamage: vi.fn(), quickRollPlayerSave: vi.fn() };

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => mockDiceRoll),
}));

vi.mock('../../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useMetamagic.js', () => {
  const mockFn = () => ({
    currentSP: 10,
    maxSP: 10,
    spendSorceryPoints: vi.fn(),
    logMetamagic: vi.fn(),
  });
  mockFn.getCurrentSorceryPoints = vi.fn(() => 10);
  mockFn.getMaxSorceryPoints = vi.fn(() => 10);
  return { default: mockFn, getCurrentSorceryPoints: mockFn.getCurrentSorceryPoints, getMaxSorceryPoints: mockFn.getMaxSorceryPoints };
});

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('./CharSpellSlots.jsx', () => ({
  default: function MockCharSpellSlots() {
    return <div data-testid="char-spell-slots">Spell Slots</div>;
  },
}));

vi.mock('../../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null,
    gateMetamagic: vi.fn(),
    handleConfirm: vi.fn(),
    handleSkip: vi.fn(),
    pendingAid: null,
    pendingGreaterRestoration: null,
    handleAidConfirm: vi.fn(),
    handleAidSkip: vi.fn(),
    handleGreaterRestorationConfirm: vi.fn(),
    handleGreaterRestorationSkip: vi.fn(),
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

vi.mock('../../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
  isInnateSorceryActive: vi.fn(() => false),
  getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(() => []),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  getRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

const baseProps = {
  playerStats: mockPlayerStats,
  handleTogglePreparedSpells: mockHandleTogglePreparedSpells,
  campaignName: 'test-campaign',
};

function renderCharSpells(props = {}) {
  return render(<CharSpells {...baseProps} {...props} />);
}

describe('CharSpells', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDiceRoll = { rollAttack: vi.fn(), rollDamage: vi.fn(), quickRollPlayerSave: vi.fn() };
    useActionPopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
  });

  describe('spell attack to-hit', () => {
    it('calls rollAttack with correct arguments based on props', () => {
      renderCharSpells({ exhaustionPenalty: 1, conditionAttackMode: 'disadvantage' });

      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockDiceRoll.rollAttack).toHaveBeenCalledWith('Spell Attack', 4, expect.objectContaining({ forcedMode: 'disadvantage' }));
    });

    it('applies exhaustionPenalty to the displayed to-hit value', () => {
      renderCharSpells({ exhaustionPenalty: 2 });

      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('applies exhaustionPenalty styling to the attack label', () => {
      renderCharSpells({ exhaustionPenalty: 1 });

      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('stat--penalized');
    });

    it('applies stat--penalized class when conditionAttackMode is disadvantage', () => {
      renderCharSpells({ conditionAttackMode: 'disadvantage' });

      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('stat--penalized');
    });

    it('applies stat--penalized class when cannotAct is true', () => {
      renderCharSpells({ cannotAct: true });

      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      expect(attackLabel).toHaveClass('disabled-attack');
      expect(attackLabel).toHaveClass('stat--penalized');
    });

    it('does not call rollAttack when cannotAct is true', () => {
      renderCharSpells({ cannotAct: true });

      const attackLabel = screen.getByText(/Attack \(to hit\):/);
      fireEvent.click(attackLabel);

      expect(mockDiceRoll.rollAttack).not.toHaveBeenCalled();
    });
  });

  describe('cantrip damage display', () => {
    it.each`
      playerLevel | expectedDamage
      ${0}        | ${'1d10 Fire'}
      ${5}        | ${'2d10 Fire'}
      ${11}       | ${'3d10 Fire'}
      ${20}       | ${'3d10 Fire'}
    `('uses the highest available cantrip damage level at or below player level ($playerLevel)', ({ playerLevel, expectedDamage }) => {
      const statsWithCantripDamage = {
        ...mockPlayerStats,
        level: playerLevel,
        spellAbilities: {
          ...mockPlayerStats.spellAbilities,
          spells: [
            {
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
            },
          ],
        },
      };

      renderCharSpells({ playerStats: statsWithCantripDamage });

      expect(screen.getByText(expectedDamage)).toBeInTheDocument();
    });

    it('falls back to the first damage_at_slot_level key when player level is below all keys', () => {
      const stats = {
        ...mockPlayerStats,
        level: 0,
        spellAbilities: {
          ...mockPlayerStats.spellAbilities,
          spells: [
            {
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
            },
          ],
        },
      };

      renderCharSpells({ playerStats: stats });

      expect(screen.getByText('2d10 Lightning')).toBeInTheDocument();
    });

    it('uses damage_at_character_level when damage_at_slot_level is absent', () => {
      const statsWithCharacterLevelDamage = {
        ...mockPlayerStats,
        level: 11,
        spellAbilities: {
          ...mockPlayerStats.spellAbilities,
          spells: [
            {
              name: 'Custom Spell',
              level: 1,
              casting_time: '1 turn',
              range: '60 feet',
              duration: 'Instantaneous',
              components: ['V'],
              damage: {
                damage_at_character_level: {
                  '1': '2d6',
                  '5': '3d6',
                },
                damage_type: 'Acid',
              },
              prepared: 'Always',
            },
          ],
        },
      };

      renderCharSpells({ playerStats: statsWithCharacterLevelDamage });

      expect(screen.getByText('2d6 Acid')).toBeInTheDocument();
    });

    it.each`
      dc_success | dc_type | level | damageSlot | expectedDisplay
      ${'half'}  | ${'DEX'} | ${2}  | ${'2'}     | ${'3d8 Cold (DEX half)'}
      ${'negates'} | ${'CON'} | ${0}  | ${'1'}     | ${'1d6 Cold (CON negates)'}
    `('displays damage with save DC info: $dc_success success type', ({ dc_success, dc_type, level, damageSlot, expectedDisplay }) => {
      const statsWithSaveDc = {
        ...mockPlayerStats,
        spellAbilities: {
          ...mockPlayerStats.spellAbilities,
          spells: [
            {
              name: dc_success === 'negates' ? 'Frostbite' : 'Cone of Cold',
              level,
              casting_time: '1 turn',
              range: '60 feet',
              duration: 'Instantaneous',
              components: dc_success === 'negates' ? ['V', 'S'] : ['V', 'S', 'M'],
              damage: {
                damage_at_slot_level: {
                  [damageSlot]: dc_success === 'negates' ? '1d6' : '3d8',
                },
                damage_type: 'Cold',
              },
              dc: {
                dc_type,
                dc_success,
              },
              prepared: dc_success === 'negates' ? 'Always' : 'Prepared',
            },
          ],
        },
      };

      renderCharSpells({ playerStats: statsWithSaveDc });

      expect(screen.getByText(expectedDisplay)).toBeInTheDocument();
    });
  });

  describe('spell modifier display', () => {
    it('renders the spell modifier with exhaustionPenalty subtraction', () => {
      renderCharSpells({ exhaustionPenalty: 1 });

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('applies stat--penalized class to modifier span when exhaustionPenalty is positive', () => {
      renderCharSpells({ exhaustionPenalty: 1 });

      const modifierSpan = document.querySelectorAll('.spell-abilities span')[1];
      expect(modifierSpan).toHaveClass('stat--penalized');
    });
  });

  describe('save DC display', () => {
    it('renders the base save DC without modification', () => {
      renderCharSpells();

      expect(screen.getByText('13')).toBeInTheDocument();
    });
  });
});
