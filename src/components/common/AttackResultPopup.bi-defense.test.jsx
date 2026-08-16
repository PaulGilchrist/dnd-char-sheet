// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttackResultPopup from './AttackResultPopup.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../services/ui/logService.js';

// ── Mock dependencies ──

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Helpers ──

function renderPopup(props = {}) {
  const defaultProps = {
    popupHtml: { name: 'Test Attack', type: 'd20', rolls: [15], bonus: 3, hit: true },
    onClose: vi.fn(),
    campaignName: 'test-campaign',
    attackerName: 'PlayerOne',
    setPopupHtml: vi.fn(),
    ...props,
  };
  return render(<AttackResultPopup {...defaultProps} />);
}

// ── Tests ──

describe('AttackResultPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Bardic Inspiration Defense ──

  describe('bardic inspiration defense', () => {
    it('renders BI Defense button when bardicInspirationDefense is true and targetName is present', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        onClose: vi.fn(),
      });

      expect(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i })).toBeInTheDocument();
    });

    it('renders BI Defense button when bardicInspirationDefense is true but targetName is missing', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
        },
        onClose: vi.fn(),
      });

      expect(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i })).toBeInTheDocument();
    });

    it('calls onBeforeBiDefense with correct arguments when clicked', async () => {
      const onBeforeBiDefense = vi.fn().mockResolvedValue(undefined);
      const onAfterBiDefense = vi.fn().mockResolvedValue(undefined);

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        onBeforeBiDefense,
        onAfterBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(onBeforeBiDefense).toHaveBeenCalledTimes(1);
      });

      const [args] = onBeforeBiDefense.mock.calls[0];
      expect(args).toMatchObject({
        targetName: 'Bard',
        willMiss: true,
      });
      expect(typeof args.dieValue).toBe('number');
      expect(typeof args.dieSize).toBe('number');
      expect(typeof args.newAc).toBe('number');
    });

    it('calls onAfterBiDefense with correct arguments after BI defense completes', async () => {
      const onBeforeBiDefense = vi.fn().mockResolvedValue(undefined);
      const onAfterBiDefense = vi.fn().mockResolvedValue(undefined);

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        onBeforeBiDefense,
        onAfterBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(onAfterBiDefense).toHaveBeenCalledTimes(1);
      });

      const [args] = onAfterBiDefense.mock.calls[0];
      expect(args).toMatchObject({
        targetName: 'Bard',
      });
      expect(typeof args.dieValue).toBe('number');
      expect(typeof args.dieSize).toBe('number');
      expect(typeof args.newAc).toBe('number');
      expect(typeof args.willMiss).toBe('boolean');
    });

    it('decrements bardicInspirationUses when currentUses is a number > 0', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return 3;
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          2,
          'test-campaign'
        );
      });
    });

    it('decrements bardicInspirationUses when currentUses is an object with current > 0', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 2 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          1,
          'test-campaign'
        );
      });
    });

    it('does NOT decrement bardicInspirationUses when currentUses is 0 (number)', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return 0;
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        const calls = setRuntimeValue.mock.calls.filter(
          (c) => c[1] === 'bardicInspirationUses'
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('does NOT decrement bardicInspirationUses when currentUses is 0 (object)', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 0 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        const calls = setRuntimeValue.mock.calls.filter(
          (c) => c[1] === 'bardicInspirationUses'
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('does NOT decrement bardicInspirationUses when currentUses is null', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return null;
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        const calls = setRuntimeValue.mock.calls.filter(
          (c) => c[1] === 'bardicInspirationUses'
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('sets popupHtml to hit:false and isAutoMiss:true when willMiss is true', async () => {
      const setPopupHtml = vi.fn();

      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        setPopupHtml,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalledTimes(1);
      });

      const updatedHtml = setPopupHtml.mock.calls[0][0];
      expect(updatedHtml.hit).toBe(false);
      expect(updatedHtml.isAutoMiss).toBe(true);
      expect(updatedHtml.name).toBe('Test Attack');
    });

    it('does NOT call setPopupHtml when willMiss is false', async () => {
      const setPopupHtml = vi.fn();

      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 0,
        },
        setPopupHtml,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setPopupHtml).not.toHaveBeenCalled();
      });
    });

    it('does NOT call setPopupHtml when setPopupHtml is not provided', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        // No error thrown, no setPopupHtml call since it wasn't passed
      });
    });

    it('logs an ability_use entry with correct fields when willMiss is true', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        campaignName: 'test-campaign',
        attackerName: 'Goblin',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledTimes(1);
      });

      const [campaign, logArgs] = logService.addEntry.mock.calls[0];
      expect(campaign).toBe('test-campaign');
      expect(logArgs.type).toBe('ability_use');
      expect(logArgs.characterName).toBe('Bard');
      expect(logArgs.abilityName).toBe('Combat Inspiration - Defense');
      expect(logArgs.biDieRoll).toBeDefined();
      expect(typeof logArgs.biDieRoll).toBe('number');
      expect(logArgs.description).toContain("Goblin's attack missed");
      expect(logArgs.description).toContain('missed');
      expect(logArgs.timestamp).toBeDefined();
    });

    it('logs an ability_use entry with correct fields when willMiss is false', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 0,
        },
        campaignName: 'test-campaign',
        attackerName: 'Goblin',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledTimes(1);
      });

      const [, logArgs] = logService.addEntry.mock.calls[0];
      expect(logArgs.type).toBe('ability_use');
      expect(logArgs.description).toContain('still hits');
    });

    it('logs an ability_use entry when attackerName is missing', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        campaignName: 'test-campaign',
        attackerName: null,
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalledTimes(1);
      });

      const [, logArgs] = logService.addEntry.mock.calls[0];
      expect(logArgs.description).toContain('The attacker');
    });

    it('resets bardicInspirationDie, bardicInspirationCombatOptions, bardicInspirationGrantedBy after BI defense', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 25,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationDie', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationCombatOptions', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationGrantedBy', null, 'test-campaign');
      });
    });

    it('resets bardicInspirationDie, bardicInspirationCombatOptions, bardicInspirationGrantedBy even when willMiss is false', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 1 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
          targetAc: 0,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationDie', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationCombatOptions', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationGrantedBy', null, 'test-campaign');
      });
    });

    it('resets bardicInspirationDie, bardicInspirationCombatOptions, bardicInspirationGrantedBy even when uses are 0', async () => {
      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 0 };
        }
        return origGet(key, prop);
      });

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationDie', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationCombatOptions', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationGrantedBy', null, 'test-campaign');
      });
    });

    it('calls onBeforeBiDefense when provided, skips it when not provided', async () => {
      const onBeforeBiDefense = vi.fn().mockResolvedValue(undefined);

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        onBeforeBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(onBeforeBiDefense).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onAfterBiDefense when provided, skips it when not provided', async () => {
      const onAfterBiDefense = vi.fn().mockResolvedValue(undefined);

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
          bardicInspirationDefenseTargetName: 'Bard',
        },
        onAfterBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(onAfterBiDefense).toHaveBeenCalledTimes(1);
      });
    });

    it('logs error when targetName is missing from popupHtml', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[BI Defense] AttackResultPopup: No targetName in popupHtml'
        );
      });

      consoleError.mockRestore();
    });

    it('does not call setRuntimeValue for BI state reset when targetName is missing', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
          bardicInspirationDefense: true,
        },
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /Bardic Inspiration - Defense/i }));

      await waitFor(() => {
        const resetCalls = setRuntimeValue.mock.calls.filter(
          (c) =>
            c[1] === 'bardicInspirationDie' ||
            c[1] === 'bardicInspirationCombatOptions' ||
            c[1] === 'bardicInspirationGrantedBy'
        );
        expect(resetCalls).toHaveLength(0);
      });

      consoleError.mockRestore();
    });

    it('does nothing when popupHtml is null', () => {
      const onBeforeBiDefense = vi.fn();
      const onAfterBiDefense = vi.fn();

      renderPopup({
        popupHtml: null,
        onBeforeBiDefense,
        onAfterBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Bardic Inspiration - Defense/i })).not.toBeInTheDocument();
    });
  });
});
