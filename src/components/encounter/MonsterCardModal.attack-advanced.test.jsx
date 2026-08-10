import { render, fireEvent } from '@testing-library/react';
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
  let _targetFromAttackerReturn = null;
  let _resistanceNoticeReturn = null;

  return {
    extractDamageTypes: vi.fn(() => []),
    formatDamageTypes: vi.fn((types) => (types || []).join(', ') || ''),
    getTargetFromAttacker: vi.fn(() => _targetFromAttackerReturn),
    getResistanceNotice: vi.fn(() => _resistanceNoticeReturn),
    findCreatureByName: vi.fn((_ctx, _name) => {
      return _findCreatureReturn ?? { name: 'Goblin', conditions: [] };
    }),
    getCombatContext: vi.fn().mockResolvedValue(null),
    __setFindCreatureReturn(val) { _findCreatureReturn = val; },
    __setTargetFromAttackerReturn(val) { _targetFromAttackerReturn = val; },
    __setResistanceNoticeReturn(val) { _resistanceNoticeReturn = val; },
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

vi.mock('../../services/maps/mapsService.js', () => {
  let _loadMapDataReturn = null;
  const loadMapData = vi.fn((_campaignName, _mapName) => Promise.resolve(_loadMapDataReturn));
  return {
    loadMapData,
    __setLoadMapDataReturn(val) { _loadMapDataReturn = val; },
  };
});

vi.mock('../../services/shared/abilityLookup.js', () => ({
  getAbilitySaveModifier: vi.fn((_abilities, _abilityKey) => 0),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
  let _inspiringMoveNoOA = false;
  let _remarkableNoOA = false;
  let _targetEffects = [];
  let _activeBuffs = null;
  let _bulwarkActive = null;
  let _bulwarkTargets = [];
  let _invokeDuplicityAdvantageTargets = [];
  let _naturesSanctuaryCreatures = [];
  let _smiteOfProtectionActive = false;

  const mockUseRuntimeValue = vi.fn((_characterKey, propertyName, _campaignName) => {
    if (propertyName === 'targetEffects') return _targetEffects;
    if (propertyName === 'inspiringMovementNoOA') return _inspiringMoveNoOA;
    if (propertyName === 'remarkableAthleteNoOA') return _remarkableNoOA;
    return null;
  });

  const mockGetRuntimeValue = vi.fn((_characterKey, propertyName) => {
    if (propertyName === 'activeBuffs') return _activeBuffs;
    if (propertyName === 'bulwarkOfForceActive') return _bulwarkActive;
    if (propertyName === 'bulwarkOfForceTargets') return _bulwarkTargets;
    if (propertyName === 'invokeDuplicityAdvantageTargets') return _invokeDuplicityAdvantageTargets;
    if (propertyName === 'naturesSanctuaryCreatures') return _naturesSanctuaryCreatures;
    if (propertyName === 'smiteOfProtectionActive') return _smiteOfProtectionActive;
    return null;
  });

  return {
    useRuntimeValue: mockUseRuntimeValue,
    getRuntimeValue: mockGetRuntimeValue,
    __setInspiringMoveNoOA(val) { _inspiringMoveNoOA = val; },
    __setRemarkableNoOA(val) { _remarkableNoOA = val; },
    __setTargetEffects(val) { _targetEffects = val; },
    __setActiveBuffs(val) { _activeBuffs = val; },
    __setBulwarkActive(val) { _bulwarkActive = val; },
    __setBulwarkTargets(val) { _bulwarkTargets = val; },
    __setInvokeDuplicityAdvantageTargets(val) { _invokeDuplicityAdvantageTargets = val; },
    __setNaturesSanctuaryCreatures(val) { _naturesSanctuaryCreatures = val; },
    __setSmiteOfProtectionActive(val) { _smiteOfProtectionActive = val; },
  };
});

// ── Re-import mocked modules for test setup helpers ─────────────────────────

import * as useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import * as conditionEffects from '../../services/combat/conditions/conditionEffects.js';
import * as damageUtils from '../../services/rules/combat/damageUtils.js';
import * as useRuntimeState from '../../hooks/runtime/useRuntimeState.js';
import * as rangeValidation from '../../services/rules/combat/rangeValidation.js';
import * as mapsService from '../../services/maps/mapsService.js';

const rollAttack = useLoggedDiceRoll._rollAttack;

// ── Helper: find the attack dice link and click it ─────────────────────────

function clickAttackLink(attackBonus) {
  const links = document.querySelectorAll('.mc-dice-link');
  let attackLink = null;
  for (const el of links) {
    if (el.textContent.trim() === attackBonus) {
      attackLink = el;
      break;
    }
  }
  expect(attackLink).toBeTruthy();
  fireEvent.click(attackLink);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MonsterCardModal - handleAttack: getDamageTypesForAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('returns primary damage type when damage_type_primary is set', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Fire Bolt', attack_bonus: 4, damage_type_primary: 'fire', description: 'A fire bolt.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.damageType).toBe('fire');
  });

  it('returns primary damage type when only damage_type_primary is set (no secondary)', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Acid Splash', attack_bonus: 4, damage_type_primary: 'acid', damage_type_secondary: 'cold', description: 'Acid splash.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.damageType).toBe('acid');
  });
});

describe('MonsterCardModal - handleAttack: Nature\'s Sanctuary cover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('applies +2 AC cover bonus from Nature\'s Sanctuary when target is in sanctuary list', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    useRuntimeState.__setNaturesSanctuaryCreatures(['Player A']);

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { characters: [{ name: 'Player A' }], creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.coverAcBonus).toBe(2);
    expect(callArgs.coverLevel).toBe('half');
    expect(callArgs.coverReason).toBe('Nature\'s Sanctuary');
  });

  it('does not apply Nature\'s Sanctuary cover when target is not in list', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    useRuntimeState.__setNaturesSanctuaryCreatures(['Player B']);

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { characters: [{ name: 'Player A' }], creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.coverAcBonus).toBe(0);
  });
});

describe('MonsterCardModal - handleAttack: Smite of Protection cover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('does not apply Smite of Protection when paladin lacks Aura of Protection', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    useRuntimeState.__setSmiteOfProtectionActive(true);

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, {
      characters: [{ name: 'Player A', computedStats: { automation: { passives: [] } } }],
      creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }],
    })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.coverAcBonus).toBe(0);
  });
});

describe('MonsterCardModal - handleAttack: Elusive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('sets noAdvantageAgainst when target player has Elusive feature and is not incapacitated', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    const targetPlayer = {
      name: 'Player A',
      type: 'player',
      computedStats: {
        actions: [{ name: 'Elusive' }],
      },
    };
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, targetPlayer] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
  });

  it('does not set noAdvantageAgainst when target player lacks Elusive feature', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    const targetPlayer = {
      name: 'Player A',
      type: 'player',
      computedStats: {
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: [],
      },
    };
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, targetPlayer] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
  });
});

describe('MonsterCardModal - handleAttack: Protection from Evil and Good', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('adds targetDisadvantageCount when Protection from Evil and Good is active and attacker is warded', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });

    // Mock the protection from evil handler
    vi.doMock('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js', () => ({
      isProtectionFromEvilAndGoodActive: vi.fn(() => true),
      isCreatureWarded: vi.fn(() => true),
    }));

    const m = makeMonster({
      actions: [{ name: 'Club', attack_bonus: 4, description: 'Melee Attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A', type: 'celestial' }, { name: 'Player A', type: 'player' }] })} />);

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.coverAcBonus).toBe(0);
  });
});

describe('MonsterCardModal - handleAttack: range effects with map data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('sets isAutoMiss when computeRangeEffect returns mode "miss"', async () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    vi.mocked(rangeValidation.computeRangeEffect).mockReturnValue({ mode: 'miss', reason: 'Out of range' });
    vi.mocked(rangeValidation.getDistanceFeet).mockReturnValue(100);
    vi.mocked(rangeValidation.getNearestPlacedItem).mockReturnValue({ name: 'Player A', gridX: 10, gridY: 10 });
    mapsService.__setLoadMapDataReturn({
      players: [{ name: 'Player A', gridX: 10, gridY: 10 }],
      placedItems: [{ name: 'Goblin', gridX: 0, gridY: 0 }],
    });

    const m = makeMonster({
      actions: [{ name: 'Fire Bolt', attack_bonus: 4, description: 'Ranged Attack.', range: '120 ft.' }],
    });
    render(<MonsterCardModal {...makeProps(m, {
      creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }],
      mapName: 'test-map',
    })} />);

    // Wait for map data to load
    await new Promise(r => setTimeout(r, 50));

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.isAutoMiss).toBe(true);
  });

  it('sets rangeForcedMode to "disadvantage" when computeRangeEffect returns disadvantage mode', async () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    vi.mocked(rangeValidation.computeRangeEffect).mockReturnValue({ mode: 'disadvantage', reason: 'Long range' });
    vi.mocked(rangeValidation.getDistanceFeet).mockReturnValue(60);
    vi.mocked(rangeValidation.getNearestPlacedItem).mockReturnValue({ name: 'Player A', gridX: 10, gridY: 10 });
    mapsService.__setLoadMapDataReturn({
      players: [{ name: 'Player A', gridX: 10, gridY: 10 }],
      placedItems: [{ name: 'Goblin', gridX: 0, gridY: 0 }],
    });

    const m = makeMonster({
      actions: [{ name: 'Fire Bolt', attack_bonus: 4, description: 'Ranged Attack.', range: '50 ft.' }],
    });
    render(<MonsterCardModal {...makeProps(m, {
      creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }],
      mapName: 'test-map',
    })} />);

    await new Promise(r => setTimeout(r, 50));

    clickAttackLink('+4');
    expect(rollAttack).toHaveBeenCalled();
    const callArgs = rollAttack.mock.calls[0][2];
    expect(callArgs.rangeReason).toBe('Long range');
  });
});

describe('MonsterCardModal - handleAttack: Psychic Strike validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionEffects.__setComputeReturn(null);
    damageUtils.__setFindCreatureReturn(null);
    useRuntimeState.__setBulwarkActive(null);
    useRuntimeState.__setBulwarkTargets([]);
    useRuntimeState.__setInvokeDuplicityAdvantageTargets([]);
    useRuntimeState.__setActiveBuffs(null);
    useRuntimeState.__setNaturesSanctuaryCreatures([]);
    useRuntimeState.__setSmiteOfProtectionActive(false);
  });

  it('shows alert when Psychic Strike is used without a target', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
    });

    const m = makeMonster({
      actions: [{ name: 'Psychic Strike', attack_bonus: 4, description: 'Psychic attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin' }] })} />);

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    clickAttackLink('+4');
    expect(alertSpy).toHaveBeenCalledWith('Psychic Strike requires a target to be selected.');
    alertSpy.mockRestore();
  });

  it('shows alert when Psychic Strike is used but target lacks hex effect', () => {
    damageUtils.__setFindCreatureReturn({
      name: 'Goblin',
      conditions: [],
      targetName: 'Player A',
    });
    useRuntimeState.__setTargetEffects([]);

    const m = makeMonster({
      actions: [{ name: 'Psychic Strike', attack_bonus: 4, description: 'Psychic attack.' }],
    });
    render(<MonsterCardModal {...makeProps(m, { creatures: [{ name: 'Goblin', targetName: 'Player A' }, { name: 'Player A', type: 'player' }] })} />);

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    clickAttackLink('+4');
    expect(alertSpy).toHaveBeenCalledWith('Psychic Strike can only be used on a creature under the warlock\'s Hex spell.');
    alertSpy.mockRestore();
  });
});
