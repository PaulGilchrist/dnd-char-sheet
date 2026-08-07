import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useWizardFeatAbilityChoices from './useWizardFeatAbilityChoices.js';

vi.mock('../../services/character/featBuffService.js', () => ({
  computeAllFeatBuffs: vi.fn(),
}));

import { computeAllFeatBuffs } from '../../services/character/featBuffService.js';

describe('useWizardFeatAbilityChoices - recompute and interface', () => {
  const mockSetFormData = vi.fn();

  const createBaseFormData = (overrides = {}) => ({
    rules: '5e',
    feats: [],
    abilities: [
      { name: 'Strength', featIncrease: 0 },
      { name: 'Dexterity', featIncrease: 0 },
      { name: 'Constitution', featIncrease: 0 },
      { name: 'Intelligence', featIncrease: 0 },
      { name: 'Wisdom', featIncrease: 0 },
      { name: 'Charisma', featIncrease: 0 },
    ],
    ...overrides,
  });

  const createMockAllFeats = (names = ['Tough', 'Observant']) =>
    names.map((name) => ({ name, benefits: [] }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetFormData.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        return fn(mockSetFormData.lastFormData || {});
      }
    });
  });

  describe('recomputeFeatIncreases behavior via handlers', () => {
    it('applies choice group increases correctly for single mode', () => {
      computeAllFeatBuffs.mockReturnValue({
        abilityScoreIncreases: [
          {
            name: 'any',
            amount: [1, 2],
            isChoice: true,
            description: 'Choose one ability score from: Strength, Dexterity',
            featName: 'Custom',
          },
        ],
      });

      const formData = createBaseFormData({
        feats: ['Custom'],
        featAbilityChoices: {
          'Custom-0': {
            mode: 'single',
            assignments: { single: 'Dexterity', dual: ['', ''] },
          },
        },
      });
      renderHook(() =>
        useWizardFeatAbilityChoices(formData, createMockAllFeats(['Custom']), mockSetFormData)
      );

      const callFn = mockSetFormData.mock.calls[mockSetFormData.mock.calls.length - 1][0];
      const finalData = typeof callFn === 'function' ? callFn(mockSetFormData.lastFormData || {}) : mockSetFormData.lastFormData;
      expect(finalData.abilities.find(a => a.name === 'Dexterity').featIncrease).toBe(2);
    });

    it('applies choice group increases correctly for dual mode', () => {
      computeAllFeatBuffs.mockReturnValue({
        abilityScoreIncreases: [
          {
            name: 'any',
            amount: [1, 2],
            isChoice: true,
            description: 'Choose one ability score from: Strength, Dexterity, Constitution',
            featName: 'Custom',
          },
        ],
      });

      const formData = createBaseFormData({
        feats: ['Custom'],
        featAbilityChoices: {
          'Custom-0': {
            mode: 'dual',
            assignments: { single: 'Strength', dual: ['Dexterity', 'Constitution'] },
          },
        },
      });
      renderHook(() =>
        useWizardFeatAbilityChoices(formData, createMockAllFeats(['Custom']), mockSetFormData)
      );

      const callFn = mockSetFormData.mock.calls[mockSetFormData.mock.calls.length - 1][0];
      const finalData = typeof callFn === 'function' ? callFn(mockSetFormData.lastFormData || {}) : mockSetFormData.lastFormData;
      // In dual mode, each ability gets +1
      expect(finalData.abilities.find(a => a.name === 'Dexterity').featIncrease).toBe(1);
      expect(finalData.abilities.find(a => a.name === 'Constitution').featIncrease).toBe(1);
    });

    it('applies fixed group increases', () => {
      computeAllFeatBuffs.mockReturnValue({
        abilityScoreIncreases: [
          {
            name: 'any',
            amount: 1,
            isChoice: true,
            description: 'Increase your Intelligence score',
            featName: 'Tough',
          },
        ],
      });

      const formData = createBaseFormData({
        feats: ['Tough'],
        featAbilityChoices: { 'Tough-0': { assignment: 'Intelligence' } },
      });
      renderHook(() =>
        useWizardFeatAbilityChoices(formData, createMockAllFeats(), mockSetFormData)
      );

      const callFn = mockSetFormData.mock.calls[mockSetFormData.mock.calls.length - 1][0];
      const finalData = typeof callFn === 'function' ? callFn(mockSetFormData.lastFormData || {}) : mockSetFormData.lastFormData;
      expect(finalData.abilities.find(a => a.name === 'Intelligence').featIncrease).toBe(1);
    });
  });

  describe('returned interface', () => {
    it('returns featAbilityChoices array', () => {
      const formData = createBaseFormData({ feats: [] });
      const { result } = renderHook(() =>
        useWizardFeatAbilityChoices(formData, [], mockSetFormData)
      );
      expect(typeof result.current.featAbilityChoices).toBe('object');
    });

    it('returns handleFeatAbilityChoice function', () => {
      const formData = createBaseFormData({ feats: [] });
      const { result } = renderHook(() =>
        useWizardFeatAbilityChoices(formData, [], mockSetFormData)
      );
      expect(typeof result.current.handleFeatAbilityChoice).toBe('function');
    });

    it('returns handleFeatAbilityModeChange function', () => {
      const formData = createBaseFormData({ feats: [] });
      const { result } = renderHook(() =>
        useWizardFeatAbilityChoices(formData, [], mockSetFormData)
      );
      expect(typeof result.current.handleFeatAbilityModeChange).toBe('function');
    });
  });
});
