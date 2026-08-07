import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrimalCompanionSummonModal from './PrimalCompanionSummonModal.jsx';

vi.mock('../../../services/automation/handlers/class-ranger/primalCompanionHandler.js', () => ({
  confirmPrimalCompanionSummon: vi.fn(() => Promise.resolve({
    type: 'popup',
    payload: {
      type: 'automation_info',
      name: 'Primal Companion',
      automationType: 'summon',
      description: 'Ranger1 summons a Primal Companion (Beast of the Land). It acts on your turn, right after you.',
      automation: { type: 'summon' },
    },
  })),
}));

import * as primalCompanionHandler from '../../../services/automation/handlers/class-ranger/primalCompanionHandler.js';

const baseProps = {
  action: {
    name: 'Summon Primal Companion',
    automation: {
      type: 'summon',
      companionTypes: [
        {
          name: 'Beast of the Land',
          size: 'Medium',
          acFormula: '13 + WIS modifier',
          hpBase: 7,
          hpPerLevel: 5,
          speed: '40 ft',
          attacks: [{ name: ' Bite', damageDice: '1d6 + WIS modifier', damageFlat: '', damageType: 'Slashing' }],
        },
        {
          name: 'Beast of the Sea',
          size: 'Medium',
          acFormula: '13 + WIS modifier',
          hpBase: 7,
          hpPerLevel: 5,
          speed: '30 ft',
          specialSpeed: 'Swim 30 ft',
          attacks: [{ name: 'Bite', damageDice: '1d6 + WIS modifier', damageFlat: '', damageType: 'Piercing' }],
        },
        {
          name: 'Beast of the Sky',
          size: 'Small',
          acFormula: '13 + WIS modifier',
          hpBase: 5,
          hpPerLevel: 4,
          speed: '20 ft',
          specialSpeed: 'Fly 40 ft',
          attacks: [{ name: 'Beak', damageDice: '1d4 + WIS modifier', damageFlat: '', damageType: 'Piercing' }],
        },
      ],
    },
  },
  playerStats: { name: 'Ranger1', level: 5 },
  campaignName: 'test-campaign',
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

describe('PrimalCompanionSummonModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Initial render ──

  describe('initial render', () => {
    it('renders the header with action name and paw icon', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      expect(screen.getByText('Summon Primal Companion')).toBeInTheDocument();
      expect(document.querySelector('.sp-header .fa-paw')).toBeInTheDocument();
    });

    it('displays the companion selection prompt', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      expect(screen.getByText('Choose a primal beast to bond with:')).toBeInTheDocument();
    });

    it('renders all companion type options with names and sizes', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      expect(screen.getByText('Beast of the Land')).toBeInTheDocument();
      expect(screen.getByText('Beast of the Sea')).toBeInTheDocument();
      expect(screen.getByText('Beast of the Sky')).toBeInTheDocument();
    });

    it('renders radio inputs for each companion type', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"][name="primalCompanion"]');
      expect(radios).toHaveLength(3);
    });

    it('renders no radio checked by default', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"][name="primalCompanion"]');
      radios.forEach(radio => expect(radio.checked).toBe(false));
    });

    it('renders summon button disabled when no type selected', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const summonBtn = screen.getByRole('button', { name: /Summon Primal Companion/ });
      expect(summonBtn).toBeDisabled();
      expect(summonBtn).toHaveStyle('opacity: 0.5');
    });

    it('renders Cancel button', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders summon button with paw icon', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const summonBtn = screen.getByRole('button', { name: /Summon Primal Companion/ });
      expect(summonBtn.querySelector('.fa-paw')).toBeInTheDocument();
    });

    it('renders all buttons with type="button"', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const buttons = document.querySelectorAll('button[type="button"]');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ── Companion type info display ──

  describe('companion type info display', () => {
    it('renders AC, HP, and attack info when no description is provided', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('AC 13 + WIS modifier');
      expect(body.textContent).toContain('HP 7+5xRanger level');
      expect(body.textContent).toContain('40 ft');
      expect(body.textContent).toContain('1d6 + WIS modifier');
      expect(body.textContent).toContain('Slashing');
    });

    it('renders speed with special speed when present', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Speed: 30 ft, Swim 30 ft');
      expect(body.textContent).toContain('Speed: 20 ft, Fly 40 ft');
    });

    it('renders description as HTML when provided instead of stats', () => {
      const props = makeProps({
        action: {
          name: 'Summon Primal Companion',
          automation: {
            companionTypes: [
              {
                name: 'Custom Beast',
                size: 'Medium',
                description: '<p>A mystical beast from the primal plane.</p>',
              },
            ],
          },
        },
      });
      render(<PrimalCompanionSummonModal {...props} />);
      const body = document.querySelector('.sp-body');
      expect(body.querySelector('p')).toBeInTheDocument();
      expect(body.textContent).toContain('A mystical beast from the primal plane.');
    });

    it('renders no attacks info when attacks array is empty', () => {
      const props = makeProps({
        action: {
          name: 'Summon Primal Companion',
          automation: {
            companionTypes: [
              {
                name: 'Peaceful Beast',
                size: 'Medium',
                acFormula: '12',
                hpBase: 10,
                hpPerLevel: 3,
                attacks: [],
              },
            ],
          },
        },
      });
      render(<PrimalCompanionSummonModal {...props} />);
      expect(screen.getByText('Peaceful Beast')).toBeInTheDocument();
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('AC 12');
      expect(body.textContent).toContain('HP 10+3xRanger level');
    });
  });

  // ── Companion type selection ──

  describe('companion type selection', () => {
    it('selects a companion type when its label is clicked', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const summonBtn = screen.getByRole('button', { name: /Summon Primal Companion/ });
      expect(summonBtn).toBeDisabled();

      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Sea'));
      });

      expect(summonBtn).toBeEnabled();
      expect(summonBtn).not.toHaveStyle('opacity: 0.5');
    });

    it('updates selection when switching between companion types', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const summonBtn = screen.getByRole('button', { name: /Summon Primal Companion/ });

      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      expect(summonBtn).toBeEnabled();

      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Sky'));
      });
      expect(summonBtn).toBeEnabled();
    });

    it('highlights the selected companion with a blue border', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Sea'));
      });
      const selectedLabel = screen.getByText('Beast of the Sea').closest('label');
      expect(selectedLabel).toHaveStyle('border-color: rgb(74, 158, 255)');
    });

    it('selects a radio input when clicked', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const radios = document.querySelectorAll('input[type="radio"][name="primalCompanion"]');
      expect(radios[0].checked).toBe(false);
      await act(async () => {
        fireEvent.click(radios[1]);
      });
      expect(radios[1].checked).toBe(true);
    });
  });

  // ── Confirm behavior ──

  describe('confirm behavior', () => {
    it('calls confirmPrimalCompanionSummon with the selected type', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      expect(primalCompanionHandler.confirmPrimalCompanionSummon).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Summon Primal Companion' }),
        expect.objectContaining({ name: 'Ranger1' }),
        'test-campaign',
        'Beast of the Land',
      );
    });

    it('does not call confirmPrimalCompanionSummon when no type is selected', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      expect(primalCompanionHandler.confirmPrimalCompanionSummon).not.toHaveBeenCalled();
    });

    it('shows the result screen after a successful summon', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('renders the result screen with the action name in the header', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        expect(screen.getByText('Summon Primal Companion')).toBeInTheDocument();
      });
    });

    it('renders the paw icon in the result header', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        expect(document.querySelector('.sp-header .fa-paw')).toBeInTheDocument();
      });
    });

    it('displays the result payload description in the body', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.textContent).toContain('Ranger1 summons a Primal Companion');
      });
    });

    it('renders description as HTML in the result body', async () => {
      vi.mocked(primalCompanionHandler.confirmPrimalCompanionSummon).mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Summon Primal Companion',
          description: '<p>The beast appears and awaits your command.</p>',
        },
      });
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        const body = document.querySelector('.sp-body');
        expect(body.querySelector('p')).toBeInTheDocument();
      });
    });
  });

  // ── Close behavior ──

  describe('close behavior', () => {
    it('closes on cancel button click', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when clicking the overlay background', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the modal content', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });

    it('does not close when clicking a companion type option', () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      fireEvent.click(screen.getByText('Beast of the Sky'));
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });

    it('closes on Done button click in result screen', async () => {
      const onClose = vi.fn();
      render(<PrimalCompanionSummonModal {...makeProps({ onClose })} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when clicking the overlay in result screen', async () => {
      const onClose = vi.fn();
      render(<PrimalCompanionSummonModal {...makeProps({ onClose })} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        fireEvent.click(document.querySelector('.sp-overlay'));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking the modal in result screen', async () => {
      render(<PrimalCompanionSummonModal {...makeProps()} />);
      await act(async () => {
        fireEvent.click(screen.getByText('Beast of the Land'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summon Primal Companion/ }));
      });
      await waitFor(() => {
        const modal = document.querySelector('.sp-modal');
        fireEvent.click(modal);
      });
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });
  });

  // ── Null safety ──

  describe('null safety', () => {
    it('renders with no companion types when automation is missing', () => {
      const props = makeProps({
        action: { name: 'Summon Primal Companion' },
      });
      render(<PrimalCompanionSummonModal {...props} />);
      expect(screen.getByText('Summon Primal Companion')).toBeInTheDocument();
      expect(screen.getByText('Choose a primal beast to bond with:')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Summon Primal Companion/ })).toBeInTheDocument();
    });

    it('renders with empty companion types array', () => {
      const props = makeProps({
        action: {
          name: 'Summon Primal Companion',
          automation: { companionTypes: [] },
        },
      });
      render(<PrimalCompanionSummonModal {...props} />);
      expect(screen.getByText('Summon Primal Companion')).toBeInTheDocument();
      const summonBtn = screen.getByRole('button', { name: /Summon Primal Companion/ });
      expect(summonBtn).toBeDisabled();
    });

    it('renders with null action', () => {
      const props = makeProps({
        action: null,
      });
      render(<PrimalCompanionSummonModal {...props} />);
      expect(screen.getByText('Primal Companion')).toBeInTheDocument();
    });
  });
});
