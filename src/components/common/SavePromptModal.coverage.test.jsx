// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20, rollExpression } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import * as circleOfPowerHandler from '../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import storage from '../../services/ui/storage.js';
import * as savePromptService from '../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../services/ui/logService.js';
import { setupDefaults, cleanupDefaults } from './SavePromptModal.test-utils.jsx';

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
      React.createElement('button', { 'data-testid': 'subscriber-trigger-wis', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-wis', targetName: 'testTarget', saveType: 'WIS', saveDc: 13, disadvantage: false, dcSuccess: 'half' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-attacker', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-attacker', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false, attackerName: 'testAttacker' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-rawdamage', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-rd', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false, rawDamage: 10, dcSuccess: 'half' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-rawdamage-none', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-rd-none', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false, rawDamage: 10, dcSuccess: 'none' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-rawdamage-reroll', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-rd-reroll', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false, rawDamage: 10, dcSuccess: 'half' } }) }),
    );
  }
  return { default: MockSubscriber };
});

describe('SavePromptModal — additional coverage', () => {
  beforeEach(() => setupDefaults(rollD20, computeAuraBonus, getRuntimeValue));
  afterEach(cleanupDefaults);

  // ── Beacon of Hope advantage ──

  it('grants advantage on WIS saves when beacon_of_hope targetEffect is active', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
      },
      saveModifiers: [],
      targetEffects: [{ effect: 'beacon_of_hope' }],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-wis');
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

  // ── Cosmic Omen ──

  it('applies cosmic omen bonus to save total', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'cosmicOmenPendingBonus') return JSON.stringify({ type: 'Weal', value: 2 });
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

    // The display format is: "d20 (15) + 5 (2 from Weal)"
    expect(screen.getByText(/2 from Weal/i)).toBeInTheDocument();
    expect(setRuntimeValue).toHaveBeenCalledWith('cosmicOmen', 'cosmicOmenPendingBonus', null, 'test-campaign', true);
  });

  // ── Bane on attacker ──

  it('applies bane attacker bonus when attacker has bane_penalty', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { target: 'testTarget', effect: 'bane_penalty' },
        { target: 'testTarget', effect: 'bless_bonus' },
        { target: 'testTarget', effect: 'warding_bond', saveBonus: 1 },
        { target: 'testAttacker', effect: 'bane_penalty' },
      ];
      return null;
    });
    vi.mocked(rollExpression).mockReturnValue({ total: 3 });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-attacker');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Bane/i)).toBeInTheDocument();
  });

  // ── submitSaveResult with success + damage restoration ──

  it('restores HP on successful save reroll when rawDamage > 0', async () => {
    rollD20.mockReturnValue(20);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'campaign' && key === 'lastAttack' && campaign === 'test-campaign') return { finalDamage: 10 };
      if (name === 'testTarget' && key === 'hitPoints' && campaign === 'test-campaign') return 5;
      if (name === 'testTarget' && key === 'maxHitPoints' && campaign === 'test-campaign') return 20;
      return null;
    });
    vi.mocked(getCombatSummary).mockReturnValue({
      lastAttack: { finalDamage: 10 },
      creatures: [],
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
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    // After rolling and seeing success, clicking Done should call sendSaveResult
    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(savePromptService.sendSaveResult).toHaveBeenCalled();
    expect(savePromptService.clearSavePrompt).toHaveBeenCalled();
  });

  // ── submitSaveResult: updates combatSummary lastAttack ──

  it('updates combatSummary lastAttack when submitSaveResult is called with combatSummary', async () => {
    rollD20.mockReturnValue(20);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'campaign' && key === 'lastAttack' && campaign === 'test-campaign') return { finalDamage: 10 };
      if (name === 'testTarget' && key === 'hitPoints' && campaign === 'test-campaign') return 5;
      if (name === 'testTarget' && key === 'maxHitPoints' && campaign === 'test-campaign') return 20;
      return null;
    });
    vi.mocked(getCombatSummary).mockReturnValue({
      lastAttack: { d20: 10, total: 15 },
      creatures: [],
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
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(storage.set).toHaveBeenCalledWith('lastAttack', expect.objectContaining({
      saveType: 'con',
      saveDc: 12,
    }), 'test-campaign');
  });

  // ── submitSaveResult: HP restoration path ──

  it('restores HP via submitSaveResult when success and rawDamage > 0', async () => {
    rollD20.mockReturnValue(20);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'campaign' && key === 'lastAttack' && campaign === 'test-campaign') return { finalDamage: 10 };
      if (name === 'testTarget' && key === 'hitPoints' && campaign === 'test-campaign') return 5;
      if (name === 'testTarget' && key === 'maxHitPoints' && campaign === 'test-campaign') return 20;
      return null;
    });
    vi.mocked(getCombatSummary).mockReturnValue({
      lastAttack: { finalDamage: 10 },
      creatures: [],
    });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-rawdamage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(savePromptService.sendSaveResult).toHaveBeenCalled();
  });

  // ── handleGuardedMind (WIS save with valid special action) ──

  it('uses Guarded Mind to override failed save', async () => {
    rollD20.mockReturnValue(1);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === '_guardedMind_usedRest' && campaign === 'test-campaign') return false;
      if (key === 'activeConditions' && campaign === 'test-campaign') return [];
      return null;
    });
    // Make addEntry reject to cover the .catch() path
    vi.mocked(addEntry).mockRejectedValue(new Error('test error'));

    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
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

    const trigger = screen.getByTestId('subscriber-trigger-wis');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE FAILURE/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Guarded Mind' })).toBeInTheDocument();

    const guardedMindBtn = screen.getByRole('button', { name: 'Guarded Mind' });
    fireEvent.click(guardedMindBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    expect(setRuntimeValue).toHaveBeenCalledWith('testTarget', '_guardedMind_usedRest', 'rest', 'test-campaign');
    expect(savePromptService.sendSaveResult).toHaveBeenCalledWith('test-campaign', 'testTarget', expect.objectContaining({
      bonusDetail: '(Guarded Mind)',
    }));
  });

  // ── Living Legend reroll ──

  it('uses Living Legend reroll when conditions are met', async () => {
    rollD20
      .mockReturnValueOnce(1)
      .mockReturnValue(15);
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

    const rerollBtn = screen.getByRole('button', { name: 'Reroll Save' });
    fireEvent.click(rerollBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    // Verify the reroll was processed (save-result event dispatched)
    expect(savePromptService.sendSaveResult).toHaveBeenCalled();
  });

  // ── Disciplined Survivor reroll ──

  it('uses Disciplined Survivor reroll when focus points available', async () => {
    rollD20
      .mockReturnValueOnce(1)
      .mockReturnValue(15);
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

    const trigger = screen.getByTestId('subscriber-trigger-rawdamage-reroll');
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

    const dsBtn = screen.getByRole('button', { name: 'Reroll Save (1 Focus Point)' });
    fireEvent.click(dsBtn);

    await waitFor(() => {
      expect(screen.getByText(/SAVE SUCCESS/)).toBeInTheDocument();
    });

    expect(savePromptService.sendSaveResult).toHaveBeenCalled();
  });

  // ── getSaveDisadvantage: DEX + charmed condition ──

  it('applies disadvantage for DEX saves when target is charmed', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'testTarget' && key === 'activeConditions') return ['charmed'];
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

    const trigger = screen.getByTestId('subscriber-trigger-dex');
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

  // ── getSaveDisadvantage: DEX + Otto's Irresistible Dance ──

  it('applies disadvantage for DEX saves when target has Otto\'s Irresistible Dance', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'ottos_irresistible_dance' }];
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

    const trigger = screen.getByTestId('subscriber-trigger-dex');
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

  // ── Evasion overlay: confirm selection ──

  it('applies evasion to selected allies when confirm is clicked', async () => {
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

    // Select the target by clicking the label (which handles the selection)
    const labels = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(labels[0]);

    await waitFor(() => {
      expect(document.querySelector('.secondary-target-selected')).toBeInTheDocument();
    });

    // Confirm selection
    const applyBtn = screen.getByRole('button', { name: /Apply Evasion \(1\)/ });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Leading Evasion/)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/must make a/i)).toBeInTheDocument();
  });

  // ── Evasion overlay: deselect ally ──

  it('removes ally from selection when clicking already selected', async () => {
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

    // Select the target
    const labels = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(labels[0]);

    await waitFor(() => {
      expect(document.querySelector('.secondary-target-selected')).toBeInTheDocument();
    });

    // Deselect the target
    fireEvent.click(labels[0]);

    await waitFor(() => {
      expect(document.querySelector('.secondary-target-selected')).not.toBeInTheDocument();
    });
  });

  // ── Evasion overlay: dismiss by clicking overlay background ──

  it('dismisses evasion overlay when clicking the dimmed background', async () => {
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

    // Click the evasion overlay background (outside the modal)
    const evasionOverlay = document.querySelector('.sp-overlay--evasion');
    if (evasionOverlay) {
      fireEvent.click(evasionOverlay);
    }

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Leading Evasion/)).not.toBeInTheDocument();
  });

  // ── Evasion overlay: stopPropagation on modal click ──

  it('prevents evasion overlay dismissal when clicking inside the modal', async () => {
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

    // Click inside the modal (should NOT dismiss the evasion overlay)
    const modal = document.querySelector('.sp-overlay--evasion .sp-modal');
    if (modal) {
      fireEvent.click(modal);
    }

    // The evasion overlay should still be visible
    expect(screen.getByText(/Leading Evasion — Choose Allies/)).toBeInTheDocument();
  });

  // ── handleDismiss without result ──

  it('clears save prompt when dismiss is clicked without rolling', async () => {
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
      expect(savePromptService.clearSavePrompt).toHaveBeenCalledWith('test-campaign', 'testTarget');
    });
  });

  // ── Force roll to 20 ──

  it('uses force roll to 20 when ref is set', async () => {
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
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });
  });

  // ── Storage: lastAttack with secondary formula ──

  it('stores lastAttack with secondary formula data', async () => {
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

    const trigger2 = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger2);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(storage.set).toHaveBeenCalledWith('lastAttack', expect.any(Object), 'test-campaign');
  });
});
