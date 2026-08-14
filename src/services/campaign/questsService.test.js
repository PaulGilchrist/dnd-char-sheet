// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadQuests, saveQuests, loadQuest, deleteQuest } from './questsService.js';

describe('questsService', () => {
  let fetchSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadQuests', () => {
    it('should return quests array from successful API response', async () => {
      const mockQuests = [
        { id: 'quest-1', name: 'Find the Ring' },
        { id: 'quest-2', name: 'Defeat Sauron' },
      ];
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quests: mockQuests }),
      });

      const result = await loadQuests('campaign1');

      expect(result).toEqual(mockQuests);
      expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/campaign1/quests');
    });

    it('should return empty array when API returns no quests', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quests: [] }),
      });

      const result = await loadQuests('campaign1');

      expect(result).toEqual([]);
    });

    it('should return empty array when quests key is missing from response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await loadQuests('campaign1');

      expect(result).toEqual([]);
    });

    it('should URL-encode the campaign name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quests: [] }),
      });

      await loadQuests('my campaign/1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/my%20campaign%2F1/quests');
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Campaign not found' }),
      });

      await expect(loadQuests('campaign1')).rejects.toThrow('Campaign not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading quests:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(loadQuests('campaign1')).rejects.toThrow('Failed to load quests');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(loadQuests('campaign1')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading quests:', expect.any(Error));
    });
  });

  describe('saveQuests', () => {
    it('should send POST with quests array on success', async () => {
      const quests = [{ id: 'quest-1', name: 'Find the Ring' }];

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveQuests('campaign1', quests);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/quests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quests }),
        }
      );
    });

    it('should send empty array when quests is empty', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveQuests('campaign1', []);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/quests',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ quests: [] }),
        })
      );
    });

    it('should URL-encode the campaign name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveQuests('my campaign/1', []);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1/quests',
        expect.any(Object)
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid quests data' }),
      });

      await expect(saveQuests('campaign1', [])).rejects.toThrow('Invalid quests data');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving quests:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(saveQuests('campaign1', [])).rejects.toThrow('Failed to save quests');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(saveQuests('campaign1', [])).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving quests:', expect.any(Error));
    });
  });

  describe('loadQuest', () => {
    it('should return a single quest from API response', async () => {
      const mockQuest = { id: 'quest-1', name: 'Find the Ring', description: 'Epic quest' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quest: mockQuest }),
      });

      const result = await loadQuest('campaign1', 'quest-1');

      expect(result).toEqual(mockQuest);
    });

    it('should URL-encode both campaign name and quest ID', async () => {
      const mockQuest = { id: 'quest-1', name: 'Test' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quest: mockQuest }),
      });

      await loadQuest('my campaign/1', 'quest%2Fwith%2Fslashes');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1/quests/quest%252Fwith%252Fslashes'
      );
    });

    it('should return undefined when quest key is missing from response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await loadQuest('campaign1', 'quest-1');

      expect(result).toBeUndefined();
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Quest not found' }),
      });

      await expect(loadQuest('campaign1', 'quest-1')).rejects.toThrow('Quest not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading quest:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(loadQuest('campaign1', 'quest-1')).rejects.toThrow('Failed to load quest');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(loadQuest('campaign1', 'quest-1')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading quest:', expect.any(Error));
    });
  });

  describe('deleteQuest', () => {
    it('should send DELETE request on success', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deleteQuest('campaign1', 'quest-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/quests/quest-1',
        { method: 'DELETE' }
      );
    });

    it('should URL-encode both campaign name and quest ID', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deleteQuest('my campaign/1', 'quest%2Fwith%2Fslashes');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1/quests/quest%252Fwith%252Fslashes',
        { method: 'DELETE' }
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Quest not found' }),
      });

      await expect(deleteQuest('campaign1', 'quest-1')).rejects.toThrow('Quest not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting quest:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(deleteQuest('campaign1', 'quest-1')).rejects.toThrow('Failed to delete quest');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(deleteQuest('campaign1', 'quest-1')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting quest:', expect.any(Error));
    });
  });
});
