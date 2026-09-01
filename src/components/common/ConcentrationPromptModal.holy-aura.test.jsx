// ConcentrationPromptModal — Holy Aura concentration advantage (SP-067)
// "Advantage on all saving throws" includes concentration checks for aura targets.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConcentrationPromptModal from './ConcentrationPromptModal.jsx';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { sendConcentrationResult } from '../../services/combat/conditions/savePromptService.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getHolyAuraSaveAdvantage } from './savePromptUtils.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
  sendConcentrationResult: vi.fn(),
  clearConcentrationPrompt: vi.fn(),
}));

vi.mock('../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilitySaveBonus: vi.fn(() => 3),
}));

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
  hasSaveModifier: vi.fn(() => false),
}));

vi.mock('./savePromptUtils.js', () => ({
  getHolyAuraSaveAdvantage: vi.fn(() => false),
}));

vi.mock('./Subscriber.jsx', () => {
  function MockSubscriber({ handleEvent, campaignName }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber' },
      React.createElement('button', {
        'data-testid': 'subscriber-trigger',
        onClick: () => handleEvent({
          key: `change-${campaignName}-concentrationPrompt-testTarget`,
          data: { promptId: 'test-prompt-1', targetName: 'testTarget', spellName: 'Holy Aura', dc: 10, attackerName: 'Goblin 1' },
        }),
      }),
    );
  }
  return { default: MockSubscriber };
});

const MockEventSource = vi.fn();
MockEventSource.prototype.close = vi.fn();

describe('ConcentrationPromptModal — Holy Aura concentration advantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'EventSource', { value: MockEventSource, writable: true, configurable: true });
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 0, sourceName: null });
    vi.mocked(getHolyAuraSaveAdvantage).mockReturnValue(false);
  });
  afterEach(() => {
    delete globalThis.EventSource;
    vi.clearAllMocks();
  });

  it('rolls two d20 keep-highest with ADVANTAGE badge and Holy Aura source for aura targets', async () => {
    rollD20.mockReturnValueOnce(4).mockReturnValueOnce(17);
    vi.mocked(getHolyAuraSaveAdvantage).mockReturnValue(true);

    render(
      <ConcentrationPromptModal campaignName="test-campaign" characters={[]} activeMapName={null} />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger'));
    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll Con Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/CONCENTRATION MAINTAINED/)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/ADVANTAGE/)).toBeInTheDocument();
    expect(screen.getByText(/d20: 17 \(kept\)/)).toBeInTheDocument();
    expect(screen.getByText(/d20: 4 \(discarded\)/)).toBeInTheDocument();
    expect(sendConcentrationResult).toHaveBeenCalledWith(
      'test-campaign',
      'testTarget',
      expect.objectContaining({ mode: 'advantage', advantageSources: ['Holy Aura'] })
    );
  });

  it('control: rolls a single d20 with normal mode when the roller is not a holy_aura target', async () => {
    rollD20.mockReturnValue(4);

    render(
      <ConcentrationPromptModal campaignName="test-campaign" characters={[]} activeMapName={null} />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger'));
    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll Con Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/ADVANTAGE/)).not.toBeInTheDocument();
    expect(sendConcentrationResult).toHaveBeenCalledWith(
      'test-campaign',
      'testTarget',
      expect.objectContaining({ mode: 'normal', advantageSources: [] })
    );
  });
});
