// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './CharSpecialActions.modalMocks.jsx';
import CharSpecialActions from './CharSpecialActions.jsx';
import { executeHandler } from '../../services/automation/index.js';
import { applyTypeChoice } from '../../services/automation/handlers/reactions/boonOfEnergyResistanceHandler.js';
import { mockRuntimeStore } from './CharSpecialActions.modalMocks.jsx';

const basePlayerStats = {
  name: 'TestCharacter',
  specialActions: [],
  class: {
    fightingStyles: [],
  },
  actions: [],
  bonusActions: [],
  reactions: [],
  characterAdvancement: [],
  proficiency: 2,
};

function createPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

function createSpecialAction(name, automation) {
  return { name, description: `${name} description.`, automation };
}

describe('CharSpecialActions - MultiResistance Confirm Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('boonOfEnergyResistance modal confirm', () => {
    it('calls applyTypeChoice and shows popup on multiResistance confirm', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'boonOfEnergyResistance',
        payload: {
          action: { name: 'Boon of Energy' },
          damageTypes: ['Fire', 'Cold', 'Lightning'],
          existingTypes: [],
          maxSelections: 2,
          playerStats: basePlayerStats,
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Boon of Energy', { type: 'boon_of_energy_resistance' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByText(/Boon of Energy/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('multi-resistance-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(applyTypeChoice).toHaveBeenCalledOnce();
      });

      expect(mockSetPopupHtml).toHaveBeenCalled();
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Boon of Energy');
      expect(popupCall).toContain('Resistances chosen');
    });

    it('closes multiResistance modal after confirm regardless of result type', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'boonOfEnergyResistance',
        payload: {
          action: { name: 'Boon of Energy' },
          damageTypes: ['Fire', 'Cold'],
          existingTypes: [],
          maxSelections: 2,
          playerStats: basePlayerStats,
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Boon of Energy', { type: 'boon_of_energy_resistance' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Boon of Energy/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('multi-resistance-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('multi-resistance-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - CreatureSelectionModal Skip Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('Replenishing Meal skip', () => {
    it('closes replenishing meal modal when skip is clicked', async () => {
      mockRuntimeStore.replenishingMeals = 2;

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Replenishing Meal', { type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }),
        ],
        automation: {
          passives: [
            { type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' },
          ],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }]} />);

      fireEvent.click(screen.getAllByText(/Replenishing Meal/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bolstering Treats skip', () => {
    it('closes bolstering treats modal when skip is clicked', async () => {
      mockRuntimeStore.chefBolsteringTreats = 2;

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Bolstering Treats', { type: 'temp_hp_buff', craftCount: true }),
        ],
        automation: {
          specialActions: [
            { type: 'temp_hp_buff', name: 'Bolstering Treats' },
          ],
        },
      });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" characters={[{ name: 'Ally1' }]} />);

      fireEvent.click(screen.getAllByText(/Bolstering Treats/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bolstering Performance skip', () => {
    it('closes bolstering performance modal when skip is clicked', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'bolsteringPerformanceTarget',
        payload: {
          action: { name: 'Bolstering Performance' },
          playerStats: basePlayerStats,
          campaignName: 'test',
          creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
          maxTargets: 6,
          tempHp: 5,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Bolstering Performance', { type: 'temp_hp_buff' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Bolstering Performance/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Portent saveType label display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows uppercase saveType label in Portent modal for save events', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'portentDiceChoice',
      payload: {
        targetName: 'Goblin',
        eventType: 'save',
        eventData: { d20: 10, bonus: 3, saveType: 'dexterity' },
        diceOptions: [3, 7],
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Portent', { type: 'portent' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Portent/)[0]);

    await waitFor(() => {
      expect(screen.getByText(/DEXTERITY/)).toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Fiendish Resilience Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SingleResistanceSelectionModal when fiendishResilience modal is set', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'fiendishResilience',
      payload: {
        action: { name: 'Fiendish Resilience' },
        playerStats: basePlayerStats,
        campaignName: 'test',
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Fiendish Resilience', { type: 'fiendish_resilience' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Fiendish Resilience/)[0]);

    await waitFor(() => {
      expect(screen.getByTestId('single-resistance-modal')).toBeInTheDocument();
    });
  });

  it('closes SingleResistanceSelectionModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'fiendishResilience',
      payload: {
        action: { name: 'Fiendish Resilience' },
        playerStats: basePlayerStats,
        campaignName: 'test',
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Fiendish Resilience', { type: 'fiendish_resilience' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Fiendish Resilience/)[0]);

    await waitFor(() => {
      expect(screen.getByTestId('single-resistance-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByTestId('single-resistance-modal')).not.toBeInTheDocument();
    });
  });
});
