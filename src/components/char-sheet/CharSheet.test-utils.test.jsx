// @improved-by-ai
import { describe, it, expect, vi } from 'vitest';

import {
  createMockStore,
  mockPlayerSummary,
  createDefaultProps,
  createMockPlayerStats,
  createSharedPopupReturnValue,
  setPopup,
  resetTestState,
} from './CharSheet.test-utils.jsx';

// ---------------------------------------------------------------------------
// Tests — createMockStore
// ---------------------------------------------------------------------------

describe('createMockStore', () => {
  it('returns a fresh empty Map on each call', () => {
    const store1 = createMockStore();
    const store2 = createMockStore();
    expect(store1).toBeInstanceOf(Map);
    expect(store2).toBeInstanceOf(Map);
    expect(store1).not.toBe(store2);
    expect(store1.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — mockPlayerSummary
// ---------------------------------------------------------------------------

describe('mockPlayerSummary', () => {
  it('exposes the expected default character metadata', () => {
    expect(mockPlayerSummary).toEqual({
      name: 'Test Character',
      rules: '5e',
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — createDefaultProps
// ---------------------------------------------------------------------------

describe('createDefaultProps', () => {
  const defaultKeys = [
    'allAbilityScores',
    'allClasses',
    'allClasses2024',
    'allEquipment',
    'allMagicItems',
    'allRaces',
    'allSpells',
    'allSpells2024',
    'playerSummary',
    'allRaces2024',
    'allMagicItems2024',
    'campaignName',
    'activeMapName',
    'characters',
    'onDeleteCharacter',
    'onEditCharacter',
    'onUploadClick',
    'onSaveClick',
  ];

  it('returns an object with all expected default keys', () => {
    const props = createDefaultProps();
    defaultKeys.forEach((key) => {
      expect(props).toHaveProperty(key);
    });
  });

  it('provides empty arrays for collection defaults and vi.fn() for callbacks', () => {
    const props = createDefaultProps();
    expect(Array.isArray(props.allAbilityScores)).toBe(true);
    expect(Array.isArray(props.characters)).toBe(true);
    expect(typeof props.onDeleteCharacter).toBe('function');
    expect(typeof props.onSaveClick).toBe('function');
  });

  it('applies override properties to the returned object', () => {
    const customFn = vi.fn();
    const props = createDefaultProps({
      campaignName: 'my-campaign',
      level: 10,
      onDeleteCharacter: customFn,
    });
    expect(props.campaignName).toBe('my-campaign');
    expect(props.level).toBe(10);
    expect(props.onDeleteCharacter).toBe(customFn);
  });

  it('uses default vi.fn() callbacks when no overrides are provided', () => {
    const props = createDefaultProps();
    expect(props.onDeleteCharacter).not.toHaveBeenCalled();
    expect(props.onEditCharacter).not.toHaveBeenCalled();
    expect(props.onUploadClick).not.toHaveBeenCalled();
    expect(props.onSaveClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — createMockPlayerStats
// ---------------------------------------------------------------------------

describe('createMockPlayerStats', () => {
  it('returns an object with the expected default structure', () => {
    const stats = createMockPlayerStats();
    expect(stats.name).toBe('Test Character');
    expect(stats.level).toBe(5);
    expect(stats.hitPoints).toEqual({ current: 40, max: 40 });
    expect(stats.abilities[0]).toEqual({
      name: 'Strength',
      bonus: 2,
      save: 4,
      skills: [],
    });
    expect(stats.spellAbilities).toEqual({
      spells: [],
      maxPreparedSpells: 5,
    });
    expect(stats.rules).toBe('5e');
    expect(stats.class).toEqual({ name: 'Fighter' });
    expect(stats.speed).toBe(30);
    expect(stats.race).toEqual({ speed: 30, traits: [] });
    expect(stats.automation.passives).toEqual([]);
    expect(Array.isArray(stats.actions)).toBe(true);
    expect(Array.isArray(stats.bonusActions)).toBe(true);
    expect(Array.isArray(stats.reactions)).toBe(true);
    expect(Array.isArray(stats.specialActions)).toBe(true);
  });

  it('applies override properties to the returned object', () => {
    const customFn = vi.fn();
    const stats = createMockPlayerStats({
      name: 'Custom Character',
      level: 10,
      rules: '2024',
      speed: 40,
      onTest: customFn,
    });
    expect(stats.name).toBe('Custom Character');
    expect(stats.level).toBe(10);
    expect(stats.rules).toBe('2024');
    expect(stats.speed).toBe(40);
    expect(stats.onTest).toBe(customFn);
  });

  it('overrides nested objects via spread', () => {
    const stats = createMockPlayerStats({
      hitPoints: { current: 100, max: 100 },
    });
    expect(stats.hitPoints.current).toBe(100);
    expect(stats.hitPoints.max).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Tests — createSharedPopupReturnValue
// ---------------------------------------------------------------------------

describe('createSharedPopupReturnValue', () => {
  it('returns an object with popupHtml, setPopupHtml, value, and Provider', () => {
    const returnValue = createSharedPopupReturnValue();
    expect(returnValue).toHaveProperty('popupHtml', null);
    expect(returnValue).toHaveProperty('setPopupHtml');
    expect(returnValue).toHaveProperty('value');
    expect(returnValue).toHaveProperty('Provider');
  });

  it('provides a fresh setPopupHtml mock on each call', () => {
    const returnValue1 = createSharedPopupReturnValue();
    const returnValue2 = createSharedPopupReturnValue();
    expect(returnValue1.setPopupHtml).not.toBe(returnValue2.setPopupHtml);
  });

  it('Provider renders children unchanged', () => {
    const returnValue = createSharedPopupReturnValue();
    const result = returnValue.Provider({ children: 'test-children' });
    expect(result).toBe('test-children');
  });

  it('returns fresh objects on each call', () => {
    const returnValue1 = createSharedPopupReturnValue();
    const returnValue2 = createSharedPopupReturnValue();
    expect(returnValue1).not.toBe(returnValue2);
    expect(returnValue1.value).not.toBe(returnValue2.value);
  });
});

// ---------------------------------------------------------------------------
// Tests — setPopup
// ---------------------------------------------------------------------------

describe('setPopup', () => {
  it('sets popupHtml to the provided value', () => {
    const returnValue = createSharedPopupReturnValue();
    const testHtml = { type: 'wild_shape_select', name: 'Test' };
    setPopup(returnValue, testHtml);
    expect(returnValue.popupHtml).toBe(testHtml);
  });

  it('overwrites the previous popupHtml value', () => {
    const returnValue = createSharedPopupReturnValue();
    setPopup(returnValue, { type: 'first' });
    setPopup(returnValue, { type: 'second' });
    expect(returnValue.popupHtml).toEqual({ type: 'second' });
  });

  it('accepts null to clear the popup', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.popupHtml = { type: 'something' };
    setPopup(returnValue, null);
    expect(returnValue.popupHtml).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — resetTestState
// ---------------------------------------------------------------------------

describe('resetTestState', () => {
  it('clears all mock call history via vi.clearAllMocks', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.setPopupHtml('called');
    expect(returnValue.setPopupHtml).toHaveBeenCalledTimes(1);
    resetTestState(returnValue);
    expect(returnValue.setPopupHtml).toHaveBeenCalledTimes(0);
  });

  it('resets popupHtml to null', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.popupHtml = { type: 'old' };
    resetTestState(returnValue);
    expect(returnValue.popupHtml).toBeNull();
  });

  it('replaces setPopupHtml with a fresh mock', () => {
    const returnValue = createSharedPopupReturnValue();
    const oldFn = returnValue.setPopupHtml;
    resetTestState(returnValue);
    expect(returnValue.setPopupHtml).not.toBe(oldFn);
    expect(typeof returnValue.setPopupHtml).toBe('function');
  });

  it('resets value to an empty object', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.value = { old: 'data' };
    resetTestState(returnValue);
    expect(returnValue.value).toEqual({});
  });

  it('leaves Provider unchanged', () => {
    const returnValue = createSharedPopupReturnValue();
    const oldProvider = returnValue.Provider;
    resetTestState(returnValue);
    expect(returnValue.Provider).toBe(oldProvider);
  });
});
