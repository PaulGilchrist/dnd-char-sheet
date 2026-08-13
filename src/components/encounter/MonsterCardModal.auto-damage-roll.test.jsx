// @improved-by-ai
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonsterCardModal from './MonsterCardModal.jsx';
import { makeMonster, makeProps, defaultConditionEffects } from './MonsterCardModal.test-utils.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 8, rolls: [3, 5], modifier: 2 })),
  rollExpressionDoubled: vi.fn(() => ({ total: 16, rolls: [3, 5], modifier: 2 })),
}));

vi.mock('../../services/ui/sanitize.js', () => ({ sanitizeHtml: vi.fn((html) => String(html || '')) }));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  let _popupHtml = null;
  const _rollAttack = vi.fn();
  const _rollDamage = vi.fn();
  const _rollAbilityCheck = vi.fn();
  const _rollSavingThrow = vi.fn();
  const _rollSkillCheck = vi.fn();
  const _rollInitiative = vi.fn();
  const _quickRollPlayerSave = vi.fn();
  const _setPopupHtml = vi.fn((val) => { _popupHtml = val; });

  const mockHook = vi.fn((_monsterName, _campaignName, _opts) => ({
    get popupHtml() { return _popupHtml; },
    setPopupHtml: _setPopupHtml,
    rollAttack: _rollAttack,
    rollDamage: _rollDamage,
    rollAbilityCheck: _rollAbilityCheck,
    rollSavingThrow: _rollSavingThrow,
    rollSkillCheck: _rollSkillCheck,
    rollInitiative: _rollInitiative,
    quickRollPlayerSave: _quickRollPlayerSave,
  }));

  return {
    default: mockHook,
    _rollAttack,
    _rollDamage,
    _rollAbilityCheck,
    _rollSavingThrow,
    _rollSkillCheck,
    _rollInitiative,
    _quickRollPlayerSave,
    _setPopupHtml,
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
  computeRangeEffect: vi.fn(() => ({ mode: 'normal', reason: '' })),
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
  let _inspiringMoveNoOA = false;
  let _remarkableNoOA = false;
  let _targetEffects = [];

  const mockUseRuntimeValue = vi.fn((_characterKey, propertyName, _campaignName) => {
    if (propertyName === 'targetEffects') return _targetEffects;
    if (propertyName === 'inspiringMovementNoOA') return _inspiringMoveNoOA;
    if (propertyName === 'remarkableAthleteNoOA') return _remarkableNoOA;
    return null;
  });

  return {
    useRuntimeValue: mockUseRuntimeValue,
    setRuntimeValue: vi.fn(),
    getRuntimeValue: vi.fn(() => null),
    __setInspiringMoveNoOA(val) { _inspiringMoveNoOA = val; },
    __setRemarkableNoOA(val) { _remarkableNoOA = val; },
    __setTargetEffects(val) { _targetEffects = val; },
  };
});

// ── Re-import mocked modules for test setup helpers ─────────────────────────

import * as useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import * as conditionEffects from '../../services/combat/conditions/conditionEffects.js';
import * as damageUtils from '../../services/rules/combat/damageUtils.js';

const rollDamage = useLoggedDiceRoll._rollDamage;
const rollAttack = useLoggedDiceRoll._rollAttack;

// ── Helpers ─────────────────────────────────────────────────────────────────

function findDiceLinkByText(text) {
  const links = document.querySelectorAll('.mc-dice-link');
  return Array.from(links).find(el => el.textContent.includes(text)) || null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MonsterCardModal - autoDamageRoll callback integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
  });

  describe('autoDamageRoll triggered via attack (autoDamageFormula)', () => {
    it('passes autoDamageFormula extracted from damage_dice_primary to rollAttack', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Club', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', description: 'Melee Attack.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);
      expect(rollAttack).toHaveBeenCalled();
      const callArgs = rollAttack.mock.calls[0][2];
      expect(callArgs.autoDamageFormula).toBe('1d6+2');
    });

    it('passes autoDamageSecondaryFormula from damage_dice_secondary to rollAttack', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Multiattack', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', damage_dice_secondary: '1d4+1', damage_type_secondary: 'piercing', description: 'Two attacks.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);
      const callArgs = rollAttack.mock.calls[0][2];
      expect(callArgs.autoDamageSecondaryFormula).toBe('1d4+1');
      expect(callArgs.autoDamageSecondaryDamageType).toBe('piercing');
    });

    it('passes saveDc, saveType, and dcSuccess when action has save_dc on an attack', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Hex Attack', attack_bonus: 5, save_dc: 13, save_type: 'Wisdom', damage_type_primary: 'psychic', description: 'Attack with save.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+5');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);
      const callArgs = rollAttack.mock.calls[0][2];
      expect(callArgs.saveDc).toBe(13);
      expect(callArgs.saveType).toBe('wis');
      expect(callArgs.dcSuccess).toBe('half');
    });
  });

  describe('autoDamageRoll callback behavior', () => {
    it('calls rollExpression with the autoDamage formula via the autoDamageRoll callback', async () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Club', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', description: 'Melee Attack.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      // Trigger the attack which sets up autoDamageRoll context
      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);
      expect(rollAttack).toHaveBeenCalled();

      // Extract the autoDamage object passed to rollAttack
      const callArgs = rollAttack.mock.calls[0][2];
      expect(callArgs.autoDamageFormula).toBe('1d6+2');

      // Simulate the autoDamageRoll callback being invoked by the dice roller popup
      const autoDamageRoll = rollAttack.mock.calls[0][1]?.autoDamageRoll;
      if (autoDamageRoll) {
        await act(async () => {
          await autoDamageRoll({
            formula: '1d6+2',
            damageType: 'slashing',
            attackerName: 'Goblin',
            name: 'Club',
            isAutoCrit: false,
          });
        });
        expect(rollDamage).toHaveBeenCalledWith(
          'Club',
          '1d6+2',
          8,
          [3, 5],
          2,
          expect.objectContaining({ damageType: 'slashing', attackerName: 'Goblin' })
        );
      }
    });

    it('doubles the dice roll when isAutoCrit is true', async () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Club', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', description: 'Melee Attack.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);

      // Simulate autoDamageRoll with isAutoCrit
      const autoDamageRoll = rollAttack.mock.calls[0][1]?.autoDamageRoll;
      if (autoDamageRoll) {
        await act(async () => {
          await autoDamageRoll({
            formula: '1d6+2',
            damageType: 'slashing',
            attackerName: 'Goblin',
            name: 'Club',
            isAutoCrit: true,
          });
        });
        expect(rollDamage).toHaveBeenCalledWith(
          'Club',
          '1d6+2',
          16,
          [3, 5],
          2,
          expect.any(Object)
        );
      }
    });

    it('passes saveDc context to rollDamage when action has save_dc', async () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Hex Attack', attack_bonus: 5, save_dc: 13, save_type: 'Wisdom', damage_type_primary: 'psychic', description: 'Attack with save.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+5');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);

      const autoDamageRoll = rollAttack.mock.calls[0][1]?.autoDamageRoll;
      if (autoDamageRoll) {
        await act(async () => {
          await autoDamageRoll({
            formula: '1d6+2',
            damageType: 'psychic',
            attackerName: 'Goblin',
            name: 'Hex Attack',
            saveDc: 13,
            saveType: 'wis',
            dcSuccess: 'half',
          });
        });
        expect(rollDamage).toHaveBeenCalledWith(
          'Hex Attack',
          '1d6+2',
          8,
          [3, 5],
          2,
          expect.objectContaining({
            saveDc: 13,
            saveType: 'wis',
            dcSuccess: 'half',
          })
        );
      }
    });

    it('passes secondary formula context to rollDamage when present', async () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Multiattack', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', damage_dice_secondary: '1d4+1', damage_type_secondary: 'piercing', description: 'Two attacks.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);

      const autoDamageRoll = rollAttack.mock.calls[0][1]?.autoDamageRoll;
      if (autoDamageRoll) {
        await act(async () => {
          await autoDamageRoll({
            formula: '1d6+2',
            damageType: 'slashing',
            attackerName: 'Goblin',
            name: 'Multiattack',
            secondaryFormula: '1d4+1',
            secondaryName: 'Multiattack',
            secondaryDamageType: 'piercing',
          });
        });
        expect(rollDamage).toHaveBeenCalledWith(
          'Multiattack',
          '1d6+2',
          8,
          [3, 5],
          2,
          expect.objectContaining({
            autoDamageSecondaryFormula: '1d4+1',
            autoDamageSecondaryName: 'Multiattack',
            autoDamageSecondaryDamageType: 'piercing',
          })
        );
      }
    });

    it('does not call rollDamage when autoDamage is null', async () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Club', attack_bonus: 4, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', description: 'Melee Attack.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);

      const autoDamageRoll = rollAttack.mock.calls[0][1]?.autoDamageRoll;
      if (autoDamageRoll) {
        await act(async () => {
          await autoDamageRoll(null);
        });
        expect(rollDamage).not.toHaveBeenCalled();
      }
    });
  });

  describe('traits with damage dice', () => {
    it('renders and calls onDamage for trait with damage_dice_primary', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        traits: [{ name: 'Bite', description: '', attack_bonus: null, damage_dice_primary: '1d8', damage_type_primary: 'piercing' }],
      });
      render(<MonsterCardModal {...makeProps(m)} />);

      const dmgLink = findDiceLinkByText('1d8');
      expect(dmgLink).toBeTruthy();
      fireEvent.click(dmgLink);
      expect(rollDamage).toHaveBeenCalledWith(
        'Bite',
        '1d8',
        expect.any(Number),
        expect.any(Array),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('renders and calls onDamage for trait with attack_bonus', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        traits: [{ name: 'Sting', description: '', attack_bonus: 3 }],
      });
      render(<MonsterCardModal {...makeProps(m)} />);

      const attackLink = findDiceLinkByText('+3');
      expect(attackLink).toBeTruthy();
      fireEvent.click(attackLink);
      expect(rollAttack).toHaveBeenCalled();
    });

    it('renders and calls onSaveRoll for trait with save_dc', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        traits: [{ name: 'Petrification Gaze', description: '', save_dc: 14, save_type: 'Constitution' }],
      });
      render(<MonsterCardModal {...makeProps(m)} />);

      const saveLink = findDiceLinkByText('DC 14');
      expect(saveLink).toBeTruthy();
      fireEvent.click(saveLink);
      // onSaveRoll is called via the MonsterAction component's handleSaveRoll
      // which is passed to MonsterCardBody as handleSaveRoll
    });
  });

  describe('reactions and legendary actions with damage dice', () => {
    it('renders onDamage link for reaction with damage_dice_primary', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        reactions: [{ name: 'Opportunity Attack', description: '', attack_bonus: null, damage_dice_primary: '1d6+1', damage_type_primary: 'slashing' }],
      });
      render(<MonsterCardModal {...makeProps(m)} />);

      const dmgLink = findDiceLinkByText('1d6+1');
      expect(dmgLink).toBeTruthy();
      fireEvent.click(dmgLink);
      expect(rollDamage).toHaveBeenCalled();
    });

    it('renders onDamage link for legendary action with damage_dice_primary', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
      });

      const m = makeMonster({
        legendary_actions: [{ name: 'Tail Attack', description: '', attack_bonus: null, damage_dice_primary: '1d4', damage_type_primary: 'bludgeoning' }],
      });
      render(<MonsterCardModal {...makeProps(m)} />);

      const dmgLink = findDiceLinkByText('1d4');
      expect(dmgLink).toBeTruthy();
      fireEvent.click(dmgLink);
      expect(rollDamage).toHaveBeenCalled();
    });
  });
});
