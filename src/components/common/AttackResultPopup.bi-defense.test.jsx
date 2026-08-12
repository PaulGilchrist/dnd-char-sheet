// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Bardic Inspiration Defense ──

  describe('bardic inspiration defense', () => {
    it('passes onBardicInspirationDefense handler when bardicInspirationDefense prop is present', () => {
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

    it('does NOT show BI Defense button when bardicInspirationDefense prop is absent', () => {
      renderPopup({
        popupHtml: {
          name: 'Test Attack',
          type: 'd20',
          rolls: [18],
          bonus: 3,
          hit: true,
        },
        onClose: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: /Bardic Inspiration - Defense/i })).not.toBeInTheDocument();
    });

    it('calls onBeforeBiDefense before modifying runtime state', async () => {
      const onBeforeBiDefense = vi.fn().mockResolvedValue(undefined);
      const onAfterBiDefense = vi.fn().mockResolvedValue(undefined);
      const setPopupHtml = vi.fn();

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
        setPopupHtml,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      setRuntimeValue.mockResolvedValue(undefined);

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(onBeforeBiDefense).toHaveBeenCalled();
      });

      const callArgs = onBeforeBiDefense.mock.calls[0][0];
      expect(callArgs.targetName).toBe('Bard');
      expect(typeof callArgs.dieValue).toBe('number');
      expect(typeof callArgs.dieSize).toBe('number');
      expect(typeof callArgs.newAc).toBe('number');
      expect(typeof callArgs.willMiss).toBe('boolean');
      expect(callArgs.willMiss).toBe(true);
    });

    it('calls onAfterBiDefense after modifying runtime state', async () => {
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
        },
        onBeforeBiDefense,
        onAfterBiDefense,
        campaignName: 'test-campaign',
        onClose: vi.fn(),
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(onAfterBiDefense).toHaveBeenCalled();
      });

      const callArgs = onAfterBiDefense.mock.calls[0][0];
      expect(callArgs.targetName).toBe('Bard');
    });

    it('decrements bardicInspirationUses when currentUses > 0', async () => {
      setRuntimeValue.mockImplementation(() => Promise.resolve());

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

      const origGet = getRuntimeValue;
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'Bard' && prop === 'bardicInspirationUses') {
          return { current: 2 };
        }
        return origGet(key, prop);
      });

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          1,
          'test-campaign'
        );
      });
    });

    it('does NOT decrement bardicInspirationUses when currentUses is 0', async () => {
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(setRuntimeValue).not.toHaveBeenCalledWith(
          'Bard',
          'bardicInspirationUses',
          expect.any(Number),
          'test-campaign'
        );
      });

      getRuntimeValue.mockRestore = getRuntimeValue.mockRestore || (() => {});
      getRuntimeValue.mockImplementation(origGet);
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(setPopupHtml).toHaveBeenCalled();
      });

      const updatedHtml = setPopupHtml.mock.calls[0][0];
      expect(updatedHtml.hit).toBe(false);
      expect(updatedHtml.isAutoMiss).toBe(true);
    });

    it('does NOT set popupHtml when willMiss is false', async () => {
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await new Promise((r) => setTimeout(r, 200));

      expect(setPopupHtml).not.toHaveBeenCalled();
    });

    it('logs an entry when willMiss is true', async () => {
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalled();
      });

      const logArgs = logService.addEntry.mock.calls[0][1];
      expect(logArgs.type).toBe('ability_use');
      expect(logArgs.characterName).toBe('Bard');
      expect(logArgs.abilityName).toBe('Combat Inspiration - Defense');
      expect(logArgs.biDieRoll).toBeDefined();
      expect(logArgs.description).toContain('missed');
    });

    it('logs an entry when willMiss is false', async () => {
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(logService.addEntry).toHaveBeenCalled();
      });

      const logArgs = logService.addEntry.mock.calls[0][1];
      expect(logArgs.description).toContain('still hits');
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationDie', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationCombatOptions', null, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Bard', 'bardicInspirationGrantedBy', null, 'test-campaign');
      });
    });

    it('logs error and returns early when no bardicInspirationDefenseTargetName in popupHtml', async () => {
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

      const biBtn = screen.getByRole('button', { name: /Bardic Inspiration - Defense/i });
      fireEvent.click(biBtn);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[BI Defense] AttackResultPopup: No targetName in popupHtml'
        );
      });

      consoleError.mockRestore();
    });

    it('does nothing when popupHtml is null and BI defense handler is somehow called', () => {
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
