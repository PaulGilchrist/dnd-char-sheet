// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeathSavingThrows from './DeathSavingThrows.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
  clearDeathSavePrompt: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/deathSaveRules.js', () => ({
  isStable: vi.fn(() => false),
  isDead: vi.fn(() => false),
  rollDeathSave: vi.fn(),
  rollDeathSaveWithAdvantage: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/conditionEffects.js', () => ({
  hasSaveModifier: vi.fn(() => false),
  hasBeaconOfHope: vi.fn(() => false),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import * as deathSaveRules from '../../../services/combat/conditions/deathSaveRules.js';
import * as conditionEffects from '../../../services/combat/conditions/conditionEffects.js';
import { addEntry } from '../../../services/ui/logService.js';
import * as savePromptService from '../../../services/combat/conditions/savePromptService.js';

describe('DeathSavingThrows', () => {
  const mockPlayerStats = {
    name: 'Test Character',
  };

  const mockCampaignName = 'test-campaign';

  const defaultRollResult = {
    roll: 15,
    result: 'success',
    isNat20: false,
    isNat1: false,
    newSaves: [true, false, false],
    newFailures: [false, false, false],
    restoredToHp: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(null);
    deathSaveRules.isStable.mockReturnValue(false);
    deathSaveRules.isDead.mockReturnValue(false);
    deathSaveRules.rollDeathSave.mockReturnValue(defaultRollResult);
    deathSaveRules.rollDeathSaveWithAdvantage.mockReturnValue(defaultRollResult);
    conditionEffects.hasSaveModifier.mockReturnValue(false);
    conditionEffects.hasBeaconOfHope.mockReturnValue(false);
  });

  function renderComponent(props = {}) {
    return render(
      <DeathSavingThrows playerStats={mockPlayerStats} campaignName={mockCampaignName} {...props} />
    );
  }

  describe('rendering', () => {
    it('renders the death saves title', () => {
      renderComponent();
      expect(screen.getByText('Death Saves')).toBeInTheDocument();
    });

    it('renders three empty circles for initial saves and failures', () => {
      renderComponent();
      const successTrack = screen.getByText(/Successes:/).parentElement;
      const failureTrack = screen.getByText(/Failures:/).parentElement;
      expect(successTrack.textContent).toContain('◯◯◯');
      expect(failureTrack.textContent).toContain('◯◯◯');
    });

    it('renders three filled circles when saves are already tracked via event', async () => {
      renderComponent();

      // Simulate receiving a death-save-result event that fills the saves
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('death-save-result', {
            detail: {
              targetName: 'Test Character',
              roll: 15,
              success: true,
              isNat20: false,
              isNat1: false,
              newSaves: [true, true, false],
              newFailures: [false, false, false],
            },
          })
        );
      });

      const successTrack = screen.getByText(/Successes:/).parentElement;
      expect(successTrack.textContent).toContain('⬤⬤◯');
    });

    it('shows "Stable" text and hides roll button when stable', () => {
      deathSaveRules.isStable.mockReturnValue(true);
      renderComponent();
      expect(screen.getByText('Stable')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
    });

    it('shows "Dead" text and hides roll button when 3 failures reached', () => {
      deathSaveRules.isStable.mockReturnValue(false);
      deathSaveRules.isDead.mockReturnValue(true);
      renderComponent();
      expect(screen.getByText('Dead')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
    });

    it('shows roll button when not stable and not dead', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /roll/i })).toBeInTheDocument();
    });

    it('shows "DEAD" badge when isDead tracked resource is set', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('DEAD')).toBeInTheDocument();
      });
      expect(screen.queryByText('Death Saves')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
    });

    it('does not show DEAD remove button when not localhost', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent({ isLocalhost: false });
      await waitFor(() => {
        expect(screen.getByText('DEAD')).toBeInTheDocument();
      });
      expect(screen.queryByTitle('Resurrect character')).not.toBeInTheDocument();
    });

    it('shows DEAD remove button when localhost', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent({ isLocalhost: true });
      await waitFor(() => {
        expect(screen.getByText('DEAD')).toBeInTheDocument();
        expect(screen.getByTitle('Resurrect character')).toBeInTheDocument();
      });
    });

    it('shows "ADVANTAGE" text when player has death save advantage', () => {
      deathSaveRules.isStable.mockReturnValue(false);
      deathSaveRules.isDead.mockReturnValue(false);
      conditionEffects.hasSaveModifier.mockReturnValue(true);

      renderComponent();

      expect(screen.getByText('ADVANTAGE')).toBeInTheDocument();
    });

    it('does not show "ADVANTAGE" text when player has no advantage', () => {
      renderComponent();
      expect(screen.queryByText('ADVANTAGE')).not.toBeInTheDocument();
    });
  });

  describe('rolling death saves', () => {
    it.each([
      ['success', 'Success', { result: 'success', newSaves: [true, false, false], newFailures: [false, false, false] }],
      ['failure', 'Failure', { result: 'failure', newSaves: [false, false, false], newFailures: [true, false, false] }],
    ])('updates %s circles and result label after a roll', async (_label, resultLabel, rollOverride) => {
      deathSaveRules.rollDeathSave.mockReturnValue({ ...defaultRollResult, ...rollOverride });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        const successTrack = screen.getByText(/Successes:/).parentElement;
        const failureTrack = screen.getByText(/Failures:/).parentElement;
        expect(rollOverride.newSaves[0] ? successTrack.textContent : failureTrack.textContent).toContain('⬤◯◯');
        expect(screen.getByText(resultLabel)).toBeInTheDocument();
      });
    });

    it('shows NAT 20 indicator on a natural 20 roll', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        ...defaultRollResult,
        roll: 20,
        result: 'nat20',
        isNat20: true,
        restoredToHp: 1,
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(screen.getByText('NAT 20')).toBeInTheDocument();
      });
    });

    it('restores to 1 HP on natural 20', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        roll: 20,
        result: 'nat20',
        isNat20: true,
        isNat1: false,
        newSaves: [false, false, false],
        newFailures: [false, false, false],
        restoredToHp: 1,
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'Test Character',
          'currentHitPoints',
          1,
          mockCampaignName
        );
      });
    });

    it('shows NAT 1 indicator and applies double failure on a natural 1 roll', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        roll: 1,
        result: 'failure',
        isNat20: false,
        isNat1: true,
        newSaves: [false, false, false],
        newFailures: [true, true, false],
        restoredToHp: null,
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(screen.getByText('NAT 1')).toBeInTheDocument();
        const failureTrack = screen.getByText(/Failures:/).parentElement;
        expect(failureTrack.textContent).toContain('⬤⬤◯');
      });
    });

    it('logs totalSuccesses and totalFailures with each roll', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        ...defaultRollResult,
        result: 'success',
        newSaves: [true, true, false],
        newFailures: [true, false, false],
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
          type: 'death_save',
          totalSuccesses: 2,
          totalFailures: 1,
        }));
      });
    });

    it('logs stable result and heals to 1 HP after delay when 3 successes reached', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        roll: 12,
        result: 'stable',
        isNat20: false,
        isNat1: false,
        newSaves: [true, true, true],
        newFailures: [true, false, false],
        restoredToHp: null,
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
          type: 'death_save',
          result: 'stable',
          totalSuccesses: 3,
        }));
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1600));
      });

      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'currentHitPoints', 1, mockCampaignName);
    });

    it('logs dead result and sets isDead tracked resource when 3 failures reached', async () => {
      deathSaveRules.isDead.mockReturnValue(false);
      deathSaveRules.rollDeathSave.mockReturnValue({
        roll: 5,
        result: 'dead',
        isNat20: false,
        isNat1: false,
        newSaves: [false, false, false],
        newFailures: [true, true, true],
        restoredToHp: null,
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
          type: 'death_save',
          result: 'dead',
          totalFailures: 3,
        }));
      });

      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'isDead', 1, mockCampaignName);
    });

    it('rolls with advantage when player has death save advantage', () => {
      conditionEffects.hasSaveModifier.mockReturnValue(true);

      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      expect(deathSaveRules.rollDeathSaveWithAdvantage).toHaveBeenCalled();
      expect(deathSaveRules.rollDeathSave).not.toHaveBeenCalled();
    });

    it('rolls without advantage when player has no death save advantage', () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      expect(deathSaveRules.rollDeathSave).toHaveBeenCalled();
      expect(deathSaveRules.rollDeathSaveWithAdvantage).not.toHaveBeenCalled();
    });

    it('does not roll when already stable', () => {
      deathSaveRules.isStable.mockReturnValue(true);
      renderComponent();

      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
      expect(deathSaveRules.rollDeathSave).not.toHaveBeenCalled();
    });

    it('does not roll when already dead (3 failures)', () => {
      deathSaveRules.isDead.mockReturnValue(true);
      renderComponent();

      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
      expect(deathSaveRules.rollDeathSave).not.toHaveBeenCalled();
    });

    it('does not roll when isDead state is already set', () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent();

      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument();
    });

    it('passes current saves and failures arrays to the roll function', () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      expect(deathSaveRules.rollDeathSave).toHaveBeenCalledWith(
        [false, false, false],
        [false, false, false],
        false
      );
    });

    it('passes treat18AsNat20 option when player has the automation passive', () => {
      const playerStatsWithPassive = {
        ...mockPlayerStats,
        automation: {
          passives: [
            { type: 'passive_rule', effect: 'death_save_nat18_as_20' },
          ],
        },
      };
      renderComponent({ playerStats: playerStatsWithPassive });
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      expect(deathSaveRules.rollDeathSave).toHaveBeenCalledWith(
        [false, false, false],
        [false, false, false],
        true
      );
    });

    it('clears death save prompt after rolling', () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      expect(savePromptService.clearDeathSavePrompt).toHaveBeenCalledWith(mockCampaignName, 'Test Character');
    });
  });

  describe('DEAD badge removal', () => {
    it('removes isDead and resets death saves when GM clicks remove button', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent({ isLocalhost: true });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Resurrect character'));
      });

      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'isDead', 0, mockCampaignName);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'deathSaves', [false, false, false], mockCampaignName);
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'deathFailures', [false, false, false], mockCampaignName);

      expect(screen.queryByText('DEAD')).not.toBeInTheDocument();
      expect(screen.getByText('Death Saves')).toBeInTheDocument();
    });

    it('logs the death save removal', async () => {
      getRuntimeValue.mockImplementation((name, prop) => {
        if (prop === 'isDead') return 1;
        return null;
      });
      renderComponent({ isLocalhost: true });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Resurrect character'));
      });

      expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
        type: 'death_save',
        result: 'removed',
        totalSuccesses: 0,
        totalFailures: 0,
      }));
    });
  });

  describe('custom event handling', () => {
    it('updates saves and failures from a death-save-result event for this character', async () => {
      renderComponent();

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('death-save-result', {
            detail: {
              targetName: 'Test Character',
              roll: 18,
              success: true,
              isNat20: false,
              isNat1: false,
              newSaves: [true, true, false],
              newFailures: [false, false, false],
            },
          })
        );
      });

      const successTrack = screen.getByText(/Successes:/).parentElement;
      expect(successTrack.textContent).toContain('⬤⬤◯');
    });

    it('ignores a death-save-result event for a different character', () => {
      renderComponent();

      window.dispatchEvent(
        new CustomEvent('death-save-result', {
          detail: {
            targetName: 'Other Character',
            roll: 20,
            success: true,
            isNat20: true,
            isNat1: false,
            newSaves: [true, true, true],
            newFailures: [true, true, true],
          },
        })
      );

      const successTrack = screen.getByText(/Successes:/).parentElement;
      expect(successTrack.textContent).toContain('◯◯◯');
    });

    it('sets isDead state when receiving a dead result via SSE event', async () => {
      renderComponent();

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('death-save-result', {
            detail: {
              targetName: 'Test Character',
              roll: 3,
              success: false,
              isNat20: false,
              isNat1: false,
              newSaves: [false, false, false],
              newFailures: [true, true, true],
              result: 'dead',
            },
          })
        );
      });

      expect(screen.getByText('DEAD')).toBeInTheDocument();
    });

    it('clears the last roll result after 2 seconds', async () => {
      deathSaveRules.rollDeathSave.mockReturnValue({
        ...defaultRollResult,
        result: 'success',
        newSaves: [true, false, false],
        newFailures: [false, false, false],
      });
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /roll/i }));

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2100));
      });

      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });
});
