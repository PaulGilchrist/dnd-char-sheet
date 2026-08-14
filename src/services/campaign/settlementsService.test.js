// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveSettlement,
  loadSettlements,
  saveSettlements,
  loadSettlement,
  deleteSettlement,
} from './settlementsService.js';

describe('settlementsService', () => {
  let fetchSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveSettlement', () => {
    it('should return parsed JSON body on successful save', async () => {
      const mockSettlement = { name: 'Waterdeep', type: 'city', population: 90000 };
      const responseData = { success: true, name: 'Waterdeep' };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await saveSettlement('campaign1', mockSettlement);

      expect(result).toEqual(responseData);
    });

    it('should send PUT to the correct URL with encoded special characters', async () => {
      const mockSettlement = { name: 'Town/Region', type: 'city' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveSettlement('campaign/1', mockSettlement, 'Old/Name');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign%2F1/settlements/Old%2FName',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockSettlement),
        }
      );
    });

    it('should use oldName for the URL when renaming a settlement', async () => {
      const mockSettlement = { name: 'NewName', type: 'city' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveSettlement('campaign1', mockSettlement, 'OldName');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/settlements/OldName',
        expect.any(Object)
      );
    });

    it('should use settlement.name for the URL when no oldName is provided', async () => {
      const mockSettlement = { name: 'Waterdeep', type: 'city' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveSettlement('campaign1', mockSettlement);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/settlements/Waterdeep',
        expect.any(Object)
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Conflict',
        json: () => Promise.resolve({ error: 'Settlement already exists' }),
      });

      await expect(
        saveSettlement('campaign1', { name: 'Test' })
      ).rejects.toThrow('Settlement already exists');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving settlement:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API error response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(
        saveSettlement('campaign1', { name: 'Test' })
      ).rejects.toThrow('Failed to save settlement');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(
        saveSettlement('campaign1', { name: 'Test' })
      ).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving settlement:', expect.any(Error));
    });
  });

  describe('loadSettlements', () => {
    it('should return settlements array from successful API response', async () => {
      const mockSettlements = [
        { name: 'Waterdeep', type: 'city', population: 90000 },
        { name: 'Baldur\'s Gate', type: 'city', population: 50000 },
      ];
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSettlements),
      });

      const result = await loadSettlements('campaign1');

      expect(result).toEqual(mockSettlements);
    });

    it('should return empty array when API returns no settlements', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await loadSettlements('campaign1');

      expect(result).toEqual([]);
    });

    it('should URL-encode the campaign name and include GET options', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await loadSettlements('campaign/with/slashes');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign%2Fwith%2Fslashes/settlements',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Campaign not found' }),
      });

      await expect(loadSettlements('campaign1')).rejects.toThrow('Campaign not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading settlements:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API error response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(loadSettlements('campaign1')).rejects.toThrow('Failed to load settlements');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(loadSettlements('campaign1')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading settlements:', expect.any(Error));
    });
  });

  describe('saveSettlements', () => {
    it('should send POST with settlements array and return parsed JSON on success', async () => {
      const settlements = [
        { name: 'Waterdeep', type: 'city' },
        { name: 'Baldur\'s Gate', type: 'city' },
      ];
      const responseData = { success: true, savedCount: 2 };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await saveSettlements('campaign1', settlements);

      expect(result).toEqual(responseData);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/settlements',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settlements }),
        }
      );
    });

    it('should send empty array when settlements is empty', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await saveSettlements('campaign1', []);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/settlements',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ settlements: [] }),
        })
      );
    });

    it('should URL-encode the campaign name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveSettlements('my campaign/1', []);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1/settlements',
        expect.any(Object)
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid settlements data' }),
      });

      await expect(saveSettlements('campaign1', [])).rejects.toThrow('Invalid settlements data');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving settlements:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API error response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(saveSettlements('campaign1', [])).rejects.toThrow('Failed to save settlements');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(saveSettlements('campaign1', [])).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving settlements:', expect.any(Error));
    });
  });

  describe('loadSettlement', () => {
    it('should return a single settlement from API response', async () => {
      const mockSettlement = {
        name: 'Waterdeep',
        type: 'city',
        population: 90000,
        description: 'City of Skilled Hands',
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSettlement),
      });

      const result = await loadSettlement('campaign1', 'Waterdeep');

      expect(result).toEqual(mockSettlement);
    });

    it('should URL-encode both campaign name and settlement name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await loadSettlement('campaign/1', 'settlement/abc');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign%2F1/settlements/settlement%2Fabc',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Settlement not found' }),
      });

      await expect(loadSettlement('campaign1', 'nonexistent')).rejects.toThrow('Settlement not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading settlement:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API error response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(loadSettlement('campaign1', 'nonexistent')).rejects.toThrow('Failed to load settlement');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(loadSettlement('campaign1', 'nonexistent')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading settlement:', expect.any(Error));
    });
  });

  describe('deleteSettlement', () => {
    it('should return parsed JSON body on successful delete', async () => {
      const responseData = { success: true, deleted: 'Waterdeep' };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await deleteSettlement('campaign1', 'Waterdeep');

      expect(result).toEqual(responseData);
    });

    it('should send DELETE request and verify fetch call on success', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deleteSettlement('campaign1', 'Waterdeep');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign1/settlements/Waterdeep',
        { method: 'DELETE' }
      );
    });

    it('should URL-encode both campaign name and settlement name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deleteSettlement('campaign/1', 'settlement/abc');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/campaigns/campaign%2F1/settlements/settlement%2Fabc',
        { method: 'DELETE' }
      );
    });

    it('should call console.error and throw with custom error message on API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Settlement not found' }),
      });

      await expect(deleteSettlement('campaign1', 'nonexistent')).rejects.toThrow('Settlement not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting settlement:', expect.any(Error));
    });

    it('should call console.error and throw generic error when API error response has no error field', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      await expect(deleteSettlement('campaign1', 'nonexistent')).rejects.toThrow('Failed to delete settlement');
    });

    it('should call console.error and rethrow on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(deleteSettlement('campaign1', 'nonexistent')).rejects.toThrow('ENOTFOUND');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting settlement:', expect.any(Error));
    });
  });
});
