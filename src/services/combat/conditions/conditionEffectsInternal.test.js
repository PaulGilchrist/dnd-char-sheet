// @cleaned-by-ai
// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { saveModifierApplies } from './conditionEffects.js';

// ---------------------------------------------------------------------------
// saveModifierApplies — target validation
// ---------------------------------------------------------------------------

describe('saveModifierApplies — target validation', () => {
  const baseArgs = ['saving_throw', 'STR', false, false, false, false, null, []];

  it('returns true for valid target types when no other conditions apply', () => {
    expect(saveModifierApplies({ target: 'saving_throw' }, ...baseArgs)).toBe(true);
    expect(saveModifierApplies({ target: 'save' }, ...baseArgs)).toBe(true);
    expect(saveModifierApplies({ target: 'attack_roll' }, ...baseArgs)).toBe(true);
    expect(saveModifierApplies({ target: 'attack_rolls' }, ...baseArgs)).toBe(true);
    expect(
      saveModifierApplies({ target: 'attack_rolls_vs_unmounted_near_mount' }, ...baseArgs),
    ).toBe(true);
    expect(
      saveModifierApplies({ target: 'concentration_saving_throws' }, ...baseArgs),
    ).toBe(true);
    expect(saveModifierApplies({ target: 'death_saving_throws' }, ...baseArgs)).toBe(true);
  });

  it('returns false for unknown target types', () => {
    expect(saveModifierApplies({ target: 'unknown_target' }, ...baseArgs)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — effect short-circuit paths
// ---------------------------------------------------------------------------

describe('saveModifierApplies — effect short-circuits', () => {
  const baseArgs = ['saving_throw', 'STR', false, false, false, false, null, []];

  const effectShortCircuits = [
    'replacement',
    'reliable_talent',
    'dex_jump',
    'restore_balance',
    'd20_floor_10',
    'no_advantage_against',
    'dark_ones_luck',
    'portent',
    'potent_cantrip',
    'soulstitch_spells',
  ];

  for (const effect of effectShortCircuits) {
    it(`returns true for effect "${effect}" regardless of other conditions`, () => {
      const modifier = { target: 'saving_throw', effect };
      expect(saveModifierApplies(modifier, ...baseArgs)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// saveModifierApplies — creature_grappled_by_you
// ---------------------------------------------------------------------------

describe('saveModifierApplies — creature_grappled_by_you', () => {
  const modifier = { target: 'saving_throw', condition: 'creature_grappled_by_you' };
  const baseArgs = ['DEX', 'STR', false, false, false, false];

  it('returns true when active creature attacks a grappled target', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['grappled'] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns true when grappled condition is stored as an object', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: [{ key: 'grappled' }] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns true when grappled condition is mixed with other condition objects', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['blinded', { key: 'grappled' }] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns false when target has no grappled condition', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['blinded'] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when target has no conditions array', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when combatContext is null', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, null, [])).toBe(false);
  });

  it('returns false when combatContext has no creatures array', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, {}, [])).toBe(false);
  });

  it('returns false when attackerName is null', () => {
    const combatContext = {
      creatures: [{ name: 'Goblin', conditions: ['grappled'] }],
      attackerName: null,
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('falls back to attackerName when activeCreatureName is missing', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['grappled'] },
      ],
      attackerName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns false when attacker creature has no targetName', () => {
    const combatContext = {
      creatures: [{ name: 'Player' }],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — grappling_target
// ---------------------------------------------------------------------------

describe('saveModifierApplies — grappling_target', () => {
  const modifier = { target: 'attack_roll', condition: 'grappling_target', effect: 'advantage' };
  const baseArgs = ['DEX', 'STR', false, false, false, false];

  it('returns true when attacker has grappled target (5e Grappler feat)', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['grappled'] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns false when target is not grappled', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin', conditions: ['blinded'] },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when combatContext is null', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, null, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — mounted_and_target_one_size_smaller
// ---------------------------------------------------------------------------

describe('saveModifierApplies — mounted_and_target_one_size_smaller', () => {
  const modifier = {
    target: 'attack_roll',
    condition: 'mounted_and_target_one_size_smaller',
  };
  const baseArgs = ['DEX', 'STR', false, false, false, false];

  it('returns true when mounted attacker strikes a one-size-smaller target within 5ft', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Large', targetName: 'Goblin', rangeToTarget: 5 },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns true when rangeToTarget is undefined (treated as within range)', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Large', targetName: 'Goblin' },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(true);
  });

  it('returns false when attacker is not mounted', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: false, targetName: 'Goblin' },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when attacker is incapacitated', () => {
    const combatContext = {
      creatures: [
        {
          name: 'Player',
          isMounted: true,
          mountSize: 'Large',
          targetName: 'Goblin',
          rangeToTarget: 5,
          conditions: ['incapacitated'],
        },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when incapacitated condition is stored as an object', () => {
    const combatContext = {
      creatures: [
        {
          name: 'Player',
          isMounted: true,
          mountSize: 'Large',
          targetName: 'Goblin',
          rangeToTarget: 5,
          conditions: [{ key: 'incapacitated' }],
        },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when target is same size as mount', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Medium', targetName: 'Orc', rangeToTarget: 5 },
        { name: 'Orc', size: 'Medium' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when target is larger than mount', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Small', targetName: 'Ogre', rangeToTarget: 5 },
        { name: 'Ogre', size: 'Large' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when beyond 5ft range', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Large', targetName: 'Goblin', rangeToTarget: 10 },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when combatContext is null', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, null, [])).toBe(false);
  });

  it('returns false when combatContext has no creatures array', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, {}, [])).toBe(false);
  });

  it('returns false when attacker creature is not found', () => {
    const combatContext = {
      creatures: [{ name: 'Other', isMounted: true, mountSize: 'Large' }],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when target creature is not found', () => {
    const combatContext = {
      creatures: [{ name: 'Player', isMounted: true, mountSize: 'Large', targetName: 'Missing' }],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when mountSize is unrecognized', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Unknown', targetName: 'Goblin', rangeToTarget: 5 },
        { name: 'Goblin', size: 'Small' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });

  it('returns false when target size is unrecognized', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', isMounted: true, mountSize: 'Large', targetName: 'Goblin', rangeToTarget: 5 },
        { name: 'Goblin', size: 'Unknown' },
      ],
      activeCreatureName: 'Player',
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — condition-based boolean checks
// ---------------------------------------------------------------------------

describe('saveModifierApplies — condition-based boolean checks', () => {
  const fnArgs = ['saving_throw', 'STR', false, false, false, false, null, []];

  it('returns isRaging when condition is raging', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'raging' }, 'saving_throw', 'STR', true, false, false, false, null, [])).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'raging' }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(false);
  });

  it('returns shapeShiftActive when condition is shape_shift', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'shape_shift' }, 'saving_throw', 'STR', false, true, false, false, null, [])).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'shape_shift' }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(false);
  });

  it('returns isPeerlessAthlete when condition is peerless_athlete', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'peerless_athlete' }, 'saving_throw', 'STR', false, false, true, false, null, [])).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'peerless_athlete' }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(false);
  });

  it('returns isLargeFormActive when condition is large_form_active', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'large_form_active' }, 'saving_throw', 'STR', false, false, false, true, null, [])).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'large_form_active' }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(false);
  });

  const alwaysTrueConditions = [
    'fiend_undead',
    'concentration_breaker',
    'pfeag_save_advantage',
  ];

  for (const condition of alwaysTrueConditions) {
    it(`returns true when condition is "${condition}"`, () => {
      expect(saveModifierApplies({ target: 'saving_throw', condition }, ...fnArgs)).toBe(true);
    });
  }

  it('returns isLivingLegendActive when condition is living_legend_active', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'living_legend_active' }, ...fnArgs, null, true, false, false, false)).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'living_legend_active' }, ...fnArgs, null, false, false, false, false)).toBe(false);
  });

  it('returns isElderChampionActive when condition is elder_champion_active', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'elder_champion_active' }, ...fnArgs, null, false, true, false, false, false)).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'elder_champion_active' }, ...fnArgs, null, false, false, false, false, false)).toBe(false);
  });

  it('returns true when attackerName is in holyAuraTargets for holy_aura_active', () => {
    expect(saveModifierApplies({ target: 'attack_roll', condition: 'holy_aura_active' }, ...fnArgs, 'Player', false, false, false, ['Player', 'Ally'], false, false, false, false)).toBe(true);
    expect(saveModifierApplies({ target: 'attack_roll', condition: 'holy_aura_active' }, ...fnArgs, 'Player', false, false, false, ['Ally', 'Enemy'], false, false, false, false)).toBe(false);
  });

  it('returns isProtectionFromPoisonActive when condition is protection_from_poison_active', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'protection_from_poison_active' }, ...fnArgs, null, false, false, false, false, true)).toBe(true);
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'protection_from_poison_active' }, ...fnArgs, null, false, false, false, false, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — saveType-based conditions
// ---------------------------------------------------------------------------

describe('saveModifierApplies — saveType-based conditions', () => {
  const baseArgs = ['STR', 'STR', false, false, false, false, null, []];

  it('returns true when charmed condition matches charmed saveType', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'charmed' }, 'charmed', ...baseArgs.slice(1))).toBe(true);
  });

  it('returns true when frightened condition matches frightened saveType', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'frightened' }, 'frightened', ...baseArgs.slice(1))).toBe(true);
  });

  it('returns true when poison condition matches poison saveType', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'poison' }, 'poison', ...baseArgs.slice(1))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — magic condition with abilities
// ---------------------------------------------------------------------------

describe('saveModifierApplies — magic condition', () => {
  const baseArgs = ['DEX', 'DEX', false, false, false, false, null, []];

  it('returns true when abilities array is empty', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'magic', abilities: [] }, ...baseArgs)).toBe(true);
  });

  it('returns true when abilityName matches an ability in the list', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'magic', abilities: ['DEX', 'WIS'] }, ...baseArgs)).toBe(true);
  });

  it('returns false when abilityName does not match any ability', () => {
    expect(
      saveModifierApplies({ target: 'saving_throw', condition: 'magic', abilities: ['DEX', 'WIS'] }, 'CON', 'STR', false, false, false, false, null, []),
    ).toBe(false);
  });

  it('returns false when abilityName is null and abilities list is non-empty', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'magic', abilities: ['DEX'] }, 'saving_throw', null, false, false, false, false, null, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — first_round_target_no_turn
// ---------------------------------------------------------------------------

describe('saveModifierApplies — first_round_target_no_turn', () => {
  const modifier = { target: 'saving_throw', condition: 'first_round_target_no_turn' };
  const baseArgs = ['DEX', 'STR', false, false, false, false];

  it('returns true on round 1 when target has lower or equal initiative (to the right)', () => {
    const combatContext = {
      round: 1,
      creatures: [
        { name: 'Ally', targetName: 'Goblin' },
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(true);
  });

  it('returns false on round 1 when target has higher initiative (to the left)', () => {
    const combatContext = {
      round: 1,
      creatures: [
        { name: 'Goblin' },
        { name: 'Player', targetName: 'Goblin' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(false);
  });

  it('returns false when target has same initiative as attacker (same index)', () => {
    const combatContext = {
      round: 1,
      creatures: [
        { name: 'Player', targetName: 'Player' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(false);
  });

  it('returns false on round 2', () => {
    const combatContext = {
      round: 2,
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(false);
  });

  it('returns false when combatContext is null', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, null, [], 'Player')).toBe(false);
  });

  it('returns false when combatContext has no creatures', () => {
    expect(saveModifierApplies(modifier, ...baseArgs, {}, [], 'Player')).toBe(false);
  });

  it('returns true when round is missing (defaults to 1) and target is to the right', () => {
    const combatContext = {
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(true);
  });

  it('returns true when targetName is missing', () => {
    const combatContext = {
      round: 1,
      creatures: [
        { name: 'Player' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], 'Player')).toBe(true);
  });

  it('returns true when attackerName is missing', () => {
    const combatContext = {
      round: 1,
      creatures: [
        { name: 'Player', targetName: 'Goblin' },
        { name: 'Goblin' },
      ],
    };
    expect(saveModifierApplies(modifier, ...baseArgs, combatContext, [], null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// saveModifierApplies — condition keyword matching
// ---------------------------------------------------------------------------

describe('saveModifierApplies — condition keyword matching', () => {
  it('returns true when modifier.condition is in the conditions set', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'rage' }, 'saving_throw', 'STR', false, false, false, false, null, ['rage'])).toBe(true);
  });

  it('returns false when modifier.condition is not in conditions set and no abilities match', () => {
    expect(saveModifierApplies({ target: 'saving_throw', condition: 'rage', abilities: ['STR'] }, 'saving_throw', 'DEX', false, false, false, false, null, [])).toBe(false);
  });

  it('returns true when abilityName matches modifier.abilities', () => {
    expect(saveModifierApplies({ target: 'saving_throw', abilities: ['STR', 'DEX'] }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(true);
  });

  it('returns true when abilityName is null and modifier has abilities', () => {
    expect(saveModifierApplies({ target: 'saving_throw', abilities: ['STR', 'DEX'] }, 'saving_throw', null, false, false, false, false, null, [])).toBe(true);
  });

  it('returns true as final fallback when nothing else matches', () => {
    expect(saveModifierApplies({ target: 'saving_throw' }, 'saving_throw', 'STR', false, false, false, false, null, [])).toBe(true);
  });
});
