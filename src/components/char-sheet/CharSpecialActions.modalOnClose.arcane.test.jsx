// @improved-by-ai
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

describe('CharSpecialActions - Arcane modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('TeleportModal (Blink Steps)', () => {
    it('closes TeleportModal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'teleport',
        payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Blink Steps', description: 'Teleport somewhere.', automation: { type: 'teleport' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText(/Blink Steps/));

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
      });

      expect(within(screen.getByTestId('teleport-modal')).getByText('Blink Steps')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
      });
    });

    it('does not open any modal when no specialActions are defined', async () => {
      const playerStats = createPlayerStats({ specialActions: [] });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      await waitFor(() => {
        expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
      });
      expect(executeHandler).not.toHaveBeenCalled();
    });
  });

  describe('SignatureSpellsModal', () => {
    it('closes SignatureSpellsModal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'signatureSpells',
        payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Signature Spells', description: 'Choose spells.', automation: { type: 'signature_spells' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Signature Spells/));

      await waitFor(() => {
        expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
      });

      expect(within(screen.getByTestId('signature-spells-modal')).getByText('Signature Spells')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
      });
    });

    it('calls onSignatureSpellsSelected when onConfirm is triggered then closes', async () => {
      const { onSignatureSpellsSelected } = await import('../../services/automation/handlers/class-wizard/signatureSpellsHandler.js');

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'signatureSpells',
        payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Signature Spells', description: 'Choose spells.', automation: { type: 'signature_spells' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Signature Spells/));

      await waitFor(() => {
        expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(onSignatureSpellsSelected).toHaveBeenCalledOnce();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('SpellMasteryModal', () => {
    it('closes SpellMasteryModal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Spell Mastery/));

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });

      expect(within(screen.getByTestId('spell-mastery-modal')).getByText('Spell Mastery')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
      });
    });

    it('calls onSpellMasterySelected when onConfirm is triggered then closes', async () => {
      const { onSpellMasterySelected } = await import('../../services/automation/handlers/class-wizard/spellMasteryHandler.js');

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'spellMastery',
        payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Spell Mastery', description: 'Choose spells.', automation: { type: 'spell_mastery' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Spell Mastery/));

      await waitFor(() => {
        expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(onSpellMasterySelected).toHaveBeenCalledOnce();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('SavantModal (Evocation Savant)', () => {
    it('closes SavantModal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'EvocationSavant',
        payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Evocation Savant', description: 'Choose spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Evocation Savant/));

      await waitFor(() => {
        expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
      });

      expect(within(screen.getByTestId('evocation-savant-modal')).getByText('Evocation Savant')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
      });
    });

    it('calls onSavantSelected when onConfirm is triggered then closes', async () => {
      const { onSavantSelected } = await import('../../services/automation/handlers/class-wizard/SavantHandler.js');

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'EvocationSavant',
        payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Evocation Savant', description: 'Choose spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getByText(/Evocation Savant/));

      await waitFor(() => {
        expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(onSavantSelected).toHaveBeenCalledOnce();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Interaction ordering', () => {
    it('opens a different arcane modal after closing the previous one', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'teleport',
        payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Blink Steps', description: 'Teleport somewhere.', automation: { type: 'teleport' } },
          { name: 'Signature Spells', description: 'Choose spells.', automation: { type: 'signature_spells' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // Open first modal
      fireEvent.click(screen.getByText(/Blink Steps/));
      await waitFor(() => {
        expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
      });

      // Close first modal
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
      });

      // Set up mock for the second action
      executeHandler.mockResolvedValueOnce({
        type: 'modal',
        modalName: 'signatureSpells',
        payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      // Open second modal
      fireEvent.click(screen.getByText(/Signature Spells/));
      await waitFor(() => {
        expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
      });
    });

    it('calls executeHandler once per action click', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'teleport',
        payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Blink Steps', description: 'Teleport somewhere.', automation: { type: 'teleport' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText(/Blink Steps/));

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      // Close the modal
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
      });

      // Re-click should call executeHandler again
      fireEvent.click(screen.getByText(/Blink Steps/));

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(2);
      });
    });
  });
});
