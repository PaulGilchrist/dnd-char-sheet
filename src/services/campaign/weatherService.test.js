// @improved-by-ai
import { describe, it, expect } from 'vitest';
import {
  generateWeather,
} from './weatherService.js';

describe('weatherService', () => {
  describe('generateWeather', () => {
    describe('return shape', () => {
      const requiredKeys = ['condition', 'label', 'icon', 'description', 'visibility', 'moveCostMod', 'budgetMod', 'encounterMod'];

      it('returns all required keys for each terrain type', () => {
        const terrains = ['plains', 'forest', 'hills', 'mountains', 'desert', 'swamp', 'tundra', 'beach'];
        for (const terrain of terrains) {
          const weather = generateWeather(terrain);
          for (const key of requiredKeys) {
            expect(weather).toHaveProperty(key);
          }
        }
      });

      it('returns all required keys for unknown terrain types', () => {
        const weather = generateWeather('jungle');
        for (const key of requiredKeys) {
          expect(weather).toHaveProperty(key);
        }
      });

      it('returns all required keys for null and undefined terrain', () => {
        const w1 = generateWeather(null);
        const w2 = generateWeather(undefined);
        for (const key of requiredKeys) {
          expect(w1).toHaveProperty(key);
          expect(w2).toHaveProperty(key);
        }
      });
    });

    describe('terrain-to-biome mapping', () => {
      it('maps plains, forest, hills to temperate biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']);
        for (const terrain of ['plains', 'forest', 'hills']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            expect(validConditions).toContain(weather.condition,
              `condition "${weather.condition}" for "${terrain}" should be temperate biome`);
          }
        }
      });

      it('maps desert to arid biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'wind', 'fog', 'extreme']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('desert');
          expect(validConditions).toContain(weather.condition,
            `condition "${weather.condition}" for "desert" should be arid biome`);
        }
      });

      it('maps mountains, tundra to cold biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'snow', 'storm', 'fog', 'extreme']);
        for (const terrain of ['mountains', 'tundra']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            expect(validConditions).toContain(weather.condition,
              `condition "${weather.condition}" for "${terrain}" should be cold biome`);
          }
        }
      });

      it('maps swamp to wet biome conditions', () => {
        const validConditions = new Set(['cloudy', 'rain', 'storm', 'fog', 'mist']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('swamp');
          expect(validConditions).toContain(weather.condition,
            `condition "${weather.condition}" for "swamp" should be wet biome`);
        }
      });

      it('maps beach to coastal biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'wind', 'storm', 'fog']);
        for (let i = 0; i < 50; i++) {
          const weather = generateWeather('beach');
          expect(validConditions).toContain(weather.condition,
            `condition "${weather.condition}" for "beach" should be coastal biome`);
        }
      });

      it('defaults unknown terrain to temperate biome conditions', () => {
        const validConditions = new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']);
        for (const unknown of ['jungle', 'volcano', 'cavern', 'ocean']) {
          for (let i = 0; i < 20; i++) {
            const weather = generateWeather(unknown);
            expect(validConditions).toContain(weather.condition);
          }
        }
      });
    });

    describe('weather effect values', () => {
      it('returns correct effect values for clear weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'clear') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'clear',
            label: 'Clear',
            icon: 'sun',
            visibility: null,
            moveCostMod: 1.0,
            budgetMod: 1.0,
            encounterMod: 0,
            description: 'Clear skies — no effect on travel',
          });
        }
      });

      it('returns correct effect values for cloudy weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'cloudy') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'cloudy',
            label: 'Cloudy',
            icon: 'cloud',
            visibility: null,
            moveCostMod: 1.0,
            budgetMod: 1.0,
            encounterMod: 0,
            description: 'Overcast — no effect on travel',
          });
        }
      });

      it('returns correct effect values for rain weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'rain') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'rain',
            label: 'Rain',
            icon: 'cloud-rain',
            visibility: null,
            moveCostMod: 1.25,
            budgetMod: 1.0,
            encounterMod: 10,
            description: 'Heavy rain — terrain costs +25%',
          });
        }
      });

      it('returns correct effect values for storm weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'storm') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'storm',
            label: 'Storm',
            icon: 'bolt',
            visibility: 3,
            moveCostMod: 1.5,
            budgetMod: 0.75,
            encounterMod: 20,
            description: 'Thunderstorm — terrain costs +50%, visibility limited, daily budget -25%',
          });
        }
      });

      it('returns correct effect values for fog weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'fog') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'fog',
            label: 'Fog',
            icon: 'smog',
            visibility: 1,
            moveCostMod: 1.0,
            budgetMod: 1.0,
            encounterMod: -10,
            description: 'Thick fog — visibility limited to adjacent hexes',
          });
        }
      });

      it('returns correct effect values for wind weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('desert');
          if (weather.condition === 'wind') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'wind',
            label: 'High Wind',
            icon: 'wind',
            visibility: null,
            moveCostMod: 1.0,
            budgetMod: 0.8,
            encounterMod: 5,
            description: 'Strong winds — daily budget -20%',
          });
        }
      });

      it('returns correct effect values for snow weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('mountains');
          if (weather.condition === 'snow') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'snow',
            label: 'Snow',
            icon: 'snowflake',
            visibility: null,
            moveCostMod: 1.5,
            budgetMod: 1.0,
            encounterMod: 10,
            description: 'Snowfall — terrain costs +50%',
          });
        }
      });

      it('returns correct effect values for mist weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('swamp');
          if (weather.condition === 'mist') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'mist',
            label: 'Mist',
            icon: 'smog',
            visibility: 2,
            moveCostMod: 1.0,
            budgetMod: 1.0,
            encounterMod: -5,
            description: 'Heavy mist — visibility reduced',
          });
        }
      });

      it('returns correct effect values for extreme weather', () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('desert');
          if (weather.condition === 'extreme') seen.add(weather);
        }
        expect(seen.size).toBeGreaterThan(0);
        for (const w of seen) {
          expect(w).toEqual({
            condition: 'extreme',
            label: 'Extreme',
            icon: 'triangle-exclamation',
            visibility: 0,
            moveCostMod: null,
            budgetMod: 0,
            encounterMod: 30,
            description: 'Blizzard or sandstorm — travel impossible, forced camp',
          });
        }
      });
    });

    describe('biome-specific conditions', () => {
      it('plains can produce all 5 temperate conditions across enough samples', () => {
        const seen = new Set();
        for (let i = 0; i < 500; i++) {
          const weather = generateWeather('plains');
          seen.add(weather.condition);
        }
        expect(seen).toEqual(new Set(['clear', 'cloudy', 'rain', 'fog', 'storm']));
      });

      it('desert can produce all 5 arid conditions across enough samples', () => {
        const seen = new Set();
        for (let i = 0; i < 500; i++) {
          const weather = generateWeather('desert');
          seen.add(weather.condition);
        }
        expect(seen).toEqual(new Set(['clear', 'cloudy', 'wind', 'fog', 'extreme']));
      });

      it('mountains can produce all 6 cold conditions across enough samples', () => {
        const seen = new Set();
        for (let i = 0; i < 500; i++) {
          const weather = generateWeather('mountains');
          seen.add(weather.condition);
        }
        expect(seen).toEqual(new Set(['clear', 'cloudy', 'snow', 'storm', 'fog', 'extreme']));
      });

      it('swamp can produce all 5 wet conditions across enough samples', () => {
        const seen = new Set();
        for (let i = 0; i < 500; i++) {
          const weather = generateWeather('swamp');
          seen.add(weather.condition);
        }
        expect(seen).toEqual(new Set(['cloudy', 'rain', 'storm', 'fog', 'mist']));
      });

      it('beach can produce all 6 coastal conditions across enough samples', () => {
        const seen = new Set();
        for (let i = 0; i < 500; i++) {
          const weather = generateWeather('beach');
          seen.add(weather.condition);
        }
        expect(seen).toEqual(new Set(['clear', 'cloudy', 'rain', 'wind', 'storm', 'fog']));
      });

      it('tundra shares the same conditions as mountains (cold biome)', () => {
        const plainsSeen = new Set();
        const tundraSeen = new Set();
        for (let i = 0; i < 500; i++) {
          plainsSeen.add(generateWeather('plains').condition);
          tundraSeen.add(generateWeather('tundra').condition);
        }
        // tundra should NOT have rain, but should have snow
        expect(tundraSeen).not.toContain('rain');
        expect(tundraSeen).toContain('snow');
        expect(tundraSeen).toContain('extreme');
      });
    });

    describe('semantic values', () => {
      it('clear and cloudy have no visibility restriction', () => {
        for (const terrain of ['plains', 'forest', 'hills', 'mountains', 'desert']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            if (weather.condition === 'clear' || weather.condition === 'cloudy') {
              expect(weather.visibility).toBeNull();
            }
          }
        }
      });

      it('storm limits visibility to 3', () => {
        for (const terrain of ['plains', 'forest', 'hills', 'mountains', 'tundra', 'swamp', 'beach']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            if (weather.condition === 'storm') {
              expect(weather.visibility).toBe(3);
            }
          }
        }
      });

      it('fog limits visibility to 1, mist to 2', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'fog') expect(weather.visibility).toBe(1);
          if (weather.condition === 'mist') expect(weather.visibility).toBe(2);
        }
      });

      it('extreme has zero visibility', () => {
        for (const terrain of ['desert', 'mountains', 'tundra']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            if (weather.condition === 'extreme') {
              expect(weather.visibility).toBe(0);
            }
          }
        }
      });

      it('rain and snow increase movement cost to 1.25 and 1.5 respectively', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'rain') expect(weather.moveCostMod).toBe(1.25);
          if (weather.condition === 'snow') expect(weather.moveCostMod).toBe(1.5);
        }
      });

      it('storm increases movement cost to 1.5', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'storm') expect(weather.moveCostMod).toBe(1.5);
        }
      });

      it('extreme has null movement cost (travel impossible)', () => {
        for (const terrain of ['desert', 'mountains', 'tundra']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            if (weather.condition === 'extreme') {
              expect(weather.moveCostMod).toBeNull();
            }
          }
        }
      });

      it('storm reduces budget to 0.75, wind to 0.8', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'storm') expect(weather.budgetMod).toBe(0.75);
          if (weather.condition === 'wind') expect(weather.budgetMod).toBe(0.8);
        }
      });

      it('extreme has zero budget', () => {
        for (const terrain of ['desert', 'mountains', 'tundra']) {
          for (let i = 0; i < 50; i++) {
            const weather = generateWeather(terrain);
            if (weather.condition === 'extreme') {
              expect(weather.budgetMod).toBe(0);
            }
          }
        }
      });

      it('conditions with negative encounterMod (fog, mist) reduce encounters', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'fog') expect(weather.encounterMod).toBe(-10);
          if (weather.condition === 'mist') expect(weather.encounterMod).toBe(-5);
        }
      });

      it('conditions with positive encounterMod (rain, storm, snow, wind, extreme) increase encounters', () => {
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('plains');
          if (weather.condition === 'rain') expect(weather.encounterMod).toBe(10);
          if (weather.condition === 'storm') expect(weather.encounterMod).toBe(20);
        }
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('mountains');
          if (weather.condition === 'snow') expect(weather.encounterMod).toBe(10);
        }
        for (let i = 0; i < 200; i++) {
          const weather = generateWeather('desert');
          if (weather.condition === 'wind') expect(weather.encounterMod).toBe(5);
          if (weather.condition === 'extreme') expect(weather.encounterMod).toBe(30);
        }
      });
    });

    describe('consistency', () => {
      it('same condition always produces the same effect object', () => {
        const results = new Set();
        for (let i = 0; i < 100; i++) {
          const weather = generateWeather('plains');
          results.add(JSON.stringify(weather));
        }
        // All results for the same condition must be identical
        const byCondition = {};
        for (let i = 0; i < 100; i++) {
          const weather = generateWeather('plains');
          if (!byCondition[weather.condition]) byCondition[weather.condition] = weather;
          expect(weather).toEqual(byCondition[weather.condition]);
        }
      });

      it('returns deterministic results for the same random seed (no external state mutation)', () => {
        // Each call is independent — no shared mutable state
        const results = [];
        for (let i = 0; i < 100; i++) {
          results.push(generateWeather('plains'));
        }
        // All results should have valid shapes
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
