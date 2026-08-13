import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import storage from '../../services/ui/storage.js';
import * as circleOfPowerHandler from '../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { setupDefaults, cleanupDefaults, createCharacter } from './SavePromptModal.test-utils.jsx';
import * as savePromptService from '../../services/combat/conditions/savePromptService.js';

// ── Mocks ──

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

vi.mock('./Subscriber.jsx', () => {
  function MockSubscriber({ handleEvent, campaignName }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber', 'data-campaign': campaignName },
      React.createElement('button', { 'data-testid': 'subscriber-trigger', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-1', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-second', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget2`, data: { promptId: 'test-prompt-2', targetName: 'testTarget2', saveType: 'dex', saveDc: 15, disadvantage: true, dcSuccess: 'half' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-cleared', onClick: () => handleEvent({ key: `change-${campaignName}-savePromptCleared-testTarget`, data: { promptId: 'test-prompt-1' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-disadvantage', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget3`, data: { promptId: 'test-prompt-disadv', targetName: 'testTarget3', saveType: 'str', saveDc: 14, disadvantage: true, dcSuccess: 'half', sourceName: 'Fireball' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-dex', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-dex', targetName: 'testTarget', saveType: 'dex', saveDc: 17, disadvantage: false, dcSuccess: 'half', sourceName: 'Sacred Flame' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-none-dc', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget4`, data: { promptId: 'test-prompt-none', targetName: 'testTarget4', saveType: 'wis', saveDc: 16, disadvantage: false, dcSuccess: 'none' } }) }),
    );
  }
  return { default: MockSubscriber };
});

describe('SavePromptModal — actions', () => {
  beforeEach(() => setupDefaults(rollD20, computeAuraBonus, getRuntimeValue));
  afterEach(cleanupDefaults);

  // ── Dismiss ──

  it('dismisses the prompt when dismiss button is clicked', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
    });

    expect(savePromptService.clearSavePrompt).toHaveBeenCalledWith('test-campaign', 'testTarget');
  });

  // ── Advance to next prompt ──

  it('advances to next prompt when Done is clicked with single prompt', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
  });

  // ── save-result event ──

  it('dispatches save-result custom event with correct detail after rolling', async () => {
    const eventHandler = vi.fn();
    window.addEventListener('save-result', eventHandler);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalled();
    });

    const eventDetail = eventHandler.mock.calls[0][0].detail;
    expect(eventDetail.promptId).toBe('test-prompt-1');
    expect(eventDetail.targetName).toBe('testTarget');
    expect(eventDetail.saveType).toBe('con');
    expect(eventDetail.saveDc).toBe(12);
    expect(eventDetail.success).toBe(true);
    expect(eventDetail.roll).toBe(15);
    expect(eventDetail.mode).toBe('normal');

    window.removeEventListener('save-result', eventHandler);
  });

  it('dispatches save-result event with correct detail after rolling', async () => {
    rollD20.mockReturnValue(15);

    const eventHandler = vi.fn();
    window.addEventListener('save-result', eventHandler);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalled();
    });

    const eventDetail = eventHandler.mock.calls[0][0].detail;
    expect(eventDetail).toHaveProperty('promptId');
    expect(eventDetail).toHaveProperty('rawDamage');
    expect(eventDetail).toHaveProperty('dcSuccess');
    expect(eventDetail).toHaveProperty('evasionActive');

    window.removeEventListener('save-result', eventHandler);
  });

  // ── Queue / multiple prompts ──

  it('shows queue count and advances to second prompt when multiple prompts exist', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const trigger2 = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger2);

    await waitFor(() => {
      expect(screen.getByText(/\(1 of 2\)/)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next Save' })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: 'Next Save' });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('testTarget2')).toBeInTheDocument();
      expect(screen.getByText('DEX')).toBeInTheDocument();
      expect(screen.getByText('DC 15')).toBeInTheDocument();
    });
  });

  it('does not add duplicate prompts with same promptId', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.queryByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/\(1 of 2\)/)).not.toBeInTheDocument();
  });

  // ── Cleared event ──

  it('removes prompt when savePromptCleared event is received', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const clearedBtn = screen.getByTestId('subscriber-trigger-cleared');
    fireEvent.click(clearedBtn);

    await waitFor(() => {
      expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
    });
  });

  // ── String characters in characters array ──

  it('handles mixed string and object characters in characters array', async () => {
    const character = createCharacter('otherChar');
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testTarget', character]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(savePromptService.sendSaveResult).not.toHaveBeenCalled();

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(savePromptService.sendSaveResult).toHaveBeenCalled();
  });

  // ── lastAttack storage ──

  it('stores lastAttack data in storage when combatSummary exists', async () => {
    rollD20.mockReturnValue(15);
    vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(storage.set).toHaveBeenCalledWith('lastAttack', expect.objectContaining({
      attackerName: 'testTarget',
      targetName: 'testTarget',
      rollType: 'save',
      saveType: 'con',
      saveDc: 12,
    }), 'test-campaign');
  });

  // ── handleDone: sends save result ──

  it('sends save result via sendSaveResult when done is clicked after roll', async () => {
    rollD20.mockReturnValue(15);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(savePromptService.sendSaveResult).toHaveBeenCalledWith('test-campaign', 'testTarget', expect.objectContaining({
      promptId: 'test-prompt-1',
      roll: 15,
    }));
    expect(savePromptService.clearSavePrompt).toHaveBeenCalledWith('test-campaign', 'testTarget');
  });

  // ── Evasion overlay ──

  it('disables apply button when no allies selected in evasion overlay', async () => {
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockImplementation((targetName, campaign) => {
      if (targetName === 'testTarget2' && campaign === 'test-campaign') return true;
      return false;
    });

    const paladin = {
      name: 'Paladin',
      level: 1,
      computedStats: {
        abilities: [{ name: 'Charisma', bonus: 3 }],
        evasionEffects: [{ saveType: 'DEX', shareable: true, shareRange: 10 }],
      },
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testTarget2', paladin]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Leading Evasion — Choose Allies/)).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /Apply Evasion \(0\)/ });
    expect(applyBtn).toBeDisabled();
  });

  it('skips evasion overlay when skip is clicked', async () => {
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockImplementation((targetName, campaign) => {
      if (targetName === 'testTarget2' && campaign === 'test-campaign') return true;
      return false;
    });

    const paladin = {
      name: 'Paladin',
      level: 1,
      computedStats: {
        abilities: [{ name: 'Charisma', bonus: 3 }],
        evasionEffects: [{ saveType: 'DEX', shareable: true, shareRange: 10 }],
      },
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testTarget2', paladin]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Leading Evasion — Choose Allies/)).toBeInTheDocument();
    });

    const skipBtn = screen.getByRole('button', { name: 'Skip' });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Leading Evasion/)).not.toBeInTheDocument();
  });

  it('renders overlay dimmed when evasion selection is active', async () => {
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockImplementation((targetName, campaign) => {
      if (targetName === 'testTarget2' && campaign === 'test-campaign') return true;
      return false;
    });

    const paladin = {
      name: 'Paladin',
      level: 1,
      computedStats: {
        abilities: [{ name: 'Charisma', bonus: 3 }],
        evasionEffects: [{ saveType: 'DEX', shareable: true, shareRange: 10 }],
      },
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testTarget2', paladin]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Leading Evasion — Choose Allies/)).toBeInTheDocument();
    });

    expect(document.querySelector('.sp-overlay--dimmed')).toBeInTheDocument();
  });
});
