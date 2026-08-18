// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TacticalMasterModal from './TacticalMasterModal.jsx';

vi.mock('../../../services/automation/handlers/combat/weaponMasteryHandler.js', () => ({
  MASTERY_EFFECTS: {
    Push: { label: 'Push (10 ft)', description: 'Push the creature up to 10 feet straight away from you if it is Large or smaller.', effect: 'push', value: 10, sizeLimit: 'large_or_smaller' },
    Topple: { label: 'Topple (Prone)', description: 'Force the creature to make a Constitution saving throw or fall Prone.', effect: 'topple', requiresSave: true, saveAbility: 'CON' },
    Sap: { label: 'Disadvantage on Next Attack', description: 'The creature has Disadvantage on its next attack roll before the start of your next turn.', effect: 'disadvantage_next_attack' },
    Slow: { label: 'Speed -10 ft', description: "Reduce the creature's Speed by 10 feet until the start of your next turn.", effect: 'speed_reduction', value: 10 },
    Vex: { label: 'Advantage on Next Attack', description: 'You have Advantage on your next attack roll against that creature before the end of your next turn.', effect: 'next_attack_advantage', value: 5, perTarget: true },
    Cleave: { label: 'Cleave (Extra Attack)', description: 'Make a melee attack roll with the weapon against a second creature within 5 feet of the first.', effect: 'cleave', oncePerTurn: true },
    Nick: { label: 'Nick (Extra Attack)', description: 'Make the extra attack of the Light property as part of the Attack action instead of as a Bonus Action.', effect: 'nick', oncePerTurn: true },
    Graze: { label: 'Graze (Miss Damage)', description: 'If your attack roll misses, deal damage equal to your ability modifier.', effect: 'graze' },
  },
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
  loadWeaponMasteries: vi.fn(),
}));

import * as useActionPopup from '../../../hooks/combat/useActionPopup.js';

const mockPlayerStats = { name: 'Throg', level: 12, abilities: [{ name: 'CON', bonus: 3 }] };

function makeProps(overrides) {
  return {
    attackName: 'Longsword Attack',
    baseMastery: 'Vex',
    replaceOptions: ['Push'],
    targetName: 'Goblin',
    playerStats: mockPlayerStats,
    campaignName: 'test-campaign',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    isChoiceMode: false,
    ...(overrides || {}),
  };
}

function renderModal(overrides) {
  useActionPopup.loadWeaponMasteries.mockResolvedValue([
    { name: 'Vex', description: 'Gain advantage on next attack.' },
    { name: 'Push', description: 'Push enemy 10 ft away.' },
  ]);
  return render(<TacticalMasterModal {...makeProps(overrides)} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  useActionPopup.loadWeaponMasteries.mockResolvedValue([
    { name: 'Vex', description: 'Gain advantage on next attack.' },
    { name: 'Push', description: 'Push enemy 10 ft away.' },
  ]);
});

// ── Rendering ──

describe('TacticalMasterModal - rendering', () => {
  it('renders the modal overlay and structure', () => {
    renderModal();
    expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    expect(document.querySelector('.sp-header')).toBeInTheDocument();
    expect(document.querySelector('.sp-body')).toBeInTheDocument();
    expect(document.querySelector('.sp-actions')).toBeInTheDocument();
  });

  it('renders the header with title, icon, and attack name', () => {
    renderModal();
    expect(screen.getByText(/Tactical Master/)).toBeInTheDocument();
    expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
  });

  it('renders the instruction text', () => {
    renderModal();
    expect(screen.getByText(/Choose a mastery property/)).toBeInTheDocument();
  });

  it('renders the note about one mastery property per hit', () => {
    renderModal();
    expect(screen.getByText(/You can choose one mastery property per hit/)).toBeInTheDocument();
  });

  it('includes the secondary instruction about replacing properties', () => {
    renderModal();
    expect(screen.getByText(/When you attack with a weapon/)).toBeInTheDocument();
  });

  it('shows target name in instruction when targetName is provided', () => {
    renderModal();
    expect(screen.getByText(/Choose a mastery property against/)).toBeInTheDocument();
    expect(screen.getByText(/Goblin/)).toBeInTheDocument();
  });

  it('omits target name from instruction when targetName is null', () => {
    renderModal({ targetName: null });
    expect(screen.getByText(/Choose a mastery property:/)).toBeInTheDocument();
    expect(screen.queryByText(/Choose a mastery property against/)).not.toBeInTheDocument();
  });

  it('renders Apply and Skip buttons in selection state', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('renders with no masteries when baseMastery and replaceOptions are null', () => {
    renderModal({ baseMastery: null, replaceOptions: null });
    expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeDisabled();
  });

  it('renders with no masteries when baseMastery is null and replaceOptions is empty', () => {
    renderModal({ baseMastery: null, replaceOptions: [] });
    expect(screen.getByText(/Longsword Attack/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

// ── Mastery options rendering ──

describe('TacticalMasterModal - mastery options', () => {
  it('renders radio inputs for each available mastery option', () => {
    renderModal();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('renders the base mastery label from MASTERY_EFFECTS', () => {
    renderModal();
    expect(screen.getByText(/Advantage on Next Attack/)).toBeInTheDocument();
  });

  it('renders replace options from the replaceOptions prop', () => {
    renderModal();
    expect(screen.getByText(/Push \(10 ft\)/)).toBeInTheDocument();
  });

  it('deduplicates a mastery appearing in both baseMastery and replaceOptions', () => {
    const props = makeProps();
    props.baseMastery = 'Vex';
    props.replaceOptions = ['Vex', 'Push'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText(/Advantage on Next Attack/)).toBeInTheDocument();
    expect(screen.getByText(/Push \(10 ft\)/)).toBeInTheDocument();
  });

  it('excludes Graze from replaceOptions', () => {
    const props = makeProps();
    props.baseMastery = 'Push';
    props.replaceOptions = ['Graze', 'Sap'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByText(/Graze/)).not.toBeInTheDocument();
  });

  it('excludes Graze when it is the only replace option', () => {
    const props = makeProps();
    props.baseMastery = 'Push';
    props.replaceOptions = ['Graze'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.queryByText(/Graze/)).not.toBeInTheDocument();
  });

  it('excludes Graze even when many other options are present', () => {
    const props = makeProps();
    props.baseMastery = 'Push';
    props.replaceOptions = ['Topple', 'Sap', 'Slow', 'Vex', 'Cleave', 'Nick', 'Graze'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.queryByText(/Graze/)).not.toBeInTheDocument();
    expect(screen.getByText(/Topple \(Prone\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cleave \(Extra Attack\)/)).toBeInTheDocument();
  });

  it('marks feature-source masteries with a Feature badge', () => {
    renderModal();
    expect(screen.getByText('Feature')).toBeInTheDocument();
  });

  it('does not mark weapon-source masteries with a Feature badge', () => {
    const props = makeProps();
    props.replaceOptions = [];
    render(<TacticalMasterModal {...props} />);
    expect(screen.queryByText('Feature')).not.toBeInTheDocument();
  });

  it('falls back to mastery name when MASTERY_EFFECTS has no entry', () => {
    const props = makeProps();
    props.baseMastery = 'CustomMastery';
    props.replaceOptions = [];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getByText('CustomMastery')).toBeInTheDocument();
  });

  it('falls back to mastery name for unknown replace options', () => {
    const props = makeProps();
    props.baseMastery = null;
    props.replaceOptions = ['UnknownMastery'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getByText('UnknownMastery')).toBeInTheDocument();
  });

  it('renders all MASTERY_EFFECTS labels when they appear in options', () => {
    const props = makeProps();
    props.baseMastery = 'Push';
    props.replaceOptions = ['Topple', 'Sap', 'Slow', 'Vex', 'Cleave', 'Nick'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getByText(/Push \(10 ft\)/)).toBeInTheDocument();
    expect(screen.getByText(/Topple \(Prone\)/)).toBeInTheDocument();
    expect(screen.getByText(/Disadvantage on Next Attack/)).toBeInTheDocument();
    expect(screen.getByText(/Speed -10 ft/)).toBeInTheDocument();
    expect(screen.getByText(/Advantage on Next Attack/)).toBeInTheDocument();
    expect(screen.getByText(/Cleave \(Extra Attack\)/)).toBeInTheDocument();
    expect(screen.getByText(/Nick \(Extra Attack\)/)).toBeInTheDocument();
  });

  it('renders descriptions from loadWeaponMasteries', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue([
      { name: 'Vex', description: 'Custom Vex description.' },
      { name: 'Push', description: 'Custom Push description.' },
    ]);
    render(<TacticalMasterModal {...makeProps()} />);
    expect(await screen.findByText('Custom Vex description.')).toBeInTheDocument();
    expect(await screen.findByText('Custom Push description.')).toBeInTheDocument();
  });

  it('falls back to MASTERY_EFFECTS description when loadWeaponMasteries data is empty', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue([]);
    renderModal();
    expect(await screen.findByText(/You have Advantage/)).toBeInTheDocument();
  });

  it('falls back to MASTERY_EFFECTS description when loadWeaponMasteries returns null', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue(null);
    renderModal();
    expect(await screen.findByText(/Advantage on Next Attack/)).toBeInTheDocument();
  });

  it('uses loadWeaponMasteries description over MASTERY_EFFECTS description', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue([
      { name: 'Vex', description: 'Overridden Vex desc.' },
      { name: 'Push', description: 'Overridden Push desc.' },
    ]);
    render(<TacticalMasterModal {...makeProps()} />);
    expect(await screen.findByText('Overridden Vex desc.')).toBeInTheDocument();
    expect(await screen.findByText('Overridden Push desc.')).toBeInTheDocument();
  });

  it('uses MASTERY_EFFECTS description when loadWeaponMasteries has no entry for a mastery', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue([
      { name: 'Push', description: 'Push desc from file.' },
    ]);
    render(<TacticalMasterModal {...makeProps()} />);
    expect(await screen.findByText('Push desc from file.')).toBeInTheDocument();
    expect(await screen.findByText(/You have Advantage/)).toBeInTheDocument();
  });

  it('shows mastery name with no description when both sources are missing', async () => {
    useActionPopup.loadWeaponMasteries.mockResolvedValue([]);
    const props = makeProps();
    props.baseMastery = 'UnknownMastery';
    props.replaceOptions = [];
    render(<TacticalMasterModal {...props} />);
    expect(await screen.findByText('UnknownMastery')).toBeInTheDocument();
  });
});

// ── Selection behavior ──

describe('TacticalMasterModal - selection', () => {
  it('has the baseMastery option selected initially', () => {
    renderModal();
    expect(screen.getByRole('radio', { name: /Advantage on Next Attack/, checked: true })).toBeInTheDocument();
  });

  it('selects a mastery when its radio is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Push \(10 ft\)/));
    expect(screen.getByRole('radio', { name: /Push/, checked: true })).toBeInTheDocument();
  });

  it('deselects the previous option when a different one is selected', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Push \(10 ft\)/));
    expect(screen.getByRole('radio', { name: /Push/, checked: true })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Advantage on Next Attack/, checked: true })).not.toBeInTheDocument();
  });
});

// ── Apply button ──

describe('TacticalMasterModal - apply button', () => {
  it('is enabled when baseMastery is pre-selected', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Apply/ })).not.toBeDisabled();
  });

  it('is disabled when there are no masteries', () => {
    renderModal({ baseMastery: null, replaceOptions: [] });
    expect(screen.getByRole('button', { name: /Apply/ })).toBeDisabled();
  });

  it('calls onConfirm with the selected mastery when apply is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<TacticalMasterModal {...makeProps({ onConfirm })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    expect(onConfirm).toHaveBeenCalledWith('Vex');
  });

  it('calls onConfirm with the second mastery option when selected', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<TacticalMasterModal {...makeProps({ onConfirm })} />);
    fireEvent.click(screen.getByText(/Push \(10 ft\)/));
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    expect(onConfirm).toHaveBeenCalledWith('Push');
  });
});

// ── Applied state ──

describe('TacticalMasterModal - applied state', () => {
  function setupAppliedState(onConfirm = vi.fn().mockResolvedValue(undefined)) {
    render(<TacticalMasterModal {...makeProps({ onConfirm })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
  }

  it('shows success message with Done button after applying', async () => {
    setupAppliedState();
    expect(await screen.findByText(/Mastery applied successfully/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('hides selection elements after applying', async () => {
    setupAppliedState();
    await screen.findByRole('button', { name: 'Done' });
    expect(screen.queryByText(/Choose a mastery property/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    expect(screen.queryByText(/You can choose one mastery property per hit/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('keeps the header with crosshairs icon in applied state', async () => {
    setupAppliedState();
    expect(await screen.findByText(/Tactical Master/)).toBeInTheDocument();
  });

  it('does not call onConfirm again when Done is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<TacticalMasterModal {...makeProps({ onConfirm, onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    await screen.findByText(/Mastery applied successfully/);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Close behavior ──

describe('TacticalMasterModal - close behavior', () => {
  it('calls onClose when Done button is clicked in applied state', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<TacticalMasterModal {...makeProps({ onClose, onConfirm })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    await screen.findByText('Done');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Skip button is clicked', () => {
    const onClose = vi.fn();
    render(<TacticalMasterModal {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay background is clicked', () => {
    const onClose = vi.fn();
    render(<TacticalMasterModal {...makeProps({ onClose })} />);
    fireEvent.click(document.querySelector('.sp-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the modal content area is clicked', () => {
    const onClose = vi.fn();
    render(<TacticalMasterModal {...makeProps({ onClose })} />);
    fireEvent.click(document.querySelector('.sp-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Single mastery source ──

describe('TacticalMasterModal - single mastery source', () => {
  it('renders only base mastery when replaceOptions is empty', () => {
    renderModal({ replaceOptions: [] });
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByText(/Advantage on Next Attack/)).toBeInTheDocument();
  });

  it('renders only replace options when baseMastery is null', () => {
    renderModal({ baseMastery: null });
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByText(/Push \(10 ft\)/)).toBeInTheDocument();
  });
});

// ── Duplicate masteries ──

describe('TacticalMasterModal - duplicate masteries', () => {
  it('only shows a mastery once when it appears in both baseMastery and replaceOptions', () => {
    const props = makeProps();
    props.baseMastery = 'Push';
    props.replaceOptions = ['Push', 'Sap'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});

// ── isChoiceMode prop ──

describe('TacticalMasterModal - isChoiceMode', () => {
  it('selects the first replace option as default when isChoiceMode is true', () => {
    const props = makeProps();
    props.isChoiceMode = true;
    props.baseMastery = null;
    props.replaceOptions = ['Push', 'Sap'];
    render(<TacticalMasterModal {...props} />);
    expect(screen.getByRole('radio', { name: /Push/, checked: true })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Advantage on Next Attack/ })).not.toBeInTheDocument();
  });

  it('selects baseMastery as default when isChoiceMode is false', () => {
    const props = makeProps();
    props.isChoiceMode = false;
    render(<TacticalMasterModal {...props} />);
    expect(screen.getByRole('radio', { name: /Advantage on Next Attack/, checked: true })).toBeInTheDocument();
  });
});
