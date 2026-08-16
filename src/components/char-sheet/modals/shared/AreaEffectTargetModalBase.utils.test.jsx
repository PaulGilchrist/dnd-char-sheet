// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderTargetList, renderResultsSection, logSaveEntry, persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import * as logService from '../../../../services/ui/logService.js';
import * as storage from '../../../../services/ui/storage.js';
import * as combatData from '../../../../services/encounters/combatData.js';

// Properly mock CustomEvent as a class/constructor
const originalCustomEvent = globalThis.CustomEvent;
beforeEach(() => {
  globalThis.CustomEvent = class MockCustomEvent extends originalCustomEvent {
    constructor(type) {
      super(type);
    }
  };
});

afterEach(() => {
  globalThis.CustomEvent = originalCustomEvent;
});

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../services/ui/storage.js', () => ({
  default: {
    set: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  setCombatSummaryCache: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────

const eligibleTargets = [
  { name: 'Goblin', type: 'monster' },
  { name: 'Orc', type: 'monster' },
  { name: 'Skeleton', type: 'undead' },
];

const results = [
  { targetName: 'Goblin', success: false, roll: 7, saveBonus: 2, total: 9 },
  { targetName: 'Orc', success: true, roll: 15, saveBonus: 0, total: 15 },
  { targetName: 'Skeleton', success: false, saveBonus: 1, total: 8 },
];

const pendingPrompts = [
  { promptId: 'p1', targetName: 'Player1' },
  { promptId: 'p2', targetName: 'Player2' },
];

function createToggleTarget() {
  return vi.fn();
}

// ── renderTargetList Tests ─────────────────────────────────────

describe('renderTargetList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all eligible targets with checkboxes', () => {
    const toggleTarget = createToggleTarget();
    render(renderTargetList({ eligibleTargets, selected: new Set(), toggleTarget }));

    expect(screen.getByText('Goblin')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
    expect(screen.getByText('Skeleton')).toBeInTheDocument();
  });

  it('renders target types in parentheses', () => {
    const toggleTarget = createToggleTarget();
    const { container } = render(renderTargetList({ eligibleTargets, selected: new Set(), toggleTarget }));

    const typeSpans = container.querySelectorAll('.abjure-target-type');
    const types = [...typeSpans].map(s => s.textContent.trim());
    expect(types).toContain('(monster)');
    expect(types).toContain('(undead)');
  });

  it('marks selected targets with selected class', () => {
    const toggleTarget = createToggleTarget();
    const selected = new Set(['Goblin']);
    const { container } = render(
      renderTargetList({ eligibleTargets, selected, toggleTarget }),
    );

    const rows = container.querySelectorAll('.abjure-target-row');
    expect(rows[0]).toHaveClass('abjure-target-selected');
    expect(rows[1]).not.toHaveClass('abjure-target-selected');
    expect(rows[2]).not.toHaveClass('abjure-target-selected');
  });

  it('calls toggleTarget when checkbox is changed', () => {
    const toggleTarget = createToggleTarget();
    render(renderTargetList({ eligibleTargets, selected: new Set(), toggleTarget }));

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes[0].click();
    expect(toggleTarget).toHaveBeenCalledWith('Goblin');
    checkboxes[1].click();
    expect(toggleTarget).toHaveBeenCalledWith('Orc');
  });

  it('shows "No valid targets in range" when eligibleTargets is empty', () => {
    const toggleTarget = createToggleTarget();
    render(
      renderTargetList({ eligibleTargets: [], selected: new Set(), toggleTarget }),
    );

    expect(screen.getByText('No valid targets in range.')).toBeInTheDocument();
  });

  it('renders carefulSpellProtected indicator when target has it', () => {
    const toggleTarget = createToggleTarget();
    const targetsWithCareful = [
      { name: 'Goblin', type: 'monster', carefulSpellProtected: true },
    ];
    const { container } = render(
      renderTargetList({ eligibleTargets: targetsWithCareful, selected: new Set(), toggleTarget }),
    );

    const note = container.querySelector('.sp-note');
    expect(note).toBeInTheDocument();
    expect(note.textContent).toContain('Careful Spell protected');
  });

  it('renders heighten radio buttons when metamagicHeighten is provided', () => {
    const toggleTarget = createToggleTarget();
    const { container } = render(
      renderTargetList({ eligibleTargets, selected: new Set(), toggleTarget, metamagicHeighten: true }),
    );

    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(3);
  });

  it('calls setHeightenTarget when heighten radio is selected', () => {
    const toggleTarget = createToggleTarget();
    const setHeightenTarget = vi.fn();
    const { container } = render(
      renderTargetList({ eligibleTargets, selected: new Set(), toggleTarget, metamagicHeighten: true, setHeightenTarget }),
    );

    const radios = container.querySelectorAll('input[type="radio"]');
    radios[0].click();
    expect(setHeightenTarget).toHaveBeenCalledWith('Goblin');
  });
});

// ── renderResultsSection Tests ─────────────────────────────────

describe('renderResultsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the save resolution header', () => {
    render(
      renderResultsSection({
        results,
        pendingPrompts,
        allResolved: false,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    expect(screen.getByText('Resolving DEX saving throws (DC 13)...')).toBeInTheDocument();
  });

  it('renders all results in abjure-results-list', () => {
    render(
      renderResultsSection({
        results,
        pendingPrompts,
        allResolved: false,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    expect(screen.getByText('Goblin')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
    expect(screen.getByText('Skeleton')).toBeInTheDocument();
  });

  it('marks successful results with success class', () => {
    const { container } = render(
      renderResultsSection({
        results,
        pendingPrompts,
        allResolved: false,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const resultDivs = container.querySelectorAll('.abjure-result');
    const goblinResult = [...resultDivs].find(d => d.querySelector('strong')?.textContent === 'Goblin');
    const orcResult = [...resultDivs].find(d => d.querySelector('strong')?.textContent === 'Orc');

    expect(goblinResult).toHaveClass('abjure-result-fail');
    expect(orcResult).toHaveClass('abjure-result-success');
  });

  it('renders pending prompts with waiting message', () => {
    const { container } = render(
      renderResultsSection({
        results,
        pendingPrompts,
        allResolved: false,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const pendingDivs = container.querySelectorAll('.abjure-result-pending');
    expect(pendingDivs).toHaveLength(2);
    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Player2')).toBeInTheDocument();
    const waitingMessages = container.querySelectorAll('.abjure-result-pending em');
    expect(waitingMessages).toHaveLength(2);
  });

  it('shows "All targets resolved" when allResolved is true', () => {
    render(
      renderResultsSection({
        results,
        pendingPrompts: [],
        allResolved: true,
        saveType: 'CON',
        saveDc: 15,
      }),
    );

    expect(screen.getByText('All targets resolved.')).toBeInTheDocument();
  });

  it('shows roll details when roll is a number', () => {
    const { container } = render(
      renderResultsSection({
        results,
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const goblinResult = [...container.querySelectorAll('.abjure-result')].find(d => d.querySelector('strong')?.textContent === 'Goblin');
    expect(goblinResult.textContent).toContain('Roll: 7');
    expect(goblinResult.textContent).toContain('+2');
    expect(goblinResult.textContent).toContain('= 9');
  });

  it('omits bonus when saveBonus is 0', () => {
    const { container } = render(
      renderResultsSection({
        results,
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const orcResult = [...container.querySelectorAll('.abjure-result')].find(d => d.querySelector('strong')?.textContent === 'Orc');
    expect(orcResult.textContent).toContain('Roll: 15');
    expect(orcResult.textContent).not.toContain('+');
  });

  it('omits roll details when roll is not a number', () => {
    const resultsNoRoll = [
      { targetName: 'Goblin', success: false, saveBonus: 0 },
    ];
    const { container } = render(
      renderResultsSection({
        results: resultsNoRoll,
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const resultText = container.querySelector('.abjure-result')?.textContent;
    expect(resultText).not.toContain('Roll:');
  });

  it('renders custom getResultText when provided', () => {
    const getResultText = (r) => `Custom: ${r.targetName} - ${r.success ? 'passed' : 'failed'}`;
    const { container } = render(
      renderResultsSection({
        results: [{ targetName: 'Goblin', success: true }],
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
        getResultText,
      }),
    );

    const resultDiv = container.querySelector('.abjure-result');
    expect(resultDiv.textContent).toContain('Custom: Goblin - passed');
  });

  it('uses default text when getResultText is not provided', () => {
    const successResult = render(
      renderResultsSection({
        results: [{ targetName: 'Goblin', success: true }],
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const successDiv = successResult.container.querySelector('.abjure-result');
    expect(successDiv.textContent).toContain('Saved');
    expect(successDiv.textContent).toContain('unaffected');

    const failureResult = render(
      renderResultsSection({
        results: [{ targetName: 'Goblin', success: false }],
        pendingPrompts: [],
        allResolved: true,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    const failureDiv = failureResult.container.querySelector('.abjure-result');
    expect(failureDiv.textContent).toContain('Failed');
  });

  it('renders with empty results and pending prompts', () => {
    render(
      renderResultsSection({
        results: [],
        pendingPrompts: [],
        allResolved: true,
        saveType: 'WIS',
        saveDc: 10,
      }),
    );

    expect(screen.getByText('Resolving WIS saving throws (DC 10)...')).toBeInTheDocument();
    expect(screen.getByText('All targets resolved.')).toBeInTheDocument();
  });

  it('shows no resolved message when allResolved is false with empty data', () => {
    const { container } = render(
      renderResultsSection({
        results: [],
        pendingPrompts: [],
        allResolved: false,
        saveType: 'DEX',
        saveDc: 13,
      }),
    );

    expect(container.querySelector('.abjure-results-list')).toBeInTheDocument();
    expect(screen.queryByText('All targets resolved.')).not.toBeInTheDocument();
  });
});

// ── logSaveEntry Tests ─────────────────────────────────────────

describe('logSaveEntry', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('calls addEntry with all correct fields for failure', () => {
    logSaveEntry(
      'TestCampaign',
      'Fireball',
      'Wizard',
      'Goblin',
      15,
      'DEX',
      false,
      8,
      [7],
      1,
      '1d20+1',
    );

    expect(logService.addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'roll',
      name: 'Fireball',
      characterName: 'Wizard',
      rollType: 'save-damage',
      targetName: 'Goblin',
      saveDc: 15,
      saveType: 'DEX',
      saveResult: 'failure',
      total: 8,
      rolls: [7],
      bonus: 1,
      formula: '1d20+1',
      timestamp: expect.any(Number),
    });
  });

  it('calls addEntry with success result when success is true', () => {
    logSaveEntry(
      'TestCampaign',
      'Fireball',
      'Wizard',
      'Goblin',
      15,
      'DEX',
      true,
      18,
      [17],
      1,
      '1d20+1',
    );

    const call = logService.addEntry.mock.calls[0][1];
    expect(call.saveResult).toBe('success');
  });

  it('includes timestamp as current time', () => {
    const before = Date.now();
    logSaveEntry(
      'TestCampaign',
      'Burning Hands',
      'Wizard',
      'Orc',
      12,
      'DEX',
      true,
      15,
      [15],
      0,
      '1d20',
    );
    const after = Date.now();

    const call = logService.addEntry.mock.calls[0][1];
    expect(call.timestamp).toBeGreaterThanOrEqual(before);
    expect(call.timestamp).toBeLessThanOrEqual(after);
  });

  it('handles empty rolls array', () => {
    logSaveEntry(
      'TestCampaign',
      'Test Spell',
      'Caster',
      'Target',
      10,
      'STR',
      false,
      0,
      [],
      0,
      '1d20 (waiting)',
    );

    const call = logService.addEntry.mock.calls[0][1];
    expect(call.rolls).toEqual([]);
  });

  it('catches and logs addEntry errors without throwing', async () => {
    logService.addEntry.mockRejectedValueOnce(new Error('network error'));

    logSaveEntry(
      'TestCampaign',
      'Test Spell',
      'Caster',
      'Target',
      10,
      'DEX',
      false,
      0,
      [],
      0,
      '1d20',
    );

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AreaEffectModal] Error:',
        expect.any(Error),
      );
    });
  });
});

// ── persistAndNotify Tests ─────────────────────────────────────

describe('persistAndNotify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls setCombatSummaryCache with correct arguments', () => {
    const combatSummary = {
      creatures: [{ name: 'Goblin', type: 'monster' }],
      players: [{ name: 'Wizard' }],
    };

    persistAndNotify(combatSummary, 'TestCampaign');

    expect(combatData.setCombatSummaryCache).toHaveBeenCalledWith(combatSummary, 'TestCampaign');
  });

  it('calls storage.set with correct arguments', () => {
    const combatSummary = {
      creatures: [{ name: 'Goblin', type: 'monster' }],
      players: [{ name: 'Wizard' }],
    };

    persistAndNotify(combatSummary, 'TestCampaign');

    expect(storage.default.set).toHaveBeenCalledWith(
      'combatSummary',
      combatSummary,
      'TestCampaign',
    );
  });

  it('dispatches combat-summary-updated event', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    const combatSummary = {
      creatures: [],
      players: [],
    };

    persistAndNotify(combatSummary, 'TestCampaign');

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.any(Object),
    );
    expect(dispatchEventSpy.mock.calls[0][0].type).toBe('combat-summary-updated');
  });

  it('works with empty combatSummary', () => {
    const combatSummary = { creatures: [], players: [] };

    persistAndNotify(combatSummary, 'EmptyCampaign');

    expect(storage.default.set).toHaveBeenCalledWith(
      'combatSummary',
      combatSummary,
      'EmptyCampaign',
    );
    expect(combatData.setCombatSummaryCache).toHaveBeenCalledWith(combatSummary, 'EmptyCampaign');
  });
});
