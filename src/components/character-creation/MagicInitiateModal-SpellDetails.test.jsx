import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MagicInitiateModal from './MagicInitiateModal.jsx';
import { renderMarkdown } from '../../services/ui/sanitize.js';

// Mock renderMarkdown to return predictable HTML
vi.mock('../../services/ui/sanitize.js', () => ({
  renderMarkdown: vi.fn((md) => `<p>${md}</p>`),
}));

const mockCantrips = [
  {
    index: 'acid-splash',
    name: 'Acid Splash',
    school: 'Conjuration',
    level: 0,
    description: ['Throw acid to deal damage.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Acid' },
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    index: 'chill-touch',
    name: 'Chill Touch',
    school: 'Necromancy',
    level: 0,
    description: ['Finger of death energy.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Necrotic' },
    classes: ['Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    index: 'dancing-lights',
    name: 'Dancing Lights',
    school: 'Evocation',
    level: 0,
    description: ['Create lights.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 minute',
    components: ['V', 'S', 'M'],
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    index: 'guidance',
    name: 'Guidance',
    school: 'Divination',
    level: 0,
    description: ['Touch one creature.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['V', 'S'],
    classes: ['Cleric', 'Druid'],
  },
  {
    index: 'poison-spray',
    name: 'Poison Spray',
    school: 'Transmutation',
    level: 0,
    description: ['Inhale poison.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V'],
    damage: { damage_type: 'Poison' },
    classes: ['Druid', 'Warlock'],
  },
];

const mockLevel1Spells = [
  {
    index: 'alarm',
    name: 'Alarm',
    school: 'Abjuration',
    level: 1,
    description: ['Sensory ward.'],
    casting_time: '1 action',
    ritual: true,
    concentration: false,
    duration: '8 hours',
    components: ['V', 'S', 'M'],
    material: 'a small bell and 2 pins',
    classes: ['Ranger', 'Wizard'],
  },
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
    classes: ['Bard', 'Cleric', 'Druid', 'Ranger'],
  },
  {
    index: 'bless',
    name: 'Bless',
    school: 'Enchantment',
    level: 1,
    description: ['Roll d4s.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['V', 'S', 'M'],
    classes: ['Cleric'],
  },
  {
    index: 'burning-hands',
    name: 'Burning Hands',
    school: 'Evocation',
    level: 1,
    description: ['Burst of flame.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Fire' },
    classes: ['Sorcerer', 'Wizard'],
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
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    index: 'command',
    name: 'Command',
    school: 'Enchantment',
    level: 1,
    description: ['Command a creature.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 round',
    classes: ['Cleric'],
  },
  {
    index: 'comprehend-languages',
    name: 'Comprehend Languages',
    school: 'Divination',
    level: 1,
    description: ['Understand all languages.'],
    casting_time: '1 action',
    ritual: true,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    classes: ['Warlock', 'Wizard'],
  },
  {
    index: 'cure-wounds',
    name: 'Cure Wounds',
    school: 'Evocation',
    level: 1,
    description: ['Touch a creature.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'],
  },
  {
    index: 'disguise-self',
    name: 'Disguise Self',
    school: 'Illusion',
    level: 1,
    description: ['Disguise appearance.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    index: 'expeditious-retreat',
    name: 'Expeditious Retreat',
    school: 'Transmutation',
    level: 1,
    description: ['Dash as bonus action.'],
    casting_time: 'bonus action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['V'],
    classes: ['Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    index: 'faerie-fire',
    name: 'Faerie Fire',
    school: 'Evocation',
    level: 1,
    description: ['Outline creatures in light.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Concentration, up to 1 minute',
    components: ['V', 'S'],
    classes: ['Druid'],
  },
  {
    index: 'feather-fall',
    name: 'Feather Fall',
    school: 'Transmutation',
    level: 1,
    description: ['Fall slowly.'],
    casting_time: 'reaction',
    ritual: false,
    concentration: false,
    duration: '1 minute',
    components: ['V', 'M'],
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    index: 'fog-cloud',
    name: 'Fog Cloud',
    school: 'Conjuration',
    level: 1,
    description: ['Create fog.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 hour',
    components: ['V'],
    classes: ['Druid'],
  },
  {
    index: 'goodberry',
    name: 'Goodberry',
    school: 'Transmutation',
    level: 1,
    description: ['Make berries.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    classes: ['Druid'],
  },
  {
    index: 'healing-word',
    name: 'Healing Word',
    school: 'Evocation',
    level: 1,
    description: ['Heal a creature.'],
    casting_time: 'bonus action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V'],
    classes: ['Bard', 'Cleric', 'Druid'],
  },
  {
    index: 'heroism',
    name: 'Heroism',
    school: 'Enchantment',
    level: 1,
    description: ['Temp buff.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['V'],
    classes: ['Bard'],
  },
  {
    index: 'identify',
    name: 'Identify',
    school: 'Divination',
    level: 1,
    description: ['Learn properties.'],
    casting_time: '1 action',
    ritual: true,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    classes: ['Bard', 'Wizard'],
  },
  {
    index: 'illuminating-arrow',
    name: 'Illuminating Arrow',
    school: 'Evocation',
    level: 1,
    description: ['Bright light.'],
    casting_time: '1 bonus action',
    ritual: false,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    classes: ['Ranger'],
  },
  {
    index: 'jump',
    name: 'Jump',
    school: 'Transmutation',
    level: 1,
    description: ['Leap far.'],
    casting_time: 'bonus action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['S', 'M'],
    classes: ['Barbarian', 'Ranger'],
  },
  {
    index: 'longstrider',
    name: 'Longstrider',
    school: 'Transmutation',
    level: 1,
    description: ['Increase speed.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 hour',
    components: ['V', 'S'],
    classes: ['Ranger', 'Wizard'],
  },
  {
    index: 'mage-armor',
    name: 'Mage Armor',
    school: 'Abjuration',
    level: 1,
    description: ['Armor effect.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '8 hours',
    components: ['V', 'S', 'M'],
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    index: 'magic-missile',
    name: 'Magic Missile',
    school: 'Evocation',
    level: 1,
    description: ['Dart of force.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Force' },
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    index: 'ray-of-sickness',
    name: 'Ray of Sickness',
    school: 'Conjuration',
    level: 1,
    description: ['Pus gas.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V', 'S'],
    damage: { damage_type: 'Poison' },
    classes: ['Sorcerer'],
  },
  {
    index: 'shield',
    name: 'Shield',
    school: 'Abjuration',
    level: 1,
    description: ['AC buff.'],
    casting_time: 'reaction',
    ritual: false,
    concentration: false,
    duration: '1 round',
    components: ['V', 'S'],
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    index: 'silence',
    name: 'Silence',
    school: 'Illusion',
    level: 1,
    description: ['No sound.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Concentration, up to 10 minutes',
    components: ['V', 'S'],
    classes: ['Bard', 'Ranger'],
  },
  {
    index: 'sleep',
    name: 'Sleep',
    school: 'Enchantment',
    level: 1,
    description: ['Creatures fall asleep.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: '1 minute',
    components: ['V', 'S', 'M'],
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    index: 'thunderwave',
    name: 'Thunderwave',
    school: 'Evocation',
    level: 1,
    description: ['Self-powered wave.'],
    casting_time: '1 action',
    ritual: false,
    concentration: false,
    duration: 'Instantaneous',
    components: ['V'],
    damage: { damage_type: 'Thunder' },
    classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'],
  },
  {
    index: 'witch-bolt',
    name: 'Witch Bolt',
    school: 'Evocation',
    level: 1,
    description: ['Continuing damage.'],
    casting_time: '1 action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['V', 'S', 'M'],
    damage: { damage_type: 'Lightning' },
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    index: 'wrathful-smite',
    name: 'Wrathful Smite',
    school: 'Abjuration',
    level: 1,
    description: ['Frighten.'],
    casting_time: '1 bonus action',
    ritual: false,
    concentration: true,
    duration: 'Concentration, up to 1 minute',
    components: ['S'],
    classes: ['Paladin'],
  },
];

const allSpells = [...mockCantrips, ...mockLevel1Spells];

const createProps = (overrides = {}) => ({
  formData: {
    magicInitiateInstances: [],
    spells: [],
    rules: '5e',
    ...overrides.formData,
  },
  allSpells,
  onArrayFieldChange: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('MagicInitiateModal - SpellDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  describe('SpellDetails subcomponent', () => {
    it('should not render spell details toggle when no spell is selected', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.queryByText(/details$/)).not.toBeInTheDocument();
    });

    it('should toggle spell details expanded/collapsed', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      const toggleBtn = screen.getByText('Burning Hands details');
      // Initially collapsed
      expect(screen.queryByText('School: Evocation')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Evocation')).toBeInTheDocument();

      // Collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('School: Evocation')).not.toBeInTheDocument();
    });

    it('should render spell school in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('School: Evocation')).toBeInTheDocument();
    });

    it('should render casting_time in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.getByText('Casting: 1 action')).toBeInTheDocument();
    });

    it('should NOT render Concentration when spell concentration is false', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryByText('Concentration')).not.toBeInTheDocument();
    });

    it('should render Concentration when spell concentration is true', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.getByText('Concentration')).toBeInTheDocument();
    });

    it('should render duration in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Duration: Instantaneous')).toBeInTheDocument();
    });

    it('should render components in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Components: V, S')).toBeInTheDocument();
    });

    it('should NOT render components when spell has no components', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Command' } });

      fireEvent.click(screen.getByText('Command details'));
      expect(screen.queryByText(/Components/)).not.toBeInTheDocument();
    });

    it('should render damage type when spell has damage', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Damage: Fire')).toBeInTheDocument();
    });

    it('should NOT render damage when spell has no damage', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.queryAllByText(/Damage:/).length).toBe(0);
    });

    it('should render material when spell has material', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Alarm' } });

      fireEvent.click(screen.getByText('Alarm details'));
      expect(screen.getByText(/Material.*bell/)).toBeInTheDocument();
    });

    it('should NOT render material when spell has no material', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryAllByText(/Material:/).length).toBe(0);
    });

    it('should render Ritual badge when spell has ritual=true', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Alarm' } });

      fireEvent.click(screen.getByText('Alarm details'));
      expect(screen.getByText('Ritual')).toBeInTheDocument();
    });

    it('should NOT render Ritual badge when spell has ritual=false', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryByText('Ritual')).not.toBeInTheDocument();
    });

    it('should use renderMarkdown for spell description', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(renderMarkdown).toHaveBeenCalledWith('Burst of flame.');
    });

    it('should render spell description in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const level1Select = screen.getByText('Level 1 Spell:').nextElementSibling;
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(renderMarkdown).toHaveBeenCalledWith('Burst of flame.');
    });

    it('should render details for cantrips too', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);

      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = screen.getByText('Cantrip 1:').nextElementSibling;
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      expect(screen.getByText('Acid Splash details')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Acid Splash details'));
      expect(screen.getByText('School: Conjuration')).toBeInTheDocument();
    });
  });
});
