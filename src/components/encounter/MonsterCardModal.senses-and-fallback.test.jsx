import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  return {
    default: vi.fn(() => ({
      popupHtml: _popupHtml,
      setPopupHtml: _setPopupHtml,
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      rollAbilityCheck: vi.fn(),
      rollSavingThrow: vi.fn(),
      rollSkillCheck: vi.fn(),
      rollInitiative: vi.fn(),
      quickRollPlayerSave: vi.fn(),
    })),
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
    getCombatContext: vi.fn().mockResolvedValue({
      creatures: [
        { name: 'Goblin', conditions: [], targetName: 'Player A' },
        { name: 'Player A', type: 'player' },
      ],
    }),
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

import * as damageUtils from '../../services/rules/combat/damageUtils.js';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MonsterCardModal - getTarget fallback path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    damageUtils.__setFindCreatureReturn(null);
  });

  it('renders correctly when creatures is undefined and fallbackCsRef is used', () => {
    const m = makeMonster();
    render(<MonsterCardModal {...makeProps(m, { creatures: undefined, mapName: null })} />);
    expect(screen.getByText('Goblin')).toBeInTheDocument();
  });

  it('renders correctly when mapName is provided but map loading fails', () => {
    vi.mocked(damageUtils.getCombatContext).mockResolvedValue({
      creatures: [
        { name: 'Goblin', conditions: [], targetName: 'Player A' },
        { name: 'Player A', type: 'player' },
      ],
    });
    const m = makeMonster();
    render(<MonsterCardModal {...makeProps(m, { creatures: undefined, mapName: 'test-map' })} />);
    expect(screen.getByText('Goblin')).toBeInTheDocument();
  });
});

describe('MonsterCardModal - monsterSensesArray useMemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    damageUtils.__setFindCreatureReturn(null);
  });

  it('renders senses section when monster has blindsight', () => {
    const m = makeMonster({ senses: { blindsight: 60, darkvision: null, truesight: null } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('renders senses section when monster has darkvision', () => {
    const m = makeMonster({ senses: { darkvision: '60 ft.' } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('renders senses section when monster has truesight', () => {
    const m = makeMonster({ senses: { truesight: 120 } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('renders senses section when monster has tremorsense', () => {
    const m = makeMonster({ senses: { tremorsense: 60 } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('renders senses section when monster has passive_perception', () => {
    const m = makeMonster({ senses: { passive_perception: 15 } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('renders multiple senses together', () => {
    const m = makeMonster({ senses: { blindsight: 60, darkvision: '120 ft.', tremorsense: 30 } });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('Senses')).toBeInTheDocument();
  });

  it('does not render senses when senses is null', () => {
    const m = makeMonster({ senses: null });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.queryByText('Senses')).not.toBeInTheDocument();
  });

  it('does not render senses when senses is empty object', () => {
    const m = makeMonster({ senses: {} });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.queryByText('Senses')).not.toBeInTheDocument();
  });
});

describe('MonsterCardModal - shieldOfFaithBonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    damageUtils.__setFindCreatureReturn(null);
  });

  it('displays AC without Shield of Faith bonus when no buff present', () => {
    vi.mocked(damageUtils.getCombatContext).mockResolvedValue(null);

    const m = makeMonster({ armor_class: 15 });
    render(<MonsterCardModal {...makeProps(m)} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
