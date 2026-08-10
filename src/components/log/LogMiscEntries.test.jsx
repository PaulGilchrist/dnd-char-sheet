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

const rest = (o = {}) => ({
  id: 'r', type: 'long_rest', message: 'Full rest | HP restored', timestamp: Date.now(), ...o,
});

const automation = (o = {}) => ({
  id: 'a', type: 'automation', creatureName: 'Orc', name: 'Melee Attack',
  description: 'Orc attacks with longsword', timestamp: Date.now(), ...o,
});

const saveResult = (o = {}) => ({
  id: 'sr', type: 'save_result', characterName: 'Frodo', targetName: 'Orc',
  saveType: 'wisdom', saveDc: 13, success: true, timestamp: Date.now(), ...o,
});

const psionic = (o = {}) => ({
  id: 'ps', type: 'psionic_sorcery', characterName: 'Sorcerer',
  spellName: 'Burning Hands', sorceryPointsSpent: 1, spellLevel: 1,
  note: '', timestamp: Date.now(), ...o,
});

const summons = (o = {}) => ({
  id: 'su', type: 'summons', characterName: 'Wizard',
  summonName: 'Small Spider', description: '', summonedCreatures: [],
  duration: '1 hour', timestamp: Date.now(), ...o,
});

const spellEffect = (o = {}) => ({
  id: 'se', type: 'spell_effect', characterName: 'Cleric',
  spellName: 'Bless', targetName: 'Party', effects: ['Roll d4 on attack rolls'],
  timestamp: Date.now(), ...o,
});

const buff = (o = {}) => ({
  id: 'b', type: 'buff', characterName: 'Frodo', buffName: 'Blessing',
  reason: 'Cleric cast bless', action: 'added', timestamp: Date.now(), ...o,
});

function setup(entries, initialized, characters) {
  mockState.logEntries.length = 0;
  if (entries) mockState.logEntries.push(...entries);
  mockState.initialized = initialized ?? true;
  return render(<Log campaignName="test-campaign" characters={characters ?? CHARS} />);
}

describe('RestEntry - long and short rest', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders long rest with moon icon and correct classes', () => {
    setup([rest({
      type: 'long_rest',
      message: 'Full rest | HP restored',
    })]);
    expect(screen.getByText(/Long Rest/i)).toBeInTheDocument();
    expect(q('.log-entry.log-rest.log-rest-long')).toBeInTheDocument();
    expect(q('.log-rest i.fa-moon')).toBeInTheDocument();
    expect(q('.log-rest-details')).toHaveTextContent(/Full rest/i);
  });

  it('renders short rest with bed icon and correct classes', () => {
    setup([rest({
      type: 'short_rest',
      message: 'Short rest | Minor recovery',
    })]);
    expect(q('.log-name')).toHaveTextContent(/Short Rest/i);
    expect(q('.log-entry.log-rest.log-rest-short')).toBeInTheDocument();
    expect(q('.log-rest i.fa-bed')).toBeInTheDocument();
    expect(q('.log-rest-details')).toHaveTextContent(/Short rest/i);
  });

  it('handles missing message gracefully', () => {
    setup([rest({
      message: '',
    })]);
    expect(q('.log-rest')).toBeInTheDocument();
    expect(q('.log-rest i.fa-moon')).toBeInTheDocument();
  });
});

describe('AutomationEntry', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders creatureName, name, and description', () => {
    setup([automation({
      creatureName: 'Orc',
      name: 'Melee Attack',
      description: 'Orc attacks with longsword',
    })]);
    expect(q('.log-character')).toHaveTextContent(/Orc/i);
    expect(q('.log-name')).toHaveTextContent(/Melee Attack/i);
    expect(q('.log-automation-details')).toHaveTextContent(/Orc attacks with longsword/i);
    expect(q('.log-automation')).toBeInTheDocument();
    expect(q('.log-automation i.fa-wand-sparkles')).toBeInTheDocument();
  });

  it('falls back to characterName when creatureName missing', () => {
    setup([automation({
      creatureName: null,
      characterName: 'Goblin',
      name: 'Hit',
    })]);
    expect(q('.log-character')).toHaveTextContent(/Goblin/i);
  });

  it('falls back to "Automation" when both missing', () => {
    setup([automation({
      creatureName: null,
      characterName: null,
      name: null,
    })]);
    expect(q('.log-character')).toHaveTextContent(/Automation/i);
    expect(q('.log-name')).toHaveTextContent(/Automation/i);
  });

  it('hides description when not present', () => {
    setup([automation({
      description: '',
    })]);
    expect(q('.log-automation-details')).toBeInTheDocument();
    expect(screen.queryByText(/automation/i)).not.toBeInTheDocument();
  });
});

describe('SaveResultEntry', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders save type, DC, success/failure, and description', () => {
    setup([saveResult({
      saveType: 'wisdom',
      saveDc: 15,
      success: true,
      description: '<p>The target resists the effect.</p>',
    })]);
    expect(screen.getByText(/WISDOM save DC 15/i)).toBeInTheDocument();
    expect(screen.getByText(/SAVE SUCCESS/i)).toBeInTheDocument();
    expect(q('.log-save-result-entry.log-save-result-success')).toBeInTheDocument();
    expect(q('.log-save-result-entry i.fa-shield-halved')).toBeInTheDocument();
    expect(q('.log-save-result-description')).toBeInTheDocument();
  });

  it('shows failure state', () => {
    setup([saveResult({
      saveType: 'strength',
      saveDc: 12,
      success: false,
    })]);
    expect(screen.getByText(/SAVE FAILURE/i)).toBeInTheDocument();
    expect(q('.log-save-result-entry.log-save-result-failure')).toBeInTheDocument();
  });

  it('hides description when not present', () => {
    setup([saveResult({
      description: '',
    })]);
    expect(q('.log-save-result-description')).not.toBeInTheDocument();
  });
});

describe('PsionicSorceryEntry', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders spell name, sorcery points, spell level, and note', () => {
    setup([psionic({
      spellName: 'Burning Hands',
      sorceryPointsSpent: 2,
      spellLevel: 2,
      note: 'Using Sorcery Points instead of slot',
    })]);
    expect(screen.getByText(/Psionic Sorcery — Burning Hands/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Sorcery Points/i)).toBeInTheDocument();
    expect(screen.getByText(/instead of Level 2 spell slot/i)).toBeInTheDocument();
    expect(screen.getByText(/Using Sorcery Points instead of slot/i)).toBeInTheDocument();
    expect(q('.log-psionic-sorcery')).toBeInTheDocument();
    expect(q('.log-psionic-sorcery i.fa-brain')).toBeInTheDocument();
  });

  it('hides note when empty', () => {
    setup([psionic({
      note: '',
    })]);
    expect(q('.log-psionic-note')).not.toBeInTheDocument();
  });
});

describe('SummonsEntry', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders summon name, description, creatures list, and duration', () => {
    setup([summons({
      summonName: 'Small Spider',
      description: '<p>A spider appears</p>',
      summonedCreatures: ['Small Spider x2'],
      duration: '1 hour',
    })]);
    expect(screen.getByText(/Summons — Small Spider/i)).toBeInTheDocument();
    expect(q('.log-summons')).toBeInTheDocument();
    expect(q('.log-summons i.fa-horse')).toBeInTheDocument();
    expect(q('.log-summons-description')).toBeInTheDocument();
    expect(q('.log-summons-creatures')).toBeInTheDocument();
    expect(screen.getByText(/Creatures:/i)).toBeInTheDocument();
    expect(screen.getByText(/Small Spider x2/i)).toBeInTheDocument();
    expect(screen.getByText(/Duration: 1 hour/i)).toBeInTheDocument();
  });

  it('hides creatures and duration when not present', () => {
    setup([summons({
      summonedCreatures: [],
      duration: '',
    })]);
    expect(q('.log-summons-creatures')).not.toBeInTheDocument();
    expect(q('.log-summons-duration')).not.toBeInTheDocument();
  });
});

describe('SpellEffectEntry', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders spell name, target, effects list, and medical icon', () => {
    setup([spellEffect({
      spellName: 'Bless',
      targetName: 'Party',
      effects: ['Roll d4 on attack rolls', 'Roll d4 on saving throws'],
    })]);
    expect(screen.getByText(/Bless/i)).toBeInTheDocument();
    expect(screen.getByText(/→ Party/i)).toBeInTheDocument();
    expect(q('.log-spell-effect')).toBeInTheDocument();
    expect(q('.log-spell-effect i.fa-hand-holding-medical')).toBeInTheDocument();
    expect(q('.log-effects-list')).toBeInTheDocument();
    expect(document.querySelectorAll('.log-effects-list li').length).toBe(2);
  });

  it('hides effects when empty', () => {
    setup([spellEffect({
      effects: [],
    })]);
    expect(q('.log-effects-list')).not.toBeInTheDocument();
  });

  it('hides target when not present', () => {
    setup([spellEffect({
      targetName: '',
    })]);
    expect(screen.queryByText(/→ /i)).not.toBeInTheDocument();
  });
});

describe('BuffEntry - added and removed', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  it('renders added buff with heart icon', () => {
    setup([buff({
      buffName: 'Blessing',
      reason: 'Cleric cast bless',
      action: 'added',
    })]);
    expect(screen.getByText(/Effect Added/i)).toBeInTheDocument();
    expect(screen.getByText(/Blessing/i)).toBeInTheDocument();
    expect(screen.getByText(/— Cleric cast bless/i)).toBeInTheDocument();
    expect(q('.log-entry.log-buff.log-buff-added')).toBeInTheDocument();
    expect(q('.log-buff i.fa-heart')).toBeInTheDocument();
  });

  it('renders removed buff with heart-crack icon', () => {
    setup([buff({
      buffName: 'Blessing',
      reason: 'Duration expired',
      action: 'removed',
    })]);
    expect(screen.getByText(/Effect Removed/i)).toBeInTheDocument();
    expect(q('.log-entry.log-buff.log-buff-removed')).toBeInTheDocument();
    expect(q('.log-buff i.fa-heart-crack')).toBeInTheDocument();
  });

  it('hides reason when not present', () => {
    setup([buff({
      reason: '',
    })]);
    expect(screen.queryByText(/— /i)).not.toBeInTheDocument();
  });
});

// Q helper
function q(sel) {
  return document.querySelector(sel);
}
