// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './CharSpecialActions.modalMocks.jsx';
import CharSpecialActions from './CharSpecialActions.jsx';
import { executeHandler } from '../../services/automation/index.js';
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

function openModal(playerStats, actionName, modalName, campaignName = 'test') {
  executeHandler.mockResolvedValue({
    type: 'modal',
    modalName,
    payload: { action: { name: actionName }, playerStats, campaignName },
  });

  render(<CharSpecialActions playerStats={playerStats} campaignName={campaignName} />);
  fireEvent.click(screen.getByText(new RegExp(actionName)));
}

describe('CharSpecialActions - Combat feature modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('Quivering Palm modal onClose', () => {
    it('closes the modal when onClose is called', async () => {
      openModal(
        createPlayerStats({
          specialActions: [
            { name: 'Quivering Palm', description: 'Palm of quivering.', automation: { type: 'quivering_palm' } },
          ],
        }),
        'Quivering Palm',
        'quiveringPalm'
      );

      await waitFor(() => {
        expect(screen.getByTestId('quivering-palm-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('quivering-palm-modal')).not.toBeInTheDocument();
      });
    });

    it('does not open the modal when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'quiveringPalm',
        payload: { action: { name: 'Quivering Palm' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Quivering Palm', description: 'Palm of quivering.', automation: { type: 'quivering_palm' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText(/Quivering Palm/));

      await waitFor(() => {
        expect(screen.queryByTestId('quivering-palm-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Steps of the Fey Taunt modal onClose', () => {
    it('closes the modal when onClose is called', async () => {
      openModal(
        createPlayerStats({
          specialActions: [
            { name: 'Steps of the Fey Taunt', description: 'Taunt with fey steps.', automation: { type: 'steps_of_the_fey_taunt' } },
          ],
        }),
        'Steps of the Fey Taunt',
        'stepsOfTheFeyTaunt'
      );

      await waitFor(() => {
        expect(screen.getByTestId('steps-of-the-fey-taunt-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('steps-of-the-fey-taunt-modal')).not.toBeInTheDocument();
      });
    });

    it('does not open the modal when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'stepsOfTheFeyTaunt',
        payload: { action: { name: 'Steps of the Fey Taunt' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Steps of the Fey Taunt', description: 'Taunt with fey steps.', automation: { type: 'steps_of_the_fey_taunt' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText(/Steps of the Fey Taunt/));

      await waitFor(() => {
        expect(screen.queryByTestId('steps-of-the-fey-taunt-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Hurl Through Hell modal onClose', () => {
    it('closes the modal when onClose is called', async () => {
      openModal(
        createPlayerStats({
          specialActions: [
            { name: 'Hurl Through Hell', description: 'Hurl to hell.', automation: { type: 'hurl_through_hell' } },
          ],
        }),
        'Hurl Through Hell',
        'hurlThroughHell'
      );

      await waitFor(() => {
        expect(screen.getByTestId('hurl-through-hell-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('hurl-through-hell-modal')).not.toBeInTheDocument();
      });
    });

    it('does not open the modal when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'hurlThroughHell',
        payload: { action: { name: 'Hurl Through Hell' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Hurl Through Hell', description: 'Hurl to hell.', automation: { type: 'hurl_through_hell' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText(/Hurl Through Hell/));

      await waitFor(() => {
        expect(screen.queryByTestId('hurl-through-hell-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Clairvoyant Combatant modal onClose', () => {
    it('closes the modal when onClose is called', async () => {
      openModal(
        createPlayerStats({
          specialActions: [
            { name: 'Clairvoyant Combatant', description: 'Combat clairvoyantly.', automation: { type: 'clairvoyant_combatant' } },
          ],
        }),
        'Clairvoyant Combatant',
        'clairvoyantCombatant'
      );

      await waitFor(() => {
        expect(screen.getByTestId('clairvoyant-combatant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('clairvoyant-combatant-modal')).not.toBeInTheDocument();
      });
    });

    it('does not open the modal when cannotAct is true', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'clairvoyantCombatant',
        payload: { action: { name: 'Clairvoyant Combatant' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Clairvoyant Combatant', description: 'Combat clairvoyantly.', automation: { type: 'clairvoyant_combatant' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getByText(/Clairvoyant Combatant/));

      await waitFor(() => {
        expect(screen.queryByTestId('clairvoyant-combatant-modal')).not.toBeInTheDocument();
      });
    });
  });
});
