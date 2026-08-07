import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ShieldBashChoiceModal from './ShieldBashChoiceModal.jsx';

vi.mock('../../../services/combat/steps/features/shieldBash.js', () => ({
  applyShieldBashEffect: vi.fn(),
}));

import * as shieldBash from '../../../services/combat/steps/features/shieldBash.js';

const baseProps = {
  action: {
    name: 'Shield Bash',
    options: [
      { name: 'Push', effect: 'push', value: 5 },
      { name: 'Prone', effect: 'prone' },
    ],
  },
  playerStats: { name: 'Fighter1', level: 5 },
  campaignName: 'test-campaign',
  targetName: 'Orc',
  saveDc: 13,
  onClose: vi.fn(),
};

function makeProps(overrides = {}) {
  return { ...baseProps, ...overrides };
}

// ── Initial render ──

describe('ShieldBashChoiceModal - initial render', () => {
  it('renders the overlay and modal container', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    expect(document.querySelector('.sp-modal')).toBeInTheDocument();
  });

  it('renders the Shield Bash header with icon', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(screen.getByText('Shield Bash')).toBeInTheDocument();
    expect(document.querySelector('.fa-shield-halved')).toBeInTheDocument();
  });

  it('renders instruction text with target name and save DC', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(screen.getByText(/Choose an effect for/)).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
    expect(screen.getByText(/DC 13/)).toBeInTheDocument();
  });

  it('renders both Push and Prone options', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Prone')).toBeInTheDocument();
    expect(screen.getByText(/Push target 5 feet away from you/)).toBeInTheDocument();
    expect(screen.getByText(/Target gains Prone condition/)).toBeInTheDocument();
  });

  it('renders two radio inputs for the two options', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(2);
  });

  it('has Apply Effect button disabled when no selection', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Apply Effect/ })).toBeDisabled();
  });

  it('renders the Skip button', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Skip/ })).toBeInTheDocument();
  });

  it('renders Apply Effect button with shield icon', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    const applyBtn = screen.getByRole('button', { name: /Apply Effect/ });
    expect(applyBtn.querySelector('.fa-shield-halved')).toBeInTheDocument();
  });

  // ── Selection behavior ──

  it('selects Push option when clicked and enables Apply button', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    expect(document.querySelectorAll('input[type="radio"]')[0]).toBeChecked();
    expect(screen.getByRole('button', { name: /Apply Effect/ })).not.toBeDisabled();
  });

  it('selects Prone option when clicked and enables Apply button', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Prone'));
    expect(document.querySelectorAll('input[type="radio"]')[1]).toBeChecked();
    expect(screen.getByRole('button', { name: /Apply Effect/ })).not.toBeDisabled();
  });

  it('switches selection when a different option is clicked', () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    expect(document.querySelectorAll('input[type="radio"]')[0]).toBeChecked();
    expect(document.querySelectorAll('input[type="radio"]')[1]).not.toBeChecked();
    fireEvent.click(screen.getByText('Prone'));
    expect(document.querySelectorAll('input[type="radio"]')[0]).not.toBeChecked();
    expect(document.querySelectorAll('input[type="radio"]')[1]).toBeChecked();
  });

  // ── Apply effect flow ──

  it('does not call applyShieldBashEffect when Apply is clicked with no selection', async () => {
    render(<ShieldBashChoiceModal {...makeProps()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    expect(shieldBash.applyShieldBashEffect).not.toHaveBeenCalled();
  });

  it('calls applyShieldBashEffect with selected option "Push" when Apply is clicked', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    expect(shieldBash.applyShieldBashEffect).toHaveBeenCalledWith(
      baseProps.action,
      baseProps.playerStats,
      baseProps.campaignName,
      baseProps.targetName,
      'Push',
      baseProps.saveDc
    );
  });

  it('calls applyShieldBashEffect with selected option "Prone" when Apply is clicked', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc has Prone condition' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Prone'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    expect(shieldBash.applyShieldBashEffect).toHaveBeenCalledWith(
      baseProps.action,
      baseProps.playerStats,
      baseProps.campaignName,
      baseProps.targetName,
      'Prone',
      baseProps.saveDc
    );
  });

  // ── Result state ──

  it('shows result state with description after apply resolves', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      expect(screen.getByText('Shield Bash')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  it('renders the result description via dangerouslySetInnerHTML', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: '<strong>Orc pushed 5 ft!</strong>' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      const bodyDiv = document.querySelector('.sp-body');
      expect(bodyDiv.innerHTML).toContain('<strong>Orc pushed 5 ft!</strong>');
    });
  });

  it('hides choice options after apply resolves', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      expect(screen.queryByText(/Choose an effect for/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Apply Effect/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Skip/ })).not.toBeInTheDocument();
    });
  });

  it('renders the shield icon in the result header', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      const header = document.querySelector('.sp-header');
      expect(header.querySelector('.fa-shield-halved')).toBeInTheDocument();
    });
  });

  // ── Done button ──

  it('calls onClose when Done is clicked after apply', async () => {
    const onClose = vi.fn();
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Skip flow ──

  it('calls applyShieldBashEffect with "skip" when Skip is clicked', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue(null);
    render(<ShieldBashChoiceModal {...makeProps()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    });
    expect(shieldBash.applyShieldBashEffect).toHaveBeenCalledWith(
      baseProps.action,
      baseProps.playerStats,
      baseProps.campaignName,
      baseProps.targetName,
      'skip',
      baseProps.saveDc
    );
  });

  it('calls onClose when Skip is clicked', async () => {
    const onClose = vi.fn();
    shieldBash.applyShieldBashEffect.mockResolvedValue(null);
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('works with Skip regardless of whether an option is selected', async () => {
    const onClose = vi.fn();
    shieldBash.applyShieldBashEffect.mockResolvedValue(null);
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Overlay click behavior ──

  it('calls onClose when overlay background is clicked', () => {
    const onClose = vi.fn();
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(document.querySelector('.sp-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal', () => {
    const onClose = vi.fn();
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(document.querySelector('.sp-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Overlay click in result state ──

  it('calls onClose when overlay is clicked in result state', async () => {
    const onClose = vi.fn();
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      fireEvent.click(document.querySelector('.sp-overlay'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal in result state', async () => {
    const onClose = vi.fn();
    shieldBash.applyShieldBashEffect.mockResolvedValue({
      type: 'popup',
      payload: { description: 'Shield Bash: Orc pushed 5 ft' },
    });
    render(<ShieldBashChoiceModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      fireEvent.click(document.querySelector('.sp-modal'));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Custom target name and DC ──

  it('renders custom target name and save DC', () => {
    render(<ShieldBashChoiceModal {...makeProps({ targetName: 'Troll', saveDc: 15 })} />);
    expect(screen.getByText('Troll')).toBeInTheDocument();
    expect(screen.getByText(/DC 15/)).toBeInTheDocument();
  });

  // ── applyShieldBashEffect returns null ──

  it('does not show result state when applyShieldBashEffect returns null', async () => {
    shieldBash.applyShieldBashEffect.mockResolvedValue(null);
    render(<ShieldBashChoiceModal {...makeProps()} />);
    fireEvent.click(screen.getByText('Push'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Effect/ }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    });
  });
});
