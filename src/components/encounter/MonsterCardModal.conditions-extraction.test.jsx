import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MonsterCardModal from './MonsterCardModal.jsx';
import { makeMonster, makeProps } from './MonsterCardModal.test-utils.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [1, 2], modifier: 0 })),
  rollExpressionDoubled: vi.fn(() => ({ total: 10, rolls: [1, 2], modifier: 0 })),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => String(html || '')),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => {
  let _popupHtml = null;
  const _setPopupHtml = vi.fn((val) => { _popupHtml = val; });
  const _rollSavingThrow = vi.fn();
  const _rollDamage = vi.fn();

  const mockHook = vi.fn((_monsterName, _campaignName, _opts) => ({
    get popupHtml() { return _popupHtml; },
    setPopupHtml: _setPopupHtml,
    rollAttack: vi.fn(),
    rollDamage: _rollDamage,
    rollAbilityCheck: vi.fn(),
    rollSavingThrow: _rollSavingThrow,
    rollSkillCheck: vi.fn(),
    rollInitiative: vi.fn(),
    quickRollPlayerSave: vi.fn(),
  }));

  return {
    default: mockHook,
    _rollSavingThrow,
    _rollDamage,
    _setPopupHtml,
  };
});

vi.mock('../../services/combat/conditions/conditionEffects.js', () => {
  const defaultEffects = {
    attackAdvantageCount: 0,
    attackDisadvantageCount: 0,
    abilityCheckDisadvantage: false,
    autoFailSaves: [],
    saveDisadvantage: [],
    cannotAct: false,
    speedZero: false,
    concentrationBroken: false,
    targetAdvantageCount: 0,
    targetDisadvantageCount: 0,
    targetAdvantageIfWithin5ft: false,
    targetDisadvantageIfBeyond5ft: false,
    autoCritWithin5ft: false,
    resistantToAll: false,
    poisonImmune: false,
    saveAdvantage: [],
    saveAdvantageCount: 0,
    saveDisadvantageCount: 0,
    autoReroll: false,
    autoRerollCondition: null,
    autoRerollBonus: null,
    strSaveReplace: false,
    strCheckReplace: false,
    reliableTalent: false,
    tacticalMind: false,
    tacticalMindBonus: null,
  };

  let _computeReturn = null;
  const computeConditionEffects = vi.fn((_conditions) => {
    return _computeReturn ?? { ...defaultEffects };
  });

  return {
    computeConditionEffects,
    combineAttackModes: vi.fn(() => 'normal'),
    CONDITIONS_THAT_CANNOT_ACT: new Set(['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious']),
    __setComputeReturn(val) { _computeReturn = val; },
  };
});

vi.mock('../../services/rules/combat/damageUtils.js', () => {
  const DEFAULT_CREATURE = { name: 'Goblin', conditions: [] };
  let _findCreatureReturn = null;

  return {
    extractDamageTypes: vi.fn(() => []),
    formatDamageTypes: vi.fn((types) => (types || []).join(', ') || ''),
    getTargetFromAttacker: vi.fn(() => null),
    getResistanceNotice: vi.fn(() => null),
    findCreatureByName: vi.fn((_ctx, _name) => {
      return _findCreatureReturn ?? { ...DEFAULT_CREATURE };
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

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  useRuntimeValue: vi.fn((_characterKey, _propertyName, _campaignName) => null),
  getRuntimeValue: vi.fn((_characterKey, _propertyName) => null),
}));

// ── Tests ───────────────────────────────────────────────────────────────────

describe('extractConditionsFromSaveEffect behavior (indirect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders damage dice link when action has save_dc with save_effect containing conditions', () => {
    const m = makeMonster({
      actions: [{
        name: 'Petrification Gaze',
        description: 'Constitution Saving Throw: DC 13. On a failed save, the target is petrified.',
        save_dc: 13,
        save_type: 'Constitution',
        save_effect: 'On a failed save, the target is petrified.',
        damage_dice_primary: '2d8',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('2d8')).toBeInTheDocument();
  });

  it('renders damage dice link when save_effect contains blinded condition', () => {
    const m = makeMonster({
      actions: [{
        name: 'Darkness Breath',
        description: 'Constitution Saving Throw: DC 14. On a failed save, the target is blinded.',
        save_dc: 14,
        save_type: 'Constitution',
        save_effect: 'On a failed save, the target is blinded for 1 minute.',
        damage_dice_primary: '3d6',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('3d6')).toBeInTheDocument();
  });

  it('renders clickable save link when no attack_bonus and no save_dc for save_effect extraction', () => {
    const m = makeMonster({
      actions: [{
        name: 'Web',
        description: 'Dexterity Saving Throw: DC 13. On a failed save, the target is restrained.',
        save_dc: 13,
        save_type: 'Dexterity',
        save_effect: 'On a failed save, the target is restrained.',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    const clickableLinks = document.querySelectorAll('.mc-dice-link-save-clickable');
    expect(clickableLinks.length).toBeGreaterThan(0);
  });

  it('renders save DC without damage dice when save_effect has frightened condition', () => {
    const m = makeMonster({
      actions: [{
        name: 'Frightful Presence',
        description: 'Wisdom Saving Throw: DC 15. On a failed save, the target is frightened.',
        save_dc: 15,
        save_type: 'Wisdom',
        save_effect: 'On a failed save, the target is frightened for 1 minute.',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    const saveLinks = document.querySelectorAll('.mc-dice-link-save');
    expect(saveLinks.length).toBeGreaterThan(0);
  });

  it('handles save_effect with multiple conditions', () => {
    const m = makeMonster({
      actions: [{
        name: 'Charm Effect',
        description: 'Wisdom Saving Throw: DC 12. On a failed save, the target is charmed.',
        save_dc: 12,
        save_type: 'Wisdom',
        save_effect: 'On a failed save, the target is charmed and stunned.',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    const links = document.querySelectorAll('.mc-dice-link-save');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders save DC link when action has save_dc but no attack_bonus', () => {
    const m = makeMonster({
      actions: [{
        name: 'Paralyze',
        description: 'Strength Saving Throw: DC 16. On a failed save, the target is paralyzed.',
        save_dc: 16,
        save_type: 'Strength',
        save_effect: 'On a failed save, the target is paralyzed.',
      }],
    });
    render(<MonsterCardModal {...makeProps(m)} />);
    const clickableLinks = document.querySelectorAll('.mc-dice-link-save-clickable');
    expect(clickableLinks.length).toBeGreaterThan(0);
  });
});
