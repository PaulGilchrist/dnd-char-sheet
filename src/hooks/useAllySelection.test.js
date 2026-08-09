import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllyList, setAllyList } from './useAllySelection.js';
import * as useRuntimeState from './runtime/useRuntimeState.js';

describe('useAllySelection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllyList', () => {
    it('returns stored allies when they exist as a non-empty array', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue(['Ally1', 'Ally2']);

      const result = getAllyList('Hero');

      expect(result).toEqual(['Ally1', 'Ally2']);
    });

    it('returns [creatureName] when stored allies is null', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue(null);

      const result = getAllyList('Goblin');

      expect(result).toEqual(['Goblin']);
    });

    it('returns [creatureName] when stored allies is undefined', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue(undefined);

      const result = getAllyList('Skeleton');

      expect(result).toEqual(['Skeleton']);
    });

    it('returns [creatureName] when stored allies is an empty array', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue([]);

      const result = getAllyList('Orc');

      expect(result).toEqual(['Orc']);
    });

    it('returns [creatureName] when stored allies is not an array', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue('not-an-array');

      const result = getAllyList('Giant');

      expect(result).toEqual(['Giant']);
    });

    it('returns [creatureName] when stored allies is a single string', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue('SingleAlly');

      const result = getAllyList('Dragon');

      expect(result).toEqual(['Dragon']);
    });

    it('returns [creatureName] when stored allies is 0', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue(0);

      const result = getAllyList('Troll');

      expect(result).toEqual(['Troll']);
    });

    it('returns [creatureName] when stored allies is an empty string', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue('');

      const result = getAllyList('Wraith');

      expect(result).toEqual(['Wraith']);
    });

    it('returns stored allies with a single ally', () => {
      vi.spyOn(useRuntimeState, 'getRuntimeValue').mockReturnValue(['SingleAlly']);

      const result = getAllyList('Hero');

      expect(result).toEqual(['SingleAlly']);
    });
  });

  describe('setAllyList', () => {
    it('calls setRuntimeValue with the correct parameters for a non-empty array', () => {
      const spy = vi.spyOn(useRuntimeState, 'setRuntimeValue').mockReturnValue(undefined);

      setAllyList('Hero', ['Ally1', 'Ally2'], 'test-campaign');

      expect(spy).toHaveBeenCalledWith('Hero', 'selectedAllies', ['Ally1', 'Ally2'], 'test-campaign');
    });

    it('calls setRuntimeValue with an empty array', () => {
      const spy = vi.spyOn(useRuntimeState, 'setRuntimeValue').mockReturnValue(undefined);

      setAllyList('Hero', [], 'test-campaign');

      expect(spy).toHaveBeenCalledWith('Hero', 'selectedAllies', [], 'test-campaign');
    });

    it('calls setRuntimeValue with a single ally', () => {
      const spy = vi.spyOn(useRuntimeState, 'setRuntimeValue').mockReturnValue(undefined);

      setAllyList('Hero', ['Ally1'], 'test-campaign');

      expect(spy).toHaveBeenCalledWith('Hero', 'selectedAllies', ['Ally1'], 'test-campaign');
    });

    it('calls setRuntimeValue without campaignName', () => {
      const spy = vi.spyOn(useRuntimeState, 'setRuntimeValue').mockReturnValue(undefined);

      setAllyList('Hero', ['Ally1', 'Ally2']);

      expect(spy).toHaveBeenCalledWith('Hero', 'selectedAllies', ['Ally1', 'Ally2'], undefined);
    });
  });
});
