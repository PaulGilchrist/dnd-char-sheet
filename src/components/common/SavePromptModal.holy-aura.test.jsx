// SavePromptModal — Holy Aura save advantage (SP-067)
// Cast holy_aura targetEffects must grant advantage (two d20, keep highest) on all saves.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { setupDefaults, cleanupDefaults } from './SavePromptModal.test-utils.jsx';
import { getHolyAuraSaveAdvantage } from './savePromptUtils.js';

vi.mock('../../services/ui/utils.js', () => ({
  default: {
    getName: (name) => name || 'Unknown',
  },
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
  rollExpression: vi.fn(),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
  clearSavePrompt: vi.fn(),
}));

vi.mock('../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilitySaveBonus: vi.fn(() => 3),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    set: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../../hooks/useAllySelection.js', () => ({
  getAllyList: vi.fn(() => []),
}));

vi.mock('../../services/automation/handlers/buffs/circleOfPowerHandler.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isCircleOfPowerActive: vi.fn(() => false),
  };
});

vi.mock('./savePromptUtils.js', () => ({
  getSaveDisadvantage: vi.fn(() => false),
  getHolyAuraSaveAdvantage: vi.fn(() => false),
  getHolyNimbusSaveAdvantage: vi.fn(() => false),
}));

vi.mock('./Subscriber.jsx', () => {
  function MockSubscriber({ handleEvent, campaignName }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber', 'data-campaign': campaignName },
      React.createElement('button', { 'data-testid': 'subscriber-trigger-wis', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-wis', targetName: 'testTarget', saveType: 'WIS', saveDc: 13, disadvantage: false, dcSuccess: 'half' } }) }),
    );
  }
  return { default: MockSubscriber };
});

describe('SavePromptModal — Holy Aura save advantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults(rollD20, computeAuraBonus, getRuntimeValue);
    vi.mocked(getHolyAuraSaveAdvantage).mockReturnValue(false);
  });
  afterEach(cleanupDefaults);

  it('rolls two d20 keep-highest with an Advantage chip for holy_aura targetEffect holders', async () => {
    rollD20.mockReturnValueOnce(5).mockReturnValueOnce(16);
    vi.mocked(getHolyAuraSaveAdvantage).mockReturnValue(true);

    render(
      <SavePromptModal campaignName="test-campaign" characters={[]} activeMapName={null} />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-wis'));
    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    // Pre-roll advantage chip (from the holy_aura targetEffect)
    expect(screen.getByText('(Advantage)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Roll Save' }));

    await waitFor(() => {
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    // Keep highest: 16 + 3 save bonus = 19 ≥ DC 13 → success
    expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    expect(screen.getByText(/d20 \(5, 16\)/)).toBeInTheDocument();
  });

  it('control: rolls a single d20 with no advantage chip when the roller has no holy_aura targetEffect', async () => {
    rollD20.mockReturnValue(5);

    render(
      <SavePromptModal campaignName="test-campaign" characters={[]} activeMapName={null} />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-wis'));
    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('(Advantage)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Roll Save' }));

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Advantage/)).not.toBeInTheDocument();
  });
});
