// @improved-by-ai
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SetConditionModal from './SetConditionModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../services/rules/combat/rangeValidation.js', () => ({
  getDistanceFeet: vi.fn(),
  rangeToFeet: vi.fn(() => 60),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
  sendSavePrompt: vi.fn(),
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

vi.mock('../../../../services/combat/automation/automationService.js', () => ({
  playerIsImmuneToCondition: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../../services/ui/utils.js', () => {
  const utilsMock = {
    guid: vi.fn(() => 'test-guid'),
    getAbilityLongName: vi.fn((s) => s),
    getName: vi.fn((name) => name || 'Unknown'),
  };
  return { default: utilsMock };
});

vi.mock('../../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
}));

// ── Re-import mocked modules ──

import * as diceRoller from '../../../../services/dice/diceRoller.js';
import * as savePromptService from '../../../../services/combat/conditions/savePromptService.js';

// ── Test fixtures ──

const mockCombatSummary = {
  creatures: [
    { name: 'Attacker', type: 'player' },
    { name: 'Skeleton A', type: 'npc', conditions: [] },
    { name: 'Zombie B', type: 'npc', conditions: [], saveBonuses: { wis: 2 } },
    { name: 'Player Ally', type: 'player' },
    { name: 'Goblin C', type: 'npc', conditions: [] },
  ],
};

const mockMonsters = [
  { name: 'Skeleton A', type: 'Undead' },
  { name: 'Zombie B', type: 'undead' },
  { name: 'Goblin C', type: 'Humanoid' },
  { name: 'Player Ally', type: 'Undead' },
];

const mockAttackerPos = { gridX: 0, gridY: 0 };

function makeProps(overrides) {
  return {
    combatSummary: mockCombatSummary,
    attackerName: 'Attacker',
    attackerPos: mockAttackerPos,
    saveDc: 14,
    campaignName: 'test-campaign',
    mapData: null,
    monsters: mockMonsters,
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

function getModalChecks(container) {
  return within(container).queryAllByRole('checkbox');
}

function getCheckboxByCreature(container, creatureName) {
  const checkboxes = getModalChecks(container);
  return checkboxes.find(cb =>
    cb.closest('label')?.textContent.includes(creatureName)
  );
}

function findTurnUndeadEvent(events) {
  return events.find(e => e.type === 'turn-undead-result');
}

// ── Tests ──

describe('SetConditionModal - Turn Undead', () => {
  let originalDispatch;

  beforeEach(() => {
    originalDispatch = window.dispatchEvent.bind(window);
    vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => originalDispatch(event));
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    savePromptService.sendSavePrompt.mockReturnValue({ promptId: 'test-prompt-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Target eligibility ──

  it('only shows undead creatures as eligible targets for Turn Undead', () => {
    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);

    const checkboxes = getModalChecks(container);
    expect(checkboxes).toHaveLength(3);

    expect(getCheckboxByCreature(container, 'Skeleton A')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Zombie B')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Player Ally')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Goblin C')).toBeUndefined();
  });

  it('does NOT filter by undead type for non-Turn Undead features', () => {
    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Abjure Foes' })} />);

    const checkboxes = getModalChecks(container);
    expect(checkboxes).toHaveLength(4);

    expect(getCheckboxByCreature(container, 'Skeleton A')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Zombie B')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Player Ally')).toBeInTheDocument();
    expect(getCheckboxByCreature(container, 'Goblin C')).toBeInTheDocument();
  });

  it('shows no undead message and disabled button when no undead exist', () => {
    const noUndeadCombatSummary = {
      creatures: [
        { name: 'Attacker', type: 'player' },
        { name: 'Goblin A', type: 'npc', conditions: [] },
      ],
    };
    const noUndeadMonsters = [
      { name: 'Goblin A', type: 'Humanoid' },
    ];

    const { container } = render(<SetConditionModal {...makeProps({
      featureName: 'Turn Undead',
      combatSummary: noUndeadCombatSummary,
      monsters: noUndeadMonsters,
    })} />);

    expect(screen.getByText('No undead creatures found within range.')).toBeInTheDocument();
    expect(getModalChecks(container)).toHaveLength(0);
    const applyButton = screen.getByRole('button', { name: /Turn Undead/ });
    expect(applyButton).toBeDisabled();
  });

  // ── turn-undead-result event dispatch ──

  it('dispatches turn-undead-result with single failed NPC target', async () => {
    diceRoller.rollD20.mockReturnValue(5);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(1 target\)/ }));

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeDefined();
      const detail = turnUndeadEvent.detail;
      expect(detail.failedTargets).toContain('Skeleton A');
      expect(detail.attackerName).toBe('Attacker');
      expect(detail.saveDc).toBe(14);
      expect(detail.saveType).toBe('WIS');
      expect(detail.campaignName).toBe('test-campaign');
    });
  });

  it('dispatches turn-undead-result with multiple failed NPC targets', async () => {
    diceRoller.rollD20.mockReturnValueOnce(5).mockReturnValueOnce(3);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(getCheckboxByCreature(container, 'Zombie B'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(2 targets\)/ }));

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeDefined();
      const detail = turnUndeadEvent.detail;
      expect(detail.failedTargets).toContain('Skeleton A');
      expect(detail.failedTargets).toContain('Zombie B');
      expect(detail.failedTargets).toHaveLength(2);
    });
  });

  it('does NOT dispatch turn-undead-result when all targets succeed', async () => {
    diceRoller.rollD20.mockReturnValue(20);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(1 target\)/ }));

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeUndefined();
    });
  });

  it('does NOT dispatch turn-undead-result for non-Turn Undead features', async () => {
    diceRoller.rollD20.mockReturnValue(5);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Abjure Foes' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Goblin C'));
    fireEvent.click(screen.getByRole('button', { name: /Abjure Foes \(1 target\)/ }));

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeUndefined();
    });
  });

  // ── Player save resolution ──

  it('dispatches turn-undead-result after player save fails, including the player in failed targets', async () => {
    diceRoller.rollD20.mockReturnValue(5);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(getCheckboxByCreature(container, 'Player Ally'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(2 targets\)/ }));

    const sentPrompt = savePromptService.sendSavePrompt.mock.calls[0][1];

    window.dispatchEvent(
      new CustomEvent('save-result', {
        detail: { promptId: sentPrompt.promptId, targetName: 'Player Ally', success: false },
      })
    );

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeDefined();
      const detail = turnUndeadEvent.detail;
      expect(detail.failedTargets).toContain('Skeleton A');
      expect(detail.failedTargets).toContain('Player Ally');
    });
  });

  it('does NOT include player in failed targets when player save succeeds', async () => {
    diceRoller.rollD20.mockReturnValue(5);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(getCheckboxByCreature(container, 'Player Ally'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(2 targets\)/ }));

    const sentPrompt = savePromptService.sendSavePrompt.mock.calls[0][1];

    window.dispatchEvent(
      new CustomEvent('save-result', {
        detail: { promptId: sentPrompt.promptId, targetName: 'Player Ally', success: true },
      })
    );

    await waitFor(() => {
      const turnUndeadEvent = findTurnUndeadEvent(window.dispatchEvent.mock.calls.map(c => c[0]));
      expect(turnUndeadEvent).toBeUndefined();
    });
  });

  it('calls sendSavePrompt with correct parameters for player targets', async () => {
    diceRoller.rollD20.mockReturnValue(5);

    const { container } = render(<SetConditionModal {...makeProps({ featureName: 'Turn Undead' })} />);
    fireEvent.click(getCheckboxByCreature(container, 'Skeleton A'));
    fireEvent.click(getCheckboxByCreature(container, 'Player Ally'));
    fireEvent.click(screen.getByRole('button', { name: /Turn Undead \(2 targets\)/ }));

    expect(savePromptService.sendSavePrompt).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({
        targetName: 'Player Ally',
        saveType: 'WIS',
        saveDc: 14,
        sourceName: 'Attacker',
        condition: 'frightened',
      })
    );
  });
});
