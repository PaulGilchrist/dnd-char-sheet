import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20, rollExpression } from '../../services/dice/diceRoller.js';
import { sendSaveResult, clearSavePrompt } from '../../services/combat/conditions/savePromptService.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';

import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import storage from '../../services/ui/storage.js';
import { getAllyList } from '../../hooks/useAllySelection.js';
import * as circleOfPowerHandler from '../../services/automation/handlers/buffs/circleOfPowerHandler.js';

// ── Mock dependencies ──

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
  return {
    default: function MockSubscriber({ handleEvent, campaignName }) {
      return React.createElement(
        'div',
        { 'data-testid': 'subscriber', 'data-campaign': campaignName },
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePrompt-testTarget`,
                data: {
                  promptId: 'test-prompt-1',
                  targetName: 'testTarget',
                  saveType: 'con',
                  saveDc: 12,
                  disadvantage: false,
                },
              }),
          }
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger-second',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePrompt-testTarget2`,
                data: {
                  promptId: 'test-prompt-2',
                  targetName: 'testTarget2',
                  saveType: 'dex',
                  saveDc: 15,
                  disadvantage: true,
                  dcSuccess: 'half',
                },
              }),
          }
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger-cleared',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePromptCleared-testTarget`,
                data: {
                  promptId: 'test-prompt-1',
                },
              }),
          }
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger-disadvantage',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePrompt-testTarget3`,
                data: {
                  promptId: 'test-prompt-disadv',
                  targetName: 'testTarget3',
                  saveType: 'str',
                  saveDc: 14,
                  disadvantage: true,
                  dcSuccess: 'half',
                  sourceName: 'Fireball',
                },
              }),
          }
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger-dex',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePrompt-testTarget`,
                data: {
                  promptId: 'test-prompt-dex',
                  targetName: 'testTarget',
                  saveType: 'dex',
                  saveDc: 17,
                  disadvantage: false,
                  dcSuccess: 'half',
                  sourceName: 'Sacred Flame',
                },
              }),
          }
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'subscriber-trigger-none-dc',
            onClick: () =>
              handleEvent({
                key: `change-${campaignName}-savePrompt-testTarget4`,
                data: {
                  promptId: 'test-prompt-none',
                  targetName: 'testTarget4',
                  saveType: 'wis',
                  saveDc: 16,
                  disadvantage: false,
                  dcSuccess: 'none',
                },
              }),
          }
        ),
      );
    },
  };
});

// ── EventSource helper ──

const MockEventSource = vi.fn();
MockEventSource.prototype.close = vi.fn();

function setupGlobalEventSource() {
  Object.defineProperty(globalThis, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  });
}

// ── Test helpers ──

function createCharacter(name, saveModifiers, evasionEffects, abilities) {
  return {
    name,
    computedStats: {
      abilities: abilities || [
        { name: 'Strength', bonus: 2 },
        { name: 'Dexterity', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Charisma', bonus: 4 },
      ],
      evasionEffects: evasionEffects || [],
    },
    saveModifiers: saveModifiers || [],
  };
}

// ── Tests ──

describe('SavePromptModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGlobalEventSource();
    rollD20.mockReturnValue(15);
    computeAuraBonus.mockResolvedValue({ bonus: 0, sourceName: null });
    getRuntimeValue.mockImplementation(() => null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore EventSource to avoid leaking between test files
    delete globalThis.EventSource;
  });

  // ── Rendering with no prompts ──

  it('renders nothing when there are no prompts', () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );
    expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  // ── Modal rendering with prompt ──

  it('displays the modal with target name, ability, and DC when a prompt is queued', async () => {
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

    expect(screen.getByText('testTarget')).toBeInTheDocument();
    expect(screen.getByText('CON')).toBeInTheDocument();
    expect(screen.getByText('DC 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

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

    expect(clearSavePrompt).toHaveBeenCalledWith('test-campaign', 'testTarget');
  });

  // ── Roll save ──

  it('shows result after rolling a save and replaces buttons with Done', async () => {
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

    expect(screen.getByText(/SAVE SUCCESS|SAVE FAILURE/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

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

    expect(sendSaveResult).not.toHaveBeenCalled();

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(sendSaveResult).toHaveBeenCalled();
  });

  // ── Disadvantage ──

  it('rolls two d20s and takes the minimum for disadvantage', async () => {
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-disadvantage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
  });

  it('rolls two d20s for DEX saves when the target is Charmed', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'testTarget' && key === 'activeConditions') return ['charmed', 'speed_zero'];
      return null;
    });
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-dex'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(/\(Disadvantage\)/i).length).toBeGreaterThan(0);
  });

  it('rolls two d20s for DEX saves when the target has Otto\'s Irresistible Dance', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15, duration: 'concentration', conditions: ['charmed', 'speed_zero'] }];
      return null;
    });
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-dex'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(/\(Disadvantage\)/i).length).toBeGreaterThan(0);
  });

  it('does not roll with disadvantage for non-DEX saves when the target is Charmed', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'testTarget' && key === 'activeConditions') return ['charmed'];
      return null;
    });
    rollD20.mockReturnValueOnce(15);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  // ── Aura bonus ──

  it('shows aura bonus in result when aura provides a bonus', async () => {
    computeAuraBonus.mockResolvedValue({ bonus: 2, sourceName: 'Paladin' });

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
      expect(screen.getByText(/aura/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/from Paladin/)).toBeInTheDocument();
  });

  // ── dcSuccess display ──

  it('shows "No damage on successful save" note when dcSuccess is "none"', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-none-dc');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/No damage on successful save/i)).toBeInTheDocument();
    });
  });

  // ── Evasion display ──

  it('shows evasion message when target has own or shared evasion', async () => {
    const targetChar = createCharacter('testTarget2', [], []);
    const paladin = createCharacter(
      'Paladin',
      [],
      [{ saveType: 'DEX', shareable: true, shareRange: 10 }]
    );
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar, paladin]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Evasion: No damage on success, half damage on failure/i)).toBeInTheDocument();
  });

  // ── Result display ──

  it('shows result failure message when save fails', async () => {
    rollD20.mockReturnValue(1);

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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });
  });

  // ── Fanatical Focus ──

  it('does not show Fanatical Focus reroll button when not raging', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockReturnValue(null);
    const targetChar = {
      name: 'testTarget',
      computedStats: {
        abilities: [
          { name: 'Constitution', bonus: 3 },
        ],
        evasionEffects: [],
        automation: { passives: [] },
        class: { class_levels: [{ rage_damage: 2 }] },
        level: 6,
      },
      saveModifiers: [],
      level: 6,
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Reroll Save/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Save' })).toBeInTheDocument();
  });

  it('does not show Fanatical Focus reroll button before the save is rolled', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((key, prop) => {
      if (prop === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      if (prop === 'fanaticalFocusUsed') return false;
      if (prop === 'activeConditions') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      computedStats: {
        abilities: [
          { name: 'Constitution', bonus: 3 },
        ],
        evasionEffects: [],
        automation: { passives: [] },
        class: { class_levels: [{ rage_damage: 3 }] },
        level: 6,
      },
      saveModifiers: [],
      level: 6,
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Reroll Save/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Save' })).toBeInTheDocument();
  });

  it('shows Fanatical Focus reroll button after a failed save while raging', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((key, prop) => {
      if (prop === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      if (prop === 'fanaticalFocusUsed') return false;
      if (prop === 'activeConditions') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      computedStats: {
        abilities: [
          { name: 'Constitution', bonus: 3 },
        ],
        evasionEffects: [],
        automation: { passives: [] },
        class: { class_levels: [{ rage_damage: 2 }] },
        level: 1,
      },
      saveModifiers: [],
      level: 1,
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Reroll Save/ })).not.toBeInTheDocument();

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Reroll Save \(\+2\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('rerolls save with rage damage bonus when Fanatical Focus is used', async () => {
    rollD20
      .mockReturnValueOnce(1)
      .mockReturnValue(15);
    getRuntimeValue.mockImplementation((key, prop) => {
      if (prop === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      if (prop === 'fanaticalFocusUsed') return false;
      if (prop === 'activeConditions') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      computedStats: {
        abilities: [
          { name: 'Constitution', bonus: 3 },
        ],
        evasionEffects: [],
        automation: { passives: [] },
        class: { class_levels: [{ rage_damage: 2 }] },
        level: 1,
      },
      saveModifiers: [],
      level: 1,
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    const rerollBtn = screen.getByRole('button', { name: /Reroll Save \(\+2\)/ });
    fireEvent.click(rerollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    expect(setRuntimeValue).toHaveBeenCalledWith('testTarget', 'fanaticalFocusUsed', true, 'test-campaign');
    expect(sendSaveResult).toHaveBeenCalledWith('test-campaign', 'testTarget', expect.objectContaining({
      promptId: 'test-prompt-1',
      bonusDetail: expect.stringContaining('Fanatical Focus'),
    }));
  });

  it('does not show Fanatical Focus reroll button after it has been used', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((key, prop) => {
      if (prop === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      if (prop === 'fanaticalFocusUsed') return true;
      if (prop === 'activeConditions') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      computedStats: {
        abilities: [
          { name: 'Constitution', bonus: 3 },
        ],
        evasionEffects: [],
        automation: { passives: [] },
        class: { class_levels: [{ rage_damage: 2 }] },
        level: 6,
      },
      saveModifiers: [],
      level: 6,
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Reroll Save/ })).not.toBeInTheDocument();
  });

  // ── handleRollSave: character lookup with save bonus ──

  it('uses character save bonus from getAbilitySaveBonus when character is found', async () => {
    rollD20.mockReturnValue(15);
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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

    expect(screen.getByText(/SAVE SUCCESS|SAVE FAILURE/i)).toBeInTheDocument();
  });

  // ── handleRollSave: creature lookup from combatSummary ──

  it('uses creature saveBonuses from combatSummary when character is not found', async () => {
    rollD20.mockReturnValue(15);
    vi.mocked(getCombatSummary).mockReturnValue({
      creatures: [{ name: 'testTarget', saveBonuses: { con: 5 } }],
    });

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
  });

  // ── handleRollSave: advantage from saveModifiers against_spell ──

  it('grants advantage when saveModifiers has advantage against_spell condition', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
      },
      saveModifiers: [{ target: 'saving_throw', effect: 'advantage', condition: 'against_spell' }],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  // ── handleRollSave: Dodge buff ──

  it('grants advantage on DEX saves when Dodge buff is active', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'dodge' }];
      return null;
    });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-dex');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  it('does not grant Dodge advantage on non-DEX saves', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'dodge' }];
      return null;
    });

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

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  // ── handleRollSave: Circle of Power ──

  it('grants advantage on all saves when Circle of Power is active', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockReturnValue(true);

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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  // ── handleRollSave: Holy Nimbus ──

  it('grants advantage when Holy Nimbus is active against fiend attacker', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === 'holyNimbusActive' && campaign === 'test-campaign') return true;
      return null;
    });
    vi.mocked(getCombatSummary).mockReturnValue({
      creatures: [{ name: 'Fiend', type: 'Fiend' }, { name: 'testTarget', type: 'player' }],
    });
    vi.mocked(getAllyList).mockReturnValue(['testTarget']);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testAlly']}
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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  // ── handleRollSave: Bane penalty ──

  it('applies bane penalty when target has bane_penalty targetEffect', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'bane_penalty' }];
      return null;
    });
    vi.mocked(rollExpression).mockReturnValue({ total: 2 });

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
      expect(screen.getByText(/Bane/i)).toBeInTheDocument();
    });
  });

  // ── handleRollSave: Bless bonus ──

  it('applies bless bonus when target has bless_bonus targetEffect', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'bless_bonus' }];
      return null;
    });
    vi.mocked(rollExpression).mockReturnValue({ total: 4 });

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
      expect(screen.getByText(/Bless/i)).toBeInTheDocument();
    });
  });

  // ── handleRollSave: Warding Bond ──

  it('applies warding bond bonus when target has warding_bond buff', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'warding_bond', saveBonus: 1 }];
      return null;
    });

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
      expect(screen.getByText(/Warding Bond/i)).toBeInTheDocument();
    });
  });

  // ── handleRollSave: lastAttack storage ──

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

    expect(sendSaveResult).toHaveBeenCalledWith('test-campaign', 'testTarget', expect.objectContaining({
      promptId: 'test-prompt-1',
      roll: 15,
    }));
    expect(clearSavePrompt).toHaveBeenCalledWith('test-campaign', 'testTarget');
  });

  // ── handleFanaticalFocus: shows button while raging ──

  it('shows Fanatical Focus reroll button after a failed save while raging', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === 'activeBuffs' && campaign === 'test-campaign') return [{ damageBonusExpression: 'rage_damage' }];
      if (key === 'fanaticalFocusUsed' && campaign === 'test-campaign') return false;
      if (key === 'activeConditions' && campaign === 'test-campaign') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [{ rage_damage: 2 }] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
        automation: { passives: [] },
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Reroll Save \(\+2\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  // ── handleDisciplinedSurvivor: shows button ──

  it('shows Disciplined Survivor button when focus points available', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === 'activeBuffs' && campaign === 'test-campaign') return [{ damageBonusExpression: 'rage_damage' }];
      if (key === 'fanaticalFocusUsed' && campaign === 'test-campaign') return false;
      if (key === 'activeConditions' && campaign === 'test-campaign') return [];
      if (key === 'focusPoints' && campaign === 'test-campaign') return 2;
      if (key === 'livingLegendActive' && campaign === 'test-campaign') return false;
      if (key === 'indomitableUses' && campaign === 'test-campaign') return 0;
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [{ rage_damage: 2, focus_points: 3 }] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
        automation: { passives: [] },
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reroll Save (1 Focus Point)' })).toBeInTheDocument();
  });

  // ── handleGuardedMind: doesn't show for non-valid saves ──

  it('does not show Guarded Mind for Strength saves', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === '_guardedMind_usedRest' && campaign === 'test-campaign') return false;
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Strength', bonus: 3 }],
        evasionEffects: [],
        automation: {
          passives: [],
          specialActions: [{ type: 'auto_reroll', effect: 'override_fail_to_success', oncePer: 'short_or_long_rest' }],
        },
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-disadvantage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Guarded Mind' })).not.toBeInTheDocument();
  });

  // ── Living Legend: shows button ──

  it('shows Living Legend button when conditions are met', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === 'livingLegendActive' && campaign === 'test-campaign') return true;
      if (key === 'fanaticalFocusUsed' && campaign === 'test-campaign') return false;
      if (key === 'indomitableUses' && campaign === 'test-campaign') return 0;
      if (key === 'activeBuffs' && campaign === 'test-campaign') return [];
      if (key === 'activeConditions' && campaign === 'test-campaign') return [];
      return null;
    });
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
        automation: { passives: [] },
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reroll Save' })).toBeInTheDocument();
  });

  // ── Evasion display: circle of power ──

  it('shows evasion message when circle of power is active', async () => {
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockImplementation((targetName, campaign) => {
      if (targetName === 'testTarget2' && campaign === 'test-campaign') return true;
      return false;
    });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testTarget2']}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Evasion: No damage on success, half damage on failure/i)).toBeInTheDocument();
    });
  });

  // ── Evasion display: no evasion ──

  // ── Result breakdown with all bonuses ──

  it('shows result breakdown with all bonus details', async () => {
    rollD20.mockReturnValue(15);
    computeAuraBonus.mockResolvedValue({ bonus: 2, sourceName: 'Paladin' });
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { target: 'testTarget', effect: 'bane_penalty' },
        { target: 'testTarget', effect: 'bless_bonus' },
      ];
      if (name === 'testTarget' && key === 'activeBuffs') return [{ effect: 'warding_bond', saveBonus: 1 }];
      return null;
    });
    vi.mocked(rollExpression).mockImplementation((expr) => {
      if (expr === '1d4') return { total: 3 };
      return null;
    });

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

    expect(screen.getByText(/aura/i)).toBeInTheDocument();
    expect(screen.getByText(/Bane/i)).toBeInTheDocument();
    expect(screen.getByText(/Bless/i)).toBeInTheDocument();
    expect(screen.getByText(/Warding Bond/i)).toBeInTheDocument();
  });

  // ── Disadvantage badge display ──

  it('shows disadvantage badge when prompt has disadvantage flag', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-disadvantage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.getByText('(Disadvantage)')).toBeInTheDocument();
  });

  // ── Source name display ──

  it('shows source name when provided in prompt', async () => {
    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-disadvantage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Source: Fireball/i)).toBeInTheDocument();
    });
  });

  // ── Queue count display ──

  it('shows queue count in header when multiple prompts exist', async () => {
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
  });

  // ── save-result event completeness ──

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

  // ── Evasion overlay: apply button disabled ──

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

  // ── Evasion overlay: skip ──

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

  // ── Evasion overlay: dimmed ──

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

  // ── isIncapacitated check ──

  it('does not grant own evasion when incapacitated', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeConditions' && campaign === 'test-campaign') return ['incapacitated'];
      return null;
    });

    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [{ saveType: 'CON' }],
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
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
  });
});
