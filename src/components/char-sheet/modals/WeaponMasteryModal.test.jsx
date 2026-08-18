// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeaponMasteryModal from './WeaponMasteryModal.jsx';

vi.mock('../../../services/automation/handlers/combat/weaponMasteryHandler.js', () => ({
  MASTERY_EFFECTS: {
    Push: { label: 'Push (10 ft)', description: 'Push the creature up to 10 feet straight away from you.', effect: 'push', value: 10 },
    Topple: { label: 'Topple (Prone)', description: 'Force the creature to make a Constitution saving throw or fall Prone.', effect: 'topple', requiresSave: true, saveAbility: 'CON' },
    Sap: { label: 'Disadvantage on Next Attack', description: 'The creature has Disadvantage on its next attack roll.', effect: 'disadvantage_next_attack' },
    Slow: { label: 'Speed -10 ft', description: 'Reduce the creature\'s Speed by 10 feet.', effect: 'speed_reduction', value: 10 },
    Vex: { label: 'Advantage on Next Attack', description: 'You have Advantage on your next attack roll.', effect: 'next_attack_advantage', value: 5 },
    Cleave: { label: 'Cleave (Extra Attack)', description: 'Make a melee attack roll with the weapon against a second creature.', effect: 'cleave' },
    Nick: { label: 'Nick (Extra Attack)', description: 'Make the extra attack of the Light property.', effect: 'nick' },
    Graze: { label: 'Graze (Miss Damage)', description: 'If your attack roll misses, deal damage equal to your ability modifier.', effect: 'graze' },
  },
  applyMasteryEffect: vi.fn(),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
  loadWeaponMasteries: vi.fn(),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

import * as weaponMasteryHandler from '../../../services/automation/handlers/combat/weaponMasteryHandler.js';
import * as useActionPopup from '../../../hooks/combat/useActionPopup.js';
import * as damageUtils from '../../../services/rules/combat/damageUtils.js';

const mockPlayerStats = { name: 'Throg', level: 12, abilities: [{ name: 'CON', bonus: 3 }] };
const mockCampaignName = 'test-campaign';

function makeProps(overrides) {
  return {
    attackName: 'Longsword Attack',
    baseMastery: 'Vex',
    extraMasteries: ['Push'],
    playerStats: mockPlayerStats,
    campaignName: mockCampaignName,
    targetName: 'Goblin',
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

function renderModal(overrides) {
  useActionPopup.loadWeaponMasteries.mockResolvedValue([
    { name: 'Vex', description: 'Gain advantage on next attack.' },
    { name: 'Push', description: 'Push enemy 10 ft away.' },
  ]);
  damageUtils.getCombatContext.mockResolvedValue(null);
  return render(<WeaponMasteryModal {...makeProps(overrides)} />);
}

describe('WeaponMasteryModal', () => {

  describe('initial render', () => {
    it('renders the modal with header, instruction text, and action buttons', () => {
      renderModal();
      expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
      expect(screen.getByText(/Weapon Mastery/)).toBeInTheDocument();
      expect(screen.getByText(/Choose a mastery property to activate/)).toBeInTheDocument();
      expect(screen.getByText(/You can activate one mastery property per hit/)).toBeInTheDocument();
    });

    it('renders the target name in the instruction text when provided', () => {
      renderModal();
      expect(screen.getByText(/against/)).toBeInTheDocument();
      expect(screen.getByText(/Goblin/)).toBeInTheDocument();
    });
  });

  describe('mastery options rendering', () => {
    it('renders radio buttons for each available mastery', () => {
      renderModal();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('renders the base mastery label from MASTERY_EFFECTS', () => {
      renderModal();
      expect(screen.getByText('Advantage on Next Attack')).toBeInTheDocument();
    });

    it('renders extra masteries from the extraMasteries prop', () => {
      renderModal();
      expect(screen.getByText('Push (10 ft)')).toBeInTheDocument();
    });

    it('deduplicates a mastery appearing in both baseMastery and extraMasteries', () => {
      const props = makeProps();
      props.baseMastery = 'Vex';
      props.extraMasteries = ['Vex', 'Push'];
      render(<WeaponMasteryModal {...props} />);
      expect(screen.getAllByText('Advantage on Next Attack')).toHaveLength(1);
    });

    it('marks feature-source masteries with a Feature badge', () => {
      renderModal();
      expect(screen.getByText('Feature')).toBeInTheDocument();
    });

    it('does not mark weapon-source masteries with a Feature badge', () => {
      const props = makeProps();
      props.extraMasteries = [];
      render(<WeaponMasteryModal {...props} />);
      expect(screen.queryByText('Feature')).not.toBeInTheDocument();
    });

    it('falls back to mastery name when MASTERY_EFFECTS has no entry', () => {
      const props = makeProps();
      props.baseMastery = 'CustomMastery';
      props.extraMasteries = [];
      render(<WeaponMasteryModal {...props} />);
      expect(screen.getByText('CustomMastery')).toBeInTheDocument();
    });

    it('renders mastery descriptions loaded from loadWeaponMasteries', async () => {
      useActionPopup.loadWeaponMasteries.mockResolvedValue([
        { name: 'Vex', description: 'Custom Vex description.' },
        { name: 'Push', description: 'Custom Push description.' },
      ]);
      render(<WeaponMasteryModal {...makeProps()} />);
      await screen.findByText('Custom Vex description.');
      await screen.findByText('Custom Push description.');
    });

    it('shows no descriptions when loadWeaponMasteries returns empty data', () => {
      useActionPopup.loadWeaponMasteries.mockResolvedValue([]);
      renderModal();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('renders radio buttons when baseMastery is null and extraMasteries has items', () => {
      renderModal({ baseMastery: null });
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(1);
      expect(screen.getByText('Push (10 ft)')).toBeInTheDocument();
    });
  });

  describe('mastery selection', () => {
    it('has no option selected initially', () => {
      renderModal();
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => expect(radio).not.toBeChecked());
    });

    it('selects a mastery when its radio is clicked', () => {
      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
    });

    it('deselects the previous selection when a different radio is clicked', () => {
      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(radios[1]);
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
    });
  });

  describe('activate button behavior', () => {
    it('is disabled when no mastery is selected', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /Activate/ })).toBeDisabled();
    });

    it('is enabled after selecting a mastery', () => {
      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      expect(screen.getByRole('button', { name: /Activate/ })).not.toBeDisabled();
    });

    it('is disabled when there are no masteries available', () => {
      renderModal({ baseMastery: null, extraMasteries: [] });
      expect(screen.getByRole('button', { name: /Activate/ })).toBeDisabled();
    });

    it('does not call applyMasteryEffect when clicked without a selection', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));
      expect(weaponMasteryHandler.applyMasteryEffect).not.toHaveBeenCalled();
    });

    it('calls applyMasteryEffect with correct arguments when activated', async () => {
      weaponMasteryHandler.applyMasteryEffect.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied to target — you have Advantage on next attack.',
        },
      });

      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));

      expect(weaponMasteryHandler.applyMasteryEffect).toHaveBeenCalledTimes(1);
      const callArgs = weaponMasteryHandler.applyMasteryEffect.mock.calls[0];
      expect(callArgs[0]).toBe('Vex');
      expect(callArgs[1]).toBe(mockPlayerStats);
      expect(callArgs[2]).toBe(mockCampaignName);
    });

    it('passes the target name to applyMasteryEffect', async () => {
      weaponMasteryHandler.applyMasteryEffect.mockResolvedValue(null);

      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));

      expect(weaponMasteryHandler.applyMasteryEffect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        'Goblin'
      );
    });
  });

  describe('applied state', () => {
    async function setupAppliedState(result) {
      weaponMasteryHandler.applyMasteryEffect.mockResolvedValue(result);
      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));
      // Wait for the async state update to complete
      await screen.findByRole('button', { name: 'Done' });
    }

    it('shows the result description after applying', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied to Goblin — you have Advantage on next attack.',
        },
      });
      expect(screen.getByText(/Vex applied/)).toBeInTheDocument();
    });

    it('renders the Done button in applied state', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied.',
        },
      });
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('hides selection options after applying', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied.',
        },
      });
      expect(screen.queryByText(/Choose a mastery property/)).not.toBeInTheDocument();
    });

    it('hides the Activate button after applying', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied.',
        },
      });
      expect(screen.queryByRole('button', { name: /Activate/ })).not.toBeInTheDocument();
    });

    it('hides the Skip button after applying', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied.',
        },
      });
      expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    });

    it('renders the result description with HTML tags preserved', async () => {
      await setupAppliedState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: '<strong>Vex</strong> applied to Goblin.',
        },
      });
      const body = document.querySelector('.sp-body');
      expect(body.innerHTML).toContain('<strong>Vex</strong>');
    });

    it('does not show applied state when result is null', async () => {
      weaponMasteryHandler.applyMasteryEffect.mockResolvedValue(null);
      renderModal();
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when Done button is clicked in applied state', async () => {
      const onClose = vi.fn();
      weaponMasteryHandler.applyMasteryEffect.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Vex',
          description: 'Vex applied.',
        },
      });

      render(<WeaponMasteryModal {...makeProps({ onClose })} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole('button', { name: /Activate/ }));

      await screen.findByText('Done');
      fireEvent.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Skip button is clicked', () => {
      const onClose = vi.fn();
      render(<WeaponMasteryModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking outside the modal overlay', () => {
      const onClose = vi.fn();
      render(<WeaponMasteryModal {...makeProps({ onClose })} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('target name display', () => {
    it('shows target name from auto-detection when targetName prop is not provided', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Throg', targetName: 'Ogre' },
          { name: 'Ogre' },
        ],
      });
      damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Ogre' });

      render(<WeaponMasteryModal
        attackName='Longsword Attack'
        baseMastery='Vex'
        extraMasteries={[]}
        playerStats={mockPlayerStats}
        campaignName={mockCampaignName}
        onClose={vi.fn()}
      />);

      await screen.findByText(/against.*Ogre/);
    });

    it('shows no target reference when targetName is not provided and auto-detection returns null', () => {
      damageUtils.getCombatContext.mockResolvedValue(null);

      render(<WeaponMasteryModal
        attackName='Longsword Attack'
        baseMastery='Vex'
        extraMasteries={[]}
        playerStats={mockPlayerStats}
        campaignName={mockCampaignName}
        onClose={vi.fn()}
      />);

      expect(screen.getByText(/Choose a mastery property to activate:$/)).toBeInTheDocument();
    });
  });

  describe('empty masteries', () => {
    it('renders with no masteries when baseMastery and extraMasteries are null', () => {
      renderModal({ baseMastery: null, extraMasteries: null });
      expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('renders with no masteries when baseMastery is null and extraMasteries is empty', () => {
      renderModal({ baseMastery: null, extraMasteries: [] });
      expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('excludes Graze from masteries regardless of source', () => {
      const props = makeProps();
      props.baseMastery = 'Graze';
      props.extraMasteries = ['Graze', 'Push'];
      render(<WeaponMasteryModal {...props} />);
      expect(screen.queryByText('Graze (Miss Damage)')).not.toBeInTheDocument();
      expect(screen.getByText('Push (10 ft)')).toBeInTheDocument();
    });

    it('shows the activation button but keeps it disabled when masteries are empty', () => {
      renderModal({ baseMastery: null, extraMasteries: [] });
      const activateBtn = screen.queryByRole('button', { name: /Activate/ });
      expect(activateBtn).toBeInTheDocument();
      expect(activateBtn).toBeDisabled();
    });
  });

});
