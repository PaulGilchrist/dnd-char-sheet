import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ logEntries: [], initialized: true }));
const mockAddEntry = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../hooks/runtime/useLog.js', () => ({
  default: vi.fn(() => ({
    logEntries: mockState.logEntries,
    initialized: mockState.initialized,
    addEntry: mockAddEntry,
  })),
}));

import Log from './Log.jsx';

const CHARS = [{ name: 'Frodo' }, { name: 'Aragorn' }];

const hp = (o = {}) => ({
  id: 'hp', type: 'hp_change', targetName: 'Gimli', delta: -5, currentHp: 20,
  maxHp: 25, threshold: undefined, sourceName: '', isUnconscious: false,
  timestamp: Date.now(), ...o,
});

const heal = (o = {}) => ({
  id: 'h', type: 'healing', targetName: 'Frodo', sourceName: 'Cleric',
  amount: 10, resurrection: false, timestamp: Date.now(), ...o,
});

const ds = (o = {}) => ({
  id: 'ds', type: 'death_save', characterName: 'Gimli', success: true, roll: 15,
  isNatural20: false, isNatural1: false, timestamp: Date.now(), ...o,
});

const spell = (o = {}) => ({
  id: 's', type: 'spell', characterName: 'Gandalf', spellName: 'Fireball',
  spellLevel: 3, castingTime: 'Action', metamagic: [], spCost: 0,
  timestamp: Date.now(), ...o,
});

function setup(entries, initialized, characters) {
  mockState.logEntries.length = 0;
  if (entries) mockState.logEntries.push(...entries);
  mockState.initialized = initialized ?? true;
  return render(<Log campaignName="test-campaign" characters={characters ?? CHARS} />);
}

describe('HpChangeEntry - damage breakdown', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders damage breakdown with resistance and immunity badges', () => {
    setup([hp({
      delta: -10,
      currentHp: 20,
      maxHp: 25,
      damageBreakdown: [
        { damageType: 'fire', status: 'resistant' },
        { damageType: 'cold', status: 'immune' },
      ],
    })]);
    expect(screen.getByText(/10 HP/i)).toBeInTheDocument();
    expect(screen.getByText(/fire/i)).toBeInTheDocument();
    expect(screen.getByText(/cold/i)).toBeInTheDocument();
    expect(screen.getByText(/Resistance/i)).toBeInTheDocument();
    expect(screen.getByText(/Immune/i)).toBeInTheDocument();
    expect(document.querySelectorAll('.log-damage-breakdown-item').length).toBe(2);
  });

  it('renders damage breakdown with plus delta', () => {
    setup([hp({
      delta: 5,
      currentHp: 30,
      maxHp: 30,
      damageBreakdown: [
        { damageType: 'healing', status: 'normal' },
      ],
    })]);
    expect(screen.getByText(/\+5 HP/i)).toBeInTheDocument();
  });

  it('renders rollInfo for healing', () => {
    setup([hp({
      delta: 8,
      rollInfo: '2d8+2',
      isTemp: false,
    })]);
    expect(screen.getByText(/\(2d8\+2\)/i)).toBeInTheDocument();
  });

  it('renders formula for healing', () => {
    setup([hp({
      delta: 6,
      formula: '1d8+1',
      isTemp: false,
    })]);
    expect(screen.getByText(/1d8\+1/i)).toBeInTheDocument();
  });

  it('renders bonusDetails for healing', () => {
    setup([hp({
      delta: 12,
      bonusDetails: [
        { amount: 4, name: 'Inspiration' },
        { amount: 2, name: 'Channel Divinity' },
      ],
      isTemp: false,
    })]);
    expect(screen.getByText(/plus/i)).toBeInTheDocument();
    expect(screen.getByText(/4 \[Inspiration\]/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \[Channel Divinity\]/i)).toBeInTheDocument();
  });

  it('hides rollInfo/formula/bonusDetails for damage', () => {
    setup([hp({
      delta: -5,
      rollInfo: 'should not show',
      formula: 'should not show',
      bonusDetails: [{ amount: 1, name: 'test' }],
    })]);
    expect(screen.queryByText(/should not show/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 \[test\]/i)).not.toBeInTheDocument();
  });
});

describe('HealingEntry - resurrection', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders resurrection badge and "Brought Back to Life"', () => {
    setup([heal({
      resurrection: true,
      amount: 25,
      sourceName: 'Cleric',
    })]);
    expect(screen.getByText(/Brought Back to Life/i)).toBeInTheDocument();
    expect(screen.getByText(/Resurrection/i)).toBeInTheDocument();
    expect(screen.getByText(/Returns to life with 25 HP/i)).toBeInTheDocument();
    expect(q('.log-entry.log-healing.log-resurrection')).toBeInTheDocument();
    expect(q('.log-healing i.fa-dove')).toBeInTheDocument();
  });

  it('renders normal healing without resurrection badge', () => {
    setup([heal({ amount: 10, sourceName: 'Cleric' })]);
    expect(screen.getByText(/Healed \(Cleric\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Healed for 10 HP/i)).toBeInTheDocument();
    expect(q('.log-resurrection-badge')).not.toBeInTheDocument();
    expect(q('.log-healing i.fa-heart')).toBeInTheDocument();
  });

  it('renders popupText when present', () => {
    setup([heal({
      resurrection: true,
      amount: 30,
      popupText: 'You feel the warmth of life returning.',
    })]);
    expect(screen.getByText(/You feel the warmth/i)).toBeInTheDocument();
  });

  it('renders healingName when no sourceName', () => {
    setup([heal({
      amount: 5,
      sourceName: '',
      healingName: 'Lay on Hands',
    })]);
    expect(q('.log-name')).toHaveTextContent(/Lay on Hands/i);
  });
});

describe('DeathSaveEntry - totals and edge cases', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('shows total successes and failures', () => {
    setup([ds({
      totalSuccesses: 1,
      totalFailures: 2,
    })]);
    expect(screen.getByText(/✓ 1/i)).toBeInTheDocument();
    expect(screen.getByText(/✗ 2/i)).toBeInTheDocument();
    expect(q('.log-death-save-totals')).toBeInTheDocument();
  });

  it('shows only successes when failures null', () => {
    setup([ds({
      totalSuccesses: 2,
      totalFailures: null,
    })]);
    expect(screen.getByText(/✓ 2/i)).toBeInTheDocument();
    expect(screen.queryByText(/✗/)).not.toBeInTheDocument();
  });

  it('shows only failures when successes null', () => {
    setup([ds({
      totalSuccesses: null,
      totalFailures: 3,
    })]);
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
    expect(screen.getByText(/✗ 3/i)).toBeInTheDocument();
  });

  it('stable result shows "Stabilized!"', () => {
    setup([ds({
      result: 'stable',
      success: true,
    })]);
    expect(screen.getByText(/Stabilized!/i)).toBeInTheDocument();
    expect(screen.queryByText(/Death Save Success/i)).not.toBeInTheDocument();
  });

  it('dead result shows "Has Perished!" with skull icon', () => {
    setup([ds({
      result: 'dead',
      success: false,
    })]);
    expect(screen.getByText(/Has Perished!/i)).toBeInTheDocument();
    expect(q('.log-death-save i.fa-skull')).toBeInTheDocument();
  });
});

describe('SpellEntry - damage, saveDC, concentration, targets', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('shows damage formula and type when present', () => {
    setup([spell({
      damageFormula: '8d6',
      damageType: 'fire',
    })]);
    expect(screen.getByText(/8d6 fire/i)).toBeInTheDocument();
    expect(q('.log-damage')).toBeInTheDocument();
  });

  it('shows save DC when present', () => {
    setup([spell({
      saveDC: 15,
    })]);
    expect(screen.getByText(/Save DC 15/i)).toBeInTheDocument();
    expect(q('.log-save-dc')).toBeInTheDocument();
  });

  it('shows concentration badge when present', () => {
    setup([spell({
      concentration: true,
    })]);
    expect(screen.getByText(/Concentration/i)).toBeInTheDocument();
    expect(q('.log-concentration i.fa-link')).toBeInTheDocument();
  });

  it('shows single target arrow', () => {
    setup([spell({
      targetName: 'Orc',
    })]);
    expect(screen.getByText(/→ Orc/i)).toBeInTheDocument();
  });

  it('shows multiple targets list', () => {
    setup([spell({
      targets: ['Orc', 'Goblin', 'Troll'],
    })]);
    expect(screen.getByText(/→ Orc, Goblin, Troll/i)).toBeInTheDocument();
    expect(q('.log-targets')).toBeInTheDocument();
  });

  it('renders description with dangerouslySetInnerHTML', () => {
    setup([spell({
      description: '<p>Blazing sphere of fire</p>',
    })]);
    expect(q('.log-spell-description')).toBeInTheDocument();
  });
});

// Q helper
function q(sel) {
  return document.querySelector(sel);
}
