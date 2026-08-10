import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonsterCardModal from './MonsterCardModal.jsx';
import { makeMonster, makeProps, defaultConditionEffects } from './MonsterCardModal.test-utils.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

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
import * as useRuntimeState from '../../hooks/runtime/useRuntimeState.js';

const rollDamage = useLoggedDiceRoll._rollDamage;
const rollAbilityCheck = useLoggedDiceRoll._rollAbilityCheck;
const rollSkillCheck = useLoggedDiceRoll._rollSkillCheck;
const rollInitiative = useLoggedDiceRoll._rollInitiative;

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MonsterCardModal - handleDamage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
  });

  it('calls rollDamage with correct formula and damage type when clicking damage dice', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: null, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', description: 'Melee Attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    const links = document.querySelectorAll('.mc-dice-link');
    let dmgLink = null;
    for (const el of links) {
      if (el.textContent.includes('1d6+2')) {
        dmgLink = el;
        break;
      }
    }
    expect(dmgLink).toBeTruthy();
    fireEvent.click(dmgLink);
    expect(rollDamage).toHaveBeenCalled();
  });

  it('calls rollDamage with secondary damage dice when clicking secondary damage link', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Multiattack', attack_bonus: null, damage_dice_primary: '1d6+2', damage_type_primary: 'slashing', damage_dice_secondary: '1d4+1', description: 'Two attacks.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    const links = document.querySelectorAll('.mc-dice-link');
    let secondaryLink = null;
    for (const el of links) {
      if (el.textContent.includes('1d4+1')) {
        secondaryLink = el;
        break;
      }
    }
    expect(secondaryLink).toBeTruthy();
    fireEvent.click(secondaryLink);
    expect(rollDamage).toHaveBeenCalled();
  });

  it('does not call rollDamage when action has save_dc (save rolls use rollSavingThrow instead)', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Fireball', attack_bonus: null, damage_dice_primary: '8d6', damage_type_primary: 'fire', save_dc: 15, save_type: 'Dexterity', description: 'Dexterity Saving Throw: DC 15' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    // When action has save_dc, the damage dice link triggers rollSavingThrow, not rollDamage
    const links = document.querySelectorAll('.mc-dice-link');
    let dmgLink = null;
    for (const el of links) {
      if (el.textContent.includes('8d6')) {
        dmgLink = el;
        break;
      }
    }
    expect(dmgLink).toBeTruthy();
  });
});

describe('MonsterCardModal - handleAbilityCheck with ray of enfeeblement debuff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setTargetEffects([]);
  });

  it('passes forcedMode disadvantage when monster has ray_of_enfeeble_debuff and ability is STR', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
    });
    useRuntimeState.__setTargetEffects([
      { target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }
    ]);

    const m = makeMonster({
      ability_scores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 10 },
      ability_score_modifiers: { str: -1, dex: 2, con: 0, int: 0, wis: -1, cha: 0 },
    });
    render(<MonsterCardModal {...makeProps(m)} />);

    const mods = document.querySelectorAll('.mc-ability-mod');
    expect(mods.length).toBe(6);
    // STR is the first ability
    fireEvent.click(mods[0]);
    expect(rollAbilityCheck).toHaveBeenCalledWith('Strength', -1, { forcedMode: 'disadvantage' });
  });

  it('does not pass forcedMode when ability is not STR even with ray debuff', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
    });
    useRuntimeState.__setTargetEffects([
      { target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }
    ]);

    const m = makeMonster({
      ability_scores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 10 },
      ability_score_modifiers: { str: -1, dex: 2, con: 0, int: 0, wis: -1, cha: 0 },
    });
    render(<MonsterCardModal {...makeProps(m)} />);

    const mods = document.querySelectorAll('.mc-ability-mod');
    // DEX is the second ability
    fireEvent.click(mods[1]);
    expect(rollAbilityCheck).toHaveBeenCalledWith('Dexterity', 2, undefined);
  });
});

describe('MonsterCardModal - handleSkillCheck with ray of enfeeblement debuff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
  });

  it('passes forcedMode disadvantage when monster has ray_of_enfeeble_debuff and skill key matches', () => {
    useRuntimeState.__setTargetEffects([
      { target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }
    ]);
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
    });

    const m = makeMonster({
      skills: { athletics: { modifier: 1 }, stealth: { modifier: 3 } },
    });
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
    // athletics key is lowercase, code checks 'Athletics' so forcedMode is undefined
    fireEvent.click(links[0]);
    expect(rollSkillCheck).toHaveBeenCalledWith('athletics', 1, undefined);
  });

  it('does not pass forcedMode when skill is not Athletics even with ray debuff', () => {
    useRuntimeState.__setTargetEffects([
      { target: 'Goblin', effect: 'ray_of_enfeeble_debuff' }
    ]);
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
    });

    const m = makeMonster({
      skills: { athletics: { modifier: 1 }, stealth: { modifier: 3 } },
    });
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
    // Stealth is second
    fireEvent.click(links[1]);
    expect(rollSkillCheck).toHaveBeenCalledWith('stealth', 3, undefined);
  });
});

describe('MonsterCardModal - handleInitiative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
  });

  it('calls rollInitiative with positive bonus', () => {
    const m = makeMonster({ initiative_details: '+5' });
    render(<MonsterCardModal {...makeProps(m)} />);
    const initLink = screen.getByText('+5');
    fireEvent.click(initLink);
    expect(rollInitiative).toHaveBeenCalledWith(5);
  });

  it('calls rollInitiative with negative bonus', () => {
    const m = makeMonster({ initiative_details: '-2' });
    render(<MonsterCardModal {...makeProps(m)} />);
    const initLink = screen.getByText('-2');
    fireEvent.click(initLink);
    expect(rollInitiative).toHaveBeenCalledWith(-2);
  });

  it('renders initiative text when no parseable bonus (not as dice link)', () => {
    const m = makeMonster({ initiative_details: 'advantage' });
    render(<MonsterCardModal {...makeProps(m)} />);
    // The text "advantage" is rendered but NOT as a clickable dice link
    const initSection = screen.getByText('Initiative').closest('.mc-stat');
    expect(initSection).toBeTruthy();
    // Verify it's NOT a dice link (no click handler)
    const initValue = initSection.querySelector('.mc-stat-value');
    expect(initValue.textContent).toBe('advantage');
    expect(initValue.querySelector('.mc-dice-link')).toBeFalsy();
  });
});
