// @improved-by-ai
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonsterCardModal from './MonsterCardModal.jsx';
import { makeMonster, makeProps, defaultConditionEffects } from './MonsterCardModal.test-utils.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [1, 2], modifier: 0 })),
  rollExpressionDoubled: vi.fn(() => ({ total: 10, rolls: [1, 2], modifier: 0 })),
}));

vi.mock('../../services/ui/sanitize.js', () => ({ sanitizeHtml: vi.fn((html) => String(html || '')) }));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  let _popupHtml = null;
  const _setPopupHtml = vi.fn((val) => { _popupHtml = val; });
  const _rollSavingThrow = vi.fn();

  const mockHook = vi.fn((_monsterName, _campaignName, _opts) => ({
    get popupHtml() { return _popupHtml; },
    setPopupHtml: _setPopupHtml,
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    rollAbilityCheck: vi.fn(),
    rollSavingThrow: _rollSavingThrow,
    rollSkillCheck: vi.fn(),
    rollInitiative: vi.fn(),
    quickRollPlayerSave: vi.fn(),
  }));

  return {
    default: mockHook,
    _rollSavingThrow,
    _setPopupHtml,
    __setPopupHtml(val) { _popupHtml = val; },
  };
});

vi.mock('../../services/combat/conditions/conditionEffects.js', () => {
  let _computeReturn = null;
  const _computeConditionEffects = vi.fn((_conditions) => {
    return _computeReturn ?? { ...defaultConditionEffects };
  });

  return {
    computeConditionEffects: _computeConditionEffects,
    combineAttackModes: vi.fn(() => 'normal'),
    CONDITIONS_THAT_CANNOT_ACT: new Set(['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious']),
    __setComputeReturn(val) { _computeReturn = val; },
  };
});

vi.mock('../../services/rules/combat/damageUtils.js', () => {
  let _findCreatureReturn = null;

  return {
    extractDamageTypes: vi.fn(() => []),
    formatDamageTypes: vi.fn((types) => (types || []).join(', ') || ''),
    getTargetFromAttacker: vi.fn(() => null),
    getResistanceNotice: vi.fn(() => null),
    findCreatureByName: vi.fn((_ctx, _name) => {
      return _findCreatureReturn ?? { name: 'Goblin', conditions: [] };
    }),
    getCombatContext: vi.fn().mockResolvedValue(null),
    __setFindCreatureReturn(val) { _findCreatureReturn = val; },
  };
});

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  computeRangeEffect: vi.fn(() => ({ mode: 'normal' })),
  getDistanceFeet: vi.fn(() => null),
  getNearestPlacedItem: vi.fn(() => null),
  rangeToFeet: vi.fn((range) => {
    if (typeof range === 'number') return range;
    if (range === 'touch') return 8;
    if (!range) return null;
    const m = range.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 30;
  }),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/shared/abilityLookup.js', () => ({
  getAbilitySaveModifier: vi.fn((_abilities, _abilityKey) => 0),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
  const mockUseRuntimeValue = vi.fn((_characterKey, _propertyName, _campaignName) => null);

  return {
    useRuntimeValue: mockUseRuntimeValue,
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
  };
});

// ── Re-import for test helpers ─────────────────────────────────────────────

import * as useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import * as abilityLookup from '../../services/shared/abilityLookup.js';
import * as damageUtils from '../../services/rules/combat/damageUtils.js';

const rollSavingThrow = useLoggedDiceRoll._rollSavingThrow;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Find a save dice link by its visible text (e.g. "DC 13 Dexterity"). */
function findSaveLinkByText(text) {
  const links = document.querySelectorAll('.mc-dice-link-save-clickable');
  return Array.from(links).find(el => el.textContent.includes(text)) || null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MonsterCardModal - save modifier resolution via handleSaveRoll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    damageUtils.__setFindCreatureReturn(null);
    abilityLookup.getAbilitySaveModifier.mockReturnValue(0);
  });

  describe('player target — abilities array (highest priority)', () => {
    it('uses getAbilitySaveModifier from playerChar.abilities when available', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      const playerChar = {
        name: 'Player A',
        abilities: [
          { name: 'Dexterity', bonus: 3 },
          { name: 'Strength', bonus: 1 },
        ],
      };

      abilityLookup.getAbilitySaveModifier.mockReturnValue(3);

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }], characters: [playerChar] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(abilityLookup.getAbilitySaveModifier).toHaveBeenCalledWith(playerChar.abilities, 'dex');
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', 3, expect.objectContaining({ saveDc: 13, saveType: 'Dexterity' }));
    });

    it('handles negative modifiers from abilities array', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player B',
      });

      const m = makeMonster({
        actions: [{ name: 'Fireball', description: 'Dexterity Saving Throw: DC 15', save_dc: 15, save_type: 'Dexterity' }],
      });

      const playerChar = {
        name: 'Player B',
        abilities: [{ name: 'Dexterity', bonus: -2 }],
      };

      abilityLookup.getAbilitySaveModifier.mockReturnValue(-2);

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player B' }, { name: 'Player B', type: 'player' }], characters: [playerChar] })} />);

      const saveLink = findSaveLinkByText('DC 15');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', -2, expect.objectContaining({ saveDc: 15, saveType: 'Dexterity' }));
    });
  });

  describe('player target — saving_throws fallback', () => {
    it('uses creature.saving_throws when player has no abilities array', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player', saving_throws: { dex: { modifier: 2 } } }], characters: [] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', 2, expect.objectContaining({ saveDc: 13, saveType: 'Dexterity' }));
    });

    it('handles negative modifiers from saving_throws', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Fireball', description: 'Constitution Saving Throw: DC 14', save_dc: 14, save_type: 'Constitution' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player', saving_throws: { con: { modifier: -3 } } }], characters: [] })} />);

      const saveLink = findSaveLinkByText('DC 14');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', -3, expect.objectContaining({ saveDc: 14, saveType: 'Constitution' }));
    });
  });

  describe('player target — ability_score_modifiers fallback', () => {
    it('uses creature.ability_score_modifiers when saving_throws is also missing', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player', ability_score_modifiers: { dex: 4 } }], characters: [] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', 4, expect.objectContaining({ saveDc: 13, saveType: 'Dexterity' }));
    });

    it('handles negative modifiers from ability_score_modifiers', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Fireball', description: 'Strength Saving Throw: DC 12', save_dc: 12, save_type: 'Strength' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player', ability_score_modifiers: { str: -5 } }], characters: [] })} />);

      const saveLink = findSaveLinkByText('DC 12');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('STR', -5, expect.objectContaining({ saveDc: 12, saveType: 'Strength' }));
    });
  });

  describe('player target — no modifier source', () => {
    it('defaults to 0 when no save modifier source is found', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }], characters: [] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', 0, expect.objectContaining({ saveDc: 13, saveType: 'Dexterity' }));
    });
  });

  describe('non-player target — saving_throws', () => {
    it('uses target.saving_throws for non-player targets', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Ogre',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Constitution Saving Throw: DC 13', save_dc: 13, save_type: 'Constitution' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Ogre' }, { name: 'Ogre', saving_throws: { con: { modifier: 4 } } }] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', 4, expect.objectContaining({ saveDc: 13, saveType: 'Constitution' }));
    });

    it('handles negative modifiers from non-player saving_throws', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Specter',
      });

      const m = makeMonster({
        actions: [{ name: 'Hypnotic Pattern', description: 'Wisdom Saving Throw: DC 11', save_dc: 11, save_type: 'Wisdom' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Specter' }, { name: 'Specter', saving_throws: { wis: { modifier: -2 } } }] })} />);

      const saveLink = findSaveLinkByText('DC 11');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('WIS', -2, expect.objectContaining({ saveDc: 11, saveType: 'Wisdom' }));
    });
  });

  describe('non-player target — ability_score_modifiers fallback', () => {
    it('uses target.ability_score_modifiers as fallback for non-player targets', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Ogre',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Constitution Saving Throw: DC 13', save_dc: 13, save_type: 'Constitution' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Ogre' }, { name: 'Ogre', ability_score_modifiers: { con: 3 } }] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', 3, expect.objectContaining({ saveDc: 13, saveType: 'Constitution' }));
    });
  });

  describe('non-player target — no modifier source', () => {
    it('defaults to 0 when non-player target has no save data', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Ogre',
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Constitution Saving Throw: DC 13', save_dc: 13, save_type: 'Constitution' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Ogre' }, { name: 'Ogre' }] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', 0, expect.objectContaining({ saveDc: 13, saveType: 'Constitution' }));
    });
  });

  describe('no target', () => {
    it('renders clickable save DC even without a target (modifier defaults to 0)', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin' }] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
    });

    it('rolls save with modifier 0 when no target is set', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        actions: [{ name: 'Web', description: 'Dexterity Saving Throw: DC 13', save_dc: 13, save_type: 'Dexterity' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin' }] })} />);

      const saveLink = findSaveLinkByText('DC 13');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('DEX', 0, expect.objectContaining({ saveDc: 13, saveType: 'Dexterity' }));
    });
  });

  describe('save type abbreviation', () => {
    it('converts save_type to uppercase abbreviation for rollSavingThrow', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Charm', description: 'Wisdom Saving Throw: DC 12', save_dc: 12, save_type: 'Wisdom' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const saveLink = findSaveLinkByText('DC 12');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('WIS', 0, expect.objectContaining({ saveType: 'Wisdom' }));
    });

    it('converts different save types to correct abbreviations', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Poison', description: 'Constitution Saving Throw: DC 14', save_dc: 14, save_type: 'Constitution' }],
      });

      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const saveLink = findSaveLinkByText('DC 14');
      expect(saveLink).toBeInTheDocument();
      fireEvent.click(saveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', 0, expect.objectContaining({ saveDc: 14, saveType: 'Constitution' }));
    });
  });
});
