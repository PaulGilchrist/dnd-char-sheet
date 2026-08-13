// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeyTouchedModal, { ShadowTouchedModal } from './FeyTouchedModal.jsx';
import { renderMarkdown } from '../../services/ui/sanitize.js';

// Mock renderMarkdown to return predictable HTML that renders as visible text
vi.mock('../../services/ui/sanitize.js', () => ({
  renderMarkdown: vi.fn((md) => `<p>${md}</p>`),
}));

const createDivinationEnchantmentSpell = (overrides = {}) => ({
  index: overrides.index || 'test-spell',
  name: overrides.name || 'Test Spell',
  school: overrides.school || 'Enchantment',
  level: overrides.level ?? 1,
  description: overrides.description || ['Test description.'],
  casting_time: overrides.casting_time || '1 action',
  ritual: overrides.ritual || false,
  concentration: overrides.concentration || false,
  duration: overrides.duration || '1 hour',
  components: overrides.components || ['V', 'S'],
  damage: overrides.damage || null,
  material: overrides.material || null,
});

const createIllusionNecromancySpell = (overrides = {}) =>
  createDivinationEnchantmentSpell({
    school: overrides.school || 'Illusion',
    index: overrides.index || 'test-spell',
    name: overrides.name || 'Test Spell',
    description: overrides.description || ['Test description.'],
    components: overrides.components || ['V', 'S'],
    damage: overrides.damage || null,
    material: overrides.material || null,
  });

const divinationEnchantmentSpells = [
  createDivinationEnchantmentSpell({
    index: 'animal-friendship',
    name: 'Animal Friendship',
    school: 'Enchantment',
    description: ['Convince a beast to be friendly.'],
    concentration: true,
    duration: '24 hours',
    components: ['V', 'S', 'M'],
    material: 'A morsel of food.',
  }),
  createDivinationEnchantmentSpell({
    index: 'comprehend-r',
    name: 'Comprehend Languages',
    school: 'Divination',
    description: ['Understand all spoken and written languages.'],
    ritual: true,
  }),
  createDivinationEnchantmentSpell({
    index: 'charm-person',
    name: 'Charm Person',
    school: 'Enchantment',
    description: ['Charm a humanoid.'],
  }),
];

const illusionNecromancySpells = [
  createIllusionNecromancySpell({
    index: 'disguise-self',
    name: 'Disguise Self',
    school: 'Illusion',
    description: ['Disguise your appearance.'],
  }),
  createIllusionNecromancySpell({
    index: 'blight',
    name: 'Blight',
    school: 'Necromancy',
    description: ['Deal 8d8 necrotic damage.'],
    damage: { damage_type: 'Necrotic' },
  }),
];

function createFeyTouchedProps(overrides = {}) {
  const baseFormData = {
    feyTouchedSpell: null,
    spells: [],
    ...overrides.formData,
  };
  return {
    formData: baseFormData,
    allSpells: overrides.allSpells || divinationEnchantmentSpells,
    onArrayFieldChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function createShadowTouchedProps(overrides = {}) {
  const baseFormData = {
    shadowTouchedSpell: null,
    spells: [],
    ...overrides.formData,
  };
  return {
    formData: baseFormData,
    allSpells: overrides.allSpells || illusionNecromancySpells,
    onArrayFieldChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('FeyTouchedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  describe('rendering', () => {
    it('should render the modal overlay and header', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(screen.getByText('Fey Magic')).toBeInTheDocument();
    });

    it('should render the description text mentioning Divination or Enchantment', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(
        screen.getByText(/Choose one level 1 spell from the Divination or Enchantment school/)
      ).toBeInTheDocument();
    });

    it('should render a label for the spell selector', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(screen.getByText('Level 1 Spell:')).toBeInTheDocument();
    });

    it('should render the select dropdown with a default empty option', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      const defaultOption = select.querySelector('option[value=""]');
      expect(defaultOption).toBeInTheDocument();
      expect(defaultOption.textContent).toBe('Select a spell...');
    });

    it('should render available spells from Divination and Enchantment schools', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(screen.getByText('Animal Friendship (Enchantment)')).toBeInTheDocument();
      expect(screen.getByText('Comprehend Languages (Divination)')).toBeInTheDocument();
      expect(screen.getByText('Charm Person (Enchantment)')).toBeInTheDocument();
    });

    it('should filter out spells from non-matching schools', () => {
      const evocationSpell = createDivinationEnchantmentSpell({
        name: 'Fire Bolt',
        school: 'Evocation',
      });
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({ allSpells: [...divinationEnchantmentSpells, evocationSpell] })}
        />
      );
      expect(screen.getByText('Animal Friendship (Enchantment)')).toBeInTheDocument();
      expect(screen.queryByText('Fire Bolt (Evocation)')).not.toBeInTheDocument();
    });

    it('should render the Save button', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render the modal with an empty select when allSpells is null', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps({ allSpells: null })} />);
      expect(screen.getByText('Fey Magic')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.options.length).toBe(1);
    });

    it('should render the modal with an empty select when allSpells is an empty array', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps({ allSpells: [] })} />);
      expect(screen.getByText('Fey Magic')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.options.length).toBe(1);
    });

    it('should not render spells that are not level 1', () => {
      const level2Spell = createDivinationEnchantmentSpell({ name: 'Hold Person', level: 2 });
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({ allSpells: [...divinationEnchantmentSpells, level2Spell] })}
        />
      );
      expect(screen.queryByText('Hold Person (Enchantment)')).not.toBeInTheDocument();
    });
  });

  describe('initial state with existing spell', () => {
    it('should pre-select an existing feyTouchedSpell from formData', () => {
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({
            formData: { feyTouchedSpell: 'Animal Friendship', spells: ['Animal Friendship'] },
          })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Animal Friendship');
    });

    it('should show SpellDetails toggle for the pre-selected spell', () => {
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({
            formData: { feyTouchedSpell: 'Animal Friendship', spells: ['Animal Friendship'] },
          })}
        />
      );
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });

    it('should not pre-select when feyTouchedSpell is null in formData', () => {
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({ formData: { feyTouchedSpell: null } })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('');
    });
  });

  describe('spell selection', () => {
    it('should update selected spell when user selects from dropdown', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      expect(screen.getByText('Charm Person details')).toBeInTheDocument();
    });

    it('should clear selection when user selects the empty option', () => {
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({
            formData: { feyTouchedSpell: 'Animal Friendship', spells: [] },
          })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Animal Friendship');
      fireEvent.change(select, { target: { value: '' } });
      expect(select.value).toBe('');
    });

    it('should show SpellDetails after selecting a new spell', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });

    it('should clear error when user changes selection after an error', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/You must choose/)).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(screen.queryByText(/You must choose/)).not.toBeInTheDocument();
    });
  });

  describe('SpellDetails subcomponent', () => {
    it('should not render spell details when no spell is selected', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      expect(screen.queryByText(/details/)).not.toBeInTheDocument();
    });

    it('should render spell details toggle button when a spell is selected', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });

    it('should render spell details content when expanded', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Enchantment')).toBeInTheDocument();
      expect(screen.getByText('Casting: 1 action')).toBeInTheDocument();
      expect(screen.getByText('Concentration')).toBeInTheDocument();
      expect(screen.getByText('Duration: 24 hours')).toBeInTheDocument();
      expect(screen.getByText('Components: V, S, M')).toBeInTheDocument();
      expect(screen.getByText('Material: A morsel of food.')).toBeInTheDocument();
    });

    it('should toggle spell details collapsed/expanded state', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      // Initially collapsed
      expect(screen.queryByText('School: Enchantment')).not.toBeInTheDocument();
      // Expand
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Enchantment')).toBeInTheDocument();
      // Collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('School: Enchantment')).not.toBeInTheDocument();
    });

    it('should render ritual badge when spell has ritual=true', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Comprehend Languages' } });
      const toggleBtn = screen.getByText('Comprehend Languages details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Ritual')).toBeInTheDocument();
    });

    it('should not render ritual badge when spell has ritual=false', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('Ritual')).not.toBeInTheDocument();
    });

    it('should render damage type when spell has damage', () => {
      const blightSpell = createDivinationEnchantmentSpell({
        name: 'Blight',
        school: 'Divination',
        damage: { damage_type: 'Necrotic' },
      });
      render(<FeyTouchedModal {...createFeyTouchedProps({ allSpells: [blightSpell] })} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const toggleBtn = screen.getByText('Blight details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Damage: Necrotic')).toBeInTheDocument();
    });

    it('should not render damage section when spell has no damage', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(screen.queryAllByText(/Damage:/).length).toBe(0);
    });

    it('should not render material section when spell has no material', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      const toggleBtn = screen.getByText('Charm Person details');
      fireEvent.click(toggleBtn);
      expect(screen.queryAllByText(/Material:/).length).toBe(0);
    });

    it('should call renderMarkdown with the spell description', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(renderMarkdown).toHaveBeenCalledWith('Convince a beast to be friendly.');
    });
  });

  describe('validation', () => {
    it('should show error when saving without selecting a spell', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('You must choose one level 1 Divination or Enchantment spell')
      ).toBeInTheDocument();
    });

    it('should not show error when a valid spell is selected', () => {
      render(<FeyTouchedModal {...createFeyTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.queryByText('You must choose one level 1 Divination or Enchantment spell')
      ).not.toBeInTheDocument();
    });

    it('should show school validation error for wrong school', () => {
      const wrongSchoolSpell = createDivinationEnchantmentSpell({
        name: 'Wrong School Spell',
        school: 'Evocation',
      });
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({
            formData: { feyTouchedSpell: 'Wrong School Spell', spells: [] },
            allSpells: [wrongSchoolSpell],
          })}
        />
      );
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('Spell must be from Divination or Enchantment school')
      ).toBeInTheDocument();
    });

    it('should not show school error for valid school names with different casing', () => {
      // The component capitalizes the first letter, so "enchantment" becomes "Enchantment"
      const spell = createDivinationEnchantmentSpell({
        name: 'Lowercase School',
        school: 'enchantment',
      });
      render(
        <FeyTouchedModal
          {...createFeyTouchedProps({
            formData: { feyTouchedSpell: 'Lowercase School', spells: [] },
            allSpells: [spell],
          })}
        />
      );
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.queryByText('Spell must be from Divination or Enchantment school')
      ).not.toBeInTheDocument();
    });
  });

  describe('save behavior', () => {
    it('should call onArrayFieldChange for spells with the selected spell added', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', ['Animal Friendship']);
    });

    it('should call onArrayFieldChange for feyTouchedSpell', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('feyTouchedSpell', 'Charm Person');
    });

    it('should call onClose after saving', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when validation fails', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should deduplicate when adding to existing spells array', () => {
      const props = createFeyTouchedProps({
        formData: { spells: ['Animal Friendship'] },
      });
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', ['Animal Friendship']);
    });

    it('should append to existing spells array when spell is new', () => {
      const props = createFeyTouchedProps({
        formData: { spells: ['Comprehend Languages'] },
      });
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'spells',
        ['Comprehend Languages', 'Animal Friendship']
      );
    });

    it('should call onArrayFieldChange in order: spells first, then feyTouchedSpell', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(1, 'spells', ['Animal Friendship']);
      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(
        2,
        'feyTouchedSpell',
        'Animal Friendship'
      );
    });
  });

  describe('overlay interaction', () => {
    it('should call onClose when clicking the overlay (outside the modal)', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const overlay = document.querySelector('.mi-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking inside the modal', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const modal = document.querySelector('.mi-modal');
      fireEvent.click(modal);
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});

describe('ShadowTouchedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  describe('rendering', () => {
    it('should render the modal overlay and header', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
    });

    it('should render the description text mentioning Illusion or Necromancy', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      expect(
        screen.getByText(/Choose one level 1 spell from the Illusion or Necromancy school/)
      ).toBeInTheDocument();
    });

    it('should render available spells from Illusion and Necromancy schools', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      expect(screen.getByText('Disguise Self (Illusion)')).toBeInTheDocument();
      expect(screen.getByText('Blight (Necromancy)')).toBeInTheDocument();
    });

    it('should filter out spells from non-matching schools', () => {
      const evocationSpell = createIllusionNecromancySpell({
        name: 'Magic Missile',
        school: 'Evocation',
      });
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            allSpells: [...illusionNecromancySpells, evocationSpell],
          })}
        />
      );
      expect(screen.getByText('Disguise Self (Illusion)')).toBeInTheDocument();
      expect(screen.queryByText('Magic Missile (Evocation)')).not.toBeInTheDocument();
    });

    it('should render the Save button', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render the modal with an empty select when allSpells is null', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps({ allSpells: null })} />);
      expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.options.length).toBe(1);
    });

    it('should render the modal with an empty select when allSpells is an empty array', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps({ allSpells: [] })} />);
      expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.options.length).toBe(1);
    });

    it('should not render spells that are not level 1', () => {
      const level2Spell = createIllusionNecromancySpell({
        name: 'Conjure Minor Elements',
        level: 2,
      });
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            allSpells: [...illusionNecromancySpells, level2Spell],
          })}
        />
      );
      expect(screen.queryByText('Conjure Minor Elements (Necromancy)')).not.toBeInTheDocument();
    });
  });

  describe('initial state with existing spell', () => {
    it('should pre-select an existing shadowTouchedSpell from formData', () => {
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            formData: { shadowTouchedSpell: 'Disguise Self', spells: ['Disguise Self'] },
          })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Disguise Self');
    });

    it('should show SpellDetails toggle for the pre-selected spell', () => {
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            formData: { shadowTouchedSpell: 'Disguise Self', spells: ['Disguise Self'] },
          })}
        />
      );
      expect(screen.getByText('Disguise Self details')).toBeInTheDocument();
    });

    it('should not pre-select when shadowTouchedSpell is null in formData', () => {
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({ formData: { shadowTouchedSpell: null } })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('');
    });
  });

  describe('spell selection', () => {
    it('should update selected spell when user selects from dropdown', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      expect(screen.getByText('Blight details')).toBeInTheDocument();
    });

    it('should clear selection when user selects the empty option', () => {
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            formData: { shadowTouchedSpell: 'Disguise Self', spells: [] },
          })}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Disguise Self');
      fireEvent.change(select, { target: { value: '' } });
      expect(select.value).toBe('');
    });

    it('should clear error when user changes selection after an error', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/You must choose/)).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      expect(screen.queryByText(/You must choose/)).not.toBeInTheDocument();
    });
  });

  describe('SpellDetails subcomponent', () => {
    it('should not render spell details when no spell is selected', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      expect(screen.queryByText(/details/)).not.toBeInTheDocument();
    });

    it('should render spell details toggle button when a spell is selected', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      expect(screen.getByText('Disguise Self details')).toBeInTheDocument();
    });

    it('should render spell details content when expanded', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const toggleBtn = screen.getByText('Disguise Self details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Illusion')).toBeInTheDocument();
      expect(screen.getByText('Casting: 1 action')).toBeInTheDocument();
      expect(screen.getByText('Duration: 1 hour')).toBeInTheDocument();
      expect(screen.getByText('Components: V, S')).toBeInTheDocument();
    });

    it('should toggle spell details collapsed/expanded state', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const toggleBtn = screen.getByText('Disguise Self details');
      // Initially collapsed
      expect(screen.queryByText('School: Illusion')).not.toBeInTheDocument();
      // Expand
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Illusion')).toBeInTheDocument();
      // Collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('School: Illusion')).not.toBeInTheDocument();
    });

    it('should render damage type when spell has damage', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const toggleBtn = screen.getByText('Blight details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Damage: Necrotic')).toBeInTheDocument();
    });

    it('should not render damage section when spell has no damage', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const toggleBtn = screen.getByText('Disguise Self details');
      fireEvent.click(toggleBtn);
      expect(screen.queryAllByText(/Damage:/).length).toBe(0);
    });

    it('should call renderMarkdown with the spell description', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const toggleBtn = screen.getByText('Disguise Self details');
      fireEvent.click(toggleBtn);
      expect(renderMarkdown).toHaveBeenCalledWith('Disguise your appearance.');
    });
  });

  describe('validation', () => {
    it('should show error when saving without selecting a spell', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('You must choose one level 1 Illusion or Necromancy spell')
      ).toBeInTheDocument();
    });

    it('should not show error when a valid spell is selected', () => {
      render(<ShadowTouchedModal {...createShadowTouchedProps()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.queryByText('You must choose one level 1 Illusion or Necromancy spell')
      ).not.toBeInTheDocument();
    });

    it('should show school validation error for wrong school', () => {
      const wrongSchoolSpell = createIllusionNecromancySpell({
        name: 'Wrong School Spell',
        school: 'Evocation',
      });
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            formData: { shadowTouchedSpell: 'Wrong School Spell', spells: [] },
            allSpells: [wrongSchoolSpell],
          })}
        />
      );
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('Spell must be from Illusion or Necromancy school')
      ).toBeInTheDocument();
    });

    it('should not show school error for valid school names with different casing', () => {
      const spell = createIllusionNecromancySpell({
        name: 'Lowercase School',
        school: 'illusion',
      });
      render(
        <ShadowTouchedModal
          {...createShadowTouchedProps({
            formData: { shadowTouchedSpell: 'Lowercase School', spells: [] },
            allSpells: [spell],
          })}
        />
      );
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.queryByText('Spell must be from Illusion or Necromancy school')
      ).not.toBeInTheDocument();
    });
  });

  describe('save behavior', () => {
    it('should call onArrayFieldChange for spells with the selected spell added', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', ['Disguise Self']);
    });

    it('should call onArrayFieldChange for shadowTouchedSpell', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('shadowTouchedSpell', 'Blight');
    });

    it('should call onClose after saving', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when validation fails', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should deduplicate when adding to existing spells array', () => {
      const props = createShadowTouchedProps({
        formData: { spells: ['Disguise Self'] },
      });
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith('spells', ['Disguise Self']);
    });

    it('should append to existing spells array when spell is new', () => {
      const props = createShadowTouchedProps({
        formData: { spells: ['Disguise Self'] },
      });
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'spells',
        ['Disguise Self', 'Blight']
      );
    });

    it('should call onArrayFieldChange in order: spells first, then shadowTouchedSpell', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Disguise Self' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(1, 'spells', ['Disguise Self']);
      expect(props.onArrayFieldChange).toHaveBeenNthCalledWith(
        2,
        'shadowTouchedSpell',
        'Disguise Self'
      );
    });
  });

  describe('overlay interaction', () => {
    it('should call onClose when clicking the overlay', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const overlay = document.querySelector('.mi-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking inside the modal', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const modal = document.querySelector('.mi-modal');
      fireEvent.click(modal);
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});
