import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntityManagement } from './useEntityManagement.js';

describe('useEntityManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const loadFn = vi.fn();
  const saveFn = vi.fn();
  const deleteFn = vi.fn();

  const hooks = { load: loadFn, save: saveFn, delete: deleteFn };
  const emptyOptions = {};

  describe('initialization', () => {
    it('should initialize with empty items array and loading false', async () => {
      loadFn.mockResolvedValue([]);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, emptyOptions)
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should return loadItems, saveItems, deleteItem functions', () => {
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, emptyOptions)
      );
      expect(typeof result.current.loadItems).toBe('function');
      expect(typeof result.current.saveItems).toBe('function');
      expect(typeof result.current.deleteItem).toBe('function');
    });
  });

  describe('loadOnMount behavior', () => {
    it('should call loadFn on mount when loadOnMount is true (default)', async () => {
      loadFn.mockResolvedValue([{ id: 1, name: 'Entity 1' }]);
      renderHook(() =>
        useEntityManagement('test-campaign', hooks, emptyOptions)
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(loadFn).toHaveBeenCalledWith('test-campaign');
    });

    it('should NOT call loadFn on mount when loadOnMount is false', async () => {
      loadFn.mockResolvedValue([{ id: 1, name: 'Entity 1' }]);
      renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(loadFn).not.toHaveBeenCalled();
    });
  });

  describe('loadItems', () => {
    it('should set items from loadFn response', async () => {
      loadFn.mockResolvedValue([{ id: 1, name: 'Entity 1' }]);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.items).toEqual([{ id: 1, name: 'Entity 1' }]);
    });

    it('should set items from responseKey in response', async () => {
      loadFn.mockResolvedValue({ entities: [{ id: 1, name: 'Entity 1' }] });
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          responseKey: 'entities',
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.items).toEqual([{ id: 1, name: 'Entity 1' }]);
    });

    it('should set items to empty array when responseKey is missing from response', async () => {
      loadFn.mockResolvedValue({ otherKey: 'value' });
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          responseKey: 'entities',
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.items).toEqual([]);
    });

    it('should set items to empty array when response is not an array and no responseKey', async () => {
      loadFn.mockResolvedValue('not an array');
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.items).toEqual([]);
    });

    it('should set items to empty array when campaignName is falsy', async () => {
      const { result } = renderHook(() =>
        useEntityManagement(null, hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.items).toEqual([]);
    });

    it('should set loading to true during load and false after', async () => {
      loadFn.mockImplementation(
        () => new Promise((r) => setTimeout(r, 10))
      );
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      let promise;
      await act(async () => {
        promise = result.current.loadItems();
      });
      expect(result.current.loading).toBe(true);
      await act(async () => {
        await promise;
      });
      expect(result.current.loading).toBe(false);
    });

    it('should call console.error and set loading false when loadFn throws', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      loadFn.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load items list:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('should not call console.error when logError is false', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      loadFn.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          logError: false,
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(console.error).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use responseKey in error message', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      loadFn.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          responseKey: 'entities',
        })
      );
      await act(async () => {
        await result.current.loadItems();
      });
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load entities list:',
        expect.any(Error)
      );
      spy.mockRestore();
    });
  });

  describe('saveItems', () => {
    it('should call saveFn with campaignName and array', async () => {
      loadFn.mockResolvedValue([]);
      saveFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.saveItems([{ id: 1, name: 'Entity 1' }]);
      });
      expect(saveFn).toHaveBeenCalledWith(
        'test-campaign',
        [{ id: 1, name: 'Entity 1' }]
      );
    });

    it('should reload items after successful save', async () => {
      loadFn
        .mockResolvedValueOnce([{ id: 1, name: 'Entity 1' }])
        .mockResolvedValueOnce([]);
      saveFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.saveItems([{ id: 1, name: 'Entity 1' }]);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.items).toEqual([{ id: 1, name: 'Entity 1' }]);
    });

    it('should not call saveFn when campaignName is falsy', async () => {
      saveFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement(null, hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.saveItems([{ id: 1 }]);
      });
      expect(saveFn).not.toHaveBeenCalled();
    });

    it('should throw and log error when saveFn throws', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      saveFn.mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await expect(
        act(async () => {
          await result.current.saveItems([{ id: 1 }]);
        })
      ).rejects.toThrow('Save failed');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save items:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('should not log error when logError is false', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      saveFn.mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          logError: false,
        })
      );
      await expect(
        act(async () => {
          await result.current.saveItems([{ id: 1 }]);
        })
      ).rejects.toThrow('Save failed');
      expect(console.error).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use responseKey in save error message', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      saveFn.mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          responseKey: 'entities',
        })
      );
      await expect(
        act(async () => {
          await result.current.saveItems([{ id: 1 }]);
        })
      ).rejects.toThrow('Save failed');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save entities:',
        expect.any(Error)
      );
      spy.mockRestore();
    });
  });

  describe('deleteItem', () => {
    it('should call deleteFn with campaignName and id', async () => {
      loadFn.mockResolvedValue([]);
      deleteFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.deleteItem('entity-id-123');
      });
      expect(deleteFn).toHaveBeenCalledWith('test-campaign', 'entity-id-123');
    });

    it('should reload items after successful delete', async () => {
      loadFn
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'entity-id-123' }]);
      deleteFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.deleteItem('entity-id-123');
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.items).toEqual([]);
    });

    it('should not call deleteFn when campaignName is falsy', async () => {
      deleteFn.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useEntityManagement(null, hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await act(async () => {
        await result.current.deleteItem('entity-id-123');
      });
      expect(deleteFn).not.toHaveBeenCalled();
    });

    it('should throw and log error when deleteFn throws', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      deleteFn.mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
        })
      );
      await expect(
        act(async () => {
          await result.current.deleteItem('entity-id-123');
        })
      ).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete item:',
        expect.any(Error)
      );
      spy.mockRestore();
    });

    it('should not log error when logError is false', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      deleteFn.mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          logError: false,
        })
      );
      await expect(
        act(async () => {
          await result.current.deleteItem('entity-id-123');
        })
      ).rejects.toThrow('Delete failed');
      expect(console.error).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use responseKey in delete error message', async () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue();
      deleteFn.mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() =>
        useEntityManagement('test-campaign', hooks, {
          ...emptyOptions,
          loadOnMount: false,
          responseKey: 'entities',
        })
      );
      await expect(
        act(async () => {
          await result.current.deleteItem('entity-id-123');
        })
      ).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete entities:',
        expect.any(Error)
      );
      spy.mockRestore();
    });
  });

  describe('useEffect on mount', () => {
    it('should call loadItems on mount when campaignName and loadOnMount are truthy', async () => {
      loadFn.mockResolvedValue([{ id: 1 }]);
      renderHook(() =>
        useEntityManagement('test-campaign', hooks, emptyOptions)
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(loadFn).toHaveBeenCalled();
    });

    it('should not call loadItems on mount when campaignName is falsy', async () => {
      loadFn.mockResolvedValue([]);
      renderHook(() =>
        useEntityManagement(null, hooks, emptyOptions)
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(loadFn).not.toHaveBeenCalled();
    });
  });
});
