import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(),
  fetchBackgroundData: vi.fn(),
  fetchClassData: vi.fn(),
  loadFeatData: vi.fn(),
}));

import useWizardTools from './useWizardTools.js';
import {
  fetchBackgroundData,
  fetchClassData,
  loadFeatData,
  loadEquipment,
} from '../../services/ui/dataLoader.js';

const mockFormData2024 = {
  name: 'Test Character',
  rules: '2024',
  class: { name: 'Bard' },
  race: { name: 'Human' },
  background: 'Acolyte',
  feats: ['Skilled'],
  level: 1,
  toolProficiencies: [],
};

describe('useWizardTools - getFn coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchBackgroundData.mockResolvedValue({ tool_proficiencies: "Calligrapher's Supplies" });
    fetchClassData.mockResolvedValue({ tool_proficiencies: 'Choose 3 Musical Instruments (see chapter 6)' });
    loadFeatData.mockResolvedValue([]);
    loadEquipment.mockResolvedValue([]);
  });

  it('calls getToolLimitsByCategory via getFn and returns preSelected items', async () => {
    const mockSetFormData = vi.fn();
    const { result } = renderHook(() => useWizardTools(mockFormData2024, mockSetFormData));

    await waitFor(() => {
      expect(result.current.preSelectedTools).toBeDefined();
    });

    expect(fetchBackgroundData).toHaveBeenCalledWith('Acolyte', '2024');
    expect(fetchClassData).toHaveBeenCalledWith('Bard', '2024');
    expect(loadFeatData).toHaveBeenCalledWith('2024');
  });

  it('returns empty preSelectedTools when no tools are pre-selected', async () => {
    fetchBackgroundData.mockResolvedValue(null);
    fetchClassData.mockResolvedValue(null);
    loadFeatData.mockResolvedValue([]);

    const { result } = renderHook(() => useWizardTools(mockFormData2024, vi.fn()));

    await waitFor(() => {
      expect(result.current.preSelectedTools).toEqual([]);
    });
  });

  it('returns warnings from validateTools', async () => {
    const mockSetFormData = vi.fn();
    const { result } = renderHook(() => useWizardTools(mockFormData2024, mockSetFormData));

    await waitFor(() => {
      expect(result.current.toolWarnings).toBeDefined();
    });
    expect(Array.isArray(result.current.toolWarnings)).toBe(true);
  });

  it('returns toolLimits with categoryLimits, preSelected, and skilledUsesAvailable', async () => {
    const { result } = renderHook(() => useWizardTools(mockFormData2024, vi.fn()));

    await waitFor(() => {
      expect(result.current.toolLimits).toBeDefined();
      expect(result.current.toolLimits).not.toBeNull();
    }, { timeout: 5000 });
    expect(result.current.toolLimits).toHaveProperty('categoryLimits');
    expect(result.current.toolLimits).toHaveProperty('preSelected');
    expect(result.current.toolLimits).toHaveProperty('skilledUsesAvailable');
  });
});
