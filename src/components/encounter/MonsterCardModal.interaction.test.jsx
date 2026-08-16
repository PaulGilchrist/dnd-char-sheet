// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonsterCardModal from './MonsterCardModal.jsx';
import { makeMonster, makeProps, defaultConditionEffects } from './MonsterCardModal.test-utils.js';

// ── Mocks ----
vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn((formula) => ({ total: parseInt(formula.split('d')[0]) * 5, rolls: [1, 2], modifier: 0 })),
  rollExpressionDoubled: vi.fn((formula) => ({ total: parseInt(formula.split('d')[0]) * 10, rolls: [1, 2], modifier: 0 })),
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

  const mockHook = vi.fn(() => ({
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
  const _findCreatureByName = vi.fn((_ctx, _name) => {
    return _findCreatureReturn ?? { name: 'Goblin', conditions: [] };
  });

  return {
    extractDamageTypes: vi.fn(() => []),
    formatDamageTypes: vi.fn((types) => (types || []).join(', ') || ''),
    getTargetFromAttacker: vi.fn(() => null),
    getResistanceNotice: vi.fn(() => null),
    findCreatureByName: _findCreatureByName,
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

vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
  let _targetEffects = [];
  let _tempHp = null;

  const mockUseRuntimeValue = vi.fn((_characterKey, propertyName, _campaignName) => {
    if (propertyName === 'targetEffects') return _targetEffects;
    if (propertyName === 'tempHp') return _tempHp;
    return null;
  });

  const mockGetRuntimeValue = vi.fn((_characterKey, propertyName) => {
    if (propertyName === 'tempHp') return _tempHp;
    return null;
  });

  return {
    useRuntimeValue: mockUseRuntimeValue,
    getRuntimeValue: mockGetRuntimeValue,
    __setTargetEffects(val) { _targetEffects = val; },
    __setTempHp(val) { _tempHp = val; },
  };
});

// ── Re-import mocked modules ----
import * as useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import * as conditionEffects from '../../services/combat/conditions/conditionEffects.js';
import * as damageUtils from '../../services/rules/combat/damageUtils.js';
import * as useRuntimeState from '../../hooks/runtime/useRuntimeState.js';

const rollAbilityCheck = useLoggedDiceRoll._rollAbilityCheck;
const rollSavingThrow = useLoggedDiceRoll._rollSavingThrow;
const rollSkillCheck = useLoggedDiceRoll._rollSkillCheck;
const rollInitiative = useLoggedDiceRoll._rollInitiative;

// ── Helpers ----

/**
 * Find a dice link element by exact visible text content.
 */
function findDiceLinkByText(text) {
  const links = document.querySelectorAll('.mc-dice-link');
  return Array.from(links).find((el) => el.textContent.trim() === text) || null;
}

// ── Tests ----

describe('MonsterCardModal interaction / game rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setTargetEffects([]);
  });

  // ════════════════════════════════════════════
  // Ability modifier dice link → rollAbilityCheck
  // ════════════════════════════════════════════

  describe('ability modifier dice links', () => {
    it('clicking ability modifier calls rollAbilityCheck with correct ability and modifier', () => {
      render(<MonsterCardModal {...makeProps(makeMonster())} />);
      const mods = document.querySelectorAll('.mc-ability-mod');
      expect(mods.length).toBe(6);
      // STR has modifier -1 — context is undefined when no ray debuff on monster
      fireEvent.click(mods[0]);
      expect(rollAbilityCheck).toHaveBeenCalledWith('Strength', -1, undefined);
    });

    it('clicking ability modifier passes forcedMode disadvantage when ray_of_enfeeble_debuff targets the monster and ability is STR', () => {
      useRuntimeState.__setTargetEffects([{ target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }]);
      render(<MonsterCardModal {...makeProps(makeMonster())} />);
      const mods = document.querySelectorAll('.mc-ability-mod');
      fireEvent.click(mods[0]);
      expect(rollAbilityCheck).toHaveBeenCalledWith('Strength', -1, { forcedMode: 'disadvantage' });
    });

    it('clicking a non-STR ability does not pass forcedMode even with ray debuff', () => {
      useRuntimeState.__setTargetEffects([{ target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }]);
      render(<MonsterCardModal {...makeProps(makeMonster())} />);
      const mods = document.querySelectorAll('.mc-ability-mod');
      // DEX is index 1
      fireEvent.click(mods[1]);
      expect(rollAbilityCheck).toHaveBeenCalledWith('Dexterity', 2, undefined);
    });
  });

  // ════════════════════════════════════════════
  // Save modifier dice link → rollSavingThrow
  // ════════════════════════════════════════════

  describe('save modifier dice links', () => {
    it('clicking save modifier dice link calls rollSavingThrow with ability abbreviation and modifier', () => {
      const m = makeMonster({
        saving_throws: { str: { modifier: 2 }, dex: { modifier: 1 } },
      });
      render(<MonsterCardModal {...makeProps(m)} />);
      // Save modifier links use className "mc-dice-link" inside save rows
      const saveLinks = document.querySelectorAll('.mc-dice-link');
      // Find the STR save link (contains "STR" or the abbreviation)
      const strSaveLink = Array.from(saveLinks).find((el) => el.textContent.includes('STR'));
      expect(strSaveLink).toBeTruthy();
      fireEvent.click(strSaveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('STR', 2);
    });

    it('clicking save modifier with negative value passes the negative modifier', () => {
      const m = makeMonster({
        saving_throws: { con: { modifier: -3 } },
      });
      render(<MonsterCardModal {...makeProps(m)} />);
      const conSaveLink = Array.from(document.querySelectorAll('.mc-dice-link')).find((el) => el.textContent.includes('CON'));
      expect(conSaveLink).toBeTruthy();
      fireEvent.click(conSaveLink);
      expect(rollSavingThrow).toHaveBeenCalledWith('CON', -3);
    });
  });

  // ════════════════════════════════════════════
  // Skill dice link → rollSkillCheck
  // ════════════════════════════════════════════

  describe('skill dice links', () => {
    it('clicking skill dice link calls rollSkillCheck with skill name and modifier', () => {
      const m = makeMonster({ skills: { stealth: { modifier: 3 }, athletics: { modifier: 1 } } });
      render(<MonsterCardModal {...makeProps(m, { creatureName: 'Goblin' })} />);

      const rows = document.querySelectorAll('.mc-defense-row');
      let skillRow = null;
      for (const row of rows) {
        if (row.querySelector('.mc-defense-label')?.textContent === 'Skills') {
          skillRow = row;
          break;
        }
      }
      expect(skillRow).toBeTruthy();
      const links = skillRow.querySelectorAll('.mc-dice-link');
      expect(links.length).toBeGreaterThan(0);
      fireEvent.click(links[0]);
      expect(rollSkillCheck).toHaveBeenCalled();
    });

    it('clicking skill dice link does not pass forcedMode because skill key is lowercase', () => {
      useRuntimeState.__setTargetEffects([{ target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }]);
      const m = makeMonster({ skills: { athletics: { modifier: 1 } } });
      render(<MonsterCardModal {...makeProps(m, { creatureName: 'Goblin' })} />);

      const rows = document.querySelectorAll('.mc-defense-row');
      let skillRow = null;
      for (const row of rows) {
        if (row.querySelector('.mc-defense-label')?.textContent === 'Skills') {
          skillRow = row;
          break;
        }
      }
      const links = skillRow.querySelectorAll('.mc-dice-link');
      fireEvent.click(links[0]);
      // The code checks name === 'Athletics' but the key is 'athletics' (lowercase),
      // so forcedMode is undefined
      expect(rollSkillCheck).toHaveBeenCalledWith('athletics', 1, undefined);
    });
  });

  // ════════════════════════════════════════════
  // Initiative dice link → rollInitiative
  // ════════════════════════════════════════════

  describe('initiative dice links', () => {
    it('clicking initiative dice link calls rollInitiative with parsed positive bonus', () => {
      const m = makeMonster({ initiative_details: '+5' });
      render(<MonsterCardModal {...makeProps(m)} />);
      expect(screen.getByText('+5')).toBeInTheDocument();
      const initLink = screen.getByText('+5');
      expect(initLink.closest('.mc-dice-link')).toBeTruthy();
      fireEvent.click(initLink);
      expect(rollInitiative).toHaveBeenCalledWith(5);
    });

    it('clicking initiative dice link calls rollInitiative with negative bonus', () => {
      const m = makeMonster({ initiative_details: '-2' });
      render(<MonsterCardModal {...makeProps(m)} />);
      const initLink = screen.getByText('-2');
      fireEvent.click(initLink);
      expect(rollInitiative).toHaveBeenCalledWith(-2);
    });

    it('renders initiative text without a clickable dice link when bonus is not parseable', () => {
      const m = makeMonster({ initiative_details: 'advantage' });
      render(<MonsterCardModal {...makeProps(m)} />);
      const initSection = screen.getByText('Initiative').closest('.mc-stat');
      expect(initSection).toBeTruthy();
      const initValue = initSection.querySelector('.mc-stat-value');
      expect(initValue.textContent).toBe('advantage');
      expect(initValue.querySelector('.mc-dice-link')).toBeFalsy();
    });
  });

  // ════════════════════════════════════════════
  // Attacker cannot act — attack blocking
  // ════════════════════════════════════════════

  describe('attacker cannot act', () => {
    it('does not render attack links when the attacker has an incapacitating condition', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [{ key: 'incapacitated' }],
        targetName: 'Player A',
      });

      const m = makeMonster({
        actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.', reach: '5 ft.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      // When attacker cannot act, the attack dice link is not rendered
      const attackLink = findDiceLinkByText('+4');
      expect(attackLink).toBeFalsy();
      // The incapacitated label should be visible
      expect(screen.getByText('(Incapacitated)')).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════
  // Psychic Strike validation
  // ════════════════════════════════════════════

  describe('Psychic Strike validation', () => {
    it('alerts when Psychic Strike is used without a target', () => {
      const m = makeMonster({
        actions: [{ name: 'Psychic Strike', attack_bonus: 5, description: 'Melee Attack.', reach: '5 ft.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin' }] })} />);

      const attackLink = findDiceLinkByText('+5');
      expect(attackLink).toBeTruthy();

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      fireEvent.click(attackLink);
      expect(alertSpy).toHaveBeenCalledWith('Psychic Strike requires a target to be selected.');
      alertSpy.mockRestore();
    });

    it('alerts when Psychic Strike is used on a target without hex', () => {
      damageUtils.__setFindCreatureReturn({
        name: 'Goblin',
        conditions: [],
        targetName: 'Player A',
      });
      const m = makeMonster({
        actions: [{ name: 'Psychic Strike', attack_bonus: 5, description: 'Melee Attack.', reach: '5 ft.' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      const attackLink = findDiceLinkByText('+5');
      expect(attackLink).toBeTruthy();

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      fireEvent.click(attackLink);
      expect(alertSpy).toHaveBeenCalledWith('Psychic Strike can only be used on a creature under the warlock\'s Hex spell.');
      alertSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════
  // Evasion modal flow
  // ════════════════════════════════════════════

  describe('evasion modal integration', () => {
    it('renders a save DC dice link that calls handleSaveRoll when clicked', () => {
      const m = makeMonster({
        actions: [{ name: 'Fireball', save_dc: 15, save_type: 'Dexterity', damage_dice_primary: '8d6', damage_type_primary: 'fire' }],
      });
      render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

      // When action has damage_dice_primary, the save link uses mc-dice-link class
      const saveLinks = document.querySelectorAll('.mc-dice-link');
      const fireballSave = Array.from(saveLinks).find((el) => el.textContent.includes('8d6'));
      expect(fireballSave).toBeTruthy();
      fireEvent.click(fireballSave);

      // handleSaveRoll is called which internally calls rollSavingThrow
      expect(rollSavingThrow).toHaveBeenCalled();
    });
  });
});
