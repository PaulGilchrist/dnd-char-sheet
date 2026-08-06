import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeyTouchedModal, { ShadowTouchedModal } from './FeyTouchedModal.jsx';
import { renderMarkdown } from '../../services/ui/sanitize.js';

// Mock renderMarkdown to return predictable HTML
vi.mock('../../services/ui/sanitize.js', () => ({
  renderMarkdown: vi.fn((md) => `<p>${md}</p>`),
}));

const mockDivinationEnchantmentSpells = [
  {
    index: 'animal-friendship',
    name: 'Animal Friendship',
    school: 'Enchantment',
    level: 1,
    description: ['Convince a beast to be friendly.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: '24 hours',
    components: ['V', 'S', 'M'],
    damage: null,
    material: 'A morsel of food.',
  },
  {
    index: 'comprehend-r',
    name: 'Comprehend Languages',
    school: 'Divination',
    level: 1,
    description: ['Understand all spoken and written languages.'],
    casting_time: '1 action',
    ritual: true,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    damage: null,
    material: null,
  },
  {
    index: 'charm-person',
    name: 'Charm Person',
    school: 'Enchantment',
    level: 1,
    description: ['Charm a humanoid.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    damage: null,
    material: null,
  },
];

const mockIllusionNecromancySpells = [
  {
    index: 'disguise-self',
    name: 'Disguise Self',
    school: 'Illusion',
    level: 1,
    description: ['Disguise your appearance.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    damage: null,
    material: null,
  },
  {
    index: 'blight',
    name: 'Blight',
    school: 'Necromancy',
    level: 1,
    description: ['Deal 8d8 necrotic damage.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Necrotic' },
    material: null,
  },
];

const createFeyTouchedProps = (overrides = {}) => ({
  formData: { feyTouchedSpell: null, spells: [] },
  allSpells: mockDivinationEnchantmentSpells,
  onArrayFieldChange: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

const createShadowTouchedProps = (overrides = {}) => ({
  formData: { shadowTouchedSpell: null, spells: [] },
  allSpells: mockIllusionNecromancySpells,
  onArrayFieldChange: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('FeyTouchedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  describe('rendering', () => {
    it('should render the modal overlay and header', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Fey Magic')).toBeInTheDocument();
    });

    it('should render the description text', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const desc = screen.getByText(
        /Choose one level 1 spell from the Divination or Enchantment school/
      );
      expect(desc).toBeInTheDocument();
    });

    it('should render a label for the spell selector', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Level 1 Spell:')).toBeInTheDocument();
    });

    it('should render the select dropdown with a default empty option', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select.querySelector('option[value=""]')).toBeInTheDocument();
      expect(select.querySelector('option[value=""]').textContent).toBe(
        'Select a spell...'
      );
    });

    it('should render available spells from Divination and Enchantment schools', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Animal Friendship (Enchantment)')).toBeInTheDocument();
      expect(screen.getByText('Comprehend Languages (Divination)')).toBeInTheDocument();
      expect(screen.getByText('Charm Person (Enchantment)')).toBeInTheDocument();
    });

    it('should NOT render spells from other schools', () => {
      const props = createFeyTouchedProps({
        allSpells: [
          ...mockDivinationEnchantmentSpells,
          {
            index: 'fire-bolt',
            name: 'Fire Bolt',
            school: 'Evocation',
            level: 1,
            description: ['Throw a bolt of fire.'],
            casting_time: '1 action',
            ritual: false,
            concentration: false,
            duration: 'Instantaneous',
            components: ['V', 'S'],
            damage: { damage_type: 'Fire' },
            material: null,
          },
        ],
      });
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Animal Friendship (Enchantment)')).toBeInTheDocument();
      expect(screen.queryByText('Fire Bolt (Evocation)')).not.toBeInTheDocument();
    });

    it('should render the Save button', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render nothing when allSpells is null', () => {
      const props = createFeyTouchedProps({ allSpells: null });
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Fey Magic')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toHaveProperty('length', 1); // only the default option
    });
  });

  describe('initial state with existing spell', () => {
    it('should pre-select an existing feyTouchedSpell from formData', () => {
      const props = createFeyTouchedProps({
        formData: { feyTouchedSpell: 'Animal Friendship', spells: ['Animal Friendship'] },
      });
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Animal Friendship');
    });

    it('should show SpellDetails for the pre-selected spell', () => {
      const props = createFeyTouchedProps({
        formData: { feyTouchedSpell: 'Animal Friendship', spells: ['Animal Friendship'] },
      });
      render(<FeyTouchedModal {...props} />);
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });
  });

  describe('spell selection', () => {
    it('should update selected spell when user selects from dropdown', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      expect(screen.getByText('Charm Person details')).toBeInTheDocument();
    });

    it('should clear selection when user selects empty option', () => {
      const props = createFeyTouchedProps({
        formData: { feyTouchedSpell: 'Animal Friendship', spells: [] },
      });
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Animal Friendship');
      fireEvent.change(select, { target: { value: '' } });
      expect(select.value).toBe('');
    });

    it('should show SpellDetails after selecting a new spell', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });
  });

  describe('SpellDetails subcomponent', () => {
    it('should not render spell details when no spell is selected', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      expect(screen.queryByText('Animal Friendship details')).not.toBeInTheDocument();
    });

    it('should render spell details toggle button when a spell is selected', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(screen.getByText('Animal Friendship details')).toBeInTheDocument();
    });

    it('should render spell details content when expanded', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
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
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      // Initially collapsed - content should be hidden
      expect(screen.queryByText('School: Enchantment')).not.toBeInTheDocument();
      // Expand
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Enchantment')).toBeInTheDocument();
      // Collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('School: Enchantment')).not.toBeInTheDocument();
    });

    it('should render ritual badge when spell has ritual=true', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Comprehend Languages' } });
      const toggleBtn = screen.getByText('Comprehend Languages details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Ritual')).toBeInTheDocument();
    });

    it('should NOT render ritual badge when spell has ritual=false', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('Ritual')).not.toBeInTheDocument();
    });

    it('should render damage type when spell has damage', () => {
      vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
      const props = createFeyTouchedProps({
        allSpells: [
          {
            index: 'blight',
            name: 'Blight',
            school: 'Divination',
            level: 1,
            description: ['Deal necrotic damage.'],
            casting_time: '1 action',
            ritual: false,
            concentration: false,
            duration: 'Instantaneous',
            components: ['V', 'S'],
            damage: { damage_type: 'Necrotic' },
            material: null,
          },
        ],
      });
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const toggleBtn = screen.getByText('Blight details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Damage: Necrotic')).toBeInTheDocument();
    });

    it('should NOT render damage when spell has no damage', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(screen.queryAllByText(/Damage:/).length).toBe(0);
    });

    it('should NOT render material when spell has no material', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      const toggleBtn = screen.getByText('Charm Person details');
      fireEvent.click(toggleBtn);
      expect(screen.queryAllByText(/Material:/).length).toBe(0);
    });

    it('should use renderMarkdown for spell description', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const toggleBtn = screen.getByText('Animal Friendship details');
      fireEvent.click(toggleBtn);
      expect(renderMarkdown).toHaveBeenCalledWith('Convince a beast to be friendly.');
    });
  });

  describe('validation', () => {
    it('should show error when saving without selecting a spell', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('You must choose one level 1 Divination or Enchantment spell')
      ).toBeInTheDocument();
    });

    it('should NOT show error when a valid spell is selected', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.queryByText('You must choose one level 1 Divination or Enchantment spell')
      ).not.toBeInTheDocument();
    });

    it('should clear errors when user changes selection', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/You must choose/)).toBeInTheDocument();
      // Select a spell - errors should clear
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Animal Friendship' } });
      expect(
        screen.queryByText(/You must choose/)
      ).not.toBeInTheDocument();
    });

    it('should show school validation error for wrong school (should not appear in dropdown but validation still runs)', () => {
      const wrongSchoolSpell = {
        index: 'wrong',
        name: 'Wrong School Spell',
        school: 'Evocation',
        level: 1,
        description: ['Wrong school.'],
        casting_time: '1 action',
        ritual: false,
        concentration: false,
        duration: 'Instantaneous',
        components: ['V'],
        damage: null,
        material: null,
      };
      const props = createFeyTouchedProps({
        formData: { feyTouchedSpell: 'Wrong School Spell', spells: [] },
        allSpells: [wrongSchoolSpell],
      });
      render(<FeyTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('Spell must be from Divination or Enchantment school')
      ).toBeInTheDocument();
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
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'spells',
        ['Animal Friendship']
      );
    });

    it('should call onArrayFieldChange for feyTouchedSpell', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Charm Person' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'feyTouchedSpell',
        'Charm Person'
      );
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

    it('should NOT call onClose when validation fails', () => {
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
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'spells',
        ['Animal Friendship']
      );
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
  });

  describe('overlay interaction', () => {
    it('should call onClose when clicking the overlay (outside the modal)', () => {
      const props = createFeyTouchedProps();
      render(<FeyTouchedModal {...props} />);
      const overlay = document.querySelector('.mi-overlay');
      fireEvent.click(overlay);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when clicking inside the modal', () => {
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
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      expect(screen.getByText('Shadow Magic')).toBeInTheDocument();
    });

    it('should render the description text mentioning Illusion or Necromancy', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const desc = screen.getByText(
        /Choose one level 1 spell from the Illusion or Necromancy school/
      );
      expect(desc).toBeInTheDocument();
    });

    it('should render available spells from Illusion and Necromancy schools', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      expect(screen.getByText('Disguise Self (Illusion)')).toBeInTheDocument();
      expect(screen.getByText('Blight (Necromancy)')).toBeInTheDocument();
    });

    it('should NOT render spells from other schools', () => {
      const props = createShadowTouchedProps({
        allSpells: [
          ...mockIllusionNecromancySpells,
          {
            index: 'magic-missile',
            name: 'Magic Missile',
            school: 'Evocation',
            level: 1,
            description: ['Shoot missiles.'],
            casting_time: '1 action',
            ritual: false,
            concentration: false,
            duration: 'Instantaneous',
            components: ['V', 'S'],
            damage: { damage_type: 'Force' },
            material: null,
          },
        ],
      });
      render(<ShadowTouchedModal {...props} />);
      expect(screen.getByText('Disguise Self (Illusion)')).toBeInTheDocument();
      expect(screen.queryByText('Magic Missile (Evocation)')).not.toBeInTheDocument();
    });

    it('should render the Save button', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('initial state with existing spell', () => {
    it('should pre-select an existing shadowTouchedSpell from formData', () => {
      const props = createShadowTouchedProps({
        formData: { shadowTouchedSpell: 'Disguise Self', spells: ['Disguise Self'] },
      });
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Disguise Self');
    });
  });

  describe('spell selection', () => {
    it('should update selected spell when user selects from dropdown', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      expect(screen.getByText('Blight details')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should show error when saving without selecting a spell', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('You must choose one level 1 Illusion or Necromancy spell')
      ).toBeInTheDocument();
    });

    it('should show school validation error for wrong school', () => {
      const wrongSchoolSpell = {
        index: 'wrong',
        name: 'Wrong School Spell',
        school: 'Evocation',
        level: 1,
        description: ['Wrong school.'],
        casting_time: '1 action',
        ritual: false,
        concentration: false,
        duration: 'Instantaneous',
        components: ['V'],
        damage: null,
        material: null,
      };
      const props = createShadowTouchedProps({
        formData: { shadowTouchedSpell: 'Wrong School Spell', spells: [] },
        allSpells: [wrongSchoolSpell],
      });
      render(<ShadowTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(
        screen.getByText('Spell must be from Illusion or Necromancy school')
      ).toBeInTheDocument();
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
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'spells',
        ['Disguise Self']
      );
    });

    it('should call onArrayFieldChange for shadowTouchedSpell', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Blight' } });
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onArrayFieldChange).toHaveBeenCalledWith(
        'shadowTouchedSpell',
        'Blight'
      );
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

    it('should NOT call onClose when validation fails', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);
      expect(props.onClose).not.toHaveBeenCalled();
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

    it('should NOT call onClose when clicking inside the modal', () => {
      const props = createShadowTouchedProps();
      render(<ShadowTouchedModal {...props} />);
      const modal = document.querySelector('.mi-modal');
      fireEvent.click(modal);
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});
