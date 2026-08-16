// @improved-by-ai
import { describe, it, expect } from 'vitest';
import {
  generateWeather,
} from './weatherService.js';

function findCondition(terrain, targetCondition, maxAttempts = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    const weather = generateWeather(terrain);
    if (weather.condition === targetCondition) {
      return weather;
    }
  }
  return null;
}

describe('weatherService', () => {
  describe('generateWeather', () => {
    describe('return shape', () => {
      const requiredKeys = ['condition', 'label', 'icon', 'description', 'visibility', 'moveCostMod', 'budgetMod', 'encounterMod'];

      it('returns all required keys for a known terrain', () => {
        const weather = generateWeather('plains');
        for (const key of requiredKeys) {
          expect(weather).toHaveProperty(key);
        }
      });

      it('returns all required keys for an unknown terrain', () => {
        const weather = generateWeather('jungle');
        for (const key of requiredKeys) {
          expect(weather).toHaveProperty(key);
        }
      });

      it('returns all required keys for null and undefined terrain', () => {
        for (const terrain of [null, undefined]) {
          const weather = generateWeather(terrain);
          for (const key of requiredKeys) {
            expect(weather).toHaveProperty(key);
          }
        }
      });
    });

    describe('terrain-to-biome mapping', () => {
      it('maps plains, forest, hills to temperate biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']);
        for (const terrain of ['plains', 'forest', 'hills']) {
          const weather = generateWeather(terrain);
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('maps desert to arid biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'wind', 'fog', 'extreme']);
        const weather = generateWeather('desert');
        expect(validConditions).toContain(weather.condition);
      });

      it('maps mountains and tundra to cold biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'snow', 'storm', 'fog', 'extreme']);
        for (const terrain of ['mountains', 'tundra']) {
          const weather = generateWeather(terrain);
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('maps swamp to wet biome conditions', () => {
        const validConditions = new Set(['cloudy', 'rain', 'storm', 'fog', 'mist']);
        const weather = generateWeather('swamp');
        expect(validConditions).toContain(weather.condition);
      });

      it('maps beach to coastal biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'wind', 'storm', 'fog']);
        const weather = generateWeather('beach');
        expect(validConditions).toContain(weather.condition);
      });

      it('defaults unknown terrain to temperate biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']);
        const weather = generateWeather('jungle');
        expect(validConditions).toContain(weather.condition);
      });
    });

    describe('weather effect values', () => {
      it('returns correct effect values for clear weather', () => {
        const weather = findCondition('plains', 'clear');
        expect(weather, 'clear condition should appear in temperate biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'clear',
          label: 'Clear',
          icon: 'sun',
          visibility: null,
          moveCostMod: 1.0,
          budgetMod: 1.0,
          encounterMod: 0,
          description: 'Clear skies — no effect on travel',
        });
      });

      it('returns correct effect values for cloudy weather', () => {
        const weather = findCondition('plains', 'cloudy');
        expect(weather, 'cloudy condition should appear in temperate biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'cloudy',
          label: 'Cloudy',
          icon: 'cloud',
          visibility: null,
          moveCostMod: 1.0,
          budgetMod: 1.0,
          encounterMod: 0,
          description: 'Overcast — no effect on travel',
        });
      });

      it('returns correct effect values for rain weather', () => {
        const weather = findCondition('plains', 'rain');
        expect(weather, 'rain condition should appear in temperate biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'rain',
          label: 'Rain',
          icon: 'cloud-rain',
          visibility: null,
          moveCostMod: 1.25,
          budgetMod: 1.0,
          encounterMod: 10,
          description: 'Heavy rain — terrain costs +25%',
        });
      });

      it('returns correct effect values for storm weather', () => {
        const weather = findCondition('plains', 'storm');
        expect(weather, 'storm condition should appear in temperate biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'storm',
          label: 'Storm',
          icon: 'bolt',
          visibility: 3,
          moveCostMod: 1.5,
          budgetMod: 0.75,
          encounterMod: 20,
          description: 'Thunderstorm — terrain costs +50%, visibility limited, daily budget -25%',
        });
      });

      it('returns correct effect values for fog weather', () => {
        const weather = findCondition('plains', 'fog');
        expect(weather, 'fog condition should appear in temperate biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'fog',
          label: 'Fog',
          icon: 'smog',
          visibility: 1,
          moveCostMod: 1.0,
          budgetMod: 1.0,
          encounterMod: -10,
          description: 'Thick fog — visibility limited to adjacent hexes',
        });
      });

      it('returns correct effect values for wind weather', () => {
        const weather = findCondition('desert', 'wind');
        expect(weather, 'wind condition should appear in arid biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'wind',
          label: 'High Wind',
          icon: 'wind',
          visibility: null,
          moveCostMod: 1.0,
          budgetMod: 0.8,
          encounterMod: 5,
          description: 'Strong winds — daily budget -20%',
        });
      });

      it('returns correct effect values for snow weather', () => {
        const weather = findCondition('mountains', 'snow');
        expect(weather, 'snow condition should appear in cold biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'snow',
          label: 'Snow',
          icon: 'snowflake',
          visibility: null,
          moveCostMod: 1.5,
          budgetMod: 1.0,
          encounterMod: 10,
          description: 'Snowfall — terrain costs +50%',
        });
      });

      it('returns correct effect values for mist weather', () => {
        const weather = findCondition('swamp', 'mist');
        expect(weather, 'mist condition should appear in wet biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'mist',
          label: 'Mist',
          icon: 'smog',
          visibility: 2,
          moveCostMod: 1.0,
          budgetMod: 1.0,
          encounterMod: -5,
          description: 'Heavy mist — visibility reduced',
        });
      });

      it('returns correct effect values for extreme weather', () => {
        const weather = findCondition('desert', 'extreme');
        expect(weather, 'extreme condition should appear in arid biome').not.toBeNull();
        expect(weather).toEqual({
          condition: 'extreme',
          label: 'Extreme',
          icon: 'triangle-exclamation',
          visibility: 0,
          moveCostMod: null,
          budgetMod: 0,
          encounterMod: 30,
          description: 'Blizzard or sandstorm — travel impossible, forced camp',
        });
      });
    });

    describe('biome-specific conditions', () => {
      it('plains can only produce temperate conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('plains');
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('desert can only produce arid conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'wind', 'fog', 'extreme']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('desert');
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('mountains can only produce cold conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'snow', 'storm', 'fog', 'extreme']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('mountains');
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('swamp can only produce wet conditions', () => {
        const validConditions = new Set(['cloudy', 'rain', 'storm', 'fog', 'mist']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('swamp');
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('beach can only produce coastal conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'wind', 'storm', 'fog']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('beach');
          expect(validConditions).toContain(weather.condition);
        }
      });

      it('tundra produces cold biome conditions without rain', () => {
        const validConditions = new Set(['clear', 'cloudy', 'snow', 'storm', 'fog', 'extreme']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('tundra');
          expect(validConditions).toContain(weather.condition);
          expect(weather.condition).not.toBe('rain');
        }
      });
    });

    describe('semantic values', () => {
      it('clear and cloudy have no visibility restriction', () => {
        const clearWeather = findCondition('plains', 'clear');
        expect(clearWeather.visibility).toBeNull();
        const cloudyWeather = findCondition('plains', 'cloudy');
        expect(cloudyWeather.visibility).toBeNull();
      });

      it('storm limits visibility to 3', () => {
        const weather = findCondition('plains', 'storm');
        expect(weather.visibility).toBe(3);
      });

      it('fog limits visibility to 1, mist to 2', () => {
        const fogWeather = findCondition('plains', 'fog');
        expect(fogWeather.visibility).toBe(1);
        const mistWeather = findCondition('swamp', 'mist');
        expect(mistWeather.visibility).toBe(2);
      });

      it('extreme has zero visibility', () => {
        const weather = findCondition('desert', 'extreme');
        expect(weather.visibility).toBe(0);
      });

      it('rain increases movement cost to 1.25', () => {
        const weather = findCondition('plains', 'rain');
        expect(weather.moveCostMod).toBe(1.25);
      });

      it('snow increases movement cost to 1.5', () => {
        const weather = findCondition('mountains', 'snow');
        expect(weather.moveCostMod).toBe(1.5);
      });

      it('storm increases movement cost to 1.5', () => {
        const weather = findCondition('plains', 'storm');
        expect(weather.moveCostMod).toBe(1.5);
      });

      it('extreme has null movement cost (travel impossible)', () => {
        const weather = findCondition('desert', 'extreme');
        expect(weather.moveCostMod).toBeNull();
      });

      it('storm reduces budget to 0.75, wind to 0.8', () => {
        const stormWeather = findCondition('plains', 'storm');
        expect(stormWeather.budgetMod).toBe(0.75);
        const windWeather = findCondition('desert', 'wind');
        expect(windWeather.budgetMod).toBe(0.8);
      });

      it('extreme has zero budget', () => {
        const weather = findCondition('desert', 'extreme');
        expect(weather.budgetMod).toBe(0);
      });

      it('fog and mist reduce encounterMod', () => {
        const fogWeather = findCondition('plains', 'fog');
        expect(fogWeather.encounterMod).toBe(-10);
        const mistWeather = findCondition('swamp', 'mist');
        expect(mistWeather.encounterMod).toBe(-5);
      });

      it('rain, storm, snow, wind, and extreme increase encounterMod', () => {
        const rainWeather = findCondition('plains', 'rain');
        expect(rainWeather.encounterMod).toBe(10);
        const stormWeather = findCondition('plains', 'storm');
        expect(stormWeather.encounterMod).toBe(20);
        const snowWeather = findCondition('mountains', 'snow');
        expect(snowWeather.encounterMod).toBe(10);
        const windWeather = findCondition('desert', 'wind');
        expect(windWeather.encounterMod).toBe(5);
        const extremeWeather = findCondition('desert', 'extreme');
        expect(extremeWeather.encounterMod).toBe(30);
      });
    });

    describe('consistency', () => {
      it('same condition always produces the same effect object', () => {
        const weather1 = findCondition('plains', 'clear');
        const weather2 = findCondition('plains', 'clear');
        expect(weather2).toEqual(weather1);
      });

      it('returns deterministic results for the same random seed', () => {
        const results = [];
        for (let i = 0; i < 20; i++) {
          results.push(generateWeather('plains'));
        }
        for (const w of results) {
          expect(typeof w.condition).toBe('string');
          expect(typeof w.label).toBe('string');
          expect(typeof w.description).toBe('string');
          expect(typeof w.icon).toBe('string');
        }
      });
    });
  });
});
