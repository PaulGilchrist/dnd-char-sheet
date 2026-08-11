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
  it('returns a new Map instance', () => {
    const store = createMockStore();
    expect(store).toBeInstanceOf(Map);
  });

  it('returns different Map instances on each call', () => {
    const store1 = createMockStore();
    const store2 = createMockStore();
    expect(store1).not.toBe(store2);
  });

  it('returns an empty Map with no entries', () => {
    const store = createMockStore();
    expect(store.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — mockPlayerSummary
// ---------------------------------------------------------------------------

describe('mockPlayerSummary', () => {
  it('has a name property set to "Test Character"', () => {
    expect(mockPlayerSummary.name).toBe('Test Character');
  });

  it('has a rules property set to "5e"', () => {
    expect(mockPlayerSummary.rules).toBe('5e');
  });
});

// ---------------------------------------------------------------------------
// Tests — createDefaultProps
// ---------------------------------------------------------------------------

describe('createDefaultProps', () => {
  it('returns an object with all expected default properties', () => {
    const props = createDefaultProps();
    expect(props).toHaveProperty('allAbilityScores', []);
    expect(props).toHaveProperty('allClasses', []);
    expect(props).toHaveProperty('allClasses2024', []);
    expect(props).toHaveProperty('allEquipment', []);
    expect(props).toHaveProperty('allMagicItems', []);
    expect(props).toHaveProperty('allRaces', []);
    expect(props).toHaveProperty('allSpells', []);
    expect(props).toHaveProperty('allSpells2024', []);
    expect(props).toHaveProperty('playerSummary', mockPlayerSummary);
    expect(props).toHaveProperty('allRaces2024', []);
    expect(props).toHaveProperty('allMagicItems2024', []);
    expect(props).toHaveProperty('campaignName', 'test-campaign');
    expect(props).toHaveProperty('activeMapName', null);
    expect(props).toHaveProperty('characters', []);
    expect(props).toHaveProperty('onDeleteCharacter');
    expect(props).toHaveProperty('onEditCharacter');
    expect(props).toHaveProperty('onUploadClick');
    expect(props).toHaveProperty('onSaveClick');
  });

  it('merges override properties into defaults', () => {
    const props = createDefaultProps({ campaignName: 'my-campaign', level: 10 });
    expect(props.campaignName).toBe('my-campaign');
    expect(props.level).toBe(10);
  });

  it('overrides default vi.fn() callbacks with provided ones', () => {
    const customFn = vi.fn();
    const props = createDefaultProps({ onDeleteCharacter: customFn });
    expect(props.onDeleteCharacter).toBe(customFn);
  });

  it('returns vi.fn() for callbacks when no overrides given', () => {
    const props = createDefaultProps();
    expect(typeof props.onDeleteCharacter).toBe('function');
    expect(typeof props.onEditCharacter).toBe('function');
    expect(typeof props.onUploadClick).toBe('function');
    expect(typeof props.onSaveClick).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Tests — createMockPlayerStats
// ---------------------------------------------------------------------------

describe('createMockPlayerStats', () => {
  it('returns an object with all expected default properties', () => {
    const stats = createMockPlayerStats();
    expect(stats).toHaveProperty('name', 'Test Character');
    expect(stats).toHaveProperty('level', 5);
    expect(stats.hitPoints.current).toBe(40);
    expect(stats.hitPoints.max).toBe(40);
    expect(stats).toHaveProperty('abilities');
    expect(stats).toHaveProperty('spellAbilities');
    expect(stats).toHaveProperty('rules', '5e');
    expect(stats).toHaveProperty('automation');
    expect(stats.automation.passives).toEqual([]);
    expect(stats).toHaveProperty('class', { name: 'Fighter' });
    expect(stats).toHaveProperty('speed', 30);
    expect(stats).toHaveProperty('race', { speed: 30, traits: [] });
    expect(stats).toHaveProperty('actions', []);
    expect(stats).toHaveProperty('bonusActions', []);
    expect(stats).toHaveProperty('reactions', []);
    expect(stats).toHaveProperty('specialActions', []);
    expect(stats).toHaveProperty('characterAdvancement', []);
    expect(stats).toHaveProperty('skillProficiencies', []);
    expect(stats).toHaveProperty('saveModifiers', []);
  });

  it('has abilities with correct default structure', () => {
    const stats = createMockPlayerStats();
    expect(stats.abilities[0].name).toBe('Strength');
    expect(stats.abilities[0].bonus).toBe(2);
    expect(stats.abilities[0].save).toBe(4);
    expect(stats.abilities[0].skills).toEqual([]);
  });

  it('has spellAbilities with correct default structure', () => {
    const stats = createMockPlayerStats();
    expect(stats.spellAbilities.spells).toEqual([]);
    expect(stats.spellAbilities.maxPreparedSpells).toBe(5);
  });

  it('merges override properties into defaults', () => {
    const stats = createMockPlayerStats({
      name: 'Custom Character',
      level: 10,
      rules: '2024',
      speed: 40,
    });
    expect(stats.name).toBe('Custom Character');
    expect(stats.level).toBe(10);
    expect(stats.rules).toBe('2024');
    expect(stats.speed).toBe(40);
  });

  it('overrides default vi.fn() callbacks with provided ones', () => {
    const customFn = vi.fn();
    const stats = createMockPlayerStats({ onTest: customFn });
    expect(stats.onTest).toBe(customFn);
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
    expect(returnValue).toHaveProperty('value', {});
    expect(returnValue).toHaveProperty('Provider');
  });

  it('setPopupHtml is a vi.fn() mock', () => {
    const returnValue = createSharedPopupReturnValue();
    expect(typeof returnValue.setPopupHtml).toBe('function');
  });

  it('Provider renders children', () => {
    const returnValue = createSharedPopupReturnValue();
    const Provider = returnValue.Provider;
    // Provider is a function that takes children and returns them
    const result = Provider({ children: 'test-children' });
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
  it('sets popupHtml on the return value object', () => {
    const returnValue = createSharedPopupReturnValue();
    const testHtml = { type: 'wild_shape_select', name: 'Test' };
    setPopup(returnValue, testHtml);
    expect(returnValue.popupHtml).toBe(testHtml);
  });

  it('overwrites previous popupHtml value', () => {
    const returnValue = createSharedPopupReturnValue();
    setPopup(returnValue, { type: 'first' });
    expect(returnValue.popupHtml).toEqual({ type: 'first' });
    setPopup(returnValue, { type: 'second' });
    expect(returnValue.popupHtml).toEqual({ type: 'second' });
  });

  it('accepts null as html to clear popup', () => {
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
  it('clears all mocks via vi.clearAllMocks', () => {
    const returnValue = createSharedPopupReturnValue();
    const mockFn = vi.fn().mockReturnValue('original');
    returnValue.setPopupHtml = mockFn;
    mockFn('called');
    expect(mockFn).toHaveBeenCalledTimes(1);
    resetTestState(returnValue);
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  it('resets popupHtml to null', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.popupHtml = { type: 'old' };
    resetTestState(returnValue);
    expect(returnValue.popupHtml).toBeNull();
  });

  it('replaces setPopupHtml with a fresh vi.fn()', () => {
    const returnValue = createSharedPopupReturnValue();
    const oldFn = returnValue.setPopupHtml;
    resetTestState(returnValue);
    expect(returnValue.setPopupHtml).not.toBe(oldFn);
    expect(typeof returnValue.setPopupHtml).toBe('function');
  });

  it('resets value to empty object', () => {
    const returnValue = createSharedPopupReturnValue();
    returnValue.value = { old: 'data' };
    resetTestState(returnValue);
    expect(returnValue.value).toEqual({});
  });

  it('does not reset Provider', () => {
    const returnValue = createSharedPopupReturnValue();
    const oldProvider = returnValue.Provider;
    resetTestState(returnValue);
    expect(returnValue.Provider).toBe(oldProvider);
  });
});
