// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharActionSpellPopups from './CharActionSpellPopups.jsx';

vi.mock('../common/popup.jsx', () => ({
  default: function TestPopup({ children }) {
    return <div data-testid="popup">{children}</div>;
  },
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: function TestMetamagicPopup({ spell, onConfirm, onSkip }) {
    return (
      <div data-testid="metamagic-popup">
        <span data-testid="metamagic-spell-name">{spell?.name}</span>
        <span data-testid="metamagic-spell-level">{spell?.level}</span>
        {onConfirm && <button data-testid="metamagic-confirm" onClick={onConfirm}>Confirm</button>}
        {onSkip && <button data-testid="metamagic-skip" onClick={onSkip}>Skip</button>}
      </div>
    );
  },
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestCreatureSelectionModal({ title, icon, targets, maxTargets, description, confirmLabel, confirmIcon: _, onConfirm, onSkip }) {
    return (
      <div data-testid={`creature-selection-${title}`}>
        <span data-testid="title">{title}</span>
        <span data-testid="icon">{icon}</span>
        <span data-testid="description">{description}</span>
        <span data-testid="creature-count">{targets?.length}</span>
        <span data-testid="max-targets">{maxTargets}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        {onConfirm && <button data-testid="confirm" onClick={() => onConfirm(targets?.map(t => t.name || t))}>Confirm</button>}
        {onSkip && <button data-testid="skip" onClick={onSkip}>Skip</button>}
        {targets?.map((t, i) => (
          <span key={i} data-testid={`target-${i}`}>{typeof t === 'string' ? t : t.name}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: function TestSpellDetailPopup({ spell, playerStats, campaignName, playerLevel, upcastLevels, onClose, onCast }) {
    return (
      <div data-testid="spell-detail-popup">
        <span data-testid="detail-spell-name">{spell?.name}</span>
        <span data-testid="detail-spell-level">{spell?.level}</span>
        <span data-testid="detail-player-name">{playerStats?.name}</span>
        <span data-testid="detail-player-level">{playerLevel}</span>
        <span data-testid="detail-campaign">{campaignName}</span>
        <span data-testid="detail-upcast-count">{upcastLevels?.length}</span>
        {onClose && <button data-testid="detail-close" onClick={onClose}>Close</button>}
        {onCast && <button data-testid="detail-cast" onClick={onCast}>Cast</button>}
      </div>
    );
  },
}));

vi.mock('./popups/MagicMissileTargetPopup.jsx', () => ({
  default: function TestMagicMissileTargetPopup({ spell, totalMissiles, missileDamage, creatureTargets, currentTargetName, onConfirm, onSkip }) {
    return (
      <div data-testid="magic-missile-popup">
        <span data-testid="mm-spell-name">{spell?.name}</span>
        <span data-testid="mm-spell-level">{spell?.level}</span>
        <span data-testid="mm-total-missiles">{totalMissiles}</span>
        <span data-testid="mm-missile-damage">{missileDamage}</span>
        <span data-testid="mm-creature-count">{creatureTargets?.length}</span>
        <span data-testid="mm-current-target">{currentTargetName || 'none'}</span>
        {creatureTargets?.map(name => (
          <span key={name} data-testid="mm-creature-name">{name}</span>
        ))}
        {onConfirm && <button data-testid="mm-confirm" onClick={() => onConfirm({ distribution: {} })}>Confirm</button>}
        {onSkip && <button data-testid="mm-skip" onClick={onSkip}>Skip</button>}
      </div>
    );
  },
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function TestSecondaryTargetModal({ title, targets, onTargetSelected, onSkip, description, confirmLabel }) {
    return (
      <div data-testid={`secondary-modal-${title}`}>
        <span data-testid="title">{title}</span>
        <span data-testid="description">{description}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        {targets?.map((t, i) => (
          <span key={i} data-testid={`target-${i}`} onClick={() => onTargetSelected(t.value !== undefined ? t.value : t.name)}>
            {t.value !== undefined ? t.label : t.name}
          </span>
        ))}
        <button data-testid="skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));

const mockedDamageUtils = vi.hoisted(() => ({
  getTargetFromAttacker: vi.fn(() => null),
}));

const mockedCombatData = vi.hoisted(() => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => mockedDamageUtils);

vi.mock('../../services/encounters/combatData.js', () => mockedCombatData);

function createBaseProps(overrides) {
  return {
    playerStats: { name: 'Test Character', level: 5 },
    campaignName: 'test-campaign',
    selectedActionSpell: null,
    setSelectedActionSpell: vi.fn(),
    buildUpcastLevels: vi.fn(() => []),
    handleActionSpellCast: vi.fn(),
    actionPendingMetamagic: null,
    actionHandleConfirm: vi.fn(),
    actionHandleSkip: vi.fn(),
    actionPendingAid: null,
    actionHandleAidConfirm: vi.fn(),
    actionHandleAidSkip: vi.fn(),
    actionPendingBane: null,
    actionHandleBaneConfirm: vi.fn(),
    actionHandleBaneSkip: vi.fn(),
    actionPendingBless: null,
    actionHandleBlessConfirm: vi.fn(),
    actionHandleBlessSkip: vi.fn(),
    actionPendingFaerieFire: null,
    actionHandleFaerieFireConfirm: vi.fn(),
    actionHandleFaerieFireSkip: vi.fn(),
    actionPendingBeaconOfHope: null,
    actionHandleBeaconOfHopeConfirm: vi.fn(),
    actionHandleBeaconOfHopeSkip: vi.fn(),
    actionPendingPassWithoutTrace: null,
    actionHandlePassWithoutTraceConfirm: vi.fn(),
    actionHandlePassWithoutTraceSkip: vi.fn(),
    actionPendingHaste: null,
    actionHandleHasteConfirm: vi.fn(),
    actionHandleHasteSkip: vi.fn(),
    actionPendingBarkskin: null,
    actionHandleBarkskinConfirm: vi.fn(),
    actionHandleBarkskinSkip: vi.fn(),
    actionPendingHeal: null,
    actionHandleHealConfirm: vi.fn(),
    actionHandleHealSkip: vi.fn(),
    actionPendingGreaterRestoration: null,
    actionHandleGreaterRestorationConfirm: vi.fn(),
    actionHandleGreaterRestorationSkip: vi.fn(),
    actionHandleGreaterRestorationNoEffects: vi.fn(),
    actionPendingRemoveCurse: null,
    actionHandleRemoveCurseConfirm: vi.fn(),
    actionHandleRemoveCurseSkip: vi.fn(),
    actionPendingMagicMissile: null,
    actionHandleMagicMissileConfirm: vi.fn(),
    actionHandleMagicMissileSkip: vi.fn(),
    actionPendingMageArmor: null,
    actionHandleMageArmorConfirm: vi.fn(),
    actionHandleMageArmorSkip: vi.fn(),
    actionPendingCureWounds: null,
    actionHandleCureWoundsConfirm: vi.fn(),
    actionHandleCureWoundsSkip: vi.fn(),
    actionPendingRevivify: null,
    actionHandleRevivifyConfirm: vi.fn(),
    actionHandleRevivifySkip: vi.fn(),
    pendingActionMetamagic: null,
    handleActionMetamagicConfirm: vi.fn(),
    handleActionMetamagicSkip: vi.fn(),
    ...overrides,
  };
}

describe('CharActionSpellPopups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('no popups visible', () => {
    it('renders an empty fragment when no popup flags are set', () => {
      const { container } = render(<CharActionSpellPopups {...createBaseProps()} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('SpellDetailPopup', () => {
    it('renders when selectedActionSpell is truthy', () => {
      render(<CharActionSpellPopups {...createBaseProps()} selectedActionSpell={{ name: 'Fireball', level: 3 }} />);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });

    it('passes playerStats to SpellDetailPopup', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({ playerStats: { name: 'Grog', level: 12 } })}
          selectedActionSpell={{ name: 'Gnashing Teeth', level: 0 }}
        />
      );
      expect(screen.getByTestId('detail-player-name')).toHaveTextContent('Grog');
      expect(screen.getByTestId('detail-player-level')).toHaveTextContent('12');
    });

    it('calls buildUpcastLevels with the selected spell and passes the result length as upcastLevels', () => {
      const buildUpcastLevels = vi.fn(() => [3, 4, 5]);
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          selectedActionSpell={{ name: 'Fireball', level: 3 }}
          buildUpcastLevels={buildUpcastLevels}
        />
      );
      expect(buildUpcastLevels).toHaveBeenCalledWith({ name: 'Fireball', level: 3 });
      expect(screen.getByTestId('detail-upcast-count')).toHaveTextContent('3');
    });

    it('calls setSelectedActionSpell(null) when closing', () => {
      const setSelectedActionSpell = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ setSelectedActionSpell })}
          selectedActionSpell={{ name: 'Fireball', level: 3 }}
        />
      );
      screen.getByTestId('detail-close').click();
      expect(setSelectedActionSpell).toHaveBeenCalledWith(null);
    });
  });

  describe('MetamagicPopup (actionPendingMetamagic)', () => {
    it('renders when actionPendingMetamagic is truthy', () => {
      render(<CharActionSpellPopups {...createBaseProps()} actionPendingMetamagic={{ spellName: 'Empowered Spell', spellLevel: 3 }} />);
      expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
    });

    it('passes spell name and level to the popup', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingMetamagic={{ spellName: 'Empowered Spell', spellLevel: 3 }}
        />
      );
      expect(screen.getByTestId('metamagic-spell-name')).toHaveTextContent('Empowered Spell');
      expect(screen.getByTestId('metamagic-spell-level')).toHaveTextContent('3');
    });

    it('calls actionHandleConfirm on confirm', () => {
      const actionHandleConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleConfirm })}
          actionPendingMetamagic={{ spellName: 'Fireball', spellLevel: 3 }}
        />
      );
      screen.getByTestId('metamagic-confirm').click();
      expect(actionHandleConfirm).toHaveBeenCalled();
    });

    it('calls actionHandleSkip on skip', () => {
      const actionHandleSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleSkip })}
          actionPendingMetamagic={{ spellName: 'Fireball', spellLevel: 3 }}
        />
      );
      screen.getByTestId('metamagic-skip').click();
      expect(actionHandleSkip).toHaveBeenCalled();
    });
  });

  describe('MetamagicPopup (pendingActionMetamagic)', () => {
    it('renders when pendingActionMetamagic is truthy', () => {
      render(<CharActionSpellPopups {...createBaseProps()} pendingActionMetamagic={{ spellName: 'Sorcery Surge', spellLevel: 1 }} />);
      expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
    });

    it('passes spell name and level to the popup', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          pendingActionMetamagic={{ spellName: 'Quickened Spell', spellLevel: 0 }}
        />
      );
      expect(screen.getByTestId('metamagic-spell-name')).toHaveTextContent('Quickened Spell');
      expect(screen.getByTestId('metamagic-spell-level')).toHaveTextContent('0');
    });

    it('calls handleActionMetamagicConfirm on confirm', () => {
      const handleActionMetamagicConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ handleActionMetamagicConfirm })}
          pendingActionMetamagic={{ spellName: 'Empowered Spell', spellLevel: 0 }}
        />
      );
      screen.getByTestId('metamagic-confirm').click();
      expect(handleActionMetamagicConfirm).toHaveBeenCalled();
    });

    it('calls handleActionMetamagicSkip on skip', () => {
      const handleActionMetamagicSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ handleActionMetamagicSkip })}
          pendingActionMetamagic={{ spellName: 'Empowered Spell', spellLevel: 0 }}
        />
      );
      screen.getByTestId('metamagic-skip').click();
      expect(handleActionMetamagicSkip).toHaveBeenCalled();
    });
  });

  describe('CreatureSelectionModal (Aid)', () => {
    it('renders with correct metadata', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally'], maxTargets: 3 },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Aid');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-hand-holding-heart');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Aid');
      expect(screen.getByTestId('creature-count')).toHaveTextContent('1');
    });

    it('calls actionHandleAidConfirm on confirm with target names', () => {
      const actionHandleAidConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleAidConfirm })}
          actionPendingAid={{ creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleAidConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
    });

    it('calls actionHandleAidSkip on skip', () => {
      const actionHandleAidSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleAidSkip })}
          actionPendingAid={{ creatureTargets: ['Ally'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleAidSkip).toHaveBeenCalled();
    });
  });

  describe('SecondaryTargetModal (Haste)', () => {
    it('renders with correct metadata', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Haste');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Haste');
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('calls actionHandleHasteConfirm with single-element array on target select', () => {
      const actionHandleHasteConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHasteConfirm })}
          actionPendingHaste={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleHasteConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandleHasteSkip on skip', () => {
      const actionHandleHasteSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHasteSkip })}
          actionPendingHaste={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleHasteSkip).toHaveBeenCalled();
    });
  });

  describe('SecondaryTargetModal (Greater Restoration)', () => {
    it('renders with correct metadata when actionPendingGreaterRestoration is truthy', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Greater Restoration');
      expect(screen.getByTestId('description')).toHaveTextContent('Touch');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Greater Restoration');
    });

    it('renders creature targets from the pending action', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1', 'Ally2'], range: '60 feet' }}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('calls actionHandleGreaterRestorationSkip when skip is clicked', () => {
      const actionHandleGreaterRestorationSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationSkip })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleGreaterRestorationSkip).toHaveBeenCalled();
    });
  });

  describe('SecondaryTargetModal (Remove Curse)', () => {
    it('renders with correct metadata when actionPendingRemoveCurse is truthy', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingRemoveCurse={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Remove Curse');
      expect(screen.getByTestId('description')).toHaveTextContent('Touch');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Remove Curse');
    });

    it('calls actionHandleRemoveCurseSkip when skip is clicked', () => {
      const actionHandleRemoveCurseSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleRemoveCurseSkip })}
          actionPendingRemoveCurse={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleRemoveCurseSkip).toHaveBeenCalled();
    });
  });

  describe('MagicMissileTargetPopup', () => {
    it('renders when actionPendingMagicMissile is truthy', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingMagicMissile={{
            spell: { name: 'Magic Missile', level: 1 },
            totalMissiles: 3,
            missileDamage: '1d4+1',
            creatureTargets: ['Goblin', 'Skeleton'],
          }}
        />
      );
      expect(screen.getByTestId('magic-missile-popup')).toBeInTheDocument();
    });

    it('passes spell, missile count, and damage data to the popup', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingMagicMissile={{
            spell: { name: 'Magic Missile', level: 1 },
            totalMissiles: 3,
            missileDamage: '1d4+1',
            creatureTargets: ['Goblin'],
          }}
        />
      );
      expect(screen.getByTestId('mm-spell-name')).toHaveTextContent('Magic Missile');
      expect(screen.getByTestId('mm-spell-level')).toHaveTextContent('1');
      expect(screen.getByTestId('mm-total-missiles')).toHaveTextContent('3');
      expect(screen.getByTestId('mm-missile-damage')).toHaveTextContent('1d4+1');
    });

    it('calls actionHandleMagicMissileConfirm on confirm', () => {
      const actionHandleMagicMissileConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleMagicMissileConfirm })}
          actionPendingMagicMissile={{
            spell: { name: 'Magic Missile', level: 1 },
            totalMissiles: 3,
            missileDamage: '1d4+1',
            creatureTargets: ['Goblin'],
          }}
        />
      );
      screen.getByTestId('mm-confirm').click();
      expect(actionHandleMagicMissileConfirm).toHaveBeenCalled();
    });

    it('calls actionHandleMagicMissileSkip on skip', () => {
      const actionHandleMagicMissileSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleMagicMissileSkip })}
          actionPendingMagicMissile={{
            spell: { name: 'Magic Missile', level: 1 },
            totalMissiles: 3,
            missileDamage: '1d4+1',
            creatureTargets: ['Goblin'],
          }}
        />
      );
      screen.getByTestId('mm-skip').click();
      expect(actionHandleMagicMissileSkip).toHaveBeenCalled();
    });
  });

  describe('multiple popups simultaneously', () => {
    it('renders spell detail and metamagic popups together', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          selectedActionSpell={{ name: 'Fireball', level: 3 }}
          actionPendingMetamagic={{ spellName: 'Empowered Spell', spellLevel: 0 }}
        />
      );
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
      expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
    });

    it('renders spell detail, metamagic, and creature selection together', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          selectedActionSpell={{ name: 'Fireball', level: 3 }}
          actionPendingMetamagic={{ spellName: 'Empowered Spell', spellLevel: 0 }}
          actionPendingAid={{ creatureTargets: ['Ally'], maxTargets: 3 }}
        />
      );
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
      expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
      expect(screen.getByTestId('creature-selection-Aid')).toBeInTheDocument();
    });

    it('renders both MetamagicPopup variants simultaneously', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps()}
          actionPendingMetamagic={{ spellName: 'Empowered Spell', spellLevel: 0 }}
          pendingActionMetamagic={{ spellName: 'Quickened Spell', spellLevel: 0 }}
        />
      );
      const popups = screen.getAllByTestId('metamagic-popup');
      expect(popups).toHaveLength(2);
    });
  });
});
