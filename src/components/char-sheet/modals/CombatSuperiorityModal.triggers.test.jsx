// @cleaned-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CombatSuperiorityModal from './CombatSuperiorityModal.jsx';
import * as runtimeModule from '../../../hooks/runtime/useRuntimeState.js';

// ── Shared fixtures ──

const BASE_MANEUVERS = [
  { name: 'Trip Attack', actionType: 'attack_rider' },
  { name: 'Pushing Attack', actionType: 'movement' },
  { name: 'Disarming Attack', actionType: 'attack_rider' },
  { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
  { name: 'Evasive Footwork', actionType: 'reaction' },
  { name: 'Kicking Attack', actionType: 'skill_check' },
  { name: 'Rally', actionType: 'movement' },
  { name: 'Grasping Vine', actionType: 'grant_attack' },
];

const PLAYER_STATS = { name: 'TestChar' };
const ATTACKER_CTX = { hit: true, weaponType: 'melee', attackerName: 'TestChar' };

function renderModal({ payload, ...rest } = {}) {
  const defaultProps = {
    payload: { allManeuvers: BASE_MANEUVERS, maxOptions: 3, knownManeuvers: [], ...payload },
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...rest,
  };
  return render(<CombatSuperiorityModal {...defaultProps} />);
}

function renderModalDirect(props) {
  return render(<CombatSuperiorityModal {...props} />);
}

// ── availableManeuvers override ──

describe('CombatSuperiorityModal - availableManeuvers override', () => {
  it('uses availableManeuvers directly when provided and non-empty', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Trip Attack', actionType: 'attack_rider' }],
        knownManeuvers: ['Available Only', 'Also Available'],
        availableManeuvers: [
          { name: 'Available Only', actionType: 'bonus_action' },
          { name: 'Also Available', actionType: 'reaction' },
        ],
        maxOptions: 3,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Available Only')).toBeInTheDocument();
    expect(screen.getByText('Also Available')).toBeInTheDocument();
    expect(screen.queryByText('Ki-Fueled Attack')).not.toBeInTheDocument();
  });

  it('filters availableManeuvers by knownManeuvers in use mode but shows all in selection mode', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [],
        knownManeuvers: ['Ki-Fueled Attack'],
        availableManeuvers: [
          { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
          { name: 'Unknown Maneuver', actionType: 'reaction' },
        ],
        maxOptions: 3,
        selectionMode: false,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.queryByText('Unknown Maneuver')).not.toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [],
        knownManeuvers: ['Ki-Fueled Attack'],
        availableManeuvers: [
          { name: 'Available A', actionType: 'bonus_action' },
          { name: 'Available B', actionType: 'reaction' },
        ],
        maxOptions: 3,
        selectionMode: true,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Available A')).toBeInTheDocument();
    expect(screen.getByText('Available B')).toBeInTheDocument();
  });

  it.each([
    ['an empty array', []],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to allManeuvers when availableManeuvers is %s', (_label, val) => {
    renderModal({
      payload: {
        selectionMode: false,
        knownManeuvers: ['Ki-Fueled Attack'],
        availableManeuvers: val,
      },
    });
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
  });
});

// ── Prompt mode with attackContext / skillContext ──

describe('CombatSuperiorityModal - prompt mode', () => {
  beforeEach(() => {
    vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(1);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correct header in selection vs use mode with attackContext', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'A', actionType: 'bonus_action' }],
        knownManeuvers: [],
        maxOptions: 3,
        selectionMode: true,
        attackContext: { hit: true, weaponType: 'melee' },
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText(/Combat Superiority — Choose Maneuver/)).toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: true, weaponType: 'melee' },
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText(/Combat Superiority — Use Maneuver/)).toBeInTheDocument();
  });

  it('filters by melee_weapon_attack_hit trigger', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
          { name: 'Ki-Fueled Attack', actionType: 'bonus_action', trigger: 'any' },
          { name: 'Ranged Strike', actionType: 'attack_rider', trigger: 'weapon_attack_hit' },
        ],
        knownManeuvers: ['Trip Attack', 'Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { ...ATTACKER_CTX },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Trip Attack')).toBeInTheDocument();
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.queryByText('Ranged Strike')).not.toBeInTheDocument();
  });

  it('filters by weapon_attack_hit trigger with ranged weapon', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Ranged Strike', actionType: 'attack_rider', trigger: 'weapon_attack_hit' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Ranged Strike', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: true, weaponType: 'ranged', attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Ranged Strike')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('filters by attack_roll_miss trigger', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Precision Attack', actionType: 'attack_rider', trigger: 'attack_roll_miss' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Precision Attack', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: false, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Precision Attack')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('filters by melee_attack_miss trigger (target is player)', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Defensive Maneuver', actionType: 'reaction', trigger: 'melee_attack_miss' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Defensive Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: false, weaponType: 'melee', targetName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Defensive Maneuver')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('filters by melee_damage_taken trigger', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Dodge Maneuver', actionType: 'reaction', trigger: 'melee_damage_taken' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Dodge Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { weaponType: 'melee', targetName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Dodge Maneuver')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('filters by melee_attack_straight_line trigger', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Flank Maneuver', actionType: 'bonus_action', trigger: 'melee_attack_straight_line' },
          { name: 'Trip Attack', actionType: 'bonus_action', trigger: 'attack_roll_miss' },
        ],
        knownManeuvers: ['Flank Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { weaponType: 'melee', attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Flank Maneuver')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('filters by replace_attack trigger', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Replace Strike', actionType: 'attack_rider', trigger: 'replace_attack' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Replace Strike', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { replacingAttack: true, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Replace Strike')).toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('includes maneuvers with no trigger or trigger "any" in prompt mode', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Free Maneuver', actionType: 'bonus_action', trigger: null },
          { name: 'Universal Maneuver', actionType: 'bonus_action', trigger: 'any' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Free Maneuver', 'Universal Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { ...ATTACKER_CTX },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Free Maneuver')).toBeInTheDocument();
    expect(screen.getByText('Universal Maneuver')).toBeInTheDocument();
    expect(screen.getByText('Trip Attack')).toBeInTheDocument();
  });

  it('excludes maneuver when attackerName/targetName does not match playerStats.name', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Other Character Maneuver', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Other Character Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { ...ATTACKER_CTX, attackerName: 'OtherChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.queryByText('Other Character Maneuver')).not.toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Other Target Maneuver', actionType: 'reaction', trigger: 'melee_damage_taken' },
          { name: 'Trip Attack', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Other Target Maneuver', 'Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { weaponType: 'melee', targetName: 'OtherChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.queryByText('Other Target Maneuver')).not.toBeInTheDocument();
    expect(screen.queryByText('Trip Attack')).not.toBeInTheDocument();
  });

  it('includes unarmed strike for melee_weapon_attack_hit and weapon_attack_hit', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Unarmed Maneuver', actionType: 'attack_rider', trigger: 'melee_weapon_attack_hit' },
        ],
        knownManeuvers: ['Unarmed Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: true, isUnarmedStrike: true, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Unarmed Maneuver')).toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Unarmed Strike Maneuver', actionType: 'attack_rider', trigger: 'weapon_attack_hit' },
        ],
        knownManeuvers: ['Unarmed Strike Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: true, isUnarmedStrike: true, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Unarmed Strike Maneuver')).toBeInTheDocument();
  });

  it('treats skillContext same as attackContext for isPromptMode', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'A', actionType: 'bonus_action' }],
        knownManeuvers: [],
        maxOptions: 3,
        selectionMode: true,
        skillContext: { skill: 'Athletics' },
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText(/Combat Superiority — Choose Maneuver/)).toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
        skillContext: { skill: 'Athletics' },
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText(/Combat Superiority — Use Maneuver/)).toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Free Maneuver', actionType: 'bonus_action', trigger: null }],
        knownManeuvers: ['Free Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        skillContext: { skill: 'Athletics' },
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Free Maneuver')).toBeInTheDocument();
  });
});

// ── lastAttack fallback ──

describe('CombatSuperiorityModal - lastAttack fallback', () => {
  beforeEach(() => {
    vi.spyOn(runtimeModule, 'getRuntimeValue').mockReturnValue(1);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs effectiveAttack from lastAttack when attackContext is null', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Trip Attack', actionType: 'bonus_action', trigger: 'melee_weapon_attack_hit' }],
        knownManeuvers: ['Trip Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: null,
        lastAttack: { hit: true, weaponType: 'melee', attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Trip Attack')).toBeInTheDocument();
  });

  it('defaults missing lastAttack fields to safe values', () => {
    // defaults weaponType to null, isCrit to false, isUnarmedStrike to false
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Any Trigger Maneuver', actionType: 'bonus_action', trigger: 'any' }],
        knownManeuvers: ['Any Trigger Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: null,
        lastAttack: { hit: true, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Any Trigger Maneuver')).toBeInTheDocument();

    // defaults replacingAttack to false
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Replace Attack Maneuver', actionType: 'attack_rider', trigger: 'replace_attack' }],
        knownManeuvers: ['Replace Attack Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: null,
        lastAttack: { hit: true, attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.queryByText('Replace Attack Maneuver')).not.toBeInTheDocument();
  });

  it('prefers attackContext over lastAttack when both are present', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Melee Maneuver', actionType: 'bonus_action', trigger: 'melee_weapon_attack_hit' },
          { name: 'Ranged Maneuver', actionType: 'bonus_action', trigger: 'attack_roll_miss' },
        ],
        knownManeuvers: ['Melee Maneuver', 'Ranged Maneuver'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: { hit: true, weaponType: 'melee', attackerName: 'TestChar' },
        lastAttack: { hit: true, weaponType: 'ranged', attackerName: 'TestChar' },
        playerStats: PLAYER_STATS,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Melee Maneuver')).toBeInTheDocument();
    expect(screen.queryByText('Ranged Maneuver')).not.toBeInTheDocument();
  });

  it('falls back to knownManeuvers filtering when lastAttack is null', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
          { name: 'Unknown', actionType: 'reaction' },
        ],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: null,
        lastAttack: null,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('falls back to knownManeuvers filtering when lastAttack has no useful data', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
          { name: 'Unknown', actionType: 'reaction' },
        ],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
        attackContext: null,
        lastAttack: {},
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });
});

// ── onReopenSelection callback ──

describe('CombatSuperiorityModal - onReopenSelection', () => {
  it('calls onReopenSelection when Manage Maneuvers is clicked and onReopenSelection exists', async () => {
    const onReopenSelection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
      },
      onReopenSelection: onReopenSelection,
      onClose,
      onConfirm: vi.fn(),
    });
    fireEvent.click(screen.getByRole('button', { name: /Manage Maneuvers/ }));
    await waitFor(() => {
      expect(onReopenSelection).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to onConfirm when Manage Maneuvers is clicked and onReopenSelection does not exist', () => {
    const onConfirm = vi.fn();
    renderModalDirect({
      payload: {
        allManeuvers: [
          { name: 'Ki-Fueled Attack', actionType: 'bonus_action' },
          { name: 'Pushing Attack', actionType: 'movement' },
        ],
        knownManeuvers: ['Ki-Fueled Attack', 'Pushing Attack'],
        maxOptions: 3,
        selectionMode: false,
      },
      onConfirm,
      onClose: vi.fn(),
    });
    fireEvent.click(screen.getByRole('button', { name: /Manage Maneuvers/ }));
    expect(onConfirm).toHaveBeenCalledWith(['Ki-Fueled Attack', 'Pushing Attack'], null);
  });

  it('logs error when onReopenSelection rejects', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
    const onReopenSelection = vi.fn().mockRejectedValue(new Error('fail'));
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
      },
      onReopenSelection: onReopenSelection,
      onConfirm: vi.fn(),
    });
    const btn = screen.getByRole('button', { name: /Manage Maneuvers/ });
    fireEvent.click(btn);
    waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[CombatSuperiorityModal] Reopen selection failed:',
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });
});

// ── handleUseManeuver error path ──

describe('CombatSuperiorityModal - handleUseManeuver error', () => {
  it('logs error, does not set applied state, and does not show result when onConfirm rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
    const onConfirm = vi.fn().mockRejectedValue(new Error('use failed'));
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
      },
      onConfirm,
      onClose: vi.fn(),
    });
    const radios = document.querySelectorAll('input[name="combatManeuver"]');
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Use Maneuver/ }));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[CombatSuperiorityModal] Use maneuver failed:',
        expect.any(Error)
      );
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });
});

// ── Maneuver description rendering ──

describe('CombatSuperiorityModal - maneuver descriptions', () => {
  it('renders maneuver description in selection mode and use mode', () => {
    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Trip Attack', actionType: 'attack_rider', description: 'Prone the target.' }],
        knownManeuvers: [],
        maxOptions: 3,
        selectionMode: true,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Trip Attack')).toBeInTheDocument();
    expect(screen.getByText('Prone the target.')).toBeInTheDocument();

    renderModalDirect({
      payload: {
        allManeuvers: [{ name: 'Ki-Fueled Attack', actionType: 'bonus_action', description: 'Add die to attack roll.' }],
        knownManeuvers: ['Ki-Fueled Attack'],
        maxOptions: 3,
        selectionMode: false,
      },
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });
    expect(screen.getByText('Ki-Fueled Attack')).toBeInTheDocument();
    expect(screen.getByText('Add die to attack roll.')).toBeInTheDocument();
  });
});
