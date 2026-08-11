import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn((formula) => {
    if (!formula || formula === '0') return null;
    const baseFormula = formula.replace(/\s*\[.*?\]\s*/g, '').trim();
    if (!baseFormula) return null;
    const match = baseFormula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const modStr = match[3] ? parseInt(match[3], 10) : 0;
      const rolls = Array(count).fill(Math.floor(sides / 2) + 1);
      const total = rolls.reduce((s, r) => s + r, 0) + modStr;
      return { total, rolls, modifier: modStr };
    }
    const numMatch = baseFormula.match(/^(\d+)$/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      return { total: val, rolls: [val], modifier: 0 };
    }
    return { total: 6, rolls: [6], modifier: 0 };
  }),
  rollExpressionDoubled: vi.fn((formula) => {
    if (!formula || formula === '0') return null;
    const baseFormula = formula.replace(/\s*\[.*?\]\s*/g, '').trim();
    if (!baseFormula) return null;
    const match = baseFormula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const modStr = match[3] ? parseInt(match[3], 10) : 0;
      const rolls = Array(count).fill(Math.floor(sides / 2) + 1);
      const total = (rolls.reduce((s, r) => s + r, 0) * 2) + modStr;
      const doubledRolls = rolls.concat(rolls);
      return { total, rolls, doubledRolls, modifier: modStr };
    }
    return { total: 12, rolls: [6], modifier: 0 };
  }),
  rollExpressionMaximized: vi.fn((formula) => {
    if (!formula) return null;
    const baseFormula = formula.replace(/\s*\[.*?\]\s*/g, '').trim();
    if (!baseFormula) return null;
    const match = baseFormula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const modStr = match[3] ? parseInt(match[3], 10) : 0;
      return { total: count * sides + modStr, rolls: Array(count).fill(sides), modifier: modStr, maximized: true };
    }
    return { total: 12, rolls: [6], modifier: 0 };
  }),
}));

vi.mock('../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(() => 1),
  loadCombatSummary: vi.fn(() => Promise.resolve({ lastAttack: {} })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_characterKey, _propertyName, _campaignName) => null),
  setRuntimeValue: vi.fn(),
  setRuntimeObject: vi.fn(),
}));

vi.mock('../../combat/automation/automationService.js', () => ({
  hasTwoWeaponFighting: vi.fn(() => false),
  collectWeaponMastery: vi.fn(),
  evaluateAutoExpression: vi.fn((expr, playerStats) => {
    if (expr === 'proficiency_bonus') return playerStats?.proficiency || 0;
    return null;
  }),
}));

vi.mock('../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getAttackRiderOptions: vi.fn(() => Promise.resolve([])),
  getAttackRiderOptionsByContext: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../combat/prompts/bardicInspirationPromptUtils.js', () => ({
  sendBardicInspirationOffensePrompt: vi.fn(),
}));

vi.mock('../../combat/auras/bardicInspirationState.js', () => ({
  hasBardicInspirationOffense: vi.fn(() => false),
  getBardicInspirationDieSize: vi.fn(() => null),
}));

vi.mock('../../automation/common/resourceCheck.js', () => ({
  spendResource: vi.fn(),
}));

vi.mock('../../automation/common/buffToggle.js', () => ({
  getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../ui/utils.js', () => ({
  default: { guid: () => 'test-guid-123' },
}));

vi.mock('./features/index.js', () => ({
  featureModules: [],
}));

vi.mock('../../automation/handlers/combat/weaponMasteryHandler.js', () => ({
  applyMasteryEffect: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../rules/combat/rangeValidation.js', () => ({
  getDistanceFeet: vi.fn(() => 3),
}));

vi.mock('../../automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id', promise: Promise.resolve({ success: true }) })),
}));

// ── Imports ──────────────────────────────────────────────────────

const { buildAttackRollDamageSteps } = await import('./attackRollDamageSteps.js');
const { getRuntimeValue, setRuntimeValue } = await import('../../../hooks/runtime/useRuntimeState.js');
const { addEntry } = await import('../../ui/logService.js');
const { loadCombatSummary } = await import('../../encounters/combatData.js');

// ── Helpers ───────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    attack: {},
    playerStats: {
      name: 'TestChar',
      abilities: [{ name: 'Strength', bonus: 3 }],
      automation: { actions: [], passives: [] },
      level: 5,
      proficiency: 3,
    },
    proceedWithDamage: vi.fn(),
    campaignName: 'test-campaign',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('buildAttackRollDamageSteps - automationBonuses', () => {
  let steps;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadCombatSummary).mockImplementation(() => Promise.resolve({ lastAttack: { hit: true } }));
    steps = buildAttackRollDamageSteps();
  });

  // ──────────────────────────────────────────────────────────────
  // automationBonuses (index 10)
  // ──────────────────────────────────────────────────────────────

  describe('automationBonuses step', () => {
    describe('condition', () => {
      it('returns true when ctx.isMeleeOrUnarmed is true and automation.actions exists', () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: { automation: { actions: [] } },
        });
        expect(steps[10].condition(ctx)).toBe(true);
      });

      it('returns true when isMeleeOrUnarmed is false but automation exists', () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: false,
          playerStats: { automation: { actions: [] } },
        });
        expect(steps[10].condition(ctx)).toBe(true);
      });

      it('returns false when automation.actions is missing', () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: { automation: {} },
        });
        expect(steps[10].condition(ctx)).toBe(false);
      });
    });

    describe('handler', () => {
      it('returns data when no matching actions', async () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: { automation: { actions: [] } },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toBe('1d8+3');
      });

      it('applies melee_weapon_hit damage_bonus actions', async () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'melee_weapon_hit', damageExpression: '1d6', damageType: 'fire' },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [fire]');
      });

      it('applies monk_weapon_or_unarmed_hit with elemental attunement', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_Elemental_Attunement_option') return 'fire';
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'monk_weapon_or_unarmed_hit', damageExpression: '1d6', damageType: '' },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [fire]');
      });

      it('applies monk_weapon_or_unarmed_hit with default fire when no elemental attunement', async () => {
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'monk_weapon_or_unarmed_hit', damageExpression: '1d6', damageType: '' },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [fire]');
      });

      it('applies monk_weapon_or_unarmed_hit with lowercase option', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_Elemental_Attunement_option') return 'Lightning';
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'monk_weapon_or_unarmed_hit', damageExpression: '1d6', damageType: '' },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [lightning]');
      });

      it('applies melee_heavy_weapon_hit when weapon is heavy', async () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'melee_heavy_weapon_hit', damageExpression: '1d6', damageType: 'slashing' },
              ],
            },
          },
          attack: { properties: ['Heavy'] },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [slashing]');
      });

      it('does not apply melee_heavy_weapon_hit when weapon is not heavy', async () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'melee_heavy_weapon_hit', damageExpression: '1d6', damageType: 'slashing' },
              ],
            },
          },
          attack: { properties: ['Finesse'] },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 1d6');
      });

      it('defaults to Slashing for melee_heavy_weapon_hit when no damageType', async () => {
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'melee_heavy_weapon_hit', damageExpression: '1d6' },
              ],
            },
          },
          attack: { properties: ['Heavy'] },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [Slashing]');
      });

      it('applies frenzy when reckless + raging + strength', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_frenzyUsedRound') return null;
          if (prop === 'activeBuffs') return [
            { effect: 'advantage_attacks_advantage_against' },
            { damageBonusExpression: '1d6' },
          ];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            name: 'TestChar',
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'reckless_attack_hit_while_raging', damageExpression: 'rage_damage', damageType: '' },
              ],
            },
            class: { class_levels: [{ rage_damage: 2 }] },
            level: 5,
          },
          attack: { abilityName: 'Strength' },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 2');
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'TestChar',
          '_frenzyUsedRound',
          1,
          'test-campaign',
        );
      });

      it('does not apply frenzy when not reckless', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_frenzyUsedRound') return null;
          if (prop === 'activeBuffs') return [{ damageBonusExpression: '1d6' }];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            name: 'TestChar',
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'reckless_attack_hit_while_raging', damageExpression: '2', damageType: '' },
              ],
            },
            level: 5,
          },
          attack: { abilityName: 'Strength' },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('does not apply frenzy when not raging', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_frenzyUsedRound') return null;
          if (prop === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            name: 'TestChar',
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'reckless_attack_hit_while_raging', damageExpression: '2', damageType: '' },
              ],
            },
            level: 5,
          },
          attack: { abilityName: 'Strength' },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('does not apply frenzy when not strength', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_frenzyUsedRound') return null;
          if (prop === 'activeBuffs') return [
            { effect: 'advantage_attacks_advantage_against' },
            { damageBonusExpression: '1d6' },
          ];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            name: 'TestChar',
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'reckless_attack_hit_while_raging', damageExpression: '2', damageType: '' },
              ],
            },
            level: 5,
          },
          attack: { abilityName: 'Dexterity' },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('does not apply frenzy when already used this round', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_frenzyUsedRound') return 1;
          if (prop === 'activeBuffs') return [
            { effect: 'advantage_attacks_advantage_against' },
            { damageBonusExpression: '1d6' },
          ];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            name: 'TestChar',
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'reckless_attack_hit_while_raging', damageExpression: '2', damageType: '' },
              ],
            },
            level: 5,
          },
          attack: { abilityName: 'Strength' },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('applies divine fury while raging', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_divineFuryUsedRound') return null;
          if (prop === 'activeBuffs') return [{ damageBonusExpression: '1d6' }];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'first_hit_while_raging', damageExpression: 'barbarian_level / 2', damageType: 'radiant' },
              ],
            },
            level: 5,
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 2 [radiant]');
      });

      it('does not apply divine fury when already used this round', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_divineFuryUsedRound') return 1;
          if (prop === 'activeBuffs') return [{ damageBonusExpression: '1d6' }];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'first_hit_while_raging', damageExpression: '2', damageType: 'radiant' },
              ],
            },
            level: 5,
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('does not apply divine fury when not raging', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_divineFuryUsedRound') return null;
          if (prop === 'activeBuffs') return [];
          return null;
        });

        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'first_hit_while_raging', damageExpression: '2', damageType: 'radiant' },
              ],
            },
            level: 5,
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).not.toContain('+ 2');
      });

      it('prompts for divine fury damage type choice when type has "or"', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_divineFuryUsedRound') return null;
          if (prop === 'activeBuffs') return [{ damageBonusExpression: '1d6' }];
          return null;
        });

        const setDivineFuryChoice = vi.fn();
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                { type: 'damage_bonus', trigger: 'first_hit_while_raging', damageExpression: '2', damageType: 'radiant or necrotic' },
              ],
            },
            level: 5,
          },
          setDivineFuryChoice,
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.modal).toEqual({
          type: 'divineFury',
          props: { damageType: 'radiant or necrotic' },
        });
        expect(result.data._divineFuryPending).toBe(true);
        expect(setDivineFuryChoice).toHaveBeenCalledWith('radiant or necrotic');
      });

      it('applies attack_rider strength attacks after reckless', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_brutalStrikeActive') return true;
          return null;
        });
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                {
                  type: 'attack_rider',
                  trigger: 'strength_attack_hit_after_reckless',
                  damageExpression: '1d6',
                  damageType: 'slashing',
                },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [slashing]');
      });

      it('skips attack_rider when _brutalStrikeActive is not set', async () => {
        getRuntimeValue.mockReturnValue(null);
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          playerStats: {
            automation: {
              actions: [
                {
                  type: 'attack_rider',
                  trigger: 'strength_attack_hit_after_reckless',
                  damageExpression: '1d6',
                  damageType: 'slashing',
                },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toBe('1d8+3');
        expect(result.data.formula).not.toContain('+ 1d6 [slashing]');
      });

      it('stores Staggering Blow targetEffects and logs to campaign log', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_brutalStrikeActive') return true;
          if (prop === '_brutalStrikeEffects') return ['Staggering Blow'];
          if (prop === 'targetEffects') return [];
          return null;
        });
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          targetName: 'Goblin',
          playerStats: {
            automation: {
              actions: [
                {
                  type: 'attack_rider',
                  trigger: 'strength_attack_hit_after_reckless',
                  effect: 'attack_rider',
                  damageExpression: '1d6',
                  damageType: 'slashing',
                  name: "Brutal Strike (Level 13)",
                  options: [
                    {
                      name: 'Staggering Blow',
                      effect: 'disadvantage_on_next_save',
                      value: '1 round',
                      noOpportunityAttacks: true,
                    },
                  ],
                },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [slashing]');
        expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), 'test-campaign');
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
          abilityName: "Brutal Strike (Level 13)",
        }));
      });

      it('stores Sundering Blow targetEffects and applies bonus to formula', async () => {
        getRuntimeValue.mockImplementation((_key, prop, _campaign) => {
          if (prop === '_brutalStrikeActive') return true;
          if (prop === '_brutalStrikeEffects') return ['Sundering Blow'];
          if (prop === 'targetEffects') return [];
          return null;
        });
        const ctx = makeCtx({
          isMeleeOrUnarmed: true,
          targetName: 'Orc',
          playerStats: {
            automation: {
              actions: [
                {
                  type: 'attack_rider',
                  trigger: 'strength_attack_hit_after_reckless',
                  effect: 'attack_rider',
                  damageExpression: '1d6',
                  damageType: 'slashing',
                  name: "Brutal Strike (Level 17)",
                  options: [
                    {
                      name: 'Sundering Blow',
                      effect: 'next_attack_bonus',
                      value: 5,
                    },
                  ],
                },
              ],
            },
          },
          formula: '1d8+3',
          total: 11,
          rolls: [8, 3],
        });
        const result = await steps[10].handler(ctx);

        expect(result.data.formula).toContain('+ 1d6 [slashing]');
        expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), 'test-campaign');
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
          abilityName: "Brutal Strike (Level 17)",
        }));
      });
    });
  });
});
