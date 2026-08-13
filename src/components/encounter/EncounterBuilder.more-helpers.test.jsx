// @improved-by-ai
import { describe, it, expect } from 'vitest';

describe('crToNumber', () => {
  function crToNumber(cr) {
    if (cr === null || cr === undefined || cr === '' || cr === 'None') return NaN;
    const str = String(cr).trim().toLowerCase();
    if (str === 'any') return 999;
    const match = str.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (match) return parseInt(match[1], 10) / parseInt(match[2], 10);
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
  }

  it('returns NaN for null, undefined, empty string, and "None"', () => {
    expect(crToNumber(null)).toBeNaN();
    expect(crToNumber(undefined)).toBeNaN();
    expect(crToNumber('')).toBeNaN();
    expect(crToNumber('None')).toBeNaN();
  });

  it('returns 999 for "any" (case-insensitive)', () => {
    expect(crToNumber('any')).toBe(999);
    expect(crToNumber('Any')).toBe(999);
    expect(crToNumber('ANY')).toBe(999);
  });

  it('parses fraction notation CR values', () => {
    expect(crToNumber('1/8')).toBe(0.125);
    expect(crToNumber('1/4')).toBe(0.25);
    expect(crToNumber('1/2')).toBe(0.5);
    expect(crToNumber('2/4')).toBe(0.5);
  });

  it('handles whitespace in fraction notation', () => {
    expect(crToNumber(' 1 / 4 ')).toBe(0.25);
    expect(crToNumber('1 /4')).toBe(0.25);
  });

  it('parses integer CR values', () => {
    expect(crToNumber('0')).toBe(0);
    expect(crToNumber('1')).toBe(1);
    expect(crToNumber('5')).toBe(5);
    expect(crToNumber('26')).toBe(26);
  });

  it('parses decimal CR values', () => {
    expect(crToNumber('0.25')).toBe(0.25);
    expect(crToNumber('1.5')).toBe(1.5);
  });

  it('returns NaN for unparseable strings', () => {
    expect(crToNumber('abc')).toBeNaN();
    expect(crToNumber('??')).toBeNaN();
  });
});

describe('filterMonsters - CR handling edge cases', () => {
  function crToNumber(cr) {
    if (cr === null || cr === undefined || cr === '' || cr === 'None') return NaN;
    const str = String(cr).trim().toLowerCase();
    if (str === 'any') return 999;
    const match = str.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (match) return parseInt(match[1], 10) / parseInt(match[2], 10);
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
  }

  function filterMonsters(monsters, searchQuery, playerLevels, difficultyIndex, totalThreshold, environmentFilter, typeFilter, sizeFilter, crMin, crMax) {
    if (!monsters) return [];
    return monsters.filter(m => {
      if (environmentFilter && m.environments && !m.environments.includes(environmentFilter)) return false;
      if (typeFilter && m.type && m.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (sizeFilter && m.size && m.size.toLowerCase() !== sizeFilter.toLowerCase()) return false;
      const crMinNum = !crMin ? null : parseFloat(crMin);
      const crMaxNum = !crMax ? null : parseFloat(crMax);
      if (crMinNum !== null || crMaxNum !== null) {
        const cr = crToNumber(m.challenge_rating);
        if (!isNaN(cr)) {
          if (crMinNum !== null && cr < crMinNum) return false;
          if (crMaxNum !== null && cr > crMaxNum) return false;
        } else {
          return false;
        }
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q)
        || (m.type && m.type.toLowerCase().includes(q))
        || (m.subtype && m.subtype.toLowerCase().includes(q));
    });
  }

  const monsters = [
    { index: 'goblin', name: 'Goblin', type: 'humanoid', subtype: 'tribe', environments: ['forest'], challenge_rating: 0.25 },
    { index: 'orc', name: 'Orc', type: 'humanoid', subtype: 'warrior', environments: ['hill', 'mountain'], challenge_rating: 0.5 },
    { index: 'dragon', name: 'Young Dragon', type: 'dragon', environments: ['underground'], challenge_rating: 2 },
  ];

  it('handles CR min only with float string', () => {
    expect(filterMonsters(monsters, '', [1], 0, 100, '', '', '', '0.5', '').map(m => m.index)).toEqual(['orc', 'dragon']);
  });

  it('handles CR max only with float string', () => {
    expect(filterMonsters(monsters, '', [1], 0, 100, '', '', '', '', '0.5').map(m => m.index)).toEqual(['goblin', 'orc']);
  });

  it('excludes monsters with non-numeric CR when CR range filter is active', () => {
    const mixedCRMonsters = [
      { index: 'goblin', name: 'Goblin', type: 'humanoid', challenge_rating: 0.25 },
      { index: 'cloud', name: 'Cloud', type: 'elemental', challenge_rating: 'None' },
      { index: 'ooze', name: 'Green Ooze', type: 'ooze', challenge_rating: 'any' },
    ];
    expect(filterMonsters(mixedCRMonsters, '', [1], 0, 100, '', '', '', 0, 5).map(m => m.index)).toEqual(['goblin']);
  });

  it('passes monsters with no environments array when environment filter is active', () => {
    const noEnvMonsters = [
      { index: 'goblin', name: 'Goblin', type: 'humanoid', challenge_rating: 0.25 },
    ];
    expect(filterMonsters(noEnvMonsters, '', [1], 0, 100, 'forest', '', '', '', '')).toEqual(noEnvMonsters);
  });

  it('handles empty crMin/crMax as no filter (falsy strings)', () => {
    // Empty string is falsy, so !crMin is true -> null -> no min filter applied
    const result = filterMonsters(monsters, '', [1], 0, 100, '', '', '', '', '');
    expect(result).toHaveLength(3);
  });

  it('filters by CR range with "any" CR value excluded', () => {
    const anyCRMonsters = [
      { index: 'goblin', name: 'Goblin', type: 'humanoid', challenge_rating: 0.25 },
      { index: 'celestial', name: 'Celestial', type: 'celestial', challenge_rating: 'any' },
    ];
    // 'any' parses to 999, so it should be excluded by max:5
    expect(filterMonsters(anyCRMonsters, '', [1], 0, 100, '', '', '', '', '5').map(m => m.index)).toEqual(['goblin']);
  });
});
